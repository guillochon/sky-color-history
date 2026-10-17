import base64, copy, json, numpy as np
from pathlib import Path
from skymodel import XYZ_to_srgb, hexcol

ROOT = Path(__file__).resolve().parent
D = json.load(open(ROOT / 'skycolors.json', encoding='utf-8'))
byk = {r['key']: r for r in D}
# Year 2100, the supernovae, the Late Cretaceous and 1900 keep today's clean air (the site draws the
# air of their year, which differs from today's by a few percent at most: THROUGH_TIME). The
# satellites, the explosions and the dark nights are drawn in the site.
SAME_AIR_EPOCHS = [
    ('y2100', 'Year 2100', "today's clean air, with the filed megaconstellation and the Sunrise orbital datacenters"),
    ('zetaoph', 'ζ Ophiuchi supernova, ~1.78 Ma', 'clean Early Pleistocene air, under a magnitude −11.6 supernova in Scorpius'),
    ('geminga', 'Geminga supernova, ~342 ka', 'clean Middle Pleistocene air, under a magnitude −11 supernova in Orion'),
    ('cretaceous66', 'Late Cretaceous, 66.1 Ma', 'clean air much like today\'s, before and after the impact winter'),
    ('y1900', 'Dark nights, 1900', "today's clean air over a countryside before electric light: no city glow"),
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
'protoearth455': "Some 17 million years after the first solids, the gas of the Sun's disk has just cleared, and with it, in the reading of the meteorites' bombardment ages (Edwards et al. 2024; Liu, Raymond & Jacobson 2022), the giant planets went unstable at about this time, some 5 to 20 million years after the first solids; we draw them just before it. Jupiter and Saturn sit in 3:2 resonance near 5.6 and 7.3 AU, and beyond them three ice giants: Uranus and Neptune, nearer than now, and between them and Saturn a fifth giant like Neptune, named here Oceanus, which Jupiter will throw out of the Solar System (Nesvorný 2011; Nesvorný & Morbidelli 2012). Neptune still has its own family of regular moons, named here Kymo, Galene, Thetis and Amphitrite; capturing Triton will scatter and destroy them (Rufu & Canup 2017). There is no Moon: the Earth is still growing, and Theia, the Mars-sized body that will strike it and make the Moon, is a wandering planet near the Earth's orbit, brighter than Venus when it passes close. Mercury still has most of its mantle, and Anteros, named here, the Mars-sized body that will graze it and then strike Venus, wanders between them; farther out Enyo, also named here, waits to make Mars's crustal dichotomy. The Sun is a pre-main-sequence star 17 million years old (Baraffe et al. 2015): 4,600 K, half today's light, a cooler, oranger disk 7% larger. Nothing constrains the proto-Earth's air; we take it as 3 bar of CO₂ over a bar of nitrogen, with dust from the impacts, so the sky can be seen through it. Where each planet was on any day cannot be known.",
'hadean45': "About ten million years after the Moon-forming impact. The magma ocean has frozen, the steam of the impact has rained out into the first ocean, and tens of bars of CO₂ are left in the air, which we take as 30 bar. A ~30-bar CO₂ atmosphere has a Rayleigh optical depth near 5 at 550 nm and about 18 in the violet, so blue light is scattered back to space many times before it reaches the ground. What arrives is a diffuse, shadowless, peach-white glow of ~3,500 K, nearly identical from zenith to horizon, under a young Sun that is only 68% as bright. The Sun itself is a dim ember at the equator and vanishes entirely at mid and high latitudes: this is a Venus-like sky. Sunset is a brief, deep-orange dimming of the whole dome rather than an event at the horizon. Above it, the Moon is still only about 8 Earth radii away (Korenaga 2023): 4° across, seven and a half times its width today and 56 times its area, its own magma ocean still open, glowing orange through cracks in its crust, and going round the Earth in 32 hours in the plane of the equator, while the Earth turns in under 6. It crosses the sky in hours, and for weeks around each equinox it eclipses the Sun at every new Moon, somewhere on the Earth, and passes through the Earth's shadow, 14° across at its distance, at every full Moon. Tidal recession will carry it out to about 39 Earth radii by 4.4 Ga. We date the giant planets' instability to 4.48 Ga, the latest that the dated impact record allows (Mojzsis et al. 2019), so the fifth giant, Oceanus, and Neptune's first moons are still here; the bombardment ages favor an earlier one (Edwards et al. 2024), as in the 4.55 Ga sky. Through 30 bar of CO₂ and the glow of the impact's debris no star shows; the planets and their moons are there to be found by zooming in. The Sun is 67 million years old, near the main sequence: 5,500 K and 68% of today's light.",
'hadean40': "Once most of the CO₂ has gone into carbonate, Rayleigh scattering falls to roughly twice the modern value. The sky turns pale blue at the zenith but clearly whiter than today (6,900–10,900 K versus 8,300–17,800 K), because the extra scattering fills the dome with multiply-scattered white light. Horizons are milky, and cream toward the poles. The setting Sun is deep red and the twilight zenith, with no ozone yet, is a pale gray rather than blue.",
'archean38': "With CO₂ down to ~0.1 bar, noon skies are close to modern blue, only slightly whiter. The difference is at dusk. The blue of the modern twilight zenith is produced by ozone absorbing yellow-orange light (the Chappuis band) along the long grazing path; with no free O₂ there is no ozone, so the Archean twilight zenith is a pale gray, and the whole sky fades from blue to gray to orange as the Sun sets. Sunsets themselves are much like today's, slightly redder from the extra CO₂ and dimmer Sun.",
"archean27clear": "For most of the Neoarchean the sky was clear. Sulfur and carbon isotopes from South Africa and Western Australia, 2.7 to 2.5 Ga, keep returning to the same haze-free background between episodes of haze (Zerkle et al. 2012; Izon et al. 2015): methane at a few hundredths of the CO₂, short of the tenth at which an organic haze forms. With no ozone and a twentieth of a bar of CO₂ the noon sky is close to a modern blue, a little whiter, and the twilight zenith, with no ozone to color it, turns gray rather than blue as the Sun goes down.",
'archean27thin': "One of the haze episodes the isotope records preserve: three in the 2.65–2.5 Ga Ghaap Group alone (Zerkle et al. 2012), here at about 2.63 and 2.58 Ga, each lasting about 1.4 million years and thickening over the first 0.3 (Izon et al. 2017). Once the biosphere pushed methane past a tenth of the CO₂ the haze shielded methane from its own destruction and ran on to a stable ~0.2, where Zerkle et al.'s model holds it: an organic haze at optical depth ~0.15. It pushes the zenith toward a pastel, milk-blue (6,700–8,200 K) and lays a warm cast on the horizon; at the poles, where sunlight crosses the haze obliquely, the horizon turns visibly cream. Twilight is orange all the way to the zenith.",
'archean27': "The haze episode of about 2.52 Ga, the youngest in the Ghaap Group and the one Izon et al. (2017) resolved, is drawn at the thick end of what models allow. This is the “Pale Orange Dot” seen from below. At optical depth ~0.6 the haze absorbs blue and scatters forward, so the entire dome is a warm cream to pale tan (~5,400 K at the equator, ~4,800 K at the poles) with little zenith-to-horizon gradient, the horizon only a little warmer: the sky looks like a bright overcast made of orange-tinted glass. The Sun is a soft, defined disk (haze scatters strongly forward) at 4,100 K. Sunsets are deep and long: the solar horizon reaches vermilion, the sky 15° above the Sun is amber, and the antisolar sky is peach rather than pink.",
'archean27vthick': "At the upper end of plausible haze (τ≈1.5) the sky is a uniform saturated apricot (3,000–4,100 K), as on Titan, and the polar Sun is reduced to an orange smear. The ground under it gets roughly 20–30% of a clear sky's sunlight.",
'proterozoic22': "After the Great Oxidation Event, about 1% of today's O₂ builds an ozone column of 66 DU, the Cooke et al. (2022) global mean for that oxygen level: about a fifth of a modern mid-latitude column, not the half that older estimates gave. Noon skies are already modern blue. Twilight is where the thin column shows. With the Sun 4° below the horizon the zenith leaves the gray of an ozone-free dusk (~6,600 K) and becomes a pale blue (~8,400 K). It is not yet the deep blue of a 300 DU twilight (~24,000 K). That saturated blue dusk is in place once the column is near modern, as in the snowball sky at 169 DU. (The pink antisolar arch needs no ozone: it is a Rayleigh effect and shows up faintly even in the Hadean model.)",
'snowball07': "A frozen planet has dry, clean air and a surface albedo near 0.75, and together they give the bluest mid-latitude sky in Earth's history: 7,900 K at the equatorial zenith, 15,400 K at mid-latitudes and 16,800 K over polar ice. The sunlit ice lights the sky from below and deepens the zenith's blue, 15,400 K against 12,700 K for the same air over open sea, though the horizons whiten much as they do today. Sunsets are golden and comparatively pale; there is little aerosol to redden them. This is the Sturtian glaciation, from about 717 to 661 Ma; the Marinoan, about 639 to 635 Ma, is drawn the same.",
'ordovician466': "About 466 million years ago the L-chondrite parent body, an asteroid about 150 km across, was shattered in the main belt, and its fragments still make up almost a third of the meteorites that fall today. For more than two million years the fine dust reaching Earth rose a thousandfold or more, and decimeter stones about a hundredfold: fossil meteorites lie scattered through Swedish limestones of that age, and the dust may have helped tip the climate toward the mid-Ordovician ice age (Schmitz et al. 2019). The meteors here come a hundred times as often as today, most of them slow and yellow with sodium, and we take the zodiacal light as thirty times today's, a glowing band along the ecliptic. The ring is speculation: all 21 known Ordovician craters lie within 30° of the paleo-equator, which led Tomkins, Martin & Cawood (2024) to propose that a large fragment broke up inside the Roche limit into a ring that lasted tens of millions of years; it is drawn as a faint, sunlit band that Earth's shadow cuts at night, with its debris falling at the equator as slow fireballs from the west. The air itself is close to today's: about 17% oxygen, 2,500 ppm CO₂, an ozone layer within a few percent of the modern one, under a Sun 4% fainter, so the day sky is today's blue.",
'carbon30': "Oxygen at 30–35% raises the total pressure and Rayleigh scattering by ~10%, so skies are marginally brighter and horizons a touch whiter than today. Frequent wildfire smoke in the high-O₂ world would have produced red suns and brown-orange horizons far more often than in the modern era.",
'cryogenian65': "Between the two snowballs: the 22 million years from the end of the Sturtian glaciation (661 Ma) to the start of the Marinoan (about 639 Ma). The air is the snowball's, with oxygen at a tenth of today's and an ozone column of 169 DU, but the sea is open and the land bare, so the sky is a clean, slightly deep blue over a dark surface, and with the Sun 4° down the zenith is a paler blue than today's, about 13,300 K against 24,000, under the thinner ozone layer.",
'cretaceous66': "The Late Cretaceous: air much like today's, under a Sun half a percent fainter, over dinosaur-age forests. It is the sky of the Cretaceous before the asteroid, and of the Paleogene once the soot and sulfate of the impact winter have settled out, a couple of years after.",
'kpg66': "Months after the Chicxulub impact, a global stratospheric layer of soot and sulfate turns the sky into a dim, uniform amber-beige (4,100–4,800 K) with no blue at all, about one-fifth as bright as a clear sky at the equator and 20× dimmer at high latitudes. The Sun is a pale orange disk at low latitudes and effectively gone near the poles. Sunsets do not happen as color events: the whole dome simply fades to dark brown, and the twilight sky is gray. The soot lets almost no sunlight through for over a year, and has cleared about five years after the impact (Bardeen et al. 2017); this sky shows for about two.",
'zetaoph': "About 1.78 million years ago a star of 16 to 18 solar masses exploded in a binary in the Scorpius-Centaurus association. The explosion unbound its companion, which is now the runaway O star ζ Ophiuchi, and left a neutron star that is now the pulsar PSR B1706-16; tracing both back puts the explosion 1.78 ± 0.21 Myr ago at 107 ± 4 pc (Neuhäuser et al. 2020). Its iron-60 may be part of the ⁶⁰Fe of 1.5 to 3.2 Myr ago found in deep-sea sediments and crusts (Wallner et al. 2016) and on the Moon (Fimiani et al. 2016). A typical Type II-P supernova (Richardson et al. 2014) at that distance peaks near −11.6, about twice as bright as Geminga's, or −12.3 if the binary stripped the star and made it a Type Ib. We draw the star where a straight-line trace of ζ Oph's present motion puts it, near RA 16h10m, Dec −21°. The stars are moved back along their measured space motions too; Antares has since traveled about 12°, and in the sky of the time the supernova sat about 12° west of it. That trace lands at 130 to 140 pc rather than 107, so the position is approximate. From mid-northern latitudes it stays low in the south. The air is clean Early Pleistocene air.",
'geminga': "About 342,000 years ago, going by the spin-down age of the pulsar it left behind (Salvati & Sacco 2008), a star of at most 15 solar masses exploded 90 to 240 pc away, in the direction of Orion (Pellizza et al. 2005). Type II-P supernovae peak near absolute magnitude −16.75 (Richardson et al. 2014), so from the middle of that range, 147 pc, it reached about −11: a fifth of the full Moon's light, all from a point. The −13 often quoted needs both the near end of the distance range and an unusually bright explosion. It burned in the daytime sky as a dazzling star, cast sharp shadows at night, and held near peak for the three months of its plateau. The air is clean Middle Pleistocene air; at this distance the explosion barely touches the atmosphere (Thomas et al. 2016), so the sky's colors are today's. The star is drawn at the birthplace. The stars around it are moved back along their measured space motions, which puts it just 1.4° from Betelgeuse in the sky of the time.",
'y1900': "The sky before electric light. The air is today's clean air, but the night is dark: oil and gas lamps lit towns without lighting the sky, and the glow of cities only grew with electric light through the twentieth century, to a third of today's by 1990 and today's now. This is the sky of the whole stretch of human history before then, and of the Pleistocene back to about 170,000 years ago.",
'volcanic': "A Tambora-scale sulfate veil (τ≈0.4) whitens the noon sky and lights the twilight. Noon skies are milky, a pale blue-white zenith over a white horizon, with a third of a clean sky's contrast between them. Sunsets glow salmon-orange, and the after-sunset sky 15–30° above the horizon turns a luminous pink-lavender: the high sulfate layer is still lit when the lower atmosphere is in shadow. The veil spreads over the months after Tambora's eruption in April 1815, stays through 1816, and clears in 1817. This is the sky of Turner's 1816 paintings and of the Krakatoa twilights of 1883.",
'modern': "Today's clean air is the baseline the other skies are measured against. The zenith is ~8,300 K at the equator, ~13,800 K at mid-latitudes and ~17,800 K in polar summer, and the horizons, at 6,300–7,200 K, are essentially white. The setting Sun is ~1,700 K, with the solar horizon orange and the antisolar horizon a pale pink-lavender.",
'modernpoll': "Aerosol optical depth 0.6 flattens the sky to a pale gray-blue zenith (6,400–8,800 K), brighter and whiter than a clean sky, over a warm white horizon (5,400–6,000 K). The Sun disappears into gray murk well before it reaches the horizon.",
'ozonehole': "Antarctic spring in the ozone-hole years, with the column cut to 130 DU and the layer lowered toward 18 km. Noon stays blue. Twilight is where the hole shows: with the Sun 4° down the zenith is a pale blue (~9,900 K) instead of the deep blue (~24,000 K) of a 300 DU sky. It is the same direction as the thin post-oxidation column, and still well short of the gray (~6,700 K) of a sky with no ozone at all.",
'y2100': "The air is today's. What changes is the traffic. Lawler, Boley, and Rein (2022) put every filed megaconstellation on orbit, about 65,000 satellites, and found the worst naked-eye light pollution near 50° latitude. Each is drawn with a simple shape after its design, which sets its brightness, glints included; the second-generation Starlinks come out about as bright as the paper's diffuse sphere of 0.8 m². At the equinox a mid-latitude sky has a few hundred of them above naked-eye brightness in the hour after sunset, and Earth's shadow takes them by midnight. On top of that fleet, Boley, Lawler, and Rein (2026) model orbital datacenters. Of the three filed designs, we take Blue Origin's Sunrise and the relaxed one of their two node spreads: 51,600 Sun-synchronous satellites from 500 to 1,800 km, in a dawn-dusk cross of rings whose nodes wander 10° to either side of the terminator. Each is drawn as a satellite with 800 m² of solar wings following the Sun on one drive, its cells under cover glass and its radiators mirror-like, so its brightness is that of its shape, glints included, rather than the paper's sphere. At mid-latitudes on the March equinox some 1,600 are brighter than fifth magnitude an hour after sunset, a band along the terminator, and none two and a half hours after it; in December some 4,800, until about 9 p.m., with glints as bright as magnitude −4. A low orbit crosses the dome in minutes.",
}


