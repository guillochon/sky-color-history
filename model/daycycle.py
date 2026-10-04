"""Whole-sky color samples from noon through 20 degrees below the horizon.

Samples already stored in daycycle.json are kept. Only solar zenith angles
missing from that file are integrated, then spliced in so the file's szas
list matches SZAS.
"""
import json, sys, time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from skymodel import spec_to_XYZ, make_atm

src = (HERE / 'run_epochs.py').read_text(encoding='utf-8').split('LATS =')[0]
ns = {}
exec(src, ns)
EPOCHS = ns['EPOCHS']

# Daytime spacing is unchanged. From the horizon (90) through 20 degrees
# below it (110), sample every degree.
SZAS = [0, 10, 20, 30, 40, 50, 60, 70, 75, 80, 84, 87, 89] + list(range(90, 111))
VZ = [0, 15, 30, 45, 60, 70, 78, 84, 88]
AZ = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180]
ALB = {'Equator': 0.08, 'Mid-latitude': 0.18, 'Polar': 0.70}
OUT = HERE / 'daycycle.json'


def build(e, albedo):
    T, L = e['sun']
    return make_atm(e['gas'], ozone_DU=e['ozone'], trop_aer=e['aer'], strat_sulf=e.get('sulf', 0),
                    haze550=e.get('haze', 0), soot=e.get('soot', 0), dust=e.get('dust', 0),
                    albedo=e.get('albedo', albedo), sun_T=T, sun_L=L)


def pack(X):
    s = float(np.sum(X))
    return [round(float(X[0]) / s, 4) if s > 0 else 0.33,
            round(float(X[1]) / s, 4) if s > 0 else 0.33,
            float('%.3g' % float(X[1]))]


def sample_dome(atm, sz, key=None):
    # Keep the model's multiple-scattering fade below the horizon. Single
    # scattering alone goes exactly to zero over more of the dome each degree,
    # and those holes read as bands.
    grid = []
    for vz in VZ:
        row = []
        for az in AZ:
            row.append(pack(spec_to_XYZ(atm.radiance(vz, az, sz))))
        grid.append(row)
    if sz < 90:
        sun = pack(spec_to_XYZ(atm.direct_sun(min(sz, 89.7))))
    else:
        sun = [0.33, 0.33, 0.0]
    return grid, sun


def compute_job(job):
    """One epoch, one surface, every missing solar zenith angle."""
    epoch, lname, alb, missing = job
    atm = build(epoch, alb)
    t0 = time.perf_counter()
    got = {}
    for sz in missing:
        grid, sun = sample_dome(atm, sz, epoch['key'])
        got[str(sz)] = {'dome': grid, 'sun': sun}
    return epoch['key'], lname, got, time.perf_counter() - t0


def main():
    out = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {
        'szas': [], 'vz': VZ, 'az': AZ, 'epochs': {}}
    old_sz = [int(z) for z in out.get('szas', [])]
    missing = [z for z in SZAS if z not in old_sz]
    print('have', len(old_sz), 'want', len(SZAS), 'missing', missing, flush=True)
    if not missing and old_sz == SZAS:
        print('already complete')
        return
    jobs = []
    for e in EPOCHS:
        rec = out['epochs'].get(e['key'])
        if rec is None:
            raise SystemExit('daycycle.json has no epoch ' + e['key'])
        for lname, alb in ALB.items():
            if lname not in rec:
                raise SystemExit(e['key'] + ' has no ' + lname)
            jobs.append((e, lname, alb, missing))
    extra = {}
    # A handful of processes: each atmosphere is independent, and a single
    # twilight dome is the slow part.
    with ProcessPoolExecutor(max_workers=6) as pool:
        for key, lname, got, dt in pool.map(compute_job, jobs):
            extra.setdefault(key, {})[lname] = got
            print(f'{key} {lname} {dt:.1f}s', flush=True)
    for e in EPOCHS:
        rec = out['epochs'][e['key']]
        for lname in ALB:
            lat = rec[lname]
            by_dome = {z: lat['dome'][i] for i, z in enumerate(old_sz)}
            by_sun = {z: lat['sun'][i] for i, z in enumerate(old_sz)}
            for z in missing:
                slot = extra[e['key']][lname][str(z)]
                by_dome[z] = slot['dome']
                by_sun[z] = slot['sun']
            lat['dome'] = [by_dome[z] for z in SZAS]
            lat['sun'] = [by_sun[z] for z in SZAS]
    out['szas'] = SZAS
    out['vz'] = VZ
    out['az'] = AZ
    OUT.write_text(json.dumps(out, separators=(',', ':')), encoding='utf-8')
    print('wrote', OUT, 'n_sza', len(SZAS), flush=True)


if __name__ == '__main__':
    main()
