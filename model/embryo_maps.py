"""The 4.55 Ga sky's other imagined worlds -> site/surf/<name>.webp (1024 x 512, left edge longitude 0,
east to the right) and their heights -> site/relief/<name>.webp, made as theia_map.py makes Theia's:

  - Proto-Mercury (protomercury): Mercury before it lost most of its mantle, about 0.12 Earth masses
    and 3,500 km in radius (twice and a quarter today's mass, as Benz et al. 2007 and Chau et al.
    2018 start it). It formed where the disk was poorest in oxygen, so its rock holds little iron
    oxide and much carbon, and the graphite that floated to the top of its magma ocean darkens its
    oldest crust (Vander Kaaden & McCubbin 2015; Peplowski et al. 2016, the darkening agent MESSENGER
    found): dark, neutral to a little blue gray, geometric albedo about 0.13. Over a quarter of it
    smooth volcanic plains already, brighter and redder, as Mercury's (Denevi et al. 2013), with
    fewer craters; craters through the plains dig up the dark crust beneath them in dark, bluish
    halos (Mercury's low-reflectance material), and the youngest are bright with bluish rays.
  - Anteros: the Mars-sized embryo that grazes proto-Mercury and then strikes Venus. It formed near
    Venus's orbit: basalt with a moderate share of iron oxide, at a little over half an AU, where
    the young Sun's wind, many times today's, weathers the ground darker and redder than the Moon's
    (nanophase iron, as on the lunar soils): a dark, reddish-brown world, albedo about 0.11, its
    rays erased soon, so only the freshest craters stand out, gray and bright. One great old basin,
    flooded with darker lava, covers much of one hemisphere, as Procellarum does on the Moon.
  - Enyo: the body of about 1,400 km whose impact made Mars's crustal dichotomy (Marinova et al.
    2008, 1,600-2,700 km for a northern Borealis basin; Ballantyne et al. 2022, 1,000-1,500 km for a
    southern impact). A protoplanet of the asteroid belt's inner edge melted by aluminum-26, its
    crust basalt like Vesta's (eucrites), brighter (albedo about 0.28) and lightly weathered, with
    the dark carbonaceous spatter of the impactors that struck it (as on Vesta: McCord et al. 2012),
    and a few great basins as deep for its size as Vesta's, the largest with a central peak.
The maps are albedo; the shader lights them, each scaled to the same mean brightness as Theia's.
The heights (km over a sphere of the body's radius) are built from the same basins and craters,
one byte from RELIEF[0] to [1] km, dithered, lossless (as theia_map.py's).
Usage: python embryo_maps.py <out dir>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

W, H = 1024, 512
lat = (0.5 - (np.arange(H) + 0.5) / H) * np.pi
lon = (np.arange(W) + 0.5) / W * 2 * np.pi
LON, LAT = np.meshgrid(lon, lat)
P = np.stack([np.cos(LAT) * np.cos(LON), np.cos(LAT) * np.sin(LON), np.sin(LAT)], -1)
WGT = np.cos(LAT)


class World:
    """One body's albedo (relative, mean 1), color and heights (km), built up in place."""

    def __init__(self, seed, R_km):
        self.rng = np.random.default_rng(seed)
        self.R = R_km
        self.alb = np.ones((H, W))
        self.hgt = np.zeros((H, W))

    def unit(self, n):
        v = self.rng.normal(size=(n, 3))
        return v / np.linalg.norm(v, axis=1)[:, None]

    def noise(self, octaves, base, waves=8):
        """Smooth noise on the sphere: a sum of random waves along random directions."""
        out = np.zeros((H, W))
        for o in range(octaves):
            f = base * 2 ** o
            for d, ph in zip(self.unit(waves), self.rng.uniform(0, 2 * np.pi, waves)):
                out += np.sin(f * (P @ d) + ph) / 1.7 ** o
        return out / np.abs(out).max()


def patch(c, reach):
    """Rows and columns (wrapping) of the pixels within angle reach of direction c."""
    la, lo = np.arcsin(c[2]), np.arctan2(c[1], c[0]) % (2 * np.pi)
    r0 = max(0, int((np.pi / 2 - la - reach) / np.pi * H) - 1)
    r1 = min(H, int((np.pi / 2 - la + reach) / np.pi * H) + 2)
    cl = np.cos(max(abs(la) - reach, 0)) if abs(la) + reach < np.pi / 2 - 0.02 else 0
    if cl <= 0:
        return slice(r0, r1), np.arange(W)
    half = int(reach / cl / (2 * np.pi) * W) + 2
    mid = int(lo / (2 * np.pi) * W)
    return slice(r0, r1), np.arange(mid - half, mid + half + 1) % W


