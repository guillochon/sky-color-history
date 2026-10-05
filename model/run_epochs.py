from pathlib import Path
from skymodel import *
import json, numpy as np

try:
    HERE = Path(__file__).resolve().parent
except NameError:
    HERE = None

EPOCHS = [
 dict(key='hadean44', name='Early Hadean, ~4.4 Ga', sub='post-magma-ocean CO2/steam atmosphere (~30 bar CO2)',
      gas={'CO2':30,'N2':1,'H2O':0.3}, ozone=0, aer=(0.3,1.0,0.95,0.7), sun=(5560,0.70), note='Rayleigh optical depth ~5 at 550 nm'),
 dict(key='hadean40', name='Late Hadean, ~4.0 Ga', sub='CO2 mostly drawn down into carbonate; ~1 bar N2, ~0.5 bar CO2',
      gas={'CO2':0.5,'N2':1.0,'H2O':0.02}, ozone=0, aer=(0.15,1.0,0.95,0.7), sun=(5600,0.72)),
 dict(key='archean38', name='Early Archean, ~3.8 Ga', sub='haze-free, anoxic; CO2 ~0.1 bar, CH4 ~1000 ppm, no ozone',
      gas={'N2':0.8,'CO2':0.1,'CH4':0.001}, ozone=0, aer=(0.08,1.2,0.95,0.7), sun=(5620,0.75)),
 dict(key='archean27thin', name='Neoarchean, ~2.7 Ga (thin haze)', sub='biogenic CH4/CO2 ~0.1: intermittent thin organic haze',
      gas={'N2':0.8,'CO2':0.05,'CH4':0.003}, ozone=0, aer=(0.08,1.2,0.95,0.7), haze=0.15, sun=(5660,0.80)),
 dict(key='archean27', name='Neoarchean, ~2.7 Ga (thick haze)', sub='"Pale Orange Dot": Titan-like fractal organic haze, tau(550nm)~0.6',
      gas={'N2':0.8,'CO2':0.05,'CH4':0.005}, ozone=0, aer=(0.08,1.2,0.95,0.7), haze=0.6, sun=(5660,0.80)),
 dict(key='archean27vthick', name='Neoarchean, ~2.7 Ga (very thick haze)', sub='upper-end haze, tau(550nm)~1.5: CH4/CO2 well above 0.2',
      gas={'N2':0.8,'CO2':0.05,'CH4':0.01}, ozone=0, aer=(0.08,1.2,0.95,0.7), haze=1.5, sun=(5660,0.80)),
 dict(key='proterozoic22', name='Paleoproterozoic, ~2.2 Ga', sub='after the Great Oxidation Event: O2 ~1% PAL, ozone column 66 DU',
      gas={'N2':0.8,'O2':0.002,'CO2':0.02}, ozone=66, aer=(0.1,1.3,0.93,0.7), sun=(5700,0.85),
      note='Cooke et al. 2021 global-mean column at 1% of present O2'),
 dict(key='snowball07', name='Snowball Earth, ~700 Ma', sub='cold, dry, very clean air; ice/snow surface (albedo 0.75); ozone 169 DU',
      gas={'N2':0.78,'O2':0.02,'CO2':0.01}, ozone=169, aer=(0.02,1.3,0.95,0.7), dust=0.05, albedo=0.75, sun=(5750,0.94),
      note='Cooke et al. 2021 global-mean column at 10% of present O2, nearest this epoch'),
 dict(key='carbon30', name='Carboniferous, ~300 Ma', sub='O2 ~30-35%; total pressure ~1.1 bar; wildfire smoke common',
      gas={'N2':0.78,'O2':0.33,'Ar':0.01},
      ozone={'Equator':280,'Mid-latitude':323,'Polar summer':355},
      aer=(0.15,1.4,0.92,0.7), sun=(5765,0.975),
      note='Cooke et al. 2021 Fig. 6: 150% PAL mean column ~300 DU vs pre-industrial 279 DU, scaled onto the modern latitude columns'),
 dict(key='kpg66', name='K-Pg impact winter, 66 Ma', sub='months after Chicxulub: stratospheric soot (tau~1.5) + sulfate (tau~0.5)',
      gas={'N2':0.78,'O2':0.21,'Ar':0.01},
      ozone={'Equator':260,'Mid-latitude':300,'Polar summer':330},
      aer=(0.15,1.3,0.9,0.7), soot=1.5, sulf=0.5, sun=(5772,0.995)),
 dict(key='volcanic', name='Volcanic year (Tambora 1815 / Toba-lite)', sub='stratospheric sulfate veil, tau(550nm)~0.4',
      gas={'N2':0.78,'O2':0.21,'Ar':0.01},
      ozone={'Equator':260,'Mid-latitude':300,'Polar summer':330},
      aer=(0.1,1.3,0.92,0.7), sulf=0.4, sun=(5772,1.0)),
 dict(key='ozonehole', name='Ozone-hole spring', sub='Antarctic spring in the ozone-hole years: column 130 DU',
      gas={'N2':0.78,'O2':0.21,'Ar':0.01}, ozone=130, trop_o3=0.10, ozone_lat=75,
      aer=(0.1,1.3,0.92,0.7), sun=(5772,1.0),
      note='Polar-spring column in the 100-150 DU range of the Antarctic ozone hole; layer centered near 18 km'),
 dict(key='modern', name='Modern, clean air', sub='aerosol optical depth 0.1; ozone 260/300/330 DU by latitude',
      gas={'N2':0.78,'O2':0.21,'Ar':0.01},
      ozone={'Equator':260,'Mid-latitude':300,'Polar summer':330}, trop_o3=0.10,
      aer=(0.1,1.3,0.92,0.7), sun=(5772,1.0),
      note='Equatorial minimum, mid-latitude 300 DU, polar-summer 330 DU; a tenth of the column is tropospheric'),
 dict(key='modernpoll', name='Modern, polluted megacity', sub='aerosol optical depth 0.6, slightly absorbing',
      gas={'N2':0.78,'O2':0.21,'Ar':0.01},
      ozone={'Equator':260,'Mid-latitude':300,'Polar summer':330}, trop_o3=0.10,
      aer=(0.6,1.2,0.88,0.68), sun=(5772,1.0)),
 dict(key='y2100', name='Year 2100', sub="today's clean air, with the filed megaconstellation and the Sunrise orbital datacenters",
      gas={'N2':0.78,'O2':0.21,'Ar':0.01},
      ozone={'Equator':260,'Mid-latitude':300,'Polar summer':330}, trop_o3=0.10,
      aer=(0.1,1.3,0.92,0.7), sun=(5772,1.0),
      note='Same air as the modern clean sky. The satellites are drawn in the site, not in the radiative transfer.'),
]

LATS = [('Equator', 15, 0.08), ('Mid-latitude', 45, 0.18), ('Polar summer', 75, 0.70)]

def build(e, albedo, place='Mid-latitude'):
    T, L = e['sun']
    return make_atm(e['gas'], ozone_DU=column_ozone(e, place), trop_aer=e['aer'], strat_sulf=e.get('sulf',0),
                    haze550=e.get('haze',0), soot=e.get('soot',0), dust=e.get('dust',0),
                    albedo=e.get('albedo', albedo), sun_T=T, sun_L=L,
                    ozone_lat=ozone_latitude(e, place), ozone_trop=e.get('trop_o3', 0.0))

def col(XYZ, Yref):
    x, y = xy(XYZ)
    return dict(hex=(hexcol(XYZ_to_srgb(XYZ, 0.80/Yref)) if Yref>1e-9 else "#000000"), Y=float(XYZ[1]), x=round(float(x),4), y=round(float(y),4),
                cct=float(np.clip(cct_mccamy(x,y), 800, 60000)))

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

json.dump(out, open(HERE / 'skycolors.json', 'w'), indent=1)
