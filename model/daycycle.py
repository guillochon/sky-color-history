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
from skymodel import spec_to_XYZ, make_atm, column_ozone, ozone_latitude

# Bump when the ozone spectrum, profile, or columns change, so cached
# day-cycle colors for oxygenated epochs are recomputed.
OZONE_STAMP = 'serdyuchenko-223k-v1'

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


def build(e, albedo, place='Mid-latitude'):
    T, L = e['sun']
    return make_atm(e['gas'], ozone_DU=column_ozone(e, place), trop_aer=e['aer'], strat_sulf=e.get('sulf', 0),
                    haze550=e.get('haze', 0), soot=e.get('soot', 0), dust=e.get('dust', 0),
                    albedo=e.get('albedo', albedo), sun_T=T, sun_L=L,
                    ozone_lat=ozone_latitude(e, place), ozone_trop=e.get('trop_o3', 0.0))


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
    atm = build(epoch, alb, lname)
    t0 = time.perf_counter()
    got = {}
    for sz in missing:
        grid, sun = sample_dome(atm, sz, epoch['key'])
        got[str(sz)] = {'dome': grid, 'sun': sun}
    return epoch['key'], lname, got, time.perf_counter() - t0


def main():
    out = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {
        'szas': [], 'vz': VZ, 'az': AZ, 'epochs': {}}
    out.setdefault('epochs', {})
    old_sz = [int(z) for z in out.get('szas', [])]
    missing_global = [z for z in SZAS if z not in old_sz]
    stamp_ok = out.get('ozone_stamp') == OZONE_STAMP
    existed = set(out['epochs'])
    jobs = []
    rebuild_keys = set()
    for e in EPOCHS:
        # Oxygenated epochs are stale when the ozone treatment changes.
        # A new epoch, or one with no stored dome, is computed in full.
        rebuild = (e['key'] not in existed) or (not stamp_ok and column_ozone(e, 'Mid-latitude') > 0)
        if rebuild:
            rebuild_keys.add(e['key'])
        rec = out['epochs'].setdefault(e['key'], {})
        for lname, alb in ALB.items():
            lat = rec.setdefault(lname, {'dome': [], 'sun': []})
            missing = list(SZAS) if rebuild or not lat.get('dome') else list(missing_global)
            if missing:
                jobs.append((e, lname, alb, missing))
    print('have', len(old_sz), 'want', len(SZAS), 'rebuild', sorted(rebuild_keys),
          'jobs', len(jobs), flush=True)
    if not jobs and old_sz == SZAS and stamp_ok:
        print('already complete')
        return
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
            if e['key'] in rebuild_keys or not lat.get('dome'):
                by_dome, by_sun = {}, {}
            else:
                by_dome = {z: lat['dome'][i] for i, z in enumerate(old_sz)}
                by_sun = {z: lat['sun'][i] for i, z in enumerate(old_sz)}
            for z, slot in extra.get(e['key'], {}).get(lname, {}).items():
                by_dome[int(z)] = slot['dome']
                by_sun[int(z)] = slot['sun']
            lat['dome'] = [by_dome[z] for z in SZAS]
            lat['sun'] = [by_sun[z] for z in SZAS]
    out['szas'] = SZAS
    out['vz'] = VZ
    out['az'] = AZ
    out['ozone_stamp'] = OZONE_STAMP
    OUT.write_text(json.dumps(out, separators=(',', ':')), encoding='utf-8')
    print('wrote', OUT, 'n_sza', len(SZAS), flush=True)


if __name__ == '__main__':
    main()
