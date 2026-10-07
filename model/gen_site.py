import json
from pathlib import Path

import gen_report as gr

HERE = Path(__file__).resolve().parent
LIMB = json.loads((HERE / 'limb_all.json').read_text(encoding='utf-8'))
DAY = json.loads((HERE / 'daycycle.json').read_text(encoding='utf-8'))
PROSE = gr.PROSE
order = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','carbon30','kpg66','zetaoph','geminga','volcanic','ozonehole','modern','modernpoll','y2100']
ages = {'hadean44':'4.4 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27thin':'2.7 Ga','archean27':'2.7 Ga','archean27vthick':'2.7 Ga','proterozoic22':'2.2 Ga','snowball07':'700 Ma','carbon30':'300 Ma','kpg66':'66 Ma','zetaoph':'1.78 Ma','geminga':'342 ka','volcanic':'1815 CE','modern':'Today','modernpoll':'Today','ozonehole':'1980–2000','y2100':'2100'}
short = {'hadean44':'Early Hadean','hadean40':'Late Hadean','archean38':'Early Archean','archean27thin':'Thin haze','archean27':'Thick haze','archean27vthick':'Very thick haze','proterozoic22':'Post-oxidation','snowball07':'Snowball Earth','carbon30':'Carboniferous','kpg66':'Impact winter','zetaoph':'ζ Oph supernova','geminga':'Geminga supernova','volcanic':'Volcanic year','modern':'Clean air','modernpoll':'Polluted city','ozonehole':'Ozone hole','y2100':'Year 2100'}
# gen_report adds the epochs that keep today's air (Year 2100 and the supernovae).
byk = gr.byk
for key, name, _ in gr.SUPERNOVA_EPOCHS:
    if key not in LIMB:
        LIMB[key] = dict(LIMB['modern'], name=name.split(',')[0])
if 'y2100' not in LIMB:
    LIMB['y2100'] = dict(LIMB['modern'], name='Year 2100')
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
html = (page_source().replace('__YREF__', repr(YREF)).replace('EPOCH_MAX', str(len(order)-1))
        .replace('MODERN_IDX', str(order.index('modern'))))
html = html.replace('__EP__', json.dumps(EP, separators=(',',':'))).replace('__DAY__', json.dumps(DAY, separators=(',',':')))
(HERE.parent / 'site' / 'index.html').write_text(html, encoding='utf-8')
print(len(html)/1e6, 'MB')
