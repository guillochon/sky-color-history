"""The report's bibliography: one list of BibTeX entries, written out as latex/refs.bib for the paper
and formatted for the HTML report's reference list, and the matching of citations in the text.

Citations are written in the prose as they read ("Cooke et al. (2021)", "Sharp, Lloyd & Silverman
1966", "Edwards et al. 2024"); link_cites finds each in the text by the entry's authors and year
and links it to the entry: hyperref's anchor (cite.<key>) in the paper, #ref-<key> in the HTML.
"""
import html as _html, re, unicodedata

import report_sky as rs

BIB = r"""@article{arney2016, author={Arney, Giada and Domagal-Goldman, Shawn D. and Meadows, Victoria S. and others}, title={The Pale Orange Dot: The Spectrum and Habitability of Hazy {Archean} {Earth}}, journal={Astrobiology}, volume={16}, pages={873--899}, year={2016}}
@article{catling2020, author={Catling, David C. and Zahnle, Kevin J.}, title={The {Archean} atmosphere}, journal={Science Advances}, volume={6}, pages={eaax1420}, year={2020}}
@misc{goldblatt2024, author={Goldblatt, Colin and Eager-Nash, Jake K. and Horne, Julia E.}, title={Evolution of the {Archean} Atmosphere}, howpublished={arXiv:2409.13105}, note={In: The {Archean} {Earth}, Elsevier (in press)}, year={2024}}
@article{mak2023, author={Mak, M. T. and others}, title={{3D} simulations of the {Archean} {Earth} including photochemical haze profiles}, journal={Journal of Geophysical Research: Atmospheres}, year={2023}, doi={10.1029/2023JD039343}}
@article{hoffman2017, author={Hoffman, Paul F. and others}, title={Snowball {Earth} climate dynamics and {Cryogenian} geology-geobiology}, journal={Science Advances}, volume={3}, pages={e1600983}, year={2017}}
@article{lynch2005, author={Lynch, David K. and Mazuk, Steven}, title={On the colors of distant objects}, journal={Applied Optics}, year={2005}}
@article{peyvandi2016, author={Peyvandi, Shahram and others}, title={Colorimetric analysis of outdoor illumination across varieties of atmospheric conditions}, journal={Journal of the Optical Society of America A}, volume={33}, pages={1049}, year={2016}}
@article{lee2017, author={Lee, Raymond L. and Mollner, Duncan C.}, title={Tropospheric haze and colors of the clear twilight sky}, journal={Applied Optics}, volume={56}, pages={G179}, year={2017}}
@article{hernandez1999, author={Hern{\'a}ndez-Andr{\'e}s, Javier and Lee, Raymond L. and Romero, Javier}, title={Calculating correlated color temperatures across the entire gamut of daylight and skylight chromaticities}, journal={Applied Optics}, volume={38}, pages={5703--5709}, year={1999}}
@article{zhu2020, author={Zhu, Yunqian and others}, title={Persisting volcanic ash particles impact stratospheric {SO}$_2$ lifetime and aerosol optical properties}, journal={Nature Communications}, year={2020}}
@article{serdyuchenko2014, author={Serdyuchenko, Anna and Gorshelev, Victor and Weber, Mark and Burrows, John P.}, title={High spectral resolution ozone absorption cross-sections -- {Part} 2: Temperature dependence}, journal={Atmospheric Measurement Techniques}, volume={7}, pages={625--636}, year={2014}}
@article{cooke2021, author={Cooke, Gregory J. and Marsh, Daniel R. and Walsh, Catherine and Black, Benjamin and Lamarque, Jean-Francois}, title={A revised lower estimate of ozone columns during {Earth}'s oxygenated history}, journal={Royal Society Open Science}, volume={9}, pages={211165}, year={2022}, doi={10.1098/rsos.211165}}
@article{lawler2022, author={Lawler, Samantha M. and Boley, Aaron C. and Rein, Hanno}, title={Visibility predictions for near-future satellite megaconstellations: latitudes near 50 degrees will experience the worst light pollution}, journal={Astronomical Journal}, volume={163}, pages={21}, year={2022}}
@article{boley2026, author={Boley, Aaron C. and Lawler, Samantha M. and Rein, Hanno}, title={Rings in the sky: orbital data centres and potential impacts to astronomy and the sky}, journal={arXiv e-prints}, pages={arXiv:2608.02757}, year={2026}}
@article{tomkin1998, author={Tomkin, Jocelyn}, title={Once and future celestial kings}, journal={Sky \& Telescope}, volume={95}, number={4}, pages={59}, year={1998}}
@article{anderson2012, author={Anderson, E. and Francis, Ch.}, title={{XHIP}: An extended {Hipparcos} compilation}, journal={Astronomy Letters}, volume={38}, pages={331--346}, year={2012}}
@article{gaia2023, author={{Gaia Collaboration} and Vallenari, A. and others}, title={{Gaia} {Data Release 3}: Summary of the content and survey properties}, journal={Astronomy \& Astrophysics}, volume={674}, pages={A1}, year={2023}}
@article{schoenrich2010, author={Sch{\"o}nrich, Ralph and Binney, James and Dehnen, Walter}, title={Local kinematics and the local standard of rest}, journal={Monthly Notices of the Royal Astronomical Society}, volume={403}, pages={1829--1833}, year={2010}}
@article{pellizza2005,author={Pellizza, L. J. and Mignani, R. P. and Grenier, I. A. and Mirabel, I. F.}, title={On the local birth place of {Geminga}}, journal={Astronomy \& Astrophysics}, year={2005}, doi={10.1051/0004-6361:20042377}}
@article{salvati2008, author={Salvati, M. and Sacco, B.}, title={The {Milagro} anticenter hot spots: cosmic rays from the {Geminga} supernova?}, journal={Astronomy \& Astrophysics}, year={2008}, doi={10.1051/0004-6361:200809586}}
@article{richardson2014, author={Richardson, Dean and Jenkins, Robert L. and Wright, John and Maddox, Larry}, title={Absolute-magnitude distributions of supernovae}, journal={Astronomical Journal}, volume={147}, pages={118}, year={2014}}
@article{thomas2016, author={Thomas, Brian C. and others}, title={Terrestrial effects of nearby supernovae in the early {Pleistocene}}, journal={Astrophysical Journal Letters}, volume={826}, pages={L3}, year={2016}}
@article{neuhauser2019, author={Neuh{\"a}user, Ralph and Gie{\ss}ler, Frank and Hambaryan, Valeri V.}, title={A nearby recent supernova that ejected the runaway star $\zeta$ {Oph}, the pulsar {PSR B1706-16}, and $^{60}${Fe} found on {Earth}}, journal={Monthly Notices of the Royal Astronomical Society}, volume={498}, pages={899}, year={2020}, doi={10.1093/mnras/stz2629}}
@article{wyman2013, author={Wyman, Chris and Sloan, Peter-Pike and Shirley, Peter}, title={Simple analytic approximations to the {CIE} {XYZ} color matching functions}, journal={Journal of Computer Graphics Techniques}, volume={2}, pages={1--11}, year={2013}}
@misc{dziewanowski_flowfields, author={Dziewanowski, Emil}, title={Flowfields}, howpublished={\url{https://emildziewanowski.com/flowfields/}}, year={n.d.}, note={Accessed 11 October 2026}}
""" + "\n".join(r[2] for r in rs.REFS) + "\n" + r"""
"""

