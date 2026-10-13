import base64, functools, gzip, hashlib, json, shutil, subprocess, sys, urllib.parse
from pathlib import Path

import numpy as np

import airgrid
import airtime
import epochs as _ep
import gen_report as gr
import skymodel as sm

HERE = Path(__file__).resolve().parent
LIMB = dict(gr.LIMB)
DAY = json.loads((HERE / 'daycycle.json').read_text(encoding='utf-8'))
PROSE = gr.PROSE
# The page's epochs in time order. The Neoarchean's are a clear background (2.7 Ga) and two of the
# haze episodes that interrupt it, dated where the epoch selector puts them; the K-Pg impact winter
# and the volcanic year interrupt the Late Cretaceous and today's skies, and the two snowball
# glaciations the Cryogenian's (epoch_time.js EPOCH_EVENTS).
# The very thick haze stays in the report (gen_report.py) but not on the page.
order = ['protoearth455','hadean45','hadean40','archean38','archean27clear','archean27thin','archean27','proterozoic22','snowball07','cryogenian65','ordovician466','carbon30','cretaceous66','kpg66','zetaoph','geminga','volcanic','ozonehole','modern','modernpoll','y2100']
ages = {**gr.ages, 'archean27clear': '2.7 Ga', 'archean27thin': '2.58 Ga', 'archean27': '2.52 Ga', 'cryogenian65': '650 Ma', 'cretaceous66': '66 Ma',
        'volcanic': '1816 CE', 'modern': 'Today', 'modernpoll': 'Today'}
short = {'protoearth455':'Proto-Earth','hadean45':'Early Hadean','hadean40':'Late Hadean','archean38':'Early Archean','archean27clear':'Clear Neoarchean','archean27thin':'Thin haze','archean27':'Thick haze','archean27vthick':'Very thick haze','proterozoic22':'Post-oxidation','snowball07':'Snowball Earth','cryogenian65':'Cryogenian','ordovician466':'Meteor storm','carbon30':'Carboniferous','cretaceous66':'Late Cretaceous','kpg66':'Impact winter','zetaoph':'ζ Oph supernova','geminga':'Geminga supernova','volcanic':'Volcanic year','modern':'Clean air','modernpoll':'Polluted city','ozonehole':'Ozone hole','y2100':'Year 2100'}
# gen_report adds the epochs that keep today's air (Year 2100 and the supernovae). Their globes
# are today's, so the page is given the key of the modern limb instead of a copy (color.js).
byk = gr.byk
for key in gr.SAME_AIR:
    LIMB.setdefault(key, 'modern')


def epoch(key):
    """The epoch's atmosphere (epochs.py), today's for the epochs it does not list."""
    return _ep.BY_KEY.get(key, _ep.BY_KEY['modern'])


# The air's make-up by atoms, for the meteors' spectra (airgrid.air_atoms).
def air_atoms(key):
    return airgrid.air_atoms(epoch(key)['gas'])
def sun_radius(key):
    """The epoch's solar radius over today's, from its effective temperature and luminosity."""
    T, L = epoch(key)['sun']
    return round(L**0.5/(T/5772)**2, 4)
# The Sun's disk near the horizon (sunset.js, shader_sky.js sunDiskAt): airgrid.sun_bands.
@functools.cache
def sun_bands(key):
    e = epoch(key)
    return airgrid.sun_bands(e['gas'], _ep.build(e, 0.15))


# The light in the Earth's shadow at the Moon (lunar_eclipse.py): per lateral distance from the
# shadow's axis (Earth radii, 0 to rhoMax), its luminance and linear sRGB over the uneclipsed
# Moon's, and every fourth row's spectrum (log10, 380-780 nm by 10) for the spectrum tooltip.
# Epochs with the same shadow give the key of the one that carries it.
SHADOW = json.loads((HERE / 'eclipse_grid.json').read_text(encoding='utf-8'))['epochs']
def shadow(k):
    s = SHADOW[k]
    return s if isinstance(s, str) else dict(D=s['D'], rhoMax=s['rhoMax'], Y=s['Y'], rgb=s['rgb'], sp=s['sp'][::4])
