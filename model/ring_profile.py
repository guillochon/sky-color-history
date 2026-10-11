"""Saturn's rings' normal optical depth, every 10 km, for the page (site_src/js/ring_profile.js).

From Cassini's radio occultation of Rev 7 egress (3 May 2005, X band, 10 km resolution; Marouf et
al., PDS volume CORSS_8001), which fetch_catalogs.py puts in model/data/. The 2.5 km samples are
averaged into 10 km bins from 73,800 km (inside the C ring's inner edge at 74,490) to 141,000 km
(past the F ring). Where the B ring is too opaque for the signal (the file's threshold, about 5),
it is taken as 6, which no light gets through at any angle. The occultation's noise in the empty
gaps (a few thousandths) is taken off.

The F ring, a core about 1 km wide of dust and small particles round 140,221 km with a fainter
envelope, hardly shows at 3.6 cm, so it is added: an equivalent depth of about 3 km in its core's
bin and 1.5 km in a Gaussian envelope 60 km wide (as stellar occultations by Cassini's UVIS and
VIMS measure it, within a factor of two along its eccentric, clumpy length).

Each bin's depth is written as one byte, 255*sqrt(tau/6), and the whole as base64: steps of 5%
near tau 0.1, 2% near 1.
"""
import base64
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
SRC = HERE / 'data' / 'RSS_2005_123_X43_E_TAU_10KM.TAB'
OUT = HERE / 'site_src' / 'js' / 'ring_profile.js'
R_SATURN = 60268.0
R0, R1, DR = 73800.0, 141000.0, 10.0
TAU_MAX, NOISE = 6.0, 0.003
F_R, F_CORE, F_ENV, F_SIG = 140221.0, 3.0, 1.5, 60.0


def profile():
    d = np.loadtxt(SRC, delimiter=',', usecols=(0, 6, 8))
    r, tau, thr = d[:, 0], d[:, 1], d[:, 2]
    tau = np.where(tau >= thr, TAU_MAX, tau)
    n = int(round((R1 - R0) / DR))
    edges = R0 + DR * np.arange(n + 1)
    idx = np.digitize(r, edges) - 1
    ok = (idx >= 0) & (idx < n)
    s = np.bincount(idx[ok], tau[ok], n)
    c = np.bincount(idx[ok], minlength=n)
    t = np.where(c > 0, s / np.maximum(c, 1), 0.0)
    t = np.clip(t - NOISE, 0.0, TAU_MAX)
    mid = edges[:-1] + DR / 2
    t += F_ENV / (F_SIG * np.sqrt(2 * np.pi)) * np.exp(-0.5 * ((mid - F_R) / F_SIG) ** 2)
    t[int((F_R - R0) // DR)] += F_CORE / DR
    return np.clip(t, 0.0, TAU_MAX)


def main():
    t = profile()
    code = np.round(255 * np.sqrt(t / TAU_MAX)).astype(np.uint8)
    b64 = base64.b64encode(code.tobytes()).decode()
    OUT.write_text(
        '// Saturn\'s rings\' normal optical depth (ring_profile.py, from Cassini\'s radio occultation of\n'
        '// Rev 7 egress, with the F ring added): SAT_RING_N bins of SAT_RING_DR planet radii from\n'
        f'// SAT_RING_R0, each a byte b for tau={TAU_MAX:g}*(b/255)^2.\n'
        f'const SAT_RING_R0={R0 / R_SATURN:.6f}, SAT_RING_DR={DR / R_SATURN:.8f}, SAT_RING_N={len(t)}, SAT_RING_TAU_MAX={TAU_MAX:g};\n'
        f"const SAT_RING_TAU_B64='{b64}';\n", encoding='utf-8')
    print('wrote', OUT, f'({len(t)} bins, {len(b64) / 1e3:.1f} KB)')


if __name__ == '__main__':
    main()
