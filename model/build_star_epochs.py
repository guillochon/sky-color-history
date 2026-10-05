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

EPOCHS = {'zetaoph': 1.78e6, 'geminga': 3.42e5}   # years before J2000
KMS_YR_TO_PC = 1.0227e-6                           # pc travelled per year at 1 km/s
TEMP = Path.home() / 'AppData' / 'Local' / 'Temp'


# The same parsing as build_stars.py, which runs on import, so it is not imported.
def num(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def common_name(star):
    for note in star.get("Notes") or []:
        if note.get("Category") == "Star names":
            name = re.sub(r"\s+", " ", note["Remark"].split(";")[0].strip())
            name = name.strip().strip('"').strip("'").rstrip(".").strip()
            if name.isupper():
                name = name.title()
            return name.replace("'", "")
    return ""


def bayer(star):
    raw = re.sub(r"^\d+", "", (star.get("Name") or "").strip())
    return re.sub(r"\s+", " ", raw).strip()


def parse_ra(text):
    hours, minutes, seconds = map(float, re.match(r"(\d+)h\s*(\d+)m\s*([\d.]+)s", text).groups())
    return (hours + minutes / 60 + seconds / 3600) * 15


def parse_dec(text):
    sign, degrees, minutes, seconds = re.match(r"([+-])(\d+).\s*(\d+).\s*([\d.]+)", text).groups()
    value = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
    return value if sign == "+" else -value


rows = json.loads((TEMP / 'bsc5.json').read_text(encoding="utf-8"))
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
    # Some "names" in the notes are descriptions ("Called Iota Pup in ..."); fall back to Bayer for those.
    common = common_name(star)
    if len(common.split()) > 3:
        common = ''
    name = (common or bayer(star) or ('HR ' + str(star['HR']))).replace('<', '').replace("'", '')
    stars.append(dict(ra=parse_ra(star['RA']), dec=parse_dec(star['Dec']), v=v, dist=dist, pma=pma, pmd=pmd,
                      rv=rv, bv=num(star.get('B-V')), k=int(round(num(star.get('K'), 10000))), name=name))
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


out = ["// The Bright Star Catalogue moved to each supernova epoch by build_star_epochs.py: straight-line",
       "// motion relative to the Sun, using XHIP (Hipparcos) parallaxes, proper motions, and radial",
       "// velocities, keeping the thousand brightest at that time. Rows are as in stars_catalog.js;",
       "// proper motions are zeroed because the positions are already moved.",
       "const STARS_EPOCH={"]
for key, years in EPOCHS.items():
    moved = [(lambda r: (r[2], r[0], r[1], s, r[3]))(at_epoch(s, years)) for s in stars]
    moved.sort(key=lambda m: m[0])
    close = [f"{m[3]['name']} {m[4]:.1f} pc" for m in moved if m[4] < 5]
    if close:
        print(f"{key}: within 5 pc at the epoch: " + ", ".join(close))
    top = moved[:1000]
    print(f"{key}: brightest " + ", ".join(f"{m[3]['name']} {m[0]:.2f} ({m[4]:.1f} pc)" for m in top[:8])
          + f"; faintest kept {top[-1][0]:.2f}")
    out.append(f"{key}:[")
    for v, ra, dec, s, d in top:
        out.append(f'[{ra:.4f},{dec:.4f},{v:.2f},{s["bv"]:.2f},0,0,{s["k"]},{json.dumps(s["name"], ensure_ascii=False)}],')
    out.append("],")
out.append("};")
path = Path(__file__).with_name('site_src') / 'js' / 'stars_epochs.js'
path.write_text("\n".join(out) + "\n", encoding="utf-8")
print('wrote', path)
