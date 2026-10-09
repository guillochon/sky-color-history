"""The report's part on everything the interactive site adds to the sky colors: the setting Sun,
the Moon and both kinds of eclipse, halos, the night sky and airglow, aurorae, meteors, dust and
comets, and clouds. gen_report.py renders it as HTML and make_tex.py as LaTeX, from the same text.
The numbers come from the site's code (model/site_src/js) and the model scripts named in each
section; the per-epoch values in PHENOMENA are copied from those files."""
import eclipse_report as er

INTRO = ("The colors above are the radiative-transfer model's. The interactive site builds more on the same atmospheres: "
         "the setting Sun bent and dimmed band by band, moonlight, solar and lunar eclipses, ice halos, the night sky's "
         "own light, aurorae, meteors, and the dust and comets of each era. This part describes each, how it follows the "
         "epoch's air, and which numbers are measured and which are estimates. The lunar eclipses are a result in their own "
         "right: Earth's transmission spectrum has been computed through geological time as a transiting exoplanet would "
         "show it (Kaltenegger, Lin &amp; Madden 2020), and today's eclipse has been modeled with refraction (García Muñoz "
         "et al. 2012), but a search of the Valency corpus finds no reconstruction of how the eclipsed Moon itself looked "
         "in past epochs.")

# [title, [paragraphs]]. Paragraph text is HTML with simple inline tags only.
SECTIONS = [
['The setting Sun', [
"Near the horizon the Sun is drawn as twenty images, one per 20 nm band from 385 to 765 nm, each lifted by its own "
"refraction (the dispersion of air, Edlén 1966) and dimmed by its own optical depth along the grazing path through "
"the epoch's model atmosphere. At the horizon the green and orange images of today's Sun are only about 6 arcseconds "
"apart, so the colors separate only in the last sliver: the green flash is whichever band survives the extinction "
"last, and the cleaner the air the shorter that wavelength. Along the horizontal path, the model's air still "
"passes a twentieth of its peak sunlight at 550 nm in the clean, dry Snowball epoch, the best flashes in the "
"record, and at 630 nm in today's clean air; under the Neoarchean haze, the impact-winter soot, a volcanic veil "
"or a polluted city nothing shorter than 650 to 730 nm gets through, and there is no flash at all.",
"How far the air lifts the Sun follows its refractivity, the sum over its gases' partial pressures. Today's "
"horizon refraction of about 34 arcminutes is 1.8 times larger at 4.0 Ga (half a bar of CO₂ on a bar of N₂), "
"1.11 times in the oxygen-rich Carboniferous and 0.83 times in Snowball Earth's thinner air, so the Sun sets later "
"or earlier by a minute or two. The 30-bar Hadean air is 47 times as refractive as today's: a horizontal ray bends "
"faster than the ground curves and is trapped (ducting), but its Sun is lost in Rayleigh scattering long before "
"it reaches the horizon, so the drawing holds the bending to three times today's.",
"Each evening also has its own layering of the low air, set by the date so that a given evening always sets the "
"same way. Thin temperature inversions step the disk's edge, show a strip of it twice (once inverted) where the "
"rays cross, and draw a dark line across it where trapped rays run through the densest air; over warm water the "
"Sun meets its own inverted image in an inferior mirage, the “omega” sunset. The cold surface of Snowball Earth "
"makes inversions common and inferior mirages rare, and the warm oceans of the Hadean and Archean the reverse. "
"These mirage statistics are illustrative. The disk is also darker and redder toward its edge (limb darkening, "
"Hestroffer &amp; Magnan 1998): the air only multiplies the Sun's light, so the darkening is the same under every sky."]],

['Moonlight and the Moon', [
"Moonlight is the same sky model with the Moon in place of the Sun, scaled by the lunar phase (the Allen phase law "
"with the opposition surge, as in Krisciunas &amp; Schaefer 1991) and by the inverse square of the Earth–Moon "
"distance, which follows Farhat et al. (2022) back to 2.2 Ga and reaches about 70% of today's by 3.2 Ga (Eulenfeld "
"&amp; Heubeck 2023): 47.6 Earth radii at 2.7 Ga and 38.7 at 4.4 Ga. The full Moon was then up to 2.4 times as "
"bright and 1.55 times as wide. Holding the Earth–Moon angular momentum fixed gives days of 23.8 hours at 66 Ma, "
"17.4 at 2.2 Ga, 15.6 at 2.7 Ga and about 12½ in the Hadean, matching Farhat et al.; the closer Moon also went "
"round faster, so a month was 20 of today's days at 2.7 Ga and 15 at 4.4 Ga, still 28 to 31 of the shorter days.",
"The Moon's face changes too. Its dark maria are basalt that flooded the great basins from about 3.9 Ga, most of "
"it by 3.3 Ga (Hiesinger et al. 2011), so each mare is darkened from a date just before its oldest dated basalt: "
"at 3.8 Ga Tranquillitatis is two-thirds dark while Imbrium is still a bright basin, and in the Hadean the near side "
"is bright highland from limb to limb. Tycho's rays, 108 million years old, are missing from the older Moons. "
"Moonlight therefore stays nearly the same in color but not in brightness: a Hadean full Moon lit a 30-bar sky "
"that, like its day sky, was a featureless peach glow."]],

['Solar eclipses', [
"When the Moon covers part of the Sun, all the sunlit sky dims by the fraction of the disk still showing. In "
"totality the sky is lit from beyond the Moon's shadow, tens to a hundred kilometres away, where the Sun is still "
"partly up: the epoch's own twilight sky with a sunset glow all round the horizon, a thousandth of the day sky, as "
"measured (Sharp, Lloyd &amp; Silverman 1966; Shaw et al. 2026). The Hadean and hazy Archean totality skies are "
"therefore that era's dusk, peach or amber rather than the deep blue of a modern eclipse.",
"The corona follows the Sun's age. A younger Sun spun faster and was far more active: its X-ray output goes as "
"age to the −1.5 (Güdel, Guinan &amp; Skinner 1997), about 140 times today's at 4.4 Ga, and its coronal "
"temperature with it, 5 MK against 1.5 MK. Today's corona (Baumbach 1937: electron-scattered K light near the limb, "
"dust-scattered F light beyond about 2.3 solar radii) is scaled accordingly: a denser, more extended K corona, an F "
"corona that follows the era's zodiacal dust, stronger coronal lines (the green Fe XIV and red Fe X, joined by "
"yellow Ca XV in the hot young corona) and a brighter pink chromosphere. These scalings are estimates. The young "
"Sun was also smaller (0.90 of today's radius at 4.4 Ga) while the Moon was closer, so early eclipses hide the inner "
"corona: at 3.8 Ga the Moon looks 1.5 times the Sun's width, and from 2.2 Ga back every central eclipse is total. "
"Through the 30-bar Hadean air, at 7.6 magnitudes of extinction per airmass, the corona does not show at all."]],

['Lunar eclipses', [
"In a lunar eclipse the Moon passes through the Earth's shadow, which is lit only by sunlight bent into it through "
"the Earth's limb: every sunrise and sunset on Earth at once. Its color and brightness are a measurement of the "
"whole atmosphere at the terminator, which is why eclipses darkened after Tambora, Krakatoa, El Chichón and Pinatubo "
"(Keen 1983; Stothers 2004) and dimmed measurably after the small Kasatochi eruption of 2008 (García Muñoz et al. "
"2011), and why the eclipsed Moon's spectrum is Earth's transmission spectrum as an exoplanet would show it (Pallé "
"et al. 2009). The same physics, run on each epoch's air, gives the eclipse of every era.",
"The model (<em>lunar_eclipse.py</em>) traces rays from the Sun through the epoch's atmosphere at tangent heights "
"from the ground to 120 km, bending with the refractivity of its gas mix and accumulating the optical depth of every "
"component (gas, ozone, aerosol, sulfate, haze, soot) along the whole path, with today's cloud tops cutting the "
"lowest rays. Seen from a point on the Moon, the Earth's limb at each position angle and height shows the Sun's "
"limb-darkened disk wherever the ray's bending puts it; summing that over the ring of the limb (Link's method; "
"Link 1969; García Muñoz et al. 2012 for a modern treatment) gives the spectrum of the light at each distance from the shadow's axis, and the direct sunlight past "
"the top of the air gives the penumbra.",
"Today's umbra comes out a dull copper. A central eclipse puts the Moon 12.3 magnitudes below the full Moon, about "
"V = −0.4, in the range observed for clear-air eclipses, with the center darkest and a paler, slightly bluish edge "
"where ozone's Chappuis band removes the orange from the highest rays (the turquoise fringe of eclipse photographs). "
"Before the Great Oxidation there is no ozone and that edge is orange too. A Tambora-sized sulfate veil puts the "
"Moon near V = +11, a surface brightness of 27 mag/arcsec², far below the night sky: it vanishes, as it did to "
"observers in June 1816 (Stothers 2004). The K–Pg soot and the thick Neoarchean haze remove it entirely; the thin "
"haze leaves a dim brown-red Moon near V = +5.",
"Two effects are new to the deep past. The closer Moon sat nearer the Earth than the refracted light comes to a "
"focus (about 300,000 km today, past the Moon's 384,000), so the middle of the shadow is reached only by rays "
"skimming the ground and goes dark: at 3.8 Ga the center of the shadow is a hundred million times fainter than its "
"its edge, a dark core in a glowing ring. And the 30-bar Hadean air is so refractive that below about 27 km its "
"rays are trapped and run round the planet, while the upper air bends light strongly enough to fill the whole "
"umbra: the Hadean Moon in totality is an even, deep red, V = −1.7 at 38.7 Earth radii.",
"The shadow's geometry follows the distances and the young Sun's size. The umbra was 3.1 Moon widths across at "
"4.4 Ga against 2.7 today, and with twice as many full Moons a year, total lunar eclipses came nearly three times as "
"often, while totality itself lasted at most 104 to 109 minutes in every epoch (table below). The rate also depends on "
"the tilt of the Moon's orbit. It was a little steeper then: integrating today's 5.145° back along the distance "
"history with the tidal model of Ćuk et al. (2016), in which Earth's tides flatten the orbit as the Moon recedes "
"and tides raised in the Moon damp it, gives 5.46° at 2.7 Ga and 5.93° at 4.4 Ga (5.8 to 6.3° for a Moon three "
"times stiffer or more dissipative). The much larger tilts that model and Downey, Nimmo &amp; Matsuyama (2022) need "
"for the young Moon belong to before the Cassini-state transition near 33 Earth radii, older than any epoch here "
"(<em>lunar_inclination.py</em>).",
"The ephemeris is checked against the almanac. For the total eclipses of 2022, 2025, 2026 and 2029, contact times "
"fall within 2 to 7 minutes of the NASA catalog (Espenak &amp; Meeus 2009) and umbral magnitudes within 0.04 (for "
"2029 June 26, 1.831 against 1.844); over 2000–2100 the page finds 144 umbral and 84 total eclipses, against the "
"catalog's 142 and 85. On the page the Moon is drawn for an eye adapted to its brightest part, so the umbra looks "
"black beside the penumbra in a partial phase and glows in totality, as it does to an observer."]],

['Ice halos', [
"In clear, very cold air the sky fills with diamond dust, tiny hexagonal plates and columns of ice drifting near "
"the ground. Snowball Earth's air would have been full of them at every latitude. Today they are common on the "
"Antarctic plateau and in Arctic winter, so they are drawn at 75° in the modern epochs and in the other cold "
"epochs (2.2 Ga at the end of the Huronian glaciations, the Late Ordovician and Late Paleozoic ice ages, and the "
"Pleistocene), and faintly at 45° at 342 ka, a glacial maximum.",
"The halos are traced from the crystals' geometry with the refractive index of ice at 450, 550 and 650 nm (Warren "
"&amp; Brandt 2008), so each arc carries its own dispersion, red toward the Sun: the 22° and 46° halos, the upper "
"and lower tangent arcs, the sun dogs (which move out with the Sun's height and vanish above 61°), the circumzenithal "
"arc (only while the Sun is below 32°), the parhelic circle with its 120° parhelia, a sun pillar for a low Sun, "
"and the diffraction aureole. The Moon makes the same, faintly. Their brightness, set against the clean noon sky, "
"is an estimate of a good display; the air in front of them is each epoch's."]],

['Twilight and the night sky', [
"The model is calibrated in absolute units (the clear zenith with the Sun 45° up is 2.7 kcd/m², which puts the "
"full-Moon sky at the measured 18 mag/arcsec²), so the night can be drawn on the same scale as the day. The sky is "
"computed for Sun heights down to 20° below the horizon; past 9° below, twilight dims by about a magnitude per "
"degree, as measured. Without the Sun or Moon the sky has its own light: today 22.0 mag/arcsec² at a dark zenith "
"(Leinert et al. 1998), half of it starlight and zodiacal light and half airglow, brighter toward the horizon.",
"Nearly all of today's airglow needs free oxygen: the 557.7 nm green and 630 nm red lines of oxygen atoms, the "
"hydroxyl bands (H + O₃), the sodium D lines cycled through ozone, and the NO₂ continuum. It is taken as 90% of "
"today's at 466 Ma, 80% in the Snowball epoch (169 DU of ozone and less O₂), and 30% at 2.2 Ga, where 1% of "
"today's oxygen leaves few atoms near 95 km. Before the Great Oxidation it is gone, replaced by a faint violet glow "
"of the O₂ Herzberg II bands from oxygen split off CO₂, as on Venus (Krasnopolsky 1983): about as many photons as "
"today's airglow but only 15% of its luminance, so Archean and Hadean nights were darker and bluer. These strengths "
"are estimates; no model of an anoxic nightglow exists.",
"Starlight, the Milky Way and the airglow all come from above the air and are dimmed by it: 0.15 magnitude per "
"airmass from the gas plus 1.086 times the epoch's aerosol or haze optical depth, so 0.25 in clean air, 0.8 under "
"the thick haze or a polluted city, 2.3 through the impact-winter soot, and 7.6 under 30 bar of CO₂, which hides "
"every star. A star shows only when it is brighter than the naked-eye limit for the sky around it, so stars come out "
"one by one in twilight. The Milky Way is a model in galactic coordinates, peaking at 20.2 mag/arcsec² in the "
"Sagittarius star cloud, with its center where the Sun's orbit puts it at each age.",
"In the modern epochs the observer stands in a mid-sized city: a zenith glow of 18.8 mag/arcsec² today (Falchi et "
"al. 2016), with orange sodium light in 1980–2000 (Cinzano, Falchi &amp; Elvidge 2001), 1.6 times today's in "
"polluted air, held at today's level in 2100 (the recent 9.6% a year, Kyba et al. 2023, cannot be projected that "
"far), and almost nothing from the oil lamps of 1815 (Fouquet &amp; Pearson 2006)."]],

['Aurorae', [
"The aurora is an oval round the magnetic pole, fixed relative to the Sun: on a moderately active night today "
"(Kp 3) it spans about 63–72° latitude on the night side (Feldstein's ovals). Its field lines reach out to the "
"magnetopause, whose distance goes as the sixth root of the field's pressure over the solar wind's. At 3.45 Ga a "
"field half to 70% of today's and the young Sun's dense wind held the magnetopause at about half today's distance "
"(Tarduno et al. 2010), which brings the oval's edge down to about 50° even in quiet times, and the young Sun's "
"frequent flares and mass ejections (Airapetian et al. 2016) make storms the usual state. Through the Proterozoic the "
"wind weakens (Wood et al. 2005) and the oval retreats toward the pole.",
"The colors follow the air. Today's green and red lines are oxygen atoms. At 2.2 Ga they are about a third of "
"today's. With no free oxygen the aurora is nitrogen's: violet N₂⁺ bands and a pink border of N₂ first positive "
"bands where faster electrons reach lowest, brighter without oxygen to quench them, with a weak green line from "
"CO₂ split by the electrons, as Perseverance saw on Mars (Knutsen et al. 2025). The 30-bar Hadean air is mostly CO₂, "
"so there the green line is stronger and the nitrogen faint, though the air hides most of it. Brightness is for a "
"dark-adapted eye, which sees violet far better than the deep red. The ancient line strengths are estimates."]],

['Meteors', [
"Each meteor is a meteoroid entering the air along a straight path 80 to 125 km up, with its brightness, size and "
"speed tied by the photographic relation of Jacchia, Verniani &amp; Briggs (1967) and its count set by the measured "
"fireball rate. Today a dark site sees about 8 an hour, more before dawn. A meteor shows only when brighter than "
"the sky around it, so twilight, moonlight and city light thin them out. The air enters three ways. Bright, fast "
"meteors leave persistent trains that glow green and then orange; that chemistry needs oxygen and ozone, so there "
"are no trains before the Great Oxidation. Each meteor's color comes from a spectrum built for its speed and the "
"epoch's air: the metals of the meteoroid, a hotter component that grows with speed, and the air's own emission, "
"oxygen and nitrogen today or carbon monoxide bands in a CO₂-rich air, which no one has measured. And in the "
"Early Hadean's 30 bar every density level sits higher, so meteors burn about 22 km higher up.",
"The rate follows the lunar cratering record (Neukum et al. 2001): about 3,000 times today's at 4.4 Ga, 500 at "
"4.0 Ga and 120 at 3.8 Ga, of slow, yellow-orange fireballs from a main-belt-like population (Strom et al. 2015; "
"Marchi et al. 2014), with impact flashes on the closer Moon's dark side; twice today's at 2.7 Ga; and a hundred "
"times today's fireballs at 466 Ma, after the L-chondrite parent body broke up (Schmitz et al. 2019)."]],

['Dust, comets and the Ordovician ring', [
"The zodiacal light, sunlight off interplanetary dust, is part of today's natural night sky. Where the inner Solar "
"System held more dust the excess is drawn along the ecliptic, with the gegenschein opposite the Sun: 30 times "
"today's after the L-chondrite break-up and 50 to 1,000 times during the bombardment (estimates after Nesvorný et "
"al. 2010), as bright as a moonlit sky, hiding the fainter stars and meteors. At 466 Ma the speculative debris ring "
"of Tomkins, Martin &amp; Cawood (2024) is drawn between 1.55 and 2.75 Earth radii with a normal optical depth of "
"at most 0.00015: lost in the blue by day, a low arch at night cut by the Earth's shadow, and at the equator a "
"source of slow, grazing fireballs from the west.",
"Comets in the modern-era skies are the real ones on their real dates, from JPL's orbits; elsewhere they are drawn "
"at the rate of their time, about one naked-eye comet a year today, 30 times that at 4.4 Ga after the giant planets "
"scattered the comet disk, falling to today's level by about 2 Ga, and 0.6 of today's in the quiet Phanerozoic "
"epochs, since today's sky may still hold the comet shower from the star HD 7977 (Kaib &amp; Raymond 2026). Their "
"heads and tails are dimmed by each epoch's air like the stars."]],

['Clouds', [
"Clouds are not part of the radiative-transfer model; the first-person view draws them as scenery, lit by the "
"model's sky. Their regimes are illustrative choices for each era rather than results: a near-overcast stratiform "
"deck under the steamy Hadean CO₂, scattered cumulus in the Archean thinning as the haze thickens, sparse thin cloud "
"over the frozen Snowball, towering convection in the warm Carboniferous, almost none in the impact winter, and "
"more cirrus in the volcanic year."]],
]

