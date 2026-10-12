"""The report's parts on what the site shows besides the sky's color and the phenomena of
report_sky.py: the Moon's orbit and face through time, the planets and their moons, the stars and
the Galaxy, and the things that come and go. gen_report.py renders them in the HTML report and the
LaTeX paper from the same text. The numbers are the site's (model/site_src/js), read from its code
where a table is made of them (site_consts.py) and quoted from it in the prose."""
import re
from site_consts import js_const

# ---------------------------------------------------------------------------------------------------
# The Moon
# ---------------------------------------------------------------------------------------------------
MOON_ORBIT = [
"The Moon raises tides on the Earth, and the tidal bulge, carried ahead of it by the Earth's spin, "
"pulls it forward: the Moon has been receding ever since it formed, today by 3.8 cm a year, while the "
"Earth's day lengthens. Run back, the Moon was closer and bigger, its month shorter, and the day "
"shorter too. We take the distance from Farhat et al. (2022), whose tidal model fits both the "
"present recession and the geological record of tidal rhythmites, back to 3.2 Ga, where Eulenfeld &amp; "
"Heubeck (2023) find 70% of today's distance in the Moodies Group rhythmites; older ages extend the "
"long-term drift. At 4.5 Ga, some ten million years after the giant impact, the Moon is still at about "
"8 Earth radii: Korenaga (2023) finds that a Moon whose magma ocean was still solidifying raised little "
"tide in itself and had receded only to 7 to 9 Earth radii by the time the ocean froze. "
"({ref:tab:moon} gives the numbers by epoch.)",

"The day follows from the distance by holding the Earth–Moon angular momentum fixed: a closer Moon means a "
"faster-spinning Earth. This reproduces the day lengths Farhat et al. (2022) give for their distances to "
"within a tenth of an hour, 21.9 hours at 700 Ma and 15.6 hours at 2.7 Ga, and at 4.5 Ga it gives "
"5.9 hours. The year is the same length in seconds in every epoch, since the Earth's orbit is set by the "
"Sun's mass, which has barely changed; so a year held 400 days in Snowball Earth, 562 at 2.7 Ga and "
"1,486 at 4.5 Ga. The month, by Kepler's third law, was 22.6 of today's days at 2.2 Ga and 15.3 at "
"4.0 Ga, still 28 to 31 of each epoch's own shorter days; at 2.7 Ga a year held about eighteen months, "
"as tidal rhythmites suggest. At 4.5 Ga the Moon went round in 32 hours, five and a half of that epoch's "
"days. The proto-Earth of 4.55 Ga has no Moon; how fast it turned before the impact cannot be known, and "
"its 12-hour day is a guess.",

"The orbit's tilt to the ecliptic also changed. We carry today's 5.15° back along these distances "
"with the semi-analytic tidal model of Ćuk et al. (2016): the Earth's tides tilt the orbit less as the Moon "
"recedes, and tides raised in the Moon itself damp the tilt, most strongly near 33 Earth radii, where the "
"Moon's own obliquity swings large. The orbit comes out a little steeper in the past, 5.5° at 2.7 Ga and "
"5.8° at 4.0 Ga; Ćuk et al. argue these are lower bounds, and the 17° to 30° and more that such models give "
"for the young Moon belong before 33 Earth radii, older than any epoch here but 4.5 Ga. Inside the Laplace "
"radius the orbit precesses about the Earth's equator rather than the ecliptic (Tremaine, Touma &amp; "
"Namouni 2009, eq. 24): 8.4 Earth radii for the present Earth. A fluid Earth spinning in 5.9 hours carries a "
"larger bulge, and the radius moves out by (24/5.9)<sup>2/5</sup>, to about 15 Earth radii, so the 4.5 Ga Moon "
"is drawn in the plane of the equator. The orbit was more eccentric too, "
"growing from today's 0.055 to about 0.1 at 4.0 Ga (Daher et al. 2021), after it had been through the "
"evection resonance. In the Ćuk &amp; Stewart (2012) example that resonance holds the eccentricity near 0.45 "
"from about 9,000 to 70,000 years, and by 4.5 Ga tides have damped the orbit nearly round again. "
"With the eccentricity the Moon rocks east and west each month "
"by about twice the eccentricity in radians, ±6.3° today and ±12° at 4.0 Ga, and north and south by its "
"obliquity, 6.7° today and 21° to 23° at 3.8 and 4.0 Ga, as it nears the Cassini-state transition; the "
"page draws the globe on these axes, so the Moon visibly librates.",

"The consequences show in the sky. At 3.8 Ga the Moon is one and a half times today's width and more than "
"twice as bright when full. At 4.5 Ga it is 4° across, seven and a half times today's width and 57 times "
"its area, and so close that it is placed as seen from the ground: it shifts 7° against the stars between "
"the horizon and the zenith. It crosses the sky in hours, rising and setting several times a day. In the "
"plane of the equator, it eclipses the Sun at every new Moon for weeks around each equinox, somewhere on "
"the Earth, and passes through the Earth's shadow, 14° across at its distance, at every full Moon.",
]

MOON_FACE = [
"The Moon's face is the Lunar Reconnaissance Orbiter's: the Wide Angle Camera's color mosaic, toned to "
"match a full-Moon photograph, and the Laser Altimeter's heights (NASA's CGI Moon Kit). The heights light "
"the slopes, cast shadows toward the terminator, and shape the limb, so a zoomed crescent shows a ragged "
"terminator and crater shadows, and the edge of the Moon in an eclipse breaks the last sunlight into "
"Baily's beads. Five globes cover the Moon's history ({ref:fig:surfaces}). Tycho, about 109 million years old (Stöffler &amp; Ryder 2001, from the exposure ages of Arvidson et al. "
"1976), is taken away with its rays for the epochs older than 109 Ma. Before about 3.9 Ga the maria had "
"not been flooded: basalts filled the great basins from about 3.9 Ga and most of them by 3.3 Ga "
"(Hiesinger et al. 2011), so each mare darkens over 150 million years from an onset just before its oldest "
"dated basalt. At 3.8 Ga Tranquillitatis is two-thirds dark, Serenitatis and Nectaris a third, and Imbrium "
"and Procellarum are still bright: the familiar face is not there yet. At 4.0 Ga the near side is "
"bright highland from limb to limb. At 3.8 Ga the eruptions themselves show: one to three fissure "
"eruptions a lunation glow on the night side, a few to a hundred square kilometers of lava at about "
"1,400 K, as bright per area as the sunlit Moon and far redder, magnitude +3 to −1 as seen from the Earth.",

"The Moon of 4.5 Ga is not yet solid. Its magma ocean is open at the top, some ten million years after the "
"impact: rafts of dark quench crust and the first pale anorthosite, floating a few hundred meters to a "
"kilometre and a half above the melt, broken by cracks and lava lakes at 1,400 to 1,600 K in four "
"generations of floes, each a network of cracks within the last. The lava shines about as brightly per "
"area as the sunlit Moon, so the disk glows orange by day and night alike, also inside the Earth's "
"shadow, and the air around it carries a red aureole. The map and its relief are made up; that the young "
"Moon looked like this is an inference from its magma ocean, not an observation.",

"The night side is drawn at a flat 6% of the lit side's brightness rather than with a modeled earthshine, "
"which the spectrum readout gives instead: about 2 × 10⁻⁴ of the day side when the Earth is full from "
"the Moon, and bluer.",
]

