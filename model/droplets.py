"""Cloud and fog droplets: the light they scatter each way, for the cloudbows, fogbows and glories.

Raindrops (rainbow.py) are big enough for geometric optics with Airy's correction at the bows. Cloud
and fog droplets, a few to twenty microns across, are not: their bows are broad and nearly white
(the fogbow), and straight back from the Sun they send a glory, rings of a few degrees about the
antisolar point that only wave optics gives. So this works their phase function out with
Lorenz-Mie theory, for each epoch's droplets.

Each epoch's droplets: a gamma distribution of radii (Hansen & Travis 1974) of effective radius re
and effective variance 0.1 for clouds (narrow, as glories show them to be; Mayer et al. 2004) and
0.15 for fog. The effective radius follows how many particles the water has to condense on (cloud
condensation nuclei): few, so few and big droplets, before life (sea salt and volcanic sulfate
only; Rosing et al. 2010, Wolf & Toon 2014 take Archean droplets of 17-20 microns against today's
12); some more once land plants give off organic vapors; many, so small droplets, in the sulfate
of a great eruption, the Chicxulub impact's sulfate and soot, and today's polluted air. Today's
anchors are some 10-14 microns over the oceans and 6-9 over land (Han et al. 1994). The deep past's
values are estimates. Fog droplets are smaller than a cloud's in the same air.

The light, per wavelength in 20 nm steps from 380 to 780 nm: the Mie phase function of each radius,
weighted by the distribution's cross-section, normalized so an isotropic scatterer is 1 (the
shaders' convention); the Sun's disk, 0.533 degrees across, blurs it; then, weighted by the sunlight
above the air and the CIE 1931 functions into linear sRGB, divided by the sunlight's own color. The
droplets' relative refractive index is water's (IAPWS, rainbow.py) at the epoch's temperature over
its air's: the Early Hadean's 30 bar bends less, so its bows widen (rainbow.py).

What the page reads (site/drops.bin, half floats, by gen_site.py): for each row (a distinct
droplet population), DROP_N angles from 0 to 180 degrees on the grid of drop_angles(), RGBA: the
phase function's linear sRGB, and in A its luminance smoothed over 12 degrees, which the cloud
shader divides by to take only the bows' and the glory's structure (shader_clouds.js).
droplets.json maps each epoch to its cloud and fog rows.

Run: python droplets.py   (about 5 minutes on 4 cores)
"""
import json
from multiprocessing import Pool
from pathlib import Path

import numpy as np

import epochs as E
import skymodel as sm
from rainbow import water_n, air_refractivity

HERE = Path(__file__).resolve().parent

# Effective radius (microns) of each epoch's cloud droplets and fog droplets.
DROPS = {
    'protoearth455': (16, 12), 'hadean45': (16, 12), 'hadean40': (16, 12),
    'archean38': (16, 12), 'archean27clear': (16, 12),
    # The haze's organic particles take up water (Hasenkopf et al. 2011) and seed more droplets.
    'archean27thin': (13, 9), 'archean27': (13, 9), 'archean27vthick': (13, 9),
    'proterozoic22': (13, 9), 'snowball07': (13, 9), 'cryogenian65': (13, 9),
    'ordovician466': (11, 9), 'carbon30': (11, 9), 'cretaceous66': (11, 9),
    'kpg66': (7, 5), 'zetaoph': (11, 9), 'geminga': (11, 9),
    'volcanic': (9, 7), 'modern': (11, 7), 'modernpoll': (7, 5), 'ozonehole': (11, 7), 'y2100': (11, 7),
}
V_CLOUD, V_FOG = 0.10, 0.15
LAM = np.arange(380.0, 781.0, 20.0)
SUN_R = 0.2665    # the Sun's angular radius, deg


def drop_angles():
    """The page's angle grid (deg): fine near the Sun's direction and from 120 degrees back, where
    the forward peak, the bows and the glory are; coarse in between."""
    return np.concatenate([np.linspace(0, 20, 201)[:-1], np.linspace(20, 120, 101)[:-1], np.linspace(120, 180, 601)])
DROP_N = len(drop_angles())


