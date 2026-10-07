"""The simple Galaxy the star scripts trace orbits through: a flat rotation curve (233 km/s)
in the plane and the disk's vertical pull as a harmonic well (an 84 Myr oscillation), with the
Sun at R0 = 8.2 kpc, 20.8 pc above the plane, moving at (U, V, W) = (11.1, 12.24, 7.25) km/s
relative to the local standard of rest (Schönrich, Binney & Dehnen 2010)."""
import math

import numpy as np

PC_MYR = 1.0227                       # pc per Myr at 1 km/s
R0, Z0, V0 = 8200.0, 20.8, 233.0
NU = 2 * math.pi / 84.0               # vertical frequency, 1/Myr
SUN_UVW = (11.1, 12.24 + V0, 7.25)    # km/s, galactocentric
# Rows: the galactic axes (toward the centre, toward l = 90°, toward the north pole) in J2000
# equatorial coordinates (Hipparcos).
GAL = np.array([[-0.0548755604, -0.8734370902, -0.4838350155],
                [0.4941094279, -0.4448296300, 0.7469822445],
                [-0.8676661490, -0.1980763734, 0.4559837762]])


def accel(p):
    """Acceleration (pc/Myr²) at galactocentric positions p (pc), one row per body."""
    R2 = p[:, 0] ** 2 + p[:, 1] ** 2
    a = np.empty_like(p)
    a[:, 0] = -(V0 * PC_MYR) ** 2 * p[:, 0] / R2
    a[:, 1] = -(V0 * PC_MYR) ** 2 * p[:, 1] / R2
    a[:, 2] = -NU ** 2 * p[:, 2]
    return a
