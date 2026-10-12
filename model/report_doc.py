"""The report as a list of blocks, rendered both as the HTML report and as the LaTeX paper.

gen_report.py builds the blocks; render_html and render_tex turn the same list into the two
documents, so the text, figures, tables and references are the same in both. Text is written
once, as HTML-flavoured strings (<em>, <i>, <b>, <sub>, <sup>, &amp;), and converted for LaTeX by
tex(). Two marks inside text are resolved per output: {ref:label} becomes "Table 3" / "Figure 2"
(numbered in order of appearance, the same in both), and citations written as prose ("Cooke et
al. (2021)", "Simon et al. 2018") become links to the reference list (report_refs.link_cites).
"""
import base64, html, io, re
from pathlib import Path

import report_refs as refs

# ---- blocks -------------------------------------------------------------------------------------
# Each block is a dict with a 'kind'. Builders keep gen_report.py readable.
def part(title, id=None): return dict(kind='part', title=title, id=id or slug(title))
def sec(title, id=None): return dict(kind='sec', title=title, id=id or slug(title))
def sub(title): return dict(kind='sub', title=title)
def p(text): return dict(kind='p', text=text)
def ps(*texts): return [p(t) for t in texts]
def box(title, items): return dict(kind='box', title=title, items=items)
def figure(path, caption, label, wide=True, alt=''):
    """An image file (PNG/JPEG) shown in both: the LaTeX paper includes it from latex/figures,
    the HTML report embeds it."""
    return dict(kind='fig', path=Path(path), caption=caption, label=label, wide=wide, alt=alt or caption)
def table(head, rows, caption, label, spec=None, wide=True, small=False):
    return dict(kind='table', head=head, rows=rows, caption=caption, label=label, spec=spec, wide=wide, small=small)
def raw(html_s='', tex_s=''): return dict(kind='raw', html=html_s, tex=tex_s)
def pagebreak(): return dict(kind='raw', html='', tex='\\Needspace*{12\\baselineskip}\n')

def slug(s): return re.sub(r'[^a-z0-9]+', '-', html.unescape(re.sub(r'<[^>]+>', '', s)).lower()).strip('-')

# ---- numbering -----------------------------------------------------------------------------------
def numbering(blocks, first_figure=1):
    """Section, figure and table numbers by label, in order of appearance: LaTeX numbers floats in
    source order, so the HTML's numbers match the paper's."""
    nums, f, t, n = {}, first_figure, 1, 1
    for b in blocks:
        if b['kind'] == 'part': nums[b['id']] = ('Section', n); n += 1
        elif b['kind'] == 'fig': nums[b['label']] = ('Figure', f); f += 1
        elif b['kind'] == 'table': nums[b['label']] = ('Table', t); t += 1
        elif b['kind'] == 'raw':
            for lab in b.get('figures', []): nums[lab] = ('Figure', f); f += 1
            for lab in b.get('tables', []): nums[lab] = ('Table', t); t += 1
    return nums

# ---- HTML ------------------------------------------------------------------------------------------
def _refs_html(s, nums):
    return re.sub(r'\{ref:([^}]+)\}', lambda m: f'<a href="#{m.group(1)}">{nums[m.group(1)][0]} {nums[m.group(1)][1]}</a>', s)

def _img_data(path):
    data = path.read_bytes()
    mime = 'image/jpeg' if path.suffix.lower() in ('.jpg', '.jpeg') else 'image/png'
    return f'data:{mime};base64,' + base64.b64encode(data).decode()

def html_text(s, nums, bib):
    return refs.link_cites(_refs_html(s, nums), bib, 'html')

