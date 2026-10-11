"""The light inside the Earth's shadow at the Moon, per epoch -> eclipse_grid.json.

In a total lunar eclipse the Moon is lit only by sunlight that has crossed the Earth's limb:
every sunrise and sunset on Earth at once, bent into the shadow by refraction. This follows
Link's method (Link 1956, 1969): rays from the Sun are traced through the epoch's air at
each tangent height, bending by the refractivity gradient and dimmed by every component of
the model atmosphere (skymodel.py) along their whole path. Seen from a point on the Moon a
lateral distance rho from the shadow's axis, the Earth's limb at position angle psi and
height b shows the Sun's limb-darkened disk at the offset the ray's bend gives, so the
irradiance there is the integral of that radiance times the transmission over the ring's
solid angle (b db dpsi / D^2). The direct sunlight past the top of the air gives the
penumbra. The result is the spectrum of the Moon's illumination over the uneclipsed one.

The ray trace keeps the refraction exact, which the 30-bar Hadean needs: its air is about
46 times today's refractivity, so below about 19 km a horizontal ray bends faster than the
ground curves and is trapped (ducting), and only the upper air reaches the shadow.

Left out: the dispersion of refraction (blue bends about 1.5% more than red over the visible,
a shift of 5% of the Sun's radius), the Earth's oblateness, and the airglow. Clouds cut the
lowest rays with today's cover in every epoch. The ozone hole and the city haze are local,
and the ring of sunsets is global, so those epochs take today's clean air for the shadow.
"""
import json
from pathlib import Path

import numpy as np

import epochs
from skymodel import LAM, R_E, spec_to_XYZ, M_XYZ2RGB

HERE = Path(__file__).resolve().parent

# The page's epochs (gen_site.py order) and the air each one's shadow is computed with.
ORDER = ['protoearth455', 'hadean45', 'hadean40', 'archean38', 'archean27thin', 'archean27', 'archean27vthick', 'proterozoic22',
         'snowball07', 'ordovician466', 'carbon30', 'kpg66', 'zetaoph', 'geminga', 'volcanic', 'ozonehole',
         'modern', 'modernpoll', 'y2100']
SHADOW_AIR = {k: k for k in epochs.BY_KEY}
SHADOW_AIR.update(zetaoph='modern', geminga='modern', y2100='modern', ozonehole='modern', modernpoll='modern')
# Mean Earth-Moon distance in Earth radii, as moon.js MOON_RE.
MOON_RE = dict(modern=60.14, kpg66=59.93, carbon30=58.56, ordovician466=58.21, snowball07=57.71,
               proterozoic22=50.98, archean27thin=47.60, archean27=47.60, archean27vthick=47.60,
               archean38=40.4, hadean40=39.8, hadean45=8.0)
SUN_RADIUS_DEG = 0.2666
AU_KM = 1.495979e8
# Surface refractivity (n-1)·1e6 at STP and 550 nm per bar of each gas (gen_site.py REFRAC),
# taken at 15 °C: today's air comes to 277e-6. Its scale height is the Rayleigh profile's (8 km).
REFRAC = {'N2': 298, 'O2': 271, 'Ar': 281, 'CO2': 449, 'CH4': 444, 'H2O': 256}
T_FAC = 273.15/288.15
H_REF = 8.0
H_TOP = 120.0
# Cloud tops: the share of the Earth's terminator whose clouds reach above h (km), from about
# 60% below 4 km down to none at 12 km (ISCCP cloud-top statistics, rounded).
def cloud_block(h):
    return 0.6*np.clip((12.0-h)/8.0, 0.0, 1.0)

# Sun limb darkening, mu^alpha (Hestroffer & Magnan 1998; moon.js sunLimbAlpha).
ALPHA = -0.023+292.0/LAM
A_NODES = np.linspace(ALPHA.min(), ALPHA.max(), 9)


def refractivity(e):
    return sum(p*REFRAC[g] for g, p in e['gas'].items())*1e-6*T_FAC


def sun_radius(e):
    T, L = e['sun']
    return np.radians(SUN_RADIUS_DEG)*L**0.5/(T/5772.0)**2


