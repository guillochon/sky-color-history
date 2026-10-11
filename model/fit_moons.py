"""Orbits for the round moons of Saturn, Uranus and Neptune not yet in planets.js PLANET_MOONS, fit to
JPL Horizons -> rows to paste into PLANET_MOONS.

Each moon's geometric position about its planet's centre (ICRF, km) is fetched from the Horizons API
(and kept in horizons_cache/) twice: two years densely, which fixes the mean motion, and 1980-2060
every 3.7 days, over which the rest is fit. The orbit lies in the planet's equator, as for the moons
already there (Uranus's go round it backwards: retrograde about the IAU's north pole), unless it is
tilted to it by more than 0.3 degrees; then its pole is fit as a cone about an axis, turning at a
steady rate: the planet's pole, or for Iapetus and Triton an axis turned from it toward the pole of
the planet's orbit by an angle fit too, as their Laplace planes are. Its longitude is then counted
from the plane's ascending node on that axis's equator. Along the orbit: a circle, an ellipse
whose periapsis turns if that fits much better, and if still off by more than 0.1 degree the
largest periodic term left (Mimas's 71-year libration in its resonance with Tethys).

Usage: uv run fit_moons.py   (prints the rows, and each fit's rms error in degrees)
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
# Host index in planets.js PLANETS, Horizons centre, and the pole (J2000 RA, Dec) planets.js uses.
HOSTS = {4: ('500@699', (40.589, 83.537)), 5: ('500@799', (257.311, -15.175)), 6: ('500@899', (299.36, 43.46))}
# The hosts' orbits (planets.js PLANETS): inclination and node on the J2000 ecliptic, and mean distance.
HOST_ORBIT = {4: (2.48599187, 113.66242448, 9.537), 5: (0.77263783, 74.01692503, 19.19), 6: (1.77004347, 131.78422574, 30.07)}
# Horizons id, name, host, radius (km), V0 at mean opposition (JPL SSD satellite physical
# parameters), tint. H = V0 - 5 log10(r (r-1)) at the planet's mean distance r (AU), as for the
# moons already in planets.js.
MOONS = [
    ('601', 'Mimas', 4, 198.2, 12.8, [0.95, 0.95, 0.94]),
    ('602', 'Enceladus', 4, 252.1, 11.8, [0.97, 0.99, 1.0]),
    ('608', 'Iapetus', 4, 734.3, 11.0, [0.92, 0.86, 0.78]),
    ('705', 'Miranda', 5, 235.8, 15.79, [0.92, 0.92, 0.92]),
    ('701', 'Ariel', 5, 578.9, 13.70, [0.95, 0.94, 0.92]),
    ('702', 'Umbriel', 5, 584.7, 14.47, [0.86, 0.85, 0.84]),
    ('703', 'Titania', 5, 788.9, 13.49, [0.94, 0.92, 0.89]),
    ('704', 'Oberon', 5, 761.4, 13.70, [0.93, 0.90, 0.86]),
    ('801', 'Triton', 6, 1352.6, 13.47, [0.98, 0.93, 0.88]),
]
FREE_AXIS = {'Iapetus', 'Triton'}
D = np.pi / 180


def vectors(cmd, center, start, stop, step):
    q = dict(format='json', COMMAND=f"'{cmd}'", EPHEM_TYPE="'VECTORS'", CENTER=f"'{center}'",
             START_TIME=f"'{start}'", STOP_TIME=f"'{stop}'", STEP_SIZE=f"'{step}'", REF_PLANE="'FRAME'",
             REF_SYSTEM="'ICRF'", VEC_TABLE="'2'", VEC_CORR="'NONE'", OUT_UNITS="'KM-D'", CSV_FORMAT="'YES'",
             VEC_LABELS="'NO'", TIME_TYPE="'TDB'", OBJ_DATA="'NO'")
    url = API + '?' + urllib.parse.urlencode(q)
    path = CACHE / (hashlib.sha1(url.encode()).hexdigest()[:16] + '.json')
    if not path.exists():
        CACHE.mkdir(exist_ok=True)
        with urllib.request.urlopen(url, timeout=120) as f:
            path.write_bytes(f.read())
    txt = json.loads(path.read_text())['result']
    rows = txt.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines()
    a = np.array([[float(x) for x in (r.split(',')[0:1] + r.split(',')[2:8])] for r in rows])
    return a[:, 0] - J2000_JD, a[:, 1:4], a[:, 4:7]


def eqvec(ra, dec):
    return np.array([np.cos(dec * D) * np.cos(ra * D), np.cos(dec * D) * np.sin(ra * D), np.sin(dec * D)])


def radec(v):
    return np.degrees(np.arctan2(v[1], v[0])) % 360, np.degrees(np.arcsin(v[2]))


def axes(k):
    """planets.js equatorAxes: x toward the plane's ascending node on the J2000 equator."""
    i = np.array([-k[1], k[0], 0.0]); i /= np.linalg.norm(i)
    return i, np.cross(k, i)