# Entries added with the report's widening from the sky's colour to everything seen from the
# ground: the sources the site's code cites for the Sun, Moon, planets, stars and transients.
BIB += r"""
@article{sanroma2012, author={Sanrom{\`a}, Esther and Pall{\'e}, Enric}, title={Reconstructing the photometric light curves of {Earth} as a planet along its history}, journal={Astrophysical Journal}, volume={744}, pages={188}, year={2012}, doi={10.1088/0004-637X/744/2/188}}
@article{baraffe2015, author={Baraffe, Isabelle and Homeier, Derek and Allard, France and Chabrier, Gilles}, title={New evolutionary models for pre-main sequence and main sequence low-mass stars down to the hydrogen-burning limit}, journal={Astronomy \& Astrophysics}, volume={577}, pages={A42}, year={2015}}
@article{korenaga2023, author={Korenaga, Jun}, title={Rapid solidification of {Earth}'s magma ocean limits early lunar recession}, journal={Icarus}, volume={400}, pages={115564}, year={2023}}
@article{daher2021, author={Daher, Houraa and Arbic, Brian K. and Williams, James G. and others}, title={Long-term {Earth-Moon} evolution with high-level orbit and ocean tide models}, journal={Journal of Geophysical Research: Planets}, volume={126}, pages={e2021JE006875}, year={2021}}
@article{cuk2012, author={{\'C}uk, Matija and Stewart, Sarah T.}, title={Making the {Moon} from a fast-spinning {Earth}: a giant impact followed by resonant despinning}, journal={Science}, volume={338}, pages={1047--1052}, year={2012}}
@article{tremaine2009, author={Tremaine, Scott and Touma, Jihad and Namouni, Fathi}, title={Satellite dynamics on the {Laplace} surface}, journal={Astronomical Journal}, volume={137}, pages={3706--3717}, year={2009}}
@inproceedings{arvidson1976, author={Arvidson, R. and Drozd, R. and Guinness, E. and Hohenberg, C. and Morgan, C. and Morrison, R. and Oberbeck, V.}, title={Cosmic ray exposure ages of {Apollo} 17 samples and the age of {Tycho}}, booktitle={Proceedings of the 7th Lunar Science Conference}, pages={2817--2832}, year={1976}}
@article{laskar1989, author={Laskar, Jacques}, title={A numerical experiment on the chaotic behaviour of the {Solar System}}, journal={Nature}, volume={338}, pages={237--238}, year={1989}}
@article{mallama2018, author={Mallama, Anthony and Hilton, James L.}, title={Computing apparent planetary magnitudes for {The Astronomical Almanac}}, journal={Astronomy and Computing}, volume={25}, pages={10--24}, year={2018}}
@article{edwards2024, author={Edwards, Graham Harper and Keller, C. Brenhin and Newton, Elisabeth R. and Stewart, Cameron W.}, title={An early giant planet instability recorded in asteroidal meteorites}, journal={Nature Astronomy}, year={2024}, doi={10.1038/s41550-024-02340-6}}
@article{liu2022, author={Liu, Beibei and Raymond, Sean N. and Jacobson, Seth A.}, title={Early {Solar System} instability triggered by dispersal of the gaseous disk}, journal={Nature}, volume={604}, pages={643--646}, year={2022}}
@article{nesvorny2011, author={Nesvorn{\'y}, David}, title={Young {Solar System}'s fifth giant planet?}, journal={Astrophysical Journal Letters}, volume={742}, pages={L22}, year={2011}}
@article{nesvorny2012, author={Nesvorn{\'y}, David and Morbidelli, Alessandro}, title={Statistical study of the early {Solar System}'s instability with four, five, and six giant planets}, journal={Astronomical Journal}, volume={144}, pages={117}, year={2012}}
@misc{branco2025, author={Branco, Duarte and Raymond, Sean N. and Machado, Pedro}, title={Dynamical origin of {Theia}, the last giant impactor on {Earth}}, howpublished={arXiv:2507.01826}, year={2025}}
@article{meier2014, author={Meier, Matthias M. M. and Reufer, Andreas and Wieler, Rainer}, title={On the origin and composition of {Theia}: constraints from new models of the {Giant Impact}}, journal={Icarus}, volume={242}, pages={316--328}, year={2014}}
@article{odert2018, author={Odert, Petra and Lammer, Helmut and Erkaev, Nikolai V. and others}, title={Escape and fractionation of volatiles and noble gases from {Mars}-sized planetary embryos and growing protoplanets}, journal={Icarus}, volume={307}, pages={327--346}, year={2018}}
@inproceedings{becker2016, author={Becker, K. J. and Robinson, M. S. and Becker, T. L. and others}, title={First global digital elevation model of {Mercury}}, booktitle={47th Lunar and Planetary Science Conference}, pages={2959}, year={2016}}
@article{porco2003, author={Porco, Carolyn C. and West, Robert A. and McEwen, Alfred and others}, title={Cassini imaging of {Jupiter}'s atmosphere, satellites, and rings}, journal={Science}, volume={299}, pages={1541--1547}, year={2003}}
@article{simon2018, author={Simon, Amy A. and Tabataba-Vakili, Fachreddin and Cosentino, Richard and others}, title={Historical and contemporary trends in the size, drift, and color of {Jupiter}'s {Great Red Spot}}, journal={Astronomical Journal}, volume={155}, pages={151}, year={2018}}
@article{jerousek2016, author={Jerousek, Richard G. and Colwell, Joshua E. and Esposito, Larry W. and others}, title={Small particles and self-gravity wakes in {Saturn}'s rings from {UVIS} and {VIMS} stellar occultations}, journal={Icarus}, volume={279}, pages={36--50}, year={2016}}
@incollection{cuzzi1984, author={Cuzzi, Jeffrey N. and Lissauer, Jack J. and Esposito, Larry W. and others}, title={Saturn's rings: properties and processes}, booktitle={Planetary Rings}, editor={Greenberg, Richard and Brahic, Andr{\'e}}, publisher={University of Arizona Press}, pages={73--199}, year={1984}}
@article{iess2019, author={Iess, Luciano and Militzer, Burkhard and Kaspi, Yohai and others}, title={Measurement and implications of {Saturn}'s gravity field and ring mass}, journal={Science}, volume={364}, pages={eaat2965}, year={2019}}
@article{kempf2023, author={Kempf, Sascha and Altobelli, Nicolas and Schmidt, J{\"u}rgen and others}, title={Micrometeoroid infall onto {Saturn}'s rings constrains their age to no more than a few hundred million years}, journal={Science Advances}, volume={9}, pages={eadf8537}, year={2023}}
@article{wisdom2022, author={Wisdom, Jack and Dbouk, Rola and Militzer, Burkhard and others}, title={Loss of a satellite could explain {Saturn}'s obliquity and young rings}, journal={Science}, volume={377}, pages={1285--1289}, year={2022}}
@article{odonoghue2019, author={O'Donoghue, James and Moore, Luke and Connerney, Jack and others}, title={Observations of the chemical and thermal response of `ring rain' on {Saturn}'s ionosphere}, journal={Icarus}, volume={322}, pages={251--260}, year={2019}}
@article{waite2018, author={Waite, J. Hunter and Perryman, Rebecca S. and Perry, Mark E. and others}, title={Chemical interactions between {Saturn}'s atmosphere and its rings}, journal={Science}, volume={362}, pages={eaat2382}, year={2018}}
@article{salmon2010, author={Salmon, Julien and Charnoz, S{\'e}bastien and Crida, Aur{\'e}lien and Brahic, Andr{\'e}}, title={Long-term and large-scale viscous evolution of dense planetary rings}, journal={Icarus}, volume={209}, pages={771--785}, year={2010}}
@article{cuzzi1998, author={Cuzzi, Jeffrey N. and Estrada, Paul R.}, title={Compositional evolution of {Saturn}'s rings due to meteoroid bombardment}, journal={Icarus}, volume={132}, pages={1--35}, year={1998}}
@article{ward2004, author={Ward, William R. and Hamilton, Douglas P.}, title={Tilting {Saturn}. {I}. {Analytic} model}, journal={Astronomical Journal}, volume={128}, pages={2501--2509}, year={2004}}
@article{rufu2017, author={Rufu, Raluca and Canup, Robin M.}, title={Triton's evolution with a primordial {Neptunian} satellite system}, journal={Astronomical Journal}, volume={154}, pages={208}, year={2017}}
@article{cuk2020, author={{\'C}uk, Matija and Minton, David A. and Pouplin, Jennifer L. L. and Wishard, Carlisle}, title={Evidence for a past {Martian} ring from the orbital inclination of {Deimos}}, journal={Astrophysical Journal Letters}, volume={896}, pages={L28}, year={2020}, doi={10.3847/2041-8213/ab974f}}
@article{hesselbrock2017, author={Hesselbrock, Andrew J. and Minton, David A.}, title={An ongoing satellite--ring cycle of {Mars} and the origins of {Phobos} and {Deimos}}, journal={Nature Geoscience}, volume={10}, pages={266--269}, year={2017}}
@misc{hoffleit1991, author={Hoffleit, Dorrit and Warren, Wayne H., Jr.}, title={The {Bright Star Catalogue}, 5th revised edition}, howpublished={Yale University Observatory; VizieR catalogue V/50}, year={1991}}
@article{vandermarel2012, author={{van der Marel}, Roeland P. and Fardal, Mark and Besla, Gurtina and others}, title={The {M31} velocity vector. {II}. {Radial} orbit toward the {Milky Way} and implied {Local Group} mass}, journal={Astrophysical Journal}, volume={753}, pages={8}, year={2012}}
@article{kahn1959, author={Kahn, F. D. and Woltjer, L.}, title={Intergalactic matter and the {Galaxy}}, journal={Astrophysical Journal}, volume={130}, pages={705--717}, year={1959}}
@article{kallivayalil2013, author={Kallivayalil, Nitya and van der Marel, Roeland P. and Besla, Gurtina and others}, title={Third-epoch {Magellanic Cloud} proper motions. {I}. {Hubble Space Telescope}/{WFC3} data and orbit implications}, journal={Astrophysical Journal}, volume={764}, pages={161}, year={2013}}
@article{filippenko1997, author={Filippenko, Alexei V.}, title={Optical spectra of supernovae}, journal={Annual Review of Astronomy and Astrophysics}, volume={35}, pages={309--355}, year={1997}}
@article{borovicka2013, author={Borovi{\v{c}}ka, Ji{\v{r}}{\'i} and Spurn{\'y}, Pavel and Brown, Peter and others}, title={The trajectory, structure and origin of the {Chelyabinsk} asteroidal impactor}, journal={Nature}, volume={503}, pages={235--237}, year={2013}}
@book{glasstone1977, author={Glasstone, Samuel and Dolan, Philip J.}, title={The Effects of Nuclear Weapons}, edition={3rd}, publisher={US Department of Defense and Energy Research and Development Administration}, year={1977}}
@article{collins2005, author={Collins, Gareth S. and Melosh, H. Jay and Marcus, Robert A.}, title={Earth Impact Effects Program: a web-based computer program for calculating the regional environmental consequences of a meteoroid impact on {Earth}}, journal={Meteoritics \& Planetary Science}, volume={40}, pages={817--840}, year={2005}}
@article{suggs2014, author={Suggs, Robert M. and Moser, Danielle E. and Cooke, William J. and Suggs, Ronnie J.}, title={The flux of kilogram-sized meteoroids from lunar impact monitoring}, journal={Icarus}, volume={238}, pages={23--36}, year={2014}}
@article{schmidt1941, author={Schmidt, Ernst}, title={Die {Entstehung} von {Eisnebel} aus den {Auspuffgasen} von {Flugmotoren}}, journal={Schriften der Deutschen Akademie der Luftfahrtforschung}, volume={44}, pages={1--15}, year={1941}}
@article{appleman1953, author={Appleman, Herbert}, title={The formation of exhaust condensation trails by jet aircraft}, journal={Bulletin of the American Meteorological Society}, volume={34}, pages={14--20}, year={1953}}
@article{gierens1999, author={Gierens, Klaus and Schumann, Ulrich and Helten, Manfred and Smit, Herman and Marenco, Alain}, title={A distribution law for relative humidity in the upper troposphere and lower stratosphere derived from three years of {MOZAIC} measurements}, journal={Annales Geophysicae}, volume={17}, pages={1218--1226}, year={1999}}
@article{schumann2005, author={Schumann, Ulrich}, title={Formation, properties and climatic effects of contrails}, journal={Comptes Rendus Physique}, volume={6}, pages={549--565}, year={2005}}
@article{minnis1998, author={Minnis, Patrick and Young, David F. and Garber, Donald P. and others}, title={Transformation of contrails into cirrus during {SUCCESS}}, journal={Geophysical Research Letters}, volume={25}, pages={1157--1160}, year={1998}}
@article{kyba2011, author={Kyba, Christopher C. M. and Ruhtz, Thomas and Fischer, J{\"u}rgen and H{\"o}lker, Franz}, title={Cloud coverage acts as an amplifier for ecological light pollution in urban ecosystems}, journal={PLoS ONE}, volume={6}, pages={e17307}, year={2011}}
@article{zahnle2010, author={Zahnle, Kevin and Schaefer, Laura and Fegley, Bruce}, title={Earth's earliest atmospheres}, journal={Cold Spring Harbor Perspectives in Biology}, volume={2}, pages={a004895}, year={2010}}
"""

