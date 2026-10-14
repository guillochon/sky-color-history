"""
Paleo-sky color model.
- Spherical-shell atmosphere, numerical single scattering along the view ray
  (handles twilight geometry properly).
- Multiple scattering and surface reflection from a table over altitude and the Sun's
  local elevation with every order solved (ms_table, below); the earlier delta-Eddington
  two-stream term stays for the views from space and as radiance(..., ms='two_stream').
- Components: Rayleigh gas (N2/O2/CO2/H2O mix), ozone Chappuis, tropospheric
  aerosol, stratospheric sulfate, Archean organic (tholin-like) haze, soot.
- Colors via CIE 1931 2deg CMF analytic fit (Wyman, Sloan & Shirley 2013),
  Bradford-free: we show raw sRGB (D65 white point) with per-scene exposure.
"""
import math
import numpy as np

R_E = 6371.0  # km
LAM = np.arange(380, 781, 10.0)  # nm
L550 = LAM / 550.0

# ---------------- CIE color matching (analytic fit) ----------------
def _g(x, mu, s1, s2):
    s = np.where(x < mu, s1, s2)
    return np.exp(-0.5 * ((x - mu) / s) ** 2)

def cmf(lam):
    x = 1.056*_g(lam,599.8,37.9,31.0) + 0.362*_g(lam,442.0,16.0,26.7) - 0.065*_g(lam,501.1,20.4,26.2)
    y = 0.821*_g(lam,568.8,46.9,40.5) + 0.286*_g(lam,530.9,16.3,31.1)
    z = 1.217*_g(lam,437.0,11.8,36.0) + 0.681*_g(lam,459.0,26.0,13.8)
    return x, y, z

XB, YB, ZB = cmf(LAM)

def spec_to_XYZ(S):
    d = LAM[1]-LAM[0]
    return np.array([np.sum(S*XB), np.sum(S*YB), np.sum(S*ZB)]) * d

M_XYZ2RGB = np.array([[ 3.2406, -1.5372, -0.4986],
                      [-0.9689,  1.8758,  0.0415],
                      [ 0.0557, -0.2040,  1.0570]])

def XYZ_to_srgb(XYZ, exposure=1.0, gamma=True):
    rgb = M_XYZ2RGB @ (XYZ * exposure)
    rgb = np.clip(rgb, 0, None)
    # soft clip preserving hue if over-range
    mx = rgb.max()
    if mx > 1:
        rgb = rgb / mx
    if gamma:
        rgb = np.where(rgb <= 0.0031308, 12.92*rgb, 1.055*rgb**(1/2.4) - 0.055)
    return np.clip(rgb, 0, 1)

def hexcol(rgb):
    return '#%02x%02x%02x' % tuple(int(round(255*c)) for c in rgb)

def xy(XYZ):
    s = XYZ.sum()
    return XYZ[0]/s, XYZ[1]/s

def cct_mccamy(x, y):
    n = (x-0.3320)/(0.1858-y)
    return 449*n**3 + 3525*n**2 + 6823.3*n + 5520.33

# ---------------- Sun ----------------
def planck(lam_nm, T):
    lam = lam_nm*1e-9
    h, c, k = 6.626e-34, 3e8, 1.381e-23
    return 2*h*c**2/lam**5/(np.exp(h*c/(lam*k*T))-1)

def solar_spectrum(T=5772.0, L=1.0):
    """Relative spectral irradiance at the top of the atmosphere, without Fraunhofer lines,
    normalized so the modern Sun peaks at 1. L scales the total luminosity."""
    return planck(LAM, T) / planck(LAM, 5772.0).max() * L * (5772.0/T)**4

# ---------------- Optical components ----------------
class Comp:
    """Optical component with column optical depth tau(lam), ssa(lam), HG g, and
    vertical density profile n(h) (normalized so integral dh = 1)."""
    def __init__(self, name, tau, ssa, g, profile, rayleigh=False):
        self.name, self.tau, self.ssa, self.g, self.profile, self.rayleigh = name, tau, ssa, g, profile, rayleigh

# The profiles are evaluated in place on arrays of altitude: they run over every
# sample of every path column, and the temporaries cost more than the arithmetic.
# The profiles are small classes rather than closures so an Atmosphere can be pickled (the
# multiple-scattering table is built in a child process, ms_lut).
class expo:
    def __init__(self, H):
        self.H = H

    def __call__(self, h):
        e = h/-self.H
        np.exp(e, out=e)
        e /= self.H
        return e

def _gauss(h, hc, w):
    e = h - hc
    e /= w
    np.square(e, out=e)
    e *= -0.5
    return np.exp(e, out=e)

class gauss_layer:
    def __init__(self, hc, w):
        self.hc, self.w, self.norm = hc, w, w*np.sqrt(2*np.pi)

    def __call__(self, h):
        e = _gauss(h, self.hc, self.w)
        e /= self.norm
        return e

def hg(g, cosT):
    return (1-g**2)/(4*np.pi*(1+g**2-2*g*cosT)**1.5)

def rayleigh_phase(cosT):
    return 3/(16*np.pi)*(1+cosT**2)

# Rayleigh column optical depth at 550 nm for 1 bar of a gas (per-molecule cross
# section relative to air, times molecules per bar relative to air 29/M)
RAY_550_AIR = 0.0975
GAS = {  # (sigma_rel to air at 550nm, molar mass)
    'N2': (1.03, 28), 'O2': (0.92, 32), 'CO2': (2.55, 44), 'H2O': (0.85, 18), 'CH4': (2.3, 16), 'Ar':(0.87,40)}

def rayleigh_tau(gas_bars):
    tau = 0.0
    for gname, p in gas_bars.items():
        s, M = GAS[gname]
        tau += RAY_550_AIR * s * (29.0/M) * p
    return tau * L550**-4.05

# Serdyuchenko, Gorshelev, Weber & Burrows (2014), 223 K, averaged in the
# 10 nm bins of LAM. Source: IUP Serdyuchenko–Gorshelev table
# (doi:10.5281/zenodo.5793207), column for 223 K. Units: cm^2 molecule^-1.
# 300 DU gives optical depth 0.0405 at 600 nm. The Huggins tail on this grid
# (380–420 nm) is optically thin even on a grazing path; the red wing past
# 700 nm is the part the two-Gaussian fit was missing.
_O3_SIGMA = np.array([
    1.632243e-24, 3.546761e-24, 9.208098e-24, 2.018309e-23, 3.865861e-23,
    6.814684e-23, 1.273508e-22, 1.669566e-22, 3.178670e-22, 3.689251e-22,
    6.811045e-22, 7.733454e-22, 1.176413e-21, 1.531850e-21, 1.789431e-21,
    2.538112e-21, 2.874170e-21, 3.276421e-21, 3.863603e-21, 4.563467e-21,
    4.549562e-21, 4.423228e-21, 5.020834e-21, 4.698315e-21, 3.991310e-21,
    3.489328e-21, 2.924044e-21, 2.437633e-21, 2.040905e-21, 1.649952e-21,
    1.322613e-21, 1.075112e-21, 8.221933e-22, 6.909074e-22, 5.888040e-22,
    4.473858e-22, 4.078314e-22, 3.968603e-22, 2.658545e-22, 2.447326e-22,
    2.959740e-22,
])
_N_PER_DU = 2.687e16  # molecules cm^-2 in one Dobson unit

def ozone_tau(DU):
    return _O3_SIGMA * (float(DU) * _N_PER_DU)

# Geographic latitude (degrees) for each place the epoch scripts name.
LAT_DEG = {'Equator': 0.0, 'Mid-latitude': 45.0, 'Polar': 75.0, 'Polar summer': 75.0}

def column_ozone(epoch, place):
    """Dobson column for a named place. A number applies at every latitude."""
    oz = epoch['ozone']
    if isinstance(oz, dict):
        if place in oz:
            return float(oz[place])
        if place == 'Polar':
            return float(oz['Polar summer'])
        return float(oz['Mid-latitude'])
    return float(oz)