# Other phenomena by epoch (values from the site: sunset.js and gen_site.py sun_bands for refraction,
# day.js AIRGLOW_O/AIRGLOW_CO2 and EXT_K, aurora.js AURORA_EPOCH, meteors.js MET_EPOCH, debris.js ZODI).
PHENOMENA_HEAD = ['Epoch', 'Refraction', 'Airglow', 'Starlight extinction (mag/airmass)', 'Aurora', 'Meteors', 'Zodiacal light']
PHENOMENA = [
['4.4 Ga Hadean', '47× (trapped)', 'violet CO₂ glow only', '7.6: no stars', 'oval near 45°; green CO₂ line, faint N₂', '3,000×', '1,000×'],
['4.0 Ga Hadean', '1.8×', 'violet CO₂ glow only', '0.35', 'oval near 47°; violet and pink N₂', '500×', '300×'],
['3.8 Ga Archean', '0.97×', 'violet CO₂ glow only', '0.25', 'oval near 50°; violet and pink N₂', '120×', '50×'],
['2.7 Ga Archean', '0.90×', 'violet CO₂ glow only', '0.25–1.8 with the haze', 'oval near 54°; violet and pink N₂', '2×', '1.5×'],
['2.2 Ga post-GOE', '0.85×', 'oxygen lines at 30%', '0.25', 'oval near 60°; O lines at a third', '1.3×', 'today'],
['700 Ma Snowball', '0.83×', 'oxygen lines at 80%', '0.25', 'about today’s', '0.6×', 'today'],
['466 Ma Ordovician', '0.97×', 'oxygen lines at 90%', '0.25', 'today’s', '100× fireballs', '30×'],
['300 Ma Carboniferous', '1.11×', 'today’s', '0.25', 'today’s', '0.5×', 'today'],
['66 Ma impact winter', '1.0×', 'today’s, dimmed by soot', '2.3', 'today’s', 'today', 'today'],
['1815 volcanic year', '1.0×', 'today’s', '0.7', 'today’s', 'today', 'today'],
['Today', '1.0× (34′ at the horizon)', '22.0 mag/arcsec² natural sky', '0.25', '63–72° at Kp 3; O green and red', '8 an hour', '—'],
]