ACCENTS = {"'": '\u0301', '"': '\u0308', '~': '\u0303', 'v': '\u030c', '`': '\u0300', '^': '\u0302', 'c': '\u0327',
           'u': '\u0306', '=': '\u0304', '.': '\u0307', 'H': '\u030b', 'k': '\u0328', 'r': '\u030a'}
def bib_text(x):
    """BibTeX text to plain Unicode: accents, special letters, braces and simple math."""
    x = re.sub(r"\{?\\([\'\"~`v^cu=.Hkr])\s*\{?\\?([A-Za-z])\}?\}?", lambda m: m.group(2) + ACCENTS[m.group(1)], x)
    for a, b in ((r'{\ss}', 'ß'), (r'\ss', 'ß'), (r'{\o}', 'ø'), (r'{\O}', 'Ø'), (r'{\l}', 'ł'), (r'{\aa}', 'å'), (r'\&', '&'), ('--', '–'), ('~', ' ')):
        x = x.replace(a, b)
    x = re.sub(r'\$\^\{?(\d+)\}?\$', lambda m: ''.join('⁰¹²³⁴⁵⁶⁷⁸⁹'[int(c)] for c in m.group(1)), x)
    x = re.sub(r'\$_\{?(\d+)\}?\$', lambda m: ''.join('₀₁₂₃₄₅₆₇₈₉'[int(c)] for c in m.group(1)), x)
    for a, b in ((r'$\zeta$', 'ζ'), (r'$\alpha$', 'α'), (r'$\beta$', 'β'), (r'$\epsilon$', 'ε'), (r'$\theta$', 'θ'), (r'$\sim$', '~')):
        x = x.replace(a, b)
    x = x.replace('$', '')
    x = re.sub(r'\\url\{([^}]*)\}', r'\1', x)
    x = re.sub(r'\\[a-zA-Z]+\s*', '', x)
    return unicodedata.normalize('NFC', x.replace('{', '').replace('}', ''))

