"""The airs the page blends between as time runs -> ../site/air/<id>.bin, <id>.sp.bin, air_nodes.json

The sky's precomputed parts (the day-cycle colours, the setting Sun's bands, the crepuscular
rays' tables, the light in the Earth's shadow and the tooltip's spectra) are made for a set of
airs along the timeline (airtime.py), and the page blends the two either side of the time shown.
The set is uneven:

  - The background: every epoch's year, and the years where the air's curves bend (the
    Moon-forming impact, the Great Oxidation Event, the Neoproterozoic rise, the Cambrian, the
    Ordovician dust), then more wherever blending two neighbours misses the air between them.
    Each interval is tried at its quarter points with a quick sky (PROBE_SZA x PROBE_DIR at
    mid-latitude, its multiple scattering the fast two-stream term rather than the table the
    airs are made with, which would take minutes per probe): where the blend the page would draw is off by more than TOL_LOG in log10
    luminance or TOL_XY in chromaticity anywhere, the interval is halved, down to MIN_YEARS.
  - Each event instance: airs at levels from 0 (its background) to 1 (full strength), halved
    the same way down to MIN_LEVEL; the page blends them by the event's level.
  - The polluted city, an alternative to today's air.

Each air is named by a hash of its numbers, so an air already made is not made again. A node's
file: a 4-byte little-endian length, a JSON header (shadow, shaft, sun bands, air atoms, as the
page's EP entries have them), padded to an even length, then the day-cycle codes (gen_site.py
coding). Its spectra file: the sky spectra as spectra.py codes them, in the order surface, solar
zenith angle, slot (the view directions, then the Sun), wavelength.
"""
import base64, hashlib, json, math, struct, sys, time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import airtime as at
import daycycle as dc
import lunar_eclipse as le
import shafts as sh
import skymodel as sm
from skymodel import LAM

SITE_AIR = HERE.parent / 'site' / 'air'
OUT = HERE / 'air_nodes.json'
STAMP = 'air-v1|' + dc.SKY_STAMP
PROBE_SZA = [0, 40, 70, 85, 89, 91, 94, 98]
PROBE_DIR = [(0, 0), (60, 0), (84, 0), (84, 90), (84, 180), (60, 180)]
TOL_LOG, TOL_XY = 0.02, 0.002
MIN_YEARS, MIN_LEVEL = 1000.0, 1/32


# ---------- what the page is given for each air (gen_site.py uses these too) ----------
# The air's make-up by atoms (O, N, C) and its O2 share, for the meteors' spectra (meteors.js).
def air_atoms(gas):
    n = dict(O=2*gas.get('O2', 0)+2*gas.get('CO2', 0)+gas.get('H2O', 0), N=2*gas.get('N2', 0), C=gas.get('CO2', 0)+gas.get('CH4', 0))
    tot = sum(n.values())
    out = {a: round(v/tot, 4) for a, v in n.items()}
    out['O2'] = round(gas.get('O2', 0)/sum(gas.values()), 4)
    return out


# What the page derives from the air beside its colours (day.js extK, absZenith, nightNatural;
# spectrum.js): the starlight's extinction in magnitudes per airmass at 550 nm (1.086 times the
# vertical optical depth), the soot's absorbing optical depth, O2 in PAL and the mid-latitude
# ozone column.
I550 = int(np.argmin(np.abs(LAM-550)))
def air_ext(air):
    atm = at.build(air, dc.ALB['Mid-latitude'], 'Mid-latitude')
    return dict(k=round(1.086*float(sum(c.tau[I550] for c in atm.comps)), 4), soot=round(air['soot'], 4),
                o2=round(air['gas']['O2']/at.O2_PAL, 5), o3=round(air['ozone']['Mid-latitude'], 1))


