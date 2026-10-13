"""The air through time: the atmosphere at any year, for the page's sky between the epochs.

The epochs (epochs.py) are the fixed points. At each one's year the air here is exactly that
epoch's; between them each part of the air runs along a curve suited to it:

  - The gases, log-linear in time from one fixed point to the next (CO2 drawdown and the like
    run roughly exponentially), with the steps the record shows added as fixed points of their
    own (LIT_PINS): the Great Oxidation Event's rise of O2 and fall of CH4 between 2.43 Ga
    (Gumsley et al. 2017) and 2.22 Ga (Poulton et al. 2021), O2 held near 1% of today's through
    the mid-Proterozoic until the Neoproterozoic rise from ~800 Ma (Lyons et al. 2014), and the
    Cambrian's 5-10% O2 (Mills et al. 2023).
  - Ozone, from the O2 by the columns Cooke et al. 2022 simulate for each O2 level, scaled at
    each fixed point to that epoch's own columns (by latitude) and the scale run linearly
    between them.
  - The Sun, as the page draws it (epoch_time.js sunLumAt, sunTeffAt): 1/L and Teff linear in
    time between the main epochs that have their own air.
  - The tropospheric aerosol's optical depth log-linear, its other properties linear.
  - The Ordovician's meteoric dust with the rise and decay of the break-up's dust
    (debris.js ORD_DUST).
  - The Moon-forming impact, about 4.51 Ga, is a step: the proto-Earth's air before it, the
    early Hadean's from it on.

Events (epoch_time.js EPOCH_EVENTS) are set on top: an event's own parts of the air (EV_FIELDS)
go from the background's to the event epoch's as the event comes on (its level, 0 to 1), the
rest stays the background's at the event's time.

The air is a dict: gas (bar, by gas), ozone and ozone_lat (DU and the layer's latitude, by
place), trop_o3 (the column's tropospheric share), aer (optical depth at 550 nm, Angstrom
exponent, single-scattering albedo, asymmetry), sulf, haze, soot, dust (optical depths), ice
(the share of the ground under the Snowball's ice, albedo 0.75) and sun (Teff, L).
"""
import math

import epochs as _ep
from skymodel import make_atm, LAT_DEG

MYR = 1e6


def ma(x):
    """The year x million years before 2000, as the page numbers years (epoch_time.js parseTime)."""
    return round(2000 - x*MYR)


MODERN_YEAR = 2026
# Where each epoch with its own air sits on the timeline (gen_site.py ages, epoch_time.js
# epochAnchor; gen_site checks that they agree).
ANCHOR = {'protoearth455': ma(4550), 'hadean45': ma(4500), 'hadean40': ma(4000), 'archean38': ma(3800),
          'archean27clear': ma(2700), 'archean27thin': ma(2580), 'archean27': ma(2520), 'proterozoic22': ma(2200),
          'snowball07': ma(700), 'cryogenian65': ma(650), 'ordovician466': ma(466), 'carbon30': ma(300),
          'kpg66': ma(66), 'volcanic': 1816, 'ozonehole': 1990, 'modern': MODERN_YEAR}
# Every epoch's year on the timeline, those that keep another's air too (epoch_time.js epochAnchor),
# and the report's very thick haze at its episode's.
YEAR = {**ANCHOR, 'archean27vthick': ANCHOR['archean27'], 'cretaceous66': ma(66.1), 'zetaoph': ma(1.78),
        'geminga': ma(0.342), 'y1900': 1900, 'modernpoll': MODERN_YEAR, 'y2100': 2100}
# The main epochs with their own air, in time order; the rest of ANCHOR are events.
MAIN = ['protoearth455', 'hadean45', 'hadean40', 'archean38', 'archean27clear', 'proterozoic22', 'cryogenian65',
        'ordovician466', 'carbon30', 'modern']
T_IMPACT = ma(4510)
# The parts of the air each event sets; the rest is the background's.
EV_FIELDS = {'archean27thin': ('gas.CH4', 'haze'), 'archean27': ('gas.CH4', 'haze'),
             'snowball07': ('ice', 'aer', 'dust'), 'kpg66': ('soot', 'sulf', 'aer'), 'volcanic': ('sulf',),
             'ozonehole': ('ozone', 'ozone_lat', 'trop_o3')}
