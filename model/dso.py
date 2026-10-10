"""The nebulae and galaxies that binoculars show under a dark sky, as images for the page.

Each object is cut from two all-sky surveys by the CDS hips2fits service, on the same gnomonic
(TAN) grid, north up and east to the left: the Digitized Sky Survey's colour plates (DSS2, STScI
and CDS), whose detail gives the brightness, and Axel Mellinger's all-sky photograph. A galaxy
keeps the plates' colour; a nebula takes Mellinger's, which is the eye's (the plates' red makes
an emission nebula look peach rather than pink). The Clouds of Magellan take both from
Mellinger, where the plates are crowded and seamed. Downloads are kept in model/data/dso.

Each image is made to stand for light on the sky:
  - The sky round it is taken off (the median of its border), and the foreground stars, which
    the page draws itself, are cut out (what a grey opening the size of a star's image removes)
    and filled in from round about, as are two globular clusters in front of the Small Cloud.
  - The surveys' display stretch is undone with L = (e^(kv) − 1)/(e^k − 1), v the stretched value
    from 0 to 1, and what sky is left (the median outside the object) is taken off; faint light is
    smoothed, as the plates' grain would show.
  - Where the plates are saturated the light is rebuilt, rising inward from the edge of the flat
    top: as a cusp in a galaxy (by up to 12 magnitudes, as a bulge's r^¼ profile steepens), as a
    broad rise in a nebula (by up to 3).
  - The light is scaled so nine tenths of the object's catalogue V magnitude falls within its
    catalogue ellipse (the rest is the outskirts), and its brightest, smoothed over about half an
    arcminute, comes to the object's central surface brightness (MU), by k where the plates hold
    it and by the rebuilt top where they don't. It is kept in cd/m² (V mag/arcsec² m is
    10.8e4·10^(−0.4m) cd/m²).
  - The colour, the light's share in each channel, is blurred (Mellinger's resolution is about an
    arcminute) and its saturation raised by a third, for slightly richer than true colour.
  - Outside an ellipse round the object the image fades to nothing, so neighbours don't add up.
The tiles go into site/dso.webp, 512 pixels each in rows of eight, each channel coded as the cube
root of its share of the tile's brightest value, so 8 bits hold six decades.

The objects move with the epoch (dso.json, per epoch: right ascension and declination, the size
as a share of today's, and how much of the object there is):
  - M31 and the Milky Way fall toward each other: their separation follows a radial Kepler orbit
    (770 kpc, closing at 109 km/s; van der Marel et al. 2012) with the mass that brings them
    together at the Big Bang 13.8 Gyr ago (the timing argument, Kahn & Woltjer 1959). M33 keeps
    its place relative to M31.
  - The Large Cloud is traced back through the Milky Way's dark halo (NFW, 1.2e12 solar masses,
    concentration 10) with dynamical friction (Chandrasekhar, ln Λ = 3, an LMC of 1.5e11 solar
    masses), from its present position and velocity (Kallivayalil et al. 2013). It comes in for
    the first time: a few Gyr ago it was hundreds of kiloparsecs out. The Small Cloud keeps its
    place relative to the Large.
  - Galaxies beyond the Local Group were nearer by the cosmic scale factor (flat ΛCDM, H0 = 67.7,
    Ωm = 0.31): 4.4 Gyr ago space was about 0.7 of its size today.
  - Seen from further off a galaxy is smaller but no dimmer per square arcsecond (light travel is
    a few Myr at most, so there is no cosmological dimming to speak of).
  - The direction is taken from where the Sun was on its orbit (galaxy.py, as build_star_epochs.py
    traces it), which shifts M31 by up to a degree.
  - A nebula exists only as long as its stars have lit it: the H II regions a few Myr (the ages of
    their clusters), the planetary nebulae ten thousand years or so, the Crab since 1054. None of
    them shine in the deep past, when others, unknowable, did. In the supernova epochs those
    already lit are moved back along their clusters' motion relative to the Sun (straight lines,
    as build_star_epochs.py moves the stars). A planetary nebula or the Crab is smaller the
    younger it is, as it expands at a steady rate.
"""
import io
import json
import math
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from galaxy import GAL, PC_MYR, R0, SUN_UVW, Z0, accel