def ozone_latitude(epoch, place):
    """Peak-height latitude. An epoch may pin the whole sky to one layer."""
    pinned = epoch.get('ozone_lat')
    if pinned is not None:
        return float(pinned)
    return LAT_DEG[place]

class ozone_layer:
    """Normalized ozone density. Stratospheric peak falls from 26 km at the
    equator to 18 km at the pole and thickens toward the pole. trop_frac is
    the share of the column in a 6 km tropospheric exponential."""
    def __init__(self, lat_deg, trop_frac=0.0):
        x = min(abs(float(lat_deg)), 90.0) / 90.0
        self.hc = 26.0 - 8.0 * x
        self.w = 5.0 + 4.0 * x
        # Renormalize the Gaussian onto h >= 0 so the column is the stated DU.
        mass = 0.5 * (1.0 + math.erf(self.hc / (self.w * math.sqrt(2.0))))
        self.strat_norm = 1.0 / (self.w * math.sqrt(2.0 * math.pi) * mass)
        self.trop = expo(6.0)
        self.f = min(max(float(trop_frac), 0.0), 1.0)

    def __call__(self, h):
        strat = _gauss(h, self.hc, self.w)
        strat *= self.strat_norm
        if self.f == 0.0:
            return strat
        strat *= 1.0 - self.f
        t = self.trop(h)
        t *= self.f
        strat += t
        return strat

def aerosol_tau(beta, alpha):
    return beta * L550**-alpha

def tholin_ssa():
    # tholin-like: strongly absorbing in blue, brighter in red
    k = 0.12*np.exp(-(LAM-380)/140.0) + 0.006
    return np.clip(1.0 - 4.0*k, 0.35, 0.95)

# ---------------- Geometry helpers ----------------
def ray_points(h0, zen_view, smax=None, n=400):
    """Points along a ray from observer at altitude h0 with view zenith angle."""
    if smax is None: smax = 600.0 if zen_view < np.radians(89) else 1200.0
    # log-ish spacing near observer
    s = np.concatenate([np.linspace(0, 20, 120), np.linspace(20, smax, n)[1:]])
    r0 = R_E + h0
    x = s*np.sin(zen_view); z = r0 + s*np.cos(zen_view)
    r = np.sqrt(x**2+z**2)
    h = r - R_E
    return s, h, x, z, r

def path_columns(profiles, h_start_r, dir_cos_local, hmax=120.0, n=200):
    """Columns (integral of each profile along the path) from points at radius r
    with local zenith angle cosine mu toward space, one row per profile. The ray
    geometry is shared by all the profiles. Vectorised over arrays."""
    r0 = h_start_r
    mu = dir_cos_local
    # if ray hits ground (mu<0 and perigee below R_E): mark inf
    perigee = r0*np.sqrt(np.maximum(1-mu**2, 0))
    hits_ground = (mu < 0) & (perigee < R_E)
    cols = np.full((len(profiles), len(r0)), np.inf)
    # Only the rays that reach space are integrated.
    sky = ~hits_ground
    r0, mu = r0[sky], mu[sky]
    # parametric: r(s) = sqrt(r0^2 + s^2 + 2 r0 s mu)
    # find s where r = R_E+hmax
    rt = R_E + hmax
    disc = (r0*mu)**2 + rt**2 - r0**2
    smax = -r0*mu + np.sqrt(np.maximum(disc, 0))
    t = np.linspace(0, 1, n)
    S = smax[:, None]*t[None, :]
    R = np.sqrt(r0[:, None]**2 + S**2 + 2*r0[:, None]*S*mu[:, None])
    H = R - R_E
    Hc = np.clip(H, 0, None)
    above = H > hmax
    any_above = above.any()
    # np.trapezoid's arithmetic, with the steps shared by every profile
    dS = np.diff(S, axis=1)
    for i, profile in enumerate(profiles):
        dens = profile(Hc)
        if any_above:
            dens[above] = 0
        seg = dens[:, 1:] + dens[:, :-1]
        seg *= dS
        seg /= 2.0
        cols[i, sky] = seg.sum(axis=1)
    return cols

def single_scatter(atm, s, h, cols, cosT, to_end=False):
    """Singly scattered radiance reaching the end s[0] of a sampled ray (s[-1] with to_end),
    from points at altitudes h whose columns toward the Sun are cols (path_columns)."""
    # Per component: optical depth from the observer to each point along the ray, the
    # column toward the Sun from each point, and the local scattering coefficient times
    # the phase function.
    tau_obs = np.zeros((len(s), len(LAM))); tau_sun = np.zeros_like(tau_obs); beta = np.zeros_like(tau_obs)
    ds = np.diff(s)
    for c, col in zip(atm.comps, cols):
        dens = c.profile(h)
        seg = 0.5*(dens[1:]+dens[:-1])*ds
        cum = np.concatenate([np.cumsum(seg[::-1])[::-1], [0]]) if to_end else np.concatenate([[0], np.cumsum(seg)])
        tau_obs += cum[:, None]*c.tau[None, :]
        tau_sun += np.where(np.isinf(col)[:, None], 1e6, col[:, None]*c.tau[None, :])
        P = rayleigh_phase(cosT) if c.rayleigh else hg(c.g, cosT)
        beta += dens[:, None]*(c.tau*c.ssa*P)[None, :]
    return np.trapezoid(beta*np.exp(-tau_obs - tau_sun), s, axis=0)*atm.S0

# ---------------- Two-stream (delta-Eddington) for diffuse flux ----------------
def _two_stream(tau, w, g, mu0, albedo):
    """Delta-Eddington two-stream layer over a reflecting surface (Toon et al. 1989),
    for a unit direct beam (F0 = 1, perpendicular). With
      Fup(t) = k1 e^{kt} + Gam k2 e^{-kt} + Cup(t),  Fdn(t) = Gam k1 e^{kt} + k2 e^{-kt} + Cdn(t),
    Cup/Cdn(t) = Cup0/Cdn0 e^{-t/mu0}, the boundaries are Fdn_dif(0) = 0 at the top and
    Fup(tau) = A (Fdn_dif(tau) + mu0 e^{-tau/mu0}) at the surface."""
    tau = np.asarray(tau, float); w = np.asarray(w, float); g = np.asarray(g, float)
    f = g**2
    tau_p = (1-w*f)*tau; w_p = (1-f)*w/(1-w*f); g_p = (g-f)/(1-f)
    w_p = np.clip(w_p, 1e-6, 0.999999)
    g1 = (7-w_p*(4+3*g_p))/4; g2 = -(1-w_p*(4-3*g_p))/4
    g3 = (2-3*g_p*mu0)/4; g4 = 1-g3
    k = np.sqrt(np.maximum(g1**2-g2**2, 1e-12))
    denom = k**2 - 1/mu0**2
    denom = np.where(np.abs(denom) < 1e-9, 1e-9, denom)
    Cup0 = w_p*((g1-1/mu0)*g3 + g4*g2)/denom
    Cdn0 = w_p*((g1+1/mu0)*g4 + g2*g3)/denom
    Gam = g2/(g1+k)
    A = albedo
    beam = np.exp(-tau_p/mu0)
    Sdir = mu0*beam
    ekt = np.exp(k*tau_p); emkt = np.exp(-k*tau_p)
    a11, a12, b1 = Gam, 1.0, -Cdn0
    a21 = ekt - A*Gam*ekt
    a22 = Gam*emkt - A*emkt
    b2 = A*(Cdn0*beam+Sdir) - Cup0*beam
    det = a11*a22 - a12*a21
    k1 = (b1*a22 - a12*b2)/det
    k2 = (a11*b2 - a21*b1)/det
    return k1, k2, Gam, ekt, emkt, Cup0, Cdn0, beam, Sdir


def delta_eddington(tau, w, g, mu0, albedo):
    """Downward diffuse flux at the surface (with surface reflection through albedo) and the
    direct flux on a horizontal surface, for a unit direct beam."""
    k1, k2, Gam, ekt, emkt, Cup0, Cdn0, beam, Sdir = _two_stream(tau, w, g, mu0, albedo)
    Fdn_dif = Gam*k1*ekt + k2*emkt + Cdn0*beam
    return np.clip(Fdn_dif, 0, None), Sdir

