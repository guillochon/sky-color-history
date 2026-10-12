# The View from Earth Through Time

What could be seen from Earth's surface at nineteen moments in its history, from the proto-Earth
before the Moon-forming impact to the year 2100: the color of the sky, from a spectral
radiative-transfer model of each epoch's air, and on it the Sun, the Moon, the planets and their
moons, the stars and the Galaxy, meteors, comets, aurorae, airglow, halos, clouds and the light people added.

## Contents

| Path | What it is |
|---|---|
| `report/view-from-earth.html` | The research report as a self-contained web page (eight volumetric atmosphere renderings drawn live on canvas) |
| `site/index.html` | Interactive site: scrub through time (the globe cross-fades between epochs) and through a day (whole-sky fisheye view); hover for color hex codes, click to copy |
| `latex/` | The same report as LaTeX (`main.tex`, `refs.bib`, `figures/`) and the compiled `main.pdf` |
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
  -> `daycycle.json` (about 20 seconds from scratch on a 14-core machine; a later run only fills angles the file does not already have)
- `lunar_eclipse.py` - the light inside the Earth's shadow at the Moon for each epoch: rays traced
  through the epoch's air with exact refraction (the 30-bar Hadean traps its lower air), summed
  over the Earth's limb as seen from the Moon (Link's method) -> `eclipse_grid.json` (about a minute)
- `shafts.py` - for the crepuscular rays, the share of each sky direction's light that air below 30 km
  scatters straight from the Sun, which a cloud's shadow can take away, per epoch -> `shafts.json` (about 15 seconds)
- `lunar_inclination.py` - the Moon's orbital tilt in each epoch (moon.js `MOON_INC`), integrated back
  from today's along the Moon's distance history with the tidal model of Ćuk et al. 2016
- `surfaces.py` - Mercury's, Mars's, Io's, Europa's, Ganymede's, Callisto's, Tethys's, Dione's and Rhea's global maps
  from MESSENGER, Viking, Galileo, Voyager and Cassini (USGS and NASA, public domain), turned to the IAU prime
  meridian, their gaps filled and colours toned toward true colour -> `site/surfaces.webp`
- `dso.py` - the nebulae and galaxies binoculars show under a dark sky: survey images (DSS2 and
  Mellinger, through CDS hips2fits, cached in `model/data/dso`) with their stars taken out, scaled
  to each object's magnitude and central surface brightness -> `site/dso.webp`, and where each was
  in each epoch (Local Group orbits for M31 and the Magellanic Clouds, the cosmic expansion beyond,
  the nebulae's lifetimes) -> `dso.json`
- `gen_report.py` - builds the report, as `report/view-from-earth.html` and as `latex/main.tex` with
  `latex/refs.bib`, from one list of blocks (`report_doc.py` renders them both ways, so the text, figures,
  tables, numbering and citations agree); its text is in `gen_report.py` (the sky colors and the epochs),
  `report_sky.py` (the Sun, eclipses, halos, the night sky, aurorae, meteors, clouds) and `report_view.py`
  (the Moon, planets, stars, transients and the sky people made), and its bibliography in `report_refs.py`.
  Tables of the site's own numbers are read from its JavaScript (`site_consts.py`).
  `eclipse_report.py` draws the eclipsed-Moon figure and table from `eclipse_grid.json`
- `report_figs.py` - the report's views from the ground, screenshots of the site's first-person view
  (its Moments and telescope views, and a total solar eclipse's phases in five epochs, put together as
  `view_eclipses.jpg`) taken in headless Chrome -> `latex/figures/view_*.jpg`; needs the
  site served locally (`python -m http.server 8767 -d site`)
- `gen_site.py`, `make_figs.py` - build the interactive site and the PNG figures from the JSON data

Reproduce everything:

The Python dependencies are pinned in `pyproject.toml` and `uv.lock`; [uv](https://docs.astral.sh/uv/)
installs them into `.venv` on the first `uv run`.

```
cd model
uv run run_epochs.py && uv run limb_grid.py && uv run daycycle.py && uv run lunar_eclipse.py && uv run shafts.py
uv run gen_site.py && uv run make_figs.py && uv run report_figs.py && uv run gen_report.py
cd ../latex && latexmk -pdf main.tex   # or: tectonic -X compile main.tex
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
