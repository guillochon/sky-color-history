"""The Moon's whole globe for each epoch -> site/moon/<face>.webp (moon_surface.js MOON_MAPS).

The page turns the Moon as it librates, so it needs the far side's edges as well as the near side.
Source, public domain: NASA SVS CGI Moon Kit (svs.gsfc.nasa.gov/4720), lroc_color_poles_4k.tif,
the LRO Wide Angle Camera colour mosaic with the poles filled in, 4096 x 2048, longitude -180 at
the left edge. Its tones are matched channel by channel to the full-Moon photograph the page used
before (site/moon.jpg, Tycho at 43.3 S, 11.4 W, so east is to the right and north is down in it):
the quantiles of the map over the photograph's disk to 57 degrees from its centre are mapped onto
the photograph's, so the face keeps the photograph's colour and the highlands' brightness (MOON_HL,
the 85th percentile of the photograph's brightness 20 pixels across).

Faces (MOON_MAPS keys), 4096 x 2048, longitude -180 at the left edge, north at the top:
  now       today's Moon
  notycho   before Tycho, 108 Ma (Arvidson et al. 1976): its rays pulled down to the ground around
            them, strongest near the crater and fading 48 degrees out, and the crater itself covered
            with the ground 5 degrees north and 15.5 degrees east of it
  ma3800    3.8 Ga: also the maria part-flooded (moon_surface.js MARIA: onsets, and 150 Myr to go
  ma4000    4.0 Ga   dark), the flooded basins brought to the highlands' brightness and colour
  molten    the newborn Moon's magma ocean, 2048 x 1024 (molten_moon.js, run here with node)
  relief    the heights, for the shading, the shadows and the limb (moon_surface.js MOON_RELIEF):
            NASA SVS CGI Moon Kit ldem_16.tif, the LRO laser altimeter's (LOLA) heights over a
            sphere of 1737.4 km, 16 pixels a degree (1.9 km), 5760 x 2880, in one byte from
            RELIEF_LO to RELIEF_HI km (79 m a step), dithered so that slopes in the flat maria
            under a low Sun do not band into contours; lossless
Distances in the photograph's pixels are taken as angles at its centre, 0.114 degrees a pixel.

Usage: python moon_maps.py <lroc_color_poles_4k.tif> <ldem_16.tif> [face ...]
"""
import re, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

HERE = Path(__file__).resolve().parent
SITE = HERE.parent / 'site'
OUT = SITE / 'moon'
SRC, DEM = sys.argv[1:3]
ONLY = set(sys.argv[3:])
LUM = np.array([0.2126, 0.7152, 0.0722], np.float32)
MOON_HL = 0.755                    # the highlands' brightness in the photograph
PHOTO_R = 0.98                     # the photograph's disk: its radius over half its width
PX_DEG = np.degrees(1/(512*PHOTO_R))   # one photograph pixel at its centre, in degrees
MARE_RAMP = 150
RELIEF_LO, RELIEF_HI = -9.2, 10.9     # km, as moon_surface.js MOON_RELIEF


def maria():
    """moon_surface.js MARIA: [name, latitude, longitude, radius (degrees), onset (Ga)]."""
    js = (HERE / 'site_src' / 'js' / 'moon_surface.js').read_text(encoding='utf-8')
    body = re.search(r'const MARIA=\[(.*?)\];', js, re.S).group(1)
    return [(m[0], float(m[1]), float(m[2]), float(m[3]), float(m[4]))
            for m in re.findall(r"\['([^']+)', (-?[\d.]+), (-?[\d.]+), ([\d.]+), ([\d.]+)\]", body)]


def grid(W, H):
    lat = 90-(np.arange(H)+0.5)/H*180
    lon = (np.arange(W)+0.5)/W*360-180
    return np.radians(lat)[:, None], np.radians(lon)[None, :]


def vec(lat, lon):
    """moon_surface.js mareVec: x east, y north, z toward the Earth."""
    return np.cos(lat)*np.sin(lon), np.sin(lat)*np.ones_like(lon), np.cos(lat)*np.cos(lon)


