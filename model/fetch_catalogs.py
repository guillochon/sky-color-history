"""Download the star catalogues the star scripts read into model/data/ (kept out of git).

bsc5.json      Yale Bright Star Catalogue, 5th ed., as JSON (brettonw/YaleBrightStarCatalog)
xhip.tsv       XHIP astrometry for build_star_epochs.py (VizieR V/137D)
xhip_err.tsv   XHIP with errors and spectral types for stellar_encounters.py (VizieR V/137D)
stelcon/index.json   Stellarium's modern sky culture, for the constellation figures
RSS_2005_123_X43_E_TAU_10KM.TAB   Cassini's radio occultation of Saturn's rings, for ring_profile.py

Files already present are skipped; pass --force to fetch them again.
"""
import sys
import urllib.request

from bsc import DATA

VIZIER = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=V/137D/XHIP&-out.max=unlimited&-out='
SOURCES = {
    'bsc5.json': 'https://raw.githubusercontent.com/brettonw/YaleBrightStarCatalog/master/bsc5.json',
    'xhip.tsv': VIZIER + 'HIP,HD,Plx,e_Plx,pmRA,pmDE,RV',
    'xhip_err.tsv': VIZIER + '_RAJ2000,_DEJ2000,HIP,HD,Vmag,Plx,e_Plx,pmRA,e_pmRA,pmDE,e_pmDE,RV,e_RV,SpType',
    'stelcon/index.json': 'https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/modern/index.json',
    'RSS_2005_123_X43_E_TAU_10KM.TAB': 'https://pds-rings.seti.org/holdings/volumes/CORSS_8xxx/CORSS_8001/data/Rev007/Rev007E/Rev007E_RSS_2005_123_X43_E/RSS_2005_123_X43_E_TAU_10KM.TAB',
}


def main():
    force = '--force' in sys.argv
    for name, url in SOURCES.items():
        path = DATA / name
        if path.exists() and not force:
            print('have', path)
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        print('fetching', name, '...', flush=True)
        with urllib.request.urlopen(url, timeout=600) as response:
            body = response.read()
        tmp = path.with_suffix(path.suffix + '.part')
        tmp.write_bytes(body)
        tmp.replace(path)
        print('wrote', path, f'({len(body) / 1e6:.1f} MB)')


if __name__ == '__main__':
    main()
