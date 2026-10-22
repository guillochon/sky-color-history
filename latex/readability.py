#!/usr/bin/env python3
# ruff: noqa: E501  (the edits are exact LaTeX paragraphs)
"""Proposed readability edits to latex/main.tex, as exact before/after pairs.

    python latex/readability.py --render latex/readability.html   # review page, one numbered item per change
    python latex/readability.py --apply 1,3,5-9                   # apply only the approved items to main.tex

The rules cited in each title are those of .cursor/rules/readability.mdc:
  1 human verbs for people   2 keep the optional "that"   3 subject, verb and object close
  4 at most two stacked nouns   5 the common phrase   6 no ad hoc noun-to-verb coinages

Each item is a list of ("sub", old, new) edits; old must occur exactly once in main.tex.
main.tex is written by model/gen_report.py, so approved edits must also be carried into
the prose blocks that script builds from, or the next build will overwrite them.
"""

import argparse
import difflib
import html
import re
import sys
from pathlib import Path

TEX = Path(__file__).resolve().parent / "main.tex"
# The paper has no abstract environment; the subtitle under the title stands in for one.
# The repo's rules set no length limit, so the length is reported but not enforced.
ABSTRACT_LIMIT = None

ITEMS = [
    # 1
    (
        "§1 ¶1: split the 100-word opening sentence at 'to the year 2100:'; give 'which draws each of these' its own sentence [3]",
        [
            (
                "sub",
                r"from a proto-Earth 17 million years after the first solids to the year 2100: the color of the sky by day and at dusk, computed with a spectral radiative-transfer model of each epoch's air, and on that sky everything else that could be seen from the ground: the Sun and its spots,",
                r"from a proto-Earth 17 million years after the first solids to the year 2100. We compute the color of the sky by day and at dusk with a spectral radiative-transfer model of each epoch's air, and on that sky we draw everything else that could be seen from the ground: the Sun and its spots,",
            ),
            (
                "sub",
                r"and grew with the interactive site built on the model, which draws each of these and is the source of every number quoted here outside the color tables.",
                r"and grew with the interactive site that is built on the model. The site draws each of these, and it is the source of every number quoted here outside the color tables.",
            ),
        ],
    ),
    # 2
    (
        "§1 ¶2: 'the site runs the air ... on' and the gapped list of events become separate sentences; 'events come on their days' becomes 'appear on their dates' [3, 5]",
        [
            (
                "sub",
                r"The epochs are fixed points on one timeline: between them the site runs the air, the Sun, the Moon, the planets and the stars on through every year, and some epochs are events with dates and durations of their own, the haze episodes, the glaciations, the impact winter, the volcanic year (Section~\ref{method-time}). The sky's own dated events come on their days too:",
                r"The epochs are fixed points on one timeline. Between them the site carries the air, the Sun, the Moon, the planets and the stars on through every year. Some epochs are events with dates and durations of their own: the haze episodes, the glaciations, the impact winter and the volcanic year (Section~\ref{method-time}). The sky's own dated events also appear on their dates:",
            ),
        ],
    ),
    # 3
    (
        "§1 ¶4: split the Jupiter/Saturn tracer sentence; 'the Moon's craters' shadows' becomes 'the shadows of the Moon's craters' [3, 4]",
        [
            (
                "sub",
                r"shaped by the measured winds and rolled into eddies and billows, a proxy for the planets' true three-dimensional hydrodynamics rather than a simulation of it; the animation repeats over a 2000-day cycle.",
                r"shaped by the measured winds and rolled into eddies and billows. This tracer is a proxy for the planets' true three-dimensional hydrodynamics rather than a simulation of it, and the animation repeats over a 2000-day cycle.",
            ),
            (
                "sub",
                r"The photosphere's granulation and the Moon's craters' shadows are drawn",
                r"The photosphere's granulation and the shadows of the Moon's craters are drawn",
            ),
        ],
    ),
    # 4
    (
        "§1.1 ¶1: 'A search ... finds' becomes 'we find'; unstack 'vivid solar-horizon twilight colors'; restore the verb dropped for Sanromá & Pallé [1, 3, 4]",
        [
            (
                "sub",
                r"Not as such. A search of the Valency corpus (arXiv, PubMed, EarthArXiv and others) finds the two halves of the sky-color problem solved separately but never joined.",
                r"Not as such. In a search of the Valency corpus (arXiv, PubMed, EarthArXiv and others) we find that the two halves of the sky-color problem have been solved separately but never joined.",
            ),
            (
                "sub",
                r"show with Monte Carlo simulation that vivid solar-horizon twilight colors need aerosol while the purest antisolar colors occur",
                r"show with Monte Carlo simulation that vivid twilight colors near the solar horizon need aerosol, while the purest antisolar colors occur",
            ),
            (
                "sub",
                r"and \protect\hyperlink{cite.sanroma2012}{Sanromá \& Pallé (2012)} Earth's light curves over the last 500 million years; that is as close as the literature comes.",
                r"and \protect\hyperlink{cite.sanroma2012}{Sanromá \& Pallé (2012)} compute Earth's light curves over the last 500 million years. That is as close as the literature comes.",
            ),
        ],
    ),
    # 5
    (
        "§1.1 ¶2: 'no reconstruction ... turns up' becomes 'we find no reconstruction', which also brings the verb next to its subject [1, 3]",
        [
            (
                "sub",
                r"but no reconstruction of how the eclipsed Moon itself looked in past epochs turns up, nor of how these pieces together looked from the ground on a given evening.",
                r"but we find no reconstruction of how the eclipsed Moon itself looked in past epochs, nor of how these pieces together looked from the ground on a given evening.",
            ),
        ],
    ),
    # 6
    (
        "§2.1 ¶1: split the multiple-scattering sentence (two semicolons, four claims) into four sentences [3]",
        [
            (
                "sub",
                r"as in \protect\hyperlink{cite.hillaire2020}{Hillaire (2020)}: from each of its nodes, rays in 576 directions gather the light scattered once on its way there and the sunlight off the ground; every later order is then solved exactly, as a linear system for each wavelength, with the ground lit by the scattered light too, and the first four orders keep their directions, which the forward-scattering hazes and aerosols need.",
                r"as in \protect\hyperlink{cite.hillaire2020}{Hillaire (2020)}. From each of its nodes, rays in 576 directions gather the light scattered once on its way there and the sunlight off the ground. Every later order is then solved exactly, as a linear system for each wavelength, with the ground lit by the scattered light too. The first four orders keep their directions, as the forward-scattering hazes and aerosols require.",
            ),
        ],
    ),
    # 7
    (
        "§2.1 ¶1: the CalcMySky comparison puts 40 words before its subject 'the modern sky'; give the comparison its own sentence, and 'pointed backward' becomes 'applied to the past' [3, 5]",
        [
            (
                "sub",
                r"Against CalcMySky (\protect\hyperlink{cite.kabatsayev2025}{Kabatsayev 2025}), an independent multiple-scattering code after \protect\hyperlink{cite.bruneton2008}{Bruneton \& Neyret (2008)} that Stellarium uses (\protect\hyperlink{cite.zotti2023}{Zotti \& Wolf 2023}), run on the same atmospheres, the modern sky agrees within 3\% at the zenith from noon until the Sun is 20$^\circ$ below the horizon and within 0.002 in chromaticity, the hazy Archean and impact skies within 10\% by day and 18\% in twilight, and the 30-bar Hadean within",
                r"We compare our skies with those of CalcMySky (\protect\hyperlink{cite.kabatsayev2025}{Kabatsayev 2025}), an independent multiple-scattering code after \protect\hyperlink{cite.bruneton2008}{Bruneton \& Neyret (2008)} that Stellarium uses (\protect\hyperlink{cite.zotti2023}{Zotti \& Wolf 2023}), run on the same atmospheres. The modern sky agrees within 3\% at the zenith from noon until the Sun is 20$^\circ$ below the horizon and within 0.002 in chromaticity. The hazy Archean and impact skies agree within 10\% by day and 18\% in twilight, and the 30-bar Hadean agrees within",
            ),
            (
                "sub",
                r"pink-lavender antisolar Belt of Venus) before being pointed backward.",
                r"pink-lavender antisolar Belt of Venus) before we apply it to the past.",
            ),
        ],
    ),
    # 8
    (
        "§2.1 ¶2: split the solar-track sentence at the semicolon and say plainly what 'runs linearly ... and the inverse of the luminosity too' means [3]",
        [
            (
                "sub",
                r"and 4,614 K (47\%) for the 17-million-year-old Sun of 4.55 Ga; between the epochs the temperature runs linearly in time and the inverse of the luminosity too, the form of the brightening that \protect\hyperlink{cite.gough1981}{Gough (1981)} gives.",
                r"and 4,614 K (47\%) for the 17-million-year-old Sun of 4.55 Ga. Between the epochs both the temperature and the inverse of the luminosity are linear in time, which is the form of the brightening that \protect\hyperlink{cite.gough1981}{Gough (1981)} gives.",
            ),
        ],
    ),
    # 9
    (
        "§2.2 ¶1: restore 'that' before 'Cooke et al. simulate'; the gapped list 'the Sun as above, the meteoric dust ... with', 'the Moon-forming impact ... is a step' becomes three sentences [2, 3]",
        [
            (
                "sub",
                r"by the global-mean columns \protect\hyperlink{cite.cooke2021}{Cooke et al. (2022)} simulate at fixed oxygen levels",
                r"by the global-mean columns that \protect\hyperlink{cite.cooke2021}{Cooke et al. (2022)} simulate at fixed oxygen levels",
            ),
            (
                "sub",
                r"The tropospheric aerosol's optical depth runs log-linearly between the epochs, the Sun as above, the meteoric dust of the Ordovician break-up with the dust's own rise and decay (\emph{Dust, comets and the Ordovician ring}), and the Moon-forming impact, about 4.51 Ga, is a step: the proto-Earth's air before it and the early Hadean's from it on.",
                r"The tropospheric aerosol's optical depth runs log-linearly between the epochs, and the Sun follows the track given above. The meteoric dust of the Ordovician break-up follows the dust's own rise and decay (\emph{Dust, comets and the Ordovician ring}). The Moon-forming impact, about 4.51 Ga, is a step: the air is the proto-Earth's before it and the early Hadean's from then on.",
            ),
        ],
    ),
    # 10
    (
        "§2.2 ¶2: isotope records do not 'keep returning to' a background; split the K–Pg sentence at the colon [1, 3]",
        [
            (
                "sub",
                r"The Neoarchean's haze episodes interrupt a clear background, which isotope records from South Africa and Western Australia keep returning to",
                r"The Neoarchean's haze episodes interrupt a clear background, which the isotope records from South Africa and Western Australia show again and again between episodes",
            ),
            (
                "sub",
                r"(\protect\hyperlink{cite.bardeen2017}{Bardeen et al. 2017}): the site holds it for a year and clears it with a one-year e-folding time, so its sky shows for about two years over a Late Cretaceous of today's air.",
                r"(\protect\hyperlink{cite.bardeen2017}{Bardeen et al. 2017}). The site holds the soot for a year and then clears it with a one-year e-folding time, so the sky of the impact winter shows for about two years over a Late Cretaceous of today's air.",
            ),
        ],
    ),
    # 11
    (
        "§2.2 ¶2: the three-veil sentence (80 words, 'each Tambora's air at its own veil's depth') becomes four sentences; 'come over' becomes 'appear in' [3, 5]",
        [
            (
                "sub",
                r"Three more volcanic veils come over the modern-era skies as events without epochs of their own, each Tambora's air at its own veil's depth: Laki's sulfur haze from June 1783, over the Northern Hemisphere only and at Tambora's depth, though most of it lay in the troposphere (\protect\hyperlink{cite.thordarson2003}{Thordarson \& Self 2003}), and Krakatoa's of 1883 and Pinatubo's of 1991, about 0.14 and 0.15 at 550 nm at their peaks (\protect\hyperlink{cite.sato1993}{Sato et al. 1993}), each fading with an e-folding time of about a year.",
                r"Three more volcanic veils appear in the modern-era skies as events without epochs of their own; each is Tambora's air at that veil's own depth. Laki's sulfur haze from June 1783 covers the Northern Hemisphere only and is drawn at Tambora's depth, though most of it lay in the troposphere (\protect\hyperlink{cite.thordarson2003}{Thordarson \& Self 2003}). The veils of Krakatoa in 1883 and Pinatubo in 1991 reach about 0.14 and 0.15 at 550 nm at their peaks (\protect\hyperlink{cite.sato1993}{Sato et al. 1993}). Each fades with an e-folding time of about a year.",
            ),
        ],
    ),
    # 12
    (
        "§2.2 ¶3: the sentence that lists the 143 airs holds the threshold and the search method in trailing phrases; split it and put the threshold next to 'miss' [3]",
        [
            (
                "sub",
                r"They are every epoch's own, the years where the curves bend, and more wherever blending the two neighbors would miss the air between them, at any of a set of test directions and Sun heights, by more than 0.02 in log$_{\rm 10}$ luminance (about 5\%) or 0.002 in chromaticity, found by halving each interval in turn.",
                r"They include every epoch's own air and the years where the curves bend. We add more wherever blending the two neighbors would miss the air between them by more than 0.02 in log$_{\rm 10}$ luminance (about 5\%) or 0.002 in chromaticity, at any of a set of test directions and Sun heights, and we find these airs by halving each interval in turn.",
            ),
        ],
    ),
    # 13
    (
        "§3.4: split the 'Beyond the ozone story:' sentence (four semicolons) into separate claims [3]",
        [
            (
                "sub",
                r"Beyond the ozone story: Hadean sunsets were not events at the horizon but a slow dimming of the whole glowing dome; hazy Archean sunsets were the longest and most saturated in Earth's history, vermilion at the horizon and amber overhead; Snowball sunsets were brief and golden; the sunsets of the impact winter did not exist as color at all; and the reddest,",
                r"Apart from ozone, the sunsets differ in other ways. Hadean sunsets were not events at the horizon but a slow dimming of the whole glowing dome. Hazy Archean sunsets were the longest and most saturated in Earth's history, vermilion at the horizon and amber overhead. Snowball sunsets were brief and golden, and the sunsets of the impact winter did not exist as color at all. The reddest,",
            ),
        ],
    ),
    # 14
    (
        "§3.5: renderings do not 'look at' Earth; they show it [1]",
        [
            (
                "sub",
                r"these renderings look at Earth from space with the Sun behind the viewer",
                r"these renderings show Earth from space with the Sun behind the viewer",
            ),
        ],
    ),
    # 15
    (
        "§3.6: 'each about the era's own regime' is hard to parse; restore 'so that' [2, 5]",
        [
            (
                "sub",
                r"and the base sits lower on a damp day than a dry one, each about the era's own regime.",
                r"and the base sits lower on a damp day than on a dry one; each of these varies about the era's own regime.",
            ),
            (
                "sub",
                r"is read on a slanted slice so its 9 km tile does not repeat",
                r"is read on a slanted slice so that its 9 km tile does not repeat",
            ),
        ],
    ),
    # 16
    (
        "§3.7: split the crepuscular-ray sentence (so ... ; along each line of sight) into three [3]",
        [
            (
                "sub",
                r"can be shadowed, so the page computes that share from each air along the timeline, its gas, aerosol, dust, haze, sulfate and soot layers with their heights, for every Sun height and direction (\emph{shafts.py}); along each line of sight the stretches",
                r"can be shadowed. The page computes that share from each air along the timeline, from its gas, aerosol, dust, haze, sulfate and soot layers and their heights, for every Sun height and direction (\emph{shafts.py}). Along each line of sight, the stretches",
            ),
        ],
    ),
    # 17
    (
        "§3.8: split the Lorenz–Mie comparison off; '15–30% faint' becomes 'too faint'; brightness 'rests on' becomes 'depends on' [3, 5]",
        [
            (
                "sub",
                r"It is spread over a range of drop sizes and blurred by the Sun's disk, and colored through the solar spectrum; against Lorenz--Mie theory for drops of 0.1 and 0.3 mm the primary's peak falls within 0.05$^\circ$ and its height within 4\%, while the secondary comes out 15--30\% faint.",
                r"It is spread over a range of drop sizes, blurred by the Sun's disk and colored through the solar spectrum. Compared with Lorenz--Mie theory for drops of 0.1 and 0.3 mm, the primary's peak falls within 0.05$^\circ$ and its height within 4\%, while the secondary comes out 15--30\% too faint.",
            ),
            (
                "sub",
                r"The bow's brightness rests on how much sunlight the drawn clouds let under them",
                r"The bow's brightness depends on how much sunlight the drawn clouds let under them",
            ),
        ],
    ),
    # 18
    (
        "§3.9: 'ways geometric optics misses' gets its 'that' and a plain verb; 'the air offers water to condense on' and '16 microns is drawn, as ... studies take' rewritten [1, 2, 5]",
        [
            (
                "sub",
                r"scatter light in ways geometric optics misses.",
                r"scatter light in ways that geometric optics does not capture.",
            ),
            (
                "sub",
                r"The droplets' size follows how much the air offers water to condense on.",
                r"The droplets' size depends on how many particles the air offers for water to condense on.",
            ),
            (
                "sub",
                r"so their droplets were large: 16 microns is drawn, as Archean climate studies take (",
                r"so their droplets were large: we draw 16 microns, the size that Archean climate studies adopt (",
            ),
        ],
    ),
    # 19
    (
        "§4.1: 'and between the epochs as Gough (1981) gives the brightening, the inverse ... linear in time' becomes its own sentence [3]",
        [
            (
                "sub",
                r"today's 5,772 K by the Cenozoic, and between the epochs as \protect\hyperlink{cite.gough1981}{Gough (1981)} gives the brightening, the inverse of the luminosity linear in time.",
                r"today's 5,772 K by the Cenozoic. Between the epochs we follow the brightening that \protect\hyperlink{cite.gough1981}{Gough (1981)} gives, with the inverse of the luminosity linear in time.",
            ),
        ],
    ),
    # 20
    (
        "§4.2: 'How spotted the Sun was follows its age' becomes 'depends on'; restore the verb gapped from 'and the rotation smoothly' [3, 5]",
        [
            (
                "sub",
                r"How spotted the Sun was follows its age.",
                r"How spotted the Sun was depends on its age.",
            ),
            (
                "sub",
                r"Between the epochs the spot coverage and spot sizes run geometrically from one epoch's to the next's and the rotation smoothly, by the square of the period.",
                r"Between the epochs the spot coverage and spot sizes run geometrically from one epoch's values to the next's, and the rotation changes smoothly, by the square of the period.",
            ),
        ],
    ),
    # 21
    (
        "§4.4: 'How far the air lifts the Sun follows its refractivity' becomes 'depends on' [5]",
        [
            (
                "sub",
                r"How far the air lifts the Sun follows its refractivity, the sum over its gases' partial pressures.",
                r"How far the air lifts the Sun depends on its refractivity, which is a sum over its gases' partial pressures.",
            ),
        ],
    ),
    # 22
    (
        "§4.5: the Hadean corona sentence puts two long phrases before its subject; 'the page stands where ... the best seat' becomes 'places the observer' [1, 3, 5]",
        [
            (
                "sub",
                r"Through the 30-bar Hadean air, at 5.8 magnitudes of extinction per airmass, behind a Moon eight times the Sun's width, the corona hardly shows: only its outer part clears the Moon's limb, a faint glow lost in the molten Moon's own aureole.",
                r"In the 30-bar Hadean the corona hardly shows. The air dims it by 5.8 magnitudes per airmass, the Moon is eight times the Sun's width, and only the corona's outer part clears the Moon's limb, as a faint glow lost in the molten Moon's own aureole.",
            ),
            (
                "sub",
                r"For each new Moon the page stands where parallax brings the Moon closest to the Sun, the best seat for that eclipse.",
                r"For each new Moon the page places the observer where parallax brings the Moon closest to the Sun, the best place to see that eclipse.",
            ),
        ],
    ),
    # 23
    (
        "§5.1 ¶1–2: 'older ages extend the long-term drift' gets a person as subject; restore 'that' in 'the day lengths that Farhat et al. give' [1, 2]",
        [
            (
                "sub",
                r"find 70\% of today's distance in the Moodies Group rhythmites; older ages extend the long-term drift.",
                r"find 70\% of today's distance in the Moodies Group rhythmites; for older ages we extend the long-term drift.",
            ),
            (
                "sub",
                r"This reproduces the day lengths \protect\hyperlink{cite.farhat2022}{Farhat et al. (2022)} give",
                r"This reproduces the day lengths that \protect\hyperlink{cite.farhat2022}{Farhat et al. (2022)} give",
            ),
        ],
    ),
    # 24
    (
        "§5.1 ¶3: split the libration sentence (east–west, north–south and the drawing) into three [3]",
        [
            (
                "sub",
                r"With the eccentricity the Moon rocks east and west each month by about twice the eccentricity in radians, $\pm$6.3$^\circ$ today and $\pm$12$^\circ$ at 4.0 Ga, and north and south by its obliquity, 6.7$^\circ$ today and 21$^\circ$ to 23$^\circ$ at 3.8 and 4.0 Ga, as it nears the Cassini-state transition; the page draws the globe on these axes, so the Moon visibly librates.",
                r"Because of the eccentricity, the Moon rocks east and west each month by about twice the eccentricity in radians: $\pm$6.3$^\circ$ today and $\pm$12$^\circ$ at 4.0 Ga. It rocks north and south by its obliquity, 6.7$^\circ$ today and 21$^\circ$ to 23$^\circ$ at 3.8 and 4.0 Ga, as it nears the Cassini-state transition. The page draws the globe on these axes, so the Moon visibly librates.",
            ),
        ],
    ),
    # 25
    (
        "§5.2 ¶2: move the 40-word parenthetical about how the site cools the molten Moon out from between 'open at the top' and its description [3]",
        [
            (
                "sub",
                r"Its magma ocean is open at the top, some ten million years after the impact (the site draws it so for the first 20 million years, then cools it into the Moon of 4.0 Ga by 4,450 Ma, its glow fading and its dark rafts graying as a crust closes over it; the times are a guess): rafts of dark quench crust",
                r"Some ten million years after the impact, its magma ocean is open at the top: rafts of dark quench crust",
            ),
            (
                "sub",
                r"in four generations of floes, each a network of cracks within the last.",
                r"in four generations of floes, each a network of cracks within the last. The site draws it so for the first 20 million years and then cools it into the Moon of 4.0 Ga by 4,450 Ma, its glow fading and its dark rafts graying as a crust closes over it. These times are a guess.",
            ),
        ],
    ),
    # 26
    (
        "§5.4 ¶2: split Link's-method sentence at the semicolon and give 'summing' a subject [1, 3]",
        [
            (
                "sub",
                r"wherever the ray's bending puts it; summing that over the ring of the limb (Link's method; \protect\hyperlink{cite.link1969}{Link 1969}; \protect\hyperlink{cite.garciamunoz2012}{García Muñoz et al. 2012} for a modern treatment) gives the spectrum",
                r"wherever the ray's bending puts it. We sum that light over the ring of the limb (Link's method; \protect\hyperlink{cite.link1969}{Link 1969}; \protect\hyperlink{cite.garciamunoz2012}{García Muñoz et al. 2012} for a modern treatment), which gives the spectrum",
            ),
        ],
    ),
    # 27
    (
        "§5.4 ¶4: 'Two effects ...' gets First/Second, and the Hadean-eclipse sentence (while ...; but ...) becomes three [3]",
        [
            (
                "sub",
                r"Two effects are new to the deep past. The closer Moon sat nearer",
                r"Two effects are new to the deep past. First, the closer Moon sat nearer",
            ),
            (
                "sub",
                r"And the 30-bar Hadean air is so refractive that below about 19 km its rays are trapped and run round the planet, while the upper air bends light strongly enough to fill the whole umbra of a Moon some 39 Earth radii out, an even, deep red at V = $-$1.7; but the Moon of 4.5 Ga, only 8 Earth radii out, sits well inside the focus, and at mid-eclipse it is gone, V = +12.",
                r"Second, the 30-bar Hadean air is so refractive that below about 19 km its rays are trapped and run round the planet. Its upper air bends light strongly enough to fill the whole umbra of a Moon some 39 Earth radii out with an even, deep red, at V = $-$1.7. But the Moon of 4.5 Ga, only 8 Earth radii out, sits well inside the focus, and at mid-eclipse it is gone, at V = +12.",
            ),
        ],
    ),
    # 28
    (
        "§5.4 ¶5: split the 4.5 Ga shadow sentence; the 50-word gerund subject 'integrating ... gives' becomes 'We integrate ... This gives' [3]",
        [
            (
                "sub",
                r"At 4.5 Ga the Moon, inside the Laplace radius of a fast-spinning Earth, orbits in the plane of the Earth's equator, its shadow is 3.6 Moon widths across and it races through it:",
                r"At 4.5 Ga the Moon lies inside the Laplace radius of a fast-spinning Earth and orbits in the plane of the Earth's equator. The shadow is 3.6 Moon widths across, and the Moon races through it:",
            ),
            (
                "sub",
                r"It was a little steeper then: integrating today's 5.145$^\circ$ back along the distance history with the tidal model of \protect\hyperlink{cite.cuk2016}{Ćuk et al. (2016)}, in which Earth's tides flatten the orbit as the Moon recedes and tides raised in the Moon damp it, gives 5.46$^\circ$",
                r"It was a little steeper then. We integrate today's 5.145$^\circ$ back along the distance history with the tidal model of \protect\hyperlink{cite.cuk2016}{Ćuk et al. (2016)}, in which Earth's tides flatten the orbit as the Moon recedes and tides raised in the Moon damp it. This gives 5.46$^\circ$",
            ),
        ],
    ),
    # 29
    (
        "§6.1 ¶1: split the planet-placement sentence; the magnitude parenthetical sits between 'placed' and 'dimmed' [3]",
        [
            (
                "sub",
                r"for the date and time, light-time corrected, on the same magnitude scale as the stars (Meeus's formulae with the phase angle, Saturn's rings included when there are rings, and \protect\hyperlink{cite.mallama2018}{Mallama \& Hilton 2018} for Uranus and Neptune), and dimmed by the young Sun's fainter light:",
                r"for the date and time, corrected for light time. Their brightness is on the same magnitude scale as the stars (Meeus's formulae with the phase angle, Saturn's rings included when there are rings, and \protect\hyperlink{cite.mallama2018}{Mallama \& Hilton 2018} for Uranus and Neptune), dimmed by the young Sun's fainter light:",
            ),
        ],
    ),
    # 30
    (
        "§6.1 ¶4: split 'We draw that: until 4.54 Ga Mercury is proto-Mercury, ..., and the body that grazes it, Anteros, is ...' [3]",
        [
            (
                "sub",
                r"We draw that: until 4.54 Ga Mercury is proto-Mercury, about 0.12 Earth masses and 3,500 km in radius, 0.7 magnitudes brighter than Mercury in the same place, and the body that grazes it, Anteros, is a Mars-sized planet on an orbit from 0.39 to 0.72 AU that crosses both Mercury's and Venus's.",
                r"We draw that case. Until 4.54 Ga Mercury is proto-Mercury, about 0.12 Earth masses and 3,500 km in radius, and 0.7 magnitudes brighter than Mercury in the same place. The body that grazes it, Anteros, is a Mars-sized planet on an orbit from 0.39 to 0.72 AU that crosses the orbits of both Mercury and Venus.",
            ),
        ],
    ),
    # 31
    (
        "§6.1 ¶5: 'Their elements are fit here' becomes 'We fit their elements', and the brightness clause gets its own sentence [1, 3]",
        [
            (
                "sub",
                r"Their elements are fit here to JPL Horizons over 1800--2200, with periodic terms in the mean longitude for Jupiter's pull (for Pallas, 0.9 degrees over 83 years), to a tenth or two of a degree as seen from the Sun, and their brightness follows",
                r"We fit their elements to JPL Horizons over 1800--2200, with periodic terms in the mean longitude for Jupiter's pull (for Pallas, 0.9 degrees over 83 years), to a tenth or two of a degree as seen from the Sun. Their brightness follows",
            ),
        ],
    ),
    # 32
    (
        "§6.2: planets do not 'wear' maps or 'stand on' shapes (three times in one paragraph) [5]",
        [
            (
                "sub",
                r"Mercury and Mars wear spacecraft maps,",
                r"Mercury and Mars are drawn with spacecraft maps,",
            ),
            (
                "sub",
                r"Ceres and Vesta wear Dawn's Framing Camera mosaics and stand on its shapes:",
                r"Ceres and Vesta are drawn with Dawn's Framing Camera mosaics on its shape models:",
            ),
            (
                "sub",
                r"Proto-Mercury, Anteros and Enyo wear their invented maps and heights as Theia does.",
                r"Proto-Mercury, Anteros and Enyo are drawn with their invented maps and heights, as Theia is.",
            ),
        ],
    ),
    # 33
    (
        "§6.2: split the Uranus-rings sentence (a colon list of absolute phrases, 70 words) [3]",
        [
            (
                "sub",
                r"fit them to thirty years of stellar occultations: each the ellipse of its orbit, its periapse precessing (the $\varepsilon$ ring's 406 km off-center, turning once in nine months), its width growing from periapse to apoapse (the $\varepsilon$ ring's from 20 to 97 km) and its depth thinning to match, with optical depths",
                r"fit them to thirty years of stellar occultations. Each ring is the ellipse of its orbit, with a precessing periapse (the $\varepsilon$ ring is 406 km off-center and turns once in nine months). Its width grows from periapse to apoapse (the $\varepsilon$ ring's from 20 to 97 km) and its depth thins to match, with optical depths",
            ),
        ],
    ),
    # 34
    (
        "§6.3: split the stream-function sentence; restore the verb gapped from 'and its size the fits of Simon et al.'; untangle the caption's 'which eddies marble and billows roll along their edges' [3]",
        [
            (
                "sub",
                r"and the clouds are a tracer stirred by eddies: each point is followed back along the streamlines of a stream function of noise, three octaves of cells three times longer along the winds than across, renewing at different times, its strength greatest in the belts and toward the poles and coming and going in storm patches some 45$^\circ$ long.",
                r"and the clouds are a tracer stirred by eddies. Each point is followed back along the streamlines of a stream function built from noise: three octaves of cells, three times longer along the winds than across, that renew at different times. The stream function is strongest in the belts and toward the poles, and its strength comes and goes in storm patches some 45$^\circ$ long.",
            ),
            (
                "sub",
                r"Its longitude follows the measured record (Peek's for 1831--1952, JUPOS since), and its size the fits of \protect\hyperlink{cite.simon2018}{Simon et al. (2018)} from 1979, 405.0 $-$ 0.1939 Y degrees long and 107.2 $-$ 0.0483 Y wide, and before 1979 a steady shrinking from about 35$^\circ$ long in the 1880s.",
                r"Its longitude follows the measured record (Peek's for 1831--1952, JUPOS since). From 1979 its size follows the fits of \protect\hyperlink{cite.simon2018}{Simon et al. (2018)}, 405.0 $-$ 0.1939 Y degrees long and 107.2 $-$ 0.0483 Y wide, and before 1979 it shrinks steadily from about 35$^\circ$ long in the 1880s.",
            ),
            (
                "sub",
                r"a vortex in the same flow as the belts and zones around it, which eddies marble and Kelvin--Helmholtz billows roll along their edges.",
                r"a vortex in the same flow as the belts and zones around it, which are marbled by eddies and edged with rolling Kelvin--Helmholtz billows.",
            ),
        ],
    ),
    # 35
    (
        "§6.4 ¶1: split the hexagon sentence at its semicolon [3]",
        [
            (
                "sub",
                r"golden inside in the northern summer and bluish gray in the winter; both poles have a vortex with a dark eye and a bright wall, a thin ribbon wave runs along the jet at 47$^\circ$N, and small bright storms",
                r"golden inside in the northern summer and bluish gray in the winter. Both poles have a vortex with a dark eye and a bright wall. A thin ribbon wave runs along the jet at 47$^\circ$N, and small bright storms",
            ),
        ],
    ),
    # 36
    (
        "§6.4 ¶2: split the 75-word ring-profile sentence; 'the Ka band, which sees the particles the X band misses' becomes 'is sensitive to the particles that' [1, 2, 3]",
        [
            (
                "sub",
                r"Saturn's rings are drawn from the Cassini radio occultation of 3 May 2005 (\protect\hyperlink{cite.marouf_corss}{Marouf et al. n.d.}), its optical depth at 10 km resolution from the C ring to the outer A ring, corrected to visible light in the C ring, the Cassini division and the outer A ring by the same occultation's Ka band, which sees the sub-centimeter particles the X band misses (in the outer A ring \protect\hyperlink{cite.jerousek2016}{Jerousek et al. 2016} find them too), with the F ring added.",
                r"Saturn's rings are drawn from the optical depth that the Cassini radio occultation of 3 May 2005 measured at 10 km resolution from the C ring to the outer A ring (\protect\hyperlink{cite.marouf_corss}{Marouf et al. n.d.}), with the F ring added. In the C ring, the Cassini division and the outer A ring we correct it to visible light with the same occultation's Ka band, which is sensitive to the sub-centimeter particles that the X band misses (in the outer A ring \protect\hyperlink{cite.jerousek2016}{Jerousek et al. 2016} find them too).",
            ),
        ],
    ),
    # 37
    (
        "§6.4 ¶3: the Chrysalis sentence separates 'an icy moon' from 'was torn apart' by 15 words and then adds two more claims; split it [3]",
        [
            (
                "sub",
                r"we adopt the account of \protect\hyperlink{cite.wisdom2022}{Wisdom et al. (2022)}: an icy moon the size of Iapetus, named Chrysalis, orbiting between Titan and Iapetus in a 3:1 resonance with Titan, was torn apart roughly 100 to 200 million years ago, about 160 million years ago in the case they illustrate, freeing Saturn's tilt from Neptune's pull and making the rings of its debris.",
                r"we adopt the account of \protect\hyperlink{cite.wisdom2022}{Wisdom et al. (2022)}. In that account an icy moon the size of Iapetus, named Chrysalis, orbited between Titan and Iapetus in a 3:1 resonance with Titan. It was torn apart roughly 100 to 200 million years ago (about 160 million years ago in the case they illustrate), which freed Saturn's tilt from Neptune's pull, and its debris made the rings.",
            ),
        ],
    ),
    # 38
    (
        "§6.6 ¶1: split the 90-word cooling sentence; restore 'that' in 'the effective temperature that its own heat would give' and 'that Voyager measured' [2, 3]",
        [
            (
                "sub",
                r"Each cools as it ages: we take its intrinsic temperature, the effective temperature its own heat alone would give it, to fall as the age to the $-$0.29, a power-law fit to the cooling tracks of \protect\hyperlink{cite.burrows1997}{Burrows et al. (1997)}, scaled to today's (98 K for Jupiter, 78 K for Saturn, 53 K for Neptune, from the effective temperatures Voyager measured,",
                r"Each cools as it ages. Its intrinsic temperature is the effective temperature that its own heat alone would give it, and we take it to fall as the age to the $-$0.29, a power-law fit to the cooling tracks of \protect\hyperlink{cite.burrows1997}{Burrows et al. (1997)}. We scale it to today's values (98 K for Jupiter, 78 K for Saturn, 53 K for Neptune, from the effective temperatures that Voyager measured,",
            ),
        ],
    ),
    # 39
    (
        "§6.6 ¶2: split 'from the bottom up; young, Jupiter...'; the Neptune clause stacks two 'as' comparisons ('as pale a cyan as Uranus, ..., as Neptune is at 4.0 Ga') [3]",
        [
            (
                "sub",
                r"so as each planet cooled its clouds formed in turn from the bottom up; young, Jupiter and Saturn had no ammonia clouds",
                r"so as each planet cooled, its clouds formed in turn from the bottom up. When young, Jupiter and Saturn had no ammonia clouds",
            ),
            (
                "sub",
                r"above about 85 K Neptune has no methane ice, no bright streaks, and shows its H2S deck higher up, as pale a cyan as Uranus, whose top deck is H2S now (\protect\hyperlink{cite.irwin2018}{Irwin et al. 2018}), as Neptune is at 4.0 and 3.8 Ga.",
                r"above about 85 K Neptune has no methane ice and no bright streaks, and shows its H2S deck higher up, as it does at 4.0 and 3.8 Ga. It is then as pale a cyan as Uranus, whose top deck is H2S now (\protect\hyperlink{cite.irwin2018}{Irwin et al. 2018}).",
            ),
        ],
    ),
    # 40
    (
        "§6.7: 'the moon ... that Ćuk et al. find tilted Deimos's orbit' drops a 'that'; split the Phobos-acceleration sentence and restore 'the rate at which' [2, 3]",
        [
            (
                "sub",
                r"Mars, from 4.3 to 3.5 Ga, has Harmonia (named here), the moon of some twenty times Phobos's mass at 3.3 Mars radii that \protect\hyperlink{cite.cuk2020}{Ćuk et al. (2020)} find tilted Deimos's orbit, one generation of Mars's cycle of rings and moons (\protect\hyperlink{cite.hesselbrock2017}{Hesselbrock \& Minton 2017}).",
                r"Mars, from 4.3 to 3.5 Ga, has Harmonia (named here), a moon of some twenty times Phobos's mass at 3.3 Mars radii. \protect\hyperlink{cite.cuk2020}{Ćuk et al. (2020)} find that such a moon tilted Deimos's orbit, as one generation of Mars's cycle of rings and moons (\protect\hyperlink{cite.hesselbrock2017}{Hesselbrock \& Minton 2017}).",
            ),
            (
                "sub",
                r"Phobos is falling toward Mars: its tidal acceleration, half the rate its mean motion grows, is 1.258 $\times$ 10$^{-3}$ degrees per year squared (\protect\hyperlink{cite.brozovic2025}{Brozović, Jacobson \& Park 2025}), which is put back into its fitted longitude, so its place stays right",
                r"Phobos is falling toward Mars. Its tidal acceleration, half the rate at which its mean motion grows, is 1.258 $\times$ 10$^{-3}$ degrees per year squared (\protect\hyperlink{cite.brozovic2025}{Brozović, Jacobson \& Park 2025}). We put it back into the fitted longitude, so the position of Phobos stays right",
            ),
        ],
    ),
    # 41
    (
        "§7.1: 'how far the site can follow them sets two kinds of sky'; split the stand-in sentence ('as the nearby stars' speeds ... run, each nearest ...') [3, 5]",
        [
            (
                "sub",
                r"Going back, the stars move, and how far the site can follow them sets two kinds of sky.",
                r"Going back, the stars move, and how far back the site can follow them divides the past into two kinds of sky.",
            ),
            (
                "sub",
                r"gives way to stand-ins of its kind: stars of its absolute magnitude, color and spectral type passing the Sun one after another on straight lines at 15 to 40 km/s, as the nearby stars' speeds relative to the Sun run, each nearest the Sun at today's star's distance and so as bright as it, toward the galactic latitude it has today and at a random longitude.",
                r"gives way to stand-ins of its kind. These are stars of its absolute magnitude, color and spectral type that pass the Sun one after another on straight lines at 15 to 40 km/s, the range of the nearby stars' speeds relative to the Sun. Each stand-in passes nearest the Sun at today's star's distance, and so is as bright as it, toward the galactic latitude that the star has today and at a random longitude.",
            ),
        ],
    ),
    # 42
    (
        "§7.2: the 30-word gerund subject 'Tracing every Hipparcos star ... finds eleven' becomes 'We trace ... and find' [1, 3]",
        [
            (
                "sub",
                r"Tracing every Hipparcos star that has a radial velocity back 10 Myr through the Galaxy, with 2,000 draws over each star's measurement errors, finds eleven that outshone",
                r"We trace every Hipparcos star that has a radial velocity back 10 Myr through the Galaxy, with 2,000 draws over each star's measurement errors, and find eleven that outshone",
            ),
        ],
    ),
    # 43
    (
        "§7.3: split the four-claim Galaxy sentence at its semicolons; 'star formation history' unstacked; 'disc' becomes 'disk' (american-spelling.mdc) [3, 4]",
        [
            (
                "sub",
                r"\protect\hyperlink{cite.lu2024}{Lu et al. 2024}); the disc grew from the inside out, its half-mass radius by 43\% over 7 Gyr (\protect\hyperlink{cite.frankel2019}{Frankel et al. 2019}); its stars were younger, so the disc was thinner and bluer and its bulge less faded, following the star formation history measured from Gaia (\protect\hyperlink{cite.snaith2014}{Snaith et al. 2014}; \protect\hyperlink{cite.mor2019}{Mor et al. 2019}; \protect\hyperlink{cite.gallart2024}{Gallart et al. 2024}); and there was more gas, so more dust (\protect\hyperlink{cite.genzel2015}{Genzel et al. 2015}). Seen from the inner disc 4.5 Ga,",
                r"\protect\hyperlink{cite.lu2024}{Lu et al. 2024}). The disk grew from the inside out, its half-mass radius by 43\% over 7 Gyr (\protect\hyperlink{cite.frankel2019}{Frankel et al. 2019}). Its stars were younger, so the disk was thinner and bluer and its bulge less faded, following the history of star formation measured from Gaia (\protect\hyperlink{cite.snaith2014}{Snaith et al. 2014}; \protect\hyperlink{cite.mor2019}{Mor et al. 2019}; \protect\hyperlink{cite.gallart2024}{Gallart et al. 2024}). There was also more gas, and so more dust (\protect\hyperlink{cite.genzel2015}{Genzel et al. 2015}). Seen from the inner disk 4.5 Ga,",
            ),
        ],
    ),
    # 44
    (
        "§7.4: events 'come on their days in whichever epoch's sky holds that day'; a latitude does not 'see' an event; restore 'from which' and 'when' [1, 2, 3, 5]",
        [
            (
                "sub",
                r"The timeline also holds the sky's own dated events, which come on their days in whichever epoch's sky holds that day, and which the date picker lists under Extended events:",
                r"The timeline also holds the sky's own dated events. Each appears on its date in whichever epoch's sky contains that date, and the date picker lists them under Extended events:",
            ),
            (
                "sub",
                r"Going to one sets the clock to the hour it shows best, highest in the darkest sky (a meteor storm at its peak, a volcanic veil at dusk, an impact as it comes in), and the latitude it is best seen from: of the equator and the two mid-latitudes, where most people live, the one that sees it highest in the darkest sky, and a polar one only when none of those sees it 10$^\circ$ up at night.",
                r"Going to one sets the clock to the hour when it shows best, highest in the darkest sky (a meteor storm at its peak, a volcanic veil at dusk, an impact as it comes in). It also sets the latitude from which it is best seen. That is whichever of the equator and the two mid-latitudes, where most people live, has it highest in the darkest sky; a polar latitude is chosen only when the event does not reach 10$^\circ$ up at night from any of those three.",
            ),
        ],
    ),
    # 45
    (
        "§7.5 ¶2: 'Geminga's, about 342,000 years ago by ..., exploded' puts the verb 20 words after its subject; 'neither touches the sky's colors' becomes 'changes' [3, 5]",
        [
            (
                "sub",
                r"Geminga's, about 342,000 years ago by its pulsar's spin-down age (\protect\hyperlink{cite.salvati2008}{Salvati \& Sacco 2008}), exploded 90 to 240 pc away toward Orion (\protect\hyperlink{cite.pellizza2005}{Pellizza et al. 2005}); a typical Type II-P peaks",
                r"Geminga's exploded about 342,000 years ago by its pulsar's spin-down age (\protect\hyperlink{cite.salvati2008}{Salvati \& Sacco 2008}), 90 to 240 pc away toward Orion (\protect\hyperlink{cite.pellizza2005}{Pellizza et al. 2005}). A typical Type II-P peaks",
            ),
            (
                "sub",
                r"At these distances neither touches the sky's colors",
                r"At these distances neither changes the sky's colors",
            ),
        ],
    ),
    # 46
    (
        "§7.5 ¶3: Betelgeuse's supernova is the same kind of event as Geminga's, not the same event; split the LMC sentence at its semicolon; a galaxy does not 'see' a disruption [1, 3, 5]",
        [
            (
                "sub",
                r"Betelgeuse's supernova is the same event as Geminga's, in the same patch of sky:",
                r"Betelgeuse's supernova will be the same kind of event as Geminga's, in the same patch of sky:",
            ),
            (
                "sub",
                r"predict; a Sun-like star's debris would fall back on it at about 140 times the Eddington rate,",
                r"predict. The debris of a Sun-like star would fall back on it at about 140 times the Eddington rate,",
            ),
            (
                "sub",
                r"with no nuclear star cluster the Cloud would see one in 10$^{5}$ to 10$^{6}$ years",
                r"with no nuclear star cluster the Cloud would host one disruption in 10$^{5}$ to 10$^{6}$ years",
            ),
        ],
    ),
    # 47
    (
        "§8.2: move the 30-word parenthetical about the 19 km screen out of the list; unstack 'twilight display curve'; 'How often they come follows what they need' [3, 4, 5]",
        [
            (
                "sub",
                r"Their light is computed through each epoch's air: the sunlight reaching the layer as it grazes past the Earth's shadow (little of it passing below about 19 km, where cloud and haze screen it, a height that varies from place to place and leaves the shadow's edge ragged), the grains' Mie scattering, and the path down to the eye.",
                r"Their light is computed through each epoch's air: the sunlight that reaches the layer as it grazes past the Earth's shadow, the grains' Mie scattering, and the path down to the eye. Little of that sunlight passes below about 19 km, where cloud and haze screen it; this height varies from place to place and leaves the shadow's edge ragged.",
            ),
            (
                "sub",
                r"The page's twilight display curve would compress that contrast,",
                r"The curve that the page uses to display twilight would compress that contrast,",
            ),
            (
                "sub",
                r"How often they come follows what they need: a cold mesopause,",
                r"How often they form depends on two conditions: a cold mesopause,",
            ),
        ],
    ),
    # 48
    (
        "§8.3: split the 3.45 Ga magnetopause sentence; in the Hadean sentence the subject 'the air, at 5.8 magnitudes ..., and the zodiacal glow' is split by a parenthetical [3]",
        [
            (
                "sub",
                r"(\protect\hyperlink{cite.tarduno2010}{Tarduno et al. 2010}), which brings the oval's edge down to about 50$^\circ$ even in quiet times,",
                r"(\protect\hyperlink{cite.tarduno2010}{Tarduno et al. 2010}). That brings the oval's edge down to about 50$^\circ$ even in quiet times,",
            ),
            (
                "sub",
                r"so there the green line would be stronger and the nitrogen faint, but the air, at 5.8 magnitudes of extinction per airmass, and the bombardment's zodiacal glow hide the aurora altogether.",
                r"so there the green line would be stronger and the nitrogen faint. But the aurora is hidden altogether, by the air's 5.8 magnitudes of extinction per airmass and by the bombardment's zodiacal glow.",
            ),
        ],
    ),
    # 49
    (
        "§8.4: 'a dark site sees' becomes 'an observer at a dark site sees'; 'The air enters three ways'; split the IMO sentence at its semicolon [1, 3, 5]",
        [
            (
                "sub",
                r"Today a dark site sees about 8 an hour,",
                r"Today an observer at a dark site sees about 8 an hour,",
            ),
            (
                "sub",
                r"The air enters three ways.",
                r"The air affects meteors in three ways.",
            ),
            (
                "sub",
                r"with the Leonid peaks predicted for 2034; the Leonid storm of 1833 and the Andromedid storms of 1872 and 1885 are among the extended events, at their peaks",
                r"with the Leonid peaks predicted for 2034. The Leonid storm of 1833 and the Andromedid storms of 1872 and 1885 are among the extended events, shown at their peaks",
            ),
        ],
    ),
    # 50
    (
        "§8.5 ¶2: split the 85-word Chicxulub sentence; the dangling 'Played faster than real time, the clock slows' [3]",
        [
            (
                "sub",
                r"Chicxulub's hour is assumed, in the evening twilight with the Sun 9$^\circ$ down, so that the asteroid, coming from the north-east, is lit nearly full face against a darkening sky and stays sunlit until it meets the air: by the H, G magnitude system for its size and an albedo of 0.05 it shows as a star some 40 minutes before it strikes, and in its last seconds as a cratered, lumpy disk 1.5$^\circ$ across, drawn with Phobos's map and shape standing in for a face no one knows.",
                r"We assume an hour for Chicxulub in the evening twilight, with the Sun 9$^\circ$ down, so that the asteroid, coming from the north-east, is lit nearly full face against a darkening sky and stays sunlit until it meets the air. By the H, G magnitude system for its size and an albedo of 0.05, it shows as a star some 40 minutes before it strikes. In its last seconds it is a cratered, lumpy disk 1.5$^\circ$ across, drawn with Phobos's map and shape standing in for a face that no one knows.",
            ),
            (
                "sub",
                r"Played faster than real time, the clock slows to real time 30 seconds before each,",
                r"When the clock runs faster than real time, it slows to real time 30 seconds before each,",
            ),
        ],
    ),
    # 51
    (
        "§8.6 ¶2: split the comet-rate sentence (rate today, at 4.5 Ga, by 2 Ga and in the Phanerozoic, then the reason) [3]",
        [
            (
                "sub",
                r"Elsewhere comets are drawn at the rate of their time, about one naked-eye comet a year today, 30 times that at 4.5 Ga while the giant planets eroded and then scattered the comet disk, falling to today's level by about 2 Ga, and about half of today's in the quiet Phanerozoic epochs, because",
                r"Elsewhere comets are drawn at the rate of their time. That rate is about one naked-eye comet a year today and 30 times that at 4.5 Ga, while the giant planets eroded and then scattered the comet disk. It falls to today's level by about 2 Ga and is about half of today's in the quiet Phanerozoic epochs, because",
            ),
        ],
    ),
    # 52
    (
        "§9.4 ¶2: split the satellite-lighting sentence (three semicolons); 'so, the second generation' [3]",
        [
            (
                "sub",
                r"Each face is lit by the Sun and by the sunlit Earth below, each patch of ground by its own Sun's height, so that near the terminator only the lit crescent toward the Sun counts; the cells lie under cover glass and radiators are mirror-like optical solar reflectors, so besides their diffuse light they glint, and mirror the Earth; the wings follow the Sun on their drive, about 2$^\circ$ off where it aims them, and the ISS's on two axes as its rotary joints turn them.",
                r"Each face is lit by the Sun and by the sunlit Earth below, with each patch of ground lit at its own Sun's height, so that near the terminator only the lit crescent toward the Sun counts. The cells lie under cover glass and the radiators are mirror-like optical solar reflectors, so besides their diffuse light they glint and mirror the Earth. The wings follow the Sun on their drive, about 2$^\circ$ off where it aims them, and the ISS's wings follow on two axes as its rotary joints turn them.",
            ),
            (
                "sub",
                r"and the second's under mirror film; so, the second generation comes out",
                r"and the second's under mirror film. As a result the second generation comes out",
            ),
        ],
    ),
    # 53
    (
        "§10 intro and proto-Earth panel: restore 'so that'; the opening sentence runs 'the gas ... has just cleared, and with it, in the reading of ..., the giant planets went unstable'; split it [2, 3]",
        [
            (
                "sub",
                r"The panels that follow are laid out identically so they can be compared at a glance.",
                r"The panels that follow are laid out identically so that they can be compared at a glance.",
            ),
            (
                "sub",
                r"the gas of the Sun's disk has just cleared, and with it, in the reading of the meteorites' bombardment ages (\protect\hyperlink{cite.edwards2024}{Edwards et al. 2024}; \protect\hyperlink{cite.liu2022}{Liu, Raymond \& Jacobson 2022}), the giant planets went unstable at about this time, some 5 to 20 million years after the first solids; we draw them just before it.",
                r"the gas of the Sun's disk has just cleared. In the reading of the meteorites' bombardment ages (\protect\hyperlink{cite.edwards2024}{Edwards et al. 2024}; \protect\hyperlink{cite.liu2022}{Liu, Raymond \& Jacobson 2022}), the giant planets went unstable at about this time, as the gas cleared, some 5 to 20 million years after the first solids. We draw them just before the instability.",
            ),
        ],
    ),
    # 54
    (
        "§10 Early Hadean panel: split the 55-word Moon sentence (distance, size, magma ocean, orbit) [3]",
        [
            (
                "sub",
                r"4$^\circ$ across, seven and a half times its width today and 57 times its area, its own magma ocean still open, glowing orange through cracks in its crust, and going round the Earth in 32 hours in the plane of the equator, while the Earth turns in under 6.",
                r"4$^\circ$ across, seven and a half times its width today and 57 times its area. Its own magma ocean is still open and glows orange through cracks in its crust. It goes round the Earth in 32 hours in the plane of the equator, while the Earth turns in under 6.",
            ),
        ],
    ),
    # 55
    (
        "§10 Neoarchean panels: isotopes do not 'keep returning to' a background; restore 'that' twice [1, 2]",
        [
            (
                "sub",
                r"Sulfur and carbon isotopes from South Africa and Western Australia, 2.7 to 2.5 Ga, keep returning to the same haze-free background between episodes of haze",
                r"Sulfur and carbon isotopes from South Africa and Western Australia, 2.7 to 2.5 Ga, record the same haze-free background again and again between episodes of haze",
            ),
            (
                "sub",
                r"One of the haze episodes the isotope records preserve:",
                r"One of the haze episodes that the isotope records preserve:",
            ),
            (
                "sub",
                r"the youngest in the Ghaap Group and the one \protect\hyperlink{cite.izon2017}{Izon et al. (2017)} resolved, is drawn",
                r"the youngest in the Ghaap Group and the one that \protect\hyperlink{cite.izon2017}{Izon et al. (2017)} resolved, is drawn",
            ),
        ],
    ),
    # 56
    (
        "§10 Cryogenian and Ordovician panels: split the 70-word Cryogenian sentence; give the ring's description its own sentence [3]",
        [
            (
                "sub",
                r"with more aerosol and no glacial dust, but the sea is open and the land bare, so the sky is a clean, slightly deep blue over a dark surface, and with the Sun 4$^\circ$ down the zenith is a paler blue than today's, about 13,300 K against 24,000, under the thinner ozone layer.",
                r"with more aerosol and no glacial dust. But the sea is open and the land bare, so the sky is a clean, slightly deep blue over a dark surface. With the Sun 4$^\circ$ down, the zenith is a paler blue than today's under the thinner ozone layer, about 13,300 K against 24,000.",
            ),
            (
                "sub",
                r"into a ring that lasted tens of millions of years; it is drawn as a faint, sunlit band",
                r"into a ring that lasted tens of millions of years. We draw it as a faint, sunlit band",
            ),
        ],
    ),
    # 57
    (
        "§10 Geminga, ozone-hole and modern panels: 'barely touches the atmosphere'; 'It is the same direction as the thin post-oxidation column'; restore 'that' [2, 4, 5]",
        [
            (
                "sub",
                r"at this distance the explosion barely touches the atmosphere",
                r"at this distance the explosion barely affects the atmosphere",
            ),
            (
                "sub",
                r"It is the same direction as the thin post-oxidation column, and still well short of",
                r"The shift is in the same direction as under the thin column after the Great Oxidation, and still well short of",
            ),
            (
                "sub",
                r"Today's clean air is the baseline the other skies are measured against.",
                r"Today's clean air is the baseline that the other skies are measured against.",
            ),
        ],
    ),
    # 58
    (
        "§11 Caveats: '18% bright' becomes 'too bright'; untangle the list that mixes strengths and rates [3, 5]",
        [
            (
                "sub",
                r"which leaves the hazy skies' zenith up to 18\% bright in twilight,",
                r"which leaves the hazy skies' zenith up to 18\% too bright in twilight,",
            ),
            (
                "sub",
                r"the strengths of the ancient airglow, aurorae, coronae, meteor, shower and comet rates and zodiacal dust are estimates set to show the trend,",
                r"the strengths of the ancient airglow, aurorae, coronae and zodiacal dust, and the rates of meteors, showers and comets, are estimates set to show the trend,",
            ),
        ],
    ),
    # 59
    (
        "Appendix B: 'Single scattering checks the setup'; the hazy skies 'run bright'; move the 30-word parenthetical in the closing paragraph out from between 'cannot' and 'and it adds' [1, 3, 5]",
        [
            (
                "sub",
                r"Single scattering checks the setup: ours matches",
                r"The single-scattering term checks the setup: ours matches",
            ),
            (
                "sub",
                r"\paragraph{The hazy skies} run bright at the zenith:",
                r"\paragraph{The hazy skies} run too bright at the zenith:",
            ),
            (
                "sub",
                r"Beyond the radiative transfer, ours carries what a spherically symmetric model cannot (albedo that changes with latitude, the shadows of clouds, refraction where it shows, in the eclipsed Moon and the setting Sun, and the views from space), and it adds the researched deep-time atmospheres themselves and the color science on top:",
                r"Beyond the radiative transfer, ours includes what a spherically symmetric model cannot: albedo that changes with latitude, the shadows of clouds, refraction where it shows (in the eclipsed Moon and the setting Sun), and the views from space. It also adds the researched deep-time atmospheres themselves, and on top of them the color science:",
            ),
        ],
    ),
]