# The Sun's disk near the horizon (sunset.js, shader_sky.js sunDiskAt). The disk is drawn as
# twenty images, one per 20 nm band from 375 nm, each refracted by its own amount and dimmed by
# its own extinction, so the flash at the top of a setting Sun is whatever colour the air lets
# through last.
#   k  the refraction, as a multiple of today's: the surface refractivity of the gases at
#      today's temperature (STP values at 550 nm, (n-1)·1e6: N2 298, O2 271, Ar 281, CO2 449,
#      CH4 444, H2O 256), held to 3. Past about 4 a horizontal ray bends faster than the ground
#      curves and is trapped; the 30-bar Hadean is far past that, but its Sun is gone in the
#      Rayleigh scattering well before the horizon.
#   w  each band's light in linear sRGB, above the air.
#   t  each band's optical depth (a band mean, weighted by its light) along a straight ray at the
#      apparent altitudes SUN_APP, twenty bands per altitude, through the mid-latitude air.
SUN_APP = [0, 0.3, 0.7, 1.2, 2, 3, 5, 8, 14, 30.0]
REFRAC = {'N2': 298, 'O2': 271, 'Ar': 281, 'CO2': 449, 'CH4': 444, 'H2O': 256}
def sun_bands(gas, atm):
    k = sum(p*REFRAC[g] for g, p in gas.items())/(0.78*298+0.21*271+0.01*281)
    band = lambda a: a[:40].reshape(20, 2)     # twenty bands of two samples
    XYZ = np.array([band(atm.S0*c).sum(1) for c in (sm.XB, sm.YB, sm.ZB)])*10.0
    w = [float('%.4g' % v) for b in range(20) for v in sm.M_XYZ2RGB @ XYZ[:, b]]
    lam_w = atm.S0*(sm.XB+sm.YB+sm.ZB)
    t = []
    for a in SUN_APP:
        mu, r0 = np.sin(np.radians(a)), sm.R_E
        smax = -r0*mu+np.sqrt((r0*mu)**2+(r0+120)**2-r0**2)
        s = np.concatenate([[0], np.geomspace(1e-3, smax, 3000)])
        h = np.sqrt(r0**2+s**2+2*r0*s*mu)-r0
        tau = sum(c.tau*np.trapezoid(c.profile(h), s) for c in atm.comps)
        T = band(lam_w*np.exp(-tau)).sum(1)/band(lam_w).sum(1)
        t += [float('%.4g' % v) for v in -np.log(np.maximum(T, 1e-300))]
    return dict(k=round(min(k, 3.0), 3), w=w, t=t)


# The day-cycle colours as uint16 codes (gen_site.py describes the coding).
Y_EMIN = -40
def y_code(Y):
    if Y == 0:
        return 0
    mant, exp = ('%.2e' % Y).split('e')
    m, e = int(mant.replace('.', '')), int(exp) - 2
    assert float(f'{m}e{e}') == Y and 100 <= m <= 999 and e >= Y_EMIN, Y
    return 1 + (e - Y_EMIN) * 900 + (m - 100)


def day_codes(rec, lats, nsz, nv, na):
    """The three planes of one air's day cycle, as uint16 arrays."""
    planes = [[], [], []]
    for lat in lats:
        dome = np.array(rec[lat]['dome'], float)      # solar zenith angle, view zenith, azimuth, xyY
        sun = np.array(rec[lat]['sun'], float)
        assert dome.shape == (nsz, nv, na, 3)
        for q in range(3):
            if q < 2:
                c, cs = np.rint(dome[..., q]*1e4).astype(np.int64), np.rint(sun[:, q]*1e4).astype(np.int64)
            else:
                u, inv = np.unique(np.concatenate([dome[..., 2].ravel(), sun[:, 2]]), return_inverse=True)
                codes = np.array([y_code(float(v)) for v in u], np.int64)[inv]
                c, cs = codes[:-nsz].reshape(dome.shape[:3]), codes[-nsz:]
            c[..., 1:] = (c[..., 1:] - c[..., :-1]) & 0xFFFF
            planes[q].append(np.concatenate([c.reshape(nsz, nv*na), cs[:, None]], 1).ravel())
    planes = [np.concatenate(p) for p in planes]
    assert len(planes[0]) == len(lats) * nsz * (nv * na + 1)
    return np.concatenate(planes).astype('<u2')


# ---------- naming ----------
def _canon(x):
    if isinstance(x, dict): return {k: _canon(v) for k, v in sorted(x.items())}
    if isinstance(x, (list, tuple)): return [_canon(v) for v in x]
    return float('%.9g' % x)


def air_id(air, shadow_air=None):
    s = json.dumps([STAMP, _canon(air), _canon(shadow_air) if shadow_air else None], separators=(',', ':'))
    return hashlib.sha1(s.encode()).hexdigest()[:12]


# ---------- the quick sky that places the grid ----------
def probe(air):
    """(x, y, Y) of the sky in PROBE_DIR and the Sun, at each of PROBE_SZA."""
    atm = at.build(air, dc.ALB['Mid-latitude'], 'Mid-latitude')
    out = []
    for sz in PROBE_SZA:
        for vz, az in PROBE_DIR:
            out.append(sm.spec_to_XYZ(atm.radiance(vz, az, sz, ms='two_stream')))
        out.append(sm.spec_to_XYZ(atm.direct_sun(sz)) if sz < 90 else np.zeros(3))
    X = np.array(out)
    S = X.sum(1)
    return np.stack([np.where(S > 0, X[:, 0]/np.maximum(S, 1e-300), 0.33), np.where(S > 0, X[:, 1]/np.maximum(S, 1e-300), 0.33), X[:, 1]], 1)


