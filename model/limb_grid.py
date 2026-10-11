import json
from pathlib import Path

import numpy as np

from skymodel import LAM, spec_to_XYZ, XYZ_to_srgb, limb_radiance, disk_radiance
import epochs
import speccache

HERE = Path(__file__).resolve().parent
EPOCHS = epochs.BY_KEY

PICK = ['protoearth455','hadean45','hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','ordovician466','carbon30','kpg66','volcanic','ozonehole','modern','modernpoll']
LATS = np.arange(0, 86, 7.5)
ALTS = np.concatenate([np.arange(0, 20, 2), np.arange(20, 60, 4), np.arange(60, 101, 8)])
# The limb and disk spectra, per epoch: latitude, then the tangent heights and the disk.
SPEC_CACHE = HERE / 'limb_spectra.npz'
SPEC_STAMP = 'lats%d-alts%d' % (len(LATS), len(ALTS))


def epoch_spectra(k):
    atm = build(EPOCHS[k], 0.06)
    out = np.zeros((len(LATS), len(ALTS) + 1, len(LAM)))
    for i, lat in enumerate(LATS):
        for j, h in enumerate(ALTS):
            out[i, j] = limb_radiance(atm, h, lat)
        out[i, -1] = disk_radiance(atm, lat)
    return out

def build(e, albedo):
    # One profile per epoch. The globe's latitude axis is viewing geometry,
    # not a second ozone column. A pinned ozone_lat (the ozone hole) is kept.
    return epochs.build(e, albedo, 'Mid-latitude')

def main():
    out = {}
    raw = {}
    spectra = {}
    for k in PICK:
        spectra[k] = sp = epoch_spectra(k)
        xyz = np.array([[spec_to_XYZ(S) for S in row] for row in sp])
        limb, disk = xyz[:, :-1], xyz[:, -1]
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
    (HERE / 'limb_all.json').write_text(json.dumps(out))
    speccache.save(SPEC_CACHE, spectra, SPEC_STAMP)
    print('done')


if __name__ == '__main__':
    main()