# Events whose air is local (the ozone hole over Antarctica): the ring of sunsets that lights the
# eclipsed Moon is the background's.
EV_LOCAL = {'ozonehole'}
# The event instances, as epoch_time.js EPOCH_EVENTS has them: the year whose background each is
# drawn over (an epoch's own instance at its anchor, so that at full strength it is that epoch).
EVENTS = [('archean27thin', ma(2630)), ('archean27thin', ANCHOR['archean27thin']), ('archean27', ANCHOR['archean27']),
          ('snowball07', ANCHOR['snowball07']), ('snowball07', ma(637.4)),
          ('kpg66', ANCHOR['kpg66']), ('volcanic', ANCHOR['volcanic']), ('ozonehole', ANCHOR['ozonehole'])]
# The years where the background's curves bend (the GOE, the Neoproterozoic rise, the Cambrian),
# with the parts they set.
GOE_START, GOE_END, NOE_START, CAMBRIAN = ma(2430), ma(2220), ma(800), ma(520)

GASES = ('N2', 'O2', 'Ar', 'CO2', 'CH4', 'H2O')
# Below these (bar) a gas is taken as absent: the floor of its log-linear curves.
GAS_FLOOR = {'N2': 1e-3, 'O2': 2.1e-6, 'Ar': 1e-4, 'CO2': 1e-5, 'CH4': 1e-6, 'H2O': 1e-4}
PLACES = ('Equator', 'Mid-latitude', 'Polar summer')
ICE_ALBEDO = 0.75
O2_PAL = 0.21
# Cooke et al. 2022 (their simulations at fixed O2): global-mean O3 column (DU) by O2 (PAL).
COOKE = [(0.001, 18.0), (0.005, 45.0), (0.01, 66.0), (0.05, 136.0), (0.1, 169.0), (1.0, 279.0)]


def place_of(place):
    return place if place in PLACES else 'Polar summer' if place == 'Polar' else 'Mid-latitude'


def normalize(e):
    """An epochs.py entry as an air dict."""
    oz = e['ozone']
    ozone = {p: float(oz[p]) if isinstance(oz, dict) and p in oz else float(oz['Mid-latitude']) if isinstance(oz, dict) else float(oz)
             for p in PLACES}
    pin = e.get('ozone_lat')
    return dict(gas={g: float(e['gas'].get(g, 0.0)) for g in GASES}, ozone=ozone,
                ozone_lat={p: float(pin) if pin is not None else LAT_DEG[p] for p in PLACES},
                trop_o3=float(e.get('trop_o3', 0.0)), aer=[float(v) for v in e['aer']],
                sulf=float(e.get('sulf', 0.0)), haze=float(e.get('haze', 0.0)), soot=float(e.get('soot', 0.0)),
                dust=float(e.get('dust', 0.0)), ice=1.0 if e.get('albedo') == ICE_ALBEDO else 0.0,
                sun=[float(v) for v in e['sun']])


def build(air, albedo, place='Mid-latitude'):
    """The model atmosphere for air at a place (epochs.build for an air dict)."""
    p = place_of(place)
    gas = {g: v for g, v in air['gas'].items() if v > 0}
    T, L = air['sun']
    return make_atm(gas, ozone_DU=air['ozone'][p], trop_aer=tuple(air['aer']), strat_sulf=air['sulf'],
                    haze550=air['haze'], soot=air['soot'], dust=air['dust'],
                    albedo=albedo*(1-air['ice'])+ICE_ALBEDO*air['ice'], sun_T=T, sun_L=L,
                    ozone_lat=air['ozone_lat'][p], ozone_trop=air['trop_o3'])


# ---------- the Sun, as epoch_time.js draws it ----------
def _sun_points():
    return [(ANCHOR[k], _ep.BY_KEY[k]['sun']) for k in MAIN]


def sun_at(A):
    P = _sun_points()
    if A <= P[0][0]: return list(P[0][1])
    if A >= P[-1][0]: return list(P[-1][1])
    for (a, (Ta, La)), (b, (Tb, Lb)) in zip(P, P[1:]):
        if A < b:
            u = (A-a)/(b-a)
            if u == 0: return [Ta, La]
            return [Ta*(1-u)+Tb*u, 1/((1/La)*(1-u)+(1/Lb)*u)]


