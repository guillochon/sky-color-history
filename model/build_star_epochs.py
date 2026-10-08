"""Move the Bright Star Catalogue to the two supernova epochs and keep the thousand brightest.

Each star moves in a straight line relative to the Sun, from its present position, distance,
proper motion, and radial velocity. That ignores the Galaxy's pull, which over two million
years bends paths by a few parsecs. Astrometry comes from XHIP (Anderson & Francis 2012,
VizieR V/137D: Hipparcos parallaxes and proper motions from van Leeuwen 2007, with compiled
radial velocities), matched by HD number. A parallax at least three times its error gives the
distance directly. A poorer one only bounds it, so the star goes no closer than the parallax
plus two errors allows, or than its spectral type and luminosity class suggest. Stars with no
XHIP match keep BSC5 proper motions and radial velocities and a spectral-type distance. The
magnitude at the epoch follows from the change in distance. Every catalogue star is moved,
not just today's thousand brightest, because a star that was closer then may have been
brighter. Writes site_src/js/stars_epochs.js in the same row format as stars_catalog.js.

Inputs are local downloads: bsc5.json (as for build_stars.py) and xhip.tsv, from
https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=V/137D/XHIP&-out=HIP,HD,Plx,e_Plx,pmRA,pmDE,RV&-out.max=unlimited
"""
import json
import math
import re
from pathlib import Path

import numpy as np

from bsc import TEMP, load_bsc, num, star_name, parse_ra, parse_dec
from galaxy import PC_MYR, R0, Z0, SUN_UVW, GAL, accel

EPOCHS = {'zetaoph': 1.78e6, 'geminga': 3.42e5}   # years before J2000
KMS_YR_TO_PC = 1.0227e-6                           # pc travelled per year at 1 km/s
rows = load_bsc()
xhip = {}
for line in (TEMP / 'xhip.tsv').read_text(encoding="utf-8").splitlines():
    f = line.split('\t')
    if len(f) < 7 or not f[1].strip().isdigit():
        continue
    xhip[int(f[1])] = dict(plx=num(f[2], None), e=num(f[3], None), pma=num(f[4]) / 1000,
                           pmd=num(f[5]) / 1000, rv=num(f[6], None) if f[6].strip() else None)

# Rough absolute V magnitudes by spectral class, for stars without a usable parallax.
DWARF = {'O': -4.5, 'B': -1.6, 'A': 1.2, 'F': 3.1, 'G': 4.8, 'K': 6.6, 'M': 9.0}
GIANT = {'O': -5.5, 'B': -2.0, 'A': 0.3, 'F': 1.0, 'G': 0.9, 'K': 0.4, 'M': -0.4}


def abs_mag(spectral, lum):
    letter = (spectral or ' ')[0].upper()
    if letter not in DWARF:
        return 0.5
    lum = (lum or '').strip()
    if lum.startswith('I') and not lum.startswith('II') and not lum.startswith('IV'):
        return -6.0          # supergiants: I, Ia, Iab, Ib
    if lum.startswith('II') and not lum.startswith('III'):
        return -3.0          # bright giants
    if lum.startswith('III'):
        return GIANT[letter]
    if lum.startswith('IV'):
        return (GIANT[letter] + DWARF[letter]) / 2
    if lum.startswith('V'):
        return DWARF[letter]
    # No class given: most naked-eye G, K, and M stars are giants.
    return GIANT[letter] if letter in 'GKM' else DWARF[letter]


def unit(ra, dec):
    a, d = math.radians(ra), math.radians(dec)
    return ([math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d)],
            [-math.sin(a), math.cos(a), 0.0],
            [-math.sin(d) * math.cos(a), -math.sin(d) * math.sin(a), math.cos(d)])


stars, matched = [], 0
for star in rows:
    if str(star.get('HR')) == '5958':      # T CrB, catalogued in outburst
        continue
    v = num(star.get('Vmag'), None)
    if v is None or not star.get('RA') or not star.get('Dec'):
        continue
    spec = 10 ** ((v - abs_mag(star.get('SpectralCls'), star.get('LuminosityCls')) + 5) / 5)
    pma, pmd, rv = num(star.get('pmRA')), num(star.get('pmDE')), num(star.get('RadVel'))
    x = xhip.get(int(num(star.get('HD'), 0)))
    if x and x['plx'] is not None and x['e']:
        matched += 1
        pma, pmd = x['pma'], x['pmd']
        if x['rv'] is not None:
            rv = x['rv']
        if x['plx'] > 0 and x['plx'] >= 3 * x['e']:
            dist = 1000.0 / x['plx']
        else:
            bound = x['plx'] + 2 * x['e']
            dist = max(spec, 1000.0 / bound if bound > 0 else 3000.0)
    else:
        dist = spec
    dist = min(max(dist, 1.3), 3000.0)
    name = star_name(star)
    stars.append(dict(ra=parse_ra(star['RA']), dec=parse_dec(star['Dec']), v=v, dist=dist, pma=pma, pmd=pmd,
                      rv=rv, bv=num(star.get('B-V')), k=int(round(num(star.get('K'), 10000))), name=name,
                      spec=(star.get('SpectralCls') or '').strip(), lum=(star.get('LuminosityCls') or '').strip(),
                      glat=num(star.get('GLAT'))))
