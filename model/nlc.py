"""Noctilucent clouds: the color and brightness of an ice cloud at the summer mesopause, per epoch.

Noctilucent (polar mesospheric) clouds are ice grains some 40-50 nm across (Baumgarten et al.
2008) at about 83 km, where the summer polar mesopause is the coldest air on Earth. They show in
the twilight, with the Sun 6 to 16 degrees down: still sunlit up there, against a sky gone dark.
What colors them is the path the sunlight takes to reach them, grazing through the air past the
Earth's shadow, and the path down to the eye. Along the first, ozone's Chappuis band takes the
orange and red, which is most of why they look silvery blue (Gadsden & Schröder 1989; Lange et al.
2022); the grains themselves, much smaller than the wavelength, scatter the blue a little more.

So this works out, for each epoch's air (epochs.py, its high-latitude summer ozone):
  - the sunlight reaching a grain at 83 km, by u, the Sun's cosine there placed between its horizon
    (u = 0, where the Earth hides the Sun) and the zenith (skymodel.sun_tau), none of it grazing
    the Earth low, where the tropospheric cloud and haze screen it (half lost at 19 km),
  - the grains' scattering, a log-normal of radii about 40 nm (geometric spread 1.4) of ice, by
    Lorenz-Mie theory, relative to its value at 550 nm,
  - the light's way down to the eye, by the view's elevation (skymodel.path_columns to 83 km),
and folds them, with the sunlight above the air, into linear sRGB relative to the modern Sun's
white: what a grain layer of optical depth 1 at 550 nm, scattering evenly, would send, per unit of
the Sun's illuminance over 4 pi, as the page reckons it (nlc.js).

The table, nlc.json: per epoch, the 12 view elevations e = 90 (i/11)^2 degrees by the 20 places of
the Sun u = 0.25 (j/19)^2, RGB, each a byte of log10 from -7 to 0.5.

Run: python nlc.py   (a minute)
"""
import base64
import json
from pathlib import Path

import numpy as np

import epochs as E
import skymodel as sm
from droplets import mie

HERE = Path(__file__).resolve().parent
H_NLC = 83.0
NU, NE = 20, 12
LOG_LO, LOG_SPAN = -7.0, 7.5


def grain_scatter():
    """Scattering of the grains by wavelength (sm.LAM), relative to 550 nm."""
    r = 40.0*np.exp(np.log(1.4)*np.linspace(-3, 3, 41))
    w = np.exp(-0.5*np.linspace(-3, 3, 41)**2)
    out = []
    for lam in sm.LAM:
        m = 1.31+1e-9j
        q = sum(wi*mie(m, 2*np.pi*ri/lam, np.array([1.0]))[1]*ri*ri for ri, wi in zip(r, w))
        out.append(q)
    out = np.array(out)
    return out/np.interp(550, sm.LAM, out)


def table(e, sigma):
    atm = sm.make_atm(e['gas'], ozone_DU=E.column_ozone(e, 'Polar summer'), trop_aer=e['aer'], strat_sulf=e.get('sulf', 0),
                      haze550=e.get('haze', 0), soot=e.get('soot', 0), dust=e.get('dust', 0),
                      albedo=e.get('albedo', 0.15), sun_T=e['sun'][0], sun_L=e['sun'][1],
                      ozone_lat=E.ozone_latitude(e, 'Polar summer'), ozone_trop=e.get('trop_o3', 0.0))
    tab = sm.sun_column_table(atm)
    muh = -np.sqrt(1-(sm.R_E/(sm.R_E+H_NLC))**2)
    u = 0.25*(np.arange(NU)/(NU-1))**2
    mu = muh+np.maximum(u, 1e-6)*(1-muh)
    tauS = sm.sun_tau(atm, tab, np.full(NU, H_NLC), mu)               # (NU, LAM)
    # Sunlight that grazes the Earth low goes through the tropospheric cloud and haze over hundreds
    # of kilometers and is lost (the screening height of NLC visibility studies, some 12-20 km):
    # the deep red that would light a cloud just past the Earth's shadow: half is lost at 19 km,
    # nearly all below 15. The cloud tops differ from place to place, which the page draws by
    # moving this edge about over the layer (nlc.js).
    ht = np.where(mu < 0, (sm.R_E+H_NLC)*np.sqrt(1-mu**2)-sm.R_E, 1e3)
    tauS = tauS+np.log1p(np.exp(-(np.minimum(ht, 200.0)-19.0)/1.5))[:, None]
    el = 90.0*(np.arange(NE)/(NE-1))**2
    cols = sm.path_columns([c.profile for c in atm.comps], np.full(NE, sm.R_E), np.sin(np.radians(np.maximum(el, 0.05))), hmax=H_NLC, n=400)
    tauD = np.tensordot(cols.T, np.stack([c.tau for c in atm.comps]), axes=([1], [0]))   # (NE, LAM)
    S = atm.S0*sigma
    xyz = np.array([sm.cmf(l) for l in sm.LAM])
    M3 = np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]])
    white = (sm.solar_spectrum()[:, None]*xyz).sum(0)[1]               # the modern Sun's Y
    spec = S[None, None, :]*np.exp(-tauS[None, :, :]-tauD[:, None, :])  # (NE, NU, LAM)
    rgb = (spec@xyz)@M3.T/white
    return rgb, el, mu


def encode(rgb):
    v = np.clip((np.log10(np.maximum(rgb, 1e-12))-LOG_LO)/LOG_SPAN, 0, 1)
    return base64.b64encode(np.round(v*255).astype(np.uint8).tobytes()).decode()


def main():
    sigma = grain_scatter()
    print('grain scattering 450/550/650 nm:', *(f'{np.interp(l, sm.LAM, sigma):.2f}' for l in (450, 550, 650)))
    out = {'nu': NU, 'ne': NE, 'lo': LOG_LO, 'span': LOG_SPAN, 'h': H_NLC, 'epochs': {}}
    for e in E.EPOCHS:
        rgb, el, mu = table(e, sigma)
        rgb = np.clip(rgb, 0, None)
        out['epochs'][e['key']] = encode(rgb)
        # At 10 degrees up, with the Sun 10 degrees down at the eye (the cloud, some 470 km off
        # toward the Sun, sees it about 6 degrees lower: u where mu = sin(-6 deg)).
        j = int(np.argmin(abs(mu-np.sin(np.radians(-6)))))
        c = rgb[int(np.argmin(abs(el-10))), j]
        Y = c@[0.2126, 0.7152, 0.0722]
        print(f"  {e['key']:16s} Y {Y:.3e}  color {c[0]/Y:.2f} {c[1]/Y:.2f} {c[2]/Y:.2f}")
    (HERE/'nlc.json').write_text(json.dumps(out), encoding='utf-8')


if __name__ == '__main__':
    main()
