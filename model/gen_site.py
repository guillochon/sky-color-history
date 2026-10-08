import gzip, hashlib, json, shutil, subprocess, sys, urllib.parse
from pathlib import Path

import numpy as np

import gen_report as gr

HERE = Path(__file__).resolve().parent
LIMB = json.loads((HERE / 'limb_all.json').read_text(encoding='utf-8'))
DAY = json.loads((HERE / 'daycycle.json').read_text(encoding='utf-8'))
PROSE = gr.PROSE
order = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','carbon30','kpg66','zetaoph','geminga','volcanic','ozonehole','modern','modernpoll','y2100']
ages = {'hadean44':'4.4 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27thin':'2.7 Ga','archean27':'2.7 Ga','archean27vthick':'2.7 Ga','proterozoic22':'2.2 Ga','snowball07':'700 Ma','carbon30':'300 Ma','kpg66':'66 Ma','zetaoph':'1.78 Ma','geminga':'342 ka','volcanic':'1815 CE','modern':'Today','modernpoll':'Today','ozonehole':'1980–2000','y2100':'2100'}
short = {'hadean44':'Early Hadean','hadean40':'Late Hadean','archean38':'Early Archean','archean27thin':'Thin haze','archean27':'Thick haze','archean27vthick':'Very thick haze','proterozoic22':'Post-oxidation','snowball07':'Snowball Earth','carbon30':'Carboniferous','kpg66':'Impact winter','zetaoph':'ζ Oph supernova','geminga':'Geminga supernova','volcanic':'Volcanic year','modern':'Clean air','modernpoll':'Polluted city','ozonehole':'Ozone hole','y2100':'Year 2100'}
# gen_report adds the epochs that keep today's air (Year 2100 and the supernovae). Their globes
# are today's, so the page is given the key of the modern limb instead of a copy (color.js).
byk = gr.byk
SAME_AIR = {'y2100'} | {key for key, _, _ in gr.SUPERNOVA_EPOCHS}
for key in SAME_AIR:
    LIMB.setdefault(key, 'modern')
EP = []
for k in order:
    r = byk[k]
    EP.append(dict(key=k, name=r['name'], sub=r['sub'].replace('tau(550nm)','τ(550 nm)'), age=ages[k], short=short[k], prose=PROSE[k],
                   lat={L: dict(z=[v['zenith']['x'], v['zenith']['y'], v['zenith']['Y']], h=[v['horizon']['x'], v['horizon']['y'], v['horizon']['Y']],
                                zc=int(v['zenith']['cct']), hc=int(v['horizon']['cct'])) for L, v in r['lat'].items()},
                   limb=LIMB[k]))
YREF = byk['modern']['lat']['Equator']['zenith']['Y']
SITE = HERE.parent / 'site'

# The day-cycle colors (daycycle.json), one file per epoch in site/day, fetched when the
# epoch is first shown. Each value is a uint16, and decodes to exactly the number in the JSON:
#   x, y   round(1e4 * value)
#   Y      0 for zero, else 1 + (e - Y_EMIN)*900 + (m - 100) for Y = m·10^e, 100 <= m <= 999
# The file is three planes (x codes, y codes, Y codes), each in the order surface, solar
# zenith angle, then the dome (view zenith major, azimuth minor) and the Sun. Along each
# dome row the codes after the first are differences from the previous azimuth (mod 2^16).
Y_EMIN = -40


def y_code(Y):
    if Y == 0:
        return 0
    mant, exp = ('%.2e' % Y).split('e')
    m, e = int(mant.replace('.', '')), int(exp) - 2
    assert float(f'{m}e{e}') == Y and 100 <= m <= 999 and e >= Y_EMIN, Y
    return 1 + (e - Y_EMIN) * 900 + (m - 100)


def day_codes(rec):
    """The three planes of one epoch, as uint16 arrays."""
    nv, na = len(DAY['vz']), len(DAY['az'])
    planes = [[], [], []]
    for lat in DAY_LATS:
        for dome, sun in zip(rec[lat]['dome'], rec[lat]['sun']):
            for row in dome:
                for q in range(3):
                    c = [round(v[q] * 1e4) if q < 2 else y_code(v[q]) for v in row]
                    planes[q] += [c[0]] + [(c[i] - c[i-1]) & 0xFFFF for i in range(1, na)]
            for q in range(3):
                planes[q].append(round(sun[q] * 1e4) if q < 2 else y_code(sun[q]))
    assert len(planes[0]) == len(DAY_LATS) * len(DAY['szas']) * (nv * na + 1)
    return np.array(planes[0] + planes[1] + planes[2], '<u2')


