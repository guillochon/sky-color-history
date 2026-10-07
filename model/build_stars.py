"""Pull the 1000 brightest stars from the Yale Bright Star Catalogue JSON.

The catalog file is a local download used only to build model/stars1000.json.
Positions are J2000. Proper motions are arcseconds per year
(mu alpha cos delta, then mu delta). The site embeds this list.
"""
import json
from pathlib import Path

from bsc import load_bsc, num, common_name, bayer, parse_ra, parse_dec


def main():
    rows_in = load_bsc()
    ranked = []
    for star in rows_in:
        # HR 5958 is T CrB. The catalog magnitude is the 1946 outburst, not the star
        # as it stands now (about tenth magnitude between eruptions).
        if str(star.get("HR")) == "5958":
            continue
        magnitude = num(star.get("Vmag"), None)
        if magnitude is None or not star.get("RA") or not star.get("Dec"):
            continue
        ranked.append((magnitude, star))
    ranked.sort(key=lambda item: item[0])

    catalog = []
    for magnitude, star in ranked[:1000]:
        name = common_name(star) or bayer(star) or ("HR " + str(star["HR"]))
        name = name.replace("<", "").replace("'", "")
        catalog.append({
            "name": name,
            "ra": round(parse_ra(star["RA"]), 4),
            "dec": round(parse_dec(star["Dec"]), 4),
            "v": round(magnitude, 2),
            "bv": round(num(star.get("B-V")), 2),
            "pmRa": round(num(star.get("pmRA")), 3),
            "pmDec": round(num(star.get("pmDE")), 3),
            "k": int(round(num(star.get("K"), 10000))),
        })

    out = Path(__file__).with_name("stars1000.json")
    out.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {len(catalog)} stars, faintest {catalog[-1]['v']} {catalog[-1]['name']}")
    print("brightest", catalog[0]["name"], catalog[0]["v"], catalog[0]["ra"], catalog[0]["dec"])
    print("anchor", catalog[99]["name"], catalog[99]["v"])


if __name__ == '__main__':
    main()