def mie(m, x, mu):
    """(|S1|^2+|S2|^2)/2 on the cosines mu, and the scattering efficiency."""
    nmax = int(x+4.05*x**(1/3)+2)
    mx = m*x
    nst = int(max(nmax, abs(mx))+16)
    Dn = np.zeros(nst+1, complex)
    for n in range(nst, 0, -1):
        Dn[n-1] = n/mx-1/(Dn[n]+n/mx)
    psi0, psi1 = np.cos(x), np.sin(x)
    chi0, chi1 = -np.sin(x), np.cos(x)
    pi0, pi1 = np.zeros_like(mu), np.ones_like(mu)
    S1 = np.zeros_like(mu, complex); S2 = np.zeros_like(mu, complex)
    q = 0.0
    for n in range(1, nmax+1):
        psi = (2*n-1)/x*psi1-psi0
        chi = (2*n-1)/x*chi1-chi0
        xi, xi1 = psi-1j*chi, psi1-1j*chi1
        an = ((Dn[n]/m+n/x)*psi-psi1)/((Dn[n]/m+n/x)*xi-xi1)
        bn = ((Dn[n]*m+n/x)*psi-psi1)/((Dn[n]*m+n/x)*xi-xi1)
        tau = n*mu*pi1-(n+1)*pi0
        f = (2*n+1)/(n*(n+1))
        S1 += f*(an*pi1+bn*tau); S2 += f*(an*tau+bn*pi1)
        q += (2*n+1)*(abs(an)**2+abs(bn)**2)
        pi0, pi1 = pi1, ((2*n+1)*mu*pi1-(n+1)*pi0)/n
        psi0, psi1, chi0, chi1 = psi1, psi, chi1, chi
    return (np.abs(S1)**2+np.abs(S2)**2)/2, 2*q/(x*x)


# Where Mie theory is evaluated (deg): fine where the light changes fast, then interpolated to an
# even 0.02 degree grid for the Sun's disk and the smoothing.
CALC = np.unique(np.concatenate([np.arange(0, 3, 0.005), np.arange(3, 20, 0.04), np.arange(20, 120, 0.5), np.arange(120, 180.0001, 0.02)]))
FINE = np.arange(0, 180.0001, 0.02)


def phase_lam(args):
    """The normalized phase function (isotropic 1) of a gamma distribution at one wavelength, on FINE."""
    re, v, m, lam = args
    mu = np.cos(np.radians(CALC))
    # Radii across the distribution, log-spaced, weighted by number times cross-section.
    r = re*np.exp(np.linspace(np.log(0.25), np.log(2.6), 56))
    # Gamma: n(r) proportional to r^((1-3v)/v) exp(-r/(re v)); dr = r d(ln r).
    w = r**((1-3*v)/v)*np.exp(-r/(re*v))*np.gradient(np.log(r))*r
    w /= w.max()
    acc = np.zeros_like(mu); qs = 0.0
    for ri, wi in zip(r, w):
        x = 2*np.pi*ri*1e3/lam
        s, q = mie(m, x, mu)
        # (|S1|^2+|S2|^2)/2 / k^2 is the light per steradian per unit irradiance; per the drop's
        # cross-section pi r^2 it is that over x^2 pi.
        acc += wi*s/(x*x*np.pi)*np.pi*ri*ri
        qs += wi*q*np.pi*ri*ri
    p = np.interp(FINE, CALC, acc*4*np.pi/qs)
    return p