DAY_LATS = list(DAY['epochs']['modern'])
day_dir = SITE / 'day'
day_dir.mkdir(exist_ok=True)
DAY_FILES = {}
for key, rec in DAY['epochs'].items():
    data = day_codes(rec).tobytes()
    (day_dir / f'{key}.bin').write_bytes(data)
    # The hash in the address lets browsers keep a file until it changes.
    DAY_FILES[key] = f'day/{key}.bin?v={hashlib.sha1(data).hexdigest()[:10]}'
for key in order:
    if key not in DAY_FILES:     # the epochs that keep today's air
        DAY_FILES[key] = DAY_FILES['modern']
DAY_META = dict(szas=DAY['szas'], vz=DAY['vz'], az=DAY['az'], lats=DAY_LATS, yEmin=Y_EMIN, files=DAY_FILES)
# The interactive page, in the order the browser receives it.
# shader_terrain.js is a JavaScript template string. It has to stay ahead of
# shader_hit.js, which interpolates it.
PARTS = [
    'document/head.html',
    'document/style.css',
    'document/body.html',
    'js/color.js',
    'js/globe.js',
    'js/day.js',
    'js/moon.js',
    'js/calendar.js',
    'js/stars_catalog.js',
    'js/stars_epochs.js',
    'js/constellations.js',
    'js/planets.js',
    'js/stars.js',
    'js/milkyway.js',
    'js/aurora.js',
    'js/spectrum.js',
    'js/satellites.js',
    'js/dome_bodies.js',
    'js/scenery.js',
    'js/shader_terrain.js',
    'js/shader_hit.js',
    'js/shader_sky.js',
    'js/shader_clouds.js',
    'js/shader_present.js',
    'js/shader_temporal.js',
    'js/shader_noise.js',
    'js/clouds.js',
    'js/vr_init.js',
    'js/vr_paint.js',
    'js/roads.js',
    'js/vr_hud.js',
    'js/vr_input.js',
    'js/moments.js',
    'js/boot.js',
    'document/tail.html',
]

def page_source():
    src = HERE / 'site_src'
    return ''.join((src / rel).read_text(encoding='utf-8') for rel in PARTS)

# Fill the code tokens before the data goes in, so no prose or number can match one.
html = (page_source().replace('__YREF__', repr(YREF)).replace('__DAY_MODERN__', DAY_FILES['modern']).replace('EPOCH_MAX', str(len(order)-1))
        .replace('MODERN_IDX', str(order.index('modern'))))
# The favicon goes in as a data URI, so the page stays one file.
# Its quotes become single ones, as it sits inside a double-quoted attribute.
favicon = ' '.join((HERE / 'site_src' / 'document' / 'favicon.svg').read_text(encoding='utf-8').split()).replace('"', "'")
html = html.replace('__FAVICON__', 'data:image/svg+xml,' + urllib.parse.quote(favicon, safe=" =:/,.-'"))
html = html.replace('__EP__', json.dumps(EP, separators=(',',':'))).replace('__DAY__', json.dumps(DAY_META, separators=(',',':')))


def minify(html):
    """The page's script through terser (npx), if Node is installed; otherwise as it is."""
    npx = shutil.which('npx.cmd') or shutil.which('npx')
    a = html.rindex('<script>') + len('<script>')
    b = html.index('</script>', a)
    if not npx:
        print('npx not found: the script is not minified', file=sys.stderr)
        return html
    out = subprocess.run([npx, '--yes', 'terser@5', '--compress', '--mangle', '--ecma', '2020'],
                         input=html[a:b], capture_output=True, text=True, encoding='utf-8')
    if out.returncode != 0:
        print('terser failed, the script is not minified:\n' + out.stderr, file=sys.stderr)
        return html
    return html[:a] + out.stdout + html[b:]


html = minify(html)
(SITE / 'index.html').write_text(html, encoding='utf-8')
print(len(html)/1e6, 'MB')
# Compressed copies for nginx's gzip_static, so the server need not compress them on the fly.
for path in [SITE / 'index.html', SITE / 'spectra.bin', *sorted(day_dir.glob('*.bin'))]:
    if path.exists():
        path.with_name(path.name + '.gz').write_bytes(gzip.compress(path.read_bytes(), 9, mtime=0))