LIMB = json.load(open(ROOT / 'limb_all.json', encoding='utf-8'))
LIMB_ORDER = ['hadean45','archean27','archean38','snowball07','carbon30','kpg66','volcanic','modern']
LIMB_CAP = {'carbon30': "Carboniferous, 33% O₂. The extra oxygen raises total pressure by about a tenth, so the limb is marginally thicker and brighter than today's, but to the eye it is indistinguishable from modern Earth: once ozone and clean air are in place, the sky from space has been the same pale blue dot for two billion years.", 'hadean45': '30-bar CO₂ Hadean. The shell is an opaque, luminous white-peach almost all the way up, because tangent rays at any tangent height below ~60 km pass through many optical depths of CO₂; only the outermost fringe thins to blue. The disk is bright and nearly white: a cloudless, Rayleigh-only Venus.', 'archean27': 'Hazy Neoarchean. The organic haze colors the entire limb tan: every tangent ray below ~60 km crosses the layer (centered ~45 km) twice. Only above it does the shell turn a faint, dusty blue. The disk is the pale orange dot, though from space it is a subtle cream-orange rather than a vivid one.', 'archean38': "Clear early Archean. Structurally modern: white-blue near the surface, deep blue above, fading to black. With a little more CO₂ and no ozone the shell is marginally paler than today's and the disk very slightly whiter.", 'snowball07': 'Snowball Earth. The bluest shell in the set above a blazing white disk of ice. The polar limb stays bright because the frozen surface reflects so much light back into the atmosphere.', 'kpg66': 'Impact winter. A dim brown-gray band from the soot and sulfate layer occupies the lower and middle shell; above ~40 km the untouched upper atmosphere is still faintly blue. The disk is a dull gray-lilac, and dark at high latitudes.', 'volcanic': 'Volcanic year. A milky white sulfate band near 20 km sits between the white-blue troposphere and the deep blue upper shell. The disk is brighter and whiter than clean modern Earth.', 'modern': 'Modern Earth for reference: white-blue troposphere grading to a deep blue stratosphere and fading to black, brightest at the equator and darker toward the poles.'}
limb_figs = ''
for k in LIMB_ORDER:
    limb_figs += f"""<figure class="globe"><canvas data-epoch="{k}" width="480" height="480" aria-label="Volumetric rendering of Earth's atmosphere, {LIMB[k]['name']}"></canvas>
<figcaption><b>{LIMB[k]['name']}</b> {LIMB_CAP[k]}</figcaption></figure>"""
limb_html = f"""
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

# The epochs in time order: the site's (gen_site.py order), with the report's very thick haze, an
# upper bound on the 2.52 Ga episode, beside the thick haze it bounds.
order = ['protoearth455','hadean45','hadean40','archean38','archean27clear','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','cryogenian65','ordovician466','carbon30','cretaceous66','kpg66','zetaoph','geminga','volcanic','y1900','ozonehole','modern','modernpoll','y2100']
ages = {'protoearth455':'4.55 Ga','hadean45':'4.50 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27clear':'2.7 Ga','archean27thin':'2.58 Ga','archean27':'2.52 Ga','archean27vthick':'2.52 Ga','proterozoic22':'2.2 Ga','snowball07':'700 Ma','cryogenian65':'650 Ma','ordovician466':'466 Ma','carbon30':'300 Ma','cretaceous66':'66.1 Ma','kpg66':'66 Ma','zetaoph':'1.78 Ma','geminga':'342 ka','volcanic':'1816','y1900':'1900','ozonehole':'1980–2000','modern':'today','modernpoll':'today','y2100':'2100'}

hero = ''
for k in order:
    r = byk[k]; lat = r['lat']['Mid-latitude']
    z = hx(lat['zenith'], Yz); h = hx(lat['horizon'], Yz)
    hero += f'<a href="#{k}" class="hero-dome" style="background:linear-gradient(to bottom,{z},{h})" title="{r["name"]}"><span>{ages[k]}</span></a>'


# Stars that outshone today's Sirius, from stellar_encounters.py.
ENC = json.load(open(ROOT / 'encounters.json', encoding='utf-8'))
ENC_PROSE = [
"Sirius, at magnitude −1.46, is the brightest star in today's night sky, but it has not always been. The Sun's neighbors drift past it at tens of kilometers a second, so a star a hundred parsecs away now may have passed within a few parsecs of it a few million years ago. Tracing every Hipparcos star that has a radial velocity back 10 Myr through the Galaxy, with 2,000 draws over each star's measurement errors, finds eleven that outshone today's Sirius (table below). The brightest is θ Columbae, a fifth-magnitude star today, which passed about 2 pc from the Sun 4.7 million years ago and peaked near magnitude −5, as bright as Venus at its best; Gaia DR3 astrometry (Gaia Collaboration 2023) gives the same (−5.2 at 2.1 pc, 5.1 million years ago). ε Canis Majoris reached −4.35 4.4 million years ago (its spell as the brightest star has been known since Tomkin 1998, who gave −4.0 at 4.7 million years), and β Canis Majoris −3.6 at the same time. From about 3.5 to 5 million years ago the night sky held at least two stars brighter than any star today, and at times three.",
"These stars now lie in Columba, Canis Major and Puppis because that is the solar antapex: the Sun moves toward Hercules at about 20 km/s relative to its neighbors, so the stars it has passed end up behind it. The closest pass, ζ Leporis at 1.3 pc 850,000 years ago, came as close as α Centauri is now, far too distant to disturb the planets. Only distance changes the brightness here. ε and β Canis Majoris are giants 12 to 22 million years old and were probably a few tenths of a magnitude fainter then. Algol's radial velocity (3.7 ± 3.9 km/s, hard to measure in an eclipsing binary) is too uncertain to say whether it passed within 1.3 or 28 pc of the Sun. Rigel, Saiph, Mintaka, Alnitak and ξ Persei also come out bright, but 6 to 10 million years ago, about their own ages, so they are left out. The site's sky shows the peaks of the last two million years, where its stars move along these lines: ζ Leporis at −2.5 about 850,000 years ago, ζ Sagittarii at −2.0 about a million years ago and Aldebaran at −1.5 about 330,000 years ago. The older peaks fall before then, in its stand-in sky.",
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

# ===================================================================================================
# The document. Both outputs are built from these blocks (report_doc.py): the HTML report
# report/view-from-earth.html, the LaTeX paper latex/main.tex and its bibliography latex/refs.bib.
# ===================================================================================================
import re
import report_sky as rs
import report_view as rv
import report_doc as D
import report_refs as R
from epochs import BY_KEY

FIGS = ROOT.parent / 'latex' / 'figures'
def view(name): return FIGS / f'view_{name}.jpg'

TITLE = "A Complete History of the Earth's Sky"
LEDE = ("What could be seen from the ground through Earth's history, at twenty-three moments and the years between them: "
        "the color of the sky, straight up and at the horizon, at the equator and the poles, at noon and at dusk, "
        "reconstructed with a spectral radiative-transfer model; and the Sun, Moon, planets, stars and everything else "
        "above it, from the molten newborn Moon to a sky full of satellites.")

DONE_BEFORE = [
"Not as such. A search of the Valency corpus (arXiv, PubMed, EarthArXiv and others) finds the two halves of the "
"sky-color problem solved separately but never joined. On one side, atmospheric-optics work computes modern sky color "
"rigorously: Lynch &amp; Mazuk (2005) derive CIE chromaticities of the sky, Sun and distant objects from MODTRAN spectra; "
"Peyvandi et al. (2016) simulate 5.6 million daylight spectra with SBDART to map how aerosol and ozone shift sky color; "
"Lee &amp; Mollner (2017) show with Monte Carlo simulation that vivid solar-horizon twilight colors need aerosol while "
"the purest antisolar colors occur in a purely molecular atmosphere. On the other side, paleoatmosphere work constrains "
"composition: Catling &amp; Zahnle (2020) for the Archean (O₂ below 10⁻⁶ of present, CO₂ 10–2,500× modern, CH₄ "
"10²–10⁴× modern), and Arney et al. (2016), Mak et al. (2023) and Goldblatt et al. (2024) for the organic-haze episodes. "
"Arney's “Pale Orange Dot” computes what a hazy Archean Earth looks like <em>from space</em>, as an exoplanet spectrum, "
"and Sanromá &amp; Pallé (2012) Earth's light curves over the last 500 million years; that is as close as the literature comes. Nobody has "
"computed the view from the ground, or the horizon-versus-zenith, latitude, and sunset structure.",
"The same holds for the rest of the view. Its pieces are separate results: the Moon's recession and the day's "
"lengthening (Farhat et al. 2022), the young Sun's brightness and activity, the stars' past motions, the giant "
"planets' early instability. Earth's transmission spectrum has been computed through geological time as a transiting "
"exoplanet would show it (Kaltenegger, Lin &amp; Madden 2020), and today's lunar eclipse has been modeled with "
"refraction (García Muñoz et al. 2012), but no reconstruction of how the eclipsed Moon itself looked in past epochs "
"turns up, nor of how these pieces together looked from the ground on a given evening. We assemble them here.",
]

COLORS_METHOD = [
"For each epoch the atmosphere is built from components with their own vertical profile and spectral optical depth: "
"Rayleigh-scattering gas (N₂, O₂, CO₂, CH₄, H₂O in their epoch-appropriate partial pressures), ozone (the Chappuis "
"cross section of Serdyuchenko et al. 2014 at 223 K, on a layer whose peak falls from 26 km at the equator to 18 km at "
"the pole), tropospheric aerosol, a stratospheric sulfate layer, a tholin-like fractal organic haze (strongly "
"blue-absorbing, forward-scattering), and impact soot ({ref:tab:epochs}). Sky radiance is integrated numerically along "
"each line of sight through a spherical-shell atmosphere, so grazing sunlight at twilight is handled properly. The "
"light scattered more than once is carried by a table over altitude and the Sun's local elevation, as in Hillaire "
"(2020): from each of its nodes, rays in 576 directions gather the light scattered once on its way there and the "
"sunlight off the ground; every later order is then solved exactly, as a linear system for each wavelength, with the "
"ground lit by the scattered light too, and the first four orders keep their directions, which the forward-scattering "
"hazes and aerosols need. Against CalcMySky (Kabatsayev 2025), an independent multiple-scattering code after Bruneton "
"&amp; Neyret (2008) that Stellarium uses (Zotti &amp; Wolf 2023), run on the same atmospheres, the modern sky agrees "
"within 3% at the zenith from noon until the Sun is 20° below the horizon and within 0.002 in chromaticity, the hazy "
"Archean and impact skies within 10% by day and 18% in twilight, and the 30-bar Hadean within 10% at the zenith "
"wherever CalcMySky itself converges (650–750 nm), though its horizon is up to 22% brighter there (Appendix B). Spectra from 380–780 nm "
"are converted to CIE XYZ with the analytic color-matching functions of Wyman, Sloan &amp; Shirley (2013) and shown as "
"sRGB. The model reproduces measured modern values (clear zenith 10,000–20,000 K, horizon 6,000–8,500 K, setting Sun "
"~1,700 K, pink-lavender antisolar Belt of Venus) before being pointed backward.",
"We treat the young Sun as a blackbody whose effective temperature and luminosity follow the solar track of Baraffe "
"et al. (2015): 5,530 K and 68% of today's output at 4.5 Ga, rising through 5,620 K (75%) at 3.8 Ga, 5,660 K (80%) at "
"2.7 Ga and 5,700 K (85%) at 2.2 Ga to 5,772 K today, and 4,614 K (47%) for the 17-million-year-old Sun of 4.55 Ga; "
"between the epochs the temperature runs linearly in time and the inverse of the luminosity too, the form of the "
"brightening that Gough (1981) gives. The "
"color effect is small: the 5,530 K Sun of 4.5 Ga is only about 240 K cooler in color temperature than the modern one, a difference "
"that is barely perceptible side by side and is swamped by atmospheric effects ten to a hundred times larger. The "
"brightness effect is not small, and is why the early-epoch skies are rendered dimmer. We ignore Fraunhofer lines and "
"the young Sun's ultraviolet excess, which matter for haze photochemistry but not for visible color. The model is "
"provided as the Python source <em>skymodel.py</em>; <em>run_epochs.py</em> produces the sky colors and "
"<em>limb_grid.py</em> the limb and disk colors.",
]

FINDINGS = [
('Horizon versus zenith', "In a clean molecular atmosphere the zenith is blue and the horizon white because the horizon path is long enough that blue is scattered back out before reaching the eye and multiple scattering fills in the other colors. The size of that gradient is the clearest single diagnostic of atmospheric state. It is largest in the cleanest atmospheres (Snowball Earth, today's clean air: 6,800–11,500 K of color-temperature difference at mid-latitudes and the poles), shrinks as Rayleigh depth rises (late Hadean), collapses to nothing when a broadband absorber or thick scatterer sits overhead (hazy Archean, impact winter, 30-bar Hadean), and falls to a third or less under a stratospheric sulfate veil or heavy pollution, which whiten the zenith toward the horizon's color."),
('Equator, mid-latitudes, poles', "Latitude enters through solar elevation and surface albedo. A high Sun lights the sky from above through a short path, giving a brighter but paler zenith (equatorial noon ~8,300 K); a low Sun sends light through more air, so the polar summer zenith is a deeper, darker blue (~17,800 K today, 16,800 K over Snowball ice) while the polar horizon is warmer and yellower. The same geometry makes the poles the place where any overhead absorber is most visible: the hazy Archean sky is cream at the equator but distinctly orange-yellow at the poles, and the impact-winter Sun that is still a pale disk at the equator is gone at 75° latitude. Snow and ice brighten the dome and deepen the zenith's blue by reflecting light back into the atmosphere, though polar and Snowball horizons still whiten as a land horizon does."),
('Particulates', "Three kinds of particle appear in the record, and each leaves a different sky. Non-absorbing sulfate high in the stratosphere (volcanic years) whitens the day sky and produces long, luminous pink and lavender twilights, because the layer is still sunlit after the ground is dark. Absorbing organic haze (Neoarchean) or soot (impact winter) removes blue outright, turning the dome tan or amber with almost no directional structure, and dims the surface by factors of 3–20. Boundary-layer pollution or dust brightens and grays the zenith, and buries the setting Sun in murk before it reaches the horizon. Tropospheric aerosol is also what makes sunset color vivid: the model confirms the result of Lee &amp; Mollner (2017) that a purely molecular sky yields a pale, yellow-orange horizon while any turbidity deepens it to red."),
('Sunsets and sunrises through time', "The biggest surprise is ozone. Today the sky above a setting Sun grades from orange through pale yellow to a zenith that stays blue well into twilight: about 24,000 K with the Sun 4° down. That persistent blue is the Chappuis band, ozone absorbing yellow and orange along the grazing path. The same modern sky with the ozone removed drops that zenith to a neutral gray, about 6,700 K. Before the Great Oxidation Event there was no ozone, so every sunset for the first two billion years ended with the zenith fading to gray. At ~2.2 Ga a 66 DU column, the Cooke et al. (2022) global mean for 1% of present oxygen, turns that gray zenith a pale blue near 8,400 K. The deep twilight blue arrives later, once the column is near modern: the snowball sky, at their 10% oxygen column of 169 DU, holds a dusk zenith near 16,000 K. The same thinning is visible in the ozone-hole years. A polar-spring column of 130 DU leaves the dusk zenith pale blue, near 9,900 K, against 24,000 K today. Beyond the ozone story: Hadean sunsets were not events at the horizon but a slow dimming of the whole glowing dome; hazy Archean sunsets were the longest and most saturated in Earth's history, vermilion at the horizon and amber overhead; Snowball sunsets were brief and golden; the sunsets of the impact winter did not exist as color at all; and the reddest, most theatrical skies of the Phanerozoic belong to volcanic years like 1815 and 1883."),
]

THROUGH_TIME = [
"The epochs are fixed points rather than the only times the view can show. The site's timeline runs from the "
"Solar System's birth to 250,000 years ahead, and each epoch is exact at its own year, while between the epochs "
"every quantity runs along a curve suited to it. The air (<em>airtime.py</em>) is an epoch's own at that epoch's "
"year. Between epochs its gases run log-linearly in time from one to the next, since drawdowns and rises run "
"roughly exponentially, with the steps the geological record shows added as fixed points of their own: the Great "
"Oxidation Event's rise of O₂ and fall of CH₄ between 2.43 Ga (Gumsley et al. 2017) and 2.22 Ga (Poulton et al. "
"2021), O₂ held near 1% of today's through the mid-Proterozoic until the Neoproterozoic rise from about 800 Ma "
"(Lyons, Reinhard &amp; Planavsky 2014), and the Cambrian's 5–10% O₂ (Mills et al. 2023). Ozone is not "
"interpolated on its own but follows the O₂, by the global-mean columns Cooke et al. (2022) simulate at fixed "
"oxygen levels (18 DU at 0.1% of today's, 66 at 1%, 136 at 5%, 169 at 10%, 279 at today's), scaled at each epoch "
"to that epoch's own columns by latitude. The tropospheric aerosol's optical depth runs log-linearly between the "
"epochs, the Sun as above, the meteoric dust of the Ordovician break-up with the dust's own rise and decay "
"(<em>Dust, comets and the Ordovician ring</em>), and the Moon-forming impact, about 4.51 Ga, is a step: the "
"proto-Earth's air before it and the early Hadean's from it on. {ref:fig:airtime} shows the result.",
"Some epochs are events that interrupt a longer-lived sky, and the timeline gives them dates and durations. The "
"Neoarchean's haze episodes interrupt a clear background, which isotope records from South Africa and Western "
"Australia keep returning to (Zerkle et al. 2012; Izon et al. 2015). Three episodes are recorded in the "
"2.65–2.5 Ga Ghaap Group alone (Zerkle et al. 2012); we date them about 2.63, 2.58 and 2.52 Ga by spacing the "
"drill core's ends evenly, so to within tens of millions of years. The youngest, which Izon et al. (2017) "
"resolved, set in over 0.3 Myr and lasted 1.4 Myr in all, and each episode is given that shape: the two older "
"are the thin haze and the youngest the thick. Snowball Earth is two glaciations over a non-glacial Cryogenian: "
"the Sturtian from about 717 Ma (MacLennan et al. 2018) to 660.98 Ma (Rooney et al. 2020), and the Marinoan, about "
"four million years long (Tasistro-Hart et al. 2025), ending at 635.21 Ma (Prave et al. 2016). Once the ice "
"passed a critical latitude it reached the equator within years to decades (Eberhard et al. 2023), and it melted "
"in about two thousand years (Hoffman et al. 2017). The K–Pg impact winter lets almost no sunlight through for "
"over a year, and its soot has cleared about five years after the impact (Bardeen et al. 2017): the site holds it "
"for a year and clears it with a one-year e-folding time, so its sky shows for about two years over a Late "
"Cretaceous of today's air. Tambora's sulfate veil spreads through the stratosphere over the months after April "
"1815, stays through 1816 and clears in 1817, and the ozone-hole sky holds from 1980 to 2000. Three more volcanic "
"veils come over the modern-era skies as events without epochs of their own, each Tambora's air at its own "
"veil's depth: Laki's sulfur haze from June 1783, over the Northern Hemisphere only and at Tambora's depth, "
"though most of it lay in the troposphere (Thordarson &amp; Self 2003), and Krakatoa's of 1883 and Pinatubo's of "
"1991, about 0.14 and 0.15 at 550 nm at their peaks (Sato et al. 1993), each fading with an e-folding time of "
"about a year. As an event comes on, "
"its own parts of the air (the haze and methane, the snowball's ice and clean air, the soot and sulfate, the "
"ozone column) go from the background's to its own, while the rest stays the background's.",
"The sky's colors cannot simply be blended between epochs as different as these, so the parts of the sky that are "
"computed ahead of time (the day-cycle colors, the setting Sun's bands, the crepuscular rays' tables, the light in "
"the Earth's shadow and the spectra) are computed for 143 airs along the timeline (<em>airgrid.py</em>). They are "
"every epoch's own, the years where the curves bend, and more wherever blending the two neighbors would miss the "
"air between them, at any of a set of test directions and Sun heights, by more than 0.02 in log<sub>10</sub> luminance (about "
"5%) or 0.002 in chromaticity, found by halving each interval in turn. Each event is computed at steps of its "
"strength in the same way. The site blends the two airs either side of the time shown, luminance in logarithm and "
"chromaticity linearly, by the year or by the event's strength. The 62 background airs lie densest where the air "
"changes fastest: through the Hadean's CO₂ drawdown, the Great Oxidation and the Ordovician dust. The starlight's "
"extinction, the soot's absorption, the airglow and the cloud cover follow the same blended air, and everything "
"else follows the year too: the Sun's brightness and spots, the Moon's distance, orbit and face and the day's "
"length, the planets' moons and rings, the stars, the Sun's place in the Galaxy, the rates of comets, meteors and "
"dust, and the glow of cities, as the sections that follow describe.",
]
AIRTIME_CAPTION = ("The air through Earth's history as the site draws it, with the epochs evenly spaced and time running "
"linearly between neighboring epochs. Top: the gases' partial pressures and their total. Middle: the mid-latitude ozone "
"column. Below: the optical depths at 550 nm of Rayleigh scattering and of each kind of particle. The lines are the "
"background air through time; the air of an event (italic labels: the haze episodes, Snowball Earth, the impact "
"winter, the volcanic year and the ozone hole) and of the polluted city is drawn as a short bar at its tick, joined to "
"the line, as its years or million years would not show at this scale. Dashed: CO₂ after the Ordovician and water vapor after the Hadean, which the sky model leaves out once they no longer touch the visible sky. CO₂ follows the stage medians of the PhanDA reconstruction (Judd et al. 2024), about 460 ppm at 300 Ma and 940 ppm at 66 Ma; the EPICA Dome C record at 342 ka, about 205 ppm (Bereiter et al. 2015); Law Dome for 1816 and 1900, 284 and 296 ppm (MacFarling Meure et al. 2006); the measured 354 ppm of 1990 and 425 ppm of today; and 603 ppm in 2100 on SSP2-4.5 (Meinshausen et al. 2020). Water vapor is the near-surface pressure at a fixed 80% relative humidity (Held &amp; Soden 2006) and each epoch's global mean temperature: 20 °C through the Precambrian between glaciations, the middle of the 8–30 °C the carbon cycle allows (Charnay et al. 2017; Krissansen-Totton et al. 2018); PhanDA's 31 °C at 466 Ma, 16.5 °C at 300 Ma, 24.5 °C at 66 Ma and 12.8 °C at 1.78 Ma; a glacial maximum at 342 ka, 6.1 °C under the preindustrial (Tierney et al. 2020); 13.7 °C in 1850–1900 (Jones et al. 1999), 1.4 °C more today (Forster et al. 2025) and 2.7 °C more in 2100 on SSP2-4.5 (IPCC 2021). It runs from 0.008 bar in the glacial Pleistocene to 0.036 bar in the hot Ordovician. Shaded: the Great Oxidation Event and the two "
"Snowball glaciations. The strips are the sky's color at mid-latitude, at the brightness relative to today's clean sky "
"used throughout: the zenith and the horizon with the Sun 45° up, the horizon under the setting Sun, and the zenith "
"with the Sun 4° below the horizon, from the airs the site blends between the ticks and each epoch's own at its tick "
"(<em>air_timeline_fig.py</em>).")

SUMMARY_HEAD = ['Epoch', 'Noon zenith, mid-latitude', 'Horizon', 'Sunset']
SUMMARY = [
['4.55 Ga, proto-Earth', 'Pale blue-white under 3 bar of CO₂ and dust', 'Milky', 'Orange; a Sun larger and redder than today’s'],
['4.5 Ga, 30-bar CO₂', 'Peach-white, 3,500 K, shadowless', 'Same as zenith', 'Whole dome dims to orange; Sun rarely visible'],
['4.0 Ga, 0.5-bar CO₂', 'Pale milky blue, 10,900 K', 'Milk white', 'Deep red Sun; gray twilight (no ozone)'],
['3.8 Ga, clear Archean', 'Blue, 12,700 K', 'White', 'Modern-like, then a gray twilight zenith'],
['2.7 Ga, clear Neoarchean', 'Blue, 12,700 K', 'White, 6,600 K', 'Modern-like, then a gray twilight zenith (~6,600 K)'],
['2.58 Ga, thin haze', 'Pastel milk-blue, 8,200 K', 'Warm white, 5,900 K', 'Orange twilight all the way to the zenith'],
['2.52 Ga, thick haze', 'Cream-tan, 5,600 K', 'Cream-tan', 'Vermilion horizon, amber sky, long orange dusk'],
['2.52 Ga, very thick haze (upper bound)', 'Saturated apricot, 4,100 K', 'Same as zenith', 'Sun lost in the haze before it sets; orange dusk'],
['2.2 Ga, post-GOE', 'Blue, 12,200 K', 'White', 'Pale blue twilight zenith (~8,400 K); deep blue dusk comes later'],
['700 Ma, Snowball', 'Deep blue, 15,400 K', 'White, 7,000 K', 'Golden, pale'],
['650 Ma, Cryogenian', 'Blue, 12,700 K', 'White, 6,800 K', 'Orange; blue dusk zenith (~13,300 K)'],
['466 Ma, meteor storm', 'Blue, 12,900 K', 'White, 6,800 K', 'Modern-like; at night a hundred times today’s fireballs and a bright zodiacal band'],
['300 Ma, 33% O₂', 'Blue, 12,300 K', 'White, slightly brighter', 'Modern-like; smoky more often'],
['66.1 Ma, Late Cretaceous', 'Same blue as today', 'White', 'Modern'],
['66 Ma, impact winter', 'Dim amber-beige, 4,800 K', 'Beige', 'None; dome fades to brown'],
['1.78 Ma, ζ Oph supernova', 'Same blue as today', 'White', 'Modern; a magnitude −11.6 supernova low in the south'],
['342 ka, Geminga supernova', 'Same blue as today', 'White', 'Modern; a magnitude −11 supernova in Orion that casts shadows'],
['1816, volcanic year', 'Milky blue-white, 8,600 K', 'White, 6,300 K', 'Salmon Sun, pink-lavender afterglow'],
['1900, dark nights', 'Same blue as today', 'White', 'Modern; no city glow after dark'],
['1980–2000, ozone-hole spring', 'Blue, still', 'White', 'Pale blue dusk zenith, ~9,900 K'],
['Today, clean', 'Blue, 13,800 K', 'White, 7,000 K', 'Orange horizon, pink-lavender antisolar; twilight zenith ~24,000 K'],
['Today, polluted city', 'Pale gray-blue, 7,700 K', 'Warm white, 5,800 K', 'Sun lost in gray murk before the horizon'],
['2100, megaconstellation', 'Same blue as today', 'White', 'About two thousand datacenters along the dusk terminator, plus a few hundred communications satellites'],
]

LIMB_TEXT = ("To show latitude and altitude at once, these renderings look at Earth from space with the Sun behind the viewer at "
             "the equinox, so the solar zenith angle at every point equals its latitude (equator at the center line, poles at top "
             "and bottom). The shell around the disk is the atmosphere's limb: the color of light scattered toward the viewer along "
             "a tangent ray at each altitude, computed with the same model. The atmosphere is drawn 30 times too thick, so 100 km "
             "spans half an Earth radius; a real limb is a hairline. The disk shows the planet's reflected color over a dark ocean "
             "(over ice for Snowball Earth), with limb brightness compressed so faint upper layers remain visible.")

CAVEATS = [
"Paleoatmospheric compositions carry order-of-magnitude uncertainty, and the haze optical properties are taken from "
"Titan-analog tholins; the three haze cases bracket that uncertainty. Aerosol loads for every pre-Cenozoic epoch are "
"educated guesses, and the proto-Earth's air before the last giant impact is unconstrained. The color-matching "
"functions use an analytic fit, and colors are shown without chromatic adaptation, so the tints represent what a "
"modern camera set to daylight balance would record rather than what an adapted observer would “see” (an adapted "
"eye would perceive the hazy Archean sky as nearer to white and the modern sky as bluer than shown). Clouds are "
"omitted from the radiative transfer throughout. Orders of scattering past the fourth are spread evenly in all "
"directions, which leaves the hazy skies' zenith up to 18% bright in twilight, and the blue of the 30-bar Hadean sky "
"is checked against no other code: CalcMySky's had not converged after 60 orders of scattering.",
"Between the epochs the air follows curves fitted through the epochs' own values and the few dated steps the "
"record gives ({ref:method-time}); the real air wandered between them, and the events' dates and durations carry "
"the uncertainties their sources state, tens of millions of years for the Neoarchean haze episodes. The grid of "
"precomputed airs is set so that blending misses the air between by about 5% in luminance and 0.002 in "
"chromaticity at most. Beyond the colors, the strengths of the ancient airglow, aurorae, coronae, meteor, shower and "
"comet rates and zodiacal dust are estimates set to show the trend, as each section says; the lunar eclipses, the "
"Moon's orbit and the stars' motions over the last two million years are computed, and the eclipse shadow assumes "
"today's cloud tops in every epoch. Several things are drawn for the eye rather than to scale: the Sun and Moon at "
"four times their size (so eclipses are found and timed with the enlarged disks), the sunset's dispersion up to 24 "
"times, and the limb darkening at a fifth of its strength. Some things cannot be known and are drawn at random: where "
"the planets stood on a given day more than 10,000 years from today, and every star more than about two million "
"years back, where the stars are stand-ins of today's kinds passing the Sun. The Earth's axis turns by the long-term "
"precession of Vondrák, Capitaine &amp; Wallace (2011) within 200,000 years of each epoch's year, from today's "
"direction and tilt at that year, since its phase long ago cannot be pinned down. The Milky Way's dark clouds, star "
"clouds and young-star fields before 30 Ma are likewise stand-ins, and its evolution is a smooth model fitted to the "
"Galaxy's history. The scenery and the clouds are drawn, not modeled, and the invented faces of Theia, proto-Mercury, Anteros, Enyo and the molten "
"Moon are illustrations of what such worlds would be like.",
]

def epochs_table_rows():
    """The atmospheres, from epochs.py (the model's own inputs)."""
    names = {'protoearth455': '4.55 Ga proto-Earth', 'hadean45': '4.5 Ga Hadean', 'hadean40': '4.0 Ga Hadean', 'archean38': '3.8 Ga Archean',
             'archean27clear': '2.7 Ga clear Neoarchean', 'archean27thin': '2.58 Ga thin haze', 'archean27': '2.52 Ga thick haze',
             'archean27vthick': '2.52 Ga very thick haze', 'proterozoic22': '2.2 Ga post-GOE', 'snowball07': '700 Ma Snowball',
             'cryogenian65': '650 Ma Cryogenian', 'ordovician466': '466 Ma Ordovician', 'carbon30': '300 Ma Carboniferous',
             'kpg66': '66 Ma impact winter', 'volcanic': '1816 volcanic year', 'ozonehole': '1980–2000 ozone-hole spring',
             'modern': 'Modern, clean', 'modernpoll': 'Modern, polluted'}
    sub = {'CO2': 'CO₂', 'N2': 'N₂', 'O2': 'O₂', 'H2O': 'H₂O', 'CH4': 'CH₄', 'Ar': 'Ar'}
    modern_gas = BY_KEY['modern']['gas']
    rows = []
    for k, nm in names.items():
        e = BY_KEY[k]
        gas = 'modern air' if e['gas'] == modern_gas and k != 'modern' else ', '.join(f'{sub[g]} {v:g}' for g, v in e['gas'].items())
        if e.get('dust'): gas += f' (+dust {e["dust"]:g})'
        oz = e['ozone']; oz = oz['Mid-latitude'] if isinstance(oz, dict) else oz
        f = lambda v: f'{v:g}' if v else '–'
        rows.append([nm, gas, f'{oz:g}', f'{e["aer"][0]:.2f}', f(e.get('haze')), f(e.get('sulf')), f(e.get('soot')), f'{e["sun"][0]}', f'{e["sun"][1]:g}'])
    return rows
EPOCHS_HEAD = ['Epoch', 'Gas (bar)', 'O₃ (DU)', 'AOD', 'Haze', 'Sulfate', 'Soot', 'T<sub>eff</sub> (K)', 'L/L☉']
EPOCHS_CAPTION = ("Atmospheres used for each epoch. Gas amounts are partial pressures in bar; AOD is tropospheric aerosol optical "
                  "depth at 550 nm; haze, sulfate and soot are column optical depths at 550 nm; T<sub>eff</sub> and L/L☉ are the "
                  "assumed solar effective temperature and luminosity relative to today. The Late Cretaceous, the supernova epochs, "
                  "1900 and 2100 have today's clean air; the site draws the air of their year, which differs from today's by at most "
                  "a tenth more aerosol at 66 Ma and a Sun half a percent fainter.")

# The sky-color panels, one per epoch: the HTML draws domes and strips from the colors, the paper
# includes make_figs.py's figure of the same.
def sky_fig(k): return 'modern' if k in SAME_AIR else k
# Where the report already tells an epoch's story in a section, its panel says so instead of repeating it.
# The site, which has no such sections, keeps PROSE.
PAPER_PROSE = {
'y2100': "The air is today's. What changes is the traffic: the filed megaconstellations and, above them, the Sunrise "
"orbital datacenters, some 1,600 brighter than fifth magnitude an hour after sunset in a band along the "
"terminator, fading from view two hours after it (Satellites, {ref:people}).",
}
def paper_prose(k): return PAPER_PROSE.get(k, PROSE[k])
def epoch_panel(k):
    r = byk[k]
    domes = ''.join(dome(r['lat'][L], L) for L in ['Equator','Mid-latitude','Polar summer'])
    ss = strip(r['sunset'], ['solar_horizon','above_sun','zenith','anti_15','anti_horizon'], ['sun horizon','15° up','zenith','15° up','antisolar'], Yss, 'Sun on horizon')
    tw = strip(r['twilight'], ['solar_horizon','above_sun','above_sun30','zenith','anti_horizon'], ['sun horizon','15° up','30° up','zenith','antisolar'], Ytw, 'Sun 4° below horizon')
    sunset_sun = r['sunset']['sun']['hex'] if r['sunset']['sunY'] > 1e-8 else None
    sundot = f'<i class="sundot" style="background:{sunset_sun}"></i> setting Sun disk' if sunset_sun else '<i class="sundot" style="background:#111"></i> Sun not visible at the horizon'
    h = (f'<section class="epoch" id="{k}"><header><span class="age">{ages[k]}</span><h4>{r["name"]}</h4><p class="sub">{R.link_cites(r["sub"], BIB, "html")}</p></header>'
         f'<div class="domes">{domes}</div><div class="strips">{ss}{tw}<p class="sundisk">{sundot}</p></div><p class="prose">{R.link_cites(paper_prose(k), BIB, "html")}</p></section>')
    t = (f"\\par\\vspace{{6pt}}\\noindent\\begin{{minipage}}{{\\linewidth}}\n{{\\normalsize\\bfseries {D.tex(r['name'])}\\par}}\n"
         f"{{\\small\\itshape {D.tex(r['sub'])}\\par}}\\vspace{{3pt}}\n\\centering\\includegraphics[width=\\linewidth]{{figures/sky_{sky_fig(k)}.png}}\n"
         f"\\captionof{{figure}}{{{D.tex(r['name'])}. Top: noon sky dome at the equator, mid-latitude and polar summer, zenith at top, horizon at bottom, Sun's disk in its own color. Below: sky from the solar horizon to the antisolar horizon with the Sun on the horizon and $4^\\circ$ below it.}}\\label{{fig:sky-{k}}}\n"
         f"\\end{{minipage}}\\par\\vspace{{4pt}}\n{D.tex_text(paper_prose(k), BIB)}\n")
    b = D.raw(h, t); b['figures'] = [f'fig:sky-{k}']
    return b

GL = ['modern','archean38','archean27','hadean45','snowball07','carbon30','kpg66','volcanic']
GL_SHORT = {'modern':'Modern','archean38':'3.8 Ga, clear Archean','archean27':'2.52 Ga, hazy Neoarchean','hadean45':'4.5 Ga, 30-bar CO$_2$','snowball07':'700 Ma, Snowball','carbon30':'300 Ma, Carboniferous','kpg66':'66 Ma, impact winter','volcanic':'1816, volcanic year'}
def globes_block():
    grid = ''
    for i, k in enumerate(GL):
        grid += f"\\begin{{minipage}}[t]{{0.235\\linewidth}}\\centering\\includegraphics[width=\\linewidth]{{figures/globe_{k}.png}}\\\\[-1pt]{{\\scriptsize\\sffamily\\bfseries {GL_SHORT[k]}}}\\end{{minipage}}"
        grid += "\\hfill\n" if i not in (3, 7) else "\\\\[6pt]\n"
    cap = ("Volumetric renderings of the atmosphere at eight epochs. Equinox geometry with the Sun behind the viewer; the shell is the limb "
           "color along tangent rays, drawn 30 times too thick (100 km spans half an Earth radius); the disk is the planet's reflected color "
           "over ocean (ice for Snowball Earth). Limb brightness is compressed so faint upper layers remain visible.")
    t = '\\begin{figure*}[tp]\\centering\n' + grid + '\\caption{' + D.tex(cap) + '}\\label{fig:globes}\n\\end{figure*}\n'
    t += '{\\footnotesize\n' + ''.join(f"\\textbf{{{D.tex(byk[k]['name'])}.}} {D.tex(LIMB_CAP[k])}\n\n" for k in GL) + '}\n'
    h = limb_html.replace('</div>\n<script>', f'</div><p class="tcap"><b>{{ref:fig:globes}}.</b> {cap}</p>\n<script>', 1)
    b = D.raw(h.replace('<div class="globes">', '<div class="globes" id="fig:globes">', 1), t); b['figures'] = ['fig:globes']
    return b

def appendix_block():
    rows = []
    for k in order:
        if k in SAME_AIR: continue
        r = byk[k]
        for Ln in ['Equator','Mid-latitude','Polar summer']:
            d = r['lat'][Ln]
            rows.append([r['name'], Ln, f"{d['zenith']['x']:.3f}, {d['zenith']['y']:.3f}", f"{int(d['zenith']['cct']):,}",
                         f"{d['horizon']['x']:.3f}, {d['horizon']['y']:.3f}", f"{int(d['horizon']['cct']):,}",
                         f"{d['sunY']/byk['modern']['lat']['Equator']['sunY']:.2g}"])
    head = ['Epoch', 'Latitude', 'Zenith (x, y)', 'CCT (K)', 'Horizon (x, y)', 'CCT (K)', 'Sun']
    cap = ("CIE 1931 chromaticity (x, y) and correlated color temperature of the noon zenith and horizon sky, and direct-Sun "
           "brightness relative to the modern equatorial Sun. The Late Cretaceous, the supernova epochs, 1900 and the Year 2100 "
           "have today's clean air and share its rows.")
    body = '\n'.join(' & '.join(D.tex(c) for c in r) + r' \\' for r in rows)
    t = ('\\onecolumn\n\\section*{Appendix A: computed chromaticities}\\label{app:chroma}\n\\scriptsize\n\\rowcolors{2}{rowa}{white}\n\\begin{longtable}{@{}llllllr@{}}\n'
         '\\caption{' + D.tex(cap) + '}\\label{tab:chroma}\\\\ \\toprule\n' + ' & '.join(D.tex(h) for h in head) + ' \\\\ \\midrule \\endfirsthead\n'
         '\\toprule ' + ' & '.join(D.tex(h) for h in head) + ' \\\\ \\midrule \\endhead\n' + body + '\n\\bottomrule\n\\end{longtable}\n')
    h = ('<h2 class="part" id="appendix">Appendix A: computed chromaticities</h2><div class="wrap" id="tab:chroma"><table><caption><b>{ref:tab:chroma}.</b> ' + cap + '</caption><tr>'
         + ''.join(f'<th>{x}</th>' for x in head) + '</tr>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows) + '</table></div>')
    b = D.raw(h, t); b['tables'] = ['tab:chroma']
    return b

# Appendix B: our sky model against CalcMySky (calcmysky_check.py; the CalcMySky spectra are in data/calcmysky/).
CMS_INTRO = (
"CalcMySky (Kabatsayev 2025) is the atmosphere code behind ShowMySky, the optional sky model Stellarium has shipped "
"since version 1.0 (Zotti &amp; Wolf 2023). It follows the precomputed atmospheric scattering of Bruneton &amp; Neyret "
"(2008): a command-line tool, <em>calcmysky</em>, precomputes a model on the GPU from a plain-text description of the "
"atmosphere, and a runtime library, <em>libShowMySky</em>, renders it in real time for any geometry. It is meant for "
"unusual atmospheres too, Mars among its samples, which makes it the natural independent check on ours. There is no "
"refereed paper on CalcMySky itself; Zotti &amp; Wolf describe it in Stellarium. {ref:tab:calcmysky-methods} sets the "
"two approaches side by side.")
CMS_METHODS_CAP = "Our sky model (<em>skymodel.py</em>) and CalcMySky v0.4.0."
CMS_METHODS = [
("Geometry", "Spherical shell, straight rays, observer on the ground",
 "Spherical shell, straight rays, observer at any altitude up to the top of the atmosphere"),
("Single scattering", "Integrated numerically along each view ray, with the columns toward the Sun at every point and the Earth's shadow",
 "Exact, in a precomputed four-dimensional texture"),
("Multiple scattering", "A table over altitude and the Sun's local elevation (Hillaire 2020), gathered from each node by rays in "
 "576 directions; all orders solved exactly as a linear system per wavelength, with the ground lit by the scattered light too; "
 "orders 2–4 keep their directions and later orders are spread evenly. The altitudes adapt so that no two neighbors are more "
 "than 0.3 apart in optical depth",
 "Every order computed explicitly in spherical geometry, with its directions, up to a set number of orders (the sample Earth "
 "uses 4, Mars 8)"),
("Spectrum", "41 wavelengths, 380–780 nm", "Set by the user; its samples use 16 wavelengths, 360–830 nm"),
("Constituents", "Rayleigh gas mix, ozone (Serdyuchenko et al. 2014), tropospheric aerosol, sulfate, tholin haze, soot and "
 "dust, each with its own profile, spectral optical depth and single-scattering albedo",
 "Any number of scatterers, each with a density profile and a phase function written in GLSL, a cross-section with an "
 "Ångström exponent and a spectral single-scattering albedo; absorbers with spectral cross-sections"),
("Phase functions", "Rayleigh and Henyey–Greenstein", "Anything written in GLSL, chromatic or not"),
("Surface", "Lambertian, albedo 0.08, 0.18 or 0.70 by latitude", "Lambertian, one albedo spectrum over the whole globe"),
("Inhomogeneity", "Cloud-shadow shafts, computed apart from the sky's radiative transfer ({ref:crepuscular-rays})",
 "None: the atmosphere is spherically symmetric"),
("Refraction", "None in the sky's radiance; exact in the lunar eclipse's ray trace and the setting Sun's image", "None"),
("Solar eclipses", "Drawn over the computed sky ({ref:solar-eclipses})",
 "In the radiative transfer, up to the second order of scattering"),
("Output", "Precomputed per air: 34 solar zenith angles × 9 view zenith angles × 10 azimuths × 3 latitudes, interpolated on the site",
 "Any geometry in real time, from the textures"),
("Validation", "Against measured modern colors, and against CalcMySky (below)",
 "The method family is evaluated against libRadtran and measured skies by Bruneton (2017)"),
]
CMS_CHECK = [
"Each epoch's atmosphere, as our model builds it, is written out as a CalcMySky description (<em>calcmysky_check.py</em>): "
"every component's own vertical profile, its optical depth as a power law in wavelength (fitted to within 10⁻¹³), its "
"spectral single-scattering albedo and its phase function, ozone as an absorber with the same cross-sections, the "
"epoch's Sun as the same Planck spectrum, a ground albedo of 0.18, and 44 wavelengths from 380 to 810 nm. CalcMySky's "
"radiance textures are read back at the ground on the grid the site uses, with single and multiple scattering kept "
"apart, and compared with ours at mid-latitude. CalcMySky ran 10 orders of scattering for the modern and hazy Archean "
"skies, 20 for the very thick haze and the impact winter, and up to 60 for the 30-bar Hadean.",
"Single scattering checks the setup: ours matches CalcMySky's within 0.7% in every epoch until the Sun is 4° below the "
"horizon. Further down, where nearly all the light has been scattered more than once, the two differ by 10% or more, "
"which hardly changes the total. The inputs are therefore the same, and what differs is the multiple scattering "
"({ref:tab:calcmysky-zenith}, {ref:fig:calcmysky}).",
]
CMS_ZEN_CAP = "Zenith luminance, ours ÷ CalcMySky, at mid-latitude. τ<sub>450</sub> is the total optical depth at 450 nm."
CMS_ZEN_HEAD = ["Solar zenith angle", "Modern (τ<sub>450</sub> 0.34)", "Hazy Archean, 2.52 Ga (0.91)",
                "Very thick haze (1.8)", "K–Pg impact winter (1.7)"]
CMS_ZEN = [("0°", "1.01", "1.00", "1.01", "1.00"), ("30°", "1.01", "1.02", "1.03", "1.02"),
           ("60°", "1.01", "1.04", "1.07", "1.04"), ("84°", "1.00", "1.06", "1.10", "1.04"),
           ("90°", "1.00", "1.07", "1.10", "1.04"), ("93°", "0.99", "1.05", "1.05", "1.02"),
           ("96°", "1.00", "1.15", "1.14", "1.04"), ("100°", "1.01", "1.18", "1.15", "1.06"),
           ("104°", "1.01", "1.16", "1.09", "1.03"), ("108°", "1.02", "1.10", "0.99", "1.02")]
CMS_FIG_CAP = ("Zenith luminance against the Sun's zenith angle (top) and its ratio to CalcMySky (bottom), for our model "
               "(“New”), CalcMySky, and the delta-Eddington two-stream term (Toon et al. 1989) that carried our multiple "
               "scattering before, the same in every direction and faded by hand past a solar zenith angle of 80°.")
CMS_RESULTS = [
("The modern sky",
 "agrees within 3% at the zenith from noon until the Sun is 20° down, and the zenith's chromaticity within 0.002, through "
 "the ozone blue of deep twilight, which takes the zenith to about (0.20, 0.20). At the horizon (view zenith angle 84°) it "
 "agrees within 0.99–1.08 on the side toward the Sun until the Sun is 10° down, and within 0.93–1.01 on the side away from "
 "it throughout. Across the whole sky it agrees within 0.90–1.10 in brightness and 0.006 in chromaticity until the Sun is "
 "6° down. Below that, a few directions low on the Sun's side, toward the last sunlit air, differ by up to a factor of 3."),
("The hazy skies",
 "run bright at the zenith: by 0–10% by day, and by up to 18% in twilight. Their zenith chromaticity agrees within 0.006 "
 "until the Sun is 20° down, through the Archean's deep-twilight orange, and the whole sky's within 0.021. At the horizon, "
 "the side toward the Sun agrees within 0.92–1.04 until sunset. It then falls to 0.78–0.84 of CalcMySky by the time the "
 "Sun is 10° down, and to 0.5–0.7 at 20° in the two thickest skies. The side away from the Sun stays within 0.82–1.07. "
 "The excess comes from spreading the fifth and later orders evenly: with the hazes made isotropic in both models, ours "
 "matches CalcMySky within 5% at the zenith until the Sun is 20° down. Raising CalcMySky's own resolution moves its result "
 "by 0–5% at the zenith."),
("The 30-bar Hadean",
 "(τ ≈ 12 at 450 nm) is where CalcMySky stops being a reference. A thick, nearly lossless layer needs on the order of τ² "
 "orders of scattering. From 30 to 60 orders, CalcMySky's zenith multiple scattering still grew 2.8× at 380 nm, 1.6× at "
 "450 nm and 4% at 600 nm, while from 650 nm up its whole sky changed by 1% or less. Sixty orders took 2.6 hours on an "
 "RTX 3080. In the converged 650–750 nm, our zenith is 0.95–1.09 of CalcMySky from noon until the Sun is 10° down. Our "
 "horizon is brighter than CalcMySky's, by up to 7% at 750 nm, 12% at 700 nm and 22% at 650 nm, and its brightest "
 "direction is 1.46× CalcMySky's. Our solve sums every order, so its blue is converged by construction. It is checked "
 "instead against the delta-Eddington two-stream flux at the ground, which is good in so thick a layer, and agrees with "
 "it within 3–5% from 450 nm up."),
]
CMS_FURTHER = (
"CalcMySky follows every order of scattering with its directions, where ours spreads the fifth and later orders evenly. "
"It renders any geometry in real time, from any altitude, with solar eclipses in the radiative transfer and phase "
"functions of any shape, and every atmosphere goes through exactly the same calculation, so atmospheres differ only in "
"their inputs. Its cost grows with the number of orders, though, which puts the blue of an atmosphere as thick as the "
"Hadean's beyond it. Ours sums every order in one linear solve, so its cost hardly depends on how thick the air is: a "
"table takes about 15 s on the same GPU, or 59 s for the Hadean. Beyond the radiative transfer, ours carries what a "
"spherically symmetric model cannot (albedo that changes with latitude, the shadows of clouds, refraction where it "
"shows, in the eclipsed Moon and the setting Sun, and the views from space), and it adds the researched deep-time "
"atmospheres themselves and the color science on top: spectra, chromaticities and color temperatures, checked against "
"measured modern skies. CalcMySky supplies the machinery for any atmosphere, but each one still has to be written and "
"justified.")
CMS_FIG = FIGS / 'calcmysky_zenith.png'

def calcmysky_numbers():
    b = D.raw(); b['tables'] = ['tab:calcmysky-methods', 'tab:calcmysky-zenith']; b['figures'] = ['fig:calcmysky']
    return b

def calcmysky_html(nums):
    t = lambda s: D.html_text(s, nums, BIB)
    def table(label, cap, head, rows):
        n = nums[label]
        return (f'<div class="wrap" id="{label}"><table><caption><b>{n[0]} {n[1]}.</b> {t(cap)}</caption><tr>'
                + ''.join(f'<th>{h}</th>' for h in head) + '</tr>'
                + ''.join('<tr>' + ''.join(f'<td>{t(c)}</td>' for c in r) + '</tr>' for r in rows) + '</table></div>')
    n = nums['fig:calcmysky']
    return ('<h2 class="part" id="appendix-b">Appendix B: our sky model and CalcMySky</h2>'
            f'<p>{t(CMS_INTRO)}</p>'
            + table('tab:calcmysky-methods', CMS_METHODS_CAP, ['', 'Ours', 'CalcMySky'], CMS_METHODS)
            + '<h3 id="the-cross-check">The cross-check</h3>' + ''.join(f'<p>{t(s)}</p>' for s in CMS_CHECK)
            + table('tab:calcmysky-zenith', CMS_ZEN_CAP, CMS_ZEN_HEAD, CMS_ZEN)
            + f'<figure class="fig" id="fig:calcmysky"><img src="{D._img_data(CMS_FIG)}" alt="Zenith luminance against solar zenith angle, ours and CalcMySky">'
            f'<figcaption><b>{n[0]} {n[1]}.</b> {t(CMS_FIG_CAP)}</figcaption></figure>'
            + ''.join(f'<p><b>{h}</b> {t(s)}</p>' for h, s in CMS_RESULTS)
            + '<h3 id="where-each-goes-further">Where each goes further</h3>' + f'<p>{t(CMS_FURTHER)}</p>')

def calcmysky_tex():
    t = lambda s: D.tex_text(s, BIB)
    rows = lambda rr: '\n'.join(' & '.join(t(c) for c in r) + r' \\' for r in rr)
    zhead = (r'Solar zenith & Modern & Hazy Archean, 2.52 Ga & Very thick haze & K--Pg impact winter \\' + '\n'
             r'angle & ($\tau_{450}$ 0.34) & (0.91) & (1.8) & (1.7) \\ \midrule')
    return ('\n\\clearpage\n\\normalsize\n\\section*{Appendix B: our sky model and CalcMySky}\\label{app:calcmysky}\n\n'
            + t(CMS_INTRO) + '\n\n{\\small\n\\rowcolors{2}{rowa}{white}\n'
            '\\begin{longtable}{@{}p{0.15\\linewidth}p{0.4\\linewidth}p{0.4\\linewidth}@{}}\n'
            '\\caption{' + t(CMS_METHODS_CAP) + '}\\label{tab:calcmysky-methods}\\\\ \\toprule\n'
            '& Ours & CalcMySky \\\\ \\midrule \\endfirsthead\n\\toprule & Ours & CalcMySky \\\\ \\midrule \\endhead\n'
            + rows(CMS_METHODS) + '\n\\bottomrule\n\\end{longtable}}\n\n\\subsection*{The cross-check}\n\n'
            + '\n\n'.join(t(s) for s in CMS_CHECK) + '\n\n'
            '\\begin{table}[h]\\centering\\small\n\\caption{' + t(CMS_ZEN_CAP) + '}\\label{tab:calcmysky-zenith}\n'
            '\\rowcolors{3}{rowa}{white}\n\\begin{tabular}{@{}rcccc@{}}\\toprule\n' + zhead + '\n'
            + rows(CMS_ZEN) + '\n\\bottomrule\\end{tabular}\n\\end{table}\n\n'
            '\\begin{figure}[h]\\centering\\includegraphics[width=\\linewidth]{figures/' + CMS_FIG.name + '}\n'
            '\\caption{' + t(CMS_FIG_CAP) + '}\\label{fig:calcmysky}\n\\end{figure}\n\n'
            + '\n\n'.join('\\paragraph{' + h + '} ' + t(s) for h, s in CMS_RESULTS) + '\n\n'
            '\\subsection*{Where each goes further}\n\n' + t(CMS_FURTHER) + '\n')

BIB = R.BIB

def blocks():
    P, S, p, ps, fig, tab = D.part, D.sec, D.p, D.ps, D.figure, D.table
    B = []
    B.append(P('Introduction', 'intro'))
    B += ps(*rv.INTRO)
    B.append(tab(rv.EPOCH_HEAD, rv.epoch_rows(order, ages, byk), rv.EPOCH_CAPTION, 'tab:epochlist', spec='llrrrrY', small=True))
    B.append(S('Has this been done before?', 'done-before'))
    B += ps(*DONE_BEFORE)

    B.append(P('How the view is reconstructed', 'method'))
    B.append(S("The sky's colors", 'method-colors'))
    B += ps(*COLORS_METHOD)
    B.append(tab(EPOCHS_HEAD, epochs_table_rows(), EPOCHS_CAPTION, 'tab:epochs', spec='lYrrrrrrr', small=True))
    B.append(S('Between the epochs', 'method-time'))
    B += ps(*THROUGH_TIME)
    B.append(fig(FIGS / 'air_timeline.png', AIRTIME_CAPTION, 'fig:airtime'))
    B.append(S('The rest of the view', 'method-view'))
    B += ps(*rv.METHOD_VIEW)
    B.append(S('The ground', 'ground'))
    B += ps(*rv.SCENERY)

    B.append(P('The sky by day and at dusk', 'sky'))
    B.append(tab(SUMMARY_HEAD, SUMMARY, 'Summary of sky colors by epoch (mid-latitude noon unless stated).', 'tab:summary', spec='lYYY'))
    for title, text in FINDINGS:
        B.append(S(title)); B.append(p(text))
    B.append(S('The atmosphere from space', 'from-space'))
    B.append(p(LIMB_TEXT))
    B.append(globes_block())
    B.append(fig(view('kpg'), "Noon months after the Chicxulub impact, at 66 Ma: soot and sulfate turn the sky a dim, uniform amber-beige with no blue at all, about a fifth as bright as a clear sky, with almost no cloud.", 'fig:kpg', wide=False))
    B.append(S('Clouds')); B += ps(*RS['Clouds'])
    B.append(fig(view('archean'), "An afternoon at 2.52 Ga under the thick organic haze, as the site's first-person view draws it: a pale orange dome with almost no difference between zenith and horizon, the Sun a soft glow behind broken cumulus lit gold by its haze-reddened light.", 'fig:archean', wide=False))
    B.append(S('Crepuscular rays')); B += ps(*rv.SHAFTS)
    B.append(S('Rainbows')); B += ps(*RS['Rainbows'])
    B.append(S('Fog, fogbows and glories')); B += ps(*RS['Fog, fogbows and glories'])
    B.append(S('Ice halos')); B += ps(*RS['Ice halos'])
    B.append(fig(view('halos'), "A morning on Snowball Earth at 700 Ma, from mid-latitudes, the Sun 22° up through clear air full of "
                 "diamond dust: the 22° halo with its tangent arcs hugging its top and bottom, the sun dogs just outside it, the faint "
                 "46° halo, the circumzenithal arc high overhead, and the parhelic circle running level through the Sun. Each arc "
                 "is red on its side toward the Sun.", 'fig:halos', wide=False))

    B.append(P('The Sun', 'sun'))
    B.append(S('The young Sun')); B += ps(*rv.SUN_YOUNG)
    B.append(S('Sunspots')); B += ps(*RS['Sunspots'])
    B.append(tab(rs.SUNSPOT_HEAD, rs.SUNSPOT, rs.SUNSPOT_CAPTION, 'tab:sunspots', spec='p{2.3cm}rrrYrr'))
    B.append(S('The Sun close up')); B += ps(*rv.SUN_CLOSE)
    B.append(fig(ROOT.parent / 'latex' / 'figures' / 'sun_closeup.jpg', rv.SUN_CAPTION, 'fig:sun'))
    B.append(S('The setting Sun')); B += ps(*RS['The setting Sun'])
    B.append(S('Solar eclipses')); B += ps(*RS['Solar eclipses'])
    B.append(fig(view('eclipses'), "A total solar eclipse in five epochs, as the site's first-person view draws it: in each, the "
                 "first total eclipse after October 2026 on the page's calendar with the Sun at least 25° up (today's is the eclipse of "
                 "30 March 2033), cloud cleared. Left to right: the partial phase, 70 percent of the way from first to second contact; "
                 "the diamond ring, with a sliver of photosphere half a percent of the Sun's width left; mid-totality; and mid-totality "
                 "in a 75° view with the horizon. The close-ups share one scale (14° high), with the Sun and Moon at four times "
                 "their size as on the site, so the growing Moon shows, from about the Sun's width today to 1.15 times it at 2.2 Ga and 1.55 "
                 "times at 4.0 Ga, where it hides the inner corona; each frame is exposed as the site's view adapts to its light. "
                 "Totality's sky is the epoch's twilight: slate blue-gray with a sunset rim on the horizon today, at 300 Ma and at "
                 "2.2 Ga, amber over an orange horizon under the 2.52 Ga haze, which also dims the corona, and the hot young Sun's corona at 4.0 Ga is far larger and brighter. The young "
                 "Sun's spots show on the crescents at 2.52 and 4.0 Ga. At 4.5 Ga the Moon is eight times the Sun's width and the corona "
                 "hardly clears it.", 'fig:solar'))

    B.append(P('The Moon', 'moon'))
    B.append(S("The Moon's orbit through time")); B += ps(*rv.MOON_ORBIT)
    B.append(tab(rv.MOON_HEAD, rv.moon_table(), rv.MOON_CAPTION, 'tab:moon', spec='lrrrrrrrr'))
    B.append(S("The Moon's face")); B += ps(*rv.MOON_FACE)
    B.append(fig(view('hadean'), "An evening at 4.5 Ga. Through 30 bar of CO₂ and a near-overcast deck, the molten newborn Moon, 8 Earth radii away and 4° across, glows orange through cracks in its first crust, with its red aureole, over a hot steaming sea.", 'fig:hadean'))
    B.append(S('Moonlight')); B += ps(*rv.MOONLIGHT)
    B.append(S('Lunar eclipses')); B += ps(*RS['Lunar eclipses'])
    B.append(fig(FIGS / 'lunar_eclipse.png', rs.FIG_CAPTION, 'fig:lunar'))
    B.append(tab(rs.lunar_head(), rs.lunar_rows(), rs.LUNAR_CAPTION, 'tab:lunar', spec='Yrrrrrr'))

    B.append(P('The planets and their moons', 'planets'))
    B.append(S('Where the planets were')); B += ps(*rv.PLANETS_WHERE)
    B.append(S('The planets close up')); B += ps(*rv.PLANETS_CLOSE)
    B.append(fig(ROOT.parent / 'latex' / 'figures' / 'surfaces.jpg', rv.SURFACES_CAPTION, 'fig:surfaces'))
    B.append(S('Jupiter')); B += ps(*rv.JUPITER)
    B.append(fig(view('jupiter'), "Jupiter close up, as the site's telescope view draws it, each view turned so the equator lies level, "
                 "north up. Top: the Great Red Spot at its largest, about 35° long in 1879, when it was also reddest, and in "
                 "2026, about 12° long; in each Jupiter is shown on a night when the spot faces us. Bottom: the 2026 spot close "
                 "up, a vortex in the same flow as the belts and zones around it, which eddies marble and Kelvin–Helmholtz "
                 "billows roll along their edges.", 'fig:jupiter'))
    B.append(S('Saturn and its rings')); B += ps(*rv.SATURN)
    B.append(S("Neptune's clouds")); B += ps(*rv.NEPTUNE)
    B.append(S('The giants when young')); B += ps(*rv.YOUNG_GIANTS)
    B.append(fig(view('saturn'), "Saturn close up in the modern sky on 15 June 2017, at opposition, its rings filling the site's telescope view. The north pole is tilted 27° toward us, showing the hexagon around it, golden inside in the northern summer, with the polar vortex at its center. The belts are stirred by the flow drawn for Jupiter under Cassini's winds, calmer and muted by the haze. The rings are drawn from the Cassini occultation profile with single-scattering photometry; at opposition the globe's shadow on them lies hidden behind it.", 'fig:saturn'))
    B.append(S("The planets' moons")); B += ps(*rv.MOONS)

    B.append(P('The stars and the Galaxy', 'stars'))
    B.append(S('The stars moved back')); B += ps(*rv.STARS)
    B.append(S('Stars brighter than Sirius'))
    B.append(p(ENC_PROSE[0].replace('(table below)', '({ref:tab:encounters})')))
    B.append(tab(['Star', 'Type', 'Today: V, pc', 'Peak V (68% range)', 'Closest (pc)', 'Myr ago', 'Brighter than Sirius'], ENC_ROWS,
                 "Stars that outshone today's Sirius (V = −1.46) in the last 10 million years, traced back through the Galaxy from Hipparcos astrometry (XHIP; Anderson &amp; Francis 2012) with 2,000 draws over the measurement errors. Peak magnitudes are medians with the 68% range; the last column is the fraction of draws brighter than Sirius today. Brightness changes with distance only.",
                 'tab:encounters', spec='Yllrrrr'))
    B.append(p(ENC_PROSE[1]))
    B.append(S('The Milky Way, nebulae and galaxies')); B += ps(*rv.MILKY_WAY)
    B.append(S('Events on their dates', 'events')); B += ps(*rv.EVENTS)
    B.append(S('Supernovae, novae and eruptions', 'supernovae')); B += ps(*rv.SUPERNOVAE)
    B.append(tab(rv.TRANSIENT_HEAD, rv.transient_rows(), rv.TRANSIENT_CAPTION, 'tab:transients', spec='p{3.6cm}p{1.6cm}lrY', small=True))
    B.append(fig(view('geminga'), "The Geminga supernova 342,000 years ago, near magnitude −11 in Orion, a fifth of the full Moon's light from a single point, among the stars moved back along their measured motions.", 'fig:geminga', wide=False))

    B.append(P('The night and what crosses it', 'night'))
    B.append(S('Twilight and the night sky')); B += ps(*RS['Twilight and the night sky'][:-1])
    B.append(S('Noctilucent clouds')); B += ps(*RS['Noctilucent clouds'])
    B.append(S('Aurorae')); B += ps(*RS['Aurorae'])
    B.append(fig(view('aurora'), "An aurora over the young Earth at 3.8 Ga, from mid-latitudes, on an active night, drawn as a dark-adapted eye sees it: with no free oxygen, nitrogen's violet bands and pink lower border rather than today's green and red. The aurora is brightened for print, 100 times its luminance on the site, where a true night is too dim to reproduce on paper.", 'fig:aurora', wide=False))
    B.append(S('Meteors and meteor showers')); B += ps(*RS['Meteors'])
    B.append(S('Fireballs and impacts')); B += ps(*rv.IMPACTS)
    B.append(fig(view('proto_meteors'), "The proto-Earth's bombardment, at 4.55 Ga, from mid-latitudes, on a moonless world. Left: the "
                 "whole sky at one instant of a midnight on the site's fisheye dome (zenith in the middle, horizon at the rim, north up), "
                 "with about 18 meteors in the air at once, at 30,000 times today's rate, most of them slow asteroidal fireballs. Right: "
                 "a ground strike in the first-person view, 6.8 seconds into an 8.5-second fall at 13.5 km/s: a stony body about 120 m across, "
                 "magnitude −26.4, about as bright as the Sun, coming down 110 km away with 70 megatons, its dust trail "
                 "behind it, and its light filling the night sky with the Sun 22° below the horizon. The weather's clouds are "
                 "taken away for this view; the dust trail is drawn by the same cloud pass.", 'fig:protometeors'))
    B.append(S('Dust, comets and the Ordovician ring')); B += ps(*RS['Dust, comets and the Ordovician ring'])
    B.append(fig(view('ordovician'), "The night at 466 Ma, after the L-chondrite parent body's break-up: a hundred times today's fireballs, a bright zodiacal band, and the speculative ring of Tomkins, Martin &amp; Cawood (2024) as a faint arch.", 'fig:ordovician', wide=False))
    B.append(tab(rs.PHENOMENA_HEAD, rs.PHENOMENA, rs.PHENOMENA_CAPTION, 'tab:phenomena', spec='lp{2.1cm}YrYrr'))

    B.append(P('The sky people made', 'people'))
    B.append(S('City light')); B += ps(*rv.CITY)
    B.append(fig(view('city'), "A city night today, looking toward the city 2.8 km away, its towers along the horizon: sodium and LED glow at 18.8 mag/arcsec² hides all but the brightest stars.", 'fig:city', wide=False))
    B.append(S('The sky before electric light'))
    B.append(p("The volcanic year's towns burn oil lamps and candles: Britain then used about one six-thousand-five-hundredth of the artificial light per head that it used in 2000 (Fouquet &amp; Pearson 2006), so the town's glow on the sky is some ten thousand times fainter than a modern city's, and the Milky Way stands over the rooftops. The 1900 epoch, the dark nights, keeps that lamplight from the Pleistocene up to 1900, and the city of the later skies is only there once its glow has grown (<em>City light</em>)."))
    B.append(fig(view('town1815'), "A night in July 1815 under Tambora's young veil, among volcanic peaks with glowing summits: the towns' oil lamps barely touch the sky, and the Milky Way shows faintly above the peaks.", 'fig:town1815', wide=False))
    B.append(S('Aircraft')); B += ps(*rv.CONTRAILS)
    B.append(S('Satellites')); B += ps(*rv.SATELLITES)
    B.append(fig(view('sats2100'), "Dusk in 2100: the filed megaconstellations and the Sunrise orbital datacenters, still in sunlight above the darkening sky.", 'fig:sats2100', wide=False))

    B.append(P('Epoch by epoch', 'epochs'))
    B.append(p("The panels that follow are laid out identically so they can be compared at a glance. Each begins with the epoch's "
               "name and a one-line summary of the atmosphere assumed ({ref:tab:epochs} gives the full parameters). The upper row "
               "shows the noon sky dome at three latitudes, the equator, a mid-latitude site and the summer pole, with the zenith at "
               "the top of each swatch and the horizon at the bottom, the correlated color temperatures of both, and the Sun's disk "
               "drawn in its own color at its noon elevation, with a brightness that reflects how much of it survives the atmosphere. "
               "The two strips beneath trace the sky from the solar horizon across the zenith to the antisolar horizon with the Sun "
               "on the horizon and 4° below it. All swatches are shown at a brightness relative to today's clean sky, so a dim epoch "
               "reads as dim. The paragraph after each panel describes that epoch's sky and what else was in it."))
    for k in order: B.append(epoch_panel(k))

    B.append(P('Caveats', 'caveats'))
    B += ps(*CAVEATS)
    return B

ENC_ROWS = [[e['name'], e['sptype'], f"{e['v_now']:.2f}, {e['d_now']:.0f}", f"{e['peak'][1]:.2f} ({e['peak'][0]:.2f} to {e['peak'][2]:.2f})",
             f"{e['dmin'][1]:.1f}", f"{e['myr'][1]:.2f}", f"{e['p_sirius']*100:.0f}%"] for e in ENC]
RS = {title: paras for title, paras in rs.SECTIONS}

# ---------------------------------------------------------------------------------------------------
# The HTML report
# ---------------------------------------------------------------------------------------------------
CSS = '''
:root{--bg:#d9dbdf;--panel:#c9ccd2;--ink:#1c2230;--ink2:#464d5c;--rule:#9ea4b0;--swatch-bg:#7a7d84;--link:#2f5f9a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1e2128;--panel:#272b34;--ink:#e8e9ec;--ink2:#b3b7c0;--rule:#4a4f5b;--swatch-bg:#5c5f66;--link:#8fb4e6}}
:root[data-theme="dark"]{--bg:#1e2128;--panel:#272b34;--ink:#e8e9ec;--ink2:#b3b7c0;--rule:#4a4f5b;--swatch-bg:#5c5f66;--link:#8fb4e6}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Newsreader,Georgia,"Times New Roman",serif;font-size:19px;line-height:1.5;font-weight:300}
a{color:var(--link)} a.cite{text-decoration:none}
main{max-width:860px;margin:0 auto;padding:1.25rem 1rem 4rem}
h1{font-weight:300;font-size:clamp(2rem,6vw,3.4rem);line-height:1.05;margin:1.2rem 0 .5rem;letter-spacing:-.01em}
h1 em{font-style:italic;font-weight:300}
h2.part{font-size:1.9rem;font-weight:300;margin:2.6rem 0 .4rem;border-top:1px solid var(--rule);padding-top:1.4rem}
h3{font-weight:400;font-size:1.3rem;margin:2.2rem 0 .4rem}
h4{font-weight:400;font-size:1.15rem;margin:1.4rem 0 .3rem}
p{margin:.4rem 0 .9rem;max-width:62ch}
.lede{font-size:1.15rem;color:var(--ink2);max-width:60ch}
.byline{font-size:.95rem;color:var(--ink2)}
.toc{font-size:.95rem;columns:2;column-gap:2rem;margin:1rem 0 1.5rem}
.toc a{display:block;text-decoration:none;padding:.1rem 0}
.box{background:var(--panel);padding:.6rem 1rem .4rem;margin:1.5rem 0}
.box h4{margin:.2rem 0 .4rem}
.box ol{margin:0 0 .4rem;padding-left:1.4rem;font-size:.97rem}
.box li{margin:.25rem 0}
.hero{display:flex;gap:3px;height:240px;margin:1.4rem 0 .4rem;background:var(--swatch-bg);padding:3px}
.hero-dome{flex:1;position:relative;display:block;text-decoration:none;min-width:0}
.hero-dome span{position:absolute;font-size:.6rem;color:rgba(0,0,0,.65);writing-mode:vertical-rl;transform:rotate(180deg);right:2px;bottom:6px;height:70px}
.hero-caption{font-size:.9rem;color:var(--ink2);margin-bottom:2rem}
.fig{margin:1.2rem 0 1.4rem;background:#05060a;padding:.5rem}
.fig img{width:100%;height:auto;display:block}
.fig figcaption,.tcap{font-size:.88rem;color:#d7dae0;line-height:1.35;margin-top:.4rem}
.tcap{color:var(--ink2)}
.epoch{border-top:1px solid var(--rule);padding:1.4rem 0 1.2rem}
.epoch header{display:grid;grid-template-columns:5.2rem 1fr;column-gap:.8rem;align-items:baseline}
.epoch header h4{margin:.1rem 0}
.epoch .age{font-size:1.05rem;color:var(--ink2);font-variant-numeric:tabular-nums}
.epoch .sub{grid-column:2;color:var(--ink2);font-size:1rem;margin:.1rem 0 .9rem}
.domes{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;background:var(--swatch-bg);padding:.6rem}
.dome{margin:0}
.dome .sky{position:relative;height:150px;overflow:hidden}
.dome figcaption{font-size:.85rem;color:#f2f3f5;margin-top:.35rem;line-height:1.25}
.dome figcaption small{display:block;font-size:.72rem;color:#d3d6dc}
.sun{position:absolute;left:58%;border-radius:50%;transform:translate(-50%,-50%)}
.nosun{position:absolute;bottom:6px;left:6px;font-size:.7rem;color:rgba(0,0,0,.55);font-style:italic}
.strips{background:var(--swatch-bg);padding:.6rem;margin-top:.5rem}
.strip{display:grid;grid-template-columns:7.2rem 1fr;align-items:center;gap:.5rem;margin-bottom:.45rem}
.striplabel{font-size:.82rem;color:#f2f3f5;line-height:1.2}
.cells{display:grid;grid-template-columns:repeat(5,1fr);height:44px;gap:2px}
.cell{position:relative}
.cell b{position:absolute;left:3px;bottom:2px;font-weight:400;font-size:.62rem;color:rgba(0,0,0,.55);font-style:italic}
.sundisk{font-size:.82rem;color:#f2f3f5;margin:.2rem 0 0}
.sundot{display:inline-block;width:.8em;height:.8em;border-radius:50%;vertical-align:-1px;margin-right:.3em}
.prose{margin-top:1rem}
.globes{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;margin:1rem 0 .5rem}
.globe{margin:0;background:#05060a;padding:.5rem}
.globe canvas{width:100%;height:auto;display:block}
.globe figcaption{font-size:.88rem;color:#d7dae0;line-height:1.35;margin-top:.4rem}
.globe figcaption b{font-weight:400;color:#fff;display:block}
table{border-collapse:collapse;width:100%;font-size:.92rem;margin:.5rem 0 1rem}
caption{caption-side:bottom;text-align:left;font-size:.88rem;color:var(--ink2);padding-top:.4rem}
td,th{text-align:left;padding:.35rem .5rem;border-bottom:1px solid var(--rule);vertical-align:top;font-weight:400}
th{color:var(--ink2);font-weight:300}
.wrap{overflow-x:auto}
.refs{font-size:.9rem;color:var(--ink2)}
.refs p{margin:.3rem 0;max-width:none}
@media (max-width:560px){
 body{font-size:17px} .hero{height:170px} .epoch header{grid-template-columns:1fr} .epoch .sub{grid-column:1}
 .strip{grid-template-columns:1fr} .dome .sky{height:110px} .domes{gap:.35rem;padding:.4rem} .globes{grid-template-columns:1fr} .toc{columns:1}
}
@media print{ .globe,.domes,.strips,table,.hero,.fig{break-inside:avoid} h3,h4,.epoch header{break-after:avoid} .epoch{padding-top:1rem} .epoch .prose{orphans:3;widows:3} }
'''

def number_html(body):
    """Number the parts and sections (1, 1.1, ...) as the paper does, and list the parts."""
    toc, n = [], [0, 0]
    def h2(m):
        if m.group(2) in ('appendix', 'appendix-b', 'references'): return m.group(0)
        n[0] += 1; n[1] = 0
        toc.append((m.group(2), f'{n[0]}. {m.group(3)}'))
        return f'{m.group(1)}{n[0]}. {m.group(3)}</h2>'
    def h3(m):
        n[1] += 1
        return f'{m.group(1)}{n[0]}.{n[1]} {m.group(2)}</h3>'
    out = []
    for piece in re.split(r'(<h2 class="part" id="[^"]+">.*?</h2>|<h3 id="[^"]*">.*?</h3>)', body):
        m2 = re.match(r'(<h2 class="part" id="([^"]+)">)(.*?)</h2>$', piece)
        m3 = re.match(r'(<h3 id="[^"]*">)(.*?)</h3>$', piece)
        out.append(h2(m2) if m2 else h3(m3) if m3 else piece)
    return ''.join(out), toc

def render_html(B, nums):
    body, toc = number_html(D.render_html(B, BIB, nums))
    appendix = D._refs_html(appendix_block()['html'], nums) + '\n' + calcmysky_html(nums)
    toc_html = '<nav class="toc">' + ''.join(f'<a href="#{i}">{t}</a>' for i, t in toc) + '<a href="#references">References</a><a href="#appendix">Appendix A</a><a href="#appendix-b">Appendix B</a></nav>'
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>A Complete History of the Earth's Sky</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body><main>
<h1>A Complete History of the Earth's Sky</h1>
<p class="lede">{LEDE}</p>
<p class="byline">James Guillochon · <a href="mailto:guillochon@gmail.com">guillochon@gmail.com</a> · October 2026</p>
<p class="byline">Interactive experience at <a href="https://earthsky.astrocrash.net">earthsky.astrocrash.net</a></p>
<div class="hero">{hero}</div>
<p class="hero-caption"><b>Figure 1.</b> Mid-latitude noon sky at the epochs with their own air, zenith (top) to horizon (bottom), oldest at left. Brightness is shown relative to today's clean sky. Before the Moon-forming impact the proto-Earth's dusty air is pale white overhead and peach toward the horizon, and the 30-bar CO₂ of the early Hadean turns the whole dome orange. Once the air thins the sky is blue overhead and white at the horizon, as today, unless something is added to it: the Neoarchean's organic haze turns it milky, then cream, then apricot as it thickens, the soot of the K–Pg impact winter turns it beige, and Tambora's sulfate veil and a polluted city's haze whiten it. Snowball Earth's is the deepest blue. Tap a column to jump to that epoch.</p>
{toc_html}
{body}
<h2 class="part" id="references">References</h2>
<div class="refs">
{R.html_list(BIB)}
</div>
{appendix}
</main></body></html>'''

# ---------------------------------------------------------------------------------------------------
# The LaTeX paper
# ---------------------------------------------------------------------------------------------------
PREAMBLE = r"""\PassOptionsToPackage{table}{xcolor}
\documentclass[9pt,twocolumn]{extarticle}
\usepackage[a4paper,margin=14mm,top=16mm,bottom=16mm,columnsep=7mm]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[scaled=0.92]{helvet}
\renewcommand{\familydefault}{\sfdefault}
\usepackage{needspace}
\usepackage{graphicx,float,booktabs,tabularx,array,amsmath,microtype,titlesec,caption,tcolorbox,longtable}
\usepackage[table]{xcolor}
\usepackage[colorlinks=true,citecolor=sky,linkcolor=sky,urlcolor=sky]{hyperref}
\usepackage[round]{natbib}
\definecolor{sky}{HTML}{2F6FBA}
\definecolor{dusk}{HTML}{C8562B}
\definecolor{ink}{HTML}{1C2230}
\definecolor{rowa}{HTML}{EEF2F7}
\titleformat{\section}{\Large\bfseries\color{sky}}{\thesection}{0.6em}{}[\vspace{-6pt}{\color{sky}\rule{\linewidth}{0.6pt}}]
\titleformat{\subsection}{\normalsize\bfseries\color{ink}}{\thesubsection}{0.5em}{}
\titleformat{\subsubsection}{\small\bfseries\color{ink}}{}{0pt}{}
\titlespacing{\section}{0pt}{10pt}{6pt}
\titlespacing{\subsection}{0pt}{8pt}{3pt}
\captionsetup{font={footnotesize,sf},labelfont={bf,color=sky},justification=raggedright,singlelinecheck=false,skip=3pt}
\setlength{\parskip}{3pt}\setlength{\parindent}{0pt}
\raggedbottom
\newcolumntype{Y}{>{\raggedright\arraybackslash}X}
\renewcommand{\arraystretch}{1.15}
\renewcommand{\dbltopfraction}{0.9}\renewcommand{\dblfloatpagefraction}{0.6}\renewcommand{\textfraction}{0.07}
\setlength{\tabcolsep}{4pt}
\begin{document}
"""

def render_tex(B):
    head = (r"""\twocolumn[
\begin{@twocolumnfalse}
\vspace*{-6mm}
{\color{sky}\fontsize{28}{30}\selectfont\bfseries A Complete History of the Earth's Sky\par}
\vspace{6pt}
{\large\color{ink} """ + D.tex(LEDE) + r"""\par}
\vspace{4pt}
{\small\color{gray} James Guillochon $\cdot$ \href{mailto:guillochon@gmail.com}{guillochon@gmail.com} $\cdot$ October 2026\par}
\vspace{2pt}
{\small\color{gray} Interactive experience at \href{https://earthsky.astrocrash.net}{earthsky.astrocrash.net}\par}
\vspace{8pt}
{\includegraphics[width=\linewidth]{figures/fig01_timeline.png}}
{\footnotesize\sffamily\textbf{\color{sky}Figure 1.} Mid-latitude noon sky at the epochs, zenith (top) to horizon (bottom), oldest at left. Brightness shown relative to today's clean sky. Before the Moon-forming impact the proto-Earth's dusty air is pale white overhead and peach toward the horizon, and the 30-bar CO$_2$ of the early Hadean turns the whole dome orange. Once the air thins the sky is blue overhead and white at the horizon, as today, unless something is added to it: the Neoarchean's organic haze turns it milky, then cream, then apricot as it thickens, the soot of the K--Pg impact winter turns it beige, and Tambora's sulfate veil and a polluted city's haze whiten it. Snowball Earth's is the deepest blue.\par}
\vspace{10pt}
\end{@twocolumnfalse}
]
\setcounter{figure}{1}
""")
    body = D.render_tex(B, BIB)
    tail = (r"""
\nocite{*}
\bibliographystyle{plainnat}
% Font expansion fails on the bibliography's small slanted Helvetica, a virtual font.
{\footnotesize\microtypesetup{expansion=false}\bibliography{refs}}

""" + appendix_block()['tex'] + calcmysky_tex() + "\\end{document}\n")
    return PREAMBLE + head + body + tail

def build():
    B = blocks()
    return B, D.numbering(B + [appendix_block(), calcmysky_numbers()], first_figure=2)

if __name__ == '__main__':
    import sys
    B, nums = build()
    page = render_html(B, nums)
    out = ROOT.parent / 'report' / 'view-from-earth.html'
    out.write_text(page, encoding='utf-8')
    tex = render_tex(B)
    (ROOT.parent / 'latex' / 'main.tex').write_text(tex, encoding='utf-8')
    (ROOT.parent / 'latex' / 'refs.bib').write_text(BIB, encoding='utf-8')
    missing = [b['path'].name for b in B if b['kind'] == 'fig' and not b['path'].exists()]
    left = R.unmatched([page])
    print(f'{len(page):,} bytes of HTML, {len(tex):,} of LaTeX; {len(nums)} figures and tables')
    if missing: print('missing figures:', ', '.join(missing))
    if left: print('citations with no reference:', '; '.join(left))