def trace(atm, N0, b):
    """Trace rays entering parallel at impact parameters b (km). Returns the deflection toward
    the axis (radians), each component's column along the path, and the lowest height reached;
    rays that strike the ground or are trapped get NaN deflection."""
    comps = atm.comps
    Rt = R_E+H_TOP
    n = len(b)
    x = -np.sqrt(Rt**2-b**2); y = b.astype(float).copy()
    tx = np.ones(n); ty = np.zeros(n)
    cols = np.zeros((len(comps), n)); hmin = np.full(n, H_TOP)
    alive = np.ones(n, bool); done = np.zeros(n, bool)
    ds = 0.5

    def bend(x, y, tx, ty):
        r = np.hypot(x, y); h = r-R_E
        g = -(N0/H_REF)*np.exp(-h/H_REF)          # dn/dr
        nn = 1.0+N0*np.exp(-h/H_REF)
        gx, gy = g*x/r, g*y/r
        dot = tx*gx+ty*gy
        return (gx-dot*tx)/nn, (gy-dot*ty)/nn

    for step in range(14000):
        act = alive & ~done
        if not act.any():
            break
        xa, ya, txa, tya = x[act], y[act], tx[act], ty[act]
        # Midpoint step for the direction, the position with the mean direction.
        ax, ay = bend(xa, ya, txa, tya)
        xm, ym = xa+0.5*ds*txa, ya+0.5*ds*tya
        tmx, tmy = txa+0.5*ds*ax, tya+0.5*ds*ay
        nm = np.hypot(tmx, tmy); tmx /= nm; tmy /= nm
        ax, ay = bend(xm, ym, tmx, tmy)
        txn, tyn = txa+ds*ax, tya+ds*ay
        nn = np.hypot(txn, tyn); txn /= nn; tyn /= nn
        hm = np.hypot(xm, ym)-R_E
        for i, c in enumerate(comps):
            cols[i, act] += c.profile(np.maximum(hm, 0.0).copy())*ds
        x[act] = xa+ds*0.5*(txa+txn); y[act] = ya+ds*0.5*(tya+tyn)
        tx[act] = txn; ty[act] = tyn
        r = np.hypot(x[act], y[act])
        hmin[act] = np.minimum(hmin[act], r-R_E)
        idx = np.flatnonzero(act)
        ground = r < R_E
        out = (r > Rt) & ((x[act]*tx[act]+y[act]*ty[act]) > 0)
        alive[idx[ground]] = False
        done[idx[out]] = True
    dev = np.where(done, -np.arctan2(ty, tx), np.nan)
    return dev, cols, hmin


def shadow(key):
    e = epochs.BY_KEY[SHADOW_AIR[key]]
    atm = epochs.build(e, 0.15)
    D = MOON_RE.get(key, MOON_RE['modern'])*R_E
    a_s = sun_radius(e)
    N0 = refractivity(e)
    # Impact parameters: fine through the lower air, where the bend changes fastest.
    hb = np.concatenate([np.arange(0, 40, 0.02), np.arange(40, H_TOP, 0.1)])
    b = R_E+hb
    dev, cols, hmin = trace(atm, N0, b)
    ok = np.isfinite(dev)
    tau = sum(c.tau[:, None]*cols[i][None, :] for i, c in enumerate(atm.comps))   # (lam, b)
    T = np.exp(-tau)*(1.0-cloud_block(hmin))[None, :]
    T[:, ~ok] = 0.0
    dev = np.where(ok, dev, 1.0)
    db = np.gradient(hb)
    w = b*db/D**2                                   # ring solid angle per radian of psi
    u = b/D-dev                                     # where the Sun appears, signed
    # Lateral distance from the axis at the Moon, in Earth radii: to past the penumbra.
    rho_max = (R_E+H_TOP)/R_E+1.15*D*a_s/R_E
    rho = np.linspace(0, rho_max, 80)
    psi = np.linspace(0, np.pi, 721)
    cps = np.cos(psi); wpsi = np.full(len(psi), psi[1]-psi[0]); wpsi[[0, -1]] *= 0.5
    # Sun disk grid for the direct light past the top of the air.
    sr = (np.arange(240)+0.5)/240*a_s; sp = (np.arange(360)+0.5)/360*2*np.pi
    SR, SP = np.meshgrid(sr, sp, indexing='ij')
    smu = np.sqrt(np.maximum(1-(SR/a_s)**2, 0)); sw = SR*(sr[1]-sr[0])*(sp[1]-sp[0])
    norm = np.pi*a_s**2*2/(A_NODES+2)              # the whole limb-darkened disk, per node
    ratio = np.zeros((len(rho), len(LAM)))
    # Each wavelength's alpha between two nodes, linearly.
    j = np.clip(np.searchsorted(A_NODES, ALPHA)-1, 0, len(A_NODES)-2)
    f = (ALPHA-A_NODES[j])/(A_NODES[j+1]-A_NODES[j])
    for i, r in enumerate(rho):
        rp = r*R_E/D
        g2 = rp**2+u[:, None]**2-2*rp*u[:, None]*cps[None, :]
        inside = g2 < a_s**2
        mu = np.sqrt(np.maximum(1-g2/a_s**2, 0))
        G = np.array([2*((mu**a)*inside)@wpsi for a in A_NODES])        # (node, b)
        ring = (T*w[None, :])@G.T                                         # (lam, node)
        ring /= norm[None, :]
        # Direct sunlight: the part of the disk seen past the top of the air.
        gx = SR*np.cos(SP); gy = SR*np.sin(SP)
        vis = np.hypot(rp-gx, gy) > (R_E+H_TOP)/D
        direct = np.array([np.sum(sw*smu**a*vis) for a in A_NODES])/norm
        node = ring+direct[None, :]
        k = np.arange(len(LAM))
        ratio[i] = node[k, j]*(1-f)+node[k, j+1]*f
    return dict(D=D/R_E, a_s=a_s, rho=rho, ratio=ratio, S0=atm.S0, N0=N0, dev=dev, hb=hb, ok=ok)