def moon_table():
    """The Moon by epoch, from the site's moon.js."""
    RE = js_const('moon.js', 'MOON_RE'); DAY = js_const('moon.js', 'DAY_HOURS')
    INC = js_const('moon.js', 'MOON_INC'); ECC = js_const('moon.js', 'MOON_ECC')
    INC0 = js_const('moon.js', 'MOON_INC_NOW'); ECC0 = js_const('moon.js', 'MOON_ECC_NOW')
    rows = []
    for k, name in (('modern', 'Today'), ('kpg66', '66 Ma'), ('carbon30', '300 Ma'), ('ordovician466', '466 Ma'),
                    ('snowball07', '700 Ma'), ('proterozoic22', '2.2 Ga'), ('archean27', '2.7 Ga'), ('archean38', '3.8 Ga'),
                    ('hadean40', '4.0 Ga'), ('hadean45', '4.5 Ga')):
        r = RE[k]; day = DAY.get(k, 24.0)
        width = 60.14 / r
        # Synodic month in today's days (moon.js synodic): the Moon's angular speed goes as the
        # distance to the -1.5 by Kepler's third law.
        month = 360 / (13.17639648 * (60.14 / r) ** 1.5 - 0.98564736)
        year = 365.24219 * 24 / day
        inc = 'equator' if k == 'hadean45' else f'{INC.get(k, INC0):.2f}°'
        rows.append([name, f'{r:.1f}', f'{width:.2f}×', f'{width**2:.2f}×' if width < 3 else f'{width**2:.0f}×', f'{day:.1f} h',
                     f'{year:,.0f}', f'{month:.1f} d ({month*24/day:.1f})', inc, f'{ECC.get(k, ECC0):.3f}'])
    return rows
MOON_HEAD = ['Epoch', 'Distance (R⊕)', 'Width', 'Full-Moon light', 'Day', 'Days a year', 'Month (own days)', 'Tilt to ecliptic', 'Eccentricity']
MOON_CAPTION = ("The Moon by epoch, as the site draws it. Distance in Earth radii (Farhat et al. 2022; Eulenfeld &amp; Heubeck "
                "2023; Korenaga 2023 at 4.5 Ga); width and full-Moon light relative to today's; the day from the Earth–Moon "
                "angular momentum held fixed; the month from new Moon to new Moon in today's days, and in brackets in the epoch's own; the orbit's "
                "tilt from the tidal model of Ćuk et al. (2016), in the plane of the equator at 4.5 Ga; the eccentricity after Daher "
                "et al. (2021). The 4.55 Ga proto-Earth has no Moon.")

# ---------------------------------------------------------------------------------------------------
# The planets and their moons
# ---------------------------------------------------------------------------------------------------
PLANETS_WHERE = [
"The five naked-eye planets, Uranus and Neptune are placed from JPL's approximate Keplerian elements "
"(Standish's table, valid 1800–2050) for the date and time, light-time corrected, on the same magnitude "
"scale as the stars (Meeus's formulae with the phase angle, Saturn's rings included when there are rings, "
"and Mallama &amp; Hilton 2018 for Uranus and Neptune), and dimmed by the young Sun's fainter light: 0.42 "
"magnitudes at 4.5 Ga, 0.24 at 2.7 Ga. Any planet brighter than magnitude −6 lights the sky as the Moon "
"does. In the historical and modern skies the positions are the real ones. Before history they cannot be "
"known: the Solar System is chaotic, its uncertainties growing tenfold every ten million years or so "
"(Laskar 1989), and every epoch's age is uncertain by far more than any planet's period. So each planet is "
"put at a random place on its orbit, the same for every visit to an epoch, and moves on with the date. "
"The orbits' shapes are today's, known to some 50 million years and statistically before.",

"The two oldest skies have a different Solar System. In the reading of the meteorites' bombardment ages "
"(Edwards et al. 2024; Liu, Raymond &amp; Jacobson 2022), the giant planets went unstable early, within the "
"first 100 million years; the 4.55 Ga sky shows them before it, in the best starting configuration of "
"Nesvorný &amp; Morbidelli (2012): Jupiter at 5.6 AU and Saturn at 7.34 AU in a 3:2 resonance, a fifth giant "
"at 9.62 AU, Uranus at 15.3 and Neptune at 20 AU, each in resonance with the next. The fifth giant, an ice "
"giant like Neptune that Jupiter threw out of the Solar System in the instability (Nesvorný 2011), is named "
"here Oceanus. For the 4.5 Ga sky we take the instability to have come late enough, near 4.5 Ga, to keep it; "
"the bombardment ages argue against that, as the 4.55 Ga sky's account says.",

"Theia, the Mars-sized body whose collision with the proto-Earth made the Moon, is a wandering planet in "
"the 4.55 Ga sky. Its orbit is made up, as any that would meet the Earth's will do, since where it lay "
"is not known (Branco, Machado &amp; Raymond 2025). Every 25 years or so it passes within a few hundredths "
"of an AU, and at its closest it reaches magnitude −8.5, half lit, brighter than any planet has been "
"since, lighting the night. Its face is invented too: an airless, cratered, iron-rich basaltic crust "
"(Meier, Reufer &amp; Wieler 2014), its steam atmosphere lost to the young Sun within a few tens of "
"millions of years (Odert et al. 2018), with eight great basins and a few young rayed craters.",

"The three largest asteroids are placed the same way, in every epoch: Vesta, which reaches magnitude 5.2 "
"and the naked eye, Ceres and Pallas. Their elements are fit here to JPL Horizons over 1800–2200, with "
"periodic terms in the mean longitude for Jupiter's pull (for Pallas, 0.9 degrees over 83 years), to a "
"tenth or two of a degree as seen from the Sun, and their brightness follows the H, G system of Bowell et "
"al. (1989) with JPL's values.",
]