HERE = Path(__file__).resolve().parent
CACHE = HERE / 'data' / 'dso'
SITE = HERE.parent / 'site'
N = 512                # tile size, pixels
COLS = 8               # tiles per atlas row
HIPS = 'https://alasky.cds.unistra.fr/hips-image-services/hips2fits'
SURVEY = {'dss': 'CDS/P/DSS2/color', 'mel': 'CDS/P/Mellinger/color'}

# id, name, kind (g galaxy, n H II region, r reflection nebula, p planetary nebula, s supernova
# remnant), J2000 RA and Dec (degrees), major and minor axis (arcmin; for galaxies the D25
# isophote), position angle (degrees east of north), V, B−V (galaxies), distance (kpc), the tile's
# width (degrees), the brightness and colour sources, and for nebulae the age (Myr) and the
# motion of the cluster that lights it (proper motion in RA·cos Dec and Dec, mas/yr, and radial
# velocity, km/s; approximate, from Gaia cluster studies).
O = [
    # Galaxies (de Vaucouleurs et al. 1991, RC3; NED distances).
    dict(id='LMC', name='Large Magellanic Cloud', k='g', ra=80.894, dec=-69.756, a=645, b=550, pa=170, V=0.9, bv=0.5, d=49.6, fov=13.0, lum='mel', col='mel'),
    dict(id='SMC', name='Small Magellanic Cloud', k='g', ra=13.187, dec=-72.829, a=320, b=205, pa=45, V=2.7, bv=0.45, d=62.0, fov=7.0, lum='mel', col='mel',
         cut=[(6.024, -72.081, 25), (15.809, -70.849, 8)]),     # 47 Tuc and NGC 362, globular clusters in front
    dict(id='M31', name='Andromeda Galaxy', k='g', ra=10.6847, dec=41.2690, a=190, b=60, pa=35, V=3.44, bv=0.92, d=765, fov=4.2, lum='dss', col='dss', win=(215, 120)),
    dict(id='M33', name='Triangulum Galaxy', k='g', ra=23.4621, dec=30.6599, a=70.8, b=41.7, pa=23, V=5.72, bv=0.55, d=840, fov=1.6, lum='dss', col='dss'),
    dict(id='M81', name="Bode's Galaxy", k='g', ra=148.8882, dec=69.0653, a=26.9, b=14.1, pa=157, V=6.94, bv=0.95, d=3630, fov=0.75, lum='dss', col='dss'),
    dict(id='M82', name='Cigar Galaxy', k='g', ra=148.9685, dec=69.6797, a=11.2, b=4.3, pa=65, V=8.41, bv=0.89, d=3530, fov=0.3, lum='dss', col='dss'),
    dict(id='M51', name='Whirlpool Galaxy', k='g', ra=202.4696, dec=47.1952, a=11.2, b=6.9, pa=163, V=8.4, bv=0.6, d=8580, fov=0.32, lum='dss', col='dss', win=(17, 13)),
    dict(id='M101', name='Pinwheel Galaxy', k='g', ra=210.8023, dec=54.3489, a=28.8, b=26.9, pa=0, V=7.86, bv=0.45, d=6900, fov=0.75, lum='dss', col='dss'),
    dict(id='M104', name='Sombrero Galaxy', k='g', ra=189.9976, dec=-11.6231, a=8.7, b=3.5, pa=89, V=8.0, bv=0.98, d=9550, fov=0.25, lum='dss', col='dss'),
    dict(id='M83', name='Southern Pinwheel', k='g', ra=204.2538, dec=-29.8658, a=12.9, b=11.5, pa=45, V=7.54, bv=0.66, d=4900, fov=0.36, lum='dss', col='dss'),
    dict(id='NGC 253', name='Sculptor Galaxy', k='g', ra=11.8880, dec=-25.2882, a=27.5, b=6.8, pa=52, V=7.1, bv=0.85, d=3500, fov=0.7, lum='dss', col='dss'),
    dict(id='NGC 5128', name='Centaurus A', k='g', ra=201.3651, dec=-43.0191, a=25.7, b=20.0, pa=35, V=6.84, bv=0.98, d=3800, fov=0.7, lum='dss', col='dss'),
    dict(id='M64', name='Black Eye Galaxy', k='g', ra=194.1821, dec=21.6827, a=10.7, b=5.1, pa=115, V=8.52, bv=0.84, d=5300, fov=0.3, lum='dss', col='dss'),
    dict(id='M94', name='Croc\'s Eye Galaxy', k='g', ra=192.7211, dec=41.1203, a=11.2, b=9.1, pa=105, V=8.24, bv=0.75, d=4700, fov=0.3, lum='dss', col='dss'),
    dict(id='M63', name='Sunflower Galaxy', k='g', ra=198.9555, dec=42.0293, a=12.6, b=7.2, pa=105, V=8.59, bv=0.72, d=9000, fov=0.32, lum='dss', col='dss'),
    dict(id='M106', name='M106', k='g', ra=184.7396, dec=47.3040, a=18.6, b=7.2, pa=150, V=8.41, bv=0.69, d=7600, fov=0.45, lum='dss', col='dss'),
    dict(id='NGC 55', name='NGC 55', k='g', ra=3.7233, dec=-39.1966, a=32.4, b=5.6, pa=108, V=7.87, bv=0.55, d=2100, fov=0.8, lum='dss', col='dss'),
    dict(id='NGC 300', name='NGC 300', k='g', ra=13.7229, dec=-37.6844, a=21.9, b=15.5, pa=111, V=8.13, bv=0.59, d=2000, fov=0.55, lum='dss', col='dss'),
    dict(id='M87', name='Virgo A', k='g', ra=187.7059, dec=12.3911, a=8.3, b=6.6, pa=0, V=8.63, bv=0.96, d=16500, fov=0.25, lum='dss', col='dss'),
    dict(id='M49', name='M49', k='g', ra=187.4450, dec=8.0004, a=10.2, b=8.3, pa=155, V=8.37, bv=0.96, d=16700, fov=0.28, lum='dss', col='dss'),
    dict(id='NGC 2403', name='NGC 2403', k='g', ra=114.2142, dec=65.6026, a=21.9, b=12.3, pa=127, V=8.38, bv=0.47, d=3200, fov=0.55, lum='dss', col='dss'),
    # Nebulae.
    dict(id='M42', name='Orion Nebula', k='n', ra=83.83, dec=-5.33, a=85, b=60, pa=0, V=4.0, d=0.412, fov=1.6, lum='dss', col='mel', age=1.5, pm=(1.2, 0.3, 28.0)),
    dict(id='M78', name='M78', k='r', ra=86.6908, dec=0.0789, a=8, b=6, pa=0, V=8.3, d=0.40, fov=0.3, lum='dss', col='mel', age=1.5, pm=(0.0, -0.6, 10.0)),
    dict(id='NGC 3372', name='Carina Nebula', k='n', ra=161.265, dec=-59.867, a=120, b=120, pa=0, V=1.0, d=2.3, fov=3.0, lum='dss', col='mel', age=3.0, pm=(-6.9, 2.6, -5.0)),
    dict(id='M8', name='Lagoon Nebula', k='n', ra=270.925, dec=-24.38, a=90, b=40, pa=90, V=6.0, d=1.25, fov=1.8, lum='dss', col='mel', age=2.0, pm=(1.3, -2.0, -4.0)),
    dict(id='M20', name='Trifid Nebula', k='n', ra=270.60, dec=-23.03, a=28, b=28, pa=0, V=6.3, d=1.25, fov=0.6, lum='dss', col='mel', age=0.3, pm=(0.25, -1.8, -8.0)),
    dict(id='M17', name='Omega Nebula', k='n', ra=275.196, dec=-16.171, a=46, b=37, pa=0, V=6.0, d=1.7, fov=0.9, lum='dss', col='mel', age=1.0, pm=(0.0, -1.5, 10.0)),
    dict(id='M16', name='Eagle Nebula', k='n', ra=274.70, dec=-13.80, a=35, b=28, pa=0, V=6.0, d=1.74, fov=0.85, lum='dss', col='mel', age=2.0, pm=(0.24, -1.6, 15.0)),
    dict(id='NGC 2237', name='Rosette Nebula', k='n', ra=97.98, dec=4.95, a=80, b=70, pa=0, V=6.0, d=1.55, fov=1.8, lum='dss', col='mel', age=2.0, pm=(-1.73, 0.2, 26.0)),
    dict(id='NGC 7000', name='North America Nebula', k='n', ra=313.9, dec=44.3, a=180, b=110, pa=90, V=4.0, d=0.80, fov=3.4, lum='dss', col='mel', age=2.0, pm=(-1.2, -3.1, -4.0)),
    dict(id='M27', name='Dumbbell Nebula', k='p', ra=299.9016, dec=22.7212, a=8, b=5.6, pa=30, V=7.4, d=0.385, fov=0.25, lum='dss', col='mel', age=0.010),
    dict(id='M57', name='Ring Nebula', k='p', ra=283.3962, dec=33.0292, a=1.4, b=1.0, pa=60, V=8.8, d=0.79, fov=0.06, lum='dss', col='dss', age=0.004),
    dict(id='NGC 7293', name='Helix Nebula', k='p', ra=337.4110, dec=-20.8371, a=25, b=20, pa=120, V=7.6, d=0.20, fov=0.5, lum='dss', col='mel', age=0.0106),
    dict(id='M1', name='Crab Nebula', k='s', ra=83.6331, dec=22.0145, a=7, b=5, pa=130, V=8.4, d=2.0, fov=0.2, lum='dss', col='dss', age=0.000946),
]

