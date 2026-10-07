"""Model spectra kept between runs, so spectra.py only encodes what daycycle.py and
limb_grid.py already integrated. Each cache is an .npz of float64 arrays keyed by name,
plus a stamp; a cache with another stamp is ignored."""
import numpy as np


def load(path, stamp):
    if not path.exists():
        return {}
    with np.load(path) as z:
        if '__stamp__' not in z.files or str(z['__stamp__']) != stamp:
            return {}
        return {k: z[k] for k in z.files if k != '__stamp__'}


def save(path, cache, stamp):
    np.savez(path, __stamp__=np.array(stamp), **cache)