# The crepuscular rays (shafts.py, shader_clouds.js shaftShade): the air's parts, and the share of
# each direction's light that a cloud's shadow can take away as base64 bytes. The grid is in SHAFT.
SHAFTS = json.loads((HERE / 'shafts.json').read_text(encoding='utf-8'))
SHAFT = {k: SHAFTS[k] for k in ('zmax', 'nv', 'na', 'ns', 'sunMin', 'sunMax')}
def shaft(key):
    s = SHAFTS['epochs'][key]
    return dict(comps=s['comps'], share=base64.b64encode(bytes(s['share'])).decode())
EP = []
for k in order:
    r = byk[k]
    EP.append(dict(key=k, name=r['name'], sub=r['sub'].replace('tau(550nm)','τ(550 nm)'), age=ages[k], short=short[k], prose=PROSE[k], air=air_atoms(k), sun=sun_bands(epoch(k)['key']), own=epoch(k)['key']==k, teff=epoch(k)['sun'][0], sunL=epoch(k)['sun'][1], sunR=sun_radius(k), shadow=shadow(k), shaft=shaft(epoch(k)['key']) if epoch(k)['key']==k else epoch(k)['key'],
                   lat={L: dict(z=[v['zenith']['x'], v['zenith']['y'], v['zenith']['Y']], h=[v['horizon']['x'], v['horizon']['y'], v['horizon']['Y']],
                                zc=int(v['zenith']['cct']), hc=int(v['horizon']['cct'])) for L, v in r['lat'].items()},
                   limb=LIMB[k]))
YREF = byk['modern']['lat']['Equator']['zenith']['Y']
SITE = HERE.parent / 'site'
# airtime.py places the epochs where the page does.
def _age_year(a):
    n, u = a.split()
    return round(2000 - float(n)*{'Ga': 1e9, 'Ma': 1e6, 'ka': 1e3}[u])
for _k, _t in airtime.ANCHOR.items():
    if _k in ages and ages[_k][-2:] in ('Ga', 'Ma', 'ka'):
        assert _age_year(ages[_k]) == _t, (_k, ages[_k], _t)

# The day-cycle colors (daycycle.json), one file per epoch in site/day, fetched when the
# epoch is first shown. Each value is a uint16, and decodes to exactly the number in the JSON:
#   x, y   round(1e4 * value)
#   Y      0 for zero, else 1 + (e - Y_EMIN)*900 + (m - 100) for Y = m·10^e, 100 <= m <= 999
# The file is three planes (x codes, y codes, Y codes), each in the order surface, solar
# zenith angle, then the dome (view zenith major, azimuth minor) and the Sun. Along each
# dome row the codes after the first are differences from the previous azimuth (mod 2^16).
Y_EMIN = airgrid.Y_EMIN


def day_codes(rec):
    return airgrid.day_codes(rec, DAY_LATS, len(DAY['szas']), len(DAY['vz']), len(DAY['az']))


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
# The air through time (airgrid.py, air_time.js): the airs along the timeline the page blends, by
# year for the background, by level for each event instance, and the polluted city's.
AIR_NODES = json.loads((HERE / 'air_nodes.json').read_text(encoding='utf-8'))
assert AIR_NODES['stamp'] == airgrid.STAMP and AIR_NODES['lats'] == DAY_LATS, 'air_nodes.json is stale: run airgrid.py'
AIR = {k: AIR_NODES[k] for k in ('bg', 'ev', 'sc')}
for _nid in {n for _, n in AIR['bg']} | {n for e in AIR['ev'] for _, n in e['lv']} | set(AIR['sc'].values()):
    assert (SITE / 'air' / f'{_nid}.bin').exists() and (SITE / 'air' / f'{_nid}.sp.bin').exists(), _nid
