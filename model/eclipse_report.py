"""Lunar eclipses for the report: the eclipsed Moon at each epoch (the figure) and its numbers
(the table), from lunar_eclipse.py's eclipse_grid.json. gen_report.py embeds the figure and
make_figs.py writes it for the LaTeX build."""
import io
import json
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.image as mpimg

HERE = Path(__file__).resolve().parent
GRID = json.loads((HERE / 'eclipse_grid.json').read_text(encoding='utf-8'))
MOON_ER = 1737.4/6371.0                 # the Moon's radius in Earth radii
DANJON = 1+1/85
V_FULL = -12.73                         # the full Moon at today's mean distance (moon.js MOON_V_FULL)

# Per epoch: the page's counts over 2000-2100 (lunar_eclipse.js, run in the page), the orbit's
# tilt (lunar_inclination.py) and the longest totality, in minutes.
COUNTS = {'hadean44': (456, 230, 104), 'hadean40': (438, 218, 106), 'archean38': (420, 211, 105),
          'archean27': (286, 137, 109), 'proterozoic22': (226, 124, 106), 'snowball07': (172, 77, 108),
          'ordovician466': (171, 74, 106), 'carbon30': (167, 76, 107), 'kpg66': (149, 71, 107),
          'volcanic': (144, 84, 107), 'modern': (144, 84, 107)}
TILT = {'hadean44': 5.93, 'hadean40': 5.80, 'archean38': 5.75, 'archean27': 5.46, 'proterozoic22': 5.37,
        'snowball07': 5.20, 'ordovician466': 5.19, 'carbon30': 5.18, 'kpg66': 5.15, 'volcanic': 5.15, 'modern': 5.15}
LABEL = {'modern': 'Today', 'volcanic': '1815 (Tambora)', 'kpg66': '66 Ma impact winter', 'carbon30': '300 Ma',
         'ordovician466': '466 Ma', 'snowball07': '700 Ma Snowball', 'proterozoic22': '2.2 Ga', 'archean27': '2.7 Ga thick haze',
         'archean27thin': '2.7 Ga thin haze', 'archean38': '3.8 Ga', 'hadean40': '4.0 Ga', 'hadean44': '4.4 Ga'}


def rec(key):
    r = GRID['epochs'][key]
    return GRID['epochs'][r] if isinstance(r, str) else r


def shadow_at(r, rho):
    """Luminance and linear-sRGB light (over the uneclipsed Moon's) at rho Earth radii."""
    n = len(r['Y']); x = np.clip(np.asarray(rho)/r['rhoMax']*(n-1), 0, n-1)
    logY = np.interp(x, np.arange(n), np.log10(np.maximum(r['Y'], 1e-30)))
    rgb = np.stack([np.interp(x, np.arange(n), np.array(r['rgb'])[:, q]) for q in range(3)], -1)
    return 10**logY, rgb


def umbra(key):
    """The umbra's radius at the Moon (Earth radii, with Danjon's enlargement) for the mean distance."""
    r = rec(key)
    return DANJON-r['D']*(np.radians(0.2666)*sun_r(key)-1/23455.0)


def sun_r(key):
    import epochs
    e = epochs.BY_KEY.get(key, epochs.BY_KEY['modern'])
    T, L = e['sun']
    return L**0.5/(T/5772.0)**2


def central(key):
    """The Moon at the middle of a central eclipse: its mean light over the full Moon's, its V
    magnitude (the full Moon brighter as the inverse square of a nearer Moon), and its mean surface
    brightness in mag/arcsec²."""
    r = rec(key)
    rr = np.linspace(0, MOON_ER, 300)
    Y, _ = shadow_at(r, rr)
    Ym = np.trapezoid(Y*rr, rr)/np.trapezoid(rr, rr)
    V = V_FULL-5*np.log10(60.14/r['D'])-2.5*np.log10(Ym)
    rad_arcsec = np.degrees(np.arctan(1737.4/(r['D']*6371.0)))*3600
    return Ym, V, V+2.5*np.log10(np.pi*rad_arcsec**2)


def table_rows():
    """[label, umbra in Moon widths, V at mid-eclipse, surface brightness, tilt, umbral and total eclipses a century, longest totality]."""
    rows = []
    for key in ['modern', 'volcanic', 'kpg66', 'carbon30', 'ordovician466', 'snowball07', 'proterozoic22', 'archean27', 'archean38', 'hadean40', 'hadean44']:
        Ym, V, sb = central(key)
        u, t, m = COUNTS[key]
        rows.append([LABEL[key], umbra(key)/MOON_ER, V, sb, TILT[key], u, t, m])
    return rows


def _moon_albedo(N):
    img = mpimg.imread(str(HERE.parent / 'site' / 'moon.jpg')).astype(float)
    if img.max() > 1.5: img /= 255.0
    g = img[..., :3].mean(-1) if img.ndim == 3 else img
    H, W = g.shape
    yy, xx = np.mgrid[0:N, 0:N]
    u = (xx+0.5)/N*2-1; v = 1-(yy+0.5)/N*2
    # The photograph's disk fills 0.98 of it, north down (moon_surface.js).
    px = ((u*0.98+1)/2*(W-1)).astype(int); py = ((1+v*0.98)/2*(H-1)).astype(int)
    a = g[np.clip(py, 0, H-1), np.clip(px, 0, W-1)]
    return u, v, a/np.percentile(a[u*u+v*v < 0.9], 99)


