"""Sky spectra for the site's spectrum tooltip -> ../site/spectra.bin

For every epoch (the 2100 sky is today's), surface type and solar zenith angle of
daycycle.py, the model's spectral radiance at 380-780 nm (its native 10 nm grid) in
a coarse set of view directions, and the direct Sun. The page scales each spectrum
to the luminance it already has for that pixel, so only the shape is stored: log10
of the spectrum over its own maximum, from -4 to 0 in a byte (0 is 1e-4 or less, and
an all-zero spectrum is all zeros).

The globe view's spectra follow (limb_grid.py's geometry): per epoch and latitude, the
limb at each tangent height, then the disk.

File: a 4-byte little-endian length, a JSON header of that length, then bytes in the
order epoch, surface, solar zenith angle, slot, wavelength, where slots are the view
directions (zenith angle major, azimuth from the Sun minor) and then the Sun; then the
globe's, in the order epoch, latitude, slot, wavelength, where slots are the tangent
heights and then the disk.

The spectra come from daycycle.py's and limb_grid.py's caches (spectra_cache.npz,
limb_spectra.npz). Anything missing there is integrated here and added to them.
"""
import json, struct, sys, time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import daycycle as dc
import limb_grid as lg
import speccache
from skymodel import LAM

VZ, AZ = dc.SPEC_VZ, dc.SPEC_AZ
LO = -4.0
OUT = HERE.parent / 'site' / 'spectra.bin'


def encode(S):
    S = np.asarray(S, float)
    m = S.max()
    if not m > 0:
        return bytes(len(S))
    v = np.log10(np.maximum(S / m, 1e-30))
    return bytes(np.clip(np.round(255 * (1 - v / LO)), 0, 255).astype(np.uint8))


def job(args):
    """Spectra for the solar zenith angles szs of one epoch and surface."""
    e, lname, alb, szs = args
    atm = dc.build(e, alb, lname)
    return {dc.spec_key(e['key'], lname, sz):
            np.vstack([dc.dome(atm, sz, VZ, AZ).reshape(-1, len(LAM)), dc.sun_spectrum(atm, sz)])
            for sz in szs}


def main():
    epochs = [e for e in dc.EPOCHS if e['key'] != 'y2100']
    lats = list(dc.ALB)
    t0 = time.time()
    sky = speccache.load(dc.SPEC_CACHE, dc.OZONE_STAMP)
    limb = speccache.load(lg.SPEC_CACHE, lg.SPEC_STAMP)
    jobs = []
    for e in epochs:
        for l in lats:
            szs = [sz for sz in dc.SZAS if dc.spec_key(e['key'], l, sz) not in sky]
            if szs:
                jobs.append((e, l, dc.ALB[l], szs))
    limb_missing = [k for k in lg.PICK if k not in limb]
    print(len(jobs), 'sky jobs and', len(limb_missing), 'limb epochs not cached', flush=True)
    if jobs or limb_missing:
        with ProcessPoolExecutor(max_workers=6) as pool:
            for got in pool.map(job, jobs):
                sky.update(got)
            limb.update(zip(limb_missing, pool.map(lg.epoch_spectra, limb_missing)))
        if jobs:
            speccache.save(dc.SPEC_CACHE, sky, dc.OZONE_STAMP)
        if limb_missing:
            speccache.save(lg.SPEC_CACHE, limb, lg.SPEC_STAMP)
    header = json.dumps({'lam': [float(x) for x in LAM], 'szas': dc.SZAS, 'vz': VZ, 'az': AZ, 'lo': LO,
                         'epochs': [e['key'] for e in epochs], 'lats': lats,
                         'limb': {'epochs': lg.PICK, 'lats': [float(x) for x in lg.LATS], 'alts': [float(x) for x in lg.ALTS]}},
                        separators=(',', ':')).encode()
    with open(OUT, 'wb') as f:
        f.write(struct.pack('<I', len(header)))
        f.write(header)
        for e in epochs:
            for l in lats:
                for sz in dc.SZAS:
                    for S in sky[dc.spec_key(e['key'], l, sz)]:
                        f.write(encode(S))
        for k in lg.PICK:
            for row in limb[k]:
                for S in row:
                    f.write(encode(S))
    print(OUT, OUT.stat().st_size, 'bytes', f'{time.time() - t0:.0f}s')


if __name__ == '__main__':
    main()