def _field(entry, name):
    m = re.search(r'[,\s]' + name + r'\s*=\s*\{', entry)
    if not m: return None
    i, depth = m.end(), 1
    while depth:
        depth += {'{': 1, '}': -1}.get(entry[i], 0); i += 1
    return entry[m.end():i - 1]

FIELDS = ('author', 'title', 'journal', 'booktitle', 'publisher', 'volume', 'number', 'pages', 'year', 'doi',
          'howpublished', 'note', 'url', 'editor', 'school', 'institution')
def entries(bib):
    """The entries as dicts: key, type, the raw entry and its fields (BibTeX text)."""
    out = []
    for m in re.finditer(r'@(\w+)\{([^,]+),', bib):
        depth, i = 1, m.end()
        while depth:
            depth += {'{': 1, '}': -1}.get(bib[i], 0); i += 1
        body = bib[m.start():i]
        e = dict(type=m.group(1).lower(), key=m.group(2).strip(), raw=body)
        for f in FIELDS:
            v = _field(body, f)
            if v is not None: e[f] = v
        out.append(e)
    return out

def _names(e):
    return [n.strip() for n in re.split(r'\s+and\s+', bib_text(e['author']))] if e.get('author') else []

def surname(n):
    return n.split(',')[0].strip() if ',' in n else n.split()[-1]

