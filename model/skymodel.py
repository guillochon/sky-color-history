"""
Paleo-sky colour model.
- Spherical-shell atmosphere, numerical single scattering along the view ray
  (handles twilight geometry properly).
- Multiple scattering + surface reflection added via a delta-Eddington
  two-stream layer (isotropic remainder), following the usual sky-render trick.
- Components: Rayleigh gas (N2/O2/CO2/H2O mix), ozone Chappuis, tropospheric
  aerosol, stratospheric sulfate, Archean organic (tholin-like) haze, soot.
- Colours via CIE 1931 2deg CMF analytic fit (Wyman, Sloan & Shirley 2013),
  Bradford-free: we show raw sRGB (D65 white point) with per-scene exposure.
"""
import numpy as np

R_E = 6371.0  # km
LAM = np.arange(380, 781, 10.0)  # nm
L550 = LAM / 550.0

# ---------------- CIE colour matching (analytic fit) ----------------
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
    # relative spectral irradiance at top of atmosphere; L scales total luminosity
    S = planck(LAM, T)
    S = S / planck(LAM, 5772.0).max()
    # crude Fraunhofer-free; normalise so modern Sun peaks at 1
    return S * L * (5772.0/T)**4 * (planck(LAM,T).max()/planck(LAM,5772).max()) / (planck(LAM,T).max()/planck(LAM,5772).max())

# ---------------- Optical components ----------------
class Comp:
    """Optical component with column optical depth tau(lam), ssa(lam), HG g, and
    vertical density profile n(h) (normalised so integral dh = 1)."""
    def __init__(self, name, tau, ssa, g, profile, rayleigh=False):
        self.name, self.tau, self.ssa, self.g, self.profile, self.rayleigh = name, tau, ssa, g, profile, rayleigh

def expo(H):
    return lambda h: np.exp(-h/H)/H

def gauss_layer(hc, w):
    return lambda h: np.exp(-0.5*((h-hc)/w)**2)/(w*np.sqrt(2*np.pi))

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

def ozone_tau(DU):
    # Chappuis band approx: two gaussians; tau(600nm)=0.041 at 300 DU
    shape = np.exp(-0.5*((LAM-602)/48)**2) + 0.45*np.exp(-0.5*((LAM-575)/25)**2)
    shape = shape/shape.max()
    return 0.041*(DU/300.0)*shape

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
    return s, h, x, z

def path_column(profile, h_start_r, dir_cos_local, hmax=120.0, n=200):
    """Column (integral of profile along path) from a point at radius r
    with local zenith angle cosine mu toward space. Vectorised over arrays."""
    # step along ray until h > hmax
    out = np.zeros_like(h_start_r)
    r0 = h_start_r
    mu = dir_cos_local
    # parametric: r(s) = sqrt(r0^2 + s^2 + 2 r0 s mu)
    # find s where r = R_E+hmax
    rt = R_E + hmax
    disc = (r0*mu)**2 + rt**2 - r0**2
    smax = -r0*mu + np.sqrt(np.maximum(disc, 0))
    # if ray hits ground (mu<0 and perigee below R_E): mark inf
    perigee = r0*np.sqrt(np.maximum(1-mu**2, 0))
    hits_ground = (mu < 0) & (perigee < R_E) 
    t = np.linspace(0, 1, n)
    S = smax[:, None]*t[None, :]
    R = np.sqrt(r0[:, None]**2 + S**2 + 2*r0[:, None]*S*mu[:, None])
    H = R - R_E
    dens = profile(np.clip(H, 0, None))
    dens = np.where(H > hmax, 0, dens)
    col = np.trapezoid(dens, S, axis=1)
    col = np.where(hits_ground, np.inf, col)
    return col

