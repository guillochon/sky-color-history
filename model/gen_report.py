import base64, copy, json, numpy as np
from pathlib import Path
from skymodel import XYZ_to_srgb, hexcol

ROOT = Path(__file__).resolve().parent
D = json.load(open(ROOT / 'skycolors.json', encoding='utf-8'))
byk = {r['key']: r for r in D}
# Year 2100 and the supernova epochs keep today's clean air. The satellites and the explosions
# are drawn in the site.
SAME_AIR_EPOCHS = [
    ('y2100', 'Year 2100', "today's clean air, with the filed megaconstellation and the Sunrise orbital datacenters"),
    ('zetaoph', 'ζ Ophiuchi supernova, ~1.78 Ma', 'clean Early Pleistocene air, under a magnitude −11.6 supernova in Scorpius'),
    ('geminga', 'Geminga supernova, ~342 ka', 'clean Middle Pleistocene air, under a magnitude −11 supernova in Orion'),
]
for key, name, sub in SAME_AIR_EPOCHS:
    rec = copy.deepcopy(byk['modern'])
    rec.update(key=key, name=name, sub=sub, note='Same atmosphere as the modern clean sky.')
    byk[key] = rec
# Their figures, globes and day cycles are today's.
SAME_AIR = {key for key, _, _ in SAME_AIR_EPOCHS}

def xyY(c, Y=None):
    Y = c['Y'] if Y is None else Y
    x, y = c['x'], c['y']
    if y <= 0 or Y <= 0: return np.array([0., 0., 0.])
    return np.array([x*Y/y, Y, (1-x-y)*Y/y])

def rgb(c, Yref, floor=0.0):
    """Color with global exposure so dimmer skies render dimmer (gamma-compressed)."""
    XYZ = xyY(c)
    if XYZ[1] <= 1e-7*Yref: return np.array([0.02, 0.024, 0.04])
    # compress dynamic range: brightness ~ (Y/Yref)^0.4, capped
    target = max(floor, min(0.92, 0.85*(XYZ[1]/Yref)**0.4))
    return XYZ_to_srgb(XYZ, target/XYZ[1])

def hx(c, Yref, floor=0.0):
    return hexcol(rgb(c, Yref, floor))

MOD = byk['modern']
Yz = MOD['lat']['Equator']['zenith']['Y']
Yss = MOD['sunset']['solar_horizon']['Y']
Ytw = MOD['twilight']['above_sun']['Y']

def dome(lat, label):
    z = hx(lat['zenith'], Yz); h = hx(lat['horizon'], Yz)
    zt = xyY(lat['zenith']); ht = xyY(lat['horizon'])
    mid = hexcol(XYZ_to_srgb(0.5*(zt+ht), min(0.92, 0.85*(0.5*(zt[1]+ht[1])/Yz)**0.4)/(0.5*(zt[1]+ht[1]))))
    sunrel = lat['sunY']/MOD['lat']['Equator']['sunY']
    sun = ''
    if sunrel > 3e-4:
        op = min(1, 0.35 + 0.65*(np.log10(sunrel)+3.5)/3.5)
        sz = 8 + 6*min(1, op)
        # sun placed at elevation: sz angle -> vertical position
        top = 8 + (lat['sz']/90)*70
        sun = f'<i class="sun" style="background:{lat["sun"]["hex"]};opacity:{op:.2f};width:{sz}px;height:{sz}px;top:{top:.0f}%;box-shadow:0 0 {sz*1.5:.0f}px {sz*0.4:.0f}px {lat["sun"]["hex"]}"></i>'
    else:
        sun = '<span class="nosun">sun not visible</span>'
    return f'''<figure class="dome"><div class="sky" style="background:linear-gradient(to bottom,{z} 0%,{mid} 55%,{h} 100%)">{sun}</div>
<figcaption>{label}<small>zenith {int(lat['zenith']['cct']):,} K · horizon {int(lat['horizon']['cct']):,} K</small></figcaption></figure>'''

def strip(s, keys, labels, Yref, title):
    cells = ''.join(f'<div class="cell" style="background:{hx(s[k], Yref, 0.06)}"><b>{l}</b></div>' for k, l in zip(keys, labels))
    return f'<div class="strip"><span class="striplabel">{title}</span><div class="cells">{cells}</div></div>'

