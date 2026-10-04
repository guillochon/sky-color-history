# The Color of Earth's Sky Through Time

A spectral radiative-transfer reconstruction of what Earth's sky looked like from the ground
at thirteen moments in its history, from the 30-bar CO2 Hadean to a modern megacity.

## Contents

| Path | What it is |
|---|---|
| `report/sky-color-history.html` | The research report as a self-contained web page (eight volumetric atmosphere renderings drawn live on canvas) |
| `report/sky-color-history.pdf` | The same report printed to PDF |
| `site/index.html` | Interactive site: scrub through time (the globe cross-fades between epochs) and through a day (whole-sky fisheye view); hover for color hex codes, click to copy |
| `latex/` | Magazine-style LaTeX source (`main.tex`, `refs.bib`, `figures/`) and the compiled `main.pdf` |
| `model/` | The Python model, every generator script, and the computed data |

## The model (`model/`)

- `skymodel.py` - spherical-shell single scattering along the line of sight with a delta-Eddington
  two-stream multiple-scattering correction; Rayleigh gas mix, ozone Chappuis band, tropospheric
  aerosol, stratospheric sulfate, tholin-like organic haze, soot, dust; limb and planetary-disk
  radiance; CIE 1931 color conversion. Needs only numpy and scipy.
- `run_epochs.py` - defines the thirteen epoch atmospheres and computes noon, sunset and twilight
  colors -> `skycolors.json`
- `limb_grid.py` - limb and disk color grids for the globe renderings -> `limb_all.json`
- `daycycle.py` - whole-sky dome at 34 solar zenith angles (1° from the horizon through 20° below it), three surface types, all epochs
  -> `daycycle.json` (about 15 minutes from scratch; a later run only fills angles the file does not already have)
- `gen_report.py`, `gen_site.py`, `make_figs.py`, `make_tex.py` - build the HTML report, the
  interactive site, the PNG figures and the LaTeX source from the JSON data

Reproduce everything:

```
pip install numpy scipy matplotlib
cd model
python run_epochs.py && python limb_grid.py && python daycycle.py
python gen_report.py && python gen_site.py && python make_figs.py && python make_tex.py
cd ../latex && latexmk -pdf main.tex
```

The generator scripts still carry the sandbox paths they were written with
(`/home/claude`, `/mnt/user-data/outputs`); point them at this checkout before running.

## Method in one paragraph

Each epoch's atmosphere is built from components with their own vertical profile and spectral
optical depth. Sky radiance is integrated numerically along each line of sight through a
spherical-shell atmosphere, so grazing sunlight at twilight is handled properly, with multiple
scattering and surface reflection added from a two-stream solution. The young Sun is a blackbody
following standard solar-evolution tracks (5,560 K and 70% luminosity at 4.4 Ga). Spectra from
380-780 nm are converted to CIE XYZ and shown as sRGB without chromatic adaptation. The model
reproduces measured modern skies (zenith 10,000-20,000 K, horizon 6,000-8,500 K, setting Sun
about 1,700 K) before being pointed backward.