print(f"{len(stars)} stars, {matched} with XHIP astrometry")


def at_epoch(s, years):
    u, ea, ed = unit(s['ra'], s['dec'])
    vt = 4.74047 * s['dist']
    vel = [s['rv'] * u[i] + vt * (s['pma'] * ea[i] + s['pmd'] * ed[i]) for i in range(3)]
    p = [s['dist'] * u[i] - vel[i] * KMS_YR_TO_PC * years for i in range(3)]
    d = max(math.sqrt(sum(x * x for x in p)), 1.0)
    ra = math.degrees(math.atan2(p[1], p[0])) % 360
    dec = math.degrees(math.asin(max(-1.0, min(1.0, p[2] / d))))
    return ra, dec, s['v'] + 5 * math.log10(d / s['dist']), d


lists = {}
for key, years in EPOCHS.items():
    moved = [(lambda r: (r[2], r[0], r[1], s, r[3]))(at_epoch(s, years)) for s in stars]
    moved.sort(key=lambda m: m[0])
    close = [f"{m[3]['name']} {m[4]:.1f} pc" for m in moved if m[4] < 5]
    if close:
        print(f"{key}: within 5 pc at the epoch: " + ", ".join(close))
    top = moved[:1000]
    print(f"{key}: brightest " + ", ".join(f"{m[3]['name']} {m[0]:.2f} ({m[4]:.1f} pc)" for m in top[:8])
          + f"; faintest kept {top[-1][0]:.2f}")
    lists[key] = [(v, ra, dec, s['bv'], s['k'], s['name']) for v, ra, dec, s, d in top]


# ---- The impact-winter epoch, 66 Ma: orbits in the Galaxy, not straight lines. ----
# Over 66 Myr stars travel hundreds of parsecs along curved orbits, so the Sun and every star
# are traced back through a simple Galaxy: a flat rotation curve (233 km/s) in the plane and the
# disk's vertical pull as a harmonic well (0.1 solar masses per cubic parsec, an 84 Myr
# oscillation), from the Sun at R0 = 8.2 kpc, 20.8 pc above the plane, moving at (U, V, W) =
# (11.1, 12.24, 7.25) km/s relative to the local standard of rest (Schönrich, Binney & Dehnen
# 2010). Only stars long-lived enough to have been shining then are kept: no supergiants or
# bright giants, and no star whose main-sequence lifetime from its spectral type is under twice
# 66 Myr (about B4 and earlier), since its age is unknown. Most stars near the Sun then are too
# far away now to be in the catalogue, so the traced stars are few. Each quarter magnitude is
# filled up to today's count with stand-ins: today's stars of that magnitude, keeping their
# galactic latitude and colour but at a random longitude. The sky's real stars then cannot be
# known.
# Before the impact winter no catalogue star can be traced near the Sun, so those skies are all
# stand-ins (see below). The three 2.7 Ga epochs share one sky.
ORBIT_EPOCHS = {'kpg66': 66e6, 'carbon30': 300e6, 'snowball07': 700e6, 'proterozoic22': 2.2e9,
                'archean27thin': 2.7e9, 'archean27': 2.7e9, 'archean27vthick': 2.7e9,
                'archean38': 3.8e9, 'hadean40': 4.0e9, 'hadean44': 4.4e9}
TRACE_MAX = 1e8                       # trace catalogue stars only this far back
# Main-sequence mass at subclass 0 and at the end of each class (solar masses).
MASS = {'O': (40, 20), 'B': (17, 3.0), 'A': (2.6, 1.7), 'F': (1.6, 1.1), 'G': (1.1, 0.85), 'K': (0.85, 0.6), 'M': (0.5, 0.2)}


def ms_lifetime_myr(spec):
    """Main-sequence lifetime from the spectral type: mass interpolated within the class,
    10 Gyr × M^-2.5."""
    if not spec or spec[0] not in MASS:
        return 1e9
    lo, hi = MASS[spec[0]]
    m = re.match(r'[A-Z](\d(\.\d)?)', spec)
    sub = float(m.group(1)) if m else 5.0
    mass = lo * (hi / lo) ** (sub / 10)
    return 1e4 * mass ** -2.5


def shining_then(s, years):
    lum = s['lum']
    if lum.startswith('I') and not lum.startswith('III') and not lum.startswith('IV'):
        return False            # supergiants (I, Ia, Iab, Ib) and bright giants (II)
    return ms_lifetime_myr(s['spec']) > 2 * years / 1e6


