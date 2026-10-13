"""The report's timeline of the air: how its parts and its colours change through Earth's history,
with every epoch at an even step -> latex/figures/air_timeline.png

The horizontal axis is the page's timeline (globe.js timeAtPos): the epochs' ticks are evenly
spaced, and between two ticks the year runs linearly from one epoch's to the next's. The lines are
the background air through time (airtime.py background); an event's own air is drawn at its tick
(a short bar over the tick's width, joined to the line), since its few years or million years
would not show at this scale. The strips beneath are the sky's colour, from the airs the page
blends (airgrid.py, air_nodes.json) between the ticks and from each epoch's own colours
(skycolors.json) at its tick.
"""
import json, struct, sys
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import to_rgb

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import airtime as at
import daycycle as dc
import epochs as _ep
import gen_report as gr
from skymodel import rayleigh_tau, L550, LAM

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / 'latex' / 'figures' / 'air_timeline.png'
EPOCHS = gr.order
LABEL = {'protoearth455': 'Proto-Earth', 'hadean45': 'Early Hadean', 'hadean40': 'Late Hadean', 'archean38': 'Early Archean',
         'archean27clear': 'Clear Neoarchean', 'archean27thin': 'Thin haze', 'archean27': 'Thick haze', 'archean27vthick': 'Very thick haze',
         'proterozoic22': 'Post-oxidation', 'snowball07': 'Snowball Earth', 'cryogenian65': 'Cryogenian', 'ordovician466': 'Meteor storm',
         'carbon30': 'Carboniferous', 'cretaceous66': 'Late Cretaceous', 'kpg66': 'Impact winter', 'zetaoph': 'ζ Oph supernova',
         'geminga': 'Geminga supernova', 'volcanic': 'Volcanic year', 'y1900': 'Dark nights', 'ozonehole': 'Ozone hole',
         'modern': 'Clean air', 'modernpoll': 'Polluted city', 'y2100': 'Year 2100'}
# Where each epoch sits on the timeline (epoch_time.js epochAnchor).
TICK = at.YEAR
T = np.array([TICK[k] for k in EPOCHS], float)
assert np.all(np.diff(T) >= 0), 'the epochs are not in time order'
# Epochs whose air is their own rather than the background's at their year: the events, the
# report's very thick haze and the polluted city. Their air is drawn at their tick.
OWN = {k: at.event_air(k, at.ANCHOR[k], 1.0) for k in at.EV_FIELDS}
OWN['archean27vthick'] = at.normalize(_ep.BY_KEY['archean27vthick'])
OWN['modernpoll'] = at.scenario_air('modernpoll')
ZONE = 0.16                      # half the width of a tick's own stretch
# CO2 and water vapour leave the radiative model once they no longer touch the visible sky (CO2
# after the Ordovician, H2O after the Hadean), so the air holds none from there. The figure goes on
# with them as dashed lines through these pins, log-linear between ticks; each starts from the
# model's last value. CO2, in ppm of the whole air: the stage medians of PhanDA (Judd et al. 2024),
# EPICA Dome C at 342 ka (Bereiter et al. 2015), Law Dome for 1816 and 1900 (MacFarling Meure et al.
# 2006), about 354 ppm in 1990 and 425 today as measured, and 603 in 2100 on SSP2-4.5 (Meinshausen
# et al. 2020).
CO2_PPM = {'carbon30': 458, 'cretaceous66': 943, 'zetaoph': 253, 'geminga': 205, 'volcanic': 284, 'y1900': 296,
           'ozonehole': 354, 'modern': 425, 'y2100': 603}
