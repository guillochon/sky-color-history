"""
Paleo-sky color model.
- Spherical-shell atmosphere, numerical single scattering along the view ray
  (handles twilight geometry properly).
- Multiple scattering + surface reflection added via a delta-Eddington
  two-stream layer (isotropic remainder), following the usual sky-render trick.
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
def expo(H):
    def n(h):
        e = h/-H
        np.exp(e, out=e)
        e /= H
        return e
    return n

def _gauss(h, hc, w):
    e = h - hc
    e /= w
    np.square(e, out=e)
    e *= -0.5
    return np.exp(e, out=e)

def gauss_layer(hc, w):
    norm = w*np.sqrt(2*np.pi)
    def n(h):
        e = _gauss(h, hc, w)
        e /= norm
        return e
    return n

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

def ozone_layer(lat_deg, trop_frac=0.0):
    """Normalized ozone density. Stratospheric peak falls from 26 km at the
    equator to 18 km at the pole and thickens toward the pole. trop_frac is
    the share of the column in a 6 km tropospheric exponential."""
    x = min(abs(float(lat_deg)), 90.0) / 90.0
    hc = 26.0 - 8.0 * x
    w = 5.0 + 4.0 * x
    # Renormalize the Gaussian onto h >= 0 so the column is the stated DU.
    mass = 0.5 * (1.0 + math.erf(hc / (w * math.sqrt(2.0))))
    strat_norm = 1.0 / (w * math.sqrt(2.0 * math.pi) * mass)
    trop = expo(6.0)
    f = min(max(float(trop_frac), 0.0), 1.0)

    def n(h):
        strat = _gauss(h, hc, w)
        strat *= strat_norm
        if f == 0.0:
            return strat
        strat *= 1.0 - f
        t = trop(h)
        t *= f
        strat += t
        return strat
    return n

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
        return I_ss + self.multiple_scatter(sun_zen_deg)

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