PHENOMENA_CAPTION = ("Other phenomena by epoch. Refraction is the horizon bending relative to today's, from the "
                     "epoch's gases. Airglow and aurora strengths are estimates; the aurora's latitude is the night-side "
                     "edge of the quiet oval from the magnetopause distance alone (storms, the usual state of the young "
                     "Sun, push it further toward the equator). Meteor and zodiacal-light rates are relative to today's.")


def lunar_head():
    return ['Epoch', 'Umbra (Moon widths)', 'V at mid-eclipse', 'Surface brightness (mag/arcsec²)', 'Orbit tilt', 'Umbral / total a century', 'Longest totality (min)']


def lunar_rows():
    out = []
    for lab, umb, V, sb, tilt, u, t, m in er.table_rows():
        vis = V > 9
        out.append([lab, '%.2f' % umb, 'invisible' if vis else ('%+.1f' % V).replace('-', '−'),
                    '%.0f' % sb if not vis else ('%.0f' % sb if sb < 40 else '—'), '%.2f°' % tilt, '%d / %d' % (u, t), '%d' % m])
    return out


LUNAR_CAPTION = ("Lunar eclipses by epoch. The umbra's diameter is in Moon widths at the mean distance, with Danjon's "
                 "enlargement. V and the mean surface brightness are for the Moon centered in the shadow, from the "
                 "model's shadow and the Moon's distance; a dark night sky is about 22 mag/arcsec². Counts are the "
                 "page's own over a hundred years of dates (2000–2100), so they carry a few percent of noise from the "
                 "eclipse cycles. Orbit tilt from lunar_inclination.py.")

