"""Whole-sky color samples from noon through 20 degrees below the horizon.

Samples already stored in daycycle.json are kept. Only solar zenith angles
missing from that file are integrated, then spliced in so the file's szas
list matches SZAS.

The spectra behind the samples spectra.py stores (SPEC_VZ x SPEC_AZ and the
Sun) are kept in spectra_cache.npz, so the tooltip spectra come from the same
integration as the colors.
"""
import json, sys, time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from skymodel import LAM, spec_to_XYZ, column_ozone
from epochs import EPOCHS, build
import speccache

# Bump when the ozone spectrum, profile, or columns change, so cached
# day-cycle colors for oxygenated epochs are recomputed.
OZONE_STAMP = 'serdyuchenko-223k-v1'

# Daytime spacing is unchanged. From the horizon (90) through 20 degrees
# below it (110), sample every degree.
SZAS = [0, 10, 20, 30, 40, 50, 60, 70, 75, 80, 84, 87, 89] + list(range(90, 111))
VZ = [0, 15, 30, 45, 60, 70, 78, 84, 88]
AZ = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180]
ALB = {'Equator': 0.08, 'Mid-latitude': 0.18, 'Polar': 0.70}
OUT = HERE / 'daycycle.json'
# The view directions whose spectra the site's tooltip uses (subsets of VZ, AZ).
SPEC_VZ = [0, 30, 60, 78, 88]
SPEC_AZ = [0, 60, 120, 180]
SPEC_CACHE = HERE / 'spectra_cache.npz'


def spec_key(epoch_key, lname, sz):
    return f'{epoch_key}|{lname}|{sz}'


def sun_spectrum(atm, sz):
    return atm.direct_sun(min(sz, 89.7)) if sz < 90 else np.zeros_like(LAM)


def pack(X):
    s = float(np.sum(X))
    return [round(float(X[0]) / s, 4) if s > 0 else 0.33,
            round(float(X[1]) / s, 4) if s > 0 else 0.33,
            float('%.3g' % float(X[1]))]


def sample_dome(atm, sz):
    """The dome's packed colors, the Sun's, and the spectra of the SPEC_VZ x SPEC_AZ
    directions followed by the Sun's."""
    # Keep the model's multiple-scattering fade below the horizon. Single
    # scattering alone goes exactly to zero over more of the dome each degree,
    # and those holes read as bands.
    grid, spec = [], {}
    for vz in VZ:
        row = []
        for az in AZ:
            S = atm.radiance(vz, az, sz)
            if vz in SPEC_VZ and az in SPEC_AZ:
                spec[vz, az] = S
            row.append(pack(spec_to_XYZ(S)))
        grid.append(row)
    S_sun = sun_spectrum(atm, sz)
    sun = pack(spec_to_XYZ(S_sun)) if sz < 90 else [0.33, 0.33, 0.0]
    return grid, sun, np.array([spec[vz, az] for vz in SPEC_VZ for az in SPEC_AZ] + [S_sun])


def compute_job(job):
    """One epoch, one surface, every missing solar zenith angle."""
    epoch, lname, alb, missing = job
    atm = build(epoch, alb, lname)
    t0 = time.perf_counter()
    got, spec = {}, {}
    for sz in missing:
        grid, sun, spec[spec_key(epoch['key'], lname, sz)] = sample_dome(atm, sz)
        got[str(sz)] = {'dome': grid, 'sun': sun}
    return epoch['key'], lname, got, spec, time.perf_counter() - t0


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
    cache = speccache.load(SPEC_CACHE, OZONE_STAMP)
    # A handful of processes: each atmosphere is independent, and a single
    # twilight dome is the slow part.
    with ProcessPoolExecutor(max_workers=6) as pool:
        for key, lname, got, spec, dt in pool.map(compute_job, jobs):
            extra.setdefault(key, {})[lname] = got
            cache.update(spec)
            print(f'{key} {lname} {dt:.1f}s', flush=True)
    speccache.save(SPEC_CACHE, cache, OZONE_STAMP)
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