# H2O: the near-surface vapour pressure at a fixed 80% relative humidity (Held & Soden 2006) and each
# epoch's global mean surface temperature, °C. The Precambrian between glaciations is temperate,
# held at 20 °C, the middle of the 8-30 °C that the carbon cycle allows (Charnay et al. 2017;
# Krissansen-Totton et al. 2018); the Phanerozoic is PhanDA's stage medians (Judd et al. 2024), with
# 342 ka a glacial maximum, 6.1 °C under the preindustrial (Tierney et al. 2020); 1850-1900 is
# 13.7 °C (Jones et al. 1999), today 1.4 °C warmer (Forster et al. 2025) and 2100 2.7 °C on SSP2-4.5
# (IPCC 2021).
GMST = {'archean38': 20, 'archean27clear': 20, 'proterozoic22': 20, 'cryogenian65': 20, 'ordovician466': 31.0,
        'carbon30': 16.5, 'cretaceous66': 24.5, 'zetaoph': 12.8, 'geminga': 7.6, 'volcanic': 13.7, 'y1900': 13.7,
        'ozonehole': 14.2, 'modern': 15.1, 'y2100': 16.4}
RH = 0.8


def h2o_bar(t_c):
    """Vapour pressure (bar) at relative humidity RH and t_c °C (Bolton 1980's saturation curve)."""
    return RH*6.112*np.exp(17.67*t_c/(t_c+243.5))/1000


def time_at(x):
    i = np.clip(np.floor(x).astype(int), 0, len(T)-2)
    return T[i]+(T[i+1]-T[i])*np.clip(x-i, 0, 1)


def x_at(t):
    """The first x where the timeline reaches year t."""
    for i in range(len(T)-1):
        if T[i] <= t <= T[i+1] and T[i+1] > T[i]: return i+(t-T[i])/(T[i+1]-T[i])
    return 0.0 if t < T[0] else len(T)-1.0


X = np.concatenate([np.linspace(i, i+1, 240, endpoint=False) for i in range(len(T)-1)] + [[len(T)-1]])
AIRS = [at.background(t) for t in time_at(X)]


def rayleigh(air):
    i = int(np.argmin(np.abs(LAM-550)))
    return float(rayleigh_tau({g: v for g, v in air['gas'].items() if v > 0})[i])


GAS = [('N2', r'N$_2$', '#5a6b8c'), ('O2', r'O$_2$', '#2f8f5b'), ('CO2', r'CO$_2$', '#c8562b'), ('CH4', r'CH$_4$', '#8d5bb5'), ('H2O', r'H$_2$O', '#2f8fc8')]
TAUS = [('Rayleigh', lambda a: rayleigh(a), '#3b5bdb', '-'), ('Tropospheric aerosol', lambda a: a['aer'][0], '#868e96', (0, (4, 1.5))),
        ('Dust', lambda a: a['dust'], '#8c564b', '-'), ('Organic haze', lambda a: a['haze'], '#f08c00', '-'),
        ('Stratospheric sulfate', lambda a: a['sulf'], '#9c36b5', (0, (5, 1.5, 1, 1.5))), ('Soot', lambda a: a['soot'], '#111111', '-')]


