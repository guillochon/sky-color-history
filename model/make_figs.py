import sys
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from scipy.interpolate import RegularGridInterpolator

import gen_report as gr
from gen_report import byk, rgb, MOD, Yz, Yss, Ytw, LIMB

HERE = Path(__file__).resolve().parent
# Figures go to latex/figures, or to the folder given on the command line.
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / 'latex' / 'figures'
OUT.mkdir(parents=True, exist_ok=True)
# The epochs that keep today's air (Year 2100, the supernovae) reuse the modern figures.
order = [k for k in gr.order if k not in gr.SAME_AIR]
ages = {'protoearth455':'4.55 Ga','hadean45':'4.50 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27thin':'2.7 Ga\nthin haze','archean27':'2.7 Ga\nthick haze','archean27vthick':'2.7 Ga\nv. thick','proterozoic22':'2.2 Ga','snowball07':'700 Ma','ordovician466':'466 Ma','carbon30':'300 Ma','kpg66':'66 Ma','volcanic':'1815','ozonehole':'1980–2000','modern':'today','modernpoll':'today\npolluted'}

def srgb2lin(c): c=np.asarray(c); return np.where(c<=0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
def lin2srgb(c): c=np.clip(c,0,1); return np.where(c<=0.0031308, 12.92*c, 1.055*c**(1/2.4)-0.055)
def grad(top, bot, n=200):
    a, b = srgb2lin(top), srgb2lin(bot); t = np.linspace(0,1,n)[:,None]
    return lin2srgb(a*(1-t)+b*t)

GREY = '#7a7d84'

# ---------- Figure 1: timeline strip ----------
fig, ax = plt.subplots(figsize=(10, 2.6), dpi=200); fig.patch.set_facecolor(GREY)
for i, k in enumerate(order):
    lat = byk[k]['lat']['Mid-latitude']
    g = grad(rgb(lat['zenith'], Yz), rgb(lat['horizon'], Yz))
    ax.imshow(g[:, None, :].repeat(20, 1), extent=[i+0.03, i+0.97, 0, 1], aspect='auto')
    ax.text(i+0.5, -0.06, ages[k], ha='center', va='top', fontsize=7, color='white', linespacing=1.1)
ax.set_xlim(0, len(order)); ax.set_ylim(-0.32, 1); ax.axis('off')
fig.savefig(f'{OUT}/fig01_timeline.png', bbox_inches='tight', facecolor=GREY, pad_inches=0.1); plt.close()

# ---------- Per-epoch figures ----------
def epoch_fig(k):
    r = byk[k]
    fig = plt.figure(figsize=(4.4, 3.4), dpi=250); fig.patch.set_facecolor(GREY)
    gs = fig.add_gridspec(3, 3, height_ratios=[3.0, 0.9, 0.9], hspace=0.6, wspace=0.08, left=0.02, right=0.98, top=0.95, bottom=0.05)
    for j, L in enumerate(['Equator', 'Mid-latitude', 'Polar summer']):
        lat = r['lat'][L]; ax = fig.add_subplot(gs[0, j])
        g = grad(rgb(lat['zenith'], Yz), rgb(lat['horizon'], Yz))
        ax.imshow(g[:, None, :].repeat(10, 1), extent=[0, 1, 0, 1], aspect='auto')
        sunrel = lat['sunY']/MOD['lat']['Equator']['sunY']
        if sunrel > 3e-4:
            op = min(1, 0.35+0.65*(np.log10(sunrel)+3.5)/3.5)
            ax.scatter([0.58],[1-(0.08+lat['sz']/90*0.70)], s=(6+5*op)**2, color=lat['sun']['hex'], alpha=op, transform=ax.transAxes, edgecolors='none', clip_on=False)
        else:
            ax.text(0.03, 0.04, 'sun not visible', fontsize=4.6, style='italic', color='k', alpha=0.6, transform=ax.transAxes)
        ax.set_xticks([]); ax.set_yticks([])
        for s in ax.spines.values(): s.set_visible(False)
        ax.set_title(f"{L}\nzenith {int(lat['zenith']['cct']):,} K · horizon {int(lat['horizon']['cct']):,} K", fontsize=5.2, color='white', pad=2)
    def strip(row, s, keys, labels, Yref, title):
        ax = fig.add_subplot(gs[row, :]); ax.set_xlim(0, 5); ax.set_ylim(0, 1); ax.axis('off')
        for i, (key, lab) in enumerate(zip(keys, labels)):
            ax.add_patch(Rectangle((i+0.01, 0), 0.98, 1, color=rgb(s[key], Yref, 0.06)))
            ax.text(i+0.04, 0.10, lab, fontsize=4.6, style='italic', color='k', alpha=0.6)
        ax.text(0, 1.10, title, fontsize=5.2, color='white', va='bottom')
    strip(1, r['sunset'], ['solar_horizon','above_sun','zenith','anti_15','anti_horizon'], ['sun horizon','15° up','zenith','15° up','antisolar'], Yss, 'Sun on the horizon')
    strip(2, r['twilight'], ['solar_horizon','above_sun','above_sun30','zenith','anti_horizon'], ['sun horizon','15° up','30° up','zenith','antisolar'], Ytw, 'Sun 4° below the horizon')
    fig.savefig(f'{OUT}/sky_{k}.png', facecolor=GREY); plt.close()
for k in order: epoch_fig(k)

# ---------- Globes ----------
def globe(k, W=1000):
    d = LIMB[k]; lats = np.array(d['lats']); alts = np.array(d['alts']); limb = np.array(d['limb']); disk = np.array(d['disk'])
    cx = cy = W/2; R = W*0.30; EX = 0.5; hmax = alts[-1]
    img = np.zeros((W, W, 3))+[0.02, 0.024, 0.04]
    yy, xx = np.mgrid[0:W, 0:W]; dx = xx-cx; dy = yy-cy; r = np.hypot(dx, dy)
    lat = np.minimum(82.5, np.degrees(np.abs(np.arcsin(np.clip(dy/np.maximum(r, 1e-6), -1, 1)))))
    latd = np.minimum(82.5, np.degrees(np.abs(np.arcsin(np.clip(dy/R, -1, 1)))))
    m = r < R; m2 = (r >= R) & (r < R*(1+EX)); h = (r/R-1)/EX*hmax
    fade = np.clip((R*(1+EX)-r)/(R*EX*0.08), 0, 1)
    for q in range(3):
        img[..., q][m] = np.interp(latd[m], lats, disk[:, q])*np.power(np.clip(1-(r[m]/R)**2, 0, 1), 0.18)
        f = RegularGridInterpolator((lats, alts), limb[..., q]); v = f(np.stack([lat[m2], h[m2]], 1))
        img[..., q][m2] = img[..., q][m2]*(1-fade[m2]) + v*fade[m2]
    fig, ax = plt.subplots(figsize=(5, 5), dpi=200); fig.patch.set_facecolor('#05060a')
    ax.imshow(np.clip(img, 0, 1), extent=[0, W, W, 0]); ax.axis('off')
    for hh in [0, 20, 50, 100]:
        rr = R*(1+EX*hh/hmax); ax.plot([cx+rr, cx+rr], [cy, cy+14], color='white', alpha=.6, lw=.8)
        ax.text(cx+rr-20, cy+42, f'{hh} km', color='white', alpha=.8, fontsize=6)
    ax.text(cx-R*0.98+8, cy-10, 'equator', color='white', alpha=.8, fontsize=6)
    ax.text(cx-28, cy-R-14, 'pole', color='white', alpha=.8, fontsize=6)
    fig.savefig(f'{OUT}/globe_{k}.png', facecolor='#05060a', bbox_inches='tight', pad_inches=0.05); plt.close()
for k in gr.LIMB_ORDER: globe(k)


# ---------- The eclipsed Moon (eclipse_report.py) ----------
import eclipse_report
eclipse_report.figure(OUT / 'lunar_eclipse.png')
print(sorted(p.name for p in OUT.iterdir()))
