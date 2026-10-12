"""The Milky Way as it was in each epoch, for the page's model of the band (milkyway.js) -> mw_epochs.json

The page's map of the Milky Way is today's. For an older epoch it is scaled, direction by
direction, by how much a smooth model of the Galaxy seen from where the Sun was then outshines the
same model seen from here now (milkyway.js mwModel), for its old light and its young light apart.
This script gives that model its parameters for each epoch:

  - Star formation history (solar masses a year, against lookback time): the thick disc formed in
    an intense phase 9-12.5 Gyr ago (Snaith et al. 2014, ApJL 781, L31); the thin disc began about
    10 Gyr ago with a peak 9-10 Gyr ago, declined to 6-7 Gyr ago, and rose again 5 to 1 Gyr ago with
    its peak 2-3 Gyr ago, to about 1 solar mass a year now (Mor et al. 2019, A&A 624, L1; Alzate et
    al. 2021, MNRAS 501, 302; Gallart et al. 2024, A&A 687, A168; Ratcliffe et al. 2025).
  - A stellar population fades in V as its age to the -0.85 (an old population's M/L_V rising
    from about 0.1 at 0.1 Gyr to 5 at 10 Gyr; Maraston 1998, MNRAS 300, 872), so the light at an
    epoch is the star formation before it weighted by that. Young light is from stars under 1 Gyr
    old (the B, A and early F stars of the page's young population), old light the rest.
  - The thin disc grew inside out: its half-mass radius by 43% over the last 7 Gyr (Frankel et
    al. 2019, ApJ 884, 99), so its scale lengths (today 2.6 kpc for the old light, Bland-Hawthorn &
    Gerhard 2016, and 3.2 for the young) were smaller by that fraction. The thick disc keeps 2.0 kpc.
  - A disc star's scale height grows with its age, from 0.1 kpc for the youngest to about 0.5 at
    9 Gyr, as a power of age near 0.6 (Mazzi et al. 2024; Mirabal et al. 2026); the thick disc was
    born thick (0.9 kpc). Each component's height is its light-weighted mean then, so the disc of
    billions of years ago, its stars younger, was thinner.
  - The Sun was born about 5 kpc from the centre and has migrated out (Frankel et al. 2018, ApJ 865,
    96: 5.2 kpc; Lu et al. 2024, MNRAS 528, 4434: 4.5 ± 0.4; Baba et al. 2024, ApJL 976, L29: ~5).
    How it went is unknown; it is taken to move out evenly in time from 5.0 kpc at 4.57 Gyr ago.
  - The bulge and bar (the bar is at least 8 Gyr old: Sanders et al. 2024, MNRAS 530, 2972;
    Haywood et al. 2024) are old stars formed about 10.5 Gyr ago, fading as they age.
  - Dust follows the gas, at a fixed dust-to-metal ratio (Popping & Péroux 2022, MNRAS 513, 1531)
    and metallicity near solar over the thin disc's life (Gallart et al. 2024): the gas is the star
    formation rate times a depletion time that goes as (1+z)^-0.3 (Genzel et al. 2015, ApJ 800, 20).
  - Molecular clouds last 10-50 Myr (Dobbs & Pringle 2013, MNRAS 432, 653; Jeffreson & Kruijssen
    2018, MNRAS 476, 3688) and spiral arms are transient, so more than 30 Myr back today's dark
    clouds, star clouds and young-star complexes are gone: the page draws others of the same kind,
    placed at random (seed), as it does for the nebulae.
"""
import json
from pathlib import Path

import numpy as np

from dso import EPOCH_YEARS, scale_factor
from galaxy import R0

OUT = Path(__file__).with_name('mw_epochs.json')
R0K, T_SUN, R_BIRTH = R0 / 1000, 4.57, 5.0       # kpc, Gyr, kpc
RD_OLD, RD_YOUNG, RD_THICK = 2.6, 3.2, 2.0
YOUNG_MAX, T_RESEED = 1.0, 0.03                   # Gyr
TAU = np.linspace(0.0, 13.0, 13001)               # lookback time of formation, Gyr


