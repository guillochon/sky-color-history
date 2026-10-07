"""Reading the Yale Bright Star Catalogue (bsc5.json), shared by the star scripts.

The catalogue and the XHIP tables are local downloads kept in the temp folder.
"""
import json
import re
from pathlib import Path

TEMP = Path.home() / 'AppData' / 'Local' / 'Temp'


def load_bsc():
    return json.loads((TEMP / 'bsc5.json').read_text(encoding='utf-8'))


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


def parse_ra(text):
    hours, minutes, seconds = map(float, re.match(r"(\d+)h\s*(\d+)m\s*([\d.]+)s", text).groups())
    return (hours + minutes / 60 + seconds / 3600) * 15


def parse_dec(text):
    sign, degrees, minutes, seconds = re.match(r"([+-])(\d+).\s*(\d+).\s*([\d.]+)", text).groups()
    value = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
    return value if sign == "+" else -value