# Central surface brightness, V mag/arcsec² over about half an arcminute (approximate, from
# published profiles: the bulges and nuclei of the galaxies, the brightest part of each nebula).
MU = {'LMC': 20.5, 'SMC': 21.2, 'M31': 15.5, 'M33': 18.0, 'M81': 16.0, 'M82': 16.5, 'M51': 17.0, 'M101': 18.5,
      'M104': 16.0, 'M83': 17.0, 'NGC 253': 17.0, 'NGC 5128': 17.0, 'M64': 16.5, 'M94': 16.0, 'M63': 17.0,
      'M106': 17.0, 'NGC 55': 19.0, 'NGC 300': 20.0, 'M87': 16.0, 'M49': 16.0, 'NGC 2403': 19.5,
      'M42': 16.0, 'M78': 19.5, 'NGC 3372': 18.5, 'M8': 17.5, 'M20': 19.5, 'M17': 17.5, 'M16': 19.0,
      'NGC 2237': 21.5, 'NGC 7000': 21.0, 'M27': 19.0, 'M57': 17.3, 'NGC 7293': 21.5, 'M1': 19.5}
for o in O:
    o['mu'] = MU[o['id']]

# Years before J2000 of each epoch (build_star_epochs.py, gen_report.py).
EPOCH_YEARS = {'hadean44': 4.4e9, 'hadean40': 4.0e9, 'archean38': 3.8e9, 'archean27thin': 2.7e9, 'archean27': 2.7e9,
               'archean27vthick': 2.7e9, 'proterozoic22': 2.2e9, 'snowball07': 7e8, 'ordovician466': 4.66e8,
               'carbon30': 3e8, 'kpg66': 6.6e7, 'zetaoph': 1.78e6, 'geminga': 3.42e5, 'volcanic': 185.0,
               'ozonehole': 10.0, 'modern': 0.0, 'modernpoll': 0.0, 'y2100': -100.0}