def blend_xyY(a, b, w):
    """As the page blends two airs: chromaticity linearly, luminance in log (linearly where one is 0)."""
    Y = np.where((a[:, 2] > 0) & (b[:, 2] > 0),
                 np.exp(np.log(np.maximum(a[:, 2], 1e-300))*(1-w)+np.log(np.maximum(b[:, 2], 1e-300))*w),
                 a[:, 2]*(1-w)+b[:, 2]*w)
    return np.stack([a[:, 0]*(1-w)+b[:, 0]*w, a[:, 1]*(1-w)+b[:, 1]*w, Y], 1)


def miss(a, b, m, w):
    """How far the blend of a and b at w misses m, in tolerances (over 1 needs another air)."""
    g = blend_xyY(a, b, w)
    ref = max(m[:, 2].max(), 1e-300)
    ok = m[:, 2] > 1e-9*ref
    if not ok.any(): return 0.0
    dl = np.abs(np.log10(np.maximum(g[ok, 2], 1e-300))-np.log10(np.maximum(m[ok, 2], 1e-300)))/TOL_LOG
    dxy = np.hypot(g[ok, 0]-m[ok, 0], g[ok, 1]-m[ok, 1])/TOL_XY
    return float(max(dl.max(), dxy.max()))


def _probe_job(args):
    kind, x = args
    return probe(at.background(x) if kind == 'bg' else at.event_air(kind[0], kind[1], x))


def refine(pool, kind, xs, fixed_steps=(), min_dx=MIN_YEARS):
    """The points of xs and those added between them; kind 'bg' (x a year) or (event key, year)
    (x a level). Intervals in fixed_steps are left as they are."""
    P = dict(zip(xs, pool.map(_probe_job, [(kind, x) for x in xs])))
    todo = [(a, b) for a, b in zip(xs, xs[1:]) if (a, b) not in fixed_steps]
    worst = {}
    while todo:
        tests = [(a, b, q) for a, b in todo if b-a > min_dx for q in (0.25, 0.5, 0.75)]
        got = list(pool.map(_probe_job, [(kind, a+(b-a)*q) for a, b, q in tests]))
        res = {}
        for (a, b, q), m in zip(tests, got):
            res.setdefault((a, b), {})[q] = m
        todo = []
        for (a, b), r in res.items():
            worst[(a, b)] = e = max(miss(P[a], P[b], m, q) for q, m in r.items())
            if e > 1:
                c = a+(b-a)*0.5
                P[c] = r[0.5]
                todo += [(a, c), (c, b)]
    return sorted(P), worst


# ---------- the parts the page draws, for one air ----------
def moon_re_at(t):
    if t < at.T_IMPACT: return le.MOON_RE['modern']
    P = sorted((at.ANCHOR[k] if k in at.ANCHOR else at.ma(66) if k == 'cretaceous66' else None, v)
               for k, v in le.MOON_RE.items() if k in at.ANCHOR or k == 'cretaceous66')
    return at._along(P, t)


def node_job(args):
    nid, air, shadow_air, t = args
    lats = list(dc.ALB)
    rec, spec = {}, []
    for lname, alb in dc.ALB.items():
        atm = at.build(air, alb, lname)
        if lname == 'Mid-latitude':
            atm_mid = atm      # its multiple scattering serves the shafts too
        dome, sun = [], []
        for sz in dc.SZAS:
            g, s, S = dc.sample_dome(atm, sz)
            dome.append(g); sun.append(s); spec.append(S)
        rec[lname] = dict(dome=dome, sun=sun)
    atm = at.build(air, 0.15)
    share = np.stack([sh.shares(atm, e, atm_mid) for e in sh.SUN_EL])
    shaft = dict(comps=sh.comps(atm), share=base64.b64encode(bytes(np.rint(share*255).astype(np.uint8).ravel())).decode())
    sa = shadow_air or air
    shadow = le.shadow_rec(le.shadow_air(at.build(sa, 0.15), sa, moon_re_at(t)))
    shadow['sp'] = shadow['sp'][::4]
    head = dict(shadow=shadow, shaft=shaft, sun=sun_bands(air['gas'], atm), air=air_atoms(air['gas']), ext=air_ext(air))
    hb = json.dumps(head, separators=(',', ':')).encode()
    hb += b' '*((4+len(hb)) % 2)
    codes = day_codes(rec, lats, len(dc.SZAS), len(dc.VZ), len(dc.AZ))
    (SITE_AIR / f'{nid}.bin').write_bytes(struct.pack('<I', len(hb))+hb+codes.tobytes())
    import spectra as spx
    (SITE_AIR / f'{nid}.sp.bin').write_bytes(b''.join(spx.encode(S) for block in spec for S in block))
    return nid