PRIORITY = {}


def apply_edit(text, edit):
    """Return (new text, before snippet, after snippet)."""
    kind, old, new = edit
    if kind != "sub":
        raise ValueError(kind)
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"substring matched {n} times: {old[:60]!r}")
    return text.replace(old, new), old, new


def order(numbers):
    return sorted(numbers, key=lambda n: (PRIORITY.get(n, 1), n))


def parse_numbers(spec):
    out = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-")
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(part))
    bad = [n for n in out if not 1 <= n <= len(ITEMS)]
    if bad:
        raise SystemExit(f"no such item: {bad}")
    return out


def words(s):
    return len(re.sub(r"\\[A-Za-z]+|[{}$\\]", " ", s).split())


def abstract_chars(text):
    # the subtitle under the title, which serves as the paper's abstract
    m = re.search(r"\{\\large\\color\{ink\} (.*?)\\par\}", text, re.S)
    return len(m.group(1))


def limit_text(chars):
    if ABSTRACT_LIMIT is None:
        return f"{chars} characters (no limit set)"
    return f"{chars} of {ABSTRACT_LIMIT} characters"


def diff_html(before, after):
    a, b = before.split(" "), after.split(" ")
    left, right = [], []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(
        a=a, b=b, autojunk=False
    ).get_opcodes():
        old = html.escape(" ".join(a[i1:i2]))
        new = html.escape(" ".join(b[j1:j2]))
        if op == "equal":
            left.append(old)
            right.append(new)
        else:
            if old:
                left.append(f"<del>{old}</del>")
            if new:
                right.append(f"<ins>{new}</ins>")
    return " ".join(left), " ".join(right)