# ---------------- Multiple scattering ----------------
# Light scattered more than once is carried by a table over altitude and the Sun's local
# elevation, J(h, el): the mean radiance of all the scattered light arriving at a point (and of
# the light off the ground). The air there scatters it again as sigma_s * J, the same in every
# direction, except for the first few orders, which keep their directions (below). As the table follows
# the Sun's elevation at each point, high air stays lit after sunset, and twilight dims and
# colours by itself. The table is Hillaire's (2020, Computer Graphics Forum 39(4):13-22), with
# the orders solved exactly instead of summed as a series.
#
# From each table node, rays in MS_NMU x MS_NPHI directions over the sphere gather the light
# scattered once on its way to the node (each part with its own phase function) and the sunlight
# off the ground: the source S. Every order after is J = S + K J, K being the light an even glow
# at the points along the rays, and off the ground where they meet it, sends to the node; the
# ground is lit by unknowns of its own, its irradiance at each Sun elevation. The system is
# solved per wavelength on every second altitude (ms_altitudes) and Sun elevation, so in thick skies, where the higher orders
# seep down far below the second, the light comes out right (the 30-bar Hadean within 2-18%
# of CalcMySky where that has converged). Between the nodes J is interpolated in log,
# as it falls by ten in a degree or two of the Sun's elevation in twilight; each solve takes the
# shape of that interpolation from the solve before, starting from plain bilinear.
#
# The orders 2 to MS_DIRN keep their directions, which matters for hazes and aerosols that scatter
# mostly forward: with them spread evenly instead, the hazy skies' deep twilight came out at half
# CalcMySky's. The once-scattered light arriving at a node from each direction, folded with each
# part's phase function toward every view direction, gives how much more or less than
# sigma_s * (its mean) the node sends each way (Jdir). That emission is carried along the rays to
# the other nodes, so the next order arrives from each direction as it should, and so on; the
# orders after MS_DIRN go through K. The view ray sees sigma_s * J (1 + R), R the shares of J
# the orders 2 to MS_DIRN + 1 add or take in its direction.
#
# Against CalcMySky (calcmysky_check.py): the modern sky within 2% at the zenith from noon to the
# Sun 14° down, the hazy skies' zenith 0-20% bright in twilight. CalcMySky never converged in the
# 30-bar Hadean's blue; there the diffuse light on the ground matches the two-stream flux, which
# is good in so thick a layer, to 1-5% from 450 nm (with the altitudes MS_DTAU apart in optical
# depth: at 1 km steps, as for thin skies, it lost 85-97% of the blue). Halving the steps here, solving on every node, or more
# directions or steps along a ray changes the sky by under 5%; the cos-zenith nodes matter most
# (12 to 24 per hemisphere took the hazy zenith down 6%, 24 to 36 a further 2%, 36 to 48 1%).
# The table is built with torch, on the GPU when there is one (14 s and 2.5 GB at these settings
# on an RTX 3080; about 15 minutes on the CPU).
MS_H = np.concatenate([np.arange(0.0, 10.0, 1.0), np.arange(10.0, 30.0, 2.0), np.arange(30.0, 120.1, 5.0)])
MS_DTAU = 0.3                        # most optical depth between two of the linear system's altitudes
MS_EL = np.concatenate([np.arange(-24.0, 16.0, 1.0), np.arange(16.0, 90.1, 3.0)])
MS_NMU, MS_NPHI, MS_NT = 36, 8, 48   # cos(zenith) nodes per hemisphere, azimuths over 0-180°, steps per ray
MS_CHUNK = 16                        # Sun elevations per pass
MS_A_BYTES = 0.5e9                   # the linear system is solved for as many wavelengths at once as fit
MS_TABLE_BYTES = 6.0e9               # a table that would need more GPU memory than this is refused
MS_ITER = 3                          # solves, each interpolating in the shape of the one before
MS_DIRN = 4                          # orders carried with their own directions (2 up)
# The columns toward the Sun, tabulated over altitude and u, the Sun's cosine placed between the
# horizon (u = 0) and the zenith (u = 1), so the Earth's shadow sits on a grid line at every height.
_SUN_H = np.concatenate([np.arange(0.0, 20.0, 0.25), np.arange(20.0, 120.1, 1.0)])
_SUN_NU = 161


def _mu_horizon(h):
    return -np.sqrt(np.maximum(1.0 - (R_E/(R_E + np.maximum(h, 0.0)))**2, 0.0))


def sun_column_table(atm):
    """Log columns of each part toward the Sun, [part, _SUN_H, u], u = (i/(_SUN_NU-1))^2."""
    H, U = np.meshgrid(_SUN_H, np.linspace(0.0, 1.0, _SUN_NU)**2, indexing='ij')
    muh = _mu_horizon(H)
    mu = muh + np.maximum(U, 1e-7)*(1.0 - muh)   # just above the horizon, so the ray clears the ground
    cols = path_columns([c.profile for c in atm.comps], (R_E + H).ravel(), mu.ravel(), n=400)
    return np.log(np.maximum(cols, 1e-30)).reshape(len(atm.comps), *H.shape)


def sun_tau(atm, tab, h, mu):
    """Optical depth toward the Sun, [..., LAM], from altitude h with the Sun's local cosine mu
    (inf where the Earth hides it), from sun_column_table."""
    h = np.clip(h, 0.0, _SUN_H[-1])
    muh = _mu_horizon(h)
    u = (mu - muh)/(1.0 - muh)
    fu = np.sqrt(np.clip(u, 0.0, 1.0))*(_SUN_NU - 1)
    iu = np.minimum(fu.astype(int), _SUN_NU - 2); wu = fu - iu
    fh = np.interp(h, _SUN_H, np.arange(len(_SUN_H)))
    ih = np.minimum(fh.astype(int), len(_SUN_H) - 2); wh = fh - ih
    lc = ((tab[:, ih, iu]*(1 - wu) + tab[:, ih, iu + 1]*wu)*(1 - wh)
          + (tab[:, ih + 1, iu]*(1 - wu) + tab[:, ih + 1, iu + 1]*wu)*wh)
    tau = np.tensordot(np.exp(lc), np.stack([c.tau for c in atm.comps]), axes=([0], [0]))
    return np.where((u >= 0)[..., None], tau, np.inf)


def _gauss_legendre(n, a, b):
    x, w = np.polynomial.legendre.leggauss(n)
    return 0.5*(b - a)*x + 0.5*(b + a), 0.5*(b - a)*w


def _ms_directions():
    """Directions about a point (cos zenith, azimuth from the Sun) and their solid angles (sum 4 pi),
    with the cos-zenith and azimuth nodes they are the grid of."""
    m1, w1 = _gauss_legendre(MS_NMU, -1.0, 0.0)
    m2, w2 = _gauss_legendre(MS_NMU, 0.0, 1.0)
    phi, wphi = _gauss_legendre(MS_NPHI, 0.0, np.pi)
    mus = np.concatenate([m1, m2])
    MU, PHI = np.meshgrid(mus, phi, indexing='ij')
    W = np.outer(np.concatenate([w1, w2]), 2.0*wphi)   # azimuths past 180° mirror these
    return MU.ravel(), PHI.ravel(), W.ravel(), mus, phi


def ray_weights(tau, t):
    """Weights [..., n, LAM] for the integral of e^-tau Q dt along rays sampled at t [..., n], tau
    the optical depth from their start: exact for a constant extinction within a step and Q taken
    as the mean of its ends, so a step many optical depths thick still counts the light it sends."""
    dtau = np.diff(tau, axis=-2)
    dt = np.diff(t, axis=-1)[..., None]
    x = np.maximum(dtau, 1e-12)
    seg = np.exp(-tau[..., :-1, :])*dt*np.where(dtau > 1e-6, -np.expm1(-x)/x, 1.0 - 0.5*dtau)
    w = np.zeros_like(tau)
    w[..., :-1, :] += 0.5*seg
    w[..., 1:, :] += 0.5*seg
    return w


