"""Saturn's rings' normal optical depth, every 10 km, for the page (site_src/js/ring_profile.js).

From Cassini's radio occultation of Rev 7 egress (3 May 2005, X band, 10 km resolution; Marouf et
al., PDS volume CORSS_8001), which fetch_catalogs.py puts in model/data/. The 2.5 km samples are
averaged into 10 km bins from 73,800 km (inside the C ring's inner edge at 74,490) to 141,000 km
(past the F ring). Where the B ring is too opaque for the signal (the file's threshold, about 5),
it is taken as 6, which no light gets through at any angle. The occultation's noise in the empty
gaps (a few thousandths) is taken off.

The A ring is corrected to the optical depth visible light meets. Particles much smaller than the
3.6 cm wavelength hardly block it, while they block light. The same occultation at Ka band (0.94
cm), along the same path and so through the same self-gravity wakes, measures what they add: over
most of the A ring nothing beyond the bands' few percent of scatter (Ka/X 0.99 ± 0.02 inside
136,100 km), but toward the outer edge 7% rising to about 17%, the sub-centimetre particles that
Jerousek et al. (2016) find from UVIS and VIMS stellar occultations only there. Past 136,100 km the
X-band depth is multiplied by the Ka/X ratio smoothed over 75 km (never below 1), which keeps the
X band's fine structure and its lower noise. Particles of a few millimetres, which block light but
not even the Ka band, may make the outermost A ring a little thicker still.

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
SRC_KA = HERE / 'data' / 'RSS_2005_123_K34_E_TAU_10KM.TAB'
OUT = HERE / 'site_src' / 'js' / 'ring_profile.js'
R_SATURN = 60268.0
R0, R1, DR = 73800.0, 141000.0, 10.0
TAU_MAX, NOISE = 6.0, 0.003
F_R, F_CORE, F_ENV, F_SIG = 140221.0, 3.0, 1.5, 60.0
# The outer A ring, where the Ka band's excess starts, and the A ring's outer edge; the ratio's smoothing (km).
A_KA0, A_KA1, A_EDGE, KA_SIG = 136000.0, 136200.0, 136800.0, 75.0


def binned(path, edges):
    """A profile's depth averaged into the bins, with saturated samples at TAU_MAX, and whether
    each bin has samples, none of them saturated."""
    d = np.loadtxt(path, delimiter=',', usecols=(0, 6, 8))
    r, tau, thr = d[:, 0], d[:, 1], d[:, 2]
    sat = tau >= thr
    tau = np.where(sat, TAU_MAX, tau)
    n = len(edges) - 1
    idx = np.digitize(r, edges) - 1
    ok = (idx >= 0) & (idx < n)
    s = np.bincount(idx[ok], tau[ok], n)
    c = np.bincount(idx[ok], minlength=n)
    bad = np.bincount(idx[ok], sat[ok], n)
    return np.where(c > 0, s / np.maximum(c, 1), 0.0), (c > 0) & (bad == 0)


def smooth(x, sig_bins):
    k = np.exp(-0.5 * (np.arange(-4 * sig_bins, 4 * sig_bins + 1) / sig_bins) ** 2)
    return np.convolve(x, k, mode='same')


def profile():
    n = int(round((R1 - R0) / DR))
    edges = R0 + DR * np.arange(n + 1)
    mid = edges[:-1] + DR / 2
    t, okX = binned(SRC, edges)
    ka, okK = binned(SRC_KA, edges)
    # The outer A ring to visible light: times the smoothed Ka/X ratio, eased in.
    ok = okX & okK
    sig = KA_SIG / DR
    ratio = np.maximum(smooth(np.where(ok, ka, 0), sig) / np.maximum(smooth(np.where(ok, t, 0), sig), 1e-6), 1.0)
    w = np.clip((mid - A_KA0) / (A_KA1 - A_KA0), 0, 1) * (mid < A_EDGE)
    t = t * (1 + w * (ratio - 1))
    t = np.clip(t - NOISE, 0.0, TAU_MAX)
    t += F_ENV / (F_SIG * np.sqrt(2 * np.pi)) * np.exp(-0.5 * ((mid - F_R) / F_SIG) ** 2)
    t[int((F_R - R0) // DR)] += F_CORE / DR
    return np.clip(t, 0.0, TAU_MAX)


def main():
    t = profile()
    code = np.round(255 * np.sqrt(t / TAU_MAX)).astype(np.uint8)
    b64 = base64.b64encode(code.tobytes()).decode()
    OUT.write_text(
        '// Saturn\'s rings\' normal optical depth (ring_profile.py, from Cassini\'s radio occultation of\n'
        '// Rev 7 egress, the outer A ring corrected to visible light by its Ka band, with the F ring\n'
        '// added): SAT_RING_N bins of SAT_RING_DR planet radii from SAT_RING_R0, each a byte b for\n'
        f'// tau={TAU_MAX:g}*(b/255)^2.\n'
        f'const SAT_RING_R0={R0 / R_SATURN:.6f}, SAT_RING_DR={DR / R_SATURN:.8f}, SAT_RING_N={len(t)}, SAT_RING_TAU_MAX={TAU_MAX:g};\n'
        f"const SAT_RING_TAU_B64='{b64}';\n", encoding='utf-8')
    print('wrote', OUT, f'({len(t)} bins, {len(b64) / 1e3:.1f} KB)')


if __name__ == '__main__':
    main()
