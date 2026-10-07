import json, numpy as np
from pathlib import Path
from skymodel import *

HERE = Path(__file__).resolve().parent
# reuse epoch definitions without re-running: parse EPOCHS by exec of the header only
src = (HERE / 'run_epochs.py').read_text(encoding='utf-8').split('LATS =')[0]
ns = {}; exec(src, ns); EPOCHS = {e['key']: e for e in ns['EPOCHS']}

PICK = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','carbon30','kpg66','volcanic','ozonehole','modern','modernpoll']
LATS = np.arange(0, 86, 7.5)
ALTS = np.concatenate([np.arange(0, 20, 2), np.arange(20, 60, 4), np.arange(60, 101, 8)])

def build(e, albedo):
    T, L = e['sun']
    # One profile per epoch. The globe's latitude axis is viewing geometry,
    # not a second ozone column. A pinned ozone_lat (the ozone hole) is kept.
    return make_atm(e['gas'], ozone_DU=column_ozone(e, 'Mid-latitude'), trop_aer=e['aer'], strat_sulf=e.get('sulf',0),
                    haze550=e.get('haze',0), soot=e.get('soot',0), dust=e.get('dust',0),
                    albedo=e.get('albedo', albedo), sun_T=T, sun_L=L,
                    ozone_lat=ozone_latitude(e, 'Mid-latitude'), ozone_trop=e.get('trop_o3', 0.0))

def main():
    out = {}
    raw = {}
    for k in PICK:
        e = EPOCHS[k]
        atm = build(e, 0.06)
        limb = np.zeros((len(LATS), len(ALTS), 3))
        disk = np.zeros((len(LATS), 3))
        for i, lat in enumerate(LATS):
            for j, h in enumerate(ALTS):
                limb[i, j] = spec_to_XYZ(limb_radiance(atm, h, lat))
            disk[i] = spec_to_XYZ(disk_radiance(atm, lat))
        raw[k] = (limb, disk)
        print(k, 'limb Ymax %.2e disk Y0 %.2e' % (limb[..., 1].max(), disk[0, 1]))

    Yref_limb = raw['modern'][0][..., 1].max()
    Yref_disk = raw['modern'][1][0, 1]

    def tone(XYZ, Yref, p=0.35, cap=0.80, k0=0.78):
        if XYZ[1] <= 1e-30: return [0, 0, 0]
        b = min(cap, k0*(XYZ[1]/Yref)**p)
        return [round(float(c), 4) for c in XYZ_to_srgb(XYZ, b/XYZ[1])]

    for k in PICK:
        limb, disk = raw[k]
        out[k] = dict(name=EPOCHS[k]['name'], lats=LATS.tolist(), alts=ALTS.tolist(),
                      limb=[[tone(limb[i, j], Yref_limb) for j in range(len(ALTS))] for i in range(len(LATS))],
                      disk=[tone(disk[i], Yref_disk, p=0.6, cap=0.70, k0=0.66) for i in range(len(LATS))])
    json.dump(out, open(HERE / 'limb_all.json', 'w'))
    print('done')


if __name__ == '__main__':
    main()