PLANETS_CLOSE = [
"Zooming in acts as a telescope, gaining 5 magnitudes against the sky for each tenfold zoom (magnification spreads the sky's light and leaves a point a point), so faint moons and Uranus "
"and Neptune come out, and Mercury and Venus show by day. Each planet is a disk of its true angular "
"size and flattening, on its IAU pole and prime meridian, lit from the Sun's side, so the phases of "
"Mercury and Venus show; its limb darkens by a Minnaert law. Mercury and Mars wear spacecraft maps, "
"MESSENGER's color mosaic and Viking's, toned toward true color, with their relief from MESSENGER "
"(Becker et al. 2016) and the Mars Orbiter Laser Altimeter: slopes lit by the planet's own law, and rims "
"and peaks hiding the Sun, so a gibbous Mars shows the shadows of Tharsis and Olympus Mons near its "
"terminator and a half-lit Mercury a ragged, cratered one. Venus is cloud, cream and featureless, "
"bright in the crescent. The moons of Jupiter, Saturn and Uranus, and Triton, have their own maps "
"(Galileo, Voyager and Cassini mosaics), and cast their shadows on their planets, go dark in the planets' "
"shadows, and pass behind and in front of them. Of Uranus's five, as of Triton, Voyager 2 saw only the "
"southern halves, lit in 1986; the rest is filled in smooth, and since Uranus's north has turned toward "
"the Sun and the Earth, it is mostly that blank half that faces us now. Uranus has its ten narrow rings, "
"as French et al. (2024) fit them to thirty years of stellar occultations: each the ellipse of its orbit, "
"its periapse precessing (the ε ring's 406 km off-centre, turning once in nine months), its width "
"growing from periapse to apoapse (the ε ring's from 20 to 97 km) and its depth thinning to match, with "
"optical depths after Esposito et al. (1991). The particles are as dark as charcoal, so even the ε ring "
"is only a faint thread at the deepest zoom, as it is in a real telescope; the dusty rings, a "
"hundred-thousandth as thick, are left out. Ceres and Vesta wear Dawn's Framing Camera mosaics and "
"stand on its shapes: each is drawn as the spheroid that fits its shape best (Ceres 482 by 446 km, matching "
"Park et al. 2016; Vesta 281 by 226 km), with what is left of the shape, up to 23 km on Vesta, as relief "
"that lights the slopes and also bends the outline of the disk, so Vesta's south, cut by its great basins, "
"shows flattened and lumpy. Phobos has the Mars Express map and shape the same way, though it is never more "
"than a few pixels. Pallas, which no spacecraft has visited, is the spheroid of the shape from Marsset "
"et al. (2020), in its own faintly blue tint. {ref:fig:surfaces} shows every rocky surface the site draws.",
]

SURFACES_CAPTION = ("The rocky surfaces the site draws, each its own map on a globe lit from the left (surface_montage.py). "
"The large panels are the four bodies drawn with heights as well, shaded by their slopes at true scale: the Moon, "
"the Lunar Reconnaissance Orbiter's Wide Angle Camera color mosaic and Laser Altimeter heights (NASA's CGI Moon Kit); "
"Mercury, the USGS MESSENGER MDIS color mosaic and MESSENGER heights (Becker et al. 2016); Mars, the USGS Viking "
"color mosaic and the Mars Orbiter Laser Altimeter's gridded heights; and Theia, invented from what it was likely "
"made of (Meier, Reufer &amp; Wieler 2014). The Moon's older faces are today's with Tycho and its rays removed and "
"the maria part- or un-flooded (Hiesinger et al. 2011), on the same heights; the molten Moon is a model of its "
"magma ocean, glowing by its own light. Io, Europa, Ganymede and Callisto are the USGS Voyager and Galileo SSI "
"mosaics; Mimas, Enceladus, Tethys, Dione, Rhea and Iapetus are Cassini color maps (NASA/JPL-Caltech/SSI/LPI, "
"Schenk); Triton is Schenk's Voyager 2 map, its north, dark in 1989, filled in; Miranda, Ariel, Umbriel, "
"Titania and Oberon are the USGS Voyager 2 mosaics (T. Becker), their southern halves only, shown from below. Ceres and Vesta are Dawn's "
"Framing Camera mosaics and Phobos the Mars Express SRC mosaic (DLR, USGS), each on the spheroid the site "
"draws it as and shaded by its shape's heights over it (Vesta's north and Ceres's far south, dark when Dawn "
"mapped them, filled in). All are toned toward true color, "
"and each body is shown at its own exposure, so the panels do not compare in albedo.")

JUPITER = [
"Jupiter close up is drawn, not mapped: its clouds change too fast for any one map to stand for an "
"epoch. The bands lie where the Cassini wind profile (Porco et al. 2003) puts its jets, and the clouds "
"are a tracer stirred by eddies: each point is followed back along the streamlines of a stream function "
"of noise, three octaves of cells three times longer along the winds than across, renewing at different "
"times, its strength greatest in the belts and toward the poles and coming and going in storm patches some "
"45° long. The flow keeps area, so the belts and zones and the finer banding within them marble into "
"curls and filaments rather than creases, and the jets' own shear draws them out along the bands. Along "
"each boundary between a belt and a zone, Kelvin–Helmholtz billows roll up, turning the way of the shear "
"there. Dark festoons trail from the North Equatorial Belt into the Equatorial Zone with blue-gray hot "
"spots at their heads; dark barges sit on the belt's northern edge, and white ovals in the South South "
"Temperate Belt. The tracer approach follows the flow-field techniques of Dziewanowski (2024).",

"The Great Red Spot is a vortex in the same flow: an anticyclone turning the clouds along its ellipses, "
"faster toward its edge, with a slight inflow that draws belt and zone onto its rim as spiral arms, and "
"its turbulent wake to the west. Its history is the observed one. It was first seen for sure in 1831 "
"(Cassini's “permanent spot” of 1665–1713 may have been another storm), so the 1815 sky has none. Its "
"longitude follows the measured record (Peek's for 1831–1952, JUPOS since), and its size the fits of "
"Simon et al. (2018) from 1979, 405.0 − 0.1939 Y degrees long and 107.2 − 0.0483 Y wide, and before "
"1979 a steady shrinking from about 35° long in the 1880s. The fits meet in a round spot 8.4° across in "
"2045, and it is held there for 2100: whether it shrinks on, steadies or fades is not known. It was "
"reddest in 1879–1882 and has deepened again since 2014. In the deep past there is no Red Spot: storms "
"like it come and go over centuries.",
]

