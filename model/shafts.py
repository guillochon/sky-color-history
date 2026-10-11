"""Crepuscular rays (shader_clouds.js shaftShade): how much of the sky's light a cloud's shadow
can take away, for each epoch.

The sky in a given direction is the sunlight scattered once along the line of sight, plus the
diffuse light of many scatterings (skymodel.Atmosphere.radiance). A cloud's shadow only takes
away the first part, and only where it falls: in the air below about 30 km. This writes, per
epoch, the share of each direction's light (linear sRGB) that is scattered once below 30 km,
on a grid of view altitude, azimuth from the Sun and the Sun's altitude, for the shader to
spread over the shadowed and lit stretches of its ray. And the air's parts, for that spreading.

  share   uint8 (0-255 for 0-1), [sun altitude][view altitude][azimuth][r, g, b], the grids
          VIEW_EL = 90·a², a = i/(NV-1); REL_AZ = 180·b², b = j/(NA-1);
          SUN_EL = s·|s|, s from -sqrt(10) to sqrt(90) in NS steps
  comps   per part of the air: kind (0 Rayleigh, 1 exponential of scale height p, 2 a layer
          at p km, q km wide), p, q, HG g, extinction optical depth (r, g, b), scattering (r, g, b)

-> shafts.json (about a minute on 14 cores).
"""
import json, math
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

import epochs as _ep
import skymodel as sm

HERE = Path(__file__).resolve().parent
ZMAX = 30.0     # km: no cloud shadow reaches above this
NV, NA, NS = 8, 10, 18
VIEW_EL = [90.0*(i/(NV-1))**2 for i in range(NV)]
REL_AZ = [180.0*(j/(NA-1))**2 for j in range(NA)]
_S = np.linspace(-math.sqrt(10.0), math.sqrt(90.0), NS)
SUN_EL = [float(s*abs(s)) for s in _S]
# The channels' wavelengths for the parts' optical depths.
LAM_RGB = (610.0, 550.0, 465.0)
# The parts' profiles (skymodel.make_atm); ozone as its mid-latitude layer.
PROFILE = {'rayleigh': (0, 8.0, 0.0), 'trop_aer': (1, 1.5, 0.0), 'dust': (1, 3.0, 0.0), 'ozone': (2, 22.0, 7.0),
           'sulfate': (2, 21.0, 4.0), 'haze': (2, 45.0, 18.0), 'soot': (2, 25.0, 8.0)}


def rgb(S):
    return sm.M_XYZ2RGB @ sm.spec_to_XYZ(S)


def shares(atm, sun_el):
    """The share of each grid direction's light scattered once below ZMAX, for the Sun at sun_el."""
    sza = 90.0 - sun_el
    zs = math.radians(sza)
    I_ms = atm.multiple_scatter(sza)
    out = np.zeros((NV, NA, 3))
    for i, el in enumerate(VIEW_EL):
        zv = math.radians(90.0 - max(el, 0.3))
        s, h, x, z, r = sm.ray_points(0.0, zv)
        keep = h < 120
        s, h, x, z, r = s[keep], h[keep], x[keep], z[keep], r[keep]
        vert = np.stack([x/r, np.zeros_like(x), z/r], axis=1)
        low = (h < ZMAX).astype(float)
        for j, az in enumerate(REL_AZ):
            a = math.radians(az)
            cosT = math.cos(zv)*math.cos(zs)+math.sin(zv)*math.sin(zs)*math.cos(a)
            sun = np.array([math.sin(zs)*math.cos(a), math.sin(zs)*math.sin(a), math.cos(zs)])
            cols = sm.path_columns([c.profile for c in atm.comps], r, vert @ sun)
            I_all, I_low = single_scatter_split(atm, s, h, cols, cosT, low)
            tot, near = rgb(I_all + I_ms), rgb(I_low)
            out[i, j] = np.clip(near/np.maximum(tot, 1e-30), 0.0, 1.0)
    return out


def single_scatter_split(atm, s, h, cols, cosT, low):
    """skymodel.single_scatter, and the part of it from the points where low is 1."""
    tau_obs = np.zeros((len(s), len(sm.LAM))); tau_sun = np.zeros_like(tau_obs); beta = np.zeros_like(tau_obs)
    ds = np.diff(s)
    for c, col in zip(atm.comps, cols):
        dens = c.profile(h.copy())
        seg = 0.5*(dens[1:]+dens[:-1])*ds
        tau_obs += np.concatenate([[0], np.cumsum(seg)])[:, None]*c.tau[None, :]
        tau_sun += np.where(np.isinf(col)[:, None], 1e6, col[:, None]*c.tau[None, :])
        P = sm.rayleigh_phase(cosT) if c.rayleigh else sm.hg(c.g, cosT)
        beta += dens[:, None]*(c.tau*c.ssa*P)[None, :]
    f = beta*np.exp(-tau_obs - tau_sun)
    return np.trapezoid(f, s, axis=0)*atm.S0, np.trapezoid(f*low[:, None], s, axis=0)*atm.S0


def comps(atm):
    out = []
    for c in atm.comps:
        kind, p, q = PROFILE[c.name]
        ext = [float('%.4g' % np.interp(l, sm.LAM, c.tau)) for l in LAM_RGB]
        sca = [float('%.4g' % np.interp(l, sm.LAM, c.tau*c.ssa)) for l in LAM_RGB]
        out.append([kind, p, q, 0.0 if c.rayleigh else c.g, *ext, *sca])
    return out


def run(key):
    atm = _ep.build(_ep.BY_KEY[key], 0.15)
    tab = np.stack([shares(atm, e) for e in SUN_EL])
    return key, dict(comps=comps(atm), share=np.rint(tab*255).astype(int).ravel().tolist())


if __name__ == '__main__':
    with ProcessPoolExecutor() as pool:
        res = dict(pool.map(run, [e['key'] for e in _ep.EPOCHS]))
    (HERE / 'shafts.json').write_text(json.dumps(dict(zmax=ZMAX, nv=NV, na=NA, ns=NS, sunMin=float(_S[0]), sunMax=float(_S[-1]),
                                                      epochs=res), separators=(',', ':')), encoding='utf-8')
    for k, v in res.items():
        t = np.array(v['share']).reshape(NS, NV, NA, 3)
        print(f"{k:16s} noon(sun 50) toward sun/zenith/away G: {t[14, 2, 0, 1]:3d} {t[14, -1, 0, 1]:3d} {t[14, 2, -1, 1]:3d}"
              f"   sunset(sun 0.3) toward/away G: {t[5, 1, 0, 1]:3d} {t[5, 1, -1, 1]:3d}   sun 12: {t[9, 1, 0, 1]:3d} {t[9, 1, -1, 1]:3d}")