GYR = 0.9778           # Gyr per kpc/(km/s)
G = 4.3009e-6          # kpc (km/s)² per solar mass


def fetch(o, survey):
    """The object's cutout from one survey (8-bit RGB), downloaded once."""
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{o['id'].replace(' ', '')}_{survey}.png"
    if not path.exists():
        q = urllib.parse.urlencode(dict(hips=SURVEY[survey], width=N, height=N, fov=o['fov'], projection='TAN',
                                        ra=o['ra'], dec=o['dec'], format='png'))
        try:
            with urllib.request.urlopen(f'{HIPS}?{q}', timeout=120) as r:
                body = r.read()
        except urllib.error.URLError:        # Python without the system's certificates: curl has them
            body = subprocess.run(['curl', '-sf', f'{HIPS}?{q}'], capture_output=True, check=True).stdout
        path.write_bytes(body)
    return np.asarray(Image.open(path).convert('RGB'), float) / 255


def disk(r):
    y, x = np.mgrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r + 0.5


def destar(img, px_arcsec):
    """The image less its sky and its stars: a grey opening wider than a star's image keeps what
    is larger, the residue above the noise is masked (with a margin that grows with the star's
    brightness) and filled from round about."""
    border = np.concatenate([img[:12].reshape(-1, 3), img[-12:].reshape(-1, 3), img[:, :12].reshape(-1, 3), img[:, -12:].reshape(-1, 3)])
    sky = np.percentile(border, 30, axis=0)
    img = np.clip((img - sky) / (1 - sky), 0, 1)
    lum = img.mean(2)
    r = int(np.clip(round(45 / px_arcsec), 2, 7))
    resid = lum - ndimage.grey_opening(lum, footprint=disk(r))
    noise = 1.4826 * np.median(np.abs(resid - np.median(resid))) + 1e-4
    mask = resid > max(5 * noise, 0.02)
    lab, n = ndimage.label(mask)
    if n:
        peak = ndimage.maximum(resid, lab, np.arange(1, n + 1))
        grow = np.zeros(n + 1, int)
        grow[1:] = 1 + np.clip(np.round(peak * 6), 0, 5).astype(int)
        g = grow[lab]
        out = mask.copy()
        for k in range(1, 7):
            out |= ndimage.binary_dilation(mask & (g >= k), disk(k))
        mask = out
    keep = ~mask
    fill = img.copy()
    w = keep.astype(float)
    for s in (2, 4, 8, 16, 32):
        num = np.stack([ndimage.gaussian_filter(img[..., q] * w, s) for q in range(3)], 2)
        den = ndimage.gaussian_filter(w, s)[..., None]
        todo = (~keep) & (den[..., 0] > 0.02)
        fill[todo] = (num / np.maximum(den, 1e-9))[todo]
        keep = keep | todo
        w = keep.astype(float)
        if keep.all():
            break
    return fill