# ---------- the background ----------
def _get(air, f):
    if f.startswith('gas.'): return air['gas'][f[4:]]
    return air[f]


def _fields(air):
    """The background's scalar parts, as (name, value) for pinning."""
    out = {f'gas.{g}': v for g, v in air['gas'].items()}
    out.update({f'ozone.{p}': v for p, v in air['ozone'].items()})
    out.update({f'ozone_lat.{p}': v for p, v in air['ozone_lat'].items()})
    out.update({f'aer.{i}': v for i, v in enumerate(air['aer'])})
    out.update(trop_o3=air['trop_o3'], sulf=air['sulf'], haze=air['haze'], soot=air['soot'], ice=air['ice'])
    return out


def _controls(event, name):
    return any(name == f or name.startswith(f + '.') for f in EV_FIELDS[event])


def _pins():
    """Per part: the (year, value) points it passes through, in time order."""
    P = {}
    def pin(t, vals):
        for k, v in vals.items(): P.setdefault(k, {})[t] = v
    for k, t in ANCHOR.items():
        f = _fields(normalize(_ep.BY_KEY[k]))
        if k in EV_FIELDS: f = {n: v for n, v in f.items() if not _controls(k, n)}
        pin(t, f)
    # The early Hadean's air from the impact on.
    pin(T_IMPACT, _fields(normalize(_ep.BY_KEY['hadean45'])))
    clear, prot = (normalize(_ep.BY_KEY[k])['gas'] for k in ('archean27clear', 'proterozoic22'))
    pin(GOE_START, {f'gas.{g}': clear[g] for g in ('O2', 'CH4', 'CO2')})
    pin(GOE_END, {f'gas.{g}': prot[g] for g in ('O2', 'CH4', 'CO2')})
    pin(NOE_START, {'gas.O2': prot['O2']})
    pin(CAMBRIAN, {'gas.O2': 0.075})
    return {k: sorted(v.items()) for k, v in P.items()}


_PINS = None
def pins():
    global _PINS
    if _PINS is None: _PINS = _pins()
    return _PINS


def _along(points, A, log=False, floor=0.0):
    """The value at year A along points [(year, value)], linear (or log-linear above floor)
    between them and held past either end."""
    if A <= points[0][0]: return points[0][1]
    if A >= points[-1][0]: return points[-1][1]
    for (a, va), (b, vb) in zip(points, points[1:]):
        if A < b:
            u = (A-a)/(b-a)
            if u == 0 or va == vb: return va
            if not log: return va*(1-u)+vb*u
            v = math.exp(math.log(max(va, floor))*(1-u)+math.log(max(vb, floor))*u)
            return 0.0 if v <= floor*1.0001 else v


def cooke(pal):
    """Cooke et al. 2022's global-mean column (DU) at O2 level pal (PAL), log-linear between
    their simulations, linear to 0 below the lowest, held above today's."""
    if pal <= 0: return 0.0
    if pal <= COOKE[0][0]: return COOKE[0][1]*pal/COOKE[0][0]
    if pal >= COOKE[-1][0]: return COOKE[-1][1]
    for (a, va), (b, vb) in zip(COOKE, COOKE[1:]):
        if pal <= b:
            u = math.log(pal/a)/math.log(b/a)
            return va*(1-u)+vb*u


def _ozone_scale_points(place):
    """At each fixed point with O2 and its own ozone: its column over Cooke's for its O2."""
    O2, OZ = dict(pins()['gas.O2']), dict(pins()[f'ozone.{place}'])
    return [(t, OZ[t]/cooke(O2[t]/O2_PAL)) for t in sorted(OZ) if t in O2 and O2[t] > 0 and OZ[t] > 0]


_OZS = {}
def ozone_at(place, o2, A):
    if place not in _OZS: _OZS[place] = _ozone_scale_points(place)
    return cooke(o2/O2_PAL)*_along(_OZS[place], A)


ORD_DUST = dict(start=ANCHOR['ordovician466']-0.1*MYR, rise=0.05*MYR, hold=2*MYR, efold=1*MYR)


def event_level(ev, A):
    """epoch_time.js eventLevel."""
    t = A-ev['start']
    if t < 0: return 0.0
    if t < ev['rise']:
        x = t/ev['rise']; return x*x*(3-2*x)
    t -= ev['rise']+ev['hold']
    if t < 0: return 1.0
    if 'efold' in ev: return math.exp(-t/ev['efold'])
    x = min(1.0, t/ev['fall']); return 1-x*x*(3-2*x)


