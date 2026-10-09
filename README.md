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
- `epochs.py` - the epoch atmospheres, shared by the scripts below
- `run_epochs.py` - computes noon, sunset and twilight
  colors -> `skycolors.json`
- `limb_grid.py` - limb and disk color grids for the globe renderings -> `limb_all.json`
- `daycycle.py` - whole-sky dome at 34 solar zenith angles (1° from the horizon through 20° below it), three surface types, all epochs
  -> `daycycle.json` (about 15 minutes from scratch; a later run only fills angles the file does not already have)
- `gen_report.py`, `gen_site.py`, `make_figs.py`, `make_tex.py` - build the HTML report, the
  interactive site, the PNG figures and the LaTeX source from the JSON data

Reproduce everything:

The Python dependencies are pinned in `pyproject.toml` and `uv.lock`; [uv](https://docs.astral.sh/uv/)
installs them into `.venv` on the first `uv run`.

```
cd model
uv run run_epochs.py && uv run limb_grid.py && uv run daycycle.py
uv run gen_report.py && uv run gen_site.py && uv run make_figs.py && uv run make_tex.py
cd ../latex && latexmk -pdf main.tex
```

`make_figs.py` writes to `latex/figures`, or to a folder given as its argument.

`deploy/deploy.sh` copies the built `site/` to earthsky.astrocrash.net with rsync (files not in `site/`
are removed from the server); `deploy/deploy.sh -n` is a dry run.

`gen_site.py` writes `site/index.html`, one day-cycle file per epoch in `site/day`, and gzip
copies of the page and the data for nginx's `gzip_static`. With Node installed it minifies the
page's script with terser (fetched by `npx`); without it the script is left as it is.
`spectra.py` (the spectrum tooltip's `site/spectra.bin`) reuses the spectra `daycycle.py` and
`limb_grid.py` keep in `spectra_cache.npz` and `limb_spectra.npz`.

## Method in one paragraph

Each epoch's atmosphere is built from components with their own vertical profile and spectral
optical depth. Sky radiance is integrated numerically along each line of sight through a
spherical-shell atmosphere, so grazing sunlight at twilight is handled properly, with multiple
scattering and surface reflection added from a two-stream solution. The young Sun is a blackbody
following standard solar-evolution tracks (5,560 K and 70% luminosity at 4.4 Ga). Spectra from
380-780 nm are converted to CIE XYZ and shown as sRGB without chromatic adaptation. The model
reproduces measured modern skies (zenith 10,000-20,000 K, horizon 6,000-8,500 K, setting Sun
about 1,700 K) before being pointed backward.