def unstretch(v, k):
    return np.expm1(k * v) / np.expm1(k) if k > 1e-6 else v


def ellipse(o, scale, wh=None):
    """Elliptical radius (1 on the ellipse) of each pixel, for axes a×b arcmin × scale."""
    a, b = wh if wh else (o['a'] * scale, o['b'] * scale)
    px = o['fov'] * 60 / N
    y, x = np.mgrid[0:N, 0:N] - (N - 1) / 2
    x, y = -x * px, -y * px          # arcmin east and north
    t = math.radians(o['pa'])
    u = x * math.sin(t) + y * math.cos(t)          # along the major axis
    w = x * math.cos(t) - y * math.sin(t)
    return np.hypot(u / (a / 2), w / (b / 2))


def gnomonic(o, ra, dec):
    """(ra, dec) on the object's tile: arcmin east and north of its centre, on the tangent plane
    (scaled as the tile's pixels are, by its width at the centre)."""
    a0, d0, a, d = map(math.radians, (o['ra'], o['dec'], ra, dec))
    c = math.sin(d0) * math.sin(d) + math.cos(d0) * math.cos(d) * math.cos(a - a0)
    x = math.cos(d) * math.sin(a - a0) / c
    y = (math.cos(d0) * math.sin(d) - math.sin(d0) * math.cos(d) * math.cos(a - a0)) / c
    k = o['fov'] * 60 / (2 * math.tan(math.radians(o['fov'] / 2)))
    return x * k, y * k


SAT = 1.33             # colour saturation, over the image's
LUM = np.array([0.2126, 0.7152, 0.0722])