def lin_rgb(S):
    return M_XYZ2RGB@spec_to_XYZ(S)


def summary(key, s):
    """The Moon's brightness over the full Moon's at the middle of a central eclipse, its mean
    over the disk, and in magnitudes."""
    rho, ratio, S0 = s['rho'], s['ratio'], s['S0']
    Yfull = spec_to_XYZ(S0)[1]
    Y = np.array([spec_to_XYZ(S0*r)[1] for r in ratio])/Yfull
    rm = 1737.4/R_E
    # Disk mean with the Moon centred on the axis.
    rr = np.linspace(0, rm, 200); Ym = np.trapezoid(np.interp(rr, rho, Y)*rr, rr)/np.trapezoid(rr, rr)
    return Y, Ym


def main():
    out = {}
    cache = {}
    for key in ORDER:
        air = SHADOW_AIR[key]
        D = MOON_RE.get(key, MOON_RE['modern'])
        tag = (air, D)
        if tag in cache:
            out[key] = cache[tag]
            continue
        s = shadow(key)
        Y, Ym = summary(key, s)
        rgbS = lin_rgb(s['S0'])
        rgb = np.array([lin_rgb(s['S0']*r)/rgbS for r in s['ratio']])
        rgb = np.clip(rgb, 0, None)
        trapped = s['hb'][~s['ok']].max() if (~s['ok']).any() else 0
        print('%-16s D %.2f  N0 %.2e  no rays below %5.1f km  centre Y %.2e  central-eclipse disk %.2e (%+.1f mag)' %
              (key, s['D'], s['N0'], trapped, Y[0], Ym, -2.5*np.log10(Ym)))
        rec = dict(D=round(s['D'], 3), rhoMax=round(float(s['rho'][-1]), 5),
                   Y=[float('%.3g' % v) for v in Y],
                   rgb=[[float('%.3g' % v) for v in c] for c in rgb],
                   sp=[[round(float(np.log10(max(v, 1e-12))), 2) for v in r] for r in s['ratio']])
        cache[tag] = out[key] = rec
    # Epochs that share another's shadow point to it, as the page's limb data does.
    first = {}
    final = {}
    for key in ORDER:
        rid = id(out[key])
        if rid in first:
            final[key] = first[rid]
        else:
            first[rid] = key; final[key] = out[key]
    (HERE / 'eclipse_grid.json').write_text(json.dumps(dict(lam=LAM.tolist(), epochs=final), separators=(',', ':')))


if __name__ == '__main__':
    main()