def _node_rays(atm, h0, mu, ext, sca, q):
    """Rays from a node at altitude h0 in the directions mu (cos zenith), to the ground or the top."""
    r = R_E + h0
    rt = R_E + MS_H[-1]
    disc = R_E**2 - r**2*(1.0 - mu**2)
    ground = (mu < 0) & (disc >= 0)
    d = np.where(ground, np.maximum(-r*mu - np.sqrt(np.maximum(disc, 0.0)), 0.0),
                 np.maximum(-r*mu + np.sqrt(np.maximum(rt**2 - r**2*(1.0 - mu**2), 0.0)), 0.0))
    t = d[:, None]*q[None, :]
    ry = np.sqrt(r*r + t*t + 2.0*r*t*mu[:, None])
    hy = np.clip(ry - R_E, 0.0, MS_H[-1])
    dens = np.stack([c.profile(hy) for c in atm.comps])            # [part, dir, step]
    kext = np.einsum('cdt,cl->dtl', dens, ext)
    ksca = np.einsum('cdt,cl->dtl', dens, sca)
    dt = np.diff(t, axis=1)
    tau = np.concatenate([np.zeros((len(mu), 1, len(LAM))),
                          np.cumsum(0.5*(kext[:, 1:] + kext[:, :-1])*dt[..., None], axis=1)], axis=1)
    return dict(r=r, ground=ground, d=d, t=t, ry=ry, hy=hy, dens=dens, ksca=ksca,
                w=ray_weights(tau, t), Tend=np.exp(-tau[:, -1]))


def _node_sun(g, ms, mu, sinmu, cosphi):
    """For Sun cosines ms at the node: cos(direction, Sun) [E, dir], the Sun's local cosine along
    the rays [E, dir, step] and where they meet the ground [E, dir]."""
    nu = ms[:, None]*mu[None, :] + np.sqrt(1.0 - ms**2)[:, None]*(sinmu*cosphi)[None, :]
    mus_y = (g['r']*ms[:, None, None] + g['t'][None]*nu[:, :, None])/g['ry'][None]
    mus_g = (g['r']*ms[:, None] + g['d'][None, :]*nu)/R_E
    return nu, mus_y, mus_g


def _bilin(x, nodes):
    """Index and weight of each x between the nodes (clamped)."""
    f = np.interp(x, nodes, np.arange(len(nodes)))
    i = np.minimum(f.astype(int), len(nodes) - 2)
    return i, f - i


def _torch():
    import torch
    return torch, ('cuda' if torch.cuda.is_available() else 'cpu')


def _tbilin(torch, x, nodes):
    """As _bilin, on tensors: the index and weight of each x between the nodes (clamped)."""
    i = (torch.searchsorted(nodes, x.contiguous(), right=True) - 1).clamp(0, len(nodes) - 2)
    x0, x1 = nodes[i], nodes[i + 1]
    return i, ((x - x0)/(x1 - x0)).clamp(0.0, 1.0)


def _tphase(torch, c, cosT):
    if c.rayleigh:
        return 3.0/(16.0*np.pi)*(1.0 + cosT**2)
    g = c.g
    return (1.0 - g*g)/(4.0*np.pi*(1.0 + g*g - 2.0*g*cosT)**1.5)


def _tsun_T(torch, tab, ext, sunH, h, mu):
    """sun_tau on tensors, as a transmittance [..., LAM] (0 where the Earth hides the Sun)."""
    h = h.clamp(0.0, float(_SUN_H[-1]))
    muh = -torch.sqrt((1.0 - (R_E/(R_E + h))**2).clamp(min=0.0))
    u = (mu - muh)/(1.0 - muh)
    fu = torch.sqrt(u.clamp(0.0, 1.0))*(_SUN_NU - 1)
    iu = fu.long().clamp(max=_SUN_NU - 2); wu = fu - iu
    ih, wh = _tbilin(torch, h, sunH)
    lc = ((tab[:, ih, iu]*(1 - wu) + tab[:, ih, iu + 1]*wu)*(1 - wh)
          + (tab[:, ih + 1, iu]*(1 - wu) + tab[:, ih + 1, iu + 1]*wu)*wh)
    T = torch.exp(-torch.einsum('c...,cl->...l', lc.exp(), ext))
    return torch.where((u >= 0)[..., None], T, torch.zeros((), dtype=T.dtype, device=T.device))


def _tlookup(torch, lut, h, mus, muv, phv):
    """ms_lookup on tensors, for flat points: J (1 + R) [P, LAM]."""
    el = torch.rad2deg(torch.asin(mus.clamp(-1.0, 1.0)))
    ih, wh = _tbilin(torch, h, lut['h']); ie, we = _tbilin(torch, el, lut['el'])
    im, wm = _tbilin(torch, muv, lut['mu']); ip, wp = _tbilin(torch, phv, lut['phi'])
    L = lut['logJ']
    wh, we = wh[:, None], we[:, None]
    J = torch.exp((L[ih, ie]*(1 - we) + L[ih, ie + 1]*we)*(1 - wh)
                  + (L[ih + 1, ie]*(1 - we) + L[ih + 1, ie + 1]*we)*wh)
    R = lut['R']
    nE_, nK, nphi = R.shape[1], R.shape[2], len(lut['phi'])
    Rf = R.reshape(-1, R.shape[3])
    out = torch.zeros_like(J)
    for a, wa in ((ih, 1 - wh), (ih + 1, wh)):
        for b, wb in ((ie, 1 - we), (ie + 1, we)):
            hb = (a*nE_ + b)*nK
            for c, wc in ((im, 1 - wm), (im + 1, wm)):
                for d, wd in ((ip, 1 - wp), (ip + 1, wp)):
                    out += (wa*wb)*(wc*wd)[:, None]*Rf[hb + c*nphi + d]
    return J*(1.0 + out)


def ms_altitudes(atm):
    """The table's altitudes for atm, the linear system's at every second one. Those are 2 km apart
    below 10 km, 4 km to 30 km and 10 km above (MS_H for every thin sky), and closer wherever the
    air holds more than MS_DTAU optical depths (at its most opaque wavelength) between them: in
    the 30-bar Hadean the blue's mean free path near the ground is 360 m, and a coarser grid
    loses most of the blue light diffusing down to it."""
    top = float(MS_H[-1])
    def k(h):
        return sum(float(np.max(c.tau))*float(c.profile(np.array([h]))[0]) for c in atm.comps)
    U = [0.0]
    while U[-1] < top - 1e-9:
        h = U[-1]
        b = 10.0 if h < 10.0 - 1e-9 else 30.0 if h < 30.0 - 1e-9 else top
        base = 2.0 if b == 10.0 else 4.0 if b == 30.0 else 10.0
        step = min(base, max(MS_DTAU/max(k(h), k(min(h + base, b)), 1e-12), 0.02))
        n = int(np.ceil((b - h)/step - 1e-9))        # even steps up to the band's top
        U.append(h + (b - h)/n)
    U = np.array(U)
    return np.sort(np.concatenate([U, 0.5*(U[1:] + U[:-1])]))