SATURN = [
"Saturn close up is drawn as Jupiter is, a tracer stirred by the same flow, with its own winds, bands and "
"colors. The winds are Cassini's at the cloud tops in 2004–2009 (García-Melendo et al. 2011), fit by twenty "
"Gaussian jets to 6 m/s rms in System III, which also turns the planet: the broad equatorial jet near "
"400 m/s, and narrower jets alternating with latitude toward the poles. The belts lie where the wind falls "
"off poleward, as Jupiter's do, the broad pair at 18–32° and fainter, narrower ones beyond. Saturn's haze "
"mutes all of it, so the eddies stir about half as hard as Jupiter's, the billows turn less, and the hues "
"vary a half to a third as much. Around the north pole the jet at 78°N meanders in a standing wave of six, "
"the hexagon (Godfrey 1988), golden inside in the northern summer and bluish gray in the winter; both poles "
"have a vortex with a dark eye and a bright wall, a thin ribbon wave runs along the jet at 47°N, and small "
"bright storms rise in Storm Alley near 40°S. The winter hemisphere, out of the Sun, shows bluish at any "
"size, as Cassini saw the north before 2009. That change lags the season by several years, and the lag is "
"not drawn.",

"Saturn's rings are drawn from the Cassini radio occultation of 3 May 2005 (Marouf et al. n.d.), its optical "
"depth at 10 km resolution from the C ring to the outer A ring, corrected to visible light in the C ring, "
"the Cassini division and the outer A ring by the same occultation's Ka band, which sees the sub-centimetre particles the X band misses (in the outer A ring "
"Jerousek et al. 2016 find them too), with the F ring added. Each ring is a single-scattering layer (as Cuzzi et "
"al. 1984): lit from the Sun's side it shines by its depth and particle brightness, the A ring 0.7 of the "
"B ring's and the C ring and Cassini division half of it and grayer; seen from the unlit side only light "
"passing through it shows, so the B ring is black and the C ring and Cassini division glow. The rings "
"shadow the globe, and the globe shadows the rings with its oblate outline and a penumbra the Sun's width. "
"Near the equinoxes, when the Sun is low over the rings, they shadow the moons too: a moon passing behind "
"them is banded by their shadow and dimmed by what they let through, Mimas by up to 4 magnitudes deep in "
"the B ring's. Edge-on, the rings thin below a pixel.",

"The rings are young. How young is still argued, from tens to a few hundred million years (Iess et al. 2019; Kempf et al. "
"2023), and we adopt the account of Wisdom et al. (2022): an icy moon the size of Iapetus, named "
"Chrysalis, orbiting between Titan and Iapetus in a 3:1 resonance with Titan, was torn apart roughly 100 to "
"200 million years ago, about 160 million years ago in the case they illustrate, freeing Saturn's tilt from "
"Neptune's pull and making the rings of its debris. We draw that illustrated case, so the "
"rings appear in the 66 Ma sky and after, and before them Chrysalis is a moon of magnitude 13 to 14 beside "
"a ringless Saturn. Younger rings are drawn more massive and cleaner: their depth grows with youth as "
"age⁻⁰·⁷⁵, between ring-rain losses (O'Donoghue et al. 2019; Waite et al. 2018) and viscous spreading "
"(Salmon et al. 2010), half again today's at 66 Ma, and the meteoroid darkening of the C ring and Cassini "
"division (Cuzzi &amp; Estrada 1998) is two fifths of today's. Both are guesses. Saturn's pole precesses "
"once in about 1.87 million years (Ward &amp; Hamilton 2004), so the rings open from a different direction "
"at each epoch: by a known angle at the Pleistocene supernovae, at random beyond ten million years.",
]

NEPTUNE = [
"Neptune close up is drawn the same way, a tracer in its own flow. The winds are Voyager 2's cloud-tracked "
"profile (Sromovsky et al. 1993): retrograde at 400 m/s at the equator, prograde at 250 m/s near 70°, in "
"System III, the 16.11-hour radio period that also turns the planet. Its deck is smooth, so the eddies "
"stir it only lightly and no billows roll up between bands. Its color is the true one, a pale greenish "
"blue only a little bluer than Uranus's (Irwin et al. 2024), not the deep blue of Voyager's "
"contrast-stretched images. On it are bright clouds of methane ice, in streaks drawn out by the shear of "
"the winds that carry them, at southern mid-latitudes, near 30°N and near 70°S, each lasting some days; "
"and the dark wave circling near 60°S, wandering a few degrees in latitude and drifting 4.87° a day in "
"System III, with a bright band just north of it (Karkoschka 2011; Chavez et al. 2023). Dark vortices come "
"and go, a new one every four to six years, each lasting about two (Hsu et al. 2019): deep-blue ovals "
"with bright methane clouds along their poleward edges, turning as anticyclones and drifting with the "
"wind at their latitude. The Great Dark Spot that Voyager 2 found is drawn as it was, at 22°S, 13,000 by "
"6,600 km, from late 1988 until it was gone in 1994 (Smith et al. 1989). At other times a vortex is drawn "
"at random as their rates and sizes have it, since where one was on any given day is not known.",
]

YOUNG_GIANTS = [
"The giant planets were warmer when young, and their clouds were different. Each cools as it ages: we take "
"its intrinsic temperature, the effective temperature its own heat alone would give it, to fall as the age to "
"the −0.29, a power-law fit to the cooling tracks of Burrows et al. (1997), scaled to today's (98 K for "
"Jupiter, 78 K for Saturn, 53 K for Neptune, from the effective temperatures Voyager measured, Hanel et al. "
"1981, 1983 and Pearl &amp; Conrath 1991, less the sunlight's share), and add the young Sun's light at each "
"planet's distance. For planets of these masses the hot and cold starts of formation meet within a few tens of "
"millions of years (Spiegel &amp; Burrows 2012), so the history is surest over the last four billion years and "
"least sure in the oldest sky. Then Jupiter's effective temperature was near 500 K in the 4.55 Ga sky, 330 K "
"in the 4.5 Ga sky, 185 K at 4.0 Ga and 170 K at 3.8 Ga, against 124 K now; Saturn's 395, 265, 145 and 135 K, "
"against 95; Neptune's 270, 180, 98 and 90 K, against 59. Uranus is drawn as it is now: it gives out too "
"little heat for any model that starts it hot (Fortney et al. 2011), and how warm it was is not known.",

"A cloud deck forms where the air is cold enough for its gas to condense, and the coldest air, at the top "
"of the troposphere, is near 0.85 of the effective temperature, so as each planet cooled its clouds formed "
"in turn from the bottom up; young, Jupiter and Saturn had no ammonia clouds and a top deck of water clouds, "
"and the ice giants' clouds lay higher (Fortney et al. 2011). We draw three stages. Above about 165 K Jupiter "
"and Saturn have no ammonia ice on top and show the NH4SH haze beneath, paler and less colored, as Jupiter "
"is at 4.0 and 3.8 Ga; above about 85 K Neptune has no methane ice, no bright streaks, and shows its H2S deck "
"higher up, as pale a cyan as Uranus, whose top deck is H2S now (Irwin et al. 2018), as Neptune is at 4.0 and "
"3.8 Ga. Warmer still, above about 230 K for the gas giants and 155 K for the ice giants, the top is a high "
"deck of NH4SH and water clouds, bright and near white, Sudarsky et al.'s (2000) class II: Jupiter and Saturn "
"in the 4.5 Ga sky and the ice giants in both of the oldest, their bands showing more in brightness than in "
"hue, the ice giants' storms of moist convection rising bright out of their mid-latitudes. Above about 380 K "
"water no longer condenses high up and the planet is clear, their class III, a dark azure of Rayleigh "
"scattering and methane absorption: Jupiter in the 4.55 Ga sky, and most of Saturn. Each planet's point is "
"tinted and brightened or dimmed with its disk.",

"Oceanus, of about Neptune's mass, cools as Neptune does; nearer the Sun, at 9.6 AU, its effective "
"temperature is 270 K in the 4.55 Ga sky and 180 K in the 4.5 Ga sky, so in both it has the high bright deck "
"of NH4SH and water clouds, a pale banded cyan. Its bands are laid out as the ice giants' circulation runs, "
"air rising at mid-latitudes, where clouds are thick and bright, and sinking at the equator and poles, where "
"they are thin (Fletcher et al. 2020): a broad darker equatorial belt, bright zones from about 18° to 45°, "
"narrower belts near 50° and darker polar caps, carried and stirred as Neptune's are, in Neptune's winds, with "
"bright storm tops in the rising zones of both hemispheres. Its day, unknown, is taken as 16 hours. Through the "
"tens of bars of CO2 of the 4.5 Ga sky none of this can be seen from the ground.",
]

