import gzip, hashlib, json, shutil, subprocess, sys, urllib.parse
from pathlib import Path

import numpy as np

import gen_report as gr

HERE = Path(__file__).resolve().parent
LIMB = json.loads((HERE / 'limb_all.json').read_text(encoding='utf-8'))
DAY = json.loads((HERE / 'daycycle.json').read_text(encoding='utf-8'))
PROSE = gr.PROSE
order = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','ordovician466','carbon30','kpg66','zetaoph','geminga','volcanic','ozonehole','modern','modernpoll','y2100']
ages = {'hadean44':'4.4 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27thin':'2.7 Ga','archean27':'2.7 Ga','archean27vthick':'2.7 Ga','proterozoic22':'2.2 Ga','snowball07':'700 Ma','ordovician466':'466 Ma','carbon30':'300 Ma','kpg66':'66 Ma','zetaoph':'1.78 Ma','geminga':'342 ka','volcanic':'1815 CE','modern':'Today','modernpoll':'Today','ozonehole':'1980–2000','y2100':'2100'}
short = {'hadean44':'Early Hadean','hadean40':'Late Hadean','archean38':'Early Archean','archean27thin':'Thin haze','archean27':'Thick haze','archean27vthick':'Very thick haze','proterozoic22':'Post-oxidation','snowball07':'Snowball Earth','ordovician466':'Meteor storm','carbon30':'Carboniferous','kpg66':'Impact winter','zetaoph':'ζ Oph supernova','geminga':'Geminga supernova','volcanic':'Volcanic year','modern':'Clean air','modernpoll':'Polluted city','ozonehole':'Ozone hole','y2100':'Year 2100'}
# gen_report adds the epochs that keep today's air (Year 2100 and the supernovae). Their globes
# are today's, so the page is given the key of the modern limb instead of a copy (color.js).
byk = gr.byk
SAME_AIR = {'y2100'} | {key for key, _, _ in gr.SUPERNOVA_EPOCHS}
for key in SAME_AIR:
    LIMB.setdefault(key, 'modern')
# The air's make-up by atoms (O, N, C) and its O2 share, for the meteors' spectra (meteors.js).
import epochs as _ep
import skymodel as sm
def air_atoms(key):
    gas = _ep.BY_KEY.get(key, _ep.BY_KEY['modern'])['gas']
    n = dict(O=2*gas.get('O2', 0)+2*gas.get('CO2', 0)+gas.get('H2O', 0), N=2*gas.get('N2', 0), C=gas.get('CO2', 0)+gas.get('CH4', 0))
    tot = sum(n.values())
    out = {a: round(v/tot, 4) for a, v in n.items()}
    out['O2'] = round(gas.get('O2', 0)/sum(gas.values()), 4)
    return out
# The Sun's disk near the horizon (sunset.js, shader_sky.js sunDiskAt). The disk is drawn as
# twenty images, one per 20 nm band from 375 nm, each refracted by its own amount and dimmed by
# its own extinction, so the flash at the top of a setting Sun is whatever colour the epoch's air
# lets through last.
#   k  the refraction, as a multiple of today's: the surface refractivity of the epoch's gases at
#      today's temperature (STP values at 550 nm, (n-1)·1e6: N2 298, O2 271, Ar 281, CO2 449,
#      CH4 444, H2O 256), held to 3. Past about 4 a horizontal ray bends faster than the ground
#      curves and is trapped; the 30-bar Hadean is far past that, but its Sun is gone in the
#      Rayleigh scattering well before the horizon.
#   w  each band's light in linear sRGB, above the air.
#   t  each band's optical depth (a band mean, weighted by its light) along a straight ray at the
#      apparent altitudes SUN_APP, twenty bands per altitude, through the mid-latitude air.
SUN_APP = [0, 0.3, 0.7, 1.2, 2, 3, 5, 8, 14, 30.0]
REFRAC = {'N2': 298, 'O2': 271, 'Ar': 281, 'CO2': 449, 'CH4': 444, 'H2O': 256}
def sun_radius(key):
    """The epoch's solar radius over today's, from its effective temperature and luminosity."""
    T, L = _ep.BY_KEY.get(key, _ep.BY_KEY['modern'])['sun']
    return round(L**0.5/(T/5772)**2, 4)


def sun_bands(key):
    e = _ep.BY_KEY.get(key, _ep.BY_KEY['modern'])
    k = sum(p*REFRAC[g] for g, p in e['gas'].items())/(0.78*298+0.21*271+0.01*281)
    atm = _ep.build(e, 0.15)
    w, t = [], []
    lam_w = atm.S0*(sm.XB+sm.YB+sm.ZB)
    for b in range(20):
        sl = slice(2*b, 2*b+2)
        XYZ = np.array([np.sum(atm.S0[sl]*c[sl]) for c in (sm.XB, sm.YB, sm.ZB)])*10.0
        w += [float('%.4g' % v) for v in sm.M_XYZ2RGB @ XYZ]
    for a in SUN_APP:
        mu, r0 = np.sin(np.radians(a)), sm.R_E
        smax = -r0*mu+np.sqrt((r0*mu)**2+(r0+120)**2-r0**2)
        s = np.concatenate([[0], np.geomspace(1e-3, smax, 3000)])
        h = np.sqrt(r0**2+s**2+2*r0*s*mu)-r0
        tau = sum(c.tau*np.trapezoid(c.profile(h), s) for c in atm.comps)
        for b in range(20):
            sl = slice(2*b, 2*b+2)
            T = np.sum(lam_w[sl]*np.exp(-tau[sl]))/np.sum(lam_w[sl])
            t.append(float('%.4g' % (-np.log(max(T, 1e-300)))))
    return dict(k=round(min(k, 3.0), 3), w=w, t=t)
EP = []
for k in order:
    r = byk[k]
    EP.append(dict(key=k, name=r['name'], sub=r['sub'].replace('tau(550nm)','τ(550 nm)'), age=ages[k], short=short[k], prose=PROSE[k], air=air_atoms(k), sun=sun_bands(k), teff=_ep.BY_KEY.get(k, _ep.BY_KEY['modern'])['sun'][0], sunR=sun_radius(k),
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
    'js/sunset.js',
    'js/calendar.js',
    'js/stars_catalog.js',
    'js/stars_epochs.js',
    'js/constellations.js',
    'js/planets.js',
    'js/stars.js',
    'js/milkyway.js',
    'js/aurora.js',
    'js/halo.js',
    'js/debris.js',
    'js/corona.js',
    'js/spectrum.js',
    'js/meteors.js',
    'js/satellites.js',
    'js/comets.js',
    'js/dome_bodies.js',
    'js/moon_surface.js',
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