PROSE = {
'hadean44': "A ~30-bar CO₂ atmosphere has a Rayleigh optical depth near 5 at 550 nm and about 18 in the violet, so blue light is scattered back to space many times before it reaches the ground. What arrives is a diffuse, shadowless, peach-white glow of ~3,300 K, nearly identical from zenith to horizon, under a young Sun that is only 70% as bright. The Sun itself is a dim ember at the equator and vanishes entirely at mid and high latitudes: this is a Venus-like sky. Sunset is a brief, deep-orange dimming of the whole dome rather than an event at the horizon.",
'hadean40': "Once most of the CO₂ has gone into carbonate, Rayleigh scattering falls to roughly twice the modern value. The sky turns pale blue at the zenith but conspicuously whiter than today (7,000–10,500 K versus 9,000–15,000 K), because the extra scattering fills the dome with multiply-scattered white light. Horizons are milky. The setting Sun is deep red and the twilight zenith, with no ozone yet, is cream rather than blue.",
'archean38': "With CO₂ down to ~0.1 bar, noon skies are close to modern blue, only slightly whiter. The unmistakable difference is at dusk. The blue of the modern twilight zenith is produced by ozone absorbing yellow-orange light (the Chappuis band) along the long grazing path; with no free O₂ there is no ozone, so the Archean twilight zenith is a pale yellow-cream, and the whole sky fades from blue to beige to orange as the Sun sets. Sunsets themselves are much like today's, slightly redder from the extra CO₂ and dimmer Sun.",
'archean27thin': "An intermittent organic haze at optical depth ~0.15 pushes the zenith toward a pastel, milk-blue (7,000–8,500 K) and lays a warm cast on the horizon; at the poles, where sunlight crosses the haze obliquely, the horizon turns visibly cream. Twilight is orange all the way to the zenith.",
'archean27': "This is the 'Pale Orange Dot' seen from below. At optical depth ~0.6 the haze absorbs blue and scatters forward, so the entire dome is a warm cream to pale tan (~5,300 K at the equator, ~4,700 K at the poles) with almost no zenith-to-horizon gradient: the sky looks like a bright overcast made of orange-tinted glass. The Sun is a soft, defined disk (haze scatters strongly forward) at 4,100 K. Sunsets are deep and long: the solar horizon reaches vermilion, the sky 15° above the Sun is amber, and the antisolar sky is peach rather than pink.",
'archean27vthick': "At the upper end of plausible haze (τ≈1.5) the sky is a uniform saturated apricot (3,300–4,200 K), fully Titan-like, and the polar Sun is reduced to an orange smear. Anything below this haze would have had roughly 20–30% of the surface sunlight of a clear sky.",
'proterozoic22': "After the Great Oxidation Event, about 1% of today's O₂ builds an ozone column of 66 DU, the Cooke et al. (2021) global mean for that oxygen level: about a fifth of a modern mid-latitude column, not the half that older estimates gave. Noon skies are already modern blue. Twilight is where the thin column shows. With the Sun 4° below the horizon the zenith leaves the cream of an ozone-free dusk (~6,000 K) and becomes a pale blue-gray (~7,100 K). It is not yet the deep blue of a 300 DU twilight (~12,500 K). That saturated blue dusk is in place once the column is near modern, as in the snowball sky at 169 DU. (The pink antisolar arch needs no ozone: it is a Rayleigh effect and shows up faintly even in the Hadean model.)",
'snowball07': "A frozen planet has a dry, exceptionally clean atmosphere and a surface albedo near 0.75. The result is the bluest sky in Earth's history: 9,000 K at the equatorial zenith and over 20,000 K over polar ice, with horizons that stay distinctly blue instead of whitening, because the sunlit ice floods the sky from below with blue-white light. Sunsets are golden and comparatively pale; there is little aerosol to redden them.",
'ordovician466': "About 466 million years ago the L-chondrite parent body, an asteroid about 150 km across, was shattered in the main belt, and its fragments still make up almost a third of the meteorites that fall today. For more than two million years the fine dust reaching Earth rose a thousandfold or more, and decimetre stones about a hundredfold: fossil meteorites lie scattered through Swedish limestones of that age, and the dust may have helped tip the climate toward the Late Ordovician ice age (Schmitz et al. 2019). The meteors here come a hundred times as often as today, most of them slow and yellow with sodium, and the zodiacal light is taken as thirty times today's, a glowing band along the ecliptic. The ring is speculation: all 21 known Ordovician craters lie within 30° of the palaeo-equator, which led Tomkins, Martin & Cawood (2024) to propose that a large fragment broke up inside the Roche limit into a ring that lasted tens of millions of years; it is drawn as a faint, sunlit band that Earth's shadow cuts at night, with its debris falling at the equator as slow fireballs from the west. The air itself is close to today's: about 17% oxygen, 2,500 ppm CO₂, an ozone layer within a few percent of the modern one, under a Sun 4% fainter, so the day sky is today's blue.",
'carbon30': "Thirty-plus percent O₂ raises the total pressure and Rayleigh scattering by ~10%, so skies are marginally brighter and horizons a touch whiter than today; the effect is subtle. Frequent wildfire smoke in the high-O₂ world would have produced red suns and brown-orange horizons far more often than in the modern era.",
'kpg66': "Months after the Chicxulub impact, a global stratospheric layer of soot and sulfate turns the sky into a dim, uniform amber-beige (4,200–5,100 K) with no blue at all, about one-fifth as bright as a clear sky at the equator and 20× dimmer at high latitudes. The Sun is a pale orange disk at low latitudes and effectively gone near the poles. Sunsets do not happen as color events: the whole dome simply fades to dark brown, and the twilight sky is gray.",
'zetaoph': "About 1.78 million years ago a star of 16 to 18 solar masses exploded in a binary in the Scorpius-Centaurus association. The explosion unbound its companion, which is now the runaway O star ζ Ophiuchi, and left a neutron star that is now the pulsar PSR B1706-16; tracing both back puts the explosion 1.78 ± 0.21 Myr ago at 107 ± 4 pc (Neuhäuser et al. 2019). Its iron-60 may be part of the 1.5 to 3.2 Myr old ⁶⁰Fe found in deep-sea crusts and on the Moon. A typical Type II-P supernova (Richardson et al. 2014) at that distance peaks near −11.6, about twice as bright as Geminga's, or −12.3 if the binary stripped the star and made it a Type Ib. The paper's abstract gives no sky position, so the star is drawn where a straight-line trace of ζ Oph's present motion puts it, near RA 16h10m, Dec −21°. The stars are moved back along their measured space motions too; Antares has since travelled about 12°, and in the sky of the time the supernova sat about 12° west of it. That trace lands at 130 to 140 pc rather than 107, so the position is approximate. From mid-northern latitudes it stays low in the south. The air is clean Early Pleistocene air.",
'geminga': "About 342,000 years ago, going by the spin-down age of the pulsar it left behind (Salvati and Sacco 2008), a star of at most 15 solar masses exploded 90 to 240 pc away, in the direction of Orion (Pellizza et al. 2005). Type II-P supernovae peak near absolute magnitude −16.75 (Richardson et al. 2014), so from the middle of that range, 147 pc, it reached about −11: a fifth of the full Moon's light, all from a point. The −13 often quoted needs both the near end of the distance range and an unusually bright explosion. It burned in the daytime sky as a dazzling star, cast sharp shadows at night, and held near peak for the three months of its plateau. The air is clean Middle Pleistocene air; at this distance the explosion barely touches the atmosphere (Thomas et al. 2016), so the sky's colors are today's. The star is drawn at the birthplace. The stars around it are moved back along their measured space motions, which puts it just 1.4° from Betelgeuse in the sky of the time.",
'volcanic': "A Tambora-scale sulfate veil (τ≈0.4) is what most people picture as a spectacular sky, and the model agrees. Noon skies are milky, whiter at the zenith than the horizon (the reverse of a clean sky). Sunsets glow salmon-orange, and the after-sunset sky 15–30° above the horizon turns a luminous pink-lavender: the high sulfate layer is still lit when the lower atmosphere is in shadow. This is the sky of Turner's 1816 paintings and of the Krakatoa twilights of 1883.",
'modern': "Baseline. Equatorial zenith ~9,000 K; mid-latitude ~15,000 K; polar summer ~19,000 K. Horizons run 7,400–8,400 K, essentially white. Setting Sun ~1,700 K; solar horizon orange; antisolar horizon pink.",
'modernpoll': "Aerosol optical depth 0.6 flattens the sky to a near-uniform pale gray-blue (6,500–8,300 K), brighter and whiter at the zenith than a clean sky, with the horizon slightly bluer than the zenith. The Sun disappears into gray murk well before it reaches the horizon.",
'ozonehole': "Antarctic spring in the ozone-hole years, with the column cut to 130 DU and the layer lowered toward 18 km. Noon stays blue. Twilight is where the hole shows: with the Sun 4° down the zenith is a pale blue (~7,800 K) instead of the deep blue (~12,500 K) of a 300 DU sky. It is the same direction as the thin post-oxidation column, and still well short of the cream (~6,000 K) of a sky with no ozone at all.",
'y2100': "The air is today's. What changes is the traffic. Lawler, Boley, and Rein (2022) put every filed megaconstellation on orbit, about 65,000 satellites, and found the worst naked-eye light pollution near 50° latitude. Each of those is their diffuse sphere, effective area 0.8 m², so its magnitude is on the same scale as the stars. At the equinox a mid-latitude sky has a few hundred of them above naked-eye brightness in the hour after sunset, and Earth's shadow takes them by midnight. On top of that fleet, Boley, Lawler, and Rein (2026) model orbital datacenters. Of the three filed designs, this sky takes the middle one and the more optimistic of their two node spreads: Blue Origin's Sunrise, 51,600 Sun-synchronous satellites from 500 to 1,800 km, in a dawn-dusk cross of rings whose nodes wander 10° to either side of the terminator. Each is a diffuse sphere of 800 m² at albedo 0.2, the size the paper calls conservative next to panels several times larger, and two hundred times the reflecting area of a communications satellite. An hour after sunset at mid-latitudes, thousands of them are above naked-eye brightness, a bright band along the terminator. The paper's all-night winter rings belong to the December solstice, which this equinox clock does not show. A low orbit crosses the dome in minutes.",
}


