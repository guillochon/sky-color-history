"""Which stars have outshone Sirius in the last few million years?

Every Hipparcos star with a radial velocity and a parallax at least five times its error is
traced back 10 Myr together with the Sun, through the same simple Galaxy as the 66 Ma sky in
build_star_epochs.py (a flat 233 km/s rotation curve, a harmonic vertical well with an 84 Myr
period, the Sun's motion from Schönrich, Binney & Dehnen 2010). Each star's magnitude scales
with its distance only: no extinction (the Local Bubble is nearly dust-free) and no evolution.

Stars whose straight-line closest approach makes them brighter than V = +0.5 are then traced
2,000 times, drawing parallax, proper motion and radial velocity from their errors. A row is
kept when the median peak is brighter than today's Sirius (V = -1.46), the approach is within
8 Myr, and the star is neither an O star nor a class I supergiant; those live about 10 Myr and
mostly formed nearby since. θ Col, whose closest approach rests on a 0.4 mas/yr proper motion,
is traced again with Gaia DR3 astrometry (Gaia Collaboration, Vallenari et al. 2023).

Input is a local download of XHIP (Anderson & Francis 2012, VizieR V/137D), saved as
xhip_err.tsv in the temp directory, from
https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=V/137D/XHIP&-out=_RAJ2000,_DEJ2000,HIP,HD,Vmag,Plx,e_Plx,pmRA,e_pmRA,pmDE,e_pmDE,RV,e_RV,SpType&-out.max=unlimited
Writes encounters.json, which gen_report.py turns into the report's table. Takes a few minutes.
"""
import json
import math
import re
from pathlib import Path
import sys
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

TEMP = Path.home() / 'AppData' / 'Local' / 'Temp'
SIRIUS = -1.46
TMAX, DT, N = 10.0, 0.005, 2000      # Myr, Myr, Monte Carlo draws
K = 1.0227                           # pc per Myr at 1 km/s
R0, Z0, V0 = 8200.0, 20.8, 233.0
NU = 2 * math.pi / 84.0
SUNV = np.array([11.1, 12.24 + V0, 7.25]) * K
GAL = np.array([[-0.0548755604, -0.8734370902, -0.4838350155],
                [0.4941094279, -0.4448296300, 0.7469822445],
                [-0.8676661490, -0.1980763734, 0.4559837762]])
NAMES = {29034: 'θ Columbae', 33579: 'ε Canis Majoris (Adara)', 30324: 'β Canis Majoris (Mirzam)',
         27288: 'ζ Leporis', 31685: 'ν Puppis', 93506: 'ζ Sagittarii (Ascella)', 30438: 'Canopus',
         21421: 'Aldebaran', 24331: 'ρ Orionis', 14576: 'Algol', 103738: 'γ Microscopii',
         30122: 'ζ Canis Majoris (Furud)'}
GAIA = {29034: (4.1731, 0.0694, 0.391, 0.077, 0.121, 0.101)}   # plx, e, pmra, e, pmde, e (mas, mas/yr)

num = lambda s: float(s) if s.strip() else np.nan
rows = []
for line in (TEMP / 'xhip_err.tsv').read_text(encoding='utf-8').splitlines():
    c = line.split('\t')
    if line.startswith('#') or len(c) < 14 or not c[2].strip().isdigit():
        continue
    rows.append([num(x) for x in c[:2]] + [int(c[2])] + [num(x) for x in c[4:13]] + [c[13].strip()])
ra, de, hip, V, plx, eplx, pma, epma, pmd, epmd, rv, erv = (np.array([r[i] for r in rows], float) for i in range(12))
sptype = [r[12] for r in rows]
ok = np.isfinite(rv) & np.isfinite(V) & (plx > 0) & (plx > 5 * eplx)
print(f"{len(rows)} XHIP stars, {ok.sum()} with a radial velocity and parallax/error > 5")