def box(a, r_deg, times=3):
    """Box blur r_deg wide on the sphere, `times` over (three is near a Gaussian): rows wrap in
    longitude and widen as 1/cos(latitude), columns stop at the poles."""
    H, W = a.shape
    a = a.astype(np.float64)
    ry = max(1, int(round(r_deg/(180/H))))
    lat = np.radians(90-(np.arange(H)+0.5)/H*180)
    rx = np.minimum(np.round(ry/np.maximum(np.cos(lat), 1e-3)).astype(int), W//2-1)
    for _ in range(times):
        out = np.empty_like(a)
        for j in range(H):
            r = rx[j]; row = a[j]
            ext = np.concatenate([row[W-r-1:], row, row[:r]])
            c = np.cumsum(ext)
            out[j] = (c[2*r+1:]-c[:W])/(2*r+1)
        c = np.cumsum(np.vstack([np.zeros((1, W)), out]), axis=0)
        lo = np.clip(np.arange(H)-ry, 0, H); hi = np.clip(np.arange(H)+ry+1, 0, H)
        a = (c[hi]-c[lo])/(hi-lo)[:, None]
    return a.astype(np.float32)


def ang(lat, lon, lat0, lon0):
    """Great-circle angle (degrees) from (lat0, lon0)."""
    c = np.sin(lat)*np.sin(np.radians(lat0))+np.cos(lat)*np.cos(np.radians(lat0))*np.cos(lon-np.radians(lon0))
    return np.degrees(np.arccos(np.clip(c, -1, 1)))


def calibrate(m):
    """The map's tones matched to the photograph's, channel by channel, over the near side."""
    ph = np.asarray(Image.open(SITE / 'moon.jpg').convert('RGB'), np.float32)/255
    S = ph.shape[0]
    X = ((np.arange(S)+0.5)-S/2)/(S/2*PHOTO_R)
    X, Y = np.meshgrid(X, X)                        # x east (right), y north (down)
    ok = X*X+Y*Y < np.sin(np.radians(57))**2
    lat = np.arcsin(Y[ok]); lon = np.arctan2(X[ok], np.sqrt(1-X[ok]**2-Y[ok]**2))
    H, W = m.shape[:2]
    j = np.clip(((np.pi/2-lat)/np.pi*H).astype(int), 0, H-1)
    i = np.clip(((lon+np.pi)/(2*np.pi)*W).astype(int), 0, W-1)
    q = np.linspace(0.002, 0.998, 400)
    out = np.empty_like(m)
    for k in range(3):
        a = np.quantile(m[j, i, k], q); b = np.quantile(ph[ok][:, k], q)
        a, idx = np.unique(a, return_index=True); b = b[idx]
        # Beyond the quantiles, on the slope of the last few.
        lo = (b[5]-b[0])/max(a[5]-a[0], 1e-6); hi = (b[-1]-b[-6])/max(a[-1]-a[-6], 1e-6)
        x = m[..., k]
        y = np.interp(x, a, b)
        y = np.where(x < a[0], b[0]+(x-a[0])*lo, y)
        y = np.where(x > a[-1], b[-1]+(x-a[-1])*hi, y)
        out[..., k] = y
    return np.clip(out, 0, 1)


def no_tycho(rgb, lat, lon):
    L = rgb @ LUM
    # The ground around the rays: the wide average, taken again three times with whatever is
    # brighter than it cut down to it. The rays are a few pixels wide, so what is brighter than
    # that ground over five pixels is dimmed to it, and the finer craters keep their contrast.
    r = 25*PX_DEG
    bg = box(L, r)
    for _ in range(3):
        bg = box(np.minimum(L, bg), r)
    Bm = box(L, 2*PX_DEG, 2)
    e = np.exp(-(ang(lat, lon, -43.31, -11.36)/(420*PX_DEG))**2)
    g = np.power(np.minimum(1, np.minimum(bg, 0.93*MOON_HL)/np.maximum(Bm, 1e-3)), e)
    rgb = rgb*g[..., None]
    # The crater: covered with the ground 5 degrees north and 15.5 degrees east of it.
    H, W = L.shape
    C = np.exp(-(ang(lat, lon, -43.31, -11.36)/(26*PX_DEG))**4)[..., None]
    dj, di = -int(round(5.0/(180/H))), int(round(15.5/(360/W)))
    src = np.roll(np.roll(rgb, dj, axis=0), -di, axis=1)
    return rgb+(src-rgb)*C


def flooded(rgb, lat, lon, ma, MA):
    """Each mare's floor to its share of today's darkness at ma (Ma)."""
    shares = [max(0.0, min(1.0, (m[4]*1000-ma)/MARE_RAMP)) for m in MA]
    H, W = lat.shape[0], lon.shape[1]
    # Each point takes the share of the mare nearest it on the sphere, in units of that mare's
    # radius; on the near side, ground 1.6 radii from any is Procellarum's, and on the far side
    # it keeps today's (the old basins there, South Pole-Aitken among them, were dark before).
    best = np.full((H, W), 1.6, np.float32)
    sh = np.where(np.abs(lon) < np.radians(100), shares[-1], 1.0).astype(np.float32)*np.ones((H, W), np.float32)
    for m, s in zip(MA, shares):
        d = ang(lat, lon, m[1], m[2])/m[3]
        near = d < best
        best = np.where(near, d, best); sh = np.where(near, s, sh)
    L = rgb @ LUM
    S = box(sh, 12*PX_DEG); Bs = box(L, 6*PX_DEG); Bc = box(L, 20*PX_DEG); e0 = 1-min(shares)
    # Dark ground is brought up to the highlands as far as its mare is unflooded; bright ground is
    # flattened as far as the least-flooded mare is (the rays of today's young craters go too).
    g = np.clip(MOON_HL/np.maximum(Bs, 1e-3), 0.8, 3)
    rgb = rgb*np.power(g, np.where(g > 1, 1-S, e0))[..., None]
    # The flooded basins also take the highlands' warmer, greyer colour.
    k = (0.8*(1-S)*np.clip((MOON_HL-Bc)/(MOON_HL-0.4), 0, 1))[..., None]
    y = (rgb @ LUM)[..., None]
    return rgb+(y*np.array([1.03, 1.0, 0.95], np.float32)-rgb)*k


def save(name, rgb):
    OUT.mkdir(exist_ok=True)
    im = Image.fromarray((np.clip(rgb, 0, 1)*255+0.5).astype(np.uint8))
    im.save(OUT / f'{name}.webp', quality=86, method=6)
    im.resize((1024, 512), Image.LANCZOS).save(Path(tempfile.gettempdir()) / f'moon_{name}_preview.png')
    print(f'{name}: {(OUT / f"{name}.webp").stat().st_size/1e6:.2f} MB')


def relief():
    h = np.asarray(Image.open(DEM), np.float32)
    rng = np.random.default_rng(1)
    q = np.clip(np.round((h-RELIEF_LO)/(RELIEF_HI-RELIEF_LO)*255+rng.uniform(-0.5, 0.5, h.shape)), 0, 255).astype(np.uint8)
    OUT.mkdir(exist_ok=True)
    Image.fromarray(q).save(OUT / 'relief.webp', lossless=True, method=6)
    print(f'relief: {(OUT / "relief.webp").stat().st_size/1e6:.2f} MB, {h.min():.2f} to {h.max():.2f} km')


def main():
    want = lambda n: not ONLY or n in ONLY
    if want('relief'):
        relief()
    if want('molten'):
        with tempfile.TemporaryDirectory() as td:
            raw = Path(td) / 'molten.rgb'
            subprocess.run(['node', str(HERE / 'molten_moon.js'), '2048', '1024', str(raw)], check=True)
            save('molten', np.frombuffer(raw.read_bytes(), np.uint8).reshape(1024, 2048, 3).astype(np.float32)/255)
    if not any(want(n) for n in ('now', 'notycho', 'ma3800', 'ma4000')):
        return
    m = np.asarray(Image.open(SRC).convert('RGB'), np.float32)/255
    rgb = calibrate(m)
    H, W = rgb.shape[:2]
    lat, lon = grid(W, H)
    if want('now'):
        save('now', rgb)
    old = no_tycho(rgb, lat, lon)
    if want('notycho'):
        save('notycho', old)
    MA = maria()
    for ma in (3800, 4000):
        if want(f'ma{ma}'):
            save(f'ma{ma}', flooded(old, lat, lon, ma, MA))


if __name__ == '__main__':
    main()