def tile(o):
    """The object's light in linear sRGB, cd/m², on its tile, and the fitted k."""
    px_as = o['fov'] * 3600 / N
    imgs = {s: destar(fetch(o, s), px_as) for s in {o['lum'], o['col']}}
    v = imgs[o['lum']]
    win_r = ellipse(o, 1.3, o.get('win'))
    window = np.clip((1.35 - win_r) / 0.35, 0, 1) ** 2
    for ra, dec, r in o.get('cut', []):         # what lies in front and isn't the object
        x, y = gnomonic(o, ra, dec)
        yy, xx = np.mgrid[0:N, 0:N] - (N - 1) / 2
        dist = np.hypot(-xx * o['fov'] * 60 / N - x, -yy * o['fov'] * 60 / N - y)
        window *= np.clip((dist - r) / (0.3 * r), 0, 1)
    pix_as2 = px_as ** 2
    flux = 10.8e4 * 10 ** (-0.4 * o['V'])           # cd/m² × arcsec²
    # The sky left after unstretching is the median outside the window (or of the border, where
    # the object fills the tile); faint light is smoothed, as the grain of the plates and the
    # filled-in stars would otherwise show.
    out = win_r > 1.25
    if out.sum() < 4000:
        out = np.zeros((N, N), bool)
        out[:16], out[-16:], out[:, :16], out[:, -16:] = True, True, True, True
    inside = ellipse(o, 1.0) < 1
    # Where the plates are saturated the light is rebuilt: it rises inward from the edge of the
    # flat top, by up to dm magnitudes at the point furthest in.
    lv = v @ LUM
    sat = ndimage.binary_opening((v.max(2) > 0.95) & (win_r < 1), disk(1))
    lab, ns = ndimage.label(sat)
    depth = ndimage.distance_transform_edt(sat)
    if ns:
        dmax = np.asarray(ndimage.maximum(depth, lab, np.arange(1, ns + 1)))
        depth = np.where(sat, depth / np.maximum(dmax[np.maximum(lab, 1) - 1], 1), 0)
        # Smoothed, so the ridges of the distance map don't show; a galaxy's core is a cusp, a
        # nebula's a broad rise.
        depth = ndimage.gaussian_filter(depth, 2.0 if o['k'] == 'g' else 4.0)
    cusp = 0.25 if o['k'] == 'g' else 0.6
    big = sat.sum() > 40

    def calibrated(k, dm):
        L = unstretch(lv, k)
        L = L - np.median(L[out])
        sd = 1.4826 * np.median(np.abs(L[out])) + 1e-9
        L = np.maximum(L, 0)
        w = np.clip(L / (12 * sd), 0, 1)
        L = w * L + (1 - w) * ndimage.gaussian_filter(L, 2.5)
        if big:
            L = L * 10 ** (0.4 * dm * (1 - (1 - np.clip(depth, 0, 1)) ** cusp))
        L *= window
        # The catalogue's total is asymptotic; about nine tenths of it falls within the ellipse.
        return L * 0.9 * flux / max(L[inside].sum() * pix_as2, 1e-30)
    # The brightest light (smoothed over about half an arcminute) is set to the object's central
    # surface brightness: by k where the plates hold it, else by the rebuilt top.
    peak_of = lambda L: ndimage.gaussian_filter(L, max(1.0, 15 / px_as))[inside].max()
    target = 10.8e4 * 10 ** (-0.4 * o['mu'])
    k, dm = 3.0, 0.0
    lo, hi = (0.0, 12.0 if o['k'] == 'g' else 3.0) if big else (0.0, 14.0)
    for _ in range(40):
        x = (lo + hi) / 2
        L = calibrated(3.0, x) if big else calibrated(x, 0)
        lo, hi = (x, hi) if peak_of(L) < target else (lo, x)
    if big:
        dm = (lo + hi) / 2
    else:
        k = (lo + hi) / 2
    L = calibrated(k, dm)
    print(f"{o['id']:9s} k={k:5.2f} rebuilt {dm:4.2f} mag over {sat.sum():5d} px; mean in ellipse "
          f"{-2.5 * math.log10(L[inside].mean() / 10.8e4):5.2f}, peak {-2.5 * math.log10(peak_of(L) / 10.8e4):5.2f} (aim {o['mu']})")
    # The colour: each channel's share of the luminance, blurred, saturation raised.
    c = unstretch(imgs[o['col']], 3.0)
    blur = 1.5 if o['col'] == 'dss' else max(1.5, 60 / px_as)
    cs = np.stack([ndimage.gaussian_filter(c[..., q], blur) for q in range(3)], 2)
    cl = cs @ LUM
    eps = 0.02 * np.percentile(cl, 99.5) + 1e-9
    chroma = (cs + eps) / (cl + eps)[..., None]
    chroma = np.maximum(1 + SAT * (chroma - 1), 0)
    chroma /= (chroma @ LUM)[..., None]
    return L[..., None] * chroma, k


def encode(rgb):
    """8-bit cube-root code of the tile's light, and the light that 255 stands for."""
    top = float(np.percentile(rgb.max(2), 99.98))
    code = np.clip(np.cbrt(np.clip(rgb / top, 0, None)) * 255 + 0.5, 0, 255).astype(np.uint8)
    return code, top