def bowl(ang, D, k, peak=0.0, dmax=5.0):
    """A crater's heights (km) at ang (its radii) for diameter D km and freshness k (0-1)."""
    d = min(0.2 * D, D ** 0.3, dmax) * (0.25 + 0.75 * k)
    rim = 0.35 * d
    inside = rim - (rim + d) * (1 - np.clip(ang, 0, 1) ** 2) + peak * d * np.exp(-(ang / 0.15) ** 2)
    out = rim * np.clip(ang, 1, None) ** -3 * np.clip(1 - ((ang - 1) / 1.2) ** 2, 0, 1)
    return np.where(ang < 1, inside, out)


def basins(w, n, rmin, rmax, depth0, depth1, dark, flood=None):
    """Great basins: irregular edges, floors depth0 + depth1·r km down, darker by dark, a raised
    ring. Where flood (0-1 per basin) is given, lava fills the floor back up that far and smooths it.
    Returns the floors' mask, the most of any basin's at each pixel."""
    edge = w.noise(5, 6.0)
    mask = np.zeros((H, W))
    for j, (c, r) in enumerate(zip(w.unit(n), w.rng.uniform(rmin, rmax, n))):
        ang = np.arccos(np.clip(P @ c, -1, 1)) / r * (1 + 0.18 * edge)
        floor = 1 - np.clip((ang - 0.8) / 0.25, 0, 1)
        w.alb *= 1 - floor * (dark + 0.06 * w.noise(3, 12.0)) + 0.06 * np.exp(-((ang - 1.25) / 0.2) ** 2)
        depth = depth0 + depth1 * r
        fl = flood[j] if flood is not None else 0.0
        w.hgt += -depth * floor * (1 - fl) + 0.25 * depth * np.exp(-((ang - 1.15) / 0.15) ** 2)
        mask = np.maximum(mask, floor)
    return mask


def craters(w, n, rad0, slope, rmax, contrast, keep=None, dmax=5.0, halo=None):
    """Craters saturating the surface: sizes a power law, contrast fading with age. keep (0-1 a
    pixel) is how much of the older cratering a younger surface keeps; halo(c, r, k) may return an
    extra albedo factor for a crater's ejecta (a dark halo dug up from below)."""
    rad = np.minimum(rad0 * (w.rng.pareto(slope, n) + 1), rmax)
    age = w.rng.uniform(0, 1, n) ** 0.5                 # most are old
    for c, r, a in zip(w.unit(n), rad, age):
        rows, cols = patch(c, 2.2 * r)
        ix = np.ix_(np.arange(H)[rows], cols)
        ang = np.arccos(np.clip(P[ix] @ c, -1, 1)) / r
        k = (1 - a) * 0.9 + 0.1
        # On a younger surface only the younger craters are kept, in full.
        s = 1.0 if keep is None else np.clip((1 - a) / 0.35, 0, 1) * (1 - keep[ix]) + keep[ix]
        f = (1 - contrast[0] * k * (ang < 0.9) * (1 - 0.5 * ang)) * (1 + contrast[1] * k * np.exp(-0.5 * ((ang - 1.0) / 0.12) ** 2)) \
            * (1 + contrast[2] * k * np.exp(-((ang - 1.5) / 0.4) ** 2) * (ang > 1.05))
        if halo is not None:
            f = f * halo(ix, ang, r, k)
        w.alb[ix] *= 1 + (f - 1) * s
        w.hgt[ix] += bowl(ang, 2 * r * w.R, k, dmax=dmax) * s