def row(re, v, m):
    """Linear sRGB (relative to the sunlight) and the smoothed luminance on the page's grid."""
    with Pool(4) as pool:
        P = np.array(pool.map(phase_lam, [(re, v, m, l) for l in LAM]))
    # The Sun's disk: each angle the mean over the disk's chord (a 2D disk, near enough flat).
    d = FINE[1]-FINE[0]
    n = int(np.ceil(SUN_R/d))
    k = np.sqrt(np.clip(1-(np.arange(-n, n+1)*d/SUN_R)**2, 0, None)); k /= k.sum()
    P = np.array([np.convolve(np.pad(p, n, mode='reflect'), k, 'valid') for p in P])
    S = sm.solar_spectrum()
    sun = np.interp(LAM, sm.LAM, S)
    xyz = np.array([sm.cmf(l) for l in LAM])     # (nl, 3)
    M3 = np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]])
    rgbL = (xyz*sun[:, None])@M3.T              # each wavelength's linear sRGB
    rgb = P.T@rgbL/rgbL.sum(0)                  # (nfine, 3)
    # Colors outside sRGB, toward gray of the same luminance until they fit (as rainbow.js).
    Y = rgb@np.array([0.2126, 0.7152, 0.0722])
    lo = rgb.min(1)
    t = np.where((lo < 0) & (Y > 0), Y/np.maximum(Y-lo, 1e-12), 1.0)
    rgb = Y[:, None]+(rgb-Y[:, None])*t[:, None]
    # Luminance smoothed over 12 degrees (Gaussian sigma 5), reflected at 180 degrees.
    sg = 5.0/d
    nk = int(4*sg)
    g = np.exp(-0.5*(np.arange(-nk, nk+1)/sg)**2); g /= g.sum()
    Ys = np.convolve(np.pad(Y, nk, mode='reflect'), g, 'valid')
    grid = drop_angles()
    out = np.stack([np.interp(grid, FINE, rgb[:, 0]), np.interp(grid, FINE, rgb[:, 1]), np.interp(grid, FINE, rgb[:, 2]), np.interp(grid, FINE, Ys)], 1)
    return np.clip(out, 0, 6.0e4)


def epoch_m(key):
    """The droplets' relative refractive index at 550 nm, at the epoch's mid-latitude mean temperature."""
    import re as _re
    js = (HERE/'site_src/js/clouds.js').read_text(encoding='utf-8')
    mm = _re.search(key+r':\{eq:([-\d.]+),grad:([\d.]+)', js)
    T = float(mm.group(1))-float(mm.group(2))*0.5 if mm else 12.0
    gas = next((e['gas'] for e in E.EPOCHS if e['key'] == key), E.EPOCHS[-1]['gas'])
    # Liquid only: supercooled droplets to -10 C, the hot sea's air as it is.
    T = min(95.0, max(-10.0, T))
    return float(water_n(550, T)/(1+air_refractivity(gas, T)))


def main():
    rows, index, data = [], {}, []
    for key, (rc, rf) in DROPS.items():
        # Today's, for the epochs whose bows lie within half a degree of today's; the two hottest
        # and densest airs their own.
        m = epoch_m(key)
        m = 1.335 if abs(m-1.335) < 0.005 else round(m, 3)
        ids = []
        for re, v in ((rc, V_CLOUD), (rf, V_FOG)):
            k = (re, v, round(m, 4))
            if k not in rows:
                rows.append(k)
                print(f'row {len(rows)-1}: re {re} um, v {v}, m {m:.4f}', flush=True)
                data.append(row(re, v, m))
            ids.append(rows.index(k))
        index[key] = ids
    arr = np.array(data, np.float32)                 # (rows, DROP_N, 4)
    (HERE.parent/'site'/'drops.bin').write_bytes(arr.astype(np.float16).tobytes())
    meta = {'n': DROP_N, 'rows': len(rows), 'epochs': index,
            'rowInfo': [{'re': r, 'v': v, 'm': m} for r, v, m in rows]}
    (HERE/'droplets.json').write_text(json.dumps(meta, indent=1), encoding='utf-8')
    # A summary: where the cloudbow peaks and the glory's first bright ring, by row.
    g = drop_angles()
    for i, (r, v, m) in enumerate(rows):
        Y = arr[i, :, :3]@np.array([0.2126, 0.7152, 0.0722])
        bow = (g > 125) & (g < 150)
        back = (g > 170) & (g < 179.5)
        jb = np.argmax(np.where(bow, Y, 0))
        dY = np.diff(Y)
        rings = [180-g[j+1] for j in range(len(dY)-1) if back[j+1] and dY[j] > 0 and dY[j+1] <= 0]
        print(f'  re {r:4.1f} v {v:.2f} m {m:.4f}: bow {180-g[jb]:5.1f} deg from antisolar, {Y[jb]/arr[i, jb, 3]:4.2f}x smooth; '
              f'glory at 180: {Y[-1]:6.2f} ({Y[-1]/arr[i, -1, 3]:4.1f}x smooth); first ring {rings[-1] if rings else float("nan"):4.2f} deg')


if __name__ == '__main__':
    main()