def _disk(key, cx, N, u, v, alb):
    """The Moon drawn as the page draws it, with the shadow's axis at (cx, 0) in Moon radii: the
    shadow's light for an eye adapted to the brightest part of the disk (lunar_eclipse.js)."""
    r = rec(key)
    rho = np.hypot(u-cx, v)*MOON_ER
    Y, rgb = shadow_at(r, rho)
    inside = u*u+v*v <= 1
    A = Y[inside].max()
    cy = np.maximum(0.2126*rgb[..., 0]+0.7152*rgb[..., 1]+0.0722*rgb[..., 2], 1e-30)
    g = np.minimum(1, A**0.25*(Y/A)**0.6)
    lin = rgb/cy[..., None]*g[..., None]
    mx = lin.max(-1, keepdims=True); lin = np.where(mx > 1, lin/mx, lin)
    lin = lin*alb[..., None]
    s = np.where(lin <= 0.0031308, 12.92*lin, 1.055*np.clip(lin, 0, None)**(1/2.4)-0.055)
    out = np.zeros((N, N, 4)); out[..., :3] = np.clip(s, 0, 1); out[..., 3] = inside
    return out


FIG_KEYS = ['modern', 'carbon30', 'snowball07', 'proterozoic22', 'archean38', 'hadean44', 'volcanic', 'archean27', 'kpg66']


def figure(path=None):
    """Two rows of eclipsed Moons and the shadow's profile. Returns PNG bytes, also written to path."""
    N = 260
    u, v, alb = _moon_albedo(N)
    BG = '#05060a'
    fig = plt.figure(figsize=(9.6, 5.6), dpi=170); fig.patch.set_facecolor(BG)
    gs = fig.add_gridspec(3, len(FIG_KEYS), height_ratios=[1, 1, 1.25], hspace=0.42, wspace=0.08, left=0.06, right=0.99, top=0.93, bottom=0.09)
    for j, key in enumerate(FIG_KEYS):
        Ym, V, sb = central(key)
        for row, cx in enumerate([0.0, (umbra(key))/MOON_ER-1.0]):
            ax = fig.add_subplot(gs[row, j]); ax.imshow(_disk(key, cx, N, u, v, alb), interpolation='bilinear'); ax.axis('off')
            if row == 0:
                ax.set_title(LABEL[key].replace(' (', '\n(').replace(' thick', '\nthick').replace(' impact', '\nimpact').replace(' Snowball', '\nSnowball'),
                             fontsize=7, color='white', pad=3, linespacing=1.0)
                ax.text(0.5, -0.08, 'V %+.1f' % V if V < 10 else 'invisible', transform=ax.transAxes, ha='center', va='top', fontsize=6.5, color='#c9ccd2')
    fig.text(0.008, 0.80, 'centred in\nthe shadow', color='#c9ccd2', fontsize=7, va='center', rotation=90, ha='left', linespacing=1.0)
    fig.text(0.008, 0.535, 'at the umbra\'s\nedge', color='#c9ccd2', fontsize=7, va='center', rotation=90, ha='left', linespacing=1.0)
    ax = fig.add_subplot(gs[2, :]); ax.set_facecolor(BG)
    cols = {'modern': '#e8a46a', 'snowball07': '#7fb2e5', 'proterozoic22': '#b9d98b', 'archean38': '#f07a4a', 'hadean44': '#d6453a', 'volcanic': '#9a9aa6', 'archean27': '#a5743d'}
    for key, c in cols.items():
        r = rec(key); rho = np.linspace(0, r['rhoMax'], 400); Y, _ = shadow_at(r, rho)
        ax.plot(rho/umbra(key), np.log10(np.maximum(Y, 1e-14)), color=c, lw=1.4, label=LABEL[key])
    ax.axvline(1, color='white', lw=0.6, ls=':', alpha=0.6)
    ax.set_xlim(0, 1.75); ax.set_ylim(-14, 0.3)
    ax.set_xlabel('distance from the shadow\'s axis, in umbral radii', color='white', fontsize=7.5)
    ax.set_ylabel('log$_{10}$ light / full Moon', color='white', fontsize=7.5)
    ax.tick_params(colors='white', labelsize=6.5)
    for s in ax.spines.values(): s.set_color('#6a6f7a')
    ax.legend(fontsize=6.3, ncol=4, frameon=False, labelcolor='white', loc='lower right')
    buf = io.BytesIO(); fig.savefig(buf, format='png', facecolor=BG); plt.close(fig)
    data = buf.getvalue()
    if path: Path(path).write_bytes(data)
    return data


if __name__ == '__main__':
    for row in table_rows(): print(row)
    figure(HERE.parent / 'latex' / 'figures' / 'lunar_eclipse.png')
