"""Theia's surface map -> site/surf/theia.webp (1024 x 512, left edge longitude 0, east to the right).

No one has seen Theia, so the map is made from what it was likely made of and what was happening to
it 17 Myr after the first solids:
  - A Mars-sized embryo whose mantle held more iron oxide than the Earth's (about 20% FeO: Meier,
    Reufer & Wieler 2014, who find it reconciles the Earth's and Moon's mantles), perhaps
    carbonaceous (even odds, Branco, Machado & Raymond 2025). Its crust is FeO-rich basalt: dark,
    a neutral to brownish grey, geometric albedo about 0.12 (Mars's is 0.17, the lunar maria's 0.07-0.1).
  - Airless: a Mars-sized embryo loses its steam atmosphere to the young Sun's EUV within a few to a
    few tens of Myr (Odert et al. 2018), and a small body's magma ocean freezes soon after it forms.
  - Battered: the last stage of the planets' growth, so the crust is saturated with craters of every
    age (the older the fainter, worn down by later impacts and darkened by space weathering), with
    a few great basins whose floors are darker melt sheets, and the youngest craters bright with
    fresh, unweathered ejecta and rays.
The map is albedo; the shader lights it. Its heights (km over a sphere of 3400 km) go to
site/relief/theia.webp from the same basins and craters, drawn after the albedo's so it is
unchanged: the basins' floors 3-6 km down, flat, with a raised ring at their edge; each crater a
bowl (depth a fifth of its diameter, at most D^0.3 km, so the large ones flatten out, and at most
5 km) under a rim a third as high that falls off outside, shallower with age, the young ones
sharpest with central peaks; and over all of it a gentle roll of a couple of km. One byte from
RELIEF[0] to [1] km, dithered, lossless (as relief_maps.py's).
Usage: python theia_map.py <out dir>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

W, H = 1024, 512
R_KM = 3400.0                                           # surfaces.js SURF_RELIEF
RELIEF = (-15.0, 7.5)
rng = np.random.default_rng(4550)
lat = (0.5 - (np.arange(H) + 0.5) / H) * np.pi
lon = (np.arange(W) + 0.5) / W * 2 * np.pi
LON, LAT = np.meshgrid(lon, lat)
P = np.stack([np.cos(LAT) * np.cos(LON), np.cos(LAT) * np.sin(LON), np.sin(LAT)], -1)


def unit(n):
    v = rng.normal(size=(n, 3))
    return v / np.linalg.norm(v, axis=1)[:, None]


def noise(octaves, base, waves=8):
    """Smooth noise on the sphere: a sum of random waves along random directions."""
    out = np.zeros((H, W))
    for o in range(octaves):
        f = base * 2 ** o
        for d, ph in zip(unit(waves), rng.uniform(0, 2 * np.pi, waves)):
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


# Albedo (relative, mean 1): basalt plains mottled on every scale.
alb = 1 + 0.10 * noise(7, 2.5) + 0.05 * noise(4, 25.0)
hgt = np.zeros((H, W))


def bowl(ang, D, k, peak=0.0):
    """A crater's heights (km) at ang (its radii) for diameter D km and freshness k (0-1)."""
    d = min(0.2 * D, D ** 0.3, 5.0) * (0.25 + 0.75 * k)
    rim = 0.35 * d
    inside = rim - (rim + d) * (1 - np.clip(ang, 0, 1) ** 2) + peak * d * np.exp(-(ang / 0.15) ** 2)
    out = rim * np.clip(ang, 1, None) ** -3 * np.clip(1 - ((ang - 1) / 1.2) ** 2, 0, 1)
    return np.where(ang < 1, inside, out)
# Great basins: darker, smoother melt-flooded floors, irregular edges, a faint bright ring.
edge = noise(5, 6.0)
for c, r in zip(unit(8), rng.uniform(0.12, 0.40, 8)):
    ang = np.arccos(np.clip(P @ c, -1, 1)) / r * (1 + 0.18 * edge)
    floor = 1 - np.clip((ang - 0.8) / 0.25, 0, 1)
    alb *= 1 - floor * (0.22 + 0.06 * noise(3, 12.0)) + 0.06 * np.exp(-((ang - 1.25) / 0.2) ** 2)
    depth = 2.0 + 10.0 * r
    hgt += -depth * floor + 0.25 * depth * np.exp(-((ang - 1.15) / 0.15) ** 2)