FIG_CAPTION = ("The Moon in the Earth's shadow at nine epochs. Top: centered in the shadow, with its V magnitude. "
               "Middle: just inside the umbra's edge, where today's ozone leaves a cool gray-blue edge and the "
               "ozone-free Archean and Hadean edges are orange. Each Moon is drawn as the page draws it, for an eye "
               "adapted to its brightest part, on today's lunar surface. Bottom: the light across the shadow, against "
               "the full Moon, with distance in units of each epoch's umbral radius.")

REFS = [
("García Muñoz A. et al. (2012). Glancing views of the Earth: from a lunar eclipse to an exoplanetary transit. <i>Astrophysical Journal</i> 755, 103.", "garciamunoz2012", "@article{garciamunoz2012, author={Garc{\\'i}a Mu{\\~n}oz, A. and Zapatero Osorio, M. R. and Barrena, R. and Monta{\\~n}{\\'e}s-Rodr{\\'i}guez, P. and Mart{\\'i}n, E. L. and Pall{\\'e}, E.}, title={Glancing views of the {Earth}: from a lunar eclipse to an exoplanetary transit}, journal={Astrophysical Journal}, volume={755}, pages={103}, year={2012}}"),
("Kaltenegger L., Lin Z., Madden J. (2020). High-resolution transmission spectra of Earth through geological time. <i>Astrophysical Journal Letters</i> 892, L17.", "kaltenegger2020", "@article{kaltenegger2020, author={Kaltenegger, Lisa and Lin, Zifan and Madden, Jack}, title={High-resolution transmission spectra of {Earth} through geological time}, journal={Astrophysical Journal Letters}, volume={892}, pages={L17}, year={2020}}"),
("Link F. (1969). <i>Eclipse Phenomena in Astronomy</i>. Springer.", "link1969", "@book{link1969, author={Link, Franti{\\v{s}}ek}, title={Eclipse Phenomena in Astronomy}, publisher={Springer}, year={1969}}"),
("Keen R.A. (1983). Volcanic aerosols and lunar eclipses. <i>Science</i> 222, 1011.", "keen1983", "@article{keen1983, author={Keen, Richard A.}, title={Volcanic aerosols and lunar eclipses}, journal={Science}, volume={222}, pages={1011--1013}, year={1983}}"),
("Stothers R.B. (2004). Stratospheric transparency derived from total lunar eclipse colors, 1801–1881. <i>PASP</i> 116, 886.", "stothers2004", "@article{stothers2004, author={Stothers, Richard B.}, title={Stratospheric transparency derived from total lunar eclipse colors, 1801--1881}, journal={Publications of the Astronomical Society of the Pacific}, volume={116}, pages={886--893}, year={2004}}"),
("García Muñoz A., Pallé E., Zapatero Osorio M.R., Martín E.L. (2011). The impact of the Kasatochi eruption on the Moon's illumination during the August 2008 lunar eclipse. <i>Geophysical Research Letters</i> 38, doi:10.1029/2011GL047981.", "garciamunoz2011", "@article{garciamunoz2011, author={Garc{\\'i}a Mu{\\~n}oz, A. and Pall{\\'e}, E. and Zapatero Osorio, M. R. and Mart{\\'i}n, E. L.}, title={The impact of the {Kasatochi} eruption on the {Moon}'s illumination during the {August} 2008 lunar eclipse}, journal={Geophysical Research Letters}, volume={38}, year={2011}, doi={10.1029/2011GL047981}}"),
("Pallé E. et al. (2009). Earth's transmission spectrum from lunar eclipse observations. <i>Nature</i> 459, 814.", "palle2009", "@article{palle2009, author={Pall{\\'e}, E. and Zapatero Osorio, M. R. and Barrena, R. and Monta{\\~n}{\\'e}s-Rodr{\\'i}guez, P. and Mart{\\'i}n, E. L.}, title={Earth's transmission spectrum from lunar eclipse observations}, journal={Nature}, volume={459}, pages={814--816}, year={2009}}"),
("Espenak F. &amp; Meeus J. (2009). <i>Five Millennium Canon of Lunar Eclipses: −1999 to +3000</i>. NASA/TP-2009-214172.", "espenak2009", "@techreport{espenak2009, author={Espenak, Fred and Meeus, Jean}, title={Five Millennium Canon of Lunar Eclipses: -1999 to +3000}, institution={NASA}, number={TP-2009-214172}, year={2009}}"),
("Ćuk M., Hamilton D.P., Lock S.J., Stewart S.T. (2016). Tidal evolution of the Moon from a high-obliquity, high-angular-momentum Earth. <i>Nature</i> 539, 402.", "cuk2016", "@article{cuk2016, author={{\\'C}uk, Matija and Hamilton, Douglas P. and Lock, Simon J. and Stewart, Sarah T.}, title={Tidal evolution of the {Moon} from a high-obliquity, high-angular-momentum {Earth}}, journal={Nature}, volume={539}, pages={402--406}, year={2016}}"),
("Downey B.G., Nimmo F., Matsuyama I. (2022). The thermal-orbital evolution of the Earth-Moon system with a subsurface magma ocean and fossil figure. <i>Icarus</i> 115257.", "downey2022", "@article{downey2022, author={Downey, Brynna G. and Nimmo, Francis and Matsuyama, Isamu}, title={The thermal-orbital evolution of the {Earth-Moon} system with a subsurface magma ocean and fossil figure}, journal={Icarus}, pages={115257}, year={2022}, doi={10.1016/j.icarus.2022.115257}}"),
("Farhat M., Auclair-Desrotour P., Boué G., Laskar J. (2022). The resonant tidal evolution of the Earth-Moon distance. <i>Astronomy &amp; Astrophysics</i> 665, L1.", "farhat2022", "@article{farhat2022, author={Farhat, Mohammad and Auclair-Desrotour, Pierre and Bou{\\'e}, Gwena{\\\"e}l and Laskar, Jacques}, title={The resonant tidal evolution of the {Earth-Moon} distance}, journal={Astronomy \\& Astrophysics}, volume={665}, pages={L1}, year={2022}}"),
("Eulenfeld T. &amp; Heubeck C. (2023). Constraints on Moon's orbit 3.2 billion years ago from tidal bundle data. <i>JGR Planets</i> 128, e2022JE007466.", "eulenfeld2023", "@article{eulenfeld2023, author={Eulenfeld, Tom and Heubeck, Christoph}, title={Constraints on {Moon}'s orbit 3.2 billion years ago from tidal bundle data}, journal={Journal of Geophysical Research: Planets}, volume={128}, pages={e2022JE007466}, year={2023}}"),
("Edlén B. (1966). The refractive index of air. <i>Metrologia</i> 2, 71.", "edlen1966", "@article{edlen1966, author={Edl{\\'e}n, Bengt}, title={The refractive index of air}, journal={Metrologia}, volume={2}, pages={71--80}, year={1966}}"),
("Hestroffer D. &amp; Magnan C. (1998). Wavelength dependency of the Solar limb darkening. <i>Astronomy &amp; Astrophysics</i> 333, 338.", "hestroffer1998", "@article{hestroffer1998, author={Hestroffer, D. and Magnan, C.}, title={Wavelength dependency of the {Solar} limb darkening}, journal={Astronomy \\& Astrophysics}, volume={333}, pages={338--342}, year={1998}}"),
("Krisciunas K. &amp; Schaefer B.E. (1991). A model of the brightness of moonlight. <i>PASP</i> 103, 1033.", "krisciunas1991", "@article{krisciunas1991, author={Krisciunas, Kevin and Schaefer, Bradley E.}, title={A model of the brightness of moonlight}, journal={Publications of the Astronomical Society of the Pacific}, volume={103}, pages={1033--1039}, year={1991}}"),
("Hiesinger H. et al. (2011). Ages and stratigraphy of lunar mare basalts: a synthesis. <i>GSA Special Paper</i> 477, 1.", "hiesinger2011", "@incollection{hiesinger2011, author={Hiesinger, H. and Head, J. W. and Wolf, U. and Jaumann, R. and Neukum, G.}, title={Ages and stratigraphy of lunar mare basalts: A synthesis}, booktitle={Recent Advances and Current Research Issues in Lunar Stratigraphy}, series={GSA Special Paper}, volume={477}, pages={1--51}, year={2011}}"),
("Sharp W.E., Lloyd J.W.F., Silverman S.M. (1966). Zenith skylight intensity and color during the total solar eclipse of 20 July 1963. <i>Applied Optics</i> 5, 787.", "sharp1966", "@article{sharp1966, author={Sharp, W. E. and Lloyd, J. W. F. and Silverman, S. M.}, title={Zenith skylight intensity and color during the total solar eclipse of 20 {July} 1963}, journal={Applied Optics}, volume={5}, pages={787--792}, year={1966}}"),
("Baumbach S. (1937). Strahlung, Ergiebigkeit und Elektronendichte der Sonnenkorona. <i>Astronomische Nachrichten</i> 263, 121.", "baumbach1937", "@article{baumbach1937, author={Baumbach, S.}, title={Strahlung, {Ergiebigkeit} und {Elektronendichte} der {Sonnenkorona}}, journal={Astronomische Nachrichten}, volume={263}, pages={121--134}, year={1937}}"),
("Güdel M., Guinan E.F., Skinner S.L. (1997). The X-ray Sun in time. <i>Astrophysical Journal</i> 483, 947.", "gudel1997", "@article{gudel1997, author={G{\\\"u}del, Manuel and Guinan, Edward F. and Skinner, Stephen L.}, title={The {X}-ray {Sun} in time: a study of the long-term evolution of coronae of solar-type stars}, journal={Astrophysical Journal}, volume={483}, pages={947--960}, year={1997}}"),
("Warren S.G. &amp; Brandt R.E. (2008). Optical constants of ice from the ultraviolet to the microwave: a revised compilation. <i>JGR</i> 113, D14220.", "warren2008", "@article{warren2008, author={Warren, Stephen G. and Brandt, Richard E.}, title={Optical constants of ice from the ultraviolet to the microwave: A revised compilation}, journal={Journal of Geophysical Research}, volume={113}, pages={D14220}, year={2008}}"),
("Leinert Ch. et al. (1998). The 1997 reference of diffuse night sky brightness. <i>Astronomy &amp; Astrophysics Supplement</i> 127, 1.", "leinert1998", "@article{leinert1998, author={Leinert, Ch. and others}, title={The 1997 reference of diffuse night sky brightness}, journal={Astronomy and Astrophysics Supplement Series}, volume={127}, pages={1--99}, year={1998}}"),
("Krasnopolsky V.A. (1983). Venus spectroscopy in the 3000–8000 Å region by Veneras 9 and 10. In <i>Venus</i>, University of Arizona Press.", "krasnopolsky1983", "@incollection{krasnopolsky1983, author={Krasnopolsky, V. A.}, title={Venus spectroscopy in the 3000--8000 {\\AA} region by {Veneras} 9 and 10}, booktitle={Venus}, publisher={University of Arizona Press}, pages={459--483}, year={1983}}"),
("Falchi F. et al. (2016). The new world atlas of artificial night sky brightness. <i>Science Advances</i> 2, e1600377.", "falchi2016", "@article{falchi2016, author={Falchi, Fabio and others}, title={The new world atlas of artificial night sky brightness}, journal={Science Advances}, volume={2}, pages={e1600377}, year={2016}}"),
("Cinzano P., Falchi F., Elvidge C.D. (2001). The first World Atlas of the artificial night sky brightness. <i>MNRAS</i> 328, 689.", "cinzano2001", "@article{cinzano2001, author={Cinzano, P. and Falchi, F. and Elvidge, C. D.}, title={The first {World Atlas} of the artificial night sky brightness}, journal={Monthly Notices of the Royal Astronomical Society}, volume={328}, pages={689--707}, year={2001}}"),
("Kyba C.C.M. et al. (2023). Citizen scientists report global rapid reductions in the visibility of stars from 2011 to 2022. <i>Science</i> 379, 265.", "kyba2023", "@article{kyba2023, author={Kyba, Christopher C. M. and others}, title={Citizen scientists report global rapid reductions in the visibility of stars from 2011 to 2022}, journal={Science}, volume={379}, pages={265--268}, year={2023}}"),
("Fouquet R. &amp; Pearson P.J.G. (2006). Seven centuries of energy services: the price and use of light in the United Kingdom (1300–2000). <i>The Energy Journal</i> 27, 139.", "fouquet2006", "@article{fouquet2006, author={Fouquet, Roger and Pearson, Peter J. G.}, title={Seven centuries of energy services: The price and use of light in the {United Kingdom} (1300--2000)}, journal={The Energy Journal}, volume={27}, pages={139--177}, year={2006}}"),
("Tarduno J.A. et al. (2010). Geodynamo, solar wind, and magnetopause 3.4 to 3.45 billion years ago. <i>Science</i> 327, 1238.", "tarduno2010", "@article{tarduno2010, author={Tarduno, John A. and others}, title={Geodynamo, solar wind, and magnetopause 3.4 to 3.45 billion years ago}, journal={Science}, volume={327}, pages={1238--1240}, year={2010}}"),
("Airapetian V.S., Glocer A., Gronoff G., Hébrard E., Danchi W. (2016). Prebiotic chemistry and atmospheric warming of early Earth by an active young Sun. <i>Nature Geoscience</i> 9, 452.", "airapetian2016", "@article{airapetian2016, author={Airapetian, V. S. and Glocer, A. and Gronoff, G. and H{\\'e}brard, E. and Danchi, W.}, title={Prebiotic chemistry and atmospheric warming of early {Earth} by an active young {Sun}}, journal={Nature Geoscience}, volume={9}, pages={452--455}, year={2016}}"),
("Wood B.E. et al. (2005). New mass-loss measurements from astrospheric Lyα absorption. <i>Astrophysical Journal Letters</i> 628, L143.", "wood2005", "@article{wood2005, author={Wood, Brian E. and others}, title={New mass-loss measurements from astrospheric {Ly}$\\alpha$ absorption}, journal={Astrophysical Journal Letters}, volume={628}, pages={L143--L146}, year={2005}}"),
("Knutsen E.W. et al. (2025). Detection of visible-wavelength aurora on Mars. <i>Science Advances</i>.", "knutsen2025", "@article{knutsen2025, author={Knutsen, Elise W. and others}, title={Detection of visible-wavelength aurora on {Mars}}, journal={Science Advances}, year={2025}}"),
("Jacchia L.G., Verniani F., Briggs R.E. (1967). An analysis of the atmospheric trajectories of 413 precisely reduced photographic meteors. <i>Smithsonian Contributions to Astrophysics</i> 10, 1.", "jacchia1967", "@article{jacchia1967, author={Jacchia, Luigi G. and Verniani, Franco and Briggs, Robert E.}, title={An analysis of the atmospheric trajectories of 413 precisely reduced photographic meteors}, journal={Smithsonian Contributions to Astrophysics}, volume={10}, pages={1--139}, year={1967}}"),
("Neukum G., Ivanov B.A., Hartmann W.K. (2001). Cratering records in the inner Solar System in relation to the lunar reference system. <i>Space Science Reviews</i> 96, 55.", "neukum2001", "@article{neukum2001, author={Neukum, Gerhard and Ivanov, Boris A. and Hartmann, William K.}, title={Cratering records in the inner {Solar System} in relation to the lunar reference system}, journal={Space Science Reviews}, volume={96}, pages={55--86}, year={2001}}"),
("Strom R.G. et al. (2015). The inner solar system cratering record and the evolution of impactor populations. <i>Research in Astronomy and Astrophysics</i> 15, 407.", "strom2015", "@article{strom2015, author={Strom, Robert G. and others}, title={The inner solar system cratering record and the evolution of impactor populations}, journal={Research in Astronomy and Astrophysics}, volume={15}, pages={407--434}, year={2015}}"),
("Marchi S. et al. (2014). Widespread mixing and burial of Earth's Hadean crust by asteroid impacts. <i>Nature</i> 511, 578.", "marchi2014", "@article{marchi2014, author={Marchi, S. and others}, title={Widespread mixing and burial of {Earth}'s {Hadean} crust by asteroid impacts}, journal={Nature}, volume={511}, pages={578--582}, year={2014}}"),
("Schmitz B. et al. (2019). An extraterrestrial trigger for the mid-Ordovician ice age: dust from the breakup of the L-chondrite parent body. <i>Science Advances</i> 5, eaax4184.", "schmitz2019", "@article{schmitz2019, author={Schmitz, Birger and others}, title={An extraterrestrial trigger for the mid-{Ordovician} ice age: Dust from the breakup of the {L}-chondrite parent body}, journal={Science Advances}, volume={5}, pages={eaax4184}, year={2019}}"),
("Nesvorný D. et al. (2010). Cometary origin of the zodiacal cloud and carbonaceous micrometeorites. <i>Astrophysical Journal</i> 713, 816.", "nesvorny2010", "@article{nesvorny2010, author={Nesvorn{\\'y}, David and others}, title={Cometary origin of the zodiacal cloud and carbonaceous micrometeorites}, journal={Astrophysical Journal}, volume={713}, pages={816--836}, year={2010}}"),
("Tomkins A.G., Martin E.L., Cawood P.A. (2024). Evidence suggesting that Earth had a ring in the Ordovician. <i>Earth and Planetary Science Letters</i> 646, 118991.", "tomkins2024", "@article{tomkins2024, author={Tomkins, Andrew G. and Martin, Erin L. and Cawood, Peter A.}, title={Evidence suggesting that {Earth} had a ring in the {Ordovician}}, journal={Earth and Planetary Science Letters}, volume={646}, pages={118991}, year={2024}}"),
("Kaib N.A. &amp; Raymond S.N. (2026). A potential signature of HD 7977's passage among observed long-period comet orbits. <i>Planetary Science Journal</i>, doi:10.3847/PSJ/ae7a65.", "kaib2026", "@article{kaib2026, author={Kaib, Nathan A. and Raymond, Sean N.}, title={A potential signature of {HD 7977}'s passage among observed long-period comet orbits}, journal={Planetary Science Journal}, year={2026}, doi={10.3847/PSJ/ae7a65}}"),
]