LIMB = json.load(open(ROOT / 'limb_all.json', encoding='utf-8'))
LIMB_ORDER = ['hadean44','archean27','archean38','snowball07','carbon30','kpg66','volcanic','modern']
LIMB_CAP = {'carbon30': "Carboniferous, 33% O₂. The extra oxygen raises total pressure by about a tenth, so the limb is marginally thicker and brighter than today's, but to the eye it is indistinguishable from modern Earth: once ozone and clean air are in place, the sky from space has been the same pale blue dot for two billion years.", 'hadean44': '30-bar CO₂ Hadean. The shell is an opaque, luminous white-peach almost all the way up, because tangent rays at any tangent height below ~60 km pass through many optical depths of CO₂; only the outermost fringe thins to blue. The disk is bright and nearly white: a cloudless, Rayleigh-only Venus.', 'archean27': 'Hazy Neoarchean. The organic haze colors the entire limb tan: every tangent ray below ~60 km crosses the layer (centered ~45 km) twice. Only above it does the shell turn a faint, dusty blue. The disk is the pale orange dot, though from space it is a subtle cream-orange rather than a vivid one.', 'archean38': "Clear early Archean. Structurally modern: white-blue near the surface, deep blue above, fading to black. With a little more CO₂ and no ozone the shell is marginally paler than today's and the disk very slightly whiter.", 'snowball07': 'Snowball Earth. The bluest shell in the set above a blazing white disk of ice. The polar limb stays bright because the frozen surface reflects so much light back into the atmosphere.', 'kpg66': 'Impact winter. A dim brown-gray band from the soot and sulfate layer occupies the lower and middle shell; above ~40 km the untouched upper atmosphere is still faintly blue. The disk is a dull gray-lilac, and dark at high latitudes.', 'volcanic': 'Volcanic year. A milky white sulfate band near 20 km sits between the white-blue troposphere and the deep blue upper shell. The disk is brighter and whiter than clean modern Earth.', 'modern': 'Modern Earth for reference: white-blue troposphere grading to a deep blue stratosphere and fading to black, brightest at the equator and darker toward the poles.'}
limb_figs = ''
for k in LIMB_ORDER:
    limb_figs += f"""<figure class="globe"><canvas data-epoch="{k}" width="480" height="480" aria-label="Volumetric rendering of Earth's atmosphere, {LIMB[k]['name']}"></canvas>
<figcaption><b>{LIMB[k]['name']}</b> {LIMB_CAP[k]}</figcaption></figure>"""
limb_section = f"""
<h3>The atmosphere from space</h3>
<p>To show latitude and altitude at once, these renderings look at Earth from space with the Sun behind the viewer at the equinox, so the solar zenith angle at every point equals its latitude (equator at the center line, poles at top and bottom). The shell around the disk is the atmosphere's limb: the color of light scattered toward the viewer along a tangent ray at each altitude, computed with the same model. The atmosphere is drawn 30 times too thick, so 100 km spans half an Earth radius; a real limb is a hairline. The disk shows the planet's reflected color over a dark ocean (over ice for Snowball Earth), with limb brightness compressed so faint upper layers remain visible.</p>
<div class="globes">{limb_figs}</div>
<script>
const LIMB = {json.dumps(LIMB)};
function lerp(a,b,t){{return a+(b-a)*t}}
function sample(grid, xs, x){{ // returns [i,t]
  if(x<=xs[0]) return [0,0]; for(let i=0;i<xs.length-1;i++){{ if(x<xs[i+1]) return [i,(x-xs[i])/(xs[i+1]-xs[i])]; }} return [xs.length-2,1];
}}
function render(cv){{
  const d=LIMB[cv.dataset.epoch]; const W=cv.width,H=cv.height; const ctx=cv.getContext('2d');
  const img=ctx.createImageData(W,H); const px=img.data;
  const cx=W/2, cy=H/2, R=W*0.30, EX=0.5; const lats=d.lats, alts=d.alts, hmax=alts[alts.length-1];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){{
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy); let c=[0.02,0.024,0.04];
    if(r<R){{ const lat=Math.min(82.5,Math.abs(Math.asin(dy/R))*180/Math.PI); const [i,t]=sample(null,lats,lat);
      const a=d.disk[i], b=d.disk[i+1]; const mu=Math.pow(Math.max(0,1-(r/R)**2),0.18);
      c=[0,1,2].map(q=>lerp(a[q],b[q],t)*mu);
    }} else if(r<R*(1+EX)){{ const h=(r/R-1)/EX*hmax; const lat=Math.min(82.5,Math.abs(Math.asin(dy/r))*180/Math.PI);
      const [i,t]=sample(null,lats,lat); const [j,u]=sample(null,alts,h);
      const g=d.limb; c=[0,1,2].map(q=>lerp(lerp(g[i][j][q],g[i][j+1][q],u),lerp(g[i+1][j][q],g[i+1][j+1][q],u),t));
      // fade the last 8% into space
      const f=Math.min(1,(R*(1+EX)-r)/(R*EX*0.08)); c=c.map((v,q)=>lerp([0.02,0.024,0.04][q],v,f));
    }}
    const o=(y*W+x)*4; px[o]=c[0]*255; px[o+1]=c[1]*255; px[o+2]=c[2]*255; px[o+3]=255;
  }}
  ctx.putImageData(img,0,0);
  // scale ticks on the right
  ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='11px Newsreader, Georgia, serif'; ctx.lineWidth=1;
  [0,20,50,100].forEach(h=>{{ const rr=R*(1+EX*h/hmax); ctx.beginPath(); ctx.moveTo(cx+rr,cy); ctx.lineTo(cx+rr,cy+7); ctx.stroke(); ctx.fillText(h+' km',cx+rr-12,cy+19); }});
  ctx.fillText('equator',cx-R*0.98+4,cy-4); ctx.fillText('pole',cx-14,cy-R-6);
}}
document.querySelectorAll('canvas[data-epoch]').forEach(render);
</script>
"""

order = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','ordovician466','carbon30','kpg66','zetaoph','geminga','volcanic','ozonehole','modern','modernpoll','y2100']
ages = {'hadean44':'4.4 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27thin':'2.7 Ga','archean27':'2.7 Ga','archean27vthick':'2.7 Ga','proterozoic22':'2.2 Ga','snowball07':'700 Ma','ordovician466':'466 Ma','carbon30':'300 Ma','kpg66':'66 Ma','zetaoph':'1.78 Ma','geminga':'342 ka','volcanic':'1815','modern':'today','modernpoll':'today','ozonehole':'1980–2000','y2100':'2100'}

hero = ''
for k in order:
    r = byk[k]; lat = r['lat']['Mid-latitude']
    z = hx(lat['zenith'], Yz); h = hx(lat['horizon'], Yz)
    hero += f'<a href="#{k}" class="hero-dome" style="background:linear-gradient(to bottom,{z},{h})" title="{r["name"]}"><span>{ages[k]}</span></a>'


# Stars that outshone today's Sirius, from stellar_encounters.py.
ENC = json.load(open(ROOT / 'encounters.json', encoding='utf-8'))
ENC_PROSE = [
"Sirius, at magnitude −1.46, is the brightest star in today's night sky, but it has not always been. The Sun's neighbours drift past it at tens of kilometres a second, so a star a hundred parsecs away now may have passed within a few parsecs of it a few million years ago. Tracing every Hipparcos star that has a radial velocity back 10 Myr through the Galaxy, with 2,000 draws over each star's measurement errors, finds eleven that outshone today's Sirius (table below). The brightest is θ Columbae, a fifth-magnitude star today, which passed about 2 pc from the Sun 4.7 million years ago and peaked near magnitude −5, as bright as Venus at its best; Gaia DR3 astrometry gives the same (−5.2 at 2.1 pc, 5.1 million years ago). ε Canis Majoris reached −4.35 4.4 million years ago, a result known since Tomkin (1998), and β Canis Majoris −3.6 at the same time. From about 3.5 to 5 million years ago the night sky held at least two stars brighter than any star today, and at times three.",
"These stars now lie in Columba, Canis Major and Puppis because that is the solar antapex: the Sun moves toward Hercules at about 20 km/s relative to its neighbours, so the stars it has passed end up behind it. The closest pass, ζ Leporis at 1.3 pc 850,000 years ago, came as close as α Centauri is now, far too distant to disturb the planets. Only distance changes the brightness here. ε and β Canis Majoris are giants 12 to 22 million years old and were probably a few tenths of a magnitude fainter then. Algol's radial velocity (3.7 ± 3.9 km/s, hard to measure in an eclipsing binary) is too uncertain to say whether it passed within 1.3 or 28 pc of the Sun. Rigel, Saiph, Mintaka, Alnitak and ξ Persei also come out bright, but 6 to 10 million years ago, about their own ages, so they are left out. The site's skies do not show these peaks: the supernova epochs (1.78 Ma and 342 ka) fall between them, though at 342 ka Aldebaran is close to its peak of −1.5.",
]
def _rng(q, fmt='{:.2f}'): return f"{fmt.format(q[1])} <small>({fmt.format(q[0])} to {fmt.format(q[2])})</small>"
enc_rows = ''.join(
    f"<tr><td>{e['name']}</td><td>{e['sptype']}</td><td>{e['v_now']:.2f}, {e['d_now']:.0f} pc</td>"
    f"<td>{_rng(e['peak'])}</td><td>{e['dmin'][1]:.1f}</td><td>{e['myr'][1]:.2f}</td><td>{e['p_sirius']*100:.0f}%</td></tr>"
    for e in ENC)
encounter_section = f"""
<h3>Stars brighter than Sirius</h3>
<p>{ENC_PROSE[0]}</p>
<div class="wrap"><table>
<tr><th>Star</th><th>Type</th><th>Today: V, distance</th><th>Peak V (68% range)</th><th>Closest (pc)</th><th>Million years ago</th><th>Draws brighter than Sirius</th></tr>
{enc_rows}
</table></div>
<p>{ENC_PROSE[1]}</p>
"""

# The rest of the sky (report_sky.py): the setting Sun, the Moon and eclipses, halos, the night
# sky, aurorae, meteors, dust and comets, and clouds.
import report_sky as rs
import eclipse_report as er
ECL_PNG = base64.b64encode(er.figure()).decode()
def _table(head, rows):
    return '<div class="wrap"><table><tr>'+''.join(f'<th>{h}</th>' for h in head)+'</tr>'+''.join('<tr>'+''.join(f'<td>{c}</td>' for c in r)+'</tr>' for r in rows)+'</table></div>'