def add_ext(nid, air):
    """A node file made before its header had ext gets it, the rest as it was."""
    p = SITE_AIR / f'{nid}.bin'
    if not p.exists(): return
    b = p.read_bytes(); n = struct.unpack('<I', b[:4])[0]
    head = json.loads(b[4:4+n])
    if 'ext' in head: return
    head['ext'] = air_ext(air)
    hb = json.dumps(head, separators=(',', ':')).encode()
    hb += b' '*((4+len(hb)) % 2)
    p.write_bytes(struct.pack('<I', len(hb))+hb+b[4+n:])


def bg_fixed():
    T = set(at.ANCHOR.values()) | {at.T_IMPACT-1, at.T_IMPACT, at.GOE_START, at.GOE_END, at.NOE_START, at.CAMBRIAN}
    o = at.ORD_DUST
    T |= {o['start'], o['start']+o['rise'], o['start']+o['rise']+o['hold'], o['start']+o['rise']+o['hold']+5*o['efold']}
    T |= {t for _, t in at.EVENTS}
    return sorted(T)


def main():
    t0 = time.time()
    SITE_AIR.mkdir(parents=True, exist_ok=True)
    nodes = {}                                  # id -> (air, shadow air, year)
    def add(air, t, shadow_air=None):
        nid = air_id(air, shadow_air)
        nodes.setdefault(nid, (air, shadow_air, t))
        return nid
    with sm.worker_pool() as pool:
        xs = bg_fixed()
        bg, worst = refine(pool, 'bg', xs, fixed_steps={(at.T_IMPACT-1, at.T_IMPACT)})
        print(f'background: {len(xs)} fixed, {len(bg)} in all ({time.time()-t0:.0f}s)', flush=True)
        BG = [[t, add(at.background(t), t)] for t in bg]
        EV = []
        for key, t in at.EVENTS:
            lv, _ = refine(pool, (key, t), [0.0, 1.0], min_dx=MIN_LEVEL)
            local = key in at.EV_LOCAL
            EV.append(dict(key=key, at=t, lv=[[l, add(at.event_air(key, t, l), t, at.background(t) if local else None)] for l in lv]))
            print(f'{key} at {(2000-t)/1e6:.3f} Ma: levels {lv}', flush=True)
        SC = {'modernpoll': add(at.scenario_air('modernpoll'), at.MODERN_YEAR)}
        if '--plan' in sys.argv:
            print(f'{len(nodes)} airs ({time.time()-t0:.0f}s)')
            for (a, b), e in sorted(worst.items()):
                if b in bg and a in bg and bg.index(b) == bg.index(a)+1:
                    print(f'  {(2000-a)/1e6:12.6f} -> {(2000-b)/1e6:12.6f} Ma  miss {e:.2f}')
            return
        for nid, (a, s, t) in nodes.items():
            add_ext(nid, a)
        todo = [(nid, a, s, t) for nid, (a, s, t) in nodes.items()
                if not (SITE_AIR / f'{nid}.bin').exists() or not (SITE_AIR / f'{nid}.sp.bin').exists()]
        print(f'{len(nodes)} airs, {len(todo)} to make', flush=True)
        for i, nid in enumerate(pool.map(node_job, todo)):
            print(f'  {i+1}/{len(todo)} {nid} ({time.time()-t0:.0f}s)', flush=True)
    # Files of airs no longer on the grid go.
    keep = {f'{nid}.bin' for nid in nodes} | {f'{nid}.sp.bin' for nid in nodes}
    for f in SITE_AIR.glob('*.bin'):
        if f.name not in keep: f.unlink()
    OUT.write_text(json.dumps(dict(stamp=STAMP, bg=BG, ev=EV, sc=SC, lats=list(dc.ALB),
                                   worst={f'{a}|{b}': round(e, 2) for (a, b), e in worst.items()}),
                              separators=(',', ':')), encoding='utf-8')
    print(f'wrote {OUT} ({time.time()-t0:.0f}s)')


if __name__ == '__main__':
    main()
