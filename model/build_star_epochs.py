"""The Bright Star Catalogue's motion: today's thousand brightest and the stars that were among the
thousand brightest at some time from 2.2 Myr ago to 250,000 years ahead, for the page to move.

Each star moves in a straight line relative to the Sun, from its present position, distance,
proper motion, and radial velocity. That ignores the Galaxy's pull, which over two million
years bends paths by a few parsecs. Astrometry comes from XHIP (Anderson & Francis 2012,
VizieR V/137D: Hipparcos parallaxes and proper motions from van Leeuwen 2007, with compiled
radial velocities), matched by HD number. A parallax at least three times its error gives the
distance directly. A poorer one only bounds it, so the star goes no closer than the parallax
plus two errors allows, or than its spectral type and luminosity class suggest. Stars with no
XHIP match keep BSC5 proper motions and radial velocities and a spectral-type distance. The
magnitude at a time follows from the change in distance. Every catalogue star is moved, not
just today's thousand brightest, because a star that was closer then may have been brighter.
Writes site_src/js/stars_epochs.js and constellations.js.

Inputs are downloads in model/data/ (fetch_catalogs.py): bsc5.json and xhip.tsv, from
https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=V/137D/XHIP&-out=HIP,HD,Plx,e_Plx,pmRA,pmDE,RV&-out.max=unlimited
"""
import json
import math
import re
from pathlib import Path

import numpy as np

from bsc import DATA, catalogue, num, star_name, parse_ra, parse_dec
from galaxy import PC_MYR, R0, Z0, SUN_UVW, GAL, accel

KMS_YR_TO_PC = PC_MYR / 1e6                        # pc travelled per year at 1 km/s
xhip, hip_hd = {}, {}
for line in (DATA / 'xhip.tsv').read_text(encoding="utf-8").splitlines():
    f = line.split('\t')
    if len(f) < 7 or not f[1].strip().isdigit():
        continue
    if f[0].strip().isdigit():
        hip_hd[int(f[0])] = int(f[1])
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
for v, star in catalogue():
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
                      glat=num(star.get('GLAT')), hd=int(num(star.get('HD'), 0))))
print(f"{len(stars)} stars, {matched} with XHIP astrometry")


def velocity(s):
    """The unit vector toward the star and its heliocentric velocity (km/s), equatorial."""
    u, ea, ed = unit(s['ra'], s['dec'])
    vt = 4.74047 * s['dist']
    return u, [s['rv'] * u[i] + vt * (s['pma'] * ea[i] + s['pmd'] * ed[i]) for i in range(3)]


def at_epoch(s, years):
    """Place, magnitude and distance `years` back, then the proper motion (arcsec/yr) and radial
    velocity (km/s) seen from there, so the page carries the star on along the same line."""
    u, vel = velocity(s)
    p = [s['dist'] * u[i] - vel[i] * KMS_YR_TO_PC * years for i in range(3)]
    d = max(math.sqrt(sum(x * x for x in p)), 1.0)
    ra = math.degrees(math.atan2(p[1], p[0])) % 360
    dec = math.degrees(math.asin(max(-1.0, min(1.0, p[2] / d))))
    u1, ea, ed = unit(ra, dec)
    along = lambda a: sum(a[i] * vel[i] for i in range(3))
    return ra, dec, s['v'] + 5 * math.log10(d / s['dist']), d, along(ea) / (4.74047 * d), along(ed) / (4.74047 * d), along(u1)


# ---- The stars the page can show from today's catalogue: within STAR_LINE_YEARS, today's
# thousand brightest and every star that was among the thousand brightest at some time from
# 2.2 Myr ago to 250,000 years ahead (stars.js moves them along their lines and shows the thousand
# brightest of the year). Past that the Galaxy's pull has bent the lines, and the page's stars are
# stand-ins on flyby paths.
SAMPLE_YEARS = np.arange(-2.2e6, 2.5e5 + 1, 2.5e4)


def motion_js(pma, pmd, dist, rv):
    return f'{pma:.4f},{pmd:.4f},{dist:.4g},{rv:.1f}'


