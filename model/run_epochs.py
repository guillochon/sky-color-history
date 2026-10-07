import json
from pathlib import Path

import numpy as np

from skymodel import xy, hexcol, XYZ_to_srgb, cct_mccamy, spec_to_XYZ
from epochs import EPOCHS, build

HERE = Path(__file__).resolve().parent

LATS = [('Equator', 15, 0.08), ('Mid-latitude', 45, 0.18), ('Polar summer', 75, 0.70)]

def col(XYZ, Yref):
    x, y = xy(XYZ)
    return dict(hex=(hexcol(XYZ_to_srgb(XYZ, 0.80/Yref)) if Yref>1e-9 else "#000000"), Y=float(XYZ[1]), x=round(float(x),4), y=round(float(y),4),
                cct=float(np.clip(cct_mccamy(x,y), 800, 60000)))

def main():
    out = []
    for e in EPOCHS:
        rec = dict(key=e['key'], name=e['name'], sub=e['sub'], note=e.get('note',''), lat={}, sunset={})
        for lname, sz, alb in LATS:
            atm = build(e, alb, lname)
            z = atm.sky_color(0, 0, sz)
            h = atm.sky_color(88, 90, sz)
            hs = atm.sky_color(88, 0, sz)
            ha = atm.sky_color(88, 180, sz)
            sun = spec_to_XYZ(atm.direct_sun(sz))
            # per-scene exposure: normalize to the zenith of modern clean same latitude later; here store absolute Y
            rec['lat'][lname] = dict(zenith=col(z, z[1]), horizon=col(h, h[1]), horizon_solar=col(hs, hs[1]),
                                     horizon_anti=col(ha, ha[1]), sun=col(sun, sun[1]),
                                     sunY=float(sun[1]), zenY=float(z[1]), horY=float(h[1]), sz=sz)
        atm = build(e, 0.18)
        sz = 90
        zen = atm.sky_color(0, 0, sz); solh = atm.sky_color(88, 0, sz); up15 = atm.sky_color(75, 0, sz)
        anti = atm.sky_color(88, 180, sz); anti15 = atm.sky_color(75, 180, sz)
        sun = spec_to_XYZ(atm.direct_sun(89.5))
        rec['sunset'] = dict(zenith=col(zen, zen[1]), solar_horizon=col(solh, solh[1]), above_sun=col(up15, up15[1]),
                             anti_horizon=col(anti, anti[1]), anti_15=col(anti15, anti15[1]), sun=col(sun, sun[1]),
                             sunY=float(sun[1]), zenY=float(zen[1]))
        sz=94
        zen = atm.sky_color(0,0,sz); solh=atm.sky_color(88,0,sz); up15=atm.sky_color(75,0,sz); up30=atm.sky_color(60,0,sz)
        anti=atm.sky_color(88,180,sz); anti15=atm.sky_color(75,180,sz)
        rec['twilight']=dict(zenith=col(zen,zen[1]), solar_horizon=col(solh,solh[1]), above_sun=col(up15,up15[1]), above_sun30=col(up30,up30[1]),
                             anti_horizon=col(anti,anti[1]), anti_15=col(anti15,anti15[1]), zenY=float(zen[1]), solY=float(solh[1]))
        t=rec['twilight']; print(f"  twilight(-4deg): zen {t['zenith']['hex']} sol-hor {t['solar_horizon']['hex']} +15 {t['above_sun']['hex']} +30 {t['above_sun30']['hex']} anti {t['anti_horizon']['hex']}")
        out.append(rec)
        print(e['name'])
        for lname in rec['lat']:
            d = rec['lat'][lname]
            print(f"  {lname:13s} zenith {d['zenith']['hex']} {d['zenith']['cct']:6.0f}K  horizon {d['horizon']['hex']} {d['horizon']['cct']:6.0f}K  sun {d['sun']['hex']} {d['sun']['cct']:5.0f}K  Ysun={d['sunY']:.2e} Yzen={d['zenY']:.2e}")
        s = rec['sunset']
        print(f"  sunset: zen {s['zenith']['hex']} sol-hor {s['solar_horizon']['hex']} +15 {s['above_sun']['hex']} anti {s['anti_horizon']['hex']} sun {s['sun']['hex']} Ysun={s['sunY']:.2e}")

    (HERE / 'skycolors.json').write_text(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