MOONS = [
"The moons with fitted orbits, fitted here to JPL Horizons over 1980–2060, are Io, Europa, Ganymede and "
"Callisto; Mimas, Enceladus, Tethys, Dione, Rhea, Titan and Iapetus; Miranda, Ariel, Umbriel, Titania and "
"Oberon; Triton; and Mars's Phobos and Deimos. Most hold to a tenth of a degree. Iapetus's two faces show: its trailing side is "
"ten times brighter than its leading side, so it is magnitude 10.2 at western elongation and 11.9 at "
"eastern. The planets' moons also change with the epoch. Triton, retrograde, was captured in the "
"giant-planet instability, so the two oldest skies lack it, and Neptune has instead a family of regular "
"moons, here named Kymo, Galene, Thetis and Amphitrite, drawn like Uranus's four largest at the same "
"distances: Rufu &amp; Canup (2017) find that a system no heavier than Uranus's fits best, and that "
"capturing Triton scattered and destroyed it. Mars, at 4.0 and 3.8 Ga, has Harmonia (named here), the moon "
"of some twenty times Phobos's mass at 3.3 Mars radii that Ćuk et al. (2020) find tilted Deimos's orbit, "
"one generation of Mars's cycle of rings and moons (Hesselbrock &amp; Minton 2017). Phobos is falling "
"toward Mars: its tidal acceleration, half the rate its mean motion grows, is 1.258 × 10⁻³ degrees per year "
"squared (Brozović, Jacobson &amp; Park 2025), which is put back into its fitted longitude, so its place stays "
"right to a few hundredths of a degree across centuries rather than drifting by degrees. Back in time, with "
"Mars's tidal lag held fixed, its orbit grows as the 2/13 power of 1 + t/38 Myr, to 3.2 Mars radii at 66 Ma against 2.77 "
"now; Deimos, beyond the synchronous orbit, was only some 130 km nearer at 3.8 Ga. Both of Phobos's histories "
"fit its orbit (Ćuk, Anand &amp; Minton 2025): formed early just inside the synchronous orbit, or about 100 "
"million years ago at the Roche limit as the latest moon of the ring cycle. The site follows the second, as "
"its Harmonia does, so Phobos appears only in the skies of the last 100 million years, and Deimos from "
"4.3 Ga on.",
]

# ---------------------------------------------------------------------------------------------------
# The stars and the Galaxy
# ---------------------------------------------------------------------------------------------------
STARS = [
"Today's sky has the thousand brightest stars of the Yale Bright Star Catalogue (Hoffleit &amp; Warren "
"1991), down to about magnitude 4.6, carried to the year shown by proper motion and precession, each "
"tinted by its color temperature and shown only when it is brighter than the naked-eye limit for the sky "
"around it, so stars come out one by one in twilight and cities keep only the brightest. Earth's axis "
"keeps today's tilt and direction in every epoch, since its precession in the deep past cannot be pinned "
"down. Going back, the stars move, and how far the page can follow them sets three kinds of sky.",

"For the Pleistocene supernovae, 1.78 Ma and 342 ka, every catalogue star is moved in a straight line "
"from its Hipparcos parallax, proper motion and radial velocity (the XHIP compilation of Anderson &amp; "
"Francis 2012), and the thousand brightest at that time are kept. Over two million years the Galaxy's "
"pull bends their paths by only a few parsecs. The sky is recognizable but rearranged. At 1.78 Ma "
"Canopus is the brightest star, −1.6, and Sirius, far away then, is fourth magnitude; at 342 ka "
"Aldebaran, near its closest pass, outshines everything at −1.5, and Sirius is +0.8. Constellation "
"figures move with their stars, and a line is dropped once its stars have drifted three times today's "
"distance apart.",

"At 66 Ma the Sun and the catalogue stars are traced back along orbits in a model Galaxy: a flat "
"rotation curve of 233 km/s, a vertical oscillation of 84 million years, and the Sun's motion from "
"Schönrich, Binney &amp; Dehnen (2010), keeping only stars old enough to have been shining. Six of them were "
"brighter than magnitude 4.6. Further back none of today's neighbors was near the Sun, and every star "
"is a stand-in: a copy of a star of today's sky, keeping its brightness, color, spectral type and "
"galactic latitude, at a random galactic longitude, a different random sky for each age. The stand-ins' "
"labels give the type they copy, not a name. The sky's statistics are right; its patterns are invented, "
"as they would be for any reconstruction that far back.",
]

MILKY_WAY = [
"The Milky Way is a model in galactic coordinates rather than a photograph: a disk and bulge, the "
"Sagittarius and Scutum star clouds, the Great Rift from Cygnus to Sagittarius, the Coalsack and the "
"Ophiuchus and Taurus dust, peaking at 20.2 mag/arcsec² in the Sagittarius star cloud (Leinert et al. "
"1998), and shown only in a dark sky. In the older skies its brightest part lies where the Galactic center "
"then lay as seen from the Sun, from the Sun's orbit traced back through the same model Galaxy, and the "
"band shifts by a few degrees with the Sun's height above the plane: at 66 Ma the Sun was 100 pc north of "
"it. Beyond about a billion years the Sun's place on its orbit is only nominal. The Galaxy's own "
"structure is today's in every epoch.",

"The 34 nebulae and galaxies that binoculars show under a dark sky are drawn from survey photographs, "
"their stars taken out, each scaled to its catalogue magnitude and surface brightness, and turning into "
"its photograph when zoomed. They change with the epoch. The Andromeda and Triangulum galaxies fall "
"toward the Milky Way on a timing-argument orbit (van der Marel et al. 2012; Kahn &amp; Woltjer 1959), so at "
"4.5 Ga Andromeda is three quarters of today's size. The Large Magellanic Cloud is on its first infall "
"(Kallivayalil et al. 2013), traced back through the Galaxy's halo with dynamical friction: a small "
"patch in another part of the sky in the Hadean, larger than today's at 66 Ma. Galaxies beyond the Local "
"Group were nearer by the cosmic scale factor. The nebulae are young: each is drawn only within its age, "
"so the Orion Nebula is absent at 1.78 Ma, and none of today's shine at 66 Ma or before, when others, "
"unknowable, did.",
]

