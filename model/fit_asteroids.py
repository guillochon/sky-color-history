"""Orbits for Ceres, Pallas and Vesta, fit to JPL Horizons -> rows to paste into planets.js ASTEROIDS.

Each one's heliocentric position (J2000 ecliptic, AU) is fetched from the Horizons API (kept in
horizons_cache/) every 8 days over 1800-2200, and fit with the form of planets.js PLANETS (planetHelio):
a, e, I, mean longitude L, longitude of perihelion and node, each at J2000 with a steady rate per
Julian century, as Standish's approximate elements for the planets. Jupiter's pull makes them
wander about these: while the error is over 0.1 degree, periodic terms in the mean longitude are
added, the largest left each time. The fit's error is printed, in degrees as seen from the Sun.

Usage: python fit_asteroids.py
"""
import hashlib
import json
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares

API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
CACHE = Path(__file__).resolve().parent / 'horizons_cache'
J2000_JD = 2451545.0
D = np.pi / 180
BODIES = [('1;', 'Ceres'), ('2;', 'Pallas'), ('4;', 'Vesta')]


def vectors(cmd, start, stop, step):
    q = dict(format='json', COMMAND=f"'{cmd}'", EPHEM_TYPE="'VECTORS'", CENTER="'500@10'",
             START_TIME=f"'{start}'", STOP_TIME=f"'{stop}'", STEP_SIZE=f"'{step}'", REF_PLANE="'ECLIPTIC'",
             REF_SYSTEM="'ICRF'", VEC_TABLE="'2'", VEC_CORR="'NONE'", OUT_UNITS="'AU-D'", CSV_FORMAT="'YES'",
             VEC_LABELS="'NO'", TIME_TYPE="'TDB'", OBJ_DATA="'NO'")
    url = API + '?' + urllib.parse.urlencode(q)
    path = CACHE / (hashlib.sha1(url.encode()).hexdigest()[:16] + '.json')
    if not path.exists():
        CACHE.mkdir(exist_ok=True)
        with urllib.request.urlopen(url, timeout=300) as f:
            path.write_bytes(f.read())
    txt = json.loads(path.read_text())['result']
    rows = txt.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines()
    a = np.array([[float(x) for x in (r.split(',')[0:1] + r.split(',')[2:8])] for r in rows])
    return a[:, 0] - J2000_JD, a[:, 1:4], a[:, 4:7]


def helio(p, T):
    """planets.js planetHelio, vectorised over T (Julian centuries), with planets.js asteroidL's terms
    (p[12:], by threes: the sine's and cosine's amplitudes in degrees and the rate in degrees a
    century) added to the mean longitude."""
    el = p[:6][:, None] + p[6:12][:, None] * T[None, :]
    a, e, I, L, wbar, node = el
    for A, B, w in p[12:].reshape(-1, 3):
        L = L + A * np.sin(w * D * T) + B * np.cos(w * D * T)
    M = ((L - wbar) % 360 + 540) % 360 - 180
    w = wbar - node
    E = M * D + e * np.sin(M * D)
    for _ in range(10):
        E = E - (E - e * np.sin(E) - M * D) / (1 - e * np.cos(E))
    xp, yp = a * (np.cos(E) - e), a * np.sqrt(1 - e * e) * np.sin(E)
    cw, sw, cn, sn, ci, si = np.cos(w * D), np.sin(w * D), np.cos(node * D), np.sin(node * D), np.cos(I * D), np.sin(I * D)
    return np.stack([(cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
                     (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
                     sw * si * xp + cw * si * yp], 1)


def osculating(r, v):
    """Elements at one instant (AU, AU/day), as a starting guess."""
    k2 = 0.01720209895 ** 2
    h = np.cross(r, v); rn = np.linalg.norm(r)
    a = 1 / (2 / rn - v @ v / k2)
    ev = np.cross(v, h) / k2 - r / rn; e = np.linalg.norm(ev)
    I = np.degrees(np.arccos(h[2] / np.linalg.norm(h)))
    node = np.degrees(np.arctan2(h[0], -h[1])) % 360
    nv = np.array([np.cos(node * D), np.sin(node * D), 0])
    w = np.degrees(np.arctan2(np.cross(nv, ev) @ h / np.linalg.norm(h), nv @ ev))
    nu = np.arctan2(np.cross(ev, r) @ h / np.linalg.norm(h), ev @ r)
    E = 2 * np.arctan(np.sqrt((1 - e) / (1 + e)) * np.tan(nu / 2)); M = np.degrees(E - e * np.sin(E))
    return a, e, I, (M + w + node) % 360, (w + node) % 360, node, 36525 * np.degrees(np.sqrt(k2 / a ** 3))


def lon(v):
    return np.degrees(np.arctan2(v[:, 1], v[:, 0]))


for cmd, name in BODIES:
    t, r, _ = vectors(cmd, '1800-01-01', '2200-01-01', '8 d')
    _, r0, v0 = vectors(cmd, '2000-01-01 12:00', '2000-01-02 12:00', '1 d')
    T = t / 36525
    a, e, I, L, wb, nd, n = osculating(r0[0], v0[0])
    p = np.array([a, e, I, L, wb, nd, 0, 0, 0, n, 0, 0])
    res = lambda p: ((helio(p, T) - r) / np.linalg.norm(r, axis=1)[:, None]).ravel()
    scale = [0.01, 0.01, 0.1, 1, 1, 1, 0.01, 0.01, 0.1, 1, 1, 1]
    rms = lambda p: np.sqrt(np.mean(np.degrees(np.linalg.norm(helio(p, T) - r, axis=1) / np.linalg.norm(r, axis=1)) ** 2))
    p = least_squares(res, p, x_scale=scale).x
    # Jupiter's pull, while the rms is over 0.1 degree: the largest periodic term left in the
    # longitude (from its periodogram, periods of 2 to 400 years), all refit with it, kept if it
    # takes off a tenth of the error; up to four.
    for _ in range(4):
        if rms(p) < 0.1:
            break
        dl = (lon(r) - lon(helio(p, T)) + 180) % 360 - 180
        f = np.linspace(0.25, 50, 4000) * 2 * np.pi
        S, C = np.sin(np.outer(T, f)), np.cos(np.outer(T, f))
        pw = (S.T @ dl) ** 2 / (S * S).sum(0) + (C.T @ dl) ** 2 / (C * C).sum(0)
        w = np.degrees(f[np.argmax(pw)])
        q = least_squares(res, np.concatenate([p, [0, 0, w]]), x_scale=scale + [0.1, 0.1, 10]).x
        if rms(q) > 0.9 * rms(p):
            break
        p = q
        scale = scale + [0.1, 0.1, 10]
    err = np.degrees(np.linalg.norm(helio(p, T) - r, axis=1) / np.linalg.norm(r, axis=1))
    print(f'// {name}: rms {np.sqrt(np.mean(err ** 2)):.3f} deg, worst {err.max():.3f}; 1900-2100 rms {np.sqrt(np.mean(err[np.abs(T) < 1] ** 2)):.3f}; {(len(p) - 12) // 3} terms')
    el = [p[0], p[1], p[2], p[3] % 360, p[4] % 360, p[5] % 360]
    terms = ', '.join(f'[{A:.4f}, {B:.4f}, {w:.3f}]' for A, B, w in p[12:].reshape(-1, 3))
    print(f"  ['{name}', [{', '.join(f'{v:.8f}' for v in el)}], [{', '.join(f'{v:.8f}' for v in p[6:12])}], [{terms}]],")
