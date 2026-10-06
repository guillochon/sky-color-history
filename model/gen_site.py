import copy, json
from pathlib import Path
HERE = Path(__file__).resolve().parent
D = json.load(open(HERE / 'skycolors.json', encoding='utf-8'))
LIMB = json.load(open(HERE / 'limb_all.json', encoding='utf-8'))
DAY = json.load(open(HERE / 'daycycle.json', encoding='utf-8'))
import io, contextlib
ns = {'__file__': str(HERE / 'gen_report.py')}
with contextlib.redirect_stdout(io.StringIO()):
    exec((HERE / 'gen_report.py').read_text(encoding='utf-8'), ns)
PROSE = ns['PROSE']
order = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','carbon30','kpg66','zetaoph','geminga','volcanic','ozonehole','modern','modernpoll','y2100']
ages = {'hadean44':'4.4 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27thin':'2.7 Ga','archean27':'2.7 Ga','archean27vthick':'2.7 Ga','proterozoic22':'2.2 Ga','snowball07':'700 Ma','carbon30':'300 Ma','kpg66':'66 Ma','zetaoph':'1.78 Ma','geminga':'342 ka','volcanic':'1815 CE','modern':'Today','modernpoll':'Today','ozonehole':'1980–2000','y2100':'2100'}
short = {'hadean44':'Early Hadean','hadean40':'Late Hadean','archean38':'Early Archean','archean27thin':'Thin haze','archean27':'Thick haze','archean27vthick':'Very thick haze','proterozoic22':'Post-oxidation','snowball07':'Snowball Earth','carbon30':'Carboniferous','kpg66':'Impact winter','zetaoph':'ζ Oph supernova','geminga':'Geminga supernova','volcanic':'Volcanic year','modern':'Clean air','modernpoll':'Polluted city','ozonehole':'Ozone hole','y2100':'Year 2100'}
byk = {r['key']: r for r in D}
# Year 2100 is today's sky. The satellites are drawn later, not baked into the color grid.
if 'y2100' not in byk:
    rec = copy.deepcopy(byk['modern'])
    rec.update(key='y2100', name='Year 2100',
               sub="today's clean air, with the filed megaconstellation and the Sunrise orbital datacenters")
    byk['y2100'] = rec
# The supernova epochs keep clean modern air. The explosions themselves are drawn in the site.
for key, name, sub in ns['SUPERNOVA_EPOCHS']:
    if key not in byk:
        rec = copy.deepcopy(byk['modern'])
        rec.update(key=key, name=name, sub=sub)
        byk[key] = rec
    if key not in LIMB:
        LIMB[key] = copy.deepcopy(LIMB['modern'])
        LIMB[key]['name'] = name.split(',')[0]
if 'y2100' not in LIMB:
    LIMB['y2100'] = copy.deepcopy(LIMB['modern'])
    LIMB['y2100']['name'] = 'Year 2100'
EP = []
for k in order:
    r = byk[k]
    EP.append(dict(key=k, name=r['name'], sub=r['sub'].replace('tau(550nm)','τ(550 nm)'), age=ages[k], short=short[k], prose=PROSE[k],
                   lat={L: dict(z=[v['zenith']['x'], v['zenith']['y'], v['zenith']['Y']], h=[v['horizon']['x'], v['horizon']['y'], v['horizon']['Y']],
                                zc=int(v['zenith']['cct']), hc=int(v['horizon']['cct'])) for L, v in r['lat'].items()},
                   limb=LIMB[k]))
YREF = byk['modern']['lat']['Equator']['zenith']['Y']
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
    'js/planets.js',
    'js/stars.js',
    'js/milkyway.js',
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
    'js/vr_hud.js',
    'js/vr_input.js',
    'js/moments.js',
    'js/boot.js',
    'document/tail.html',
]

def page_source():
    src = HERE / 'site_src'
    return ''.join((src / rel).read_text(encoding='utf-8') for rel in PARTS)

html = page_source()
html = html.replace('__EP__', json.dumps(EP, separators=(',',':'))).replace('__DAY__', json.dumps(DAY, separators=(',',':'))).replace('__YREF__', repr(YREF)).replace('EPOCH_MAX', str(len(order)-1)).replace('MODERN_IDX', str(order.index('modern')))
open(HERE.parent / 'site' / 'index.html', 'w', encoding='utf-8').write(html)
print(len(html)/1e6, 'MB')