SUPERNOVAE = [
"Two skies are lit by a supernova. Geminga's, about 342,000 years ago by its pulsar's spin-down age "
"(Salvati &amp; Sacco 2008), exploded 90 to 240 pc away toward Orion (Pellizza et al. 2005); a typical "
"Type II-P peaks near absolute magnitude −16.75 (Richardson et al. 2014), so from 147 pc it reached "
"about −11, a fifth of the full Moon's light from a single point, bright enough to show by day and cast "
"shadows at night for the three months of its plateau. The ζ Ophiuchi supernova, 1.78 million years ago "
"at 107 pc in the Scorpius–Centaurus association (Neuhäuser et al. 2020), unbound its companion, now the "
"runaway star ζ Oph, and peaked near −11.6, twice as bright. Its spectrum readout is a Type II-P near "
"peak, with P Cygni profiles from fast ejecta (Filippenko 1997). At these distances neither touches the "
"sky's colors (Thomas et al. 2016). Betelgeuse is the same event still to come, in the same patch of "
"sky: 1.4° from Geminga's star in the sky of 342 ka, a red supergiant of 16.5 to 19 solar masses burning "
"helium in its core, some 100,000 years from collapse, at 168 pc (Joyce et al. 2020), or 222 pc by radio "
"astrometry (Harper et al. 2017). A red supergiant ends as a Type II-P, so it should peak at −10 to −10.6, "
"close to Geminga's −11, and the Geminga sky is a fair picture of Orion's own to come.",
]

# ---------------------------------------------------------------------------------------------------
# The Sun
# ---------------------------------------------------------------------------------------------------
SUN_YOUNG = [
"The Sun was about 30% fainter when the Earth formed and has brightened since, as hydrogen burning has raised the density and "
"temperature of its core. We follow the 1 M☉ track of Baraffe et al. (2015): 68% of today's light and "
"5,530 K at 4.5 Ga, 80% and 5,660 K at 2.7 Ga, 94% at 700 Ma, today's 5,772 K by the Cenozoic. Its radius "
"follows from the luminosity and temperature: 0.90 of today's at 4.5 Ga, 0.93 at 2.7 Ga, 0.98 at 700 Ma, so the "
"young Sun's disk was smaller as well as dimmer, and the closer Moon covered it easily. The 4.55 Ga Sun is "
"different. Seventeen million years old, it is still contracting onto the main sequence: cooler, 4,614 K, at "
"47% of today's light but 7% larger than today's, an orange-white disk. The color change is small, two or three "
"hundred kelvin for most of the record, and swamped by the air's; the brightness change is not, and it is why the "
"early skies are drawn dimmer. The Earth–Sun distance varies through the year with today's eccentricity, so the "
"Sun is 3.4% brighter at perihelion in January.",
]

SUN_CLOSE = [
"Zoomed in, down to a field of view of 14 arcseconds, the photosphere is drawn as high-resolution solar "
"telescopes show it: granulation, convection cells about 1,300 km across, bright where hot gas rises and dark in "
"the narrow lanes where it sinks, living about eight minutes, a fifth of the larger ones splitting from a dark "
"knot late in life (exploding granules); magnetic bright points a couple of hundred kilometers across in the lanes "
"inside faculae; penumbral filaments a few thousand kilometers long; umbral dots about 1,000 K hotter than the umbra "
"around them; and toward the limb the supergranular network, cells some 30,000 km across outlined by brightenings. "
"Spot and plage edges are ragged down to the pixel. This fine structure is the same in every epoch; only the spots "
"and faculae change with the Sun's age ({ref:fig:sun}).",
"In the first-person view a Sun near full daylight is not drawn as a disk at all but as the eye sees it: a "
"blinding white blank tinted the epoch's color, in a bloom that whitens the sky around it. Zooming in, as through "
"a filter, dims it to the real disk, and the glare eases off as the Sun sets or is eclipsed, until the corona and "
"Baily's beads take over.",
]

SUN_CAPTION = ("The Sun's surface at four epochs, as the site's telescope view draws it at noon through each epoch's "
"air (sun_figs.py). Top: the whole disk. Middle: its largest spot group. Bottom: that group's largest umbra. "
"Widths are in km on the Sun, since the site draws the Sun at four times its size. The 17-million-year-old Sun "
"of 4.55 Ga, orange through the proto-Earth's dusty air, is spotted over a tenth of its surface, its spots at "
"high latitudes and a dark cap over the pole; at 3.8 Ga spots are on the disk every day; by 2.2 Ga a few groups "
"keep to the butterfly's latitudes; today's disk is the real cycle 25 near its maximum. Close up the structure "
"is the same in every epoch: granulation and its network around the spots, penumbral filaments, umbral dots, "
"and in the 3.8 Ga spot a light bridge of granules.")

MOONLIGHT = [
"Moonlight is the same sky model with the Moon in place of the Sun, scaled by the lunar phase (the Allen phase law "
"with the opposition surge, as in Krisciunas &amp; Schaefer 1991) and by the inverse square of the Moon's distance. "
"It stays nearly the same in color from epoch to epoch but not in brightness: the full Moon lit the sky 2.2 times "
"as brightly at 3.8 Ga and 57 times at 4.5 Ga, where it lit a 30-bar sky that, like its day sky, was a "
"featureless peach glow.",
]

# ---------------------------------------------------------------------------------------------------
# Transients and the night's visitors
# ---------------------------------------------------------------------------------------------------
IMPACTS = [
"The largest meteoroids do not burn up. Bodies a meter across and more come in as superbolides, brighter than "
"magnitude −15, and leave dust trails from about 80 km down to where they break up at 25 to 40 km, which drift "
"and shear in the high winds, as Chelyabinsk's did for over an hour (Borovička et al. 2013); today about one "
"comes within 1,100 km of a given place every three years, and in the bombardment several an hour. Bodies "
"brighter than about −24 reach the ground. When one strikes within 200 km it is drawn with its fireball, a thermal "
"pulse cooling from 6,500 to 2,000 K, the blast wave, a condensation ring and the rising cloud, scaled from "
"nuclear-test and impact-effect relations (Glasstone &amp; Dolan 1977; Collins, Melosh &amp; Marcus 2005). Today "
"that happens to a given place about once in 50,000 years; in the bombardment, constantly. In the bombardment "
"epochs, impact flashes also show on the closer Moon's night side, at today's measured rate scaled up (Suggs et "
"al. 2014).",
]

# ---------------------------------------------------------------------------------------------------
# Weather, the ground and the air near it
# ---------------------------------------------------------------------------------------------------
SHAFTS = [
"Where the Sun shines from behind a cloud, beams fan out across the sky and the sky between them darkens: "
"crepuscular rays, the cloud's shadow in the sunlit air. Only the part of each direction's light that is sunlight "
"scattered once in the lower air can be shadowed, so the page computes that share from each epoch's own air, its "
"gas, aerosol, dust, haze, sulfate and soot layers with their heights, for every Sun height and direction "
"(<em>shafts.py</em>); along each line of sight the stretches whose path to the Sun passes through cloud lose their "
"share. The rays are strongest where the scattering sits low, and weakest in the 30-bar Hadean, whose light is "
"multiply scattered and comes from everywhere at once. The Moon makes the same rays through gaps in cloud, and so "
"does a bright fireball.",
]