def ms_table_bytes(atm):
    """About the most GPU memory ms_table takes for atm, in bytes."""
    nH = len(ms_altitudes(atm)); nE = len(MS_EL); nD = 2*MS_NMU*MS_NPHI; nL = len(LAM)
    nHu, nEu = (nH + 1)//2, (nE + 1)//2
    Nt = nHu*nEu + nEu
    big = nH*nE*nD*nL*4                              # the second order's directions, then R
    orders = MS_DIRN*nHu*nEu*nD*nL*4                 # the later orders' (and the lookup table)
    chunk = 10*MS_CHUNK*nD*MS_NT*nL*4 + 4*nD*MS_NT*nL*4   # a pass's working arrays, one node's rays
    G = max(1, min(nL, int(MS_A_BYTES//(Nt*Nt*8))))
    return int(big + orders + chunk + 2.5*G*Nt*Nt*8 + 0.6e9)


def ms_table(atm):
    """The multiple-scattering table (see above): log J [altitude, MS_EL, LAM] and the directional
    share R [altitude, MS_EL, view direction, LAM], on ms_altitudes(atm) (its 'h'). Runs on the GPU when torch has CUDA, and hands
    back the GPU's memory once its tensors are gone."""
    import gc
    out = _ms_table(atm)
    gc.collect()
    torch, dev = _torch()
    if dev == 'cuda':
        torch.cuda.empty_cache()
    return out


def build_ms_table(atm):
    """ms_table in a child process of its own (MS_IN_CHILD), which ends when the table is made, so
    nothing is left on the GPU: a process that has used CUDA keeps its context (0.5-1 GB) for life."""
    if not MS_IN_CHILD:
        return ms_table(atm)
    import multiprocessing as mp
    from concurrent.futures import ProcessPoolExecutor
    with ProcessPoolExecutor(max_workers=1, mp_context=mp.get_context('spawn')) as ex:
        return ex.submit(ms_table, atm).result()


def _ms_table(atm):
    torch, dev = _torch()
    need = ms_table_bytes(atm)
    if dev == 'cuda' and need > MS_TABLE_BYTES:
        raise MemoryError(f'the multiple-scattering table would need about {need/1e9:.1f} GB of GPU '
                          f'memory, over MS_TABLE_BYTES ({MS_TABLE_BYTES/1e9:.1f} GB)')
    H = ms_altitudes(atm)
    f32, f64 = torch.float32, torch.float64
    T_ = lambda a, dt=f32: torch.as_tensor(np.asarray(a), dtype=dt, device=dev)
    tab = T_(sun_column_table(atm)); sunH = T_(_SUN_H)
    mu, phi, W, mu_nodes, phi_nodes = _ms_directions()
    sinmu, cosphi = np.sqrt(1.0 - mu**2), np.cos(phi)
    sca = np.stack([c.tau*c.ssa for c in atm.comps])
    ext = np.stack([c.tau for c in atm.comps])
    ext_t, sca_t, S0 = T_(ext), T_(sca), T_(atm.S0)
    q = np.linspace(0.0, 1.0, MS_NT)**2            # steps along a ray, finest at the node
    mus = np.sin(np.radians(MS_EL))
    alb, nH, nE, nD, nL = atm.albedo, len(H), len(MS_EL), len(mu), len(LAM)
    mu_t, W_t = T_(mu), T_(W)
    Wup_t = T_(W*mu*(mu > 0))
    # Phase functions between the directions, for the orders' directions: folded over the
    # mirror azimuths, M[k, d] W-weighted, each scattering all it receives.
    cpos = np.outer(mu, mu) + np.outer(sinmu, sinmu)*np.cos(phi[:, None] - phi[None, :])
    cneg = np.outer(mu, mu) + np.outer(sinmu, sinmu)*np.cos(phi[:, None] + phi[None, :])
    M = [0.5*W[None, :]*((rayleigh_phase(cpos) + rayleigh_phase(cneg)) if c.rayleigh
                         else (hg(c.g, cpos) + hg(c.g, cneg))) for c in atm.comps]
    M = [T_(m/m.sum(axis=1, keepdims=True)) for m in M]

    def node(h0):
        g = _node_rays(atm, h0, mu, ext, sca, q)
        k_c = np.stack([c.profile(np.array([h0]))[0]*s for c, s in zip(atm.comps, sca)])
        return dict(r=g['r'], d=T_(g['d']), t=T_(g['t']), ry=T_(g['ry']), hy=T_(g['hy']),
                    dens=T_(g['dens']), w=T_(g['w']), ksca=T_(g['ksca']), gd=T_(g['ground'], torch.bool),
                    gd_any=bool(g['ground'].any()), Tend=T_(g['Tend']),
                    share=T_(k_c/np.maximum(k_c.sum(0), 1e-300)), share_np=k_c.sum(1) > 0)

    def sun_geo(g, ms):
        ms = T_(ms)
        nu = ms[:, None]*mu_t[None, :] + torch.sqrt(1.0 - ms**2)[:, None]*T_(sinmu*cosphi)[None, :]
        mus_y = (g['r']*ms[:, None, None] + g['t'][None]*nu[:, :, None])/g['ry'][None]
        mus_g = (g['r']*ms[:, None] + g['d'][None, :]*nu)/R_E
        return nu, mus_y, mus_g

    def fold(g, Ln):
        """The next order's emission toward each view direction, less its mean (Jdir)."""
        n = Ln.shape[0]
        flat = Ln.permute(1, 0, 2).reshape(nD, -1)
        G = 0.0
        for i in range(len(atm.comps)):
            if g['share_np'][i]:
                G = G + g['share'][i][None, None, :]*(M[i] @ flat).reshape(nD, n, nL).permute(1, 0, 2)
        return G - (torch.einsum('d,edl->el', W_t, Ln)/(4.0*np.pi))[:, None, :]

    # Pass 1: the sources, the ground's first-order irradiance and the second order's directions.
    S = torch.zeros((nH, nE, nL), dtype=f32, device=dev); E1 = None
    Jdir = torch.zeros((nH, nE, nD, nL), dtype=f32, device=dev)
    for ih, h0 in enumerate(H):
        g = node(h0)
        L1in = torch.zeros((nE, nD, nL), dtype=f32, device=dev)
        for e0 in range(0, nE, MS_CHUNK):
            nu, mus_y, mus_g = sun_geo(g, mus[e0:e0 + MS_CHUNK])
            T_sun = _tsun_T(torch, tab, ext_t, sunH, g['hy'].expand_as(mus_y), mus_y)
            P = torch.stack([_tphase(torch, c, nu) for c in atm.comps])
            src = torch.einsum('cdt,cl,ced->edtl', g['dens'], sca_t, P)
            L1 = torch.einsum('dtl,edtl->edl', g['w'], src*T_sun)
            T_g = _tsun_T(torch, tab, ext_t, sunH, torch.zeros_like(mus_g), mus_g)
            Lg = torch.where(g['gd'][None, :, None],
                             g['Tend'][None]*T_g*(alb/np.pi)*mus_g.clamp(min=0.0)[..., None], 0.0)
            L1in[e0:e0 + MS_CHUNK] = (L1 + Lg)*S0
        S[ih] = torch.einsum('d,edl->el', W_t, L1in)/(4.0*np.pi)
        if E1 is None:
            E1 = torch.einsum('d,edl->el', Wup_t, L1in)
        Jdir[ih] = fold(g, L1in)

    # The second order's emission per unit sigma_s, S (1 + R2), and the ground's first-order
    # irradiance, for the second-order light's own transport (pass 2).
    S = torch.maximum(S, 1e-30*S.amax(dim=(0, 1)))
    R2 = Jdir                                        # in place: the largest array, held once
    R2.div_(S[:, :, None, :])
    torch.nan_to_num_(R2, nan=0.0, posinf=100.0, neginf=-1.0).clamp_(-1.0, 100.0)
    del Jdir
    lut = dict(logJ=torch.log(S), R=R2, mu=T_(mu_nodes), phi=T_(phi_nodes), h=T_(H), el=T_(MS_EL))
    logEp, Ep_el = torch.log(torch.maximum(E1, 1e-30*E1.amax(dim=0))), T_(MS_EL)

    # Pass 2: J, and e (the ground's irradiance over pi), on every second altitude and Sun elevation,
    # solved per wavelength (in groups of as many as fit MS_A_BYTES). Between the nodes J is interpolated in log; to keep the system linear, each solve
    # takes the shape of that interpolation from the solve before (the first is plain bilinear,
    # which conserves light, so it always has a positive solution), and MS_ITER solves settle it.
    hu, eu = np.arange(0, nH, 2), np.arange(0, nE, 2)
    UH, UE = T_(H[hu]), T_(MS_EL[eu])
    nHu, nEu = len(hu), len(eu)
    Ng = nHu*nEu; Nt = Ng + nEu
    u1 = torch.cat([S[hu][:, eu].reshape(Ng, nL), E1[eu]/np.pi], dim=0).to(f64)
    # The orders 2 to MS_DIRN carried with their own directions: at each node, from each
    # direction, the emission of the order before along the ray (from the table lut, S (1 + R)
    # for the second order) and the ground's reflection of that order's irradiance; its mean,
    # and the ground's irradiance, are u_n. Folded with the phase functions toward each view
    # direction, it gives the next order's emission, Jdir. The orders after MS_DIRN go through K.
    # The rays from the unknowns' nodes are kept in the computer's memory and taken to the GPU a
    # node at a time; their geometry toward the Sun is worked out again each time it is needed.
    # Cached on the GPU, they took several GB for the thickest airs.
    geo = []
    for iu_h, ih in enumerate(hu):
        g = _node_rays(atm, H[ih], mu, ext, sca, q)
        k_c = np.stack([c.profile(np.array([H[ih]]))[0]*s for c, s in zip(atm.comps, sca)])
        C = lambda a, dt=f32: torch.as_tensor(np.asarray(a), dtype=dt)
        geo.append(dict(iu_h=iu_h, ih=ih, r=g['r'], d=C(g['d']), t=C(g['t']), ry=C(g['ry']), hy=C(g['hy']),
                        wks=C(g['w']*g['ksca']), gd=C(g['ground'], torch.bool), gd_any=bool(g['ground'].any()),
                        Tend=C(g['Tend']), share=C(k_c/np.maximum(k_c.sum(0), 1e-300)), share_np=k_c.sum(1) > 0))

    def on_dev(g0):
        g = {k: (v.to(dev) if torch.is_tensor(v) else v) for k, v in g0.items()}
        g['uhy'], g['uwh'] = _tbilin(torch, g['hy'], UH)
        g['base'] = (W_t/(4.0*np.pi))[:, None, None]*g['wks']
        return g

    def chunks(g):
        muy = (g['r']*mu_t[:, None] + g['t'])/g['ry']           # the direction's local cosine
        for c0 in range(0, nEu, MS_CHUNK):
            eus = np.arange(c0, min(c0 + MS_CHUNK, nEu))
            nu, mus_y, mus_g = sun_geo(g, mus[eu[eus]])
            el_y = torch.rad2deg(torch.asin(mus_y.clamp(-1, 1)))
            el_g = torch.rad2deg(torch.asin(mus_g.clamp(-1, 1)))
            muyb = muy.expand_as(mus_y)
            den = torch.sqrt(((1.0 - muyb**2)*(1.0 - mus_y**2)).clamp(min=1e-12))
            phy = torch.acos(((nu[:, :, None] - muyb*mus_y)/den).clamp(-1.0, 1.0))   # and azimuth
            uey, uwe = _tbilin(torch, el_y, UE); uep, uwep = _tbilin(torch, el_g, UE)
            yield dict(eus=eus, eus_t=T_(eus, torch.long), uey=uey, uwe=uwe, uep=uep, uwep=uwep,
                       mus_y=mus_y, el_g=el_g, muy=muyb, phy=phy)
    us, Jdirs = [], []
    for order in range(2, MS_DIRN + 1):
        Jn = torch.zeros((nHu, nEu, nL), dtype=f32, device=dev); en = torch.zeros((nEu, nL), dtype=f32, device=dev)
        Jdn = torch.zeros((nHu, nEu, nD, nL), dtype=f32, device=dev)
        for g0 in geo:
            g = on_dev(g0)
            for ch in chunks(g):
                mus_y = ch['mus_y']
                Gm = _tlookup(torch, lut, g['hy'].expand_as(mus_y).reshape(-1), mus_y.reshape(-1),
                              ch['muy'].reshape(-1), ch['phy'].reshape(-1)).reshape(*mus_y.shape, nL)
                Ln = torch.einsum('dtl,edtl->edl', g['wks'], Gm)
                if g['gd_any']:
                    iep, wep = _tbilin(torch, ch['el_g'], Ep_el)
                    le = logEp[iep]*(1 - wep[..., None]) + logEp[iep + 1]*wep[..., None]
                    Ln = Ln + torch.where(g['gd'][None, :, None], g['Tend'][None]*(alb/np.pi)*torch.exp(le), 0.0)
                Jn[g['iu_h'], ch['eus_t']] = torch.einsum('d,edl->el', W_t, Ln)/(4.0*np.pi)
                if g['ih'] == 0:
                    en[ch['eus_t']] = torch.einsum('d,edl->el', Wup_t, Ln)/np.pi
                Jdn[g['iu_h'], ch['eus_t']] = fold(g, Ln)
        us.append(torch.cat([Jn.reshape(Ng, nL), en], dim=0).to(f64))
        Jdirs.append(Jdn)
        Jnf = torch.maximum(Jn, 1e-30*Jn.amax(dim=(0, 1)))
        Rn = torch.nan_to_num(Jdn/Jnf[:, :, None, :], nan=0.0, posinf=100.0, neginf=-1.0).clamp(-1.0, 100.0)
        lut = dict(logJ=torch.log(Jnf), R=Rn, mu=T_(mu_nodes), phi=T_(phi_nodes), h=UH, el=UE)
        del Rn
        enp = en*np.pi
        logEp, Ep_el = torch.log(torch.maximum(enp, 1e-30*enp.amax(dim=0))), UE
    del lut
    # J = u_1 + ... + u_N + K (J - u_1 - ... - u_N-1)
    U_known = u1 + sum(us[:-1]) if len(us) > 1 else u1
    u_last = us[-1]
    lim = float(np.log(100.0))
    upmask = (4.0*mu_t*(mu_t > 0))[None, :, None, None]
    logJu = logEu = None
    G = max(1, min(nL, int(MS_A_BYTES//(Nt*Nt*8))))   # wavelengths per solve
    for _ in range(MS_ITER):
        X = torch.empty((Nt, nL), dtype=f64, device=dev)
        for l0 in range(0, nL, G):
            ls = slice(l0, min(l0 + G, nL)); nl = ls.stop - ls.start
            A = torch.zeros((nl, Nt*Nt), dtype=f64, device=dev)
            for g0 in geo:
                g = on_dev(g0)
                base = g['base'][..., ls]
                for ch in chunks(g):
                    eus_t, uey, uwe = ch['eus_t'], ch['uey'], ch['uwe']
                    uhb, uwhb = g['uhy'].expand_as(uey), g['uwh'].expand_as(uey)
                    corners = ((0, 0, (1 - uwhb)*(1 - uwe)), (1, 0, uwhb*(1 - uwe)),
                               (0, 1, (1 - uwhb)*uwe), (1, 1, uwhb*uwe))
                    if logJu is not None:
                        lJ = logJu[..., ls]
                        ly = sum(cw[..., None]*lJ[uhb + dh, uey + de] for dh, de, cw in corners)
                    rows = [(g['iu_h']*nEu + eus_t, base[None])]
                    if g['ih'] == 0:   # the ground's irradiance gathers from the upward rays
                        rows.append((Ng + eus_t, base[None]*upmask))
                    for dh, de, cw in corners:
                        kh, ke = uhb + dh, uey + de
                        wgt = cw[..., None] if logJu is None else \
                            cw[..., None]*torch.exp((ly - lJ[kh, ke]).clamp(-lim, lim))
                        col = kh*nEu + ke                                   # [E, dir, step]
                        for r_idx, Vr in rows:
                            flat = (r_idx[:, None, None]*Nt + col).reshape(-1)
                            A.index_add_(1, flat, -(Vr*wgt).reshape(-1, nl).T.to(f64))
                    # the ground, where the rays meet it, lit by its irradiance unknowns
                    if g['gd_any']:
                        uep, uwep = ch['uep'], ch['uwep']
                        coef = ((W_t*g['gd'])[None, :, None]/(4.0*np.pi)*g['Tend'][None]*alb)[..., ls]  # [E, dir, l]
                        pc = ((uep, 1 - uwep), (uep + 1, uwep))
                        if logEu is not None:
                            lE = logEu[..., ls]
                            lg = sum(cw[..., None]*lE[ci] for ci, cw in pc)
                        for ci, cw in pc:
                            wgt = cw[..., None] if logEu is None else \
                                cw[..., None]*torch.exp((lg - lE[ci]).clamp(-lim, lim))
                            flat = ((g['iu_h']*nEu + eus_t)[:, None]*Nt + Ng + ci).reshape(-1)
                            A.index_add_(1, flat, -(coef*wgt).reshape(-1, nl).T.to(f64))
            A = A.reshape(nl, Nt, Nt)
            A.diagonal(dim1=1, dim2=2).add_(1.0)
            rhs = torch.einsum('lij,jl->il', A, U_known[:, ls]) + u_last[:, ls]
            for j in range(nl):                       # one at a time: the batched solver is for small systems
                X[:, l0 + j] = torch.linalg.solve(A[j], rhs[:, j])
            del A, rhs
        Xp = torch.maximum(X, 1e-30*X.amax(dim=0))
        logJu = torch.log(Xp[:Ng]).reshape(nHu, nEu, nL).to(f32)
        logEu = torch.log(Xp[Ng:]).to(f32)
    # J on the table, log-interpolated from the unknowns' nodes.
    ah, awh = _tbilin(torch, T_(H), UH); ae, awe = _tbilin(torch, T_(MS_EL), UE)
    awh = awh[:, None, None]; awe = awe[None, :, None]
    logJ = ((logJu[ah][:, ae]*(1 - awe) + logJu[ah][:, ae + 1]*awe)*(1 - awh)
            + (logJu[ah + 1][:, ae]*(1 - awe) + logJu[ah + 1][:, ae + 1]*awe)*awh)
    # R: the second order's directions as a share of J (R2 holds them as a share of S), in place,
    # plus the later orders', from the unknowns' nodes to the table a slab of altitudes at a time.
    R = R2
    del R2
    R.mul_((S/torch.exp(logJ))[:, :, None, :])
    r3 = torch.nan_to_num(sum(Jdirs)/torch.exp(logJu)[:, :, None, :], nan=0.0, posinf=100.0, neginf=-1.0)
    r3.clamp_(-1.0, 100.0)
    del Jdirs
    awe4 = awe[..., None]
    for i0 in range(0, nH, 8):
        sl = slice(i0, min(i0 + 8, nH)); a = ah[sl]; w4 = awh[sl][..., None]
        R[sl] += ((r3[a][:, ae]*(1 - awe4) + r3[a][:, ae + 1]*awe4)*(1 - w4)
                  + (r3[a + 1][:, ae]*(1 - awe4) + r3[a + 1][:, ae + 1]*awe4)*w4)
    # where J is all but nothing, its directions don't matter
    torch.nan_to_num_(R, nan=0.0, posinf=100.0, neginf=-1.0).clamp_(-1.0, 100.0)
    return dict(logJ=logJ.double().cpu().numpy(), R=R.cpu().numpy(), mu=mu_nodes, phi=phi_nodes,
                h=H, el=MS_EL)


def ms_lookup(lut, h, mu_sun, mu_v=None, phi_v=None):
    """J [len(h), LAM] at altitudes h with the Sun's local cosine mu_sun (log-bilinear); with the
    view direction's local cosine mu_v and azimuth from the Sun phi_v, times 1 + R."""
    el = np.degrees(np.arcsin(np.clip(mu_sun, -1.0, 1.0)))
    ih, wh = _bilin(h, lut.get('h', MS_H)); wh = wh[:, None]
    ie, we = _bilin(el, lut.get('el', MS_EL)); we = we[:, None]
    L = lut['logJ']
    J = np.exp((L[ih, ie]*(1 - we) + L[ih, ie + 1]*we)*(1 - wh)
               + (L[ih + 1, ie]*(1 - we) + L[ih + 1, ie + 1]*we)*wh)
    if mu_v is None:
        return J
    im, wm = _bilin(mu_v, lut['mu'])
    ip, wp = _bilin(phi_v, lut['phi'])
    nphi = len(lut['phi'])
    R = lut['R']
    out = 0.0
    for a, wa in ((ih, 1 - wh), (ih + 1, wh)):
        for b, wb in ((ie, 1 - we), (ie + 1, we)):
            for c, wc in ((im, 1 - wm), (im + 1, wm)):
                for d, wd in ((ip, 1 - wp), (ip + 1, wp)):
                    out = out + wa*wb*(wc*wd)[:, None]*R[a, b, c*nphi + d]
    return J*(1.0 + out)


def ms_along_ray(atm, s, h, mu_sun, mu_v=None, phi_v=None):
    """The multiply scattered light gathered along a sampled view ray, seen from s[0]: the air's
    sigma_s * J(1 + R) at each point, dimmed on its way to the observer."""
    lut = atm.ms_lut()
    ds = np.diff(s)
    tau = np.zeros((len(s), len(LAM))); ksca = np.zeros_like(tau)
    for c in atm.comps:
        dens = c.profile(h)
        seg = 0.5*(dens[1:] + dens[:-1])*ds
        tau += np.concatenate([[0], np.cumsum(seg)])[:, None]*c.tau[None, :]
        ksca += dens[:, None]*(c.tau*c.ssa)[None, :]
    w = ray_weights(tau, s)
    return np.sum(w*ksca*ms_lookup(lut, h, mu_sun, mu_v, phi_v), axis=0)


# ---------------- Process pools ----------------
MS_IN_CHILD = True    # build each table in a child process that gives all its GPU memory back
MS_GPU_SLOTS = 2      # tables a worker_pool builds at once: 3-3.5 GB apiece with the child's
                      # CUDA context, kept within about 8 GB of the GPU's 12
MS_WORKERS = 6        # its workers: the rest sample the sky on the CPU meanwhile
_GPU_SLOTS = None


def _init_worker(slots):
    global _GPU_SLOTS
    _GPU_SLOTS = slots


def worker_pool(n=None):
    """A process pool for the scripts that sample the sky (daycycle, spectra, shafts, airgrid):
    n workers (MS_WORKERS), at most MS_GPU_SLOTS of them building a multiple-scattering table at a
    time, so the GPU's memory holds however many there are. The workers never touch the GPU
    themselves (build_ms_table)."""
    import multiprocessing as mp
    from concurrent.futures import ProcessPoolExecutor
    ctx = mp.get_context('spawn')
    return ProcessPoolExecutor(max_workers=n or MS_WORKERS, mp_context=ctx, initializer=_init_worker,
                               initargs=(ctx.Semaphore(MS_GPU_SLOTS),))


# ---------------- Scene ----------------
class Atmosphere:
    def __init__(self, comps, albedo=0.15, sun_T=5772.0, sun_L=1.0):
        self.comps, self.albedo = comps, albedo
        self.S0 = solar_spectrum(sun_T, sun_L)
        self._ms = {}

    def total_tau(self):
        return sum(c.tau for c in self.comps)

    def scat_tau(self):
        return sum(c.tau*c.ssa for c in self.comps)

    def eff_ssa_g(self):
        ts = self.scat_tau(); tt = self.total_tau()
        w = ts/np.maximum(tt, 1e-12)
        g = sum(c.tau*c.ssa*c.g for c in self.comps)/np.maximum(ts, 1e-12)
        return w, g

    def direct_sun(self, sun_zen_deg, h0=0.0):
        r0 = np.array([R_E+h0]); mu = np.array([np.cos(np.radians(sun_zen_deg))])
        cols = path_columns([c.profile for c in self.comps], r0, mu)[:, 0]
        T = np.ones_like(LAM)
        for c, col in zip(self.comps, cols):
            T = T*np.exp(-c.tau*col)
        return self.S0*T

    def radiance(self, view_zen_deg, view_az_deg, sun_zen_deg, sun_az_deg=0.0, h0=0.0, ms=True):
        """Spectral sky radiance (relative units) for observer at ground."""
        zv, av = np.radians(view_zen_deg), np.radians(view_az_deg)
        zs, as_ = np.radians(sun_zen_deg), np.radians(sun_az_deg)
        # scattering angle
        cosT = np.cos(zv)*np.cos(zs) + np.sin(zv)*np.sin(zs)*np.cos(av-as_)
        s, h, x, z, r = ray_points(h0, zv)
        keep = h < 120
        s, h, x, z, r = s[keep], h[keep], x[keep], z[keep], r[keep]
        # local sun zenith cosine at each point (sun direction fixed in observer frame;
        # local vertical rotates): local vertical unit = (x,z)/r ; sun dir = (sin zs cos(as-av)... )
        # put ray in plane containing observer vertical and view direction; sun dir 3D:
        sun = np.array([np.sin(zs)*np.cos(as_-av), np.sin(zs)*np.sin(as_-av), np.cos(zs)])
        vert = np.stack([x/r, np.zeros_like(x), z/r], axis=1)
        mu_sun_local = vert @ sun
        cols = path_columns([c.profile for c in self.comps], r, mu_sun_local)
        I_ss = single_scatter(self, s, h, cols, cosT)
        if not ms:
            return I_ss
        if ms == 'two_stream':
            return I_ss + self.multiple_scatter(sun_zen_deg)
        # the view direction at each point: its local cosine, and its azimuth from the Sun's
        v = np.array([np.sin(zv), 0.0, np.cos(zv)])
        mu_v = vert @ v
        vt = v[None, :] - mu_v[:, None]*vert
        st = sun[None, :] - mu_sun_local[:, None]*vert
        nrm = np.linalg.norm(vt, axis=1)*np.linalg.norm(st, axis=1)
        cphi = np.where(nrm > 1e-12, np.sum(vt*st, axis=1)/np.maximum(nrm, 1e-300), 1.0)
        I_ms = ms_along_ray(self, s, h, mu_sun_local, mu_v, np.arccos(np.clip(cphi, -1.0, 1.0)))
        return I_ms if ms == 'only' else I_ss + I_ms

    def ms_lut(self):
        """The multiple-scattering table (build_ms_table), built on first use (in a worker_pool,
        when one of its GPU slots is free)."""
        if not hasattr(self, '_ms_lut'):
            if _GPU_SLOTS is None:
                self._ms_lut = build_ms_table(self)
            else:
                with _GPU_SLOTS:
                    self._ms_lut = build_ms_table(self)
        return self._ms_lut

    def multiple_scatter(self, sun_zen_deg):
        """The diffuse radiance added to single scattering. It does not depend on the
        view direction, so it is kept per solar zenith angle."""
        if sun_zen_deg in self._ms:
            return self._ms[sun_zen_deg]
        # multiple scattering: two-stream diffuse flux minus the single-scatter hemispheric flux
        zs = np.radians(sun_zen_deg)
        mu0 = max(np.cos(zs), 0.02)
        w, g = self.eff_ssa_g()
        tt = self.total_tau(); ts = self.scat_tau()
        Fdif, _ = delta_eddington(tt, w, g, mu0, self.albedo)
        # hemispheric flux of single scattering (plane-parallel estimate)
        # F_ss ≈ S0 * ts/ (4) * mu0/(mu0+mubar) * (1-exp(-tt*(1/mu0+1/mubar))) / tt * (2) crude isotropic-eq
        mu = np.linspace(0.005, 0.995, 100)[:, None]
        with np.errstate(divide='ignore', invalid='ignore'):
            term = mu0/(mu0-mu)*(np.exp(-tt[None,:]/mu0)-np.exp(-tt[None,:]/mu))
            lim = (tt[None,:]/mu0)*np.exp(-tt[None,:]/mu0)  # limit mu->mu0
            term = np.where(np.abs(mu0-mu) < 0.02, lim, term)
        F_ss = self.S0*(ts/tt)*0.5*np.trapezoid(mu*term, mu[:,0], axis=0)
        F_ms = np.clip(Fdif*self.S0 - F_ss, 0, None)
        # The two-stream term is plane-parallel, so it is not valid on the horizon.
        # A hard cut there drops optically thick skies (the 30-bar Hadean, an impact
        # winter) by an order of magnitude between the samples on either side of 6:00.
        # Fold it out exponentially from 10° above the horizon; each degree is a
        # small step, so sunrise is a fade rather than a jump.
        if sun_zen_deg > 80:
            F_ms = F_ms * np.exp(-(sun_zen_deg - 80.0) / 4.0)
        I_ms = self._ms[sun_zen_deg] = F_ms/np.pi
        return I_ms

    def sky_color(self, view_zen, view_az, sun_zen, sun_az=0.0):
        return spec_to_XYZ(self.radiance(view_zen, view_az, sun_zen, sun_az))

# ---------------- Epoch definitions ----------------
def make_atm(gas, ozone_DU=0, trop_aer=(0.0, 1.3, 0.9, 0.7), strat_sulf=0.0, haze550=0.0,
             soot=0.0, dust=0.0, albedo=0.15, sun_T=5772, sun_L=1.0,
             ozone_lat=45.0, ozone_trop=0.0):
    comps = []
    comps.append(Comp('rayleigh', rayleigh_tau(gas), np.ones_like(LAM), 0.0, expo(8.0), rayleigh=True))
    if ozone_DU > 0:
        comps.append(Comp('ozone', ozone_tau(ozone_DU), np.zeros_like(LAM), 0.0,
                          ozone_layer(ozone_lat, ozone_trop)))
    b, a, w, g = trop_aer
    if b > 0:
        comps.append(Comp('trop_aer', aerosol_tau(b, a), np.full_like(LAM, w), g, expo(1.5)))
    if strat_sulf > 0:
        comps.append(Comp('sulfate', aerosol_tau(strat_sulf, 1.2), np.full_like(LAM, 0.999), 0.72, gauss_layer(21, 4)))
    if haze550 > 0:
        comps.append(Comp('haze', aerosol_tau(haze550, 1.9), tholin_ssa(), 0.6, gauss_layer(45, 18)))
    if soot > 0:
        comps.append(Comp('soot', aerosol_tau(soot, 1.0), np.full_like(LAM, 0.35), 0.5, gauss_layer(25, 8)))
    if dust > 0:
        ssa_d = 0.80 + 0.15*np.clip((LAM-400)/300, 0, 1)   # reddish dust
        comps.append(Comp('dust', aerosol_tau(dust, 0.3), ssa_d, 0.75, expo(3.0)))
    return Atmosphere(comps, albedo, sun_T, sun_L)

# ---------------- Limb / disk rendering support ----------------
def two_stream_up(tau, w, g, mu0, albedo):
    """Upward flux at TOA (planetary reflectance x mu0) via delta-Eddington."""
    k1, k2, Gam, _, _, Cup0, _, _, _ = _two_stream(tau, w, g, mu0, albedo)
    return np.clip(k1 + Gam*k2 + Cup0, 0, None)

def limb_radiance(atm, h_tan, sza_deg, hmax=110.0):
    """Single-scatter radiance along a tangent ray (tangent altitude h_tan) seen from space,
    Sun at zenith angle sza at the tangent point, scattering angle 90 deg."""
    Rt = R_E + h_tan
    smax = np.sqrt((R_E+hmax)**2 - Rt**2)
    s = np.linspace(-smax, smax, 361)
    r = np.sqrt(Rt**2 + s**2); h = r - R_E
    sza = np.radians(sza_deg)
    # The two halves of the path mirror each other, so most radii come twice.
    ru, inv = np.unique(r, return_inverse=True)
    cols = path_columns([c.profile for c in atm.comps], ru, Rt*np.cos(sza)/ru)[:, inv]
    # The observer is at +smax.
    return single_scatter(atm, s, h, cols, 0.0, to_end=True)

def disk_radiance(atm, sza_deg):
    mu0 = max(np.cos(np.radians(sza_deg)), 0.03)
    w, g = atm.eff_ssa_g()
    Fup = two_stream_up(atm.total_tau(), w, g, mu0, atm.albedo)
    return Fup*atm.S0