sky_part = f'''
<h2 class="part" id="beyond">Beyond the colors</h2>
<p>{rs.INTRO}</p>
'''
for title, paras in rs.SECTIONS:
    sky_part += f'<h3>{title}</h3>\n' + ''.join(f'<p>{p}</p>\n' for p in paras)
    if title == 'Sunspots':
        sky_part += _table(rs.SUNSPOT_HEAD, rs.SUNSPOT) + f'<p class="tcap">{rs.SUNSPOT_CAPTION}</p>'
    if title == 'Lunar eclipses':
        sky_part += (f'<figure class="eclfig"><img src="data:image/png;base64,{ECL_PNG}" alt="The eclipsed Moon at nine epochs, centred in the shadow and at its edge, with the light across the shadow">'
                     f'<figcaption>{rs.FIG_CAPTION}</figcaption></figure>'
                     + _table(rs.lunar_head(), rs.lunar_rows()) + f'<p class="tcap">{rs.LUNAR_CAPTION}</p>')
sky_part += '<h3>The other phenomena, epoch by epoch</h3>' + _table(rs.PHENOMENA_HEAD, rs.PHENOMENA) + f'<p class="tcap">{rs.PHENOMENA_CAPTION}</p>'

sections = ''
for k in order:
    r = byk[k]
    domes = ''.join(dome(r['lat'][L], L) for L in ['Equator','Mid-latitude','Polar summer'])
    ss = strip(r['sunset'], ['solar_horizon','above_sun','zenith','anti_15','anti_horizon'],
               ['sun horizon','15° up','zenith','15° up','antisolar'], Yss, 'Sun on horizon')
    tw = strip(r['twilight'], ['solar_horizon','above_sun','above_sun30','zenith','anti_horizon'],
               ['sun horizon','15° up','30° up','zenith','antisolar'], Ytw, 'Sun 4° below horizon')
    sunset_sun = r['sunset']['sun']['hex'] if r['sunset']['sunY'] > 1e-8 else None
    sundot = f'<i class="sundot" style="background:{sunset_sun}"></i> setting Sun disk' if sunset_sun else '<i class="sundot" style="background:#111"></i> Sun not visible at the horizon'
    sections += f'''
<section class="epoch" id="{k}">
  <header><span class="age">{ages[k]}</span><h2>{r['name']}</h2><p class="sub">{r['sub']}</p></header>
  <div class="domes">{domes}</div>
  <div class="strips">{ss}{tw}<p class="sundisk">{sundot}</p></div>
  <p class="prose">{PROSE[k]}</p>
</section>'''