# --- Where each object was. -------------------------------------------------------------------

def unit(ra, dec):
    a, d = math.radians(ra), math.radians(dec)
    return np.array([math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d)])


def radec(v):
    v = v / np.linalg.norm(v)
    return math.degrees(math.atan2(v[1], v[0])) % 360, math.degrees(math.asin(max(-1, min(1, v[2]))))


SUN_NOW = np.array([-R0, 0.0, Z0]) / 1000          # kpc, galactocentric (galactic axes)


def sun_then(years):
    """The Sun's galactocentric position (kpc) `years` ago, traced as build_star_epochs.py does."""
    p, v = np.array([[-R0, 0.0, Z0]]), np.array([SUN_UVW]) * PC_MYR
    dt, n = -0.05, int(round(years / 1e6 / 0.05))
    if n == 0:
        return SUN_NOW
    v = v + 0.5 * dt * accel(p)
    for i in range(n):
        p = p + dt * v
        v = v + (dt if i < n - 1 else 0.5 * dt) * accel(p)
    return p[0] / 1000


def scale_factor(gyr_ago, H0=67.7, Om=0.31):
    """The cosmic scale factor `gyr_ago` before today, flat ΛCDM."""
    OL, H = 1 - Om, H0 / 977.8                      # 1/Gyr
    t = lambda a: 2 / (3 * H * math.sqrt(OL)) * math.asinh(math.sqrt(OL / Om) * a ** 1.5)
    t0 = t(1.0)
    return (math.sinh(1.5 * H * math.sqrt(OL) * (t0 - gyr_ago)) / math.sqrt(OL / Om)) ** (2 / 3)


def m31_separation():
    """The radial Kepler orbit of M31 and the Milky Way: separation (kpc) against Gyr ago, with
    the mass that brings them together 13.8 Gyr ago."""
    r0, v0 = 770.0, -109.0

    def run(M, until):
        r, v, t, dt, out = r0, v0, 0.0, -0.002 / GYR, [(0.0, r0)]
        while t * GYR > -until and r > 1:
            a = -G * M / r ** 2
            v += a * dt
            r += v * dt
            t += dt
            out.append((-t * GYR, r))
        return out, -t * GYR
    lo, hi = 1e12, 1e13
    for _ in range(40):
        M = math.sqrt(lo * hi)
        _, tc = run(M, 20)
        lo, hi = (M, hi) if tc > 13.8 else (lo, M)
    orbit, _ = run(M, 4.5)
    print(f'M31 timing mass {M:.2e} Msun')
    t, r = np.array(orbit).T
    return lambda gyr: float(np.interp(gyr, t, r))


def lmc_track():
    """The LMC's galactocentric position (kpc) against Gyr ago, backward through an NFW halo with
    dynamical friction."""
    Mv, c, Ml, lnL = 1.2e12, 10.0, 1.5e11, 3.0
    rv = (G * Mv / (100 * (67.7 / 1000) ** 2) / 1) ** (1 / 3)     # r200, kpc (H in km/s/kpc)
    rs = rv / c
    mu = lambda x: math.log(1 + x) - x / (1 + x)
    m = lambda r: Mv * mu(r / rs) / mu(c)
    rho = lambda r: Mv / (4 * math.pi * rs ** 3 * mu(c)) / ((r / rs) * (1 + r / rs) ** 2)
    o = next(x for x in O if x['id'] == 'LMC')
    p = SUN_NOW + GAL @ (o['d'] * unit(o['ra'], o['dec']))
    v = np.array([-57.0, -226.0, 221.0])
    from math import erf

    def acc(p, v):
        r = np.linalg.norm(p)
        a = -G * m(r) / r ** 3 * p
        s = np.linalg.norm(v)
        vc = math.sqrt(G * m(r) / r)
        X = s / vc
        a -= 4 * math.pi * G ** 2 * Ml * rho(r) * lnL / s ** 3 * (erf(X) - 2 * X / math.sqrt(math.pi) * math.exp(-X * X)) * v
        return a
    dt, t, out = -0.001 / GYR, 0.0, [(0.0, p.copy())]
    while -t * GYR < 4.5:
        v = v + 0.5 * dt * acc(p, v)
        p = p + dt * v
        v = v + 0.5 * dt * acc(p, v)
        t += dt
        out.append((-t * GYR, p.copy()))
    ts = np.array([x[0] for x in out]); ps = np.array([x[1] for x in out])
    return lambda gyr: np.array([np.interp(gyr, ts, ps[:, q]) for q in range(3)])