def plot_runs(ax, v, floor, col, ls='-', lw=1.2, label=None, drop_right=True):
    """A curve that is there only part of the time: each stretch where it is above zero is drawn on
    its own, falling to the axis' floor where it starts from or goes to nothing, so it does not hang
    in the air; a stretch narrower than a tick's own is a passing event, drawn as a tick's bar."""
    pos = np.nan_to_num(v) > 0
    edges = np.flatnonzero(np.diff(np.concatenate([[0], pos.astype(int), [0]])))
    for a, b in zip(edges[::2], edges[1::2]-1):
        if X[b]-X[a] < 2*ZONE and 0 < a and b < len(X)-1:
            c = round(float(X[(a+b)//2]))
            ax.plot([c-ZONE, c+ZONE], [v[a:b+1].max()]*2, color=col, lw=2.4, solid_capstyle='butt', label=label)
        else:
            xs, ys = list(X[a:b+1]), list(v[a:b+1])
            if a > 0: xs, ys = [xs[0]]+xs, [floor]+ys
            if b < len(X)-1 and drop_right: xs, ys = xs+[xs[-1]], ys+[floor]
            ax.plot(xs, ys, color=col, lw=lw, ls=ls, label=label)
        label = None
    if label: ax.plot([], [], color=col, lw=lw, ls=ls, label=label)


# ---------- the sky's colours: the page's blended airs between the ticks, each epoch's own at its tick ----------
NODES = json.loads((HERE / 'air_nodes.json').read_text(encoding='utf-8'))
AIRDIR = HERE.parent / 'site' / 'air'
LI = NODES['lats'].index('Mid-latitude')
nsz, nv, na = len(dc.SZAS), len(dc.VZ), len(dc.AZ)
per = nv*na+1
def ycode(k):
    if k == 0: return 0.0
    e = (k-1)//900+NODES.get('yEmin', -40); m = (k-1) % 900+100
    return float(f'{m}e{e}')


_node = {}
def node_xyY(nid, s, v, a):
    if nid not in _node:
        b = (AIRDIR / f'{nid}.bin').read_bytes(); n = struct.unpack('<I', b[:4])[0]
        c = np.frombuffer(b[4+n:], '<u2').astype(np.int64); N = len(NODES['lats'])*nsz*per
        planes = []
        for q in range(3):
            p = c[q*N:(q+1)*N].reshape(len(NODES['lats']), nsz, per)[LI]
            dome = np.cumsum(p[:, :-1].reshape(nsz, nv, na), axis=2) & 0xFFFF
            planes.append(dome)
        _node[nid] = planes
    P = _node[nid]
    return P[0][s, v, a]/1e4, P[1][s, v, a]/1e4, ycode(int(P[2][s, v, a]))


def blend(c0, c1, w):
    Y = np.exp(np.log(c0[2])*(1-w)+np.log(c1[2])*w) if c0[2] > 0 and c1[2] > 0 else c0[2]*(1-w)+c1[2]*w
    return c0[0]*(1-w)+c1[0]*w, c0[1]*(1-w)+c1[1]*w, Y


def bg_xyY(t, s, v, a):
    P = NODES['bg']
    i = 0
    while i < len(P)-2 and P[i+1][0] <= t: i += 1
    w = min(1, max(0, (t-P[i][0])/(P[i+1][0]-P[i][0])))
    return blend(node_xyY(P[i][1], s, v, a), node_xyY(P[i+1][1], s, v, a), w)


def noon_xyY(t, v, a):
    """Sun 45° up: halfway between the grid's 40° and 50°, as the page blends Sun heights."""
    return blend(bg_xyY(t, dc.SZAS.index(40), v, a), bg_xyY(t, dc.SZAS.index(50), v, a), 0.5)


def strip_colours(kind):
    """sRGB along X for one strip, as the report's panels draw them (gen_report.rgb)."""
    Yref = {'noon': gr.Yz, 'noonh': gr.Yz, 'sunset': gr.Yss, 'dusk': gr.Ytw}[kind]
    out = np.zeros((len(X), 3))
    for j, x in enumerate(X):
        i = int(round(x))
        if abs(x-i) <= ZONE:
            r = gr.byk[EPOCHS[i]]
            c = {'noon': r['lat']['Mid-latitude']['zenith'], 'noonh': r['lat']['Mid-latitude']['horizon'],
                 'sunset': r['sunset']['solar_horizon'], 'dusk': r['twilight']['zenith']}[kind]
        else:
            t = float(time_at(np.array([x]))[0])
            if kind == 'noon': xyY = noon_xyY(t, 0, 0)
            elif kind == 'noonh': xyY = noon_xyY(t, dc.VZ.index(88), dc.AZ.index(80))
            elif kind == 'sunset': xyY = bg_xyY(t, dc.SZAS.index(90), dc.VZ.index(88), 0)
            else: xyY = bg_xyY(t, dc.SZAS.index(94), 0, 0)
            c = {'x': xyY[0], 'y': xyY[1], 'Y': xyY[2]}
        out[j] = gr.rgb(c, Yref)
    return out


def tail_pins(g, v, tot):
    """The dashed line's pins (x, bar) for CO2 and H2O: from the last main epoch whose air holds the
    gas, at the model's value, on through the literature's values to the end."""
    if g not in ('CO2', 'H2O'): return None
    held = [i for i, k in enumerate(EPOCHS) if k in at.MAIN and at.background(TICK[k])['gas'][g] > 0]
    i0 = held[-1]
    pins = [(i0, float(v[np.argmin(np.abs(X-i0))]))]
    for i, k in enumerate(EPOCHS):
        if i <= i0: continue
        if g == 'H2O' and k in GMST: pins.append((i, float(h2o_bar(GMST[k]))))
        elif g == 'CO2' and k in CO2_PPM: pins.append((i, CO2_PPM[k]*1e-6*float(tot[np.argmin(np.abs(X-i))])))
    if pins[-1][0] < len(EPOCHS)-1: pins.append((len(EPOCHS)-1, pins[-1][1]))
    return pins


def main():
    plt.rcParams.update({'font.family': 'sans-serif', 'font.sans-serif': ['Helvetica', 'Arial', 'DejaVu Sans'], 'font.size': 7, 'mathtext.default': 'regular'})
    fig = plt.figure(figsize=(7.2, 8.4), dpi=220)
    gs = fig.add_gridspec(7, 1, height_ratios=[2.3, 1.0, 2.0, 0.22, 0.22, 0.22, 0.22], hspace=0.12, left=0.085, right=0.79, top=0.985, bottom=0.17)
    axg, axo, axt = fig.add_subplot(gs[0]), fig.add_subplot(gs[1]), fig.add_subplot(gs[2])
    strips = [fig.add_subplot(gs[3+i]) for i in range(4)]
    xs = (-0.4, len(T)-0.6)
    # The stretches of time the eye should catch: the glaciations, the Great Oxidation, the haze episodes.
    spans = [((at.GOE_START, at.GOE_END), '#d8e6d0', 'Great Oxidation'),
             ((at.ma(717), at.ma(660.98)), '#d4e3f2', None), ((at.ma(639.5), at.ma(635.21)), '#d4e3f2', None)]
    for a in (axg, axo, axt):
        for (t0, t1), col, _ in spans: a.axvspan(x_at(t0), x_at(t1), color=col, lw=0, zorder=0)
        for i, k in enumerate(EPOCHS):
            a.axvline(i, color='#c9ccd2' if k not in OWN else '#e3c9b8', lw=0.6, zorder=0.5, ls='-' if k not in OWN else '--')
        a.set_xlim(*xs); a.tick_params(axis='x', bottom=False, labelbottom=False)
        for s in ('top', 'right'): a.spines[s].set_visible(False)
    # Gases.
    tot = np.array([sum(a['gas'].values()) for a in AIRS])
    axg.plot(X, tot, color='#1c2230', lw=1.1, label='Total')
    for g, lab, col in GAS:
        v = np.array([a['gas'][g] for a in AIRS])
        tail = tail_pins(g, v, tot)
        if tail:
            x0 = tail[0][0]; v = np.where(X <= x0, v, 0)
            px, py = zip(*tail); xx = X[X >= x0]
            axg.plot(xx, np.exp(np.interp(xx, px, np.log(py))), color=col, lw=1.0, ls=(0, (3, 1.5)))
        plot_runs(axg, v, 1e-6, col, label=lab, drop_right=not tail)
    for k, air in OWN.items():
        i = EPOCHS.index(k)
        for g, lab, col in GAS + [('_tot', '', '#1c2230')]:
            val = sum(air['gas'].values()) if g == '_tot' else air['gas'][g]
            base = tot[np.argmin(np.abs(X-i))] if g == '_tot' else AIRS[int(np.argmin(np.abs(X-i)))]['gas'][g]
            if val > 0 and abs(np.log(max(val, 1e-12))-np.log(max(base, 1e-12))) > 0.02:
                axg.plot([i-ZONE, i+ZONE], [val, val], color=col, lw=2.4, solid_capstyle='butt')
                if base > 0: axg.plot([i, i], [base, val], color=col, lw=0.6, alpha=0.7)
    axg.set_yscale('log'); axg.set_ylim(1e-6, 100); axg.set_ylabel('Partial pressure (bar)')
    axg.legend(loc='upper left', bbox_to_anchor=(1.005, 1.0), frameon=False, fontsize=6.5, handlelength=1.6)
    axg.text(x_at((at.GOE_START+at.GOE_END)/2), 40, 'Great\nOxidation', ha='center', va='top', fontsize=5.5, color='#4a6b3c')
    axg.text(x_at(at.ma(690)), 40, 'Snowball\nglaciations', ha='center', va='top', fontsize=5.5, color='#3c5a7a')
    axg.annotate('Moon-forming\nimpact', xy=(x_at(at.T_IMPACT), 30), xytext=(x_at(at.T_IMPACT)+0.9, 3), fontsize=5.5, color='#555',
                 arrowprops=dict(arrowstyle='-', lw=0.5, color='#888'))
    # Ozone.
    oz = np.array([a['ozone']['Mid-latitude'] for a in AIRS])
    axo.plot(X, oz, color='#3a7ec8', lw=1.3)
    for k, air in OWN.items():
        i = EPOCHS.index(k); base = oz[int(np.argmin(np.abs(X-i)))]
        if abs(air['ozone']['Mid-latitude']-base) > 1:
            axo.plot([i-ZONE, i+ZONE], [air['ozone']['Mid-latitude']]*2, color='#3a7ec8', lw=2.4, solid_capstyle='butt')
            axo.plot([i, i], [base, air['ozone']['Mid-latitude']], color='#3a7ec8', lw=0.6, alpha=0.7)
    axo.set_ylim(0, 360); axo.set_ylabel('Ozone (DU)')
    # Optical depths.
    for lab, f, col, ls in TAUS:
        v = np.array([f(a) for a in AIRS])
        # Entries that are only events show in the legend as their bars.
        if (v > 0).any(): plot_runs(axt, v, 3e-3, col, ls=ls, label=lab)
        else: axt.plot([], [], color=col, lw=2.4, label=lab)
        for k, air in OWN.items():
            i = EPOCHS.index(k); val = f(air); base = f(AIRS[int(np.argmin(np.abs(X-i)))])
            if val > 0 and abs(val-base) > 0.005:
                axt.plot([i-ZONE, i+ZONE], [val, val], color=col, lw=2.4, solid_capstyle='butt')
                if base > 0: axt.plot([i, i], [base, val], color=col, lw=0.6, alpha=0.7)
    axt.set_yscale('log'); axt.set_ylim(3e-3, 20); axt.set_ylabel('Optical depth at 550 nm')
    axt.legend(loc='upper left', bbox_to_anchor=(1.005, 1.0), frameon=False, fontsize=6.5, handlelength=1.6)
    # Colour strips.
    for a, (kind, lab) in zip(strips, [('noon', 'Zenith, Sun 45° up'), ('noonh', 'Horizon, Sun 45° up'),
                                       ('sunset', 'Horizon under the setting Sun'), ('dusk', 'Zenith, Sun 4° down')]):
        c = strip_colours(kind)
        a.imshow(c[None, :, :], extent=[X[0], X[-1], 0, 1], aspect='auto', interpolation='nearest')
        a.set_xlim(*xs); a.set_yticks([]); a.text(len(T)-0.45, 0.5, lab, va='center', fontsize=6.2)
        a.tick_params(axis='x', bottom=False, labelbottom=False)
        for s in a.spines.values(): s.set_visible(False)
    last = strips[-1]
    last.set_xticks(range(len(EPOCHS)))
    last.set_xticklabels([f"{LABEL[k]}  {gr.ages[k]}" for k in EPOCHS], rotation=90, fontsize=6.4)
    last.tick_params(axis='x', bottom=True, labelbottom=True, length=2)
    for i, k in enumerate(EPOCHS):
        if k in OWN: last.get_xticklabels()[i].set_style('italic')
    fig.savefig(OUT, facecolor='white')
    print('wrote', OUT)


if __name__ == '__main__':
    main()