SKY_REFS = '\n'.join(f'<p>{r[0]}</p>' for r in rs.REFS)
html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Color of Earth's Sky Through Time</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&display=swap" rel="stylesheet">
<style>
:root{{--bg:#d9dbdf;--panel:#c9ccd2;--ink:#1c2230;--ink2:#464d5c;--rule:#9ea4b0;--swatch-bg:#7a7d84}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#1e2128;--panel:#272b34;--ink:#e8e9ec;--ink2:#b3b7c0;--rule:#4a4f5b;--swatch-bg:#5c5f66}}}}
:root[data-theme="dark"]{{--bg:#1e2128;--panel:#272b34;--ink:#e8e9ec;--ink2:#b3b7c0;--rule:#4a4f5b;--swatch-bg:#5c5f66}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:Newsreader,Georgia,"Times New Roman",serif;font-size:19px;line-height:1.5;font-weight:300}}
main{{max-width:860px;margin:0 auto;padding:1.25rem 1rem 4rem}}
h1{{font-weight:300;font-size:clamp(2rem,6vw,3.4rem);line-height:1.05;margin:1.2rem 0 .5rem;letter-spacing:-.01em}}
h1 em{{font-style:italic;font-weight:300}}
h2{{font-weight:400;font-size:1.5rem;margin:.1rem 0 .1rem;line-height:1.15}}
h3{{font-weight:400;font-size:1.25rem;margin:2.2rem 0 .4rem}}
p{{margin:.4rem 0 .9rem;max-width:62ch}}
.lede{{font-size:1.15rem;color:var(--ink2);max-width:60ch}}
.hero{{display:flex;gap:3px;height:240px;margin:1.4rem 0 .4rem;background:var(--swatch-bg);padding:3px}}
.hero-dome{{flex:1;position:relative;display:block;text-decoration:none;min-width:0}}
.hero-dome span{{position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:.6rem;color:rgba(0,0,0,.65);writing-mode:vertical-rl;transform:rotate(180deg);left:auto;right:2px;bottom:6px;top:auto;height:70px}}
.hero-caption{{font-size:.9rem;color:var(--ink2);margin-bottom:2rem}}
.epoch{{border-top:1px solid var(--rule);padding:1.4rem 0 1.2rem}}
.epoch header{{display:grid;grid-template-columns:5.2rem 1fr;column-gap:.8rem;align-items:baseline}}
.epoch .age{{font-size:1.05rem;color:var(--ink2);font-variant-numeric:tabular-nums}}
.epoch .sub{{grid-column:2;color:var(--ink2);font-size:1rem;margin:.1rem 0 .9rem}}
.domes{{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;background:var(--swatch-bg);padding:.6rem}}
.dome{{margin:0}}
.dome .sky{{position:relative;height:150px;overflow:hidden}}
.dome figcaption{{font-size:.85rem;color:#f2f3f5;margin-top:.35rem;line-height:1.25}}
.dome figcaption small{{display:block;font-size:.72rem;color:#d3d6dc}}
.sun{{position:absolute;left:58%;border-radius:50%;transform:translate(-50%,-50%)}}
.nosun{{position:absolute;bottom:6px;left:6px;font-size:.7rem;color:rgba(0,0,0,.55);font-style:italic}}
.strips{{background:var(--swatch-bg);padding:.6rem;margin-top:.5rem}}
.strip{{display:grid;grid-template-columns:7.2rem 1fr;align-items:center;gap:.5rem;margin-bottom:.45rem}}
.striplabel{{font-size:.82rem;color:#f2f3f5;line-height:1.2}}
.cells{{display:grid;grid-template-columns:repeat(5,1fr);height:44px;gap:2px}}
.cell{{position:relative}}
.cell b{{position:absolute;left:3px;bottom:2px;font-weight:400;font-size:.62rem;color:rgba(0,0,0,.55);font-style:italic}}
.sundisk{{font-size:.82rem;color:#f2f3f5;margin:.2rem 0 0}}
.sundot{{display:inline-block;width:.8em;height:.8em;border-radius:50%;vertical-align:-1px;margin-right:.3em}}
.prose{{margin-top:1rem}}
.globes{{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;margin:1rem 0 1.5rem}}
.globe{{margin:0;background:#05060a;padding:.5rem}}
.globe canvas{{width:100%;height:auto;display:block}}
.globe figcaption{{font-size:.88rem;color:#d7dae0;line-height:1.35;margin-top:.4rem}}
.globe figcaption b{{font-weight:400;color:#fff;display:block}}
@media (max-width:560px){{.globes{{grid-template-columns:1fr}}}}
table{{border-collapse:collapse;width:100%;font-size:.95rem;margin:.5rem 0 1rem}}
td,th{{text-align:left;padding:.35rem .5rem;border-bottom:1px solid var(--rule);vertical-align:top;font-weight:400}}
th{{color:var(--ink2);font-weight:300}}
.wrap{{overflow-x:auto}}
.refs{{font-size:.9rem;color:var(--ink2)}}
h2.part{{font-size:1.9rem;font-weight:300;margin:2.6rem 0 .4rem;border-top:1px solid var(--rule);padding-top:1.4rem}}
.eclfig{{margin:1rem 0 .6rem;background:#05060a;padding:.5rem}}
.eclfig img{{width:100%;height:auto;display:block}}
.eclfig figcaption{{font-size:.88rem;color:#d7dae0;line-height:1.35;margin-top:.4rem}}
.tcap{{font-size:.88rem;color:var(--ink2);margin-top:-.4rem}}
.refs p{{margin:.3rem 0}}
@media (max-width:560px){{
 body{{font-size:17px}} .hero{{height:170px}} .epoch header{{grid-template-columns:1fr}} .epoch .sub{{grid-column:1}}
 .strip{{grid-template-columns:1fr}} .dome .sky{{height:110px}} .domes{{gap:.35rem;padding:.4rem}}
}}
@media print{{ .globe,.domes,.strips,table,.hero{{break-inside:avoid}} h3,.epoch header{{break-after:avoid}} .epoch{{padding-top:1rem}} .globes{{grid-template-columns:repeat(2,1fr)}} .epoch .prose{{orphans:3;widows:3}} }}
</style></head><body><main>
<h1>The color of Earth's sky, <em>4.4 billion years to today</em></h1>
<p class="lede">A first-pass spectral radiative-transfer reconstruction of what the sky looked like from the ground at eighteen moments in Earth's history, and everything else in its sky: the setting Sun, eclipses of the Sun and Moon, halos, airglow, aurorae and meteors: straight up and at the horizon, at the equator, mid-latitudes and the poles, at noon, sunset and dusk.</p>

<div class="hero">{hero}</div>
<p class="hero-caption">Mid-latitude noon sky, zenith (top) to horizon (bottom), oldest at left. Brightness is shown relative to today's clean sky. Tap a column to jump to that epoch.</p>

<h3>Has this been done before?</h3>
<p>Not as such. A search of the Valency corpus (arXiv, PubMed, EarthArXiv and others) finds the two halves of the problem solved separately but never joined. On one side, atmospheric-optics work computes modern sky color rigorously: Lynch &amp; Mazuk (2005) derive CIE chromaticities of the sky, Sun and distant objects from MODTRAN spectra; Peyvandi et al. (2016) simulate 5.6 million daylight spectra with SBDART to map how aerosol and ozone shift sky color; Lee &amp; Mollner (2017) show with Monte Carlo simulation that vivid solar-horizon twilight colors need aerosol while the purest antisolar colors occur in a purely molecular atmosphere. On the other side, paleoatmosphere work constrains composition: Catling &amp; Zahnle (2020) for the Archean (O₂ below 10⁻⁶ of present, CO₂ 10–2,500× modern, CH₄ 10²–10⁴× modern), and Arney et al. (2016), Mak et al. (2023) and Goldblatt et al. (2024) for the organic-haze episodes. Arney's "Pale Orange Dot" computes what a hazy Archean Earth looks like <em>from space</em>, as an exoplanet spectrum, and that is as close as the literature comes. Nobody has computed the view from the ground, or the horizon-versus-zenith, latitude, and sunset structure. So this report does.</p>

<h3>How the colors were computed</h3>
<p>For each epoch the atmosphere is built from components with their own vertical profile and spectral optical depth: Rayleigh-scattering gas (N₂, O₂, CO₂, CH₄, H₂O in their epoch-appropriate partial pressures), ozone (the Chappuis cross section of Serdyuchenko et al. 2014 at 223 K, on a layer whose peak falls from 26 km at the equator to 18 km at the pole), tropospheric aerosol, a stratospheric sulfate layer, a tholin-like fractal organic haze (strongly blue-absorbing, forward-scattering), and impact soot. Sky radiance is integrated numerically along each line of sight through a spherical-shell atmosphere, so grazing sunlight at twilight is handled properly, with multiple scattering and surface reflection added from a delta-Eddington two-stream solution. The young Sun is treated as a blackbody made fainter and slightly cooler following standard solar evolution: 5,560 K and 70% of today's luminosity at 4.4 Ga, 5,620 K and 75% at 3.8 Ga, 5,660 K and 80% at 2.7 Ga, 5,700 K and 85% at 2.2 Ga, 5,772 K today. The color effect is only ~200 K, barely perceptible and far smaller than the atmospheric effects; the brightness effect is what makes the early skies dimmer. Spectra from 380–780 nm are converted to CIE XYZ and shown as sRGB. The model reproduces measured modern values (clear zenith 10,000–20,000 K, horizon 6,000–8,500 K, setting Sun ~1,700 K, pink antisolar Belt of Venus) before being pointed backward.</p>

<h3>Findings in brief</h3>
<div class="wrap"><table>
<tr><th>Epoch</th><th>Noon zenith, mid-lat</th><th>Horizon</th><th>Sunset</th></tr>
<tr><td>4.4 Ga, 30-bar CO₂</td><td>Peach-white, 3,300 K, shadowless</td><td>Same as zenith</td><td>Whole dome dims to orange; Sun rarely visible</td></tr>
<tr><td>4.0 Ga, 0.5-bar CO₂</td><td>Pale milky blue, 10,500 K</td><td>Milk white</td><td>Deep red Sun; cream twilight (no ozone)</td></tr>
<tr><td>3.8 Ga, clear Archean</td><td>Blue, 13,000 K</td><td>White</td><td>Modern-like, then yellow-beige twilight zenith</td></tr>
<tr><td>2.7 Ga, thin haze</td><td>Pastel milk-blue, 8,600 K</td><td>Warm white, 7,100 K</td><td>Orange twilight all the way to the zenith</td></tr>
<tr><td>2.7 Ga, thick haze</td><td>Cream-tan, 5,600 K</td><td>Cream-tan</td><td>Vermilion horizon, amber sky, long orange dusk</td></tr>
<tr><td>2.7 Ga, very thick haze</td><td>Saturated apricot, 3,900 K</td><td>Same as zenith</td><td>Sun lost in the haze before it sets; orange dusk</td></tr>
<tr><td>2.2 Ga, post-GOE</td><td>Blue, 13,300 K</td><td>White</td><td>Pale blue-gray twilight zenith (~7,100 K); deep blue dusk comes later</td></tr>
<tr><td>700 Ma, Snowball</td><td>Deep blue, 16,200 K</td><td>Blue-white, stays blue</td><td>Golden, pale</td></tr>
<tr><td>466 Ma, meteor storm</td><td>Blue, 14,200 K</td><td>White, 8,400 K</td><td>Modern-like; at night a hundred times today's fireballs and a bright zodiacal band</td></tr>
<tr><td>300 Ma, 33% O₂</td><td>Blue, 13,600 K</td><td>White, slightly brighter</td><td>Modern-like; smoky more often</td></tr>
<tr><td>66 Ma, impact winter</td><td>Dim amber-beige, 4,600 K</td><td>Beige</td><td>None; dome fades to brown</td></tr>
<tr><td>1.78 Ma, ζ Oph supernova</td><td>Same blue as today</td><td>White</td><td>Modern; a magnitude −11.6 supernova low in the south</td></tr>
<tr><td>342 ka, Geminga supernova</td><td>Same blue as today</td><td>White</td><td>Modern; a magnitude −11 supernova in Orion that casts shadows</td></tr>
<tr><td>1815, volcanic year</td><td>Milky blue-white, 9,300 K</td><td>Slightly bluer than zenith</td><td>Salmon Sun, pink-lavender afterglow</td></tr>
<tr><td>Ozone-hole spring</td><td>Blue, still</td><td>White</td><td>Pale blue dusk zenith, ~7,800 K</td></tr>
<tr><td>Today, clean</td><td>Blue, 15,000 K</td><td>White, 8,400 K</td><td>Orange horizon, pink antisolar; twilight zenith ~12,500 K</td></tr>
<tr><td>Today, polluted city</td><td>Pale gray-blue, 8,200 K</td><td>Slightly bluer than zenith, 8,900 K</td><td>Sun lost in gray murk before the horizon</td></tr>
<tr><td>2100, megaconstellation</td><td>Same blue as today</td><td>White</td><td>Thousands of bright datacenters along the dusk terminator, plus a few hundred communications satellites</td></tr>
</table></div>

<h3>Horizon versus zenith</h3>
<p>In a clean molecular atmosphere the zenith is blue and the horizon white because the horizon path is long enough that blue is scattered back out before reaching the eye and multiple scattering fills in the other colors. The size of that gradient is the clearest single diagnostic of atmospheric state. It is largest in the cleanest atmospheres (Snowball Earth, today's clean air: 8,000–13,000 K of color-temperature difference), shrinks as Rayleigh depth rises (late Hadean), collapses to nothing when a broadband absorber or thick scatterer sits overhead (hazy Archean, impact winter, 30-bar Hadean), and actually <em>reverses</em> under a stratospheric sulfate veil or heavy pollution, where the zenith becomes whiter than the horizon.</p>

<h3>Equator, mid-latitudes, poles</h3>
<p>Latitude enters through solar elevation and surface albedo. A high Sun lights the sky from above through a short path, giving a brighter but paler zenith (equatorial noon ~9,000 K); a low Sun sends light through more air, so the polar summer zenith is a deeper, darker blue (~19,000 K today, 20,000 K over Snowball ice) while the polar horizon is warmer and yellower. The same geometry makes the poles the place where any overhead absorber is most visible: the hazy Archean sky is cream at the equator but distinctly orange-yellow at the poles, and the impact-winter Sun that is still a pale disk at the equator is gone at 75° latitude. Snow and ice brighten and blue-shift the whole dome by reflecting light back into the atmosphere, which is why polar and Snowball horizons stay blue where a mid-latitude land horizon goes white.</p>

<h3>Particulates</h3>
<p>Three particle regimes appear in the record and they look different from one another. Non-absorbing sulfate high in the stratosphere (volcanic years) whitens the day sky and produces long, luminous pink and lavender twilights, because the layer is still sunlit after the ground is dark. Absorbing organic haze (Neoarchean) or soot (impact winter) removes blue outright, turning the dome tan or amber with almost no directional structure, and dims the surface by factors of 3–20. Boundary-layer pollution or dust brightens and grays the zenith, and buries the setting Sun in murk before it reaches the horizon. Tropospheric aerosol is also what makes sunset color vivid: the model confirms Lee &amp; Mollner's result that a purely molecular sky yields a pale, yellow-orange horizon while any turbidity deepens it to red.</p>

<h3>Sunsets and sunrises through time</h3>
<p>The biggest surprise is ozone. Today the sky above a setting Sun grades from orange through pale yellow to a zenith that stays blue well into twilight: about 12,500 K with the Sun 4° down. That persistent blue is the Chappuis band, ozone absorbing yellow and orange along the grazing path. The same modern sky with the ozone removed drops that zenith to cream, about 6,000 K. Before the Great Oxidation Event there was no ozone, so every sunset for the first two billion years ended with the zenith fading through cream and beige to orange. At ~2.2 Ga a 66 DU column, the Cooke et al. (2021) global mean for 1% of present oxygen, turns that cream zenith a pale blue-gray near 7,100 K. The deep twilight blue arrives later, once the column is near modern: the snowball sky, at their 10% oxygen column of 169 DU, holds a dusk zenith near 10,800 K. The same thinning is visible in the ozone-hole years. A polar-spring column of 130 DU leaves the dusk zenith pale blue, near 7,800 K, against 12,500 K today. Beyond the ozone story: Hadean sunsets were not events at the horizon but a slow dimming of the whole glowing dome; hazy Archean sunsets were the longest and most saturated in Earth's history, vermilion at the horizon and amber overhead; Snowball sunsets were brief and golden; the sunsets of the impact winter did not exist as color at all; and the reddest, most theatrical skies of the Phanerozoic belong to volcanic years like 1815 and 1883.</p>

{limb_section}
{sections}
{sky_part}
{encounter_section}
<h3>Caveats</h3>
<p>Paleoatmospheric compositions carry order-of-magnitude uncertainty, and the haze optical properties are taken from Titan-analog tholins; the three haze cases bracket that uncertainty. Aerosol loads for every pre-Cenozoic epoch are educated guesses. The color-matching functions use an analytic fit, and colors are shown without chromatic adaptation, so the tints represent what a modern camera set to daylight balance would record rather than what an adapted observer would "see" (an adapted eye would perceive the hazy Archean sky as nearer to white and the modern sky as bluer than shown). Clouds are omitted throughout. The two-stream multiple-scattering term is approximate for the thickest atmospheres, where a full Monte Carlo treatment would refine the exact tint of the Hadean sky. Beyond the colors, the strengths of the ancient airglow, aurorae, coronae, meteor and comet rates and zodiacal dust are estimates set to show the trend, as each section says; the lunar eclipses and the orbit's tilt are computed, and the eclipse shadow assumes today's cloud tops in every epoch.</p>

<h3>Sources consulted (via Valency)</h3>
<div class="refs">
<p>Arney G. et al. (2016). The Pale Orange Dot: The Spectrum and Habitability of Hazy Archean Earth. <i>Astrobiology</i> 16, 873.</p>
<p>Catling D.C. &amp; Zahnle K.J. (2020). The Archean atmosphere. <i>Science Advances</i> 6, eaax1420.</p>
<p>Goldblatt C., Eager-Nash J.K., Horne J.E. (2024). Evolution of the Archean Atmosphere. arXiv:2409.13105.</p>
<p>Mak M.T. et al. (2023). 3D simulations of the Archean Earth including photochemical haze profiles. <i>JGR Atmospheres</i>.</p>
<p>Hoffman P.F. et al. (2017). Snowball Earth climate dynamics and Cryogenian geology-geobiology. <i>Science Advances</i> 3, e1600983.</p>
<p>Lynch D.K. &amp; Mazuk S. (2005). On the colors of distant objects. <i>Applied Optics</i>.</p>
<p>Peyvandi S. et al. (2016). Colorimetric analysis of outdoor illumination across varieties of atmospheric conditions. <i>JOSA A</i> 33, 1049.</p>
<p>Lee R.L. &amp; Mollner D.C. (2017). Tropospheric haze and colors of the clear twilight sky. <i>Applied Optics</i> 56, G179.</p>
<p>Hernández-Andrés J., Lee R.L., Romero J. (1999). Calculating correlated color temperatures across the entire gamut of daylight and skylight chromaticities. <i>Applied Optics</i>.</p>
<p>Shaw J.A. et al. (2026). Solar eclipse sky brightness and color. <i>Applied Optics</i>.</p>
<p>Zhu Y. et al. (2020). Persisting volcanic ash particles impact stratospheric SO₂ lifetime and aerosol optical properties. <i>Nature Communications</i>.</p>
<p>Serdyuchenko A., Gorshelev V., Weber M., Burrows J.P. (2014). High spectral resolution ozone absorption cross-sections — Part 2. <i>Atmospheric Measurement Techniques</i> 7, 625.</p>
<p>Cooke G.J., Marsh D.R., Walsh C., Black B., Lamarque J.-F. (2021). A revised lower estimate of ozone columns during Earth's oxygenated history. <i>Royal Society Open Science</i> 9, 211165.</p>
<p>Neuhäuser R., Gießler F., Hambaryan V.V. (2019). A nearby recent supernova that ejected the runaway star ζ Oph, the pulsar PSR B1706-16, and ⁶⁰Fe found on Earth. <i>Monthly Notices of the Royal Astronomical Society</i>, doi:10.1093/mnras/stz2629.</p>
<p>Pellizza L.J., Mignani R.P., Grenier I.A., Mirabel I.F. (2005). On the local birth place of Geminga. <i>Astronomy &amp; Astrophysics</i>, doi:10.1051/0004-6361:20042377.</p>
<p>Salvati M. &amp; Sacco B. (2008). The Milagro anticenter hot spots: cosmic rays from the Geminga supernova? <i>Astronomy &amp; Astrophysics</i>, doi:10.1051/0004-6361:200809586.</p>
<p>Richardson D., Jenkins R.L., Wright J., Maddox L. (2014). Absolute-magnitude distributions of supernovae. <i>Astronomical Journal</i> 147, 118.</p>
<p>Thomas B.C. et al. (2016). Terrestrial effects of nearby supernovae in the early Pleistocene. <i>Astrophysical Journal Letters</i> 826, L3.</p>
<p>Tomkin J. (1998). Once and future celestial kings. <i>Sky &amp; Telescope</i> 95(4), 59.</p>
<p>Anderson E. &amp; Francis C. (2012). XHIP: an extended Hipparcos compilation. <i>Astronomy Letters</i> 38, 331.</p>
<p>Gaia Collaboration, Vallenari A. et al. (2023). Gaia Data Release 3: summary of the content and survey properties. <i>Astronomy &amp; Astrophysics</i> 674, A1.</p>
<p>Schönrich R., Binney J., Dehnen W. (2010). Local kinematics and the local standard of rest. <i>Monthly Notices of the Royal Astronomical Society</i> 403, 1829.</p>
<p>Lawler S.M., Boley A.C., Rein H. (2022). Visibility predictions for near-future satellite megaconstellations. <i>Astronomical Journal</i> 163, 21.</p>
<p>Boley A.C., Lawler S.M., Rein H. (2026). Rings in the sky: orbital data centres and potential impacts to astronomy and the sky. arXiv:2608.02757.</p>
{SKY_REFS}
</div>
</main></body></html>'''


if __name__ == '__main__':
    (ROOT.parent / 'report' / 'sky-color-history.html').write_text(html, encoding='utf-8')
    print(len(html))
