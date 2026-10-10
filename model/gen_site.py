import functools, gzip, hashlib, json, shutil, subprocess, sys, urllib.parse
from pathlib import Path

import numpy as np

import epochs as _ep
import gen_report as gr
import skymodel as sm

HERE = Path(__file__).resolve().parent
LIMB = dict(gr.LIMB)
DAY = json.loads((HERE / 'daycycle.json').read_text(encoding='utf-8'))
PROSE = gr.PROSE
order = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','ordovician466','carbon30','kpg66','zetaoph','geminga','volcanic','ozonehole','modern','modernpoll','y2100']
ages = {**gr.ages, 'volcanic': '1815 CE', 'modern': 'Today', 'modernpoll': 'Today'}
short = {'hadean44':'Early Hadean','hadean40':'Late Hadean','archean38':'Early Archean','archean27thin':'Thin haze','archean27':'Thick haze','archean27vthick':'Very thick haze','proterozoic22':'Post-oxidation','snowball07':'Snowball Earth','ordovician466':'Meteor storm','carbon30':'Carboniferous','kpg66':'Impact winter','zetaoph':'ζ Oph supernova','geminga':'Geminga supernova','volcanic':'Volcanic year','modern':'Clean air','modernpoll':'Polluted city','ozonehole':'Ozone hole','y2100':'Year 2100'}
# gen_report adds the epochs that keep today's air (Year 2100 and the supernovae). Their globes
# are today's, so the page is given the key of the modern limb instead of a copy (color.js).
byk = gr.byk
for key in gr.SAME_AIR:
    LIMB.setdefault(key, 'modern')


def epoch(key):
    """The epoch's atmosphere (epochs.py), today's for the epochs it does not list."""
    return _ep.BY_KEY.get(key, _ep.BY_KEY['modern'])


# The air's make-up by atoms (O, N, C) and its O2 share, for the meteors' spectra (meteors.js).
def air_atoms(key):
    gas = epoch(key)['gas']
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
    T, L = epoch(key)['sun']
    return round(L**0.5/(T/5772)**2, 4)


# Called with the key epochs.py files the air under, so the epochs that keep today's share its bands.
@functools.cache
def sun_bands(key):
    e = epoch(key)
    k = sum(p*REFRAC[g] for g, p in e['gas'].items())/(0.78*298+0.21*271+0.01*281)
    atm = _ep.build(e, 0.15)
    band = lambda a: a[:40].reshape(20, 2)     # twenty bands of two samples
    XYZ = np.array([band(atm.S0*c).sum(1) for c in (sm.XB, sm.YB, sm.ZB)])*10.0
    w = [float('%.4g' % v) for b in range(20) for v in sm.M_XYZ2RGB @ XYZ[:, b]]
    lam_w = atm.S0*(sm.XB+sm.YB+sm.ZB)
    t = []
    for a in SUN_APP:
        mu, r0 = np.sin(np.radians(a)), sm.R_E
        smax = -r0*mu+np.sqrt((r0*mu)**2+(r0+120)**2-r0**2)
        s = np.concatenate([[0], np.geomspace(1e-3, smax, 3000)])
        h = np.sqrt(r0**2+s**2+2*r0*s*mu)-r0
        tau = sum(c.tau*np.trapezoid(c.profile(h), s) for c in atm.comps)
        T = band(lam_w*np.exp(-tau)).sum(1)/band(lam_w).sum(1)
        t += [float('%.4g' % v) for v in -np.log(np.maximum(T, 1e-300))]
    return dict(k=round(min(k, 3.0), 3), w=w, t=t)
# The light in the Earth's shadow at the Moon (lunar_eclipse.py): per lateral distance from the
# shadow's axis (Earth radii, 0 to rhoMax), its luminance and linear sRGB over the uneclipsed
# Moon's, and every fourth row's spectrum (log10, 380-780 nm by 10) for the spectrum tooltip.
# Epochs with the same shadow give the key of the one that carries it.
SHADOW = json.loads((HERE / 'eclipse_grid.json').read_text(encoding='utf-8'))['epochs']
def shadow(k):
    s = SHADOW[k]
    return s if isinstance(s, str) else dict(D=s['D'], rhoMax=s['rhoMax'], Y=s['Y'], rgb=s['rgb'], sp=s['sp'][::4])
EP = []
for k in order:
    r = byk[k]
    EP.append(dict(key=k, name=r['name'], sub=r['sub'].replace('tau(550nm)','τ(550 nm)'), age=ages[k], short=short[k], prose=PROSE[k], air=air_atoms(k), sun=sun_bands(epoch(k)['key']), teff=epoch(k)['sun'][0], sunL=epoch(k)['sun'][1], sunR=sun_radius(k), shadow=shadow(k),
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
        dome = np.array(rec[lat]['dome'], float)      # solar zenith angle, view zenith, azimuth, xyY
        sun = np.array(rec[lat]['sun'], float)
        nsza = len(dome)
        assert dome.shape == (nsza, nv, na, 3)
        for q in range(3):
            if q < 2:
                c, cs = np.rint(dome[..., q]*1e4).astype(np.int64), np.rint(sun[:, q]*1e4).astype(np.int64)
            else:
                u, inv = np.unique(np.concatenate([dome[..., 2].ravel(), sun[:, 2]]), return_inverse=True)
                codes = np.array([y_code(float(v)) for v in u], np.int64)[inv]
                c, cs = codes[:-nsza].reshape(dome.shape[:3]), codes[-nsza:]
            c[..., 1:] = (c[..., 1:] - c[..., :-1]) & 0xFFFF
            planes[q].append(np.concatenate([c.reshape(nsza, nv*na), cs[:, None]], 1).ravel())
    planes = [np.concatenate(p) for p in planes]
    assert len(planes[0]) == len(DAY_LATS) * len(DAY['szas']) * (nv * na + 1)
    return np.concatenate(planes).astype('<u2')


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
    'js/sunspots.js',
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
    'js/lunar_eclipse.js',
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
# The report's links carry its hash, so a new build is never served from a browser's cache.
PDF_V = hashlib.sha1((HERE.parent / 'latex' / 'main.pdf').read_bytes()).hexdigest()[:10]
html = html.replace('href="main.pdf"', f'href="main.pdf?v={PDF_V}"')
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
# The report the page links to (main.pdf), from the LaTeX build.
shutil.copy2(HERE.parent / 'latex' / 'main.pdf', SITE / 'main.pdf')
# Compressed copies for nginx's gzip_static, so the server need not compress them on the fly.
for path in [SITE / 'index.html', SITE / 'spectra.bin', *sorted(day_dir.glob('*.bin'))]:
    if path.exists():
        path.with_name(path.name + '.gz').write_bytes(gzip.compress(path.read_bytes(), 9, mtime=0))
