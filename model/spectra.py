"""Sky spectra for the site's spectrum tooltip -> ../site/spectra.bin

For every epoch (the 2100 sky is today's), surface type and solar zenith angle of
daycycle.py, the model's spectral radiance at 380-780 nm (its native 10 nm grid) in
a coarse set of view directions, and the direct Sun. The page scales each spectrum
to the luminance it already has for that pixel, so only the shape is stored: log10
of the spectrum over its own maximum, from -4 to 0 in a byte (0 is 1e-4 or less, and
an all-zero spectrum is all zeros).

File: a 4-byte little-endian length, a JSON header of that length, then bytes in the
order epoch, surface, solar zenith angle, slot, wavelength, where slots are the view
directions (zenith angle major, azimuth from the Sun minor) and then the Sun.
"""
import json, struct, sys, time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import daycycle as dc
from skymodel import LAM

VZ = [0, 30, 60, 78, 88]
AZ = [0, 60, 120, 180]
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
    e, lname, alb = args
    atm = dc.build(e, alb, lname)
    out = bytearray()
    for sz in dc.SZAS:
        for vz in VZ:
            for az in AZ:
                out += encode(atm.radiance(vz, az, sz))
        out += encode(atm.direct_sun(min(sz, 89.7)) if sz < 90 else np.zeros_like(LAM))
    return e['key'], lname, bytes(out)


def main():
    epochs = [e for e in dc.EPOCHS if e['key'] != 'y2100']
    lats = list(dc.ALB)
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=6) as pool:
        got = {(k, l): b for k, l, b in pool.map(job, [(e, l, dc.ALB[l]) for e in epochs for l in lats])}
    header = json.dumps({'lam': [float(x) for x in LAM], 'szas': dc.SZAS, 'vz': VZ, 'az': AZ, 'lo': LO,
                         'epochs': [e['key'] for e in epochs], 'lats': lats}, separators=(',', ':')).encode()
    with open(OUT, 'wb') as f:
        f.write(struct.pack('<I', len(header)))
        f.write(header)
        for e in epochs:
            for l in lats:
                f.write(got[(e['key'], l)])
    print(OUT, OUT.stat().st_size, 'bytes', f'{time.time() - t0:.0f}s')


if __name__ == '__main__':
    main()