def rays(w, n, rmin, rmax, reach, bright, ray, dmax=5.0):
    """A few young craters: bright, unweathered, with thin rays fading outward over reach radii.
    Returns their fresh-ground mask (0-1)."""
    fresh = np.zeros((H, W))
    for c in w.unit(n):
        r = w.rng.uniform(rmin, rmax)
        ang = np.arccos(np.clip(P @ c, -1, 1))
        e1 = np.cross(c, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(c, e1)
        az = np.arctan2(P @ e2, P @ e1)
        rr = np.zeros_like(az)
        for a0, wd in zip(w.rng.uniform(-np.pi, np.pi, 24), w.rng.uniform(0.008, 0.03, 24)):
            rr = np.maximum(rr, w.rng.uniform(0.3, 1) * np.exp(-0.5 * (np.angle(np.exp(1j * (az - a0))) / wd) ** 2))
        far = w.rng.uniform(*reach) * r
        fade = np.clip(1 - (ang - r) / far, 0, 1) ** 1.5 * (ang > r)
        g = bright * np.exp(-((ang / r - 1.0) / 0.5) ** 2) + 0.35 * bright * np.exp(-((ang / r - 1.6) / 0.6) ** 2) + ray * rr * fade
        w.alb *= 1 + g
        fresh = np.maximum(fresh, np.clip(g / bright, 0, 1))
        near = ang < 2.2 * r
        w.hgt[near] += bowl(ang[near] / r, 2 * r * w.R, 1.0, peak=0.4, dmax=dmax)
    return fresh


def save(w, name, col, relief, out):
    lum = (col * [0.2126, 0.7152, 0.0722]).sum(-1)
    col = col * (0.45 / ((lum * WGT).sum() / WGT.sum()))
    Image.fromarray((np.clip(col, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out / f'{name}.webp', 'WEBP', quality=88, method=6)
    q = np.clip(np.round((w.hgt - relief[0]) / (relief[1] - relief[0]) * 255 + w.rng.uniform(-0.5, 0.5, w.hgt.shape)), 0, 255).astype(np.uint8)
    rel = out.parent / 'relief'
    rel.mkdir(exist_ok=True)
    Image.fromarray(q).save(rel / f'{name}.webp', lossless=True, method=6)
    print('wrote', name, f'heights {w.hgt.min():.2f} to {w.hgt.max():.2f} km (stored {relief[0]} to {relief[1]})')


def protomercury(out):
    w = World(4551, 3500.0)
    w.alb += 0.10 * w.noise(7, 2.5) + 0.05 * w.noise(4, 25.0)
    # The great basins, some flooded by the plains' lavas.
    flood = w.rng.uniform(0, 1, 7) ** 0.7
    floors = basins(w, 7, 0.12, 0.40, 2.0, 10.0, 0.10, flood)
    # Smooth volcanic plains: over a quarter of the surface, filling the flooded basins and spreading
    # in broad lowland sheets, with lobate edges.
    sheet = w.noise(6, 1.8) + 0.25 * w.noise(4, 9.0)
    plains = np.clip((sheet - np.quantile(sheet, 0.79)) / 0.15, 0, 1)
    plains = np.maximum(plains, np.clip((floors - 0.4) / 0.3, 0, 1) * (w.noise(3, 4.0) > -0.3))
    w.hgt = w.hgt * (1 - 0.8 * plains) + plains * np.minimum(w.hgt, -1.0) * 0.2
    w.alb = w.alb * (1 - 0.6 * plains) + 1.0 * 0.6 * plains + 0.25 * plains
    # Craters; the plains keep only the younger ones, and those dig up the dark crust beneath them.
    def halo(ix, ang, r, k):
        p = plains[ix]
        return 1 - 0.18 * k * p * np.exp(-((ang - 1.3) / 0.6) ** 2) * (r > 0.004)
    craters(w, 22000, 0.0025, 1.25, 0.10, (0.08, 0.09, 0.04), keep=1 - plains, halo=halo)
    dark = np.clip(1 - w.alb / np.median(w.alb), 0, 1)
    fresh = rays(w, 7, 0.008, 0.02, (8, 16), 0.40, 0.20)
    # Color: the graphite-dark crust a neutral, faintly blue gray; the plains a warmer tan; the dark
    # halos bluer; fresh ejecta a bright bluish white.
    base = np.stack([np.full_like(plains, 0.75), np.full_like(plains, 0.75), np.full_like(plains, 0.76)], -1)
    tan = np.array([0.84, 0.78, 0.70])
    col = base * (1 - plains[..., None]) + tan * plains[..., None]
    col = col + np.array([-0.03, -0.01, 0.02]) * np.clip(dark * 3, 0, 1)[..., None] + np.array([-0.04, 0.0, 0.06]) * fresh[..., None]
    col = col * w.alb[..., None]
    w.hgt += 1.2 * w.noise(5, 1.5)
    save(w, 'protomercury', col, (-13.0, 8.0), out)


def anteros(out):
    w = World(4552, 3300.0)
    w.alb += 0.08 * w.noise(7, 2.5) + 0.04 * w.noise(4, 25.0)
    # The great old basin over much of one hemisphere, flooded with darker lava.
    c0 = np.array([0.3, -0.85, 0.42]); c0 /= np.linalg.norm(c0)
    ang0 = np.arccos(np.clip(P @ c0, -1, 1)) / 0.95 * (1 + 0.15 * w.noise(5, 3.0))
    mare = 1 - np.clip((ang0 - 0.75) / 0.25, 0, 1)
    w.hgt += -3.5 * mare + 0.8 * np.exp(-((ang0 - 1.1) / 0.2) ** 2)
    floors = basins(w, 7, 0.10, 0.32, 2.0, 10.0, 0.16, w.rng.uniform(0.2, 1.0, 7))
    mare = np.maximum(mare * np.clip(0.75 + 0.5 * w.noise(4, 5.0), 0, 1), np.clip((floors - 0.5) / 0.3, 0, 1) * 0.8)
    w.alb *= 1 - 0.30 * mare
    w.hgt *= 1 - 0.5 * mare
    craters(w, 24000, 0.0025, 1.25, 0.10, (0.07, 0.06, 0.02), keep=1 - 0.7 * mare)
    # The young Sun's wind erases rays fast: short ones, on the few freshest craters only.
    fresh = rays(w, 5, 0.006, 0.016, (3, 6), 0.55, 0.10)
    # Color: weathered basalt a dark reddish brown, the maria a little less red, fresh ground gray.
    col = np.stack([np.full_like(mare, 0.85), np.full_like(mare, 0.73), np.full_like(mare, 0.62)], -1)
    col = col + np.array([-0.04, 0.0, 0.03]) * mare[..., None]
    col = col * (1 - fresh[..., None]) + np.array([0.78, 0.77, 0.77]) * fresh[..., None]
    col = col * w.alb[..., None]
    w.hgt += 1.2 * w.noise(5, 1.5)
    save(w, 'anteros', col, (-15.0, 9.5), out)


def enyo(out):
    w = World(4553, 700.0)
    w.alb += 0.14 * w.noise(7, 2.5) + 0.07 * w.noise(4, 22.0)
    # Basins as deep for its size as Vesta's: the largest a third of the way round, with a central peak.
    for c, r, d in zip(w.unit(3), [0.75, 0.48, 0.36], [12.0, 9.0, 7.0]):
        ang = np.arccos(np.clip(P @ c, -1, 1)) / r * (1 + 0.12 * w.noise(4, 5.0))
        floor = 1 - np.clip((ang - 0.75) / 0.3, 0, 1)
        w.hgt += -d * floor * (1 - ang ** 2 * 0.5) + 0.2 * d * np.exp(-((ang - 1.12) / 0.18) ** 2)
        if r > 0.7:
            w.hgt += 1.6 * d * np.exp(-(ang / 0.18) ** 2)
        w.alb *= 1 + 0.08 * floor * w.noise(3, 10.0) + 0.05 * np.exp(-((ang - 1.2) / 0.25) ** 2)
    craters(w, 20000, 0.0035, 1.2, 0.14, (0.09, 0.10, 0.05), dmax=6.0)
    # Dark carbonaceous spatter from the impactors, in blotches round some craters' rims.
    streak = np.clip(0.4 + w.noise(4, 30.0), 0, 1)
    for c in w.unit(40):
        r = w.rng.uniform(0.01, 0.06)
        ang = np.arccos(np.clip(P @ c, -1, 1)) / r
        w.alb *= 1 - w.rng.uniform(0.2, 0.45) * np.exp(-(ang / 1.6) ** 2) * streak
    fresh = rays(w, 6, 0.01, 0.03, (6, 12), 0.35, 0.15, dmax=6.0)
    darkm = np.clip(1 - w.alb / np.median(w.alb), 0, 1)
    # Color: eucritic basalt, a light, warm gray; the dark spatter browner; fresh ground whiter.
    col = np.stack([np.full_like(fresh, 0.88), np.full_like(fresh, 0.83), np.full_like(fresh, 0.76)], -1)
    col = col + np.array([0.0, -0.03, -0.06]) * np.clip(darkm * 2, 0, 1)[..., None] + np.array([0.0, 0.03, 0.06]) * fresh[..., None]
    col = col * w.alb[..., None]
    w.hgt += 2.0 * w.noise(5, 1.5)
    save(w, 'enyo', col, (-21.0, 12.0), out)


if __name__ == '__main__':
    out = Path(sys.argv[1])
    for f in (protomercury, anteros, enyo):
        f(out)