def places():
    """Per object, per epoch: [RA, Dec, size over today's, how much is there]."""
    sep, lmc = m31_separation(), lmc_track()
    gc = {}
    for o in O:
        gc[o['id']] = SUN_NOW + GAL @ (o['d'] * unit(o['ra'], o['dec']))
    suns = {y: sun_then(y) for y in set(EPOCH_YEARS.values()) if y >= 6.6e7}
    out = {o['id']: {} for o in O}
    for key, years in EPOCH_YEARS.items():
        gyr = max(years, 0) / 1e9
        sun = suns.get(years, SUN_NOW)
        a = scale_factor(gyr)
        for o in O:
            i, d0 = o['id'], o['d']
            if o['k'] == 'g':
                g0 = gc[i]
                if i in ('M31', 'M33'):
                    m0 = gc['M31']
                    g = m0 * sep(gyr) / np.linalg.norm(m0) + (g0 - m0)
                elif i in ('LMC', 'SMC'):
                    g = lmc(gyr) + (g0 - gc['LMC'])
                else:
                    g = g0 * a
                rel = g - sun
                ra, dec = radec(GAL.T @ rel)
                out[i][key] = [round(ra, 4), round(dec, 4), round(d0 / np.linalg.norm(rel), 4), 1]
                continue
            age = o['age'] * 1e6
            f = float(np.clip((age - years) / (0.3 * age), 0, 1))
            if f == 0:
                out[i][key] = [o['ra'], o['dec'], 1, 0]
                continue
            # Straight-line motion relative to the Sun (pc), as build_star_epochs.py.
            u = unit(o['ra'], o['dec'])
            east = np.array([-math.sin(math.radians(o['ra'])), math.cos(math.radians(o['ra'])), 0])
            north = np.cross(u, east)
            pa, pd, rv = o.get('pm', (0, 0, 0))
            dpc = d0 * 1000
            vel = (4.74047 * dpc * (pa * east + pd * north) / 1000 + rv * u) * PC_MYR / 1e6   # pc/yr
            p = dpc * u - vel * max(years, 0)
            ra, dec = radec(p)
            s = dpc / np.linalg.norm(p)
            if o['k'] in 'ps':
                s *= max(age - max(years, 0), 0) / age
            out[i][key] = [round(ra, 4), round(dec, 4), round(s, 4), round(f, 3)]
    for i in ('M31', 'LMC', 'M81'):
        print(i, ' '.join(f"{k}:{v[2]:.2f}" for k, v in out[i].items() if k in ('hadean44', 'archean27', 'snowball07', 'kpg66', 'modern')))
    return out


def main():
    rows = math.ceil(len(O) / COLS)
    atlas = np.zeros((rows * N, COLS * N, 3), np.uint8)
    meta = []
    pl = places()
    for n, o in enumerate(O):
        rgb, _ = tile(o)
        code, top = encode(rgb)
        r, c = divmod(n, COLS)
        atlas[r * N:(r + 1) * N, c * N:(c + 1) * N] = code
        Image.fromarray(code).save(CACHE / f"tile_{o['id'].replace(' ', '')}.png")
        meta.append(dict(id=o['id'], name=o['name'], k=o['k'], hw=round(math.tan(math.radians(o['fov'] / 2)), 6),
                         top=float('%.4g' % top), d=o['d'], r=round(math.hypot(*(o.get('win') or (o['a'] * 1.3, o['b'] * 1.3))) / 2 / 60, 4),
                         ep=pl[o['id']]))
    buf = io.BytesIO()
    Image.fromarray(atlas).save(buf, 'WEBP', quality=90, method=6)
    (SITE / 'dso.webp').write_bytes(buf.getvalue())
    (HERE / 'dso.json').write_text(json.dumps(dict(n=N, cols=COLS, objects=meta), separators=(',', ':')), encoding='utf-8')
    print(f'{len(O)} objects, atlas {atlas.shape[1]}×{atlas.shape[0]}, {len(buf.getvalue()) / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