def kinematics(i, plx_, pma_, pmd_, rv_):
    """Heliocentric position (pc) and velocity (km/s), equatorial."""
    a, d = math.radians(ra[i]), math.radians(de[i])
    u = np.array([math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d)])
    ea = np.array([-math.sin(a), math.cos(a), 0.0])
    ed = np.array([-math.sin(d) * math.cos(a), -math.sin(d) * math.sin(a), math.cos(d)])
    dist = 1000 / plx_
    vt = 4.74047 * dist / 1000
    return dist[:, None] * u, rv_[:, None] * u + vt[:, None] * (pma_[:, None] * ea + pmd_[:, None] * ed)


def accel(p):
    R2 = p[:, 0] ** 2 + p[:, 1] ** 2
    return np.stack([-(V0 * K) ** 2 * p[:, 0] / R2, -(V0 * K) ** 2 * p[:, 1] / R2, -NU ** 2 * p[:, 2]], 1)


def closest(p, v):
    """Leapfrog the Sun (row 0) and the stars back TMAX; each star's least distance and when."""
    sun = np.array([-R0, 0.0, Z0])
    x = np.vstack([sun, sun + p @ GAL.T])
    w = np.vstack([SUNV, SUNV + (v @ GAL.T) * K])
    best_d = np.linalg.norm(p, axis=1)
    best_t = np.zeros_like(best_d)
    w += -0.5 * DT * accel(x)
    for i in range(1, int(round(TMAX / DT)) + 1):
        x -= DT * w
        w -= DT * accel(x)
        d = np.linalg.norm(x[1:] - x[0], axis=1)
        m = d < best_d
        best_d[m], best_t[m] = d[m], i * DT
    return best_t, best_d


# Screen with straight lines.
cand = []
for i in np.where(ok)[0]:
    p, v = kinematics(i, plx[i:i+1], pma[i:i+1], pmd[i:i+1], rv[i:i+1])
    t = float(np.clip((p[0] @ v[0]) / (K * (v[0] @ v[0])), 0, TMAX))
    if V[i] + 5 * math.log10(max(np.linalg.norm(p[0] - v[0] * K * t), 0.05) / (1000 / plx[i])) < 0.5:
        cand.append(i)
print(f"{len(cand)} candidates brighter than V = +0.5 on straight lines")

rng = np.random.default_rng(1)


def trace(i, astrometry):
    P, eP, a, ea, d, ed = astrometry
    draw = lambda val, err, dflt: val + rng.standard_normal(N) * (err if np.isfinite(err) and err > 0 else dflt)
    pl = np.maximum(draw(P, eP, 0.5), 0.2)
    p, v = kinematics(i, pl, draw(a, ea, 1.0), draw(d, ed, 1.0), draw(rv[i], erv[i], 2.0))
    t, dmin = closest(p, v)
    peak = V[i] + 5 * np.log10(np.maximum(dmin, 0.05) / (1000 / pl))
    q = lambda arr: [round(float(x), 2) for x in np.percentile(arr, [16, 50, 84])]
    return dict(peak=q(peak), dmin=q(dmin), myr=q(t), p_sirius=round(float(np.mean(peak < SIRIUS)), 2))


out = []
for i in cand:
    r = trace(i, (plx[i], eplx[i], pma[i], epma[i], pmd[i], epmd[i]))
    sp = sptype[i]
    supergiant = sp.startswith('O') or re.match(r'[A-Z][\d.]*\s*I(a|b|ab)?(?![IV])', sp) is not None
    if r['peak'][1] >= SIRIUS or r['myr'][1] > 8 or supergiant:
        continue
    r.update(hip=int(hip[i]), name=NAMES.get(int(hip[i]), f'HIP {int(hip[i])}'), sptype=sp, v_now=float(V[i]),
             d_now=round(1000 / plx[i], 1))
    if int(hip[i]) in GAIA:
        r['gaia'] = trace(i, GAIA[int(hip[i])])
    out.append(r)
out.sort(key=lambda r: r['peak'][1])
for r in out:
    print(f"{r['name']:28s} {r['sptype'][:10]:10s} V now {r['v_now']:5.2f} at {r['d_now']:5.1f} pc | peak {r['peak']} "
          f"at {r['dmin']} pc, {r['myr']} Myr ago, P(< Sirius) {r['p_sirius']}" + (f" | Gaia: {r['gaia']}" if 'gaia' in r else ''))
Path(__file__).with_name('encounters.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
print('wrote encounters.json')