# ---------------- Two-stream (delta-Eddington) for diffuse flux ----------------
def delta_eddington(tau, w, g, mu0, albedo):
    """Returns downward diffuse flux at surface (incl. surface reflection contribution
    handled via albedo) normalised to unit TOA irradiance on a horizontal surface? No:
    normalised to TOA direct beam flux F0 (perpendicular)."""
    tau = np.asarray(tau, float); w = np.asarray(w, float); g = np.asarray(g, float)
    f = g**2
    tau_p = (1-w*f)*tau; w_p = (1-f)*w/(1-w*f); g_p = (g-f)/(1-f)
    w_p = np.clip(w_p, 1e-6, 0.999999)
    g1 = (7-w_p*(4+3*g_p))/4; g2 = -(1-w_p*(4-3*g_p))/4
    g3 = (2-3*g_p*mu0)/4; g4 = 1-g3
    k = np.sqrt(np.maximum(g1**2-g2**2, 1e-12))
    # particular solution coefficients (Toon et al. 1989)
    denom = k**2 - 1/mu0**2
    denom = np.where(np.abs(denom) < 1e-9, 1e-9, denom)
    Cup0 = w_p*np.pi*1.0*((g1-1/mu0)*g3 + g4*g2)/denom   # F0 = pi? we use F0=1 => remove pi
    Cdn0 = w_p*1.0*((g1+1/mu0)*g4 + g2*g3)/denom
    Cup0 = Cup0/np.pi
    def Cup(t): return Cup0*np.exp(-t/mu0)
    def Cdn(t): return Cdn0*np.exp(-t/mu0)
    lam_ = k
    Gam = g2/(g1+k)
    e1 = 1+Gam*np.exp(-lam_*tau_p); e2 = 1-Gam*np.exp(-lam_*tau_p)
    e3 = Gam+np.exp(-lam_*tau_p);   e4 = Gam-np.exp(-lam_*tau_p)
    # Boundary: top: Fdn_dif(0)=0 ; bottom: Fup(tau)=A*(Fdn_dif(tau)+mu0*exp(-tau/mu0))
    # Fup(t) = Y1*(e^{k t}... use standard 2x2 solve with the Toon formulation:
    # Fup = k1*exp(k t) + Gam*k2*exp(-k t) + Cup ; Fdn = Gam*k1*exp(k t)+k2*exp(-k t)+Cdn
    A = albedo
    Sdir = mu0*np.exp(-tau_p/mu0)
    # equations:
    # top: Gam*k1 + k2 = -Cdn(0)
    # bottom: k1 e^{kτ} + Gam k2 e^{-kτ} + Cup(τ) = A*(Gam k1 e^{kτ} + k2 e^{-kτ} + Cdn(τ) + Sdir)
    ekt = np.exp(lam_*tau_p); emkt = np.exp(-lam_*tau_p)
    a11, a12, b1 = Gam, 1.0, -Cdn(0)
    a21 = ekt - A*Gam*ekt
    a22 = Gam*emkt - A*emkt
    b2 = A*(Cdn(tau_p)+Sdir) - Cup(tau_p)
    det = a11*a22 - a12*a21
    k1 = (b1*a22 - a12*b2)/det
    k2 = (a11*b2 - a21*b1)/det
    Fdn_dif = Gam*k1*ekt + k2*emkt + Cdn(tau_p)
    Fdir = Sdir
    return np.clip(Fdn_dif, 0, None), Fdir

# ---------------- Scene ----------------
class Atmosphere:
    def __init__(self, comps, albedo=0.15, sun_T=5772.0, sun_L=1.0):
        self.comps, self.albedo = comps, albedo
        self.S0 = solar_spectrum(sun_T, sun_L)

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
        T = np.ones_like(LAM)
        for c in self.comps:
            col = path_column(c.profile, r0, mu)[0]
            T = T*np.exp(-c.tau*col)
        return self.S0*T

    def radiance(self, view_zen_deg, view_az_deg, sun_zen_deg, sun_az_deg=0.0, h0=0.0, ms=True):
        """Spectral sky radiance (relative units) for observer at ground."""
        zv, av = np.radians(view_zen_deg), np.radians(view_az_deg)
        zs, as_ = np.radians(sun_zen_deg), np.radians(sun_az_deg)
        # scattering angle
        cosT = np.cos(zv)*np.cos(zs) + np.sin(zv)*np.sin(zs)*np.cos(av-as_)
        s, h, x, z = ray_points(h0, zv)
        r = np.sqrt(x**2+z**2)
        keep = h < 120
        s, h, x, z, r = s[keep], h[keep], x[keep], z[keep], r[keep]
        # local sun zenith cosine at each point (sun direction fixed in observer frame;
        # local vertical rotates): local vertical unit = (x,z)/r ; sun dir = (sin zs cos(as-av)... )
        # put ray in plane containing observer vertical and view direction; sun dir 3D:
        sun = np.array([np.sin(zs)*np.cos(as_-av), np.sin(zs)*np.sin(as_-av), np.cos(zs)])
        vert = np.stack([x/r, np.zeros_like(x), z/r], axis=1)
        mu_sun_local = vert @ sun
        # view direction local cosine for extinction back to observer handled by cumulative
        I = np.zeros_like(LAM)
        # optical depth from observer to each point along the view ray, per comp
        tau_view = np.zeros((len(s), len(LAM)))
        for c in self.comps:
            dens = c.profile(h)
            cum = np.concatenate([[0], np.cumsum(0.5*(dens[1:]+dens[:-1])*np.diff(s))])
            tau_view += cum[:, None]*c.tau[None, :]
        # sun path column per comp per point
        tau_sun = np.zeros((len(s), len(LAM)))
        for c in self.comps:
            col = path_column(c.profile, r, mu_sun_local)
            tau_sun += np.where(np.isinf(col)[:, None], 1e6, col[:, None]*c.tau[None, :])
        atten = np.exp(-tau_view - tau_sun)
        # local scattering coefficient x phase function
        beta = np.zeros((len(s), len(LAM)))
        for c in self.comps:
            P = rayleigh_phase(cosT) if c.rayleigh else hg(c.g, cosT)
            beta += c.profile(h)[:, None]*(c.tau*c.ssa*P)[None, :]
        integrand = beta*atten
        I_ss = np.trapezoid(integrand, s, axis=0)*self.S0
        if not ms:
            return I_ss
        # multiple scattering: two-stream diffuse flux minus the single-scatter hemispheric flux
        mu0 = max(np.cos(zs), 0.02)
        w, g = self.eff_ssa_g()
        Fdif, Fdir = delta_eddington(self.total_tau(), w, g, mu0, self.albedo)
        # hemispheric flux of single scattering (plane-parallel estimate)
        tt = self.total_tau(); ts = self.scat_tau()
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
        I_ms = F_ms/np.pi
        # horizon brightening for diffuse (mild)
        return I_ss + I_ms

    def sky_color(self, view_zen, view_az, sun_zen, sun_az=0.0, exposure=None):
        S = self.radiance(view_zen, view_az, sun_zen, sun_az)
        XYZ = spec_to_XYZ(S)
        return XYZ