def render(out):
    text = TEX.read_text(encoding="utf-8").replace("\r\n", "\n")
    blocks = []
    total = 0
    for n in range(1, len(ITEMS) + 1):
        title, edits = ITEMS[n - 1]
        added = 0
        rows = []
        for edit in edits:
            # each item is shown against the current source, independent of the others
            _, before, after = apply_edit(text, edit)
            added += words(after) - words(before)
            left, right = diff_html(before, after)
            rows.append(
                f"<div class=pair><div><h4>Before</h4><p>{left}</p></div>"
                f"<div><h4>After</h4><p>{right}</p></div></div>"
            )
        total += added
        blocks.append(
            f"<section><h2>{n}. {html.escape(title)}</h2>"
            f"<div class=saved>{added:+d} words</div>{''.join(rows)}</section>"
        )
    full = text
    for n in order(range(1, len(ITEMS) + 1)):
        for edit in ITEMS[n - 1][1]:
            full, _, _ = apply_edit(full, edit)
    chars = abstract_chars(full)
    page = f"""<!doctype html><html><head><meta charset=utf-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<title>Readability edits</title><style>
:root {{ --bg:#fff; --fg:#1d1d1f; --muted:#666; --line:#ddd; --del:#fde2e2; --delfg:#9b1c1c; --ins:#dcf5e3; --insfg:#14632f; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#17181a; --fg:#e8e8e8; --muted:#9a9a9a; --line:#333; --del:#4a1f22; --delfg:#ffb3b3; --ins:#173a24; --insfg:#a8e6b8; }} }}
body {{ background:var(--bg); color:var(--fg); font:15px/1.5 system-ui, sans-serif; margin:0 auto; max-width:1200px; padding:16px; }}
h1 {{ font-size:22px; }} h2 {{ font-size:17px; margin:0 0 4px; }} h4 {{ margin:0 0 4px; font-size:12px; text-transform:uppercase; color:var(--muted); }}
section {{ border-top:1px solid var(--line); padding:16px 0; }}
.saved {{ color:var(--muted); font-size:13px; margin-bottom:8px; }}
.pair {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:10px; }}
@media (max-width:700px) {{ .pair {{ grid-template-columns:1fr; }} }}
p {{ font-family:ui-monospace, Consolas, monospace; font-size:12.5px; white-space:pre-wrap; overflow-wrap:anywhere; margin:0; }}
del {{ background:var(--del); color:var(--delfg); text-decoration:none; }}
ins {{ background:var(--ins); color:var(--insfg); text-decoration:none; }}
</style></head><body>
<h1>Proposed readability edits to latex/main.tex</h1>
<p style="font-family:inherit;font-size:14px">{len(ITEMS)} items, {total:+d} words in all; no item touches the subtitle that stands in for the abstract, which is {limit_text(chars)}. Rule numbers in brackets refer to .cursor/rules/readability.mdc: 1 human verbs for people, 2 keep the optional "that", 3 subject, verb and object close, 4 at most two stacked nouns, 5 the common phrase, 6 no ad hoc noun-to-verb coinages. Each item is shown against the current source. Red is removed, green is added. main.tex is generated by model/gen_report.py, so approved edits must also go into its prose source. Reply with the numbers to apply.</p>
{"".join(blocks)}
</body></html>"""
    Path(out).write_text(page, encoding="utf-8")
    print(
        f"wrote {out}: {len(ITEMS)} items, {total:+d} words, abstract {limit_text(chars)}"
    )


def apply(numbers):
    raw = TEX.read_text(encoding="utf-8")
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")
    for n in order(numbers):
        for edit in ITEMS[n - 1][1]:
            text, _, _ = apply_edit(text, edit)
        print(f"applied {n}. {ITEMS[n - 1][0]}")
    chars = abstract_chars(text)
    if ABSTRACT_LIMIT is not None and chars > ABSTRACT_LIMIT:
        raise SystemExit(
            f"abstract would be {chars} characters, over {ABSTRACT_LIMIT}; main.tex not written"
        )
    TEX.write_text(
        text.replace("\n", "\r\n") if crlf else text, encoding="utf-8", newline=""
    )


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--render", metavar="HTML")
    parser.add_argument("--apply", metavar="NUMBERS", help="e.g. 1,3,5-9")
    args = parser.parse_args()
    if args.render:
        render(args.render)
    if args.apply:
        apply(parse_numbers(args.apply))
    if not (args.render or args.apply):
        parser.print_help()


if __name__ == "__main__":
    sys.exit(main())
