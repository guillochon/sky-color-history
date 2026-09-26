import json, re, html, os, io, contextlib
os.chdir('/home/claude')
ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(open('gen_report.py').read(), ns)
PROSE, LIMB_CAP, order, ages = ns['PROSE'], ns['LIMB_CAP'], ns['order'], ns['ages']
D = json.load(open('skycolors.json')); byk = {r['key']: r for r in D}
L = '/home/claude/latex'

def tex(s):
    s = html.unescape(s)
    s = re.sub(r'<em>(.*?)</em>', r'\\emph{\1}', s); s = re.sub(r'<i>(.*?)</i>', r'\\emph{\1}', s)
    s = re.sub(r'<[^>]+>', '', s)
    rep = {'&': r'\&', '%': r'\%', '#': r'\#', '_': r'\_', '~': r'$\sim$', '≈': r'$\approx$', '×': r'$\times$', '°': r'$^\circ$',
           '–': '--', '—': '---', '’': "'", '‘': '`', '“': '``', '”': "''", '·': r'$\cdot$', '…': r'\ldots',
           '₂': r'$_2$', '₃': r'$_3$', '₄': r'$_4$', 'τ': r'$\tau$', 'μ': r'$\mu$', 'λ': r'$\lambda$', 'ω': r'$\omega$',
           '⁻': '^{-', '⁶': '6}', '²': r'$^2$', '³': r'$^3$', '⁴': r'$^4$'}
    for a, b in rep.items(): s = s.replace(a, b)
    s = s.replace('$_2$$_2$', '$_{22}$')
    s = re.sub(r'10\^\{-(\d)\}', r'$10^{-\1}$', s)
    s = re.sub(r'10\$\^(\d)\$', r'$10^{\1}$', s)
    s = s.replace('$$', '')
    s = s.replace('tau(550nm)', r'$\tau_{550}$')
    s = re.sub(r'\b(CO|CH|O|N|H|SO)(\d)\b(?!\$)', r'\1$_\2$', s)
    return s

# pull the section prose out of the generated HTML
H = ns['html']
def sec(title):
    m = re.search(r'<h3>'+re.escape(title)+r'</h3>\s*<p>(.*?)</p>', H, re.S); return tex(m.group(1))

epoch_blocks = ''
for k in order:
    r = byk[k]
    epoch_blocks += f"""
\\subsection{{{tex(r['name'])}}}
\\emph{{{tex(r['sub'])}}}

{tex(PROSE[k])}

\\begin{{figure}}[H]\\centering
\\includegraphics[width=\\linewidth]{{figures/sky_{k}.png}}
\\caption{{{tex(r['name'])}: noon sky dome at the equator (solar zenith angle $15^\\circ$), mid-latitude ($45^\\circ$) and polar summer ($75^\\circ$), zenith at top and horizon at bottom, with the Sun's disk drawn in its color and relative brightness; below, the horizon-to-antisolar sky with the Sun on the horizon and $4^\\circ$ below it. Brightness relative to today's clean sky, gamma-compressed.}}
\\label{{fig:sky_{k}}}
\\end{{figure}}
"""

globe_order = ['modern','archean38','archean27','hadean44','snowball07','kpg66','volcanic']
globe_items = ''
for k in globe_order:
    globe_items += f"""\\begin{{minipage}}[t]{{0.48\\linewidth}}\\centering
\\includegraphics[width=\\linewidth]{{figures/globe_{k}.png}}
\\footnotesize\\raggedright\\textbf{{{tex(byk[k]['name'])}.}} {tex(LIMB_CAP[k])}
\\end{{minipage}}\\hfill
"""

# summary table rows
rows = re.findall(r'<tr><td>(.*?)</td><td>(.*?)</td><td>(.*?)</td><td>(.*?)</td></tr>', H)
table = '\n'.join(' & '.join(tex(c) for c in row) + r' \\' for row in rows)

# data appendix table
data_rows = ''
for k in order:
    r = byk[k]
    for Lname in ['Equator','Mid-latitude','Polar summer']:
        d = r['lat'][Lname]
        data_rows += f"{tex(r['name'])} & {Lname} & {d['zenith']['x']:.3f}, {d['zenith']['y']:.3f} & {int(d['zenith']['cct']):,} & {d['horizon']['x']:.3f}, {d['horizon']['y']:.3f} & {int(d['horizon']['cct']):,} & {d['sunY']/byk['modern']['lat']['Equator']['sunY']:.2g} \\\\\n"


