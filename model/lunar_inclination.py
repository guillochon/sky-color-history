"""The Moon's orbital inclination to the ecliptic in each epoch, for moon.js MOON_INC.

Integrated backward from today's 5.145° with the semi-analytic tidal model of Ćuk, Hamilton,
Lock & Stewart 2016 (Nature 539, 402; Methods eqs. M3, M5, M7, M8):
  Earth's tides  di/dt = -(1/4) sin i / a · da/dt          (the Moon receding lowers i)
  lunar tides    di/dt = -sin²θ tan i · (3 k2 / 2Q) (M_E/M_M) (R_M/a)^5 n
where θ is the Moon's obliquity to its orbit in Cassini state 2, from
  (3/2) n (C-A)/C sinθ cosθ + (3/8) n (B-A)/C sinθ (1-cosθ) - Ω̇ sin(θ - i) = 0,
  Ω̇ = (3/4) n_E² / n cos i (the node's regression, driven by the Sun).
The Moon's distance follows the page's history (moon.js MOON_RE: Farhat et al. 2022, Eulenfeld &
Heubeck 2023), and it keeps today's figure (frozen in at about 15 Earth radii, Downey, Nimmo &
Matsuyama 2022) and today's tidal response, k2/Q = 0.024/38 (lunar laser ranging).
The lunar tides grow fast as the Moon nears the Cassini-state transition at about 33 Earth radii,
where θ swings large, so the inclination climbs steeply toward the oldest epochs. Ćuk et al.
argue these values are lower bounds (a warmer young Moon damps more).
"""
import numpy as np

# Age (Ma) and mean distance (Earth radii), as moon.js MOON_RE.
HIST = [(0, 60.14), (66, 59.93), (300, 58.56), (466, 58.21), (700, 57.71), (2200, 50.98),
        (2700, 47.60), (3200, 42.10), (3800, 40.4), (4000, 39.8), (4400, 38.7)]
EPOCH_MA = dict(kpg66=66, carbon30=300, ordovician466=466, snowball07=700, proterozoic22=2200,
                archean27=2700, archean38=3800, hadean40=4000)
I_NOW = 5.145
K2, Q = 0.024, 38.0
ME_MM = 81.30
RM_RE = 1737.4/6371.0
# (C-A)/C and (B-A)/C of today's Moon.
CA, BA = 6.27e-4, 2.28e-4
# The Sun-driven node rate (3/4) n_E²/n runs 4% fast against the observed 18.61-year regression
# (the leading term leaves out the higher-order solar terms), so it is scaled to match today.
NODE_YR = 18.61
N_NOW = 2*np.pi/27.321661          # rad/day at 60.27 Earth radii
N_E = 2*np.pi/365.25636


def n_at(a):
    return N_NOW*(60.27/a)**1.5


def theta(a, i):
    """Cassini state 2 obliquity (radians) for orbit radius a (Earth radii), inclination i."""
    n = n_at(a); W = W_K*0.75*N_E**2/n*np.cos(i)
    f = lambda t: 1.5*n*CA*np.sin(t)*np.cos(t)+0.375*n*BA*np.sin(t)*(1-np.cos(t))-W*np.sin(t-i)
    lo, hi = i, np.radians(89.0)        # state 2: the spin axis beyond the orbit normal
    if f(lo)*f(hi) > 0:
        return hi
    for _ in range(80):
        m = (lo+hi)/2
        if f(lo)*f(m) <= 0: hi = m
        else: lo = m
    return (lo+hi)/2


W_K = 2*np.pi/(NODE_YR*365.25)/(0.75*N_E**2/n_at(60.27)*np.cos(np.radians(I_NOW)))


def main():
    print('node rate scaled by %.4f' % W_K)
    ages = np.array([h[0] for h in HIST], float); dist = np.array([h[1] for h in HIST])
    th0 = np.degrees(theta(60.14, np.radians(I_NOW)))
    print('check: today θ = %.2f° (observed 6.68°)' % th0)
    dt = 0.5                             # Myr
    i = np.radians(I_NOW); out = {0: I_NOW}
    for age in np.arange(0, 4400, dt):
        a0, a1 = np.interp(age, ages, dist), np.interp(age+dt, ages, dist)
        # Back in time: undo the Earth tides' share as the Moon comes in, and the lunar tides' damping.
        i += 0.25*np.sin(i)*(a0-a1)/a0
        am = 0.5*(a0+a1); th = theta(am, i)
        rate = np.sin(th)**2*np.tan(i)*1.5*K2/Q*ME_MM*RM_RE**5/am**5*n_at(am)    # rad/day
        i += rate*dt*1e6*365.25
        out[round(age+dt, 1)] = np.degrees(i)
    for k, ma in EPOCH_MA.items():
        a = np.interp(ma, ages, dist)
        print('%-14s %5d Ma  %5.2f R_E  i = %5.2f°  θ = %5.2f°' % (k, ma, a, out[float(ma)], np.degrees(theta(a, np.radians(out[float(ma)])))))


if __name__ == '__main__':
    main()