def render_html(blocks, bib, nums):
    out = []
    for b in blocks:
        k = b['kind']
        if k == 'part': out.append(f'<h2 class="part" id="{b["id"]}">{b["title"]}</h2>')
        elif k == 'sec': out.append(f'<h3 id="{b["id"]}">{b["title"]}</h3>')
        elif k == 'sub': out.append(f'<h4>{b["title"]}</h4>')
        elif k == 'p': out.append(f'<p>{html_text(b["text"], nums, bib)}</p>')
        elif k == 'box':
            out.append(f'<aside class="box"><h4>{b["title"]}</h4><ol>' + ''.join(f'<li>{html_text(i, nums, bib)}</li>' for i in b['items']) + '</ol></aside>')
        elif k == 'fig':
            n = nums[b['label']]
            out.append(f'<figure class="fig" id="{b["label"]}"><img src="{_img_data(b["path"])}" alt="{html.escape(re.sub("<[^>]+>", "", b["alt"]))}">'
                       f'<figcaption><b>{n[0]} {n[1]}.</b> {html_text(b["caption"], nums, bib)}</figcaption></figure>')
        elif k == 'table':
            n = nums[b['label']]
            rows = ''.join('<tr>' + ''.join(f'<td>{html_text(str(c), nums, bib)}</td>' for c in r) + '</tr>' for r in b['rows'])
            out.append(f'<div class="wrap" id="{b["label"]}"><table><caption><b>{n[0]} {n[1]}.</b> {html_text(b["caption"], nums, bib)}</caption>'
                       '<tr>' + ''.join(f'<th>{h}</th>' for h in b['head']) + f'</tr>{rows}</table></div>')
        elif k == 'raw': out.append(_refs_html(b['html'], nums))
    return '\n'.join(out)

# ---- LaTeX -----------------------------------------------------------------------------------------
TEX_REP = {'&': r'\&', '%': r'\%', '#': r'\#', '_': r'\_', '~': r'$\sim$', '≈': r'$\approx$', '×': r'$\times$', '°': r'$^\circ$',
           '–': '--', '—': '---', '’': "'", '‘': '`', '“': '``', '”': "''", '·': r'$\cdot$', '…': r'\ldots',
           '₀': r'$_0$', '₁': r'$_1$', '₂': r'$_2$', '₃': r'$_3$', '₄': r'$_4$', 'τ': r'$\tau$', 'μ': r'$\mu$', 'λ': r'$\lambda$', 'ω': r'$\omega$',
           '²': r'$^2$', '³': r'$^3$', '⁴': r'$^4$', '¹': r'$^1$', '⁰': r'$^0$',
           '−': '$-$', '±': r'$\pm$', 'ζ': r'$\zeta$', 'θ': r'$\theta$', 'ε': r'$\varepsilon$', 'β': r'$\beta$', 'γ': r'$\gamma$',
           'ν': r'$\nu$', 'ρ': r'$\rho$', 'ξ': r'$\xi$', 'α': r'$\alpha$', 'δ': r'$\delta$', 'η': r'$\eta$', 'ι': r'$\iota$',
           'κ': r'$\kappa$', 'σ': r'$\sigma$', 'π': r'$\pi$', 'φ': r'$\phi$', 'χ': r'$\chi$', 'ψ': r'$\psi$', 'Ω': r'$\Omega$', 'Δ': r'$\Delta$',
           '½': r'$\frac{1}{2}$', '¼': r'$\frac{1}{4}$', '′': r"$'$", '″': r"$''$", '⁺': r'$^+$', '≤': r'$\le$', '≥': r'$\ge$', '→': r'$\to$',
           '⊙': r'$\odot$', '⊕': r'$\oplus$','☉': r'$\odot$', '√': r'$\surd$', '∼': r'$\sim$', '\u2009': r'\,', '\u202f': r'\,', '\u00a0': '~'}
SUPERS = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+'}