globe_grid = ''
gl = ['modern','archean38','archean27','hadean44','snowball07','carbon30','kpg66','volcanic']
short = {'modern':'Modern','archean38':'3.8 Ga, clear Archean','archean27':'2.7 Ga, hazy Archean','hadean44':'4.4 Ga, 30-bar CO$_2$','snowball07':'700 Ma, Snowball','carbon30':'300 Ma, Carboniferous','kpg66':'66 Ma, impact winter','volcanic':'1815, volcanic year'}
for i,k in enumerate(gl):
    globe_grid += f"\\begin{{minipage}}[t]{{0.235\\linewidth}}\\centering\\includegraphics[width=\\linewidth]{{figures/globe_{k}.png}}\\\\[-1pt]{{\\scriptsize\\sffamily\\bfseries {short[k]}}}\\end{{minipage}}"
    globe_grid += "\\hfill\n" if i not in (3,7) else "\\\\[6pt]\n"
globe_text = ''.join(f"\\textbf{{{tex(byk[k]['name'])}.}} {tex(LIMB_CAP[k])}\n\n" for k in gl)

epoch_blocks = ''
for k in order:
    r = byk[k]
    epoch_blocks += f"""
\\par\\vspace{{6pt}}\\noindent\\begin{{minipage}}{{\\linewidth}}
{{\\normalsize\\bfseries {tex(r['name'])}\\par}}
{{\\small\\itshape {tex(r['sub'])}\\par}}\\vspace{{3pt}}
\\centering\\includegraphics[width=\\linewidth]{{figures/sky_{k}.png}}
\\captionof{{figure}}{{{tex(r['name'])}. Top: noon sky dome at the equator, mid-latitude and polar summer, zenith at top, horizon at bottom, Sun's disk in its own color. Below: sky from the solar horizon to the antisolar horizon with the Sun on the horizon and $4^\\circ$ below it.}}
\\end{{minipage}}\\par\\vspace{{4pt}}
{tex(PROSE[k])}
"""