def _initials(n):
    if ',' not in n: return n
    sur, given = n.split(',', 1)
    ini = ''.join('-'.join(q[0] + '.' for q in g.split('-') if q) for g in given.split() if g[:1].isalpha())
    return f'{sur.strip()} {ini}'.strip()

def html_entry(e):
    """One reference as the HTML list shows it: Authors (Year). Title. <i>Venue</i> volume, pages."""
    names = _names(e)
    au = [_initials(n) for n in names if n != 'others']
    if 'others' in names: au_s = ', '.join(au) + ' et al.'
    elif len(au) > 1: au_s = ', '.join(au[:-1]) + ' & ' + au[-1]
    else: au_s = au[0] if au else ''
    t = bib_text(e.get('title', '')).rstrip('.')
    venue = bib_text(e.get('journal') or e.get('booktitle') or e.get('publisher') or e.get('school') or e.get('institution') or '')
    s = f'{_html.escape(au_s)} ({_html.escape(bib_text(e.get("year", "n.d.")))}). {_html.escape(t)}.'
    if venue:
        v = f' <i>{_html.escape(venue)}</i>'
        if e.get('volume'): v += ' ' + _html.escape(bib_text(e['volume']))
        if e.get('pages'): v += (', ' if e.get('volume') else ' ') + _html.escape(bib_text(e['pages']))
        s += v + '.'
    hp = e.get('howpublished')
    if hp:
        url = re.search(r'\\url\{([^}]*)\}', hp)
        s += f' <a href="{url.group(1)}">{_html.escape(url.group(1).split("//")[-1].rstrip("/"))}</a>.' if url else ' ' + _html.escape(bib_text(hp)) + '.'
    if e.get('url'): s += f' <a href="{e["url"]}">{_html.escape(e["url"].split("//")[-1].rstrip("/"))}</a>.'
    if e.get('doi'): s += f' <a href="https://doi.org/{e["doi"]}">doi:{_html.escape(e["doi"])}</a>.'
    if e.get('note'): s += ' ' + _html.escape(bib_text(e['note'])) + '.'
    return s