def tex(s):
    s = html.unescape(s)
    s = re.sub(r'<(em|i)>(.*?)</\1>', r'\\emph{\2}', s, flags=re.S)
    s = re.sub(r'<b>(.*?)</b>', r'\\textbf{\1}', s, flags=re.S)
    s = re.sub(r'<sub>(.*?)</sub>', r'$_{\\rm \1}$', s); s = re.sub(r'<sup>(.*?)</sup>', r'$^{\1}$', s)
    s = re.sub(r'<a href="([^"]+)">(.*?)</a>', lambda m: r'\href{' + m.group(1).replace('%', r'\%').replace('#', r'\#') + '}{' + m.group(2) + '}', s)
    s = re.sub(r'<[^>]+>', '', s)
    # Runs of superscript characters (⁶⁰Fe, 10⁻⁴) become one superscript.
    sup = '[' + ''.join(SUPERS) + ']+'
    s = re.sub(sup + '(?:·' + sup + ')*', lambda m: '$^{' + ''.join(SUPERS.get(c, '.') for c in m.group(0)) + '}$', s)
    # Escape, leaving the LaTeX already put in (\emph{...}, \href{...}, $...$) alone.
    parts = re.split(r'(\\(?:emph|textbf|href)\{|\$[^$]*\$|\}\{|\})', s)
    out = []
    for i, x in enumerate(parts):
        if i % 2 == 1: out.append(x); continue
        for a, b in TEX_REP.items(): x = x.replace(a, b)
        out.append(x)
    s = ''.join(out)
    s = s.replace('$$', '')
    s = s.replace('tau(550nm)', r'$\tau_{550}$')
    s = re.sub(r'\b(CO|CH|O|N|H|SO|NO)(\d)\b(?!\$)', r'\1$_\2$', s)
    return s

def _refs_tex(s):
    def r(m):
        lab = m.group(1)
        kind = 'Table' if lab.startswith('tab:') else 'Figure' if lab.startswith('fig:') else 'Section'
        return kind + '~\\ref{' + lab + '}'
    return re.sub(r'\{ref:([^}]+)\}', r, s)

def tex_text(s, bib):
    # {ref:...} marks survive tex() (braces are not escaped), and are resolved after.
    return refs.link_cites(_refs_tex(tex(s)), bib, 'tex')

def render_tex(blocks, bib):
    out = []
    for b in blocks:
        k = b['kind']
        if k == 'part': out.append('\n\\Needspace*{12\\baselineskip}\n\\section{' + tex(b['title']) + '}\\label{' + b['id'] + '}\n')
        elif k == 'sec': out.append('\n\\subsection{' + tex(b['title']) + '}\\label{' + b['id'] + '}\n')
        elif k == 'sub': out.append('\n\\subsubsection*{' + tex(b['title']) + '}\n')
        elif k == 'p': out.append(tex_text(b['text'], bib) + '\n')
        elif k == 'box':
            out.append('\\begin{tcolorbox}[colback=rowa,colframe=sky,boxrule=0.6pt,arc=1.5pt,left=5pt,right=5pt,top=4pt,bottom=4pt,title=\\textbf{'
                       + tex(b['title']) + '},fonttitle=\\bfseries]\n\\footnotesize\n'
                       + '\\\\\n'.join(f'\\textbf{{{i+1}.}} ' + tex_text(t, bib) for i, t in enumerate(b['items'])) + '\n\\end{tcolorbox}\n')
        elif k == 'fig':
            env = 'figure*' if b['wide'] else 'figure'
            width = '\\textwidth' if b['wide'] else '\\linewidth'
            out.append(f'\\begin{{{env}}}[t]\\centering\\includegraphics[width={width}]{{figures/{b["path"].name}}}\n'
                       f'\\caption{{{tex_text(b["caption"], bib)}}}\\label{{{b["label"]}}}\\end{{{env}}}\n')
        elif k == 'table':
            env = 'table*' if b['wide'] else 'table'
            width = '\\textwidth' if b['wide'] else '\\linewidth'
            spec = b['spec'] or ('l' + 'Y' * (len(b['head']) - 1))
            body = '\n'.join(' & '.join(tex_text(str(c), bib) for c in r) + r' \\' for r in b['rows'])
            size = '\\scriptsize' if b['small'] else '\\footnotesize'
            out.append(f'\\begin{{{env}}}[t]\\centering{size}\n\\caption{{{tex_text(b["caption"], bib)}}}\\label{{{b["label"]}}}\n'
                       f'\\rowcolors{{2}}{{rowa}}{{white}}\n\\begin{{tabularx}}{{{width}}}{{@{{}}{spec}@{{}}}}\\toprule\n'
                       + ' & '.join(tex(h) for h in b['head']) + ' \\\\ \\midrule\n' + body + '\n\\bottomrule\\end{tabularx}\n'
                       f'\\end{{{env}}}\n')
        elif k == 'raw': out.append(_refs_tex(b['tex']))
    return '\n'.join(out)