main = r"""\documentclass[9pt,twocolumn]{extarticle}
\usepackage[a4paper,margin=14mm,top=16mm,bottom=16mm,columnsep=7mm]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[scaled=0.92]{helvet}
\renewcommand{\familydefault}{\sfdefault}
\usepackage{needspace}
\usepackage{graphicx,float,booktabs,tabularx,array,amsmath,microtype,titlesec,caption,tcolorbox,longtable}
\usepackage[table]{xcolor}
\usepackage[hidelinks]{hyperref}
\usepackage[round]{natbib}
\definecolor{sky}{HTML}{2F6FBA}
\definecolor{dusk}{HTML}{C8562B}
\definecolor{ink}{HTML}{1C2230}
\definecolor{rowa}{HTML}{EEF2F7}
\titleformat{\section}{\Large\bfseries\color{sky}}{}{0pt}{}[\vspace{-6pt}{\color{sky}\rule{\linewidth}{0.6pt}}]
\titleformat{\subsection}{\normalsize\bfseries\color{ink}}{}{0pt}{}
\titlespacing{\section}{0pt}{10pt}{6pt}
\titlespacing{\subsection}{0pt}{8pt}{3pt}
\captionsetup{font={footnotesize,sf},labelfont={bf,color=sky},justification=raggedright,singlelinecheck=false,skip=3pt}
\setlength{\parskip}{3pt}\setlength{\parindent}{0pt}
\raggedbottom
\newcolumntype{Y}{>{\raggedright\arraybackslash}X}
\renewcommand{\arraystretch}{1.15}
\setlength{\tabcolsep}{4pt}

\begin{document}
\twocolumn[
\begin{@twocolumnfalse}
\vspace*{-6mm}
{\color{sky}\fontsize{28}{30}\selectfont\bfseries The color of Earth's sky,\\ 4.4 billion years to today\par}
\vspace{6pt}
{\large\color{ink} What the sky looked like from the ground---straight up and at the horizon, at the equator and the poles, at noon and at dusk---at thirteen moments in Earth's history, reconstructed with a spectral radiative-transfer model.\par}
\vspace{4pt}
{\small\color{gray} Prepared with Claude (Anthropic) $\cdot$ September 2026\par}
\vspace{8pt}
{\includegraphics[width=\linewidth]{figures/fig01_timeline.png}}
{\footnotesize\sffamily\textbf{\color{sky}Figure 1.} Mid-latitude noon sky at thirteen epochs, zenith (top) to horizon (bottom), oldest at left. Brightness shown relative to today's clean sky.\par}
\vspace{10pt}
\end{@twocolumnfalse}
]
\setcounter{figure}{1}

\begin{tcolorbox}[colback=rowa,colframe=sky,boxrule=0.6pt,arc=1.5pt,left=5pt,right=5pt,top=4pt,bottom=4pt,title=\textbf{Five things the sky did},fonttitle=\bfseries]
\footnotesize
\textbf{1.} Under the 30-bar CO$_2$ atmosphere of the early Hadean the sky was a shadowless peach-white glow with no visible Sun.\\
\textbf{2.} During the hazy Neoarchean the whole dome was cream to apricot, with almost no difference between zenith and horizon.\\
\textbf{3.} Before the Great Oxidation Event there was no ozone, so every twilight ended with a cream-colored, not blue, zenith. A blue dusk is an optical fingerprint of oxygen.\\
\textbf{4.} Snowball Earth had the bluest sky in Earth's history; the K--Pg impact winter had no sunsets at all.\\
\textbf{5.} The zenith-to-horizon color gradient is the single best diagnostic of an atmosphere's state: largest in clean air, gone under haze or soot, reversed under volcanic sulfate.
\end{tcolorbox}

\section*{Has this been done before?}
""" + sec('Has this been done before?').replace('Lynch \\& Mazuk (2005)', r'\citet{lynch2005}').replace('Peyvandi et al. (2016)', r'\citet{peyvandi2016}').replace('Lee \\& Mollner (2017)', r'\citet{lee2017}').replace('Catling \\& Zahnle (2020)', r'\citet{catling2020}').replace('Arney et al. (2016)', r'\citet{arney2016}').replace('Mak et al. (2023)', r'\citet{mak2023}').replace('Goldblatt et al. (2024)', r'\citet{goldblatt2024}') + r"""

\section*{How the colors were computed}
""" + sec('How the colors were computed') + r"""

\textbf{The young Sun.} The Sun is treated as a blackbody whose effective temperature and luminosity follow standard solar-evolution tracks: 5,560\,K and 70\% of today's output at 4.4\,Ga, rising through 5,620\,K (75\%) at 3.8\,Ga, 5,660\,K (80\%) at 2.7\,Ga and 5,700\,K (85\%) at 2.2\,Ga to 5,772\,K today (Table~\ref{tab:epochs}). The color effect is small: a 5,560\,K Sun is only about 200\,K cooler in color temperature than the modern one, a difference that is barely perceptible side by side and is swamped by atmospheric effects ten to a hundred times larger. The brightness effect is not small, and is why the early-epoch skies are rendered dimmer. Fraunhofer lines and the young Sun's ultraviolet excess, which matter for haze photochemistry but not for visible color, are ignored.

The model is provided as the Python source \texttt{skymodel.py}; \texttt{run\_epochs.py} produces the sky colors and \texttt{limb\_grid.py} the limb and disk colors for the renderings. Epoch atmospheres are summarized in Table~\ref{tab:epochs}.

\begin{table*}[t]\centering\footnotesize
\caption{Atmospheres used for each epoch. Gas amounts are partial pressures in bar; AOD is tropospheric aerosol optical depth at 550\,nm; haze, sulfate and soot are column optical depths at 550\,nm; $T_{\rm eff}$ and $L_\odot$ are the assumed solar effective temperature and luminosity relative to today.}
\label{tab:epochs}
\rowcolors{2}{rowa}{white}
\begin{tabularx}{\textwidth}{@{}lYrrrrrrr@{}}\toprule
Epoch & Gas (bar) & O$_3$ (DU) & AOD & Haze & Sulfate & Soot & $T_{\rm eff}$ (K) & $L_\odot$ \\ \midrule
4.4 Ga Hadean & CO$_2$ 30, N$_2$ 1, H$_2$O 0.3 & 0 & 0.30 & -- & -- & -- & 5560 & 0.70 \\
4.0 Ga Hadean & N$_2$ 1, CO$_2$ 0.5 & 0 & 0.15 & -- & -- & -- & 5600 & 0.72 \\
3.8 Ga Archean & N$_2$ 0.8, CO$_2$ 0.1, CH$_4$ 0.001 & 0 & 0.08 & -- & -- & -- & 5620 & 0.75 \\
2.7 Ga thin haze & N$_2$ 0.8, CO$_2$ 0.05, CH$_4$ 0.003 & 0 & 0.08 & 0.15 & -- & -- & 5660 & 0.80 \\
2.7 Ga thick haze & N$_2$ 0.8, CO$_2$ 0.05, CH$_4$ 0.005 & 0 & 0.08 & 0.6 & -- & -- & 5660 & 0.80 \\
2.7 Ga very thick haze & N$_2$ 0.8, CO$_2$ 0.05, CH$_4$ 0.01 & 0 & 0.08 & 1.5 & -- & -- & 5660 & 0.80 \\
2.2 Ga post-GOE & N$_2$ 0.8, O$_2$ 0.002, CO$_2$ 0.02 & 150 & 0.10 & -- & -- & -- & 5700 & 0.85 \\
700 Ma Snowball & N$_2$ 0.78, O$_2$ 0.02, CO$_2$ 0.01 (+dust 0.05) & 250 & 0.02 & -- & -- & -- & 5750 & 0.94 \\
300 Ma Carboniferous & N$_2$ 0.78, O$_2$ 0.33 & 330 & 0.15 & -- & -- & -- & 5765 & 0.975 \\
66 Ma impact winter & modern air & 300 & 0.15 & -- & 0.5 & 1.5 & 5772 & 0.995 \\
1815 volcanic year & modern air & 300 & 0.10 & -- & 0.4 & -- & 5772 & 1.00 \\
Modern, clean & N$_2$ 0.78, O$_2$ 0.21, Ar 0.01 & 300 & 0.10 & -- & -- & -- & 5772 & 1.00 \\
Modern, polluted & modern air & 300 & 0.60 & -- & -- & -- & 5772 & 1.00 \\ \bottomrule
\end{tabularx}
\end{table*}

\begin{table*}[t]\centering\footnotesize
\caption{Summary of sky colors by epoch (mid-latitude noon unless stated).}
\label{tab:summary}
\rowcolors{2}{rowa}{white}
\begin{tabularx}{\textwidth}{@{}lYYY@{}}\toprule
Epoch & Noon zenith & Horizon & Sunset \\ \midrule
""" + table + r"""
\bottomrule\end{tabularx}
\end{table*}

\section*{Findings}
\subsection*{Horizon versus zenith}
""" + sec('Horizon versus zenith') + r"""

\subsection*{Equator, mid-latitudes, poles}
""" + sec('Equator, mid-latitudes, poles') + r"""

\subsection*{Particulates}
""" + sec('Particulates') + r"""

\subsection*{Sunsets and sunrises through time}
""" + sec('Sunsets and sunrises through time') + r"""

\section*{The atmosphere from space}
""" + sec('The atmosphere from space') + r"""

\begin{figure*}[t]\centering
""" + globe_grid + r"""
\caption{Volumetric renderings of the atmosphere at eight epochs. Equinox geometry with the Sun behind the viewer; the shell is the limb color along tangent rays, drawn 30 times too thick (100\,km spans half an Earth radius); the disk is the planet's reflected color over ocean (ice for Snowball Earth). Limb brightness is compressed so faint upper layers remain visible.}
\label{fig:globes}
\end{figure*}

\footnotesize
""" + globe_text + r"""\normalsize

\Needspace*{20\baselineskip}
\section*{Epoch by epoch}
The thirteen panels that follow are laid out identically so they can be compared at a glance. Each panel begins with the epoch's name and a one-line summary of the atmosphere assumed (Table~\ref{tab:epochs} gives the full parameters). The upper row shows the noon sky dome at three latitudes---the equator, a mid-latitude site and the summer pole---with the zenith at the top of each swatch and the horizon at the bottom, the correlated color temperatures of both printed above, and the Sun's disk drawn in its own color, at its noon elevation, and with a brightness that reflects how much of it survives the atmosphere (where the Sun would not be visible at all, the swatch says so). The two strips beneath trace the sky from the solar horizon across the zenith to the antisolar horizon at two moments: with the Sun sitting on the horizon, and with it $4^\circ$ below, in civil twilight. All swatches are shown at a brightness relative to today's clean sky, so a dim epoch reads as dim; the paragraph after each panel explains what the colors mean and why they arise.
""" + epoch_blocks + r"""

\section*{Caveats}
""" + sec('Caveats') + r"""

\nocite{*}
\bibliographystyle{plainnat}
{\footnotesize\bibliography{refs}}

\onecolumn
\section*{Appendix: computed chromaticities}
\scriptsize
\rowcolors{2}{rowa}{white}
\begin{longtable}{@{}llllllr@{}}
\caption{CIE 1931 chromaticity $(x,y)$ and correlated color temperature of the noon zenith and horizon sky, and direct-Sun brightness relative to the modern equatorial Sun.}\\ \toprule
Epoch & Latitude & Zenith $(x,y)$ & CCT (K) & Horizon $(x,y)$ & CCT (K) & Sun \\ \midrule \endfirsthead
\toprule Epoch & Latitude & Zenith $(x,y)$ & CCT (K) & Horizon $(x,y)$ & CCT (K) & Sun \\ \midrule \endhead
""" + data_rows + r"""\bottomrule
\end{longtable}
\end{document}
"""