def background(A):
    """The air at year A without its events."""
    if A < T_IMPACT:
        air = normalize(_ep.BY_KEY['protoearth455'])
        air['sun'] = sun_at(A)
        return air
    P = pins()
    if A in ANCHOR.values():
        # A main epoch's own year: its air, exactly.
        for k in MAIN:
            if ANCHOR[k] == A:
                air = normalize(_ep.BY_KEY[k])
                air['dust'] = _ord_dust(A) if k == 'ordovician466' else air['dust']
                return air
    gas = {g: _along(P[f'gas.{g}'], A, log=True, floor=GAS_FLOOR[g]) for g in GASES}
    ozone = {p: ozone_at(p, gas['O2'], A) for p in PLACES}
    aer = [_along(P['aer.0'], A, log=True, floor=1e-4)] + [_along(P[f'aer.{i}'], A) for i in (1, 2, 3)]
    return dict(gas=gas, ozone=ozone, ozone_lat={p: _along(P[f'ozone_lat.{p}'], A) for p in PLACES},
                trop_o3=_along(P['trop_o3'], A), aer=aer,
                sulf=_along(P['sulf'], A), haze=_along(P['haze'], A), soot=_along(P['soot'], A),
                dust=_ord_dust(A), ice=_along(P['ice'], A), sun=sun_at(A))


def _ord_dust(A):
    l = event_level(ORD_DUST, A)
    return _ep.BY_KEY['ordovician466']['dust']*l if l > 1e-3 else 0.0


def _lerp(a, b, l):
    return a*(1-l)+b*l


def event_air(key, at, level):
    """The air of event key's instance over the background of year at, at level 0 to 1."""
    bg = background(at)
    if level <= 0: return bg
    ev = normalize(_ep.BY_KEY[key])
    air = {k: (dict(v) if isinstance(v, dict) else list(v) if isinstance(v, list) else v) for k, v in bg.items()}
    for f in EV_FIELDS[key]:
        if f.startswith('gas.'):
            g = f[4:]; air['gas'][g] = _lerp(bg['gas'][g], ev['gas'][g], level)
        elif isinstance(bg[f], dict):
            air[f] = {p: _lerp(bg[f][p], ev[f][p], level) for p in bg[f]}
        elif isinstance(bg[f], list):
            air[f] = [_lerp(a, b, level) for a, b in zip(bg[f], ev[f])]
        else:
            air[f] = _lerp(bg[f], ev[f], level)
    return air


def scenario_air(key):
    """An alternative to today's air (the polluted city), under today's Sun."""
    air = normalize(_ep.BY_KEY[key])
    air['sun'] = sun_at(MODERN_YEAR)
    return air


def check_anchors():
    """Each epoch with its own air, at its year: the main ones exactly, the events at full strength
    with the background's Sun."""
    bad = []
    for k in MAIN:
        a, b = background(ANCHOR[k]), normalize(_ep.BY_KEY[k])
        if a != b: bad.append((k, a, b))
    for k, at in EVENTS:
        if at != ANCHOR[k]: continue
        a, b = event_air(k, at, 1.0), normalize(_ep.BY_KEY[k])
        a = dict(a, sun=b['sun'])
        if a != b: bad.append((k, a, b))
    return bad


if __name__ == '__main__':
    bad = check_anchors()
    for k, a, b in bad:
        print('MISMATCH', k)
        for f in a:
            if a[f] != b[f]: print('  ', f, a[f], b[f])
    print('anchors ok' if not bad else f'{len(bad)} mismatches')
    for t in [ma(4520), ma(4300), ma(3000), ma(2450), ma(2300), ma(1500), ma(760), ma(600), ma(520), ma(400), ma(150), 1900]:
        a = background(t)
        print(f"{(2000-t)/MYR:8.1f} Ma  N2 {a['gas']['N2']:.3f} O2 {a['gas']['O2']:.2e} CO2 {a['gas']['CO2']:.2e} CH4 {a['gas']['CH4']:.1e}"
              f"  O3 {a['ozone']['Mid-latitude']:5.1f}  aer {a['aer'][0]:.3f}  sun {a['sun'][0]:.0f} {a['sun'][1]:.3f}")
