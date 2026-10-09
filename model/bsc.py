"""Reading the Yale Bright Star Catalogue (bsc5.json), shared by the star scripts.

The catalogue, the XHIP tables and Stellarium's figures are downloads kept in model/data/
(not in git); run fetch_catalogs.py to get them.
"""
import json
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent / 'data'


def load_bsc():
    return json.loads((DATA / 'bsc5.json').read_text(encoding='utf-8'))


def num(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def common_name(star):
    for note in star.get("Notes") or []:
        if note.get("Category") == "Star names":
            name = re.sub(r"\s+", " ", note["Remark"].split(";")[0].strip())
            name = name.strip().strip('"').strip("'").rstrip(".").strip()
            if name.isupper():
                name = name.title()
            return name.replace("'", "")
    return ""


def bayer(star):
    raw = re.sub(r"^\d+", "", (star.get("Name") or "").strip())
    return re.sub(r"\s+", " ", raw).strip()


GREEK = dict(Alp='α', Bet='β', Gam='γ', Del='δ', Eps='ε', Zet='ζ', Eta='η', The='θ', Iot='ι', Kap='κ', Lam='λ',
             Mu='μ', Nu='ν', Xi='ξ', Omi='ο', Pi='π', Rho='ρ', Sig='σ', Tau='τ', Ups='υ', Phi='φ', Chi='χ', Psi='ψ',
             Ome='ω')
SUPER = str.maketrans('0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹')
# Words that open a note about a name rather than a name.
NOTE_WORDS = {'See', 'Called', 'Formerly', 'Originally', 'Some', 'Early', 'Labelled', 'Also', 'Name', 'Now', 'Not',
              'Was', 'DM', 'Probably', 'Possibly', 'Sometimes', 'Often', 'In', 'This', 'The'}


def proper_name(star):
    """The star's traditional name from the notes, or "" when the note is not a plain name."""
    name = re.split(r",|;| \(|\. | in Becvar| according", common_name(star))[0].strip().rstrip(".")
    if name.isupper():
        name = name.title()
    if not re.fullmatch(r"[A-Z][a-z]+(?: (?:al|el|[A-Z][a-z]+))*(?: I{1,3})?", name) or len(name) > 28:
        return ""
    return "" if name.split()[0] in NOTE_WORDS else name


def designation(star):
    """Bayer (with its Greek letter) or Flamsteed designation, as "ν² Lyr" or "40 LMi", or ""."""
    m = re.fullmatch(r"(\d*)\s*(?:([A-Z][a-z]{1,2})\s*(\d)?)?\s*([A-Z][A-Za-z]{2})",
                     re.sub(r"\s+", " ", (star.get("Name") or "").strip()))
    if not m:
        return ""
    flam, letter, sup, const = m.groups()
    if letter in GREEK:
        return GREEK[letter] + (sup or "").translate(SUPER) + " " + const
    return f"{flam} {const}" if flam else ""


def star_name(star):
    return proper_name(star) or designation(star) or "HR " + str(star["HR"])


def parse_ra(text):
    hours, minutes, seconds = map(float, re.match(r"(\d+)h\s*(\d+)m\s*([\d.]+)s", text).groups())
    return (hours + minutes / 60 + seconds / 3600) * 15


def parse_dec(text):
    sign, degrees, minutes, seconds = re.match(r"([+-])(\d+).\s*(\d+).\s*([\d.]+)", text).groups()
    value = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
    return value if sign == "+" else -value