U = np.array([velocity(s)[0] for s in stars]); VEL = np.array([velocity(s)[1] for s in stars])
D0 = np.array([s['dist'] for s in stars]); V0 = np.array([s['v'] for s in stars])
ever = np.zeros(len(stars), bool)
for t in SAMPLE_YEARS:
    p = D0[:, None]*U + VEL*KMS_YR_TO_PC*t
    v = V0 + 5*np.log10(np.maximum(np.linalg.norm(p, axis=1), 1.0)/D0)
    ever |= v <= np.sort(v)[999]
# Today's thousand (stars_catalog.js, in its order) get their motion, matched by place and V.
src = (Path(__file__).with_name('site_src') / 'js' / 'stars_catalog.js').read_text(encoding='utf-8')
cat = [tuple(map(float, m.groups())) for m in re.finditer(r'^\[([-\d.]+),([-\d.]+),([-\d.]+),', src, re.M)]
motion, today = [], set()
for ra, dec, v in cat:
    j = min(range(len(stars)), key=lambda k: (stars[k]['ra'] - ra) ** 2 + (stars[k]['dec'] - dec) ** 2 + (stars[k]['v'] - v) ** 2)
    best = stars[j]
    assert abs(best['ra'] - ra) < 1e-3 and abs(best['dec'] - dec) < 1e-3, (ra, dec)
    today.add(j)
    motion.append(f"[{motion_js(best['pma'], best['pmd'], best['dist'], best['rv'])}]")
extra = [k for k in np.flatnonzero(ever) if k not in today]
print(f"{len(extra)} stars besides today's thousand were among the thousand brightest between "
      f"{-SAMPLE_YEARS[0]/1e6:.1f} Myr ago and {SAMPLE_YEARS[-1]/1e3:.0f} kyr ahead")
for key, years in {'zetaoph': 1.78e6, 'geminga': 3.42e5}.items():
    moved = sorted((at_epoch(s, years)[2], s['name']) for s in stars)
    print(f"{key}: brightest " + ", ".join(f"{n} {m:.2f}" for m, n in moved[:6]))


# The Sun's own track back to the Solar System's birth, every TRACK_MYR, through galaxy.py's Galaxy
# (a leapfrog from today's place and velocity): the Galactic centre's longitude in today's
# coordinates, unwrapped so it runs on smoothly, and the Sun's height (pc).
TRACK_MYR = 2


def sun_track(end_myr=4568):
    p, v, dt = np.array([[-R0, 0.0, Z0]]), np.array([SUN_UVW]) * PC_MYR, -0.05
    per = int(round(TRACK_MYR / -dt))
    v += 0.5 * dt * accel(p)
    ls, zs = [], []
    for i in range(int(round(end_myr / -dt)) + 1):
        if i % per == 0:
            ls.append(math.degrees(math.atan2(-p[0, 1], -p[0, 0])))
            zs.append(float(p[0, 2]))
        p += dt * v
        v += dt * accel(p)
    return [round(float(x), 2) for x in np.unwrap(np.radians(ls)) * 180 / math.pi], [round(z, 1) for z in zs]


track_l, track_z = sun_track()
print(f"Sun's track: {len(track_l)} points; l = {track_l[33]:.2f}°, z = {track_z[33]:.1f} pc at 66 Ma")



def type_of(s):
    return (s['spec'] + (' ' + s['lum'] if s['lum'] else '')).strip()


out = ["// Star motion (build_star_epochs.py), from XHIP (Hipparcos) astrometry and the Yale Bright Star",
       "// Catalogue. STAR_MOTION: for each star of STARS, in its order, proper motion (arcsec/yr, mu alpha",
       "// cos delta and mu delta), distance (pc) and radial velocity (km/s). STAR_EXTRA: the stars not among",
       "// today's thousand brightest that were at some time from 2.2 Myr ago to 250,000 years ahead, rows",
       "// as STARS (J2000 place today, V today, B-V, proper motion, colour temperature, name), then the MK",
       "// type, distance and radial velocity.",
       "const STAR_MOTION=[" + ",".join(motion) + "];",
       "const STAR_EXTRA=["]
