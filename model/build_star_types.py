"""The MK spectral type of each star of stars_catalog.js, in its order, from the Yale Bright Star
Catalogue (bsc5.json): spectral class and luminosity class, e.g. "K1.5 III". The page labels
the deep epochs' stand-in stars, which copy today's stars, with the type of the star copied
(stars.js starsFor). Writes site_src/js/star_types.js.
"""
import json
import re
from pathlib import Path

from bsc import catalogue, parse_ra, parse_dec

HERE = Path(__file__).resolve().parent
src = (HERE / 'site_src' / 'js' / 'stars_catalog.js').read_text(encoding='utf-8')
rows = [tuple(map(float, m.groups())) for m in re.finditer(r'^\[([-\d.]+),([-\d.]+),([-\d.]+),', src, re.M)]
bsc = [(parse_ra(s['RA']), parse_dec(s['Dec']), v, s) for v, s in catalogue()]
types = []
for ra, dec, v in rows:
    best = min(bsc, key=lambda b: (b[0] - ra) ** 2 + (b[1] - dec) ** 2 + (b[2] - v) ** 2)
    assert abs(best[0] - ra) < 1e-3 and abs(best[1] - dec) < 1e-3, (ra, dec)
    s = best[3]
    types.append(' '.join(x for x in ((s.get('SpectralCls') or '').strip(), (s.get('LuminosityCls') or '').strip()) if x))
out = HERE / 'site_src' / 'js' / 'star_types.js'
out.write_text('// The MK type of each star of STARS, in its order (build_star_types.py, from the Yale Bright Star\n'
               '// Catalogue): spectral class and luminosity class, "|"-separated.\n'
               f"const STAR_TYPES='{'|'.join(types)}'.split('|');\n", encoding='utf-8')
print(len(types), 'types;', sum(1 for t in types if not t), 'blank;', types[:8])