def wrap(x):
    return (x + 180) % 360 - 180


def orbit_pole(host):
    """The host planet's orbit pole, J2000 equatorial."""
    I, node, _ = HOST_ORBIT[host]
    v = np.array([np.sin(I * D) * np.sin(node * D), -np.sin(I * D) * np.cos(node * D), np.cos(I * D)])
    e = 23.43928 * D
    return np.array([v[0], v[1] * np.cos(e) - v[2] * np.sin(e), v[1] * np.sin(e) + v[2] * np.cos(e)])


def towards(P, Q, ang):
    """P turned by ang degrees toward Q."""
    w = Q - (Q @ P) * P; w /= np.linalg.norm(w)
    return np.cos(ang * D) * P + np.sin(ang * D) * w


def cone(p, t):
    """The orbit pole at times t: tilted by inc from axis A, its node on A's equator at O0+Od t
    (planets.js moonPlane)."""
    ra, dec, inc, O0, Od = p
    A = eqvec(ra, dec); ia, ja = axes(A)
    O = (O0 + Od * t)[:, None] * D
    N = np.cos(O) * ia + np.sin(O) * ja
    k = np.cos(inc * D) * A - np.sin(inc * D) * np.cross(A, N)
    return N, k


def fit(cmd, name, host):
    center, pole = HOSTS[host]
    ts, rs, vs = vectors(cmd, center, '1980-01-01', '2060-01-01', '5341 m')
    td, rd, _ = vectors(cmd, center, '2019-01-01', '2021-01-01', '2 h' if name in ('Mimas', 'Enceladus', 'Miranda') else '6 h')
    P = eqvec(*pole)
    h = np.cross(rs, vs); h /= np.linalg.norm(h, axis=1)[:, None]
    tilt = np.degrees(np.arccos(np.clip(h @ P, -1, 1)))
    tilt_eq = np.median(np.minimum(tilt, 180 - tilt))
    plane = None
    if tilt_eq > 0.3:
        Q = orbit_pole(host)
        ia, ja = axes(P)
        Nn = np.cross(P, h)
        on = np.degrees(np.unwrap(np.arctan2(Nn @ ja, Nn @ ia)))
        Od = np.polyfit(ts, on, 1)[0]
        O0 = np.degrees(np.angle(np.mean(np.exp(1j * (on - Od * ts) * D))))
        free = name in FREE_AXIS
        def par(q):
            A = towards(P, Q, q[3]) if free else P
            return np.array(list(radec(A)) + list(q[:3]))
        res = lambda q: (cone(par(q), ts)[1] - h).ravel()
        best = None
        for lap in ([0.5, 5, 15] if free else [None]):
            r_ = least_squares(res, [np.median(tilt), O0, Od] + ([lap] if free else []))
            if best is None or r_.cost < best.cost:
                best = r_
        plane = list(par(best.x))
        if free:
            print(f"// {name}: its plane turns about an axis {best.x[3]:.2f} deg from the pole toward the orbit's")

    def frame(t):
        if plane is None:
            i, j = axes(P)
            return np.tile(i, (len(t), 1)), np.tile(j, (len(t), 1))
        N, k = cone(np.array(plane), t)
        return N, np.cross(k, N)

    def lon(t, r):
        i, j = frame(t)
        return np.degrees(np.arctan2((r * j).sum(1), (r * i).sum(1)))

    n = np.polyfit(td, np.degrees(np.unwrap(lon(td, rd) * D)), 1)[0]
    us = lon(ts, rs)
    L0 = np.degrees(np.angle(np.mean(np.exp(1j * (us - n * ts) * D))))
    rad = np.linalg.norm(rs, axis=1)

    def lonof(q, ecc, per):
        L = q[0] + q[1] * ts
        if per:
            g = (q[-2] + q[-1] * ts) * D
            L = L + q[-4] * np.sin(g) + q[-3] * np.cos(g)
        if not ecc:
            return L, np.ones_like(ts)
        e, w0, wd = q[2:5]
        w = (w0 + wd * ts) * D; M = L * D - w; E = M.copy()
        for _ in range(8):
            E = M + e * np.sin(E)
        nu = 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2), np.sqrt(1 - e) * np.cos(E / 2))
        return (nu + w) / D, 1 - e * np.cos(E)

    def solve(ecc, per, q0):
        r = least_squares(lambda q: wrap(lonof(q, ecc, per)[0] - us), q0)
        return r.x, np.sqrt(np.mean(wrap(lonof(r.x, ecc, per)[0] - us) ** 2))

    q, rms = solve(False, False, [L0, n])
    ecc = per = False
    # The eccentricity and its periapsis from the dense run's distances: (1 - r/a) e^(iu) averaged
    # over an orbit is e e^(i varpi), whose phase gives the periapsis and its turning.
    ud, rn = lon(td, rd) * D, np.linalg.norm(rd, axis=1)
    z = (1 - rn / rn.mean()) * np.exp(1j * ud)
    win = max(1, int(round(360 / abs(n) / (td[1] - td[0]))))
    zs = np.convolve(z, np.ones(win) / win, mode='valid')
    # (1 - r/a) is e cos(u - varpi), so the average is e/2 e^(i varpi)
    e0 = 2 * np.abs(zs).mean()
    eseed = None
    if np.degrees(2 * e0) > 0.05:
        ph = np.degrees(np.unwrap(np.angle(zs)))
        wd0, w00 = np.polyfit(td[win // 2:win // 2 + len(zs)], ph, 1)
        eseed = [e0, w00, wd0]
        qq, rr = solve(True, False, [q[0], q[1]] + eseed)
        if rr < 0.8 * rms:
            q, rms = qq, rr; ecc = True
    if rms > 0.1:
        r0 = wrap(lonof(q, ecc, False)[0] - us)
        # the samples are evenly spaced: the residuals' spectrum, zero-padded eightfold
        sp = np.abs(np.fft.rfft(r0 - r0.mean(), 8 * len(ts)))
        fr = np.fft.rfftfreq(8 * len(ts), ts[1] - ts[0])
        w = 360 * fr[1 + np.argmax(sp[1:])]
        best = None
        for g0 in range(0, 360, 45):
            qq, rr = solve(ecc, True, list(q) + [r0.std(), 0.0, g0, w])
            if best is None or rr < best[1]:
                best = (qq, rr)
        if best[1] < 0.8 * rms:
            q, rms = best; per = True
    # A large libration hides the eccentricity: try it again with the libration in.
    if per and not ecc and eseed:
        qq, rr = solve(True, True, [q[0], q[1]] + eseed + list(q[2:]))
        if rr < 0.8 * rms:
            q, rms = qq, rr; ecc = True
    a = np.mean(rad / lonof(q, ecc, per)[1])
    i, j = frame(ts); k = np.cross(i, j)
    out = np.degrees(np.arcsin((rs * k).sum(1) / rad))
    print(f'// {name}: rms {rms:.3f} deg in longitude, {np.sqrt(np.mean(out ** 2)):.3f} out of the plane; '
          f'tilt to the equator {tilt_eq:.2f}', flush=True)
    return a, q, ecc, per, plane


rows = []
for cmd, name, host, R, V0, tint in MOONS:
    a, q, ecc, per, plane = fit(cmd, name, host)
    r = HOST_ORBIT[host][2]; H = V0 - 5 * np.log10(r * (r - 1))
    if ecc and q[2] < 0:
        q[2], q[3] = -q[2], q[3] + 180
    e = f'[{q[2]:.6f}, {q[3] % 360:.2f}, {q[4]:.7f}]' if ecc else 'null'
    p = f'[{q[-4]:.4f}, {q[-3]:.4f}, {q[-2] % 360:.2f}, {q[-1]:.8f}]' if per else 'null'
    pl = '' if plane is None else f", [{', '.join(f'{v:.4f}' for v in plane[:4])}, {plane[4]:.8f}]"
    tail = f', {e}, {p}{pl}' if (per or plane) else (f', {e}' if ecc else '')
    rows.append(f"  ['{name}', {host}, {R}, {H:.2f}, {a:.0f}, {q[0] % 360:.4f}, {q[1]:.8f}, [{', '.join(str(c) for c in tint)}]{tail}],")
print('\n'.join(rows))