CONTRAILS = [
"The modern-era skies have airliners and their contrails: about 1.1 aircraft over each 10,000 km² of busy "
"mid-latitude sky by day, from European traffic statistics, at 9 to 12 km along a few airways, quieter after "
"midnight; under half of today's traffic in 1990, twice today's in 2100, none in 1815. A contrail forms where "
"the exhaust's mixing line crosses saturation (Schmidt 1941; Appleman 1953), most often at mid and high latitudes, "
"and lives seconds in dry air but spreads into contrail cirrus lasting hours in the 10 to 20% of cruise levels "
"that are supersaturated with respect to ice (Gierens et al. 1999; Schumann 2005; Minnis et al. 1998). At night the "
"aircraft show as their navigation lights, beacon and strobes.",
]

SCENERY = [
"The ground is scenery, like the clouds: a walkable landscape chosen for each era rather than computed, lit by the "
"model's sky and Sun. The proto-Earth has magma pools; the 4.5 Ga Earth a hot ocean, about 230 °C while 100 to "
"200 bars of CO₂ remained (Zahnle et al. 2010), steaming round volcanic islands; the Archean, water and volcanic shields; Snowball "
"Earth, ice plateaus with blue banded cliffs and frozen ponds; the Ordovician, shallow seas with no land plants "
"beyond mosses and crusts; the Carboniferous, forest and swamps; the impact winter, dead woods; the Pleistocene, "
"1815 and today, woods and snow-capped peaks; and the modern epochs, a town with lit windows. Water reflects the "
"sky and glitters in the Sun and Moon; lava glows; distant scenery fades into the sky's color. None of this is "
"part of the model: the sky above it is.",
]

# ---------------------------------------------------------------------------------------------------
# The sky people made
# ---------------------------------------------------------------------------------------------------
CITY = [
"In the modern epochs the observer stands in a mid-sized city: a zenith glow of 18.8 mag/arcsec² today (Falchi et "
"al. 2016), with orange sodium light in 1980–2000, at the brightness of the first World Atlas (Cinzano, Falchi &amp; Elvidge 2001), 1.6 times today's in "
"polluted air, held at today's level in 2100 (the recent 9.6% a year, Kyba et al. 2023, cannot be projected that "
"far), and almost nothing from the oil lamps of 1815 (Fouquet &amp; Pearson 2006). The glow rises about threefold "
"toward the horizon, and cloud bases over the city glow orange several times brighter than the clear sky (Kyba et "
"al. 2011). Against that glow the city keeps only the brightest stars, and none of the Milky Way.",
]

SATELLITES = [
"The 2100 sky has today's air and the satellites that may fill it. Lawler, Boley &amp; Rein (2022) put every "
"filed megaconstellation on orbit, 65,262 satellites in 30 shells from 328 to 1,200 km, and found the worst "
"naked-eye light pollution near 50° latitude; each is drawn as their diffuse sphere of 0.8 m² effective area, so "
"its magnitude is on the stars' scale. At the equinox a mid-latitude sky has a few hundred of them above "
"naked-eye brightness in the hour after sunset, and the Earth's shadow takes them by midnight. On top of that "
"fleet are the orbital datacenters modeled by Boley, Lawler &amp; Rein (2026). Of their three filed designs we "
"take Blue Origin's Sunrise and the relaxed one of their two node spreads: 51,600 "
"Sun-synchronous satellites from 500 to 1,800 km in a dawn–dusk cross of rings whose nodes wander 10° to either "
"side of the terminator. Each is a diffuse sphere of 800 m² at albedo 0.2, the size they call conservative next "
"to panels several times larger: 160 m² of effective area, two hundred times a communications satellite's. An hour "
"after sunset, thousands of them are above naked-eye brightness, a bright band along the terminator, each "
"crossing the dome in minutes. The paper's all-night winter rings belong to the December solstice, which the "
"page's equinox geometry does not show.",
]

# ---------------------------------------------------------------------------------------------------
# Introduction and method
# ---------------------------------------------------------------------------------------------------
INTRO = [
"What did the sky look like from the ground in the Archean, under the young Sun, with the Moon nearer? "
"We reconstruct the whole view from Earth's surface at nineteen moments in its history, from a "
"proto-Earth 17 million years after the first solids to the year 2100: the color of the sky by day and at dusk, "
"computed with a spectral radiative-transfer model of each epoch's air, and on that sky everything else that "
"could be seen from the ground: the Sun and its spots, the Moon's size, face and eclipses, the planets and their "
"moons, the stars and the Galaxy as they then lay, meteors, comets, aurorae, airglow, halos and clouds, and in "
"the latest epochs the light people added. It began as a study of the sky's color, which remains its "
"quantitative core, and grew with the interactive site built on the model, which draws each of these and is the "
"source of every number quoted here outside the color tables.",

"The nineteen epochs ({ref:tab:epochlist}) were chosen for what changed: the air (a 30-bar CO₂ Hadean, an Archean "
"with no oxygen and organic haze, the first ozone after the Great Oxidation, a frozen Snowball, the oxygen-rich "
"Carboniferous, the impact winter after Chicxulub, a volcanic year, the ozone hole and today's cities), the sky "
"above it (a Moon forming and receding, a young and active Sun, a Solar System before the giant planets' "
"instability, nearby supernovae, stars that outshone Sirius, a bombardment and a possible ring), and the view "
"people have made (city light and a sky full of satellites). Each is a reconstruction, with the uncertainties "
"the sections state: some quantities are measured, some modeled, some estimated to show a trend, and some, "
"like where the planets stood on a given day four billion years ago, unknowable and drawn at random.",

"This is a living document. Much of what it draws rests on questions that are still argued: when the giant "
"planets went unstable and whether a fifth giant was lost; how far away the Moon was in its first hundred "
"million years; how thick the Archean haze was and how much ozone the first oxygen made; how old Saturn's rings "
"are; whether the Earth had a ring in the Ordovician; how bright the young Sun's corona and wind were. Where the "
"literature disagrees, we say which reading we take and why, and as the consensus moves the site and "
"this report will move with it: epochs will be redrawn, numbers revised and new findings added. Each version "
"carries its date, and the code and data that produce it are public, so any figure here can be traced to the "
"model and the sources behind it.",

"The site computes what it shows as realistically as it can while still loading in seconds and running "
"smoothly in a browser, and where the two conflict it compromises. Some compromises stand in for physics too "
"costly to run. Jupiter's and Saturn's clouds are a tracer stirred by a flow made of noise, shaped by the measured "
"winds and rolled into eddies and billows, a proxy for the planets' true three-dimensional hydrodynamics rather "
"than a simulation of it; the animation repeats over a 2000-day cycle. The sky's multiple scattering is a two-stream "
"approximation rather than a full Monte Carlo transfer, computed ahead of time on a grid of Sun heights and "
"interpolated between them. The clouds are scenery, procedural volumes lit by the model's sky rather than the "
"output of a climate model, and the Milky Way is a model of its structure rather than a photograph. The "
"photosphere's granulation and the Moon's craters' shadows are drawn from procedural cells and a limited march "
"toward the Sun, and the close-up detail of Jupiter, Saturn, the Sun and the spacecraft maps is built only when the view "
"zooms in on them. Other compromises are made for the eye: the Sun and Moon are drawn at four times their size, "
"the sunset's colors are spread further apart than they are, and the Sun's limb darkening is softened. Each "
"section says where its subject is measured, modeled or approximated.",

"In {ref:method} we describe how the view is reconstructed. {ref:sky} gives the sky's colors by day and at dusk, "
"and {ref:sun} through {ref:people} take in turn the Sun, the Moon, the planets, the stars and the Galaxy, the "
"night and what crosses it, and the sky people made. {ref:epochs} goes through the epochs one by one, and "
"{ref:caveats} says what the reconstruction leaves out and which of its numbers are estimates.",
]