# The nebulae and galaxies (dso.py): their tiles in site/dso.webp, fetched once the page is up,
# and where each was in each epoch.
DSO = json.loads((HERE / 'dso.json').read_text(encoding='utf-8'))
DSO_IMG = f"dso.webp?v={hashlib.sha1((SITE / 'dso.webp').read_bytes()).hexdigest()[:10]}"
# Each one's full-size tile (dso/<id>.webp), fetched when the walk-around view zooms in on it.
DSO_HI = {o['id']: f"dso/{o['id'].replace(' ', '')}.webp?v={hashlib.sha1((SITE / 'dso' / (o['id'].replace(' ', '') + '.webp')).read_bytes()).hexdigest()[:10]}" for o in DSO['objects'] if (SITE / 'dso' / (o['id'].replace(' ', '') + '.webp')).exists()}
# The Milky Way in each epoch (mw_evolution.py), for milkyway.js.
MW_EPOCH = json.loads((HERE / 'mw_epochs.json').read_text(encoding='utf-8'))
# The rocky bodies' surface maps (surfaces.py), one file each, fetched when the walk-around view zooms in on one.
SURF_FILES = {p.stem.capitalize(): f"surf/{p.name}?v={hashlib.sha1(p.read_bytes()).hexdigest()[:10]}" for p in sorted((SITE / 'surf').glob('*.webp'))}
# The Moon's whole globe for each epoch (moon_maps.py): site/moon/<face>.webp, fetched for the epoch shown.
MOON_MAPS = {p.stem: f"moon/{p.name}?v={hashlib.sha1(p.read_bytes()).hexdigest()[:10]}" for p in sorted((SITE / 'moon').glob('*.webp'))}
# Mars's and Mercury's heights (relief_maps.py), fetched with their surface maps.
RELIEF_FILES = {p.stem.capitalize(): f"relief/{p.name}?v={hashlib.sha1(p.read_bytes()).hexdigest()[:10]}" for p in sorted((SITE / 'relief').glob('*.webp'))}
# The interactive page, in the order the browser receives it.
# shader_terrain.js is a JavaScript template string. It has to stay ahead of
# shader_hit.js, which interpolates it.
PARTS = [
    'document/head.html',
    'document/style.css',
    'document/body.html',
    'js/color.js',
    'js/vr_perf.js',
    'js/globe.js',
    'js/day.js',
    'js/moon_history.js',
    'js/moon.js',
    'js/sunset.js',
    'js/calendar.js',
    'js/epoch_time.js',
    'js/air_time.js',
    'js/sunspots.js',
    'js/stars_catalog.js',
    'js/star_types.js',
    'js/stars_epochs.js',
    'js/constellations.js',
    'js/planets.js',
    'js/ring_profile.js',
    'js/rings.js',
    'js/stars.js',
    'js/milkyway.js',
    'js/dso.js',
    'js/surfaces.js',
    'js/aurora.js',
    'js/halo.js',
    'js/debris.js',
    'js/corona.js',
    'js/spectrum.js',
    'js/meteors.js',
    'js/showers.js',
    'js/contrails.js',
    'js/satellites.js',
    'js/comets.js',
    'js/dome_bodies.js',
    'js/lunar_eclipse.js',
    'js/moon_surface.js',
    'js/scenery.js',
    'js/shader_terrain.js',
    'js/shader_hit.js',
    'js/shader_bodies.js',
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
    'js/find.js',
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
# The report's links carry its hash, so a new build is never served from a browser's cache.
PDF_V = hashlib.sha1((HERE.parent / 'latex' / 'main.pdf').read_bytes()).hexdigest()[:10]
html = html.replace('href="main.pdf"', f'href="main.pdf?v={PDF_V}"')
html = html.replace('__EP__', json.dumps(EP, separators=(',',':'))).replace('__DAY__', json.dumps(DAY_META, separators=(',',':'))).replace('__SHAFT__', json.dumps(SHAFT)).replace('__AIR__', json.dumps(AIR, separators=(',', ':')))
html = html.replace('__SURF_FILES__', json.dumps(SURF_FILES)).replace('__MOON_MAPS__', json.dumps(MOON_MAPS)).replace('__RELIEF_FILES__', json.dumps(RELIEF_FILES)).replace('__DSO_IMG__', DSO_IMG).replace('__DSO_HI__', json.dumps(DSO_HI)).replace('__DSO__', json.dumps(DSO, separators=(',', ':'), ensure_ascii=False)).replace('__MW_EPOCH__', json.dumps(MW_EPOCH, separators=(',', ':')))


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
# The report the page links to (main.pdf), from the LaTeX build.
shutil.copy2(HERE.parent / 'latex' / 'main.pdf', SITE / 'main.pdf')
# Compressed copies for nginx's gzip_static, so the server need not compress them on the fly.
for path in [SITE / 'index.html', SITE / 'spectra.bin', *sorted(day_dir.glob('*.bin')), *sorted((SITE / 'air').glob('*.bin'))]:
    if path.exists():
        path.with_name(path.name + '.gz').write_bytes(gzip.compress(path.read_bytes(), 9, mtime=0))