# Craters, saturating the surface: sizes a power law, contrast fading with age.
n = 24000
rad = np.minimum(0.0025 * (rng.pareto(1.25, n) + 1), 0.10)
age = rng.uniform(0, 1, n) ** 0.5                       # most are old
for c, r, a in zip(unit(n), rad, age):
    rows, cols = patch(c, 2.2 * r)
    ix = np.ix_(np.arange(H)[rows], cols)
    sub = P[ix]
    ang = np.arccos(np.clip(sub @ c, -1, 1)) / r
    k = (1 - a) * 0.9 + 0.1
    f = (1 - 0.08 * k * (ang < 0.9) * (1 - 0.5 * ang)) * (1 + 0.09 * k * np.exp(-0.5 * ((ang - 1.0) / 0.12) ** 2)) \
        * (1 + 0.04 * k * np.exp(-((ang - 1.5) / 0.4) ** 2) * (ang > 1.05))
    alb[ix] = alb[ix] * f
    hgt[ix] += bowl(ang, 2 * r * R_KM, k)
# A few young craters: bright, unweathered, with thin rays fading outward.
for c in unit(6):
    r = rng.uniform(0.008, 0.02)
    ang = np.arccos(np.clip(P @ c, -1, 1))
    e1 = np.cross(c, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(c, e1)
    az = np.arctan2(P @ e2, P @ e1)
    rays = np.zeros_like(az)
    for a0, w in zip(rng.uniform(-np.pi, np.pi, 24), rng.uniform(0.008, 0.03, 24)):
        rays = np.maximum(rays, rng.uniform(0.3, 1) * np.exp(-0.5 * (np.angle(np.exp(1j * (az - a0))) / w) ** 2))
    reach = rng.uniform(6, 14) * r
    fade = np.clip(1 - (ang - r) / reach, 0, 1) ** 1.5 * (ang > r)
    alb *= 1 + 0.35 * np.exp(-((ang / r - 1.0) / 0.5) ** 2) + 0.12 * np.exp(-((ang / r - 1.6) / 0.6) ** 2) + 0.18 * rays * fade
    near = ang < 2.2 * r
    hgt[near] += bowl(ang[near] / r, 2 * r * R_KM, 1.0, peak=0.4)
# Colour: FeO-rich basalt, a neutral grey a little brown; the fresh ejecta a little bluer.
fresh = np.clip((alb - 1.15) / 0.4, 0, 1)
col = np.stack([0.80 - 0.04 * fresh, np.full_like(fresh, 0.74), 0.67 + 0.06 * fresh], -1) * alb[..., None]
lum = (col * [0.2126, 0.7152, 0.0722]).sum(-1)
wgt = np.cos(LAT)
col *= 0.45 / ((lum * wgt).sum() / wgt.sum())
out = Path(sys.argv[1])
Image.fromarray((np.clip(col, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out / 'theia.webp', 'WEBP', quality=88, method=6)
print('wrote', out / 'theia.webp')
# The gentle roll, drawn last so the albedo's draws are as they were.
hgt += 1.2 * noise(5, 1.5)
q = np.clip(np.round((hgt - RELIEF[0]) / (RELIEF[1] - RELIEF[0]) * 255 + rng.uniform(-0.5, 0.5, hgt.shape)), 0, 255).astype(np.uint8)
rel = out.parent / 'relief'
rel.mkdir(exist_ok=True)
Image.fromarray(q).save(rel / 'theia.webp', lossless=True, method=6)
print('wrote', rel / 'theia.webp', f'{hgt.min():.2f} to {hgt.max():.2f} km, {(rel / "theia.webp").stat().st_size / 1e6:.2f} MB')