def trace_back(years):
    """Galactocentric positions of the Sun (row 0) and every star, `years` ago (leapfrog). Past
    TRACE_MAX only the Sun is traced. Beyond a Gyr or so the Sun's place on its orbit is only
    nominal: small errors in the Galaxy's rotation, and the Sun's own radial migration, add up."""
    pos, vel = [np.array([-R0, 0.0, Z0])], [np.array(SUN_UVW) * PC_MYR]
    for s in (stars if years <= TRACE_MAX else []):
        u, ea, ed = unit(s['ra'], s['dec'])
        vt = 4.74047 * s['dist']
        v_eq = np.array([s['rv'] * u[i] + vt * (s['pma'] * ea[i] + s['pmd'] * ed[i]) for i in range(3)])
        pos.append(pos[0] + GAL @ (s['dist'] * np.array(u)))
        vel.append(vel[0] + GAL @ v_eq * PC_MYR)
    p, v = np.array(pos), np.array(vel)
    dt, n = -0.05, int(round(years / 1e6 / 0.05))
    v += 0.5 * dt * accel(p)
    for i in range(n):
        p += dt * v
        v += (dt if i < n - 1 else 0.5 * dt) * accel(p)
    return p


epoch_meta, alias, done, traced_lists, seeds = {}, {}, {}, {}, {}
for key, years in ORBIT_EPOCHS.items():
    if years in done:
        alias[key] = done[years]
        epoch_meta[key] = epoch_meta[done[years]]
        continue
    done[years] = key
    p = trace_back(years)
    sun, rel = p[0], p[1:] - p[0]
    # The direction of the Galactic centre from the Sun then, as a galactic longitude now: where
    # the brightest part of the Milky Way lay. The plane itself stays put.
    lc = math.degrees(math.atan2(-sun[1], -sun[0]))
    epoch_meta[key] = dict(mwL=round(lc, 2), sunZ=round(float(sun[2]), 1))
    print(f"{key}: Sun at R = {math.hypot(sun[0], sun[1]):.0f} pc, z = {sun[2]:.0f} pc; Galactic centre then at l = {lc:.1f}°")
    eq = rel @ GAL                      # galactic → J2000 equatorial
    d = np.maximum(np.linalg.norm(eq, axis=1), 1.0)
    traced = []
    for s, e, dd in zip(stars if years <= TRACE_MAX else [], eq, d):
        if not shining_then(s, years):
            continue
        ra = math.degrees(math.atan2(e[1], e[0])) % 360
        dec = math.degrees(math.asin(max(-1.0, min(1.0, e[2] / dd))))
        traced.append((s['v'] + 5 * math.log10(dd / s['dist']), ra, dec, s['bv'], s['k'], s['name'], dd))
    traced.sort(key=lambda m: m[0])
    if traced: print(f"{key}: {len(traced)} of {len(stars)} were shining then; brightest " +
          ", ".join(f"{m[5]} {m[0]:.2f} ({m[6]:.0f} pc)" for m in traced[:6]))
    # The page fills each quarter magnitude up to today's count with stand-ins (stars.js,
    # starsFor): today's stars of that magnitude at a random galactic longitude. Only the traced
    # stars as bright as today's thousandth are kept here.
    limit = sorted(stars, key=lambda s: s['v'])[999]['v']
    kept = [m[:6] for m in traced if m[0] <= limit]
    print(f"{key}: {len(kept)} traced down to V = {limit:.2f}")
    traced_lists[key] = kept
    seeds[key] = int(years / 1e6)


def rows_js(rows):
    return "\n".join(f'[{ra:.4f},{dec:.4f},{v:.2f},{bv:.2f},{k},{json.dumps(name, ensure_ascii=False)}],'
                     for v, ra, dec, bv, k, name in rows)


out = ["// The Bright Star Catalogue moved to the supernova epochs (straight-line motion relative to",
       "// the Sun) and to 66 Ma (orbits in the Galaxy) by build_star_epochs.py, from XHIP (Hipparcos)",
       "// astrometry. Rows are right ascension, declination, V, B-V, colour temperature and name;",
       "// stars.js adds the zero proper motions, as the positions are already moved.",
       "const STARS_EPOCH={"]
for key, rows in lists.items():
    out += [f"{key}:[", rows_js(rows), "],"]
out.append("};")
out.append("// The epochs traced through the Galaxy: the catalogue stars that can be traced, and the seed")
out.append("// for the stand-ins that fill the rest of the sky (stars.js, starsFor). Before the impact")
out.append("// winter no catalogue star can be traced near the Sun, so those skies are all stand-ins.")
out.append("const STAR_TRACED={")
for key, rows in traced_lists.items():
    if rows:
        out += [f"{key}:[", rows_js(rows), "],"]
out.append("};")
out.append("const STAR_STANDIN_SEED=" + json.dumps({**seeds, **{k: seeds[src] for k, src in alias.items()}}) + ";")
for key, src in alias.items():
    if traced_lists.get(src):
        out.append(f"STAR_TRACED.{key}=STAR_TRACED.{src};")
out.append("// For each traced epoch: the galactic longitude (in today's coordinates) of the Galactic centre")
out.append("// as seen from the Sun then, where the Milky Way was brightest, and the Sun's height above the plane (pc).")
out.append("const STAR_EPOCH_GAL=" + json.dumps(epoch_meta) + ";")
path = Path(__file__).with_name('site_src') / 'js' / 'stars_epochs.js'
path.write_text("\n".join(out) + "\n", encoding="utf-8")
print('wrote', path)