# ---------------- Epoch definitions ----------------
def make_atm(gas, ozone_DU=0, trop_aer=(0.0, 1.3, 0.9, 0.7), strat_sulf=0.0, haze550=0.0,
             soot=0.0, dust=0.0, albedo=0.15, sun_T=5772, sun_L=1.0):
    comps = []
    comps.append(Comp('rayleigh', rayleigh_tau(gas), np.ones_like(LAM), 0.0, expo(8.0), rayleigh=True))
    if ozone_DU > 0:
        comps.append(Comp('ozone', ozone_tau(ozone_DU), np.zeros_like(LAM), 0.0, gauss_layer(25, 8)))
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
    """Upward flux at TOA (planetary reflectance x mu0) via delta-Eddington; mirrors delta_eddington."""
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
    Sdir = mu0*np.exp(-tau_p/mu0)
    ekt = np.exp(k*tau_p); emkt = np.exp(-k*tau_p)
    a11, a12, b1 = Gam, 1.0, -Cdn0
    a21 = ekt - A*Gam*ekt
    a22 = Gam*emkt - A*emkt
    b2 = A*(Cdn0*np.exp(-tau_p/mu0)+Sdir) - Cup0*np.exp(-tau_p/mu0)
    det = a11*a22 - a12*a21
    k1 = (b1*a22 - a12*b2)/det
    k2 = (a11*b2 - a21*b1)/det
    Fup0 = k1 + Gam*k2 + Cup0
    return np.clip(Fup0, 0, None)

def limb_radiance(atm, h_tan, sza_deg, hmax=110.0):
    """Single-scatter radiance along a tangent ray (tangent altitude h_tan) seen from space,
    Sun at zenith angle sza at the tangent point, scattering angle 90 deg."""
    Rt = R_E + h_tan
    smax = np.sqrt((R_E+hmax)**2 - Rt**2)
    s = np.linspace(-smax, smax, 361)
    r = np.sqrt(Rt**2 + s**2); h = r - R_E
    sza = np.radians(sza_deg)
    mu_sun = Rt*np.cos(sza)/r
    cosT = 0.0
    tau_obs = np.zeros((len(s), len(LAM))); tau_sun = np.zeros_like(tau_obs); beta = np.zeros_like(tau_obs)
    for c in atm.comps:
        dens = c.profile(h)
        seg = 0.5*(dens[1:]+dens[:-1])*np.diff(s)
        cum_to_end = np.concatenate([np.cumsum(seg[::-1])[::-1], [0]])  # from point to +smax (observer side)
        tau_obs += cum_to_end[:, None]*c.tau[None, :]
        col = path_column(c.profile, r, mu_sun)
        tau_sun += np.where(np.isinf(col)[:, None], 1e6, col[:, None]*c.tau[None, :])
        P = rayleigh_phase(cosT) if c.rayleigh else hg(c.g, cosT)
        beta += dens[:, None]*(c.tau*c.ssa*P)[None, :]
    I = np.trapezoid(beta*np.exp(-tau_obs-tau_sun), s, axis=0)*atm.S0
    return I

def disk_radiance(atm, sza_deg):
    mu0 = max(np.cos(np.radians(sza_deg)), 0.03)
    w, g = atm.eff_ssa_g()
    Fup = two_stream_up(atm.total_tau(), w, g, mu0, atm.albedo)
    return Fup*atm.S0