def sfr_thin(t):
    g = lambda c, w: np.exp(-0.5 * ((t - c) / w) ** 2)
    return np.where(t < 10.3, 0.8 + 1.0 * g(9.3, 0.7) + 0.9 * g(3.0, 1.4), 0.0)


def sfr_thick(t):
    return 4.0 * np.exp(-0.5 * ((t - 11.0) / 0.9) ** 2)


def fade(age):
    """V light per unit mass formed, at age (Gyr)."""
    return np.maximum(age, 0.01) ** -0.85


def height(age):
    """A thin-disc star's scale height (kpc) at age (Gyr)."""
    return 0.10 + 0.40 * (np.maximum(age, 0.0) / 9.0) ** 0.6


def epoch(T):
    """The model's parameters T Gyr ago."""
    born = TAU >= T                                # formed by then
    age = np.where(born, TAU - T, 0.0)
    dt = TAU[1] - TAU[0]
    thin = sfr_thin(TAU) * born * fade(age) * dt
    young, old = thin * (age < YOUNG_MAX), thin * (age >= YOUNG_MAX)
    thick = sfr_thick(TAU) * born * fade(age) * dt
    grow = 1 - 0.30 * min(T, 7.0) / 7.0            # inside-out: 1/1.43 at 7 Gyr
    z = 1 / scale_factor(T) - 1 if T > 0 else 0.0
    dust = float(sfr_thin(np.array(T))) / float(sfr_thin(np.array(0.0))) * (1 + z) ** -0.3
    R = R0K - (R0K - R_BIRTH) * min(T, T_SUN) / T_SUN
    return dict(T=round(T, 6), R=round(R, 3),
                rdo=round(RD_OLD * grow, 3), rdy=round(RD_YOUNG * grow, 3), rdk=RD_THICK,
                ho=round(float((old * height(age)).sum() / old.sum()), 4),
                hy=round(float((young * height(age)).sum() / young.sum()), 4), hk=0.9,
                Lo=round(float(old.sum()), 4), Ly=round(float(young.sum()), 4), Lk=round(float(thick.sum()), 4),
                Lb=round(float(fade(np.array(10.5 - T))), 4), D=round(dust, 3),
                seed=int(T * 1000) if T > T_RESEED else 0)


def main():
    out = {'now': epoch(0.0)}
    for key, years in EPOCH_YEARS.items():
        if years > 1e5:
            out[key] = epoch(years / 1e9)
    now = out['now']
    print(f"{'epoch':>16} {'T':>6} {'R':>5} {'Rd':>5} {'h_o':>5} {'h_y':>5} {'L_o':>5} {'L_y':>5} {'L_k':>5} {'L_b':>5} {'dust':>5}  young share")
    for k, p in out.items():
        ys = p['Ly'] / (p['Ly'] + p['Lo'] + p['Lk'])
        print(f"{k:>16} {p['T']:6.3f} {p['R']:5.2f} {p['rdo']:5.2f} {p['ho']:5.3f} {p['hy']:5.3f} "
              f"{p['Lo'] / now['Lo']:5.2f} {p['Ly'] / now['Ly']:5.2f} {p['Lk'] / now['Lk']:5.2f} {p['Lb'] / now['Lb']:5.2f} "
              f"{p['D']:5.2f}  {ys:.2f}")
    # The same parameters through time, every 50 Myr and at each epoch, for any time between
    # (milkyway.js mwParamsAt); the seed is the epoch's.
    names = [k for k in now if k not in ('T', 'seed')]
    Ts = sorted({round(float(t), 3) for t in np.arange(0, T_SUN + 1e-9, 0.05)} | {p['T'] for p in out.values()})
    out['grid'] = dict(names=names, T=Ts, rows=[[epoch(t)[k] for k in names] for t in Ts])
    OUT.write_text(json.dumps(out, separators=(',', ':')), encoding='utf-8')
    print(f"wrote {OUT.name}")


if __name__ == '__main__':
    main()