METHOD_VIEW = [
"The sky's colors come from the radiative-transfer model described above; the rest of the view is drawn on "
"them by the interactive site, in two views: a dome, the whole sky as a fisheye, and a first-person view in "
"WebGL, with a walkable ground and clouds. Both draw on one photometric scale, calibrated in absolute units: the "
"clear zenith with the Sun 45° up is 2.7 kcd/m², which puts the full-Moon sky at the measured 18 mag/arcsec². "
"Stars, planets, meteors and satellites are placed by their magnitudes on that scale and dimmed by the epoch's "
"air, 0.15 magnitude per airmass from the gas plus 1.086 times its aerosol or haze optical depth; each shows only "
"when it is brighter than the naked-eye limit for the sky around it. The Moon, moonlight, supernovae, fireballs "
"and city glow light the sky through the same model. The clock runs over one solar day of the epoch, and the Sun "
"follows the seasons for the date with today's 23.4° tilt in every epoch, since the Moon has held the obliquity "
"between about 22° and 24.5°. The Sun and Moon are drawn at four times their angular size so that their disks show "
"on a screen, and zooming in acts as a telescope, down to a field of 14 arcseconds.",

"Where each body was is carried back as far as it can be known. The Moon's distance follows the tidal record, the "
"Sun's brightness and size its evolutionary track, the stars their measured motions back to the Pleistocene and "
"orbits in a model Galaxy to 66 Ma; beyond that the star field and the planets' positions are drawn at random, "
"with the right statistics, since no calculation can recover them. The colors are shown as a daylight-balanced "
"camera would record them, without chromatic adaptation, and the night as a dark-adapted eye sees it. The "
"scenery and the clouds are drawn, not modeled; the sky is the model.",
]

TEN_THINGS = [
"Under the 30-bar CO₂ of the early Hadean the sky was a shadowless peach-white glow with no visible Sun, and the "
"molten newborn Moon, 4° across and 8 Earth radii away, glowed orange through it, rising and setting several times "
"in a 6-hour day.",
"During the hazy Neoarchean the whole dome was cream to apricot, with almost no difference between zenith and "
"horizon.",
"Before the Great Oxidation every twilight ended in a cream zenith; the first ozone turned it pale blue, and the "
"deep blue dusk needs a near-modern column.",
"Snowball Earth had the bluest mid-latitude sky in Earth's history; the K–Pg impact winter had no sunsets at all.",
"The eclipsed Moon is copper today, orange-rimmed before there was ozone, dark-cored when the Moon was close, and "
"gone under the K–Pg soot, the thick Archean haze or a Tambora veil.",
"Before the Great Oxidation the nights were darker and violet: no oxygen airglow, nitrogen aurorae reaching the "
"mid-latitudes, and meteors with no glowing trains.",
"The young Sun was smaller, redder and dimmer, and so heavily spotted that a spot could be seen on it every day.",
"The Moon's face was not always today's: at 3.8 Ga the maria were still flooding, and at 4.0 Ga the near side was "
"bright highland from limb to limb.",
"Saturn had no rings before roughly 100 to 200 million years ago, and θ Columbae, now a faint fifth-magnitude star, shone "
"as bright as Venus 4.7 million years ago.",
"In 2100 thousands of orbital datacenters may outshine nearly every star at dusk, in a bright band along the terminator.",
]

def epoch_rows(order, ages, byk):
    """The nineteen epochs: what changes in each, for the opening table."""
    from epochs import BY_KEY
    RE = js_const('moon.js', 'MOON_RE'); DAY = js_const('moon.js', 'DAY_HOURS')
    out = []
    for k in order:
        T, L = (BY_KEY.get(k) or BY_KEY['modern'])['sun']
        moon = 'none' if k == 'protoearth455' else f'{60.14/RE[k]:.2f}×' if RE[k] < 60 else 'today’s'
        out.append([ages[k], re.sub(r',? ~?[\d.]+ (?:Ga|Ma|ka)', '', byk[k]['name']), f'{L:.2f}', f'{T:,}', f'{DAY.get(k, 24.0):.1f} h', moon, EPOCH_NOTE[k]])
    return out
EPOCH_HEAD = ['Age', 'Epoch', 'Sun’s light', 'Sun (K)', 'Day', 'Moon’s width', 'What else is in the sky']
EPOCH_CAPTION = ("The nineteen epochs. The Sun's light is relative to today's and its temperature from the solar track of "
                 "Baraffe et al. (2015); the day and the Moon's width from the Moon's distance ({ref:tab:moon}); the last "
                 "column lists what the sections that follow find in each sky besides its color.")
EPOCH_NOTE = {
 'protoearth455': 'No Moon; Theia passing; the giant planets before the instability, with a fifth giant; a saturated young Sun',
 'hadean45': 'The molten Moon at 8 R⊕; 10,000× today’s meteors; no stars through 30 bar of CO₂ and the debris’s glow',
 'hadean40': 'Bombardment; nitrogen aurorae to 37°; the Moon before the maria',
 'archean38': 'The maria flooding, lava fountains on the Moon; Mars’s lost moon Harmonia',
 'archean27thin': 'Thin organic haze; an 18-month year',
 'archean27': 'The Pale Orange Dot seen from below',
 'archean27vthick': 'The thickest plausible haze',
 'proterozoic22': 'The first ozone; oxygen airglow at 30%',
 'snowball07': 'Ice halos at every latitude; the clearest air',
 'ordovician466': '100× today’s fireballs and perhaps a ring',
 'carbon30': 'Saturn without rings, and its moon Chrysalis',
 'kpg66': 'Soot from Chicxulub; Saturn’s young rings',
 'zetaoph': 'A supernova at −11.6 in Scorpius; stars moved back',
 'geminga': 'A supernova at −11 in Orion; Aldebaran at −1.5',
 'volcanic': 'Tambora’s veil; oil lamps; no Red Spot yet',
 'ozonehole': 'Polar-spring ozone at 130 DU; sodium-lit cities',
 'modern': 'A mid-sized city’s glow; airliners; the real comets and showers',
 'modernpoll': 'A polluted megacity',
 'y2100': 'Megaconstellations and orbital datacenters',
}