for k in extra:
    s = stars[k]
    out.append(f"[{s['ra']:.4f},{s['dec']:.4f},{s['v']:.2f},{s['bv']:.2f},{s['pma']:.4f},{s['pmd']:.4f},{s['k']},{json.dumps(s['name'], ensure_ascii=False)},"
               f"{json.dumps(type_of(s))},{s['dist']:.4g},{s['rv']:.1f}],")
out.append("];")
out.append(f"// The Sun's track through time (milkyway.js sunGalAt), every {TRACK_MYR} Myr back from now: the Galactic")
out.append("// centre's longitude (today's coordinates, unwrapped) and the Sun's height above the plane (pc).")
out.append("const STAR_SUN_TRACK=" + json.dumps(dict(step=TRACK_MYR, l=track_l, z=track_z), separators=(',', ':')) + ";")
path = Path(__file__).with_name('site_src') / 'js' / 'stars_epochs.js'
path.write_text("\n".join(out) + "\n", encoding="utf-8")
print('wrote', path)


# ---- Constellation figures: Stellarium's modern sky culture (skycultures/modern/index.json, ----
# lines as chains of Hipparcos numbers), matched to the catalogue through XHIP's HD numbers.
# Each vertex is placed today and moved to the supernova epochs as its star is; the page leaves
# out each line whose stars have moved too far apart (vr_hud.js, CON_LINE_MAX). The
# median change of a line's length is printed for each epoch.
by_hd = {s['hd']: s for s in stars if s['hd']}
sky = json.loads((DATA / 'stelcon' / 'index.json').read_text(encoding='utf-8'))
verts, vindex, figures, dropped = [], {}, [], 0
for con in sky['constellations']:
    chains = []
    for chain in con['lines']:
        run = []
        for hip in chain:
            s = by_hd.get(hip_hd.get(hip, -1))
            if s is None:
                dropped += 1
                if len(run) > 1:
                    chains.append(run)
                run = []
                continue
            if hip not in vindex:
                vindex[hip] = len(verts)
                verts.append(s)
            run.append(vindex[hip])
        if len(run) > 1:
            chains.append(run)
    figures.append((con['id'].split()[-1], con['common_name']['native'], chains))
print(f"constellations: {len(verts)} stars, {dropped} line points without a catalogue star")


def line_change(pos0, pos1):
    out = []
    for _, _, chains in figures:
        for run in chains:
            for i, j in zip(run, run[1:]):
                l0 = math.dist(unit(*pos0[i])[0], unit(*pos0[j])[0])
                l1 = math.dist(unit(*pos1[i])[0], unit(*pos1[j])[0])
                out.append(abs(l1 - l0) / max(l0, 1e-9))
    return float(np.median(out))


now = [(s['ra'], s['dec']) for s in verts]
for key, years in {'zetaoph': 1.78e6, 'geminga': 3.42e5}.items():
    print(f"{key}: median line length change {line_change(now, [at_epoch(s, years)[:2] for s in verts]):.2f}")
con_out = ["// Constellation figures from Stellarium's modern sky culture, by build_star_epochs.py. CON_FIG rows",
           "// are abbreviation, name and chains of vertex indices. CON_VERT rows are J2000 right ascension,",
           "// declination, proper motion (arcsec/yr), distance (pc) and radial velocity (km/s), as in",
           "// STAR_MOTION; the page moves them as it moves the stars (stars.js).",
           "const CON_FIG=" + json.dumps(figures, ensure_ascii=False, separators=(',', ':')) + ";",
           "const CON_VERT=[" + ",".join(f"[{s['ra']:.4f},{s['dec']:.4f},{motion_js(s['pma'], s['pmd'], s['dist'], s['rv'])}]" for s in verts) + "];",]
cpath = path.with_name('constellations.js')
cpath.write_text("\n".join(con_out) + "\n", encoding="utf-8")
print('wrote', cpath)