def sort_key(e):
    names = _names(e)
    first = surname(names[0]) if names else e['key']
    return (unicodedata.normalize('NFD', first).encode('ascii', 'ignore').decode().lower(), e.get('year', ''))

def cite_forms(e):
    """How the text cites an entry ('Cooke et al.', 'Lee & Mollner', 'Sharp, Lloyd & Silverman'), and its year."""
    names = _names(e)
    yr = re.search(r'\d{4}|n\.d\.', e.get('year', ''))
    if not names or not yr or names[0].startswith('Gaia'): return [], None
    sur = [surname(n) for n in names if n != 'others']
    etal = 'others' in names or len(sur) > 3
    forms = []
    if len(sur) >= 3 or etal: forms.append(sur[0] + ' et al.')
    if len(sur) == 1 and not etal: forms.append(sur[0])
    if len(sur) == 2 and not etal: forms += [sur[0] + ' & ' + sur[1], sur[0] + ' and ' + sur[1]]
    if len(sur) == 3 and not etal:
        forms += [sur[0] + ', ' + sur[1] + ' & ' + sur[2], sur[0] + ', ' + sur[1] + ', and ' + sur[2], sur[0] + ', ' + sur[1] + ' and ' + sur[2]]
    return forms, yr.group(0)

_FORMS = {}
def _forms(bib):
    if bib not in _FORMS:
        fl = []
        for e in entries(bib):
            forms, year = cite_forms(e)
            fl += [(f, year, e['key']) for f in forms]
        _FORMS[bib] = sorted(fl, key=lambda t: -len(t[0]))
    return _FORMS[bib]