open(f'{L}/main.tex', 'w').write(main)

bib = r"""@article{arney2016, author={Arney, Giada and Domagal-Goldman, Shawn D. and Meadows, Victoria S. and others}, title={The Pale Orange Dot: The Spectrum and Habitability of Hazy {Archean} {Earth}}, journal={Astrobiology}, volume={16}, pages={873--899}, year={2016}}
@article{catling2020, author={Catling, David C. and Zahnle, Kevin J.}, title={The {Archean} atmosphere}, journal={Science Advances}, volume={6}, pages={eaax1420}, year={2020}}
@misc{goldblatt2024, author={Goldblatt, Colin and Eager-Nash, Jack K. and Horne, Julia E.}, title={Evolution of the {Archean} Atmosphere}, howpublished={arXiv:2409.13105}, year={2024}}
@article{mak2023, author={Mak, M. T. and others}, title={{3D} simulations of the {Archean} {Earth} including photochemical haze profiles}, journal={Journal of Geophysical Research: Atmospheres}, year={2023}}
@article{hoffman2017, author={Hoffman, Paul F. and others}, title={Snowball {Earth} climate dynamics and {Cryogenian} geology-geobiology}, journal={Science Advances}, volume={3}, pages={e1600983}, year={2017}}
@article{lynch2005, author={Lynch, David K. and Mazuk, Steven}, title={On the colors of distant objects}, journal={Applied Optics}, year={2005}}
@article{peyvandi2016, author={Peyvandi, Shahram and others}, title={Colorimetric analysis of outdoor illumination across varieties of atmospheric conditions}, journal={Journal of the Optical Society of America A}, volume={33}, pages={1049}, year={2016}}
@article{lee2017, author={Lee, Raymond L. and Mollner, Duncan C.}, title={Tropospheric haze and colors of the clear twilight sky}, journal={Applied Optics}, volume={56}, pages={G179}, year={2017}}
@article{hernandez1999, author={Hern{\'a}ndez-Andr{\'e}s, Javier and Lee, Raymond L. and Romero, Javier}, title={Calculating correlated color temperatures across the entire gamut of daylight and skylight chromaticities}, journal={Applied Optics}, volume={38}, pages={5703--5709}, year={1999}}
@article{shaw2026, author={Shaw, Joseph A. and others}, title={Solar eclipse sky brightness and color}, journal={Applied Optics}, year={2026}}
@article{zhu2020, author={Zhu, Yunqian and others}, title={Persisting volcanic ash particles impact stratospheric {SO}$_2$ lifetime and aerosol optical properties}, journal={Nature Communications}, year={2020}}
@article{wyman2013, author={Wyman, Chris and Sloan, Peter-Pike and Shirley, Peter}, title={Simple analytic approximations to the {CIE} {XYZ} color matching functions}, journal={Journal of Computer Graphics Techniques}, volume={2}, pages={1--11}, year={2013}}
"""
open(f'{L}/refs.bib', 'w').write(bib)
print('ok')
