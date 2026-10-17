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
@article{mak2023, author={Mak, M. T. and others}, title={{3D} simulations of the {Archean} {Earth} including photochemical haze profiles}, journal={Journal of Geophysical Research: Atmospheres}, volume={128}, pages={e2023JD039343}, year={2023}, doi={10.1029/2023JD039343}}
@article{lynch2005, author={Lynch, David K. and Mazuk, Steven}, title={On the colors of distant objects}, journal={Applied Optics}, volume={44}, pages={5737}, year={2005}}
@article{peyvandi2016, author={Peyvandi, Shahram and others}, title={Colorimetric analysis of outdoor illumination across varieties of atmospheric conditions}, journal={Journal of the Optical Society of America A}, volume={33}, pages={1049}, year={2016}}
@article{lee2017, author={Lee, Raymond L. and Mollner, Duncan C.}, title={Tropospheric haze and colors of the clear twilight sky}, journal={Applied Optics}, volume={56}, pages={G179}, year={2017}}
@article{serdyuchenko2014, author={Serdyuchenko, Anna and Gorshelev, Victor and Weber, Mark and Chehade, Wissam and Burrows, John P.}, title={High spectral resolution ozone absorption cross-sections -- {Part} 2: Temperature dependence}, journal={Atmospheric Measurement Techniques}, volume={7}, pages={625--636}, year={2014}}
@article{cooke2021, author={Cooke, Gregory J. and Marsh, Daniel R. and Walsh, Catherine and Black, Benjamin and Lamarque, Jean-Francois}, title={A revised lower estimate of ozone columns during {Earth}'s oxygenated history}, journal={Royal Society Open Science}, volume={9}, pages={211165}, year={2022}, doi={10.1098/rsos.211165}}
@article{lawler2022, author={Lawler, Samantha M. and Boley, Aaron C. and Rein, Hanno}, title={Visibility predictions for near-future satellite megaconstellations: latitudes near 50 degrees will experience the worst light pollution}, journal={Astronomical Journal}, volume={163}, pages={21}, year={2022}}
@article{boley2026, author={Boley, Aaron C. and Lawler, Samantha M. and Rein, Hanno}, title={Rings in the sky: orbital data centres and potential impacts to astronomy and the sky}, journal={arXiv e-prints}, pages={arXiv:2608.02757}, year={2026}}
@article{tomkin1998, author={Tomkin, Jocelyn}, title={Once and future celestial kings}, journal={Sky \& Telescope}, volume={95}, number={4}, pages={59}, year={1998}}
@article{anderson2012, author={Anderson, E. and Francis, Ch.}, title={{XHIP}: An extended {Hipparcos} compilation}, journal={Astronomy Letters}, volume={38}, pages={331--346}, year={2012}}
@article{gaia2023, author={{Gaia Collaboration} and Vallenari, A. and others}, title={{Gaia} {Data Release 3}: Summary of the content and survey properties}, journal={Astronomy \& Astrophysics}, volume={674}, pages={A1}, year={2023}}
@article{schoenrich2010, author={Sch{\"o}nrich, Ralph and Binney, James and Dehnen, Walter}, title={Local kinematics and the local standard of rest}, journal={Monthly Notices of the Royal Astronomical Society}, volume={403}, pages={1829--1833}, year={2010}}
@article{pellizza2005,author={Pellizza, L. J. and Mignani, R. P. and Grenier, I. A. and Mirabel, I. F.}, title={On the local birth place of {Geminga}}, journal={Astronomy \& Astrophysics}, volume={435}, pages={625}, year={2005}, doi={10.1051/0004-6361:20042377}}
@article{salvati2008, author={Salvati, M. and Sacco, B.}, title={The {Milagro} anticenter hot spots: cosmic rays from the {Geminga} supernova?}, journal={Astronomy \& Astrophysics}, volume={485}, pages={527}, year={2008}, doi={10.1051/0004-6361:200809586}}
@article{joyce2020, author={Joyce, Meridith and Leung, Shing-Chi and Moln{\'a}r, L{\'a}szl{\'o} and Ireland, Michael and Kobayashi, Chiaki and Nomoto, Ken'ichi}, title={Standing on the shoulders of giants: new mass and distance estimates for {Betelgeuse} through combined evolutionary, asteroseismic, and hydrodynamic simulations with {MESA}}, journal={Astrophysical Journal}, volume={902}, pages={63}, year={2020}, doi={10.3847/1538-4357/abb8db}}
@article{harper2017, author={Harper, G. M. and Brown, A. and Guinan, E. F. and O'Gorman, E. and Richards, A. M. S. and Kervella, P. and Decin, L.}, title={An updated 2017 astrometric solution for {Betelgeuse}}, journal={Astronomical Journal}, volume={154}, pages={11}, year={2017}, doi={10.3847/1538-3881/aa6ff9}}
@article{richardson2014, author={Richardson, Dean and Jenkins, Robert L. and Wright, John and Maddox, Larry}, title={Absolute-magnitude distributions of supernovae}, journal={Astronomical Journal}, volume={147}, pages={118}, year={2014}}
@article{thomas2016, author={Thomas, Brian C. and others}, title={Terrestrial effects of nearby supernovae in the early {Pleistocene}}, journal={Astrophysical Journal Letters}, volume={826}, pages={L3}, year={2016}}
@article{neuhauser2019, author={Neuh{\"a}user, Ralph and Gie{\ss}ler, Frank and Hambaryan, Valeri V.}, title={A nearby recent supernova that ejected the runaway star $\zeta$ {Oph}, the pulsar {PSR B1706-16}, and $^{60}${Fe} found on {Earth}}, journal={Monthly Notices of the Royal Astronomical Society}, volume={498}, pages={899}, year={2020}, doi={10.1093/mnras/stz2629}}
@article{wyman2013, author={Wyman, Chris and Sloan, Peter-Pike and Shirley, Peter}, title={Simple analytic approximations to the {CIE} {XYZ} color matching functions}, journal={Journal of Computer Graphics Techniques}, volume={2}, number={2}, pages={1--11}, year={2013}, url={https://jcgt.org/published/0002/02/01/}}
@article{hillaire2020, author={Hillaire, S{\'e}bastien}, title={A Scalable and Production Ready Sky and Atmosphere Rendering Technique}, journal={Computer Graphics Forum}, volume={39}, number={4}, pages={13--22}, year={2020}, doi={10.1111/cgf.14050}}
@article{bruneton2008, author={Bruneton, Eric and Neyret, Fabrice}, title={Precomputed Atmospheric Scattering}, journal={Computer Graphics Forum}, volume={27}, number={4}, pages={1079--1086}, year={2008}, doi={10.1111/j.1467-8659.2008.01245.x}}
@article{bruneton2017, author={Bruneton, Eric}, title={A Qualitative and Quantitative Evaluation of 8 Clear Sky Models}, journal={IEEE Transactions on Visualization and Computer Graphics}, volume={23}, number={12}, pages={2641--2655}, year={2017}, doi={10.1109/TVCG.2016.2622272}}
@article{toon1989, author={Toon, Owen B. and McKay, C. P. and Ackerman, T. P. and Santhanam, K.}, title={Rapid calculation of radiative heating rates and photodissociation rates in inhomogeneous multiple scattering atmospheres}, journal={Journal of Geophysical Research}, volume={94}, number={D13}, pages={16287--16301}, year={1989}, doi={10.1029/JD094iD13p16287}}
@misc{kabatsayev2025, author={Kabatsayev, Ruslan}, title={{CalcMySky}: simulator of light scattering by planetary atmospheres}, howpublished={\url{https://github.com/10110111/CalcMySky}}, year={2025}, note={Version 0.4.0}}
@article{zotti2023, author={Zotti, Georg and Wolf, Alexander}, title={Stellarium: Finally at Version 1.0! And Beyond}, journal={Journal of Skyscape Archaeology}, volume={8}, number={2}, pages={332--334}, year={2023}, doi={10.1558/jsa.25608}}
@misc{dziewanowski_flowfields, author={Dziewanowski, Emil}, title={Flowfields}, howpublished={\url{https://emildziewanowski.com/flowfields/}}, year={2024}, note={Accessed 11 October 2026}}
@article{stoffler2001, author={St{\"o}ffler, Dieter and Ryder, Graham}, title={Stratigraphy and isotope ages of lunar geologic units: chronological standard for the inner solar system}, journal={Space Science Reviews}, volume={96}, pages={9--54}, year={2001}}
@article{strassmeier2009, author={Strassmeier, Klaus G.}, title={Starspots}, journal={Astronomy and Astrophysics Review}, volume={17}, pages={251--308}, year={2009}, doi={10.1007/s00159-009-0020-6}}
@article{feldstein1967, author={Feldstein, Y. I. and Starkov, G. V.}, title={Dynamics of auroral belt and polar geomagnetic disturbances}, journal={Planetary and Space Science}, volume={15}, pages={209--229}, year={1967}}
@article{wallner2016, author={Wallner, A. and others}, title={Recent near-{Earth} supernovae probed by global deposition of interstellar radioactive $^{60}${Fe}}, journal={Nature}, volume={532}, pages={69--72}, year={2016}}
@article{fimiani2016, author={Fimiani, L. and others}, title={Interstellar $^{60}${Fe} on the surface of the {Moon}}, journal={Physical Review Letters}, volume={116}, pages={151104}, year={2016}}
@misc{marouf_corss, author={Marouf, Essam A. and others}, title={Cassini radio occultation by {Saturn}'s rings, {Rev} 7 egress, 3 {May} 2005}, howpublished={NASA Planetary Data System, Ring-Moon Systems Node, volume CORSS\_8001}, year={n.d.}}
""" + "\n".join(r[2] for r in rs.REFS) + "\n" + r"""
"""

# Entries added with the report's widening from the sky's colour to everything seen from the
# ground: the sources the site's code cites for the Sun, Moon, planets, stars and transients.
BIB += r"""
@article{sanroma2012, author={Sanrom{\'a}, Esther and Pall{\'e}, Enric}, title={Reconstructing the photometric light curves of {Earth} as a planet along its history}, journal={Astrophysical Journal}, volume={744}, pages={188}, year={2012}, doi={10.1088/0004-637X/744/2/188}}
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
@article{branco2025, author={Branco, Duarte and Machado, Pedro and Raymond, Sean N.}, title={Dynamical origin of {Theia}, the last giant impactor on {Earth}}, journal={Icarus}, volume={441}, pages={116724}, year={2025}, doi={10.1016/j.icarus.2025.116724}}
@article{meier2014, author={Meier, Matthias M. M. and Reufer, Andreas and Wieler, Rainer}, title={On the origin and composition of {Theia}: constraints from new models of the {Giant Impact}}, journal={Icarus}, volume={242}, pages={316--328}, year={2014}}
@article{benz2007, author={Benz, W. and Anic, A. and Horner, J. and Whitby, J. A.}, title={The origin of {Mercury}}, journal={Space Science Reviews}, volume={132}, pages={189--202}, year={2007}, doi={10.1007/s11214-007-9284-1}}
@article{chau2018, author={Chau, Alice and Reinhardt, Christian and Helled, Ravit and Stadel, Joachim}, title={Forming {Mercury} by giant impacts}, journal={Astrophysical Journal}, volume={865}, pages={35}, year={2018}, doi={10.3847/1538-4357/aad8b0}}
@article{clement2019, author={Clement, Matthew S. and Kaib, Nathan A. and Chambers, John E.}, title={Dynamical constraints on {Mercury}'s collisional origin}, journal={Astronomical Journal}, volume={157}, pages={208}, year={2019}, doi={10.3847/1538-3881/ab164f}}
@article{franco2025, author={Franco, Patrick and Roig, Fernando and Winter, Othon C. and Sfair, Rafael and Burger, Christoph and Sch{\"a}fer, Christoph M.}, title={Formation of {Mercury} by a grazing giant collision involving similar-mass bodies}, journal={Nature Astronomy}, volume={9}, pages={1158}, year={2025}, doi={10.1038/s41550-025-02582-y}}
@article{bussmann2025, author={Bussmann, Mirco and Reinhardt, Christian and Gillmann, C{\'e}dric and Meier, Thomas and Stadel, Joachim and Tackley, Paul J. and Helled, Ravit}, title={The possibility of a giant impact on {Venus}}, journal={Astronomy \& Astrophysics}, volume={702}, pages={A106}, year={2025}, doi={10.1051/0004-6361/202555802}}
@article{marinova2008, author={Marinova, Margarita M. and Aharonson, Oded and Asphaug, Erik}, title={Mega-impact formation of the {Mars} hemispheric dichotomy}, journal={Nature}, volume={453}, pages={1216--1219}, year={2008}, doi={10.1038/nature07070}}
@article{ballantyne2023, author={Ballantyne, Harry A. and Jutzi, Martin and Golabek, Gregor J. and Mishra, Lokesh and Cheng, Kar Wai and Rozel, Antoine B. and Tackley, Paul J.}, title={Investigating the feasibility of an impact-induced {Martian} dichotomy}, journal={Icarus}, volume={392}, pages={115395}, year={2023}, doi={10.1016/j.icarus.2022.115395}}
@article{vanderkaaden2015, author={Vander Kaaden, Kathleen E. and McCubbin, Francis M.}, title={Exotic crust formation on {Mercury}: consequences of a shallow, {FeO}-poor mantle}, journal={Journal of Geophysical Research: Planets}, volume={120}, pages={195--209}, year={2015}, doi={10.1002/2014JE004733}}
@article{peplowski2016, author={Peplowski, Patrick N. and Klima, Rachel L. and Lawrence, David J. and others}, title={Remote sensing evidence for an ancient carbon-bearing crust on {Mercury}}, journal={Nature Geoscience}, volume={9}, pages={273--276}, year={2016}, doi={10.1038/ngeo2669}}
@article{denevi2013, author={Denevi, Brett W. and Ernst, Carolyn M. and Meyer, Heather M. and others}, title={The distribution and origin of smooth plains on {Mercury}}, journal={Journal of Geophysical Research: Planets}, volume={118}, pages={891--907}, year={2013}, doi={10.1002/jgre.20075}}
@article{mccord2012, author={McCord, T. B. and Li, J.-Y. and Combe, J.-P. and others}, title={Dark material on {Vesta} from the infall of carbonaceous volatile-rich material}, journal={Nature}, volume={491}, pages={83--86}, year={2012}, doi={10.1038/nature11561}}
@article{odert2018, author={Odert, Petra and Lammer, Helmut and Erkaev, Nikolai V. and others}, title={Escape and fractionation of volatiles and noble gases from {Mars}-sized planetary embryos and growing protoplanets}, journal={Icarus}, volume={307}, pages={327--346}, year={2018}}
@inproceedings{becker2016, author={Becker, K. J. and Robinson, M. S. and Becker, T. L. and others}, title={First global digital elevation model of {Mercury}}, booktitle={47th Lunar and Planetary Science Conference}, pages={2959}, year={2016}}
@article{porco2003, author={Porco, Carolyn C. and West, Robert A. and McEwen, Alfred and others}, title={Cassini imaging of {Jupiter}'s atmosphere, satellites, and rings}, journal={Science}, volume={299}, pages={1541--1547}, year={2003}}
@article{garciamelendo2011, author={Garc{\'i}a-Melendo, Enrique and P{\'e}rez-Hoyos, Santiago and S{\'a}nchez-Lavega, Agust{\'i}n and Hueso, Ricardo}, title={Saturn's zonal wind profile in 2004--2009 from {Cassini} {ISS} images and its long-term variability}, journal={Icarus}, volume={215}, pages={62--74}, year={2011}, doi={10.1016/j.icarus.2011.07.005}}
@article{godfrey1988, author={Godfrey, D. A.}, title={A hexagonal feature around {Saturn}'s north pole}, journal={Icarus}, volume={76}, pages={335--356}, year={1988}, doi={10.1016/0019-1035(88)90075-9}}
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
@article{brozovic2025, author={Brozovi{\'c}, Marina and Jacobson, Robert A. and Park, Ryan S.}, title={Revised ephemerides of the {Martian} satellites, {Phobos} and {Deimos}}, journal={Astronomical Journal}, year={2025}, doi={10.3847/1538-3881/addab4}}
@article{cuk2025, author={{\'C}uk, Matija and Anand, Kaustub and Minton, David A.}, title={Two possible orbital histories of {Phobos}}, journal={Planetary Science Journal}, year={2025}, doi={10.3847/psj/adc1ba}}
@article{park2016, author={Park, Ryan S. and Konopliv, Alexander S. and Bills, Bruce G. and others}, title={A partially differentiated interior for (1) {Ceres} deduced from its gravity field and shape}, journal={Nature}, volume={537}, pages={515--517}, year={2016}}
@article{marsset2020, author={Marsset, Micha{\"e}l and Bro{\v{z}}, Miroslav and Vernazza, Pierre and others}, title={The violent collisional history of aqueously evolved (2) {Pallas}}, journal={Nature Astronomy}, volume={4}, pages={569--576}, year={2020}}
@incollection{bowell1989, author={Bowell, Edward and Hapke, Bruce and Domingue, Deborah and others}, title={Application of photometric models to asteroids}, booktitle={Asteroids II}, publisher={University of Arizona Press}, pages={524--556}, year={1989}}
@article{french2024, author={French, Richard G. and Hedman, Matthew M. and Nicholson, Philip D. and Longaretti, Pierre-Yves and McGhee-French, Colleen A.}, title={The {Uranus} system from occultation observations (1977--2006): rings, pole direction, gravity field, and masses of {Cressida}, {Cordelia}, and {Ophelia}}, journal={Icarus}, volume={411}, pages={115957}, year={2024}}
@incollection{esposito1991, author={Esposito, Larry W. and Brahic, Andr{\'e} and Burns, Joseph A. and Marouf, Essam A.}, title={Particle properties and processes in {Uranus'} rings}, booktitle={Uranus}, editor={Bergstralh, Jay T. and Miner, Ellis D. and Matthews, Mildred S.}, publisher={University of Arizona Press}, pages={410--465}, year={1991}}
@article{fortney2011, author={Fortney, Jonathan J. and Ikoma, Masahiro and Nettelmann, Nadine and Guillot, Tristan and Marley, Mark S.}, title={Self-consistent model atmospheres and the cooling of the {Solar System's} giant planets}, journal={Astrophysical Journal}, volume={729}, pages={32}, year={2011}}
@article{burrows1997, author={Burrows, Adam and Marley, Mark and Hubbard, William B. and others}, title={A nongray theory of extrasolar giant planets and brown dwarfs}, journal={Astrophysical Journal}, volume={491}, pages={856--875}, year={1997}}
@article{spiegel2012, author={Spiegel, David S. and Burrows, Adam}, title={Spectral and photometric diagnostics of giant planet formation scenarios}, journal={Astrophysical Journal}, volume={745}, pages={174}, year={2012}}
@article{sudarsky2000, author={Sudarsky, David and Burrows, Adam and Pinto, Philip}, title={Albedo and reflection spectra of extrasolar giant planets}, journal={Astrophysical Journal}, volume={538}, pages={885--903}, year={2000}}
@article{hanel1981, author={Hanel, Rudolf A. and Conrath, Barney J. and Herath, L. W. and Kunde, Virgil G. and Pirraglia, Joseph A.}, title={Albedo, internal heat, and energy balance of {Jupiter}: preliminary results of the {Voyager} infrared investigation}, journal={Journal of Geophysical Research}, volume={86}, pages={8705--8712}, year={1981}}
@article{hanel1983, author={Hanel, Rudolf A. and Conrath, Barney J. and Kunde, Virgil G. and Pearl, John C. and Pirraglia, Joseph A.}, title={Albedo, internal heat flux, and energy balance of {Saturn}}, journal={Icarus}, volume={53}, pages={262--285}, year={1983}}
@article{pearl1991, author={Pearl, John C. and Conrath, Barney J.}, title={The albedo, effective temperature, and energy balance of {Neptune}, as determined from {Voyager} data}, journal={Journal of Geophysical Research}, volume={96}, pages={18921--18930}, year={1991}}
@article{irwin2018, author={Irwin, Patrick G. J. and Toledo, Daniel and Garland, Ryan and others}, title={Detection of hydrogen sulfide above the clouds in {Uranus's} atmosphere}, journal={Nature Astronomy}, volume={2}, pages={420--427}, year={2018}}
@article{fletcher2020, author={Fletcher, Leigh N. and de Pater, Imke and Orton, Glenn S. and others}, title={Ice giant circulation patterns: implications for atmospheric probes}, journal={Space Science Reviews}, volume={216}, pages={21}, year={2020}}
@article{sromovsky1993, author={Sromovsky, Lawrence A. and Limaye, Sanjay S. and Fry, Patrick M.}, title={Dynamics of {Neptune's} major cloud features}, journal={Icarus}, volume={105}, pages={110--141}, year={1993}}
@article{hsu2019, author={Hsu, Andrew I. and Wong, Michael H. and Simon, Amy A.}, title={Lifetimes and occurrence rates of dark vortices on {Neptune} from 25 years of {Hubble Space Telescope} images}, journal={Astronomical Journal}, volume={157}, pages={152}, year={2019}}
@article{karkoschka2011, author={Karkoschka, Erich}, title={{Neptune's} cloud and haze variations 1994--2008 from 500 {HST--WFPC2} images}, journal={Icarus}, volume={215}, pages={759--773}, year={2011}}
@article{chavez2023, author={Chavez, Erandi and Redwing, Erin and de Pater, Imke and others}, title={Drift rates of major {Neptunian} features between 2018 and 2021}, journal={Icarus}, volume={404}, pages={115667}, year={2023}}
@article{irwin2024, author={Irwin, Patrick G. J. and Dobinson, Jack and James, Arjuna and others}, title={Modelling the seasonal cycle of {Uranus's} colour and magnitude, and comparison with {Neptune}}, journal={Monthly Notices of the Royal Astronomical Society}, volume={527}, pages={11521--11538}, year={2024}}
@article{smith1989, author={Smith, Bradford A. and Soderblom, Laurence A. and Banfield, Don and others}, title={{Voyager 2} at {Neptune}: imaging science results}, journal={Science}, volume={246}, pages={1422--1449}, year={1989}}
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
@article{schmidt1941, author={Schmidt, Ernst}, title={Die {Entstehung} von {Eisnebel} aus den {Auspuffgasen} von {Flugmotoren}}, journal={Schriften der Deutschen Akademie der Luftfahrtforschung}, volume={44}, pages={1--15}, year={1941}, publisher={Verlag R. Oldenbourg}, url={https://elib.dlr.de/107948/}}
@article{appleman1953, author={Appleman, Herbert}, title={The formation of exhaust condensation trails by jet aircraft}, journal={Bulletin of the American Meteorological Society}, volume={34}, pages={14--20}, year={1953}}
@article{gierens1999, author={Gierens, Klaus and Schumann, Ulrich and Helten, Manfred and Smit, Herman and Marenco, Alain}, title={A distribution law for relative humidity in the upper troposphere and lower stratosphere derived from three years of {MOZAIC} measurements}, journal={Annales Geophysicae}, volume={17}, pages={1218--1226}, year={1999}}
@article{schumann2005, author={Schumann, Ulrich}, title={Formation, properties and climatic effects of contrails}, journal={Comptes Rendus Physique}, volume={6}, pages={549--565}, year={2005}}
@article{minnis1998, author={Minnis, Patrick and Young, David F. and Garber, Donald P. and others}, title={Transformation of contrails into cirrus during {SUCCESS}}, journal={Geophysical Research Letters}, volume={25}, pages={1157--1160}, year={1998}}
@article{kyba2011, author={Kyba, Christopher C. M. and Ruhtz, Thomas and Fischer, J{\"u}rgen and H{\"o}lker, Franz}, title={Cloud coverage acts as an amplifier for ecological light pollution in urban ecosystems}, journal={PLoS ONE}, volume={6}, pages={e17307}, year={2011}}
@article{zahnle2010, author={Zahnle, Kevin and Schaefer, Laura and Fegley, Bruce}, title={Earth's earliest atmospheres}, journal={Cold Spring Harbor Perspectives in Biology}, volume={2}, pages={a004895}, year={2010}}
@article{matsuo2025, author={Matsuo, Taro and Ito-Miwa, Kumiko and Hoshino, Yosuke and others}, title={Archaean green-light environments drove the evolution of cyanobacteria's light-harvesting system}, journal={Nature Ecology \& Evolution}, volume={9}, pages={599--612}, year={2025}, doi={10.1038/s41559-025-02637-3}}
@article{brocks2005, author={Brocks, Jochen J. and Love, Gordon D. and Summons, Roger E. and Knoll, Andrew H. and Logan, Graham A. and Bowden, Stephen A.}, title={Biomarker evidence for green and purple sulphur bacteria in a stratified {Palaeoproterozoic} sea}, journal={Nature}, volume={437}, pages={866--870}, year={2005}, doi={10.1038/nature04068}}
@article{french2015, author={French, Katherine L. and Rocher, Don and Zumberge, John E. and Summons, Roger E.}, title={Assessing the distribution of sedimentary {C}$_{40}$ carotenoids through time}, journal={Geobiology}, volume={13}, pages={139--151}, year={2015}, doi={10.1111/gbi.12126}}
"""

# Entries added with the timeline: the air between the epochs and the events that interrupt it.
BIB += r"""
@article{zerkle2012, author={Zerkle, Aubrey L. and Claire, Mark W. and Domagal-Goldman, Shawn D. and Farquhar, James and Poulton, Simon W.}, title={A bistable organic-rich atmosphere on the {Neoarchaean} {Earth}}, journal={Nature Geoscience}, volume={5}, pages={359--363}, year={2012}, doi={10.1038/ngeo1425}}
@article{izon2015, author={Izon, Gareth and Zerkle, Aubrey L. and Zhelezinskaia, Iadviga and Farquhar, James and others}, title={Multiple oscillations in {Neoarchaean} atmospheric chemistry}, journal={Earth and Planetary Science Letters}, volume={431}, pages={264--273}, year={2015}, doi={10.1016/j.epsl.2015.09.018}}
@article{izon2017, author={Izon, Gareth and Zerkle, Aubrey L. and Williford, Kenneth H. and Farquhar, James and others}, title={Biological regulation of atmospheric chemistry en route to planetary oxygenation}, journal={Proceedings of the National Academy of Sciences}, volume={114}, pages={E2571--E2579}, year={2017}, doi={10.1073/pnas.1618798114}}
@article{gumsley2017, author={Gumsley, Ashley P. and Chamberlain, Kevin R. and Bleeker, Wouter and others}, title={Timing and tempo of the {Great Oxidation Event}}, journal={Proceedings of the National Academy of Sciences}, volume={114}, pages={1811--1816}, year={2017}, doi={10.1073/pnas.1608824114}}
@article{poulton2021, author={Poulton, Simon W. and Bekker, Andrey and Cumming, Vivien M. and others}, title={A 200-million-year delay in permanent atmospheric oxygenation}, journal={Nature}, volume={592}, pages={232--236}, year={2021}, doi={10.1038/s41586-021-03393-7}}
@article{lyons2014, author={Lyons, Timothy W. and Reinhard, Christopher T. and Planavsky, Noah J.}, title={The rise of oxygen in {Earth}'s early ocean and atmosphere}, journal={Nature}, volume={506}, pages={307--315}, year={2014}, doi={10.1038/nature13068}}
@article{mills2023, author={Mills, Benjamin J. W. and Krause, Alexander J. and Jarvis, Ian and Cramer, Bradley D.}, title={Evolution of atmospheric {O}$_2$ through the {Phanerozoic}, revisited}, journal={Annual Review of Earth and Planetary Sciences}, volume={51}, pages={253--276}, year={2023}, doi={10.1146/annurev-earth-032320-095425}}
@article{maclennan2018, author={MacLennan, Scott and Park, Yuem and Swanson-Hysell, Nicholas and Maloof, Adam and others}, title={The arc of the {Snowball}: {U-Pb} dates constrain the {Islay} anomaly and the initiation of the {Sturtian} glaciation}, journal={Geology}, volume={46}, pages={539--542}, year={2018}, doi={10.1130/G40171.1}}
@article{rooney2020, author={Rooney, Alan D. and Yang, Chuan and Condon, Daniel J. and Zhu, Maoyan and Macdonald, Francis A.}, title={{U-Pb} and {Re-Os} geochronology tracks stratigraphic condensation in the {Sturtian} snowball {Earth} aftermath}, journal={Geology}, volume={48}, pages={625--629}, year={2020}, doi={10.1130/G47246.1}}
@article{prave2016, author={Prave, Anthony R. and Condon, Daniel J. and Hoffmann, Karl Heinz and Tapster, Simon and Fallick, Anthony E.}, title={Duration and nature of the end-{Cryogenian} ({Marinoan}) glaciation}, journal={Geology}, volume={44}, pages={631--634}, year={2016}, doi={10.1130/G38089.1}}
@article{tasistrohart2025, author={Tasistro-Hart, Adrian R. and Macdonald, Francis A. and Crowley, James L. and Schmitz, Mark D.}, title={Four-million-year {Marinoan} snowball shows multiple routes to deglaciation}, journal={Proceedings of the National Academy of Sciences}, volume={122}, pages={e2418281122}, year={2025}, doi={10.1073/pnas.2418281122}}
@article{hoffman2017, author={Hoffman, Paul F. and Abbot, Dorian S. and Ashkenazy, Yosef and others}, title={Snowball {Earth} climate dynamics and {Cryogenian} geology-geobiology}, journal={Science Advances}, volume={3}, pages={e1600983}, year={2017}, doi={10.1126/sciadv.1600983}}
@misc{eberhard2023, author={Eberhard, Julius and Bevan, Oliver E. and Feulner, Georg and others}, title={Sensitivity of {Neoproterozoic} {Snowball-Earth} inceptions to continental configuration, orbital geometry, and volcanism}, howpublished={EGU General Assembly 2023, EGU23-7084}, year={2023}, doi={10.5194/egusphere-egu23-7084}}
@article{bardeen2017, author={Bardeen, Charles G. and Garcia, Rolando R. and Toon, Owen B. and Conley, Andrew J.}, title={On transient climate change at the {Cretaceous-Paleogene} boundary due to atmospheric soot injections}, journal={Proceedings of the National Academy of Sciences}, volume={114}, pages={E7415--E7424}, year={2017}, doi={10.1073/pnas.1708980114}}
@article{mojzsis2019, author={Mojzsis, Stephen J. and Brasser, Ramon and Kelly, Nigel M. and Abramov, Oleg and Werner, Stephanie C.}, title={Onset of giant planet migration before 4480 million years ago}, journal={Astrophysical Journal}, volume={881}, pages={44}, year={2019}, doi={10.3847/1538-4357/ab2c03}}
@article{nesvorny2018, author={Nesvorn{\'y}, David and Vokrouhlick{\'y}, David and Bottke, William F. and Levison, Harold F.}, title={Evidence for very early migration of the {Solar System} planets from the {Patroclus--Menoetius} binary {Jupiter} {Trojan}}, journal={Nature Astronomy}, volume={2}, pages={878--882}, year={2018}, doi={10.1038/s41550-018-0564-3}}
@article{kyba2017, author={Kyba, Christopher C. M. and Kuester, Theres and S{\'a}nchez de Miguel, Alejandro and others}, title={Artificially lit surface of {Earth} at night increasing in radiance and extent}, journal={Science Advances}, volume={3}, pages={e1701528}, year={2017}, doi={10.1126/sciadv.1701528}}
@article{anderson2014, author={Anderson, Joseph P. and Gonz{\'a}lez-Gait{\'a}n, Santiago and Hamuy, Mario and Guti{\'e}rrez, Claudia P. and Stritzinger, Maximilian D. and Olivares E., Felipe and others}, title={Characterizing the {V}-band light-curves of hydrogen-rich {Type} {II} supernovae}, journal={The Astrophysical Journal}, volume={786}, pages={67}, year={2014}, doi={10.1088/0004-637x/786/1/67}}
@article{phillips1993, author={Phillips, M. M.}, title={The absolute magnitudes of {Type} {Ia} supernovae}, journal={The Astrophysical Journal}, volume={413}, pages={L105}, year={1993}, doi={10.1086/186970}}
@article{leibundgut2000, author={Leibundgut, Bruno}, title={Type {Ia} {Supernovae}}, journal={Astronomy and Astrophysics Review}, volume={10}, pages={179--209}, year={2000}, doi={10.1007/s001590000009}}
@article{drout2011, author={Drout, Maria R. and Soderberg, Alicia M. and Gal-Yam, Avishay and Cenko, S. Bradley and Fox, Derek B. and Leonard, Douglas C. and others}, title={The {First} {Systematic} {Study} of {Type} {Ibc} {Supernova} {Multi-band} {Light} {Curves}}, journal={The Astrophysical Journal}, volume={741}, pages={97}, year={2011}, doi={10.1088/0004-637x/741/2/97}}
@article{strope2010, author={Strope, Richard J. and Schaefer, Bradley E. and Henden, Arne A.}, title={Catalog of 93 {Nova} {Light} {Curves:} {Classification} and {Properties}}, journal={The Astronomical Journal}, volume={140}, pages={34--62}, year={2010}, doi={10.1088/0004-6256/140/1/34}}
@article{williams2011, author={Williams, Brian J. and Blair, William P. and Blondin, John M. and Borkowski, Kazimierz J. and Ghavamian, Parviz and Long, Knox S. and others}, title={{RCW} 86: a {Type} {Ia} supernova in a wind-blown bubble}, journal={The Astrophysical Journal}, volume={741}, pages={96}, year={2011}, doi={10.1088/0004-637x/741/2/96}}
@article{winkler2003, author={Winkler, P. Frank and Gupta, Gaurav and Long, Knox S.}, title={The {SN} 1006 {Remnant:} {Optical} {Proper} {Motions,} {Deep} {Imaging,} {Distance,} and {Brightness} at {Maximum}}, journal={The Astrophysical Journal}, volume={585}, pages={324--335}, year={2003}, doi={10.1086/345985}}
@article{ritter2021, author={Ritter, Andreas and Parker, Quentin A. and Lykou, Foteini and Zijlstra, Albert A. and Guerrero, Mart{\'i}n A. and Le D{\^u}, Pascal}, title={The {Remnant} and {Origin} of the {Historical} {Supernova} 1181 {AD}}, journal={The Astrophysical Journal Letters}, volume={918}, pages={L33}, year={2021}, doi={10.3847/2041-8213/ac2253}}
@article{krause2008, author={Krause, Oliver and Tanaka, Masaomi and Usuda, Tomonori and Hattori, Takashi and Goto, Miwa and Birkmann, Stephan and others}, title={Tycho {Brahe's} 1572 supernova as a standard type {Ia} as revealed by its light-echo spectrum}, journal={Nature}, volume={456}, pages={617--619}, year={2008}, doi={10.1038/nature07608}}
@article{hamuy1990, author={Hamuy, Mario and Suntzeff, Nicholas B.}, title={{SN} {1987A} in the {LMC}. {III}. {UBVRI} photometry at {Cerro} {Tololo}}, journal={The Astronomical Journal}, volume={99}, pages={1146}, year={1990}, doi={10.1086/115403}}
@article{fields2020, author={Fields, Brian D. and Melott, Adrian L. and Ellis, John and Ertel, Adrienne F. and Fry, Brian J. and Lieberman, Bruce S. and others}, title={Supernova triggers for {end-Devonian} extinctions}, journal={Proceedings of the National Academy of Sciences}, volume={117}, pages={21008--21010}, year={2020}, doi={10.1073/pnas.2013774117}}
@article{breitschwerdt2016, author={Breitschwerdt, D. and Feige, J. and Schulreich, M. M. and de Avillez, M. A. and Dettbarn, C. and Fuchs, B.}, title={The locations of recent supernovae near the {Sun} from modelling $^{60}${Fe} transport}, journal={Nature}, volume={532}, pages={73--76}, year={2016}, doi={10.1038/nature17424}}
@article{thorsett2003, author={Thorsett, S. E. and Benjamin, R. A. and Brisken, Walter F. and Golden, A. and Goss, W. M.}, title={Pulsar {PSR} {B0656+14,} the {Monogem} {Ring,} and the {Origin} of the {"Knee"} in the {Primary} {Cosmic-Ray} {Spectrum}}, journal={The Astrophysical Journal}, volume={592}, pages={L71--L73}, year={2003}, doi={10.1086/377682}}
@article{fesen2018, author={Fesen, Robert A. and Weil, Kathryn E. and Cisneros, Ignacio A. and Blair, William P. and Raymond, John C.}, title={The {Cygnus} {Loop's} distance, properties, and environment driven morphology}, journal={Monthly Notices of the Royal Astronomical Society}, volume={481}, pages={1786--1798}, year={2018}, doi={10.1093/mnras/sty2370}}
@article{dodson2003, author={Dodson, R. and Legge, D. and Reynolds, J. E. and McCulloch, P. M.}, title={The {Vela} {Pulsar's} {Proper} {Motion} and {Parallax} {Derived} from {VLBI} {Observations}}, journal={The Astrophysical Journal}, volume={596}, pages={1137--1141}, year={2003}, doi={10.1086/378089}}
@article{becker2012, author={Becker, Werner and Prinz, Tobias and Winkler, P. Frank and Petre, Robert}, title={The {Proper} {Motion} of the {Central} {Compact} {Object} {RX} {J0822--4300} in the {Supernova} {Remnant} {Puppis} {A}}, journal={The Astrophysical Journal}, volume={755}, pages={141}, year={2012}, doi={10.1088/0004-637x/755/2/141}}
@article{allen2015, author={Allen, G. E. and Chow, K. and DeLaney, T. and Filipovi{\'c}, M. D. and Houck, J. C. and Pannuti, T. G. and others}, title={On the {Expansion} {Rate,} {Age,} and {Distance} of the {Supernova} {Remnant} {G266.2--1.2} ({Vela} {Jr.})}, journal={The Astrophysical Journal}, volume={798}, pages={82}, year={2015}, doi={10.1088/0004-637x/798/2/82}}
@article{duerbeck1987, author={Duerbeck, Hilmar W.}, title={A reference catalogue and atlas of galactic novae}, journal={Space Science Reviews}, volume={45}, pages={1--14}, year={1987}, doi={10.1007/bf00187826}}
@article{shara1985, author={Shara, M. M. and Moffat, A. F. J. and Webbink, R. F.}, title={Unraveling the oldest and faintest recovered nova - {CK} {Vulpeculae} (1670)}, journal={The Astrophysical Journal}, volume={294}, pages={271}, year={1985}, doi={10.1086/163296}}
@article{kaminski2015, author={Kami{\'n}ski, Tomasz and Menten, Karl M. and Tylenda, Romuald and Hajduk, Marcin and Patel, Nimesh A. and Kraus, Alexander}, title={Nuclear ashes and outflow in the eruptive star {Nova} {Vul} 1670}, journal={Nature}, volume={520}, pages={322--324}, year={2015}, doi={10.1038/nature14257}}
@article{smith2011, author={Smith, Nathan and Frew, David J.}, title={A revised historical light curve of {Eta} {Carinae} and the timing of close periastron encounters}, journal={Monthly Notices of the Royal Astronomical Society}, volume={415}, pages={2009--2019}, year={2011}, doi={10.1111/j.1365-2966.2011.18993.x}}
@article{han2025, author={Han, Jiwon Jesse and El-Badry, Kareem and Lucchini, Scott and Hernquist, Lars and Brown, Warren and Garavito-Camargo, Nico and others}, title={Hypervelocity {Stars} {Trace} a {Supermassive} {Black} {Hole} in the {Large} {Magellanic} {Cloud}}, journal={The Astrophysical Journal}, volume={982}, pages={188}, year={2025}, doi={10.3847/1538-4357/adb967}}
@article{pietrzynski2019, author={Pietrzy{\'n}ski, G. and Graczyk, D. and Gallenne, A. and Gieren, W. and Thompson, I. B. and Pilecki, B. and others}, title={A distance to the {Large} {Magellanic} {Cloud} that is precise to one per cent}, journal={Nature}, volume={567}, pages={200--203}, year={2019}, doi={10.1038/s41586-019-0999-4}}
@article{pfister2020, author={Pfister, Hugo and Volonteri, Marta and Dai, Jane Lixin and Colpi, Monica}, title={Enhancement of the tidal disruption event rate in galaxies with a nuclear star cluster: from dwarfs to ellipticals}, journal={Monthly Notices of the Royal Astronomical Society}, volume={497}, pages={2276--2285}, year={2020}, doi={10.1093/mnras/staa1962}}
@article{bender2005, author={Bender, Ralf and Kormendy, John and Bower, Gary and Green, Richard and Thomas, Jens and Danks, Anthony C. and others}, title={{HST} {STIS} {Spectroscopy} of the {Triple} {Nucleus} of {M31:} {Two} {Nested} {Disks} in {Keplerian} {Rotation} around a {Supermassive} {Black} {Hole}}, journal={The Astrophysical Journal}, volume={631}, pages={280--300}, year={2005}, doi={10.1086/432434}}
@article{yeomans1981, author={Yeomans, D. K. and Kiang, T.}, title={The long-term motion of comet {Halley}}, journal={Monthly Notices of the Royal Astronomical Society}, volume={197}, pages={633--646}, year={1981}, doi={10.1093/mnras/197.3.633}}
@article{thordarson2003, author={Thordarson, Thorvaldur and Self, Stephen}, title={Atmospheric and environmental effects of the 1783--1784 {Laki} eruption: {A} review and reassessment}, journal={Journal of Geophysical Research: Atmospheres}, volume={108}, pages={}, year={2003}, doi={10.1029/2001jd002042}}
@article{sato1993, author={Sato, Makiko and Hansen, James E. and McCormick, M. Patrick and Pollack, James B.}, title={Stratospheric aerosol optical depths, 1850--1990}, journal={Journal of Geophysical Research: Atmospheres}, volume={98}, pages={22987--22994}, year={1993}, doi={10.1029/93jd02553}}
@article{green2006, author={Green, James L. and Boardsen, Scott}, title={Duration and extent of the great auroral storm of 1859}, journal={Advances in Space Research}, volume={38}, pages={130--135}, year={2006}, doi={10.1016/j.asr.2005.08.054}}
@article{silverman2001, author={Silverman, S. M. and Cliver, E. W.}, title={Low-latitude auroras: the magnetic storm of 14--15 {May} 1921}, journal={Journal of Atmospheric and Solar-Terrestrial Physics}, volume={63}, pages={523--535}, year={2001}, doi={10.1016/s1364-6826(00)00174-7}}
@article{chyba1993, author={Chyba, Christopher F. and Thomas, Paul J. and Zahnle, Kevin J.}, title={The 1908 {Tunguska} explosion: atmospheric disruption of a stony asteroid}, journal={Nature}, volume={361}, pages={40--44}, year={1993}, doi={10.1038/361040a0}}
@incollection{longo2007, author={Longo, G.}, title={The {Tunguska} {Event}}, booktitle={Comet/Asteroid Impacts and Human Society}, publisher={Springer}, pages={303--330}, year={2007}, doi={10.1007/978-3-540-32711-0_18}}
@article{popova2013, author={Popova, Olga P. and Jenniskens, Peter and Emel'yanenko, Vacheslav and Kartashova, Anna and Biryukov, Eugeny and Khaibrakhmanov, Sergey and others}, title={Chelyabinsk {Airburst,} {Damage} {Assessment,} {Meteorite} {Recovery,} and {Characterization}}, journal={Science}, volume={342}, pages={1069--1073}, year={2013}, doi={10.1126/science.1242642}}
@article{collins2020, author={Collins, G. S. and Patel, N. and Davison, T. M. and Rae, A. S. P. and Morgan, J. V. and Gulick, S. P. S. and others}, title={A steeply-inclined trajectory for the {Chicxulub} impact}, journal={Nature Communications}, volume={11}, pages={1480}, year={2020}, doi={10.1038/s41467-020-15269-x}}
@article{kyte1998, author={Kyte, Frank T.}, title={A meteorite from the {Cretaceous/Tertiary} boundary}, journal={Nature}, volume={396}, pages={237--239}, year={1998}, doi={10.1038/24322}}
@article{hayakawa2025, author={Hayakawa, Hisashi and Ebihara, Yusuke and Mishev, Alexander and Koldobskiy, Sergey and Kusano, Kanya and Bechet, Sabrina and others}, title={The {Solar} and {Geomagnetic} {Storms} in 2024 {May:} {A} {Flash} {Data} {Report}}, journal={The Astrophysical Journal}, volume={979}, pages={49}, year={2025}, doi={10.3847/1538-4357/ad9335}}
@article{degroot1969, author={de Groot, M.}, title={On the nature of {P} {Cygni}}, journal={Bulletin of the Astronomical Institutes of the Netherlands}, volume={20}, pages={225}, year={1969}}
@article{chisholm2026, author={Chisholm, Robin and D'Onghia, Elena and Drory, Niv and Fox, Andrew and others}, title={The missing black hole in the {Large} {Magellanic} {Cloud}: a dynamical prediction for its present-day location}, journal={arXiv e-prints}, pages={arXiv:2609.16177}, year={2026}}
@article{judd2024, author={Judd, Emily J. and Tierney, Jessica E. and Lunt, Daniel J. and Monta{\~n}ez, Isabel P. and Huber, Brian T. and Wing, Scott L. and Valdes, Paul J.}, title={A 485-million-year history of {Earth's} surface temperature}, journal={Science}, volume={385}, pages={eadk3705}, year={2024}, doi={10.1126/science.adk3705}}
@article{charnay2017, author={Charnay, Benjamin and Le Hir, Guillaume and Fluteau, Fr{\'e}d{\'e}ric and Forget, Fran{\c{c}}ois and Catling, David C.}, title={A warm or a cold early {Earth}? {New} insights from a {3-D} climate-carbon model}, journal={Earth and Planetary Science Letters}, volume={474}, pages={97--109}, year={2017}, doi={10.1016/j.epsl.2017.06.029}}
@article{krissansentotton2018, author={Krissansen-Totton, Joshua and Arney, Giada N. and Catling, David C.}, title={Constraining the climate and ocean {pH} of the early {Earth} with a geological carbon cycle model}, journal={Proceedings of the National Academy of Sciences}, volume={115}, pages={4105--4110}, year={2018}, doi={10.1073/pnas.1721296115}}
@article{held2006, author={Held, Isaac M. and Soden, Brian J.}, title={Robust responses of the hydrological cycle to global warming}, journal={Journal of Climate}, volume={19}, pages={5686--5699}, year={2006}, doi={10.1175/JCLI3990.1}}
@article{tierney2020, author={Tierney, Jessica E. and Zhu, Jiang and King, Jonathan and Malevich, Steven B. and Hakim, Gregory J. and Poulsen, Christopher J.}, title={Glacial cooling and climate sensitivity revisited}, journal={Nature}, volume={584}, pages={569--573}, year={2020}, doi={10.1038/s41586-020-2617-x}}
@article{jones1999, author={Jones, P. D. and New, M. and Parker, D. E. and Martin, S. and Rigor, I. G.}, title={Surface air temperature and its changes over the past 150 years}, journal={Reviews of Geophysics}, volume={37}, pages={173--199}, year={1999}, doi={10.1029/1999RG900002}}
@article{forster2025, author={Forster, Piers M. and Smith, Chris and Walsh, Tristram and Lamb, William F. and Lamboll, Robin and others}, title={Indicators of {Global} {Climate} {Change} 2024: annual update of key indicators of the state of the climate system and human influence}, journal={Earth System Science Data}, volume={17}, pages={2641--2680}, year={2025}, doi={10.5194/essd-17-2641-2025}}
@incollection{ipcc2021, author={{IPCC}}, title={Summary for Policymakers}, booktitle={Climate Change 2021: The Physical Science Basis. Contribution of Working Group I to the Sixth Assessment Report of the Intergovernmental Panel on Climate Change}, publisher={Cambridge University Press}, pages={3--32}, year={2021}, doi={10.1017/9781009157896.001}}
@article{bereiter2015, author={Bereiter, Bernhard and Eggleston, Sarah and Schmitt, Jochen and Nehrbass-Ahles, Christoph and Stocker, Thomas F. and Fischer, Hubertus and Kipfstuhl, Sepp and Chappellaz, Jerome}, title={Revision of the {EPICA} {Dome C} {CO$_2$} record from 800 to 600 kyr before present}, journal={Geophysical Research Letters}, volume={42}, pages={542--549}, year={2015}, doi={10.1002/2014GL061957}}
@article{macfarlingmeure2006, author={MacFarling Meure, C. and Etheridge, D. and Trudinger, C. and Steele, P. and Langenfelds, R. and van Ommen, T. and Smith, A. and Elkins, J.}, title={Law {Dome} {CO$_2$}, {CH$_4$} and {N$_2$O} ice core records extended to 2000 years {BP}}, journal={Geophysical Research Letters}, volume={33}, pages={L14810}, year={2006}, doi={10.1029/2006GL026152}}
@article{meinshausen2020, author={Meinshausen, Malte and Nicholls, Zebedee R. J. and Lewis, Jared and Gidden, Matthew J. and others}, title={The shared socio-economic pathway ({SSP}) greenhouse gas concentrations and their extensions to 2500}, journal={Geoscientific Model Development}, volume={13}, pages={3571--3605}, year={2020}, doi={10.5194/gmd-13-3571-2020}}
@article{vondrak2011, author={Vondr{\'a}k, Jan and Capitaine, Nicole and Wallace, Patrick}, title={New precession expressions, valid for long time intervals}, journal={Astronomy \& Astrophysics}, volume={534}, pages={A22}, year={2011}, doi={10.1051/0004-6361/201117274}}
@article{snaith2014, author={Snaith, Owain and Haywood, Misha and Di Matteo, Paola and others}, title={The dominant epoch of star formation in the {Milky Way} formed the thick disk}, journal={Astrophysical Journal Letters}, volume={781}, pages={L31}, year={2014}, doi={10.1088/2041-8205/781/2/L31}}
@article{mor2019, author={Mor, R. and Robin, A. C. and Figueras, F. and Roca-F{\`a}brega, S. and Luri, X.}, title={{Gaia} {DR2} reveals a star formation burst in the disc 2--3 {Gyr} ago}, journal={Astronomy \& Astrophysics}, volume={624}, pages={L1}, year={2019}, doi={10.1051/0004-6361/201935105}}
@article{gallart2024, author={Gallart, Carme and Surot, Francisco and Cassisi, Santi and others}, title={Chronology of our {Galaxy} from {Gaia} colour--magnitude diagram fitting ({ChronoGal}): the early formation of the {Milky Way} disc}, journal={Astronomy \& Astrophysics}, volume={687}, pages={A168}, year={2024}, doi={10.1051/0004-6361/202349078}}
@article{frankel2018, author={Frankel, Neige and Rix, Hans-Walter and Ting, Yuan-Sen and Ness, Melissa and Hogg, David W.}, title={Measuring radial orbit migration in the {Galactic} disk}, journal={Astrophysical Journal}, volume={865}, pages={96}, year={2018}, doi={10.3847/1538-4357/aadba5}}
@article{frankel2019, author={Frankel, Neige and Sanders, Jason and Rix, Hans-Walter and Ting, Yuan-Sen and Ness, Melissa}, title={The inside-out growth of the {Galactic} disk}, journal={Astrophysical Journal}, volume={884}, pages={99}, year={2019}, doi={10.3847/1538-4357/ab4254}}
@article{lu2024, author={Lu, Yuxi and Minchev, Ivan and Buck, Tobias and others}, title={There is no place like home -- finding birth radii of stars in the {Milky Way}}, journal={Monthly Notices of the Royal Astronomical Society}, volume={535}, pages={392--405}, year={2024}, doi={10.1093/mnras/stae2364}}
@article{genzel2015, author={Genzel, R. and Tacconi, L. J. and Lutz, D. and others}, title={Combined {CO} and dust scaling relations of depletion time and molecular gas fractions with cosmic time, specific star-formation rate, and stellar mass}, journal={Astrophysical Journal}, volume={800}, pages={20}, year={2015}, doi={10.1088/0004-637X/800/1/20}}
@article{cardelli1989, author={Cardelli, Jason A. and Clayton, Geoffrey C. and Mathis, John S.}, title={The relationship between infrared, optical, and ultraviolet extinction}, journal={Astrophysical Journal}, volume={345}, pages={245--256}, year={1989}, doi={10.1086/167900}}
@article{gough1981, author={Gough, Douglas O.}, title={Solar interior structure and luminosity variations}, journal={Solar Physics}, volume={74}, pages={21--34}, year={1981}, doi={10.1007/BF00151270}}
@article{airy1838, author={Airy, George Biddell}, title={On the intensity of light in the neighbourhood of a caustic}, journal={Transactions of the Cambridge Philosophical Society}, volume={6}, pages={379--402}, year={1838}}
@article{harvey1998, author={Harvey, Allan H. and Gallagher, John S. and Levelt Sengers, J. M. H.}, title={Revised formulation for the refractive index of water and steam as a function of wavelength, temperature and density}, journal={Journal of Physical and Chemical Reference Data}, volume={27}, pages={761--774}, year={1998}, doi={10.1063/1.556029}}
@article{marshall1948, author={Marshall, J. S. and Palmer, W. McK.}, title={The distribution of raindrops with size}, journal={Journal of Meteorology}, volume={5}, pages={165--166}, year={1948}}
@article{hansen1974, author={Hansen, J. E. and Travis, L. D.}, title={Light scattering in planetary atmospheres}, journal={Space Science Reviews}, volume={16}, pages={527--610}, year={1974}, doi={10.1007/BF00168069}}
@article{lynch1991, author={Lynch, David K. and Schwartz, Ptolemy}, title={Rainbows and fogbows}, journal={Applied Optics}, volume={30}, pages={3415}, year={1991}, doi={10.1364/AO.30.003415}}
@article{gedzelman2003, author={Gedzelman, Stanley David}, title={Simulating glories and cloudbows in color}, journal={Applied Optics}, volume={42}, pages={429}, year={2003}, doi={10.1364/AO.42.000429}}
@article{lock1989, author={Lock, James A.}, title={Observability of atmospheric glories and supernumerary rainbows}, journal={Journal of the Optical Society of America A}, volume={6}, pages={1924}, year={1989}, doi={10.1364/JOSAA.6.001924}}
@article{mayer2004, author={Mayer, B. and Schr{\"o}der, M. and Preusker, R. and Sch{\"u}ller, L.}, title={Remote sensing of water cloud droplet size distributions using the backscatter glory: a case study}, journal={Atmospheric Chemistry and Physics}, volume={4}, pages={1255}, year={2004}, doi={10.5194/acp-4-1255-2004}}
@article{han1994, author={Han, Qingyuan and Rossow, William B. and Lacis, Andrew A.}, title={Near-global survey of effective droplet radii in liquid water clouds using {ISCCP} data}, journal={Journal of Climate}, volume={7}, pages={465}, year={1994}, doi={10.1175/1520-0442(1994)007<0465:NGSOED>2.0.CO;2}}
@article{rosing2010, author={Rosing, Minik T. and Bird, Dennis K. and Sleep, Norman H. and Bjerrum, Christian J.}, title={No climate paradox under the faint early {Sun}}, journal={Nature}, volume={464}, pages={744}, year={2010}, doi={10.1038/nature08955}}
@article{wolf2014, author={Wolf, E. T. and Toon, O. B.}, title={Controls on the {Archean} climate system investigated with a global climate model}, journal={Astrobiology}, volume={14}, pages={241}, year={2014}, doi={10.1089/ast.2013.1112}}
@article{hasenkopf2011, author={Hasenkopf, Christa A. and Freedman, Miriam A. and Beaver, Melinda R. and Toon, Owen B. and Tolbert, Margaret A.}, title={Potential climatic impact of organic haze on early {Earth}}, journal={Astrobiology}, volume={11}, pages={135}, year={2011}, doi={10.1089/ast.2010.0541}}
@article{baumgarten2008, author={Baumgarten, G. and Fiedler, J. and L{\"u}bken, F.-J. and von Cossart, G.}, title={Particle properties and water content of noctilucent clouds and their interannual variation}, journal={Journal of Geophysical Research: Atmospheres}, volume={113}, pages={D06203}, year={2008}, doi={10.1029/2007JD008884}}
@article{lange2022, author={Lange, Anna and Baumgarten, Gerd and Rozanov, Alexei and von Savigny, Christian}, title={On the colour of noctilucent clouds}, journal={Annales Geophysicae}, volume={40}, pages={407}, year={2022}, doi={10.5194/angeo-40-407-2022}}
@article{fogle1972, author={Fogle, Benson and Rees, Manfred H.}, title={Spectral measurements of noctilucent clouds}, journal={Journal of Geophysical Research}, volume={77}, pages={720}, year={1972}, doi={10.1029/JA077i004p00720}}
@article{lubken2018, author={L{\"u}bken, Franz-Josef and Berger, Uwe and Baumgarten, Gerd}, title={On the anthropogenic impact on long-term evolution of noctilucent clouds}, journal={Geophysical Research Letters}, volume={45}, pages={6681}, year={2018}, doi={10.1029/2018GL077719}}
@article{lubken2021, author={L{\"u}bken, Franz-Josef and Baumgarten, Gerd and Berger, Uwe}, title={Long term trends of mesospheric ice layers: A model study}, journal={Journal of Atmospheric and Solar-Terrestrial Physics}, volume={214}, pages={105378}, year={2021}, doi={10.1016/j.jastp.2020.105378}}
@article{lubken2024, author={L{\"u}bken, Franz-Josef and Baumgarten, Gerd and Grygalashvyly, Mykhaylo and Vellalassery, Ashique}, title={Absorption of solar radiation by noctilucent clouds in a changing climate}, journal={Geophysical Research Letters}, volume={51}, pages={e2023GL107334}, year={2024}, doi={10.1029/2023GL107334}}
@article{yu2023, author={Yu, Wandi and Yue, Jia and Garcia, Rolando R. and Mlynczak, Martin G. and Russell, James M.}, title={{WACCM6} projections of polar mesospheric cloud abundance over the 21st century}, journal={Journal of Geophysical Research: Atmospheres}, volume={128}, pages={e2023JD038985}, year={2023}, doi={10.1029/2023JD038985}}
@article{dutta2024, author={Dutta, Deepashree and Sherwood, Steven C. and Meissner, Katrin J. and Jucker, Martin}, title={Low latitude mesospheric clouds in a warmer climate}, journal={Atmospheric Science Letters}, volume={25}, pages={e1209}, year={2024}, doi={10.1002/asl.1209}}
@article{dalin2012, author={Dalin, P. and Pertsev, N. and Romejko, V.}, title={Notes on historical aspects on the earliest known observations of noctilucent clouds}, journal={History of Geo- and Space Sciences}, volume={3}, pages={87}, year={2012}, doi={10.5194/hgss-3-87-2012}}
@article{bertolin2020, author={Bertolin, Chiara and Dom{\'i}nguez-Castro, Fernando}, title={The earliest datable noctilucent cloud observation ({Parma}, {Italy}, {AD} 1840)}, journal={The Holocene}, volume={30}, pages={682}, year={2020}, doi={10.1177/0959683619895584}}
@article{wallis2025, author={Wallis, Sandra and DeLand, Matthew T. and von Savigny, Christian}, title={Did the 2022 {Hunga} eruption impact the noctilucent cloud season in 2023/24 and 2024?}, journal={Atmospheric Chemistry and Physics}, volume={25}, pages={3635}, year={2025}, doi={10.5194/acp-25-3635-2025}}
@article{kasting2015, author={Kasting, James F. and Chen, Howard and Kopparapu, Ravi K.}, title={Stratospheric temperatures and water loss from moist greenhouse atmospheres of {Earth}-like planets}, journal={Astrophysical Journal Letters}, volume={813}, pages={L3}, year={2015}, doi={10.1088/2041-8205/813/1/L3}}
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
    if not names or not yr: return [], None
    if names[0].startswith('Gaia'): return [names[0]], yr.group(0)
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
        # Not in attributes (an image's alt text repeats its caption).
        plain = re.sub(r'\s(?:alt|title|aria-label)="[^"]*"', '', plain)
        for m in re.finditer(r"(" + name + r"(?: et al\.|(?:, " + name + r")*,? (?:&amp;|&|and) " + name + r")?) \(?((?:1[5-9]|20)\d\d)[a-z]?\)?", plain):
            out.add(m.group(1) + ' ' + m.group(2))
    return sorted(out)