def link_cites(text, bib, mode):
    """Link each citation written in text to its entry: \\hyperlink{cite.<key>} in LaTeX, #ref-<key> in HTML.
    In LaTeX the text's '&' is already '\\&', in HTML it may be '&' or '&amp;'."""
    for f, year, key in _forms(bib):
        if mode == 'tex': alts = [re.escape(f.replace('&', r'\&'))]
        else: alts = list(dict.fromkeys([re.escape(f), re.escape(f.replace('&', '&amp;'))]))
        y = re.escape(year)
        pat = r'(?<![\w{>-])((?:' + '|'.join(alts) + r') (?:\(' + y + r'[a-z]?\)|' + y + r'[a-z]?))(?![\d}])'
        if mode == 'tex':
            # Protected, since a caption is a moving argument.
            text = re.sub(pat, lambda m: r'\protect\hyperlink{cite.' + key + '}{' + m.group(1) + '}', text)
        else:
            # Not inside a link already made.
            parts = re.split(r'(<a\b.*?</a>)', text, flags=re.S)
            text = ''.join(x if i % 2 else re.sub(pat, lambda m: f'<a class="cite" href="#ref-{key}">{m.group(1)}</a>', x) for i, x in enumerate(parts))
    return text

def html_list(bib):
    return '\n'.join(f'<p id="ref-{e["key"]}">{html_entry(e)}</p>' for e in sorted(entries(bib), key=sort_key))

def unmatched(html_texts):
    """Citation-like phrases left unlinked in the rendered HTML: 'Korenaga (2023)', '... et al. 2019', 'X &amp; Y 2012'."""
    out = set()
    name = r"[A-ZÀ-ɏ][\w'À-ɏ\-]+"
    for t in html_texts:
        plain = re.sub(r'<div class="refs">.*?</div>', '', t, flags=re.S)
        plain = re.sub(r'<a\b[^>]*>.*?</a>', '', plain, flags=re.S)
        plain = re.sub(r'<(style|script)\b.*?</\1>', '', plain, flags=re.S)
        for m in re.finditer(r"(" + name + r"(?: et al\.|(?:, " + name + r")*,? (?:&amp;|&|and) " + name + r")?) \(?((?:1[5-9]|20)\d\d)[a-z]?\)?", plain):
            out.add(m.group(1) + ' ' + m.group(2))
    return sorted(out)
