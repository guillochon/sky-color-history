#!/usr/bin/env python3
"""
Pull titles and abstracts from NASA ADS for every reference cited in this report,
so the citations can be checked for existence and relevance.

This paper does not use \\cite. Prose names the authors and year, and
model/report_refs.py turns each match into \\hyperlink{cite.<key>} in
latex/main.tex. The bibliography is latex/refs.bib, generated from
model/report_refs.py and the REFS list in model/report_sky.py.

    python scripts/verify_citations.py

    python scripts/verify_citations.py --dry-run     # no network; show what it would query
    python scripts/verify_citations.py --all         # include bib entries that are never linked
    python scripts/verify_citations.py -o out.md     # choose output path

The token is read from ADS_TOKEN in the environment, or from .env at the repo
root (https://ui.adsabs.harvard.edu/user/settings/token).

Resolution order for each entry: bibcode (from adsurl or a bibcode field) ->
DOI -> arXiv id (eprint, or arXiv: in howpublished / pages / booktitle / note)
-> first-author + year + title search. Anything that fails all of these is
reported under UNRESOLVED. Title and year disagreements with the ADS record
are reported under TITLE MISMATCH and YEAR MISMATCH.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.adsabs.harvard.edu/v1/search/query"
FIELDS = "bibcode,title,author,year,pub,doi,abstract,citation_count"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
LATEX = os.path.join(ROOT, "latex")
ARXIV_RE = re.compile(r"arXiv:(\d{4}\.\d{4,5}|[a-z\-]+/\d{7})", re.I)


def load_dotenv():
    """Fill missing environment variables from the repo-root .env file."""
    path = os.path.join(ROOT, ".env")
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# ----------------------------------------------------------------- parsing --
def cited_keys(texpath):
    """Every citation key, in order of first use.

    This report links citations as \\hyperlink{cite.<key>} in the LaTeX and as
    href="#ref-<key>" in the HTML. Classic \\cite commands are accepted too.
    """
    src = open(texpath, encoding="utf-8").read()
    src = re.sub(r"(?<!\\)%.*", "", src)          # strip comments, keep \%
    keys, seen = [], set()

    def add(key):
        key = key.strip()
        if key and key not in seen:
            seen.add(key)
            keys.append(key)

    for m in re.finditer(r"\\hyperlink\{cite\.([^}]+)\}", src):
        add(m.group(1))
    for m in re.finditer(r'href="#ref-([^"]+)"', src):
        add(m.group(1))
    pat = r"\\[Cc]ite[a-zA-Z]*\s*(?:\[[^\]]*\]\s*)*\{([^}]+)\}"
    for m in re.finditer(pat, src):
        for k in m.group(1).split(","):
            add(k)
    return keys


def parse_bib(bibpath):
    """key -> {field: value}. Tolerant of nested braces in values."""
    src = open(bibpath, encoding="utf-8").read()
    out = {}
    for m in re.finditer(r"@(\w+)\s*\{\s*([^,]+),", src):
        key = m.group(2).strip()
        i = src.index("{", m.start())
        depth, j = 0, i
        while j < len(src):
            if src[j] == "{":
                depth += 1
            elif src[j] == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        body = src[i + 1:j]
        fields = {}
        for fm in re.finditer(r"(\w+)\s*=\s*(\{)", body):
            name = fm.group(1).lower()
            k0 = fm.end() - 1
            d, k = 0, k0
            while k < len(body):
                if body[k] == "{":
                    d += 1
                elif body[k] == "}":
                    d -= 1
                    if d == 0:
                        break
                k += 1
            fields[name] = body[k0 + 1:k].strip()
        for fm in re.finditer(r'(\w+)\s*=\s*"([^"]*)"', body):
            fields.setdefault(fm.group(1).lower(), fm.group(2).strip())
        # bare values, e.g. `year = 1946,` -- common in hand-written entries
        for fm in re.finditer(r"(\w+)\s*=\s*([^\s{}\",][^,\n]*)", body):
            fields.setdefault(fm.group(1).lower(), fm.group(2).strip().rstrip(","))
        out[key] = fields
    return out


def clean(s):
    """Strip LaTeX noise from a bib field so it can go into a query or a comparison."""
    s = re.sub(
        r"\\([\'\"~`v^cu=.Hkr])\s*\{?\\?([A-Za-z])\}?",
        lambda m: m.group(2),
        s,
    )
    s = s.replace(r"\ss", "ss").replace(r"\&", "&").replace("--", "-")
    s = s.replace("~", " ")
    s = re.sub(r"\\[a-zA-Z]+\s*", " ", s)
    s = s.replace("{", "").replace("}", "").replace("\\", "").replace("$", "")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def arxiv_id(fields):
    """An arXiv id from eprint, or from an arXiv: token in the other text fields."""
    ep = fields.get("eprint", "").replace("arXiv:", "").strip()
    if ep:
        return ep
    blob = " ".join(fields.get(name, "") for name in
                    ("howpublished", "pages", "note", "booktitle", "journal"))
    m = ARXIV_RE.search(blob)
    return m.group(1) if m else None


def query_for(key, fields):
    """(description, ADS query string) using the most reliable identifier."""
    adsurl = fields.get("adsurl", "")
    m = re.search(r"/abs/([^/]+)", adsurl)
    if m:
        bc = urllib.parse.unquote(m.group(1))
        return f"bibcode {bc}", f'bibcode:"{bc}"'
    if fields.get("bibcode"):
        return f"bibcode {fields['bibcode']}", f'bibcode:"{fields["bibcode"]}"'
    doi = fields.get("doi", "")
    if doi and not doi.startswith("10.48550"):
        return f"doi {doi}", f'doi:"{doi}"'
    ep = arxiv_id(fields)
    if ep:
        return f"arXiv {ep}", f'arxiv:"{ep}"'
    if doi:
        return f"doi {doi}", f'doi:"{doi}"'
    au = clean(fields.get("author", "")).split(" and ")[0]
    au = au.split(",")[0].strip()
    yr = clean(fields.get("year", ""))
    ti = clean(fields.get("title", ""))
    terms = title_terms(ti)
    if au and terms:
        # Unquoted terms, not a truncated phrase: ADS rejects a quoted title
        # that is cut mid-word or differs in capitalization or punctuation.
        q = f'author:"{au}"'
        if re.fullmatch(r"\d{4}", yr):
            q += f" year:{yr}"
        q += " " + " ".join(terms)
        return f"author/title: {au} {yr}", q
    return None, None


_TITLE_STOP = {
    "a", "an", "the", "of", "and", "or", "not", "near", "in", "on", "for", "to",
    "with", "from", "by", "its", "their", "ago", "could", "would", "will",
}


def title_terms(title, n=8):
    """Significant words for an ADS query. Drops punctuation so a leading hyphen
    cannot be read as a negation operator."""
    words = re.findall(r"[A-Za-z][A-Za-z0-9]+", clean(title))
    out = []
    for word in words:
        if word.lower() in _TITLE_STOP or len(word) < 3:
            continue
        out.append(word)
        if len(out) == n:
            break
    return out


def norm_title(s):
    s = clean(s).lower().replace("–", " ").replace("—", " ")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def title_score(bib_title, ads_title):
    """1 when the titles agree, else the share of the shorter title's words in common."""
    a, b = norm_title(bib_title), norm_title(ads_title)
    if not a or a == "none" or not b:
        return 0.0
    if a == b or a in b or b in a:
        return 1.0
    wa = {w for w in a.split() if w not in _TITLE_STOP and len(w) > 1}
    wb = {w for w in b.split() if w not in _TITLE_STOP and len(w) > 1}
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / min(len(wa), len(wb))


def titles_match(bib_title, ads_title):
    """True when the bibliography title and the ADS title are the same work."""
    return title_score(bib_title, ads_title) >= 0.6


# -------------------------------------------------------------------- ADS --
def ads_get(query, token, rows=5, retries=3):
    url = API + "?" + urllib.parse.urlencode(
        {"q": query, "fl": FIELDS, "rows": rows})
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "User-Agent": "verify_citations/1.0",
    })
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                remaining = r.headers.get("X-RateLimit-Remaining")
                return json.loads(r.read().decode())["response"]["docs"], remaining
        except urllib.error.HTTPError as e:
            if e.code == 429:
                sys.stderr.write("rate limited; sleeping 60s\n")
                time.sleep(60)
                continue
            if e.code == 401:
                sys.exit("ADS rejected the token (401). Check ADS_TOKEN in .env.")
            if attempt == retries - 1:
                return None, f"HTTP {e.code}"
            time.sleep(2 ** attempt)
        except Exception as e:                     # noqa: BLE001
            if attempt == retries - 1:
                return None, str(e)
            time.sleep(2 ** attempt)
    return None, "failed"


def fetch_record(fields, token):
    """(ADS document or None, query description, error or None).

    An author/title query is retried with fewer title words. A word the
    bibliography spells out, or an unindexed stop word, otherwise makes the
    whole query miss.
    """
    desc, q = query_for("", fields)
    if not q:
        return None, None, "no usable identifier in the .bib"
    if not desc.startswith("author/title"):
        docs, note = ads_get(q, token, rows=1)
        if docs is None:
            return None, desc, f"{desc} -> ADS error ({note})"
        if not docs:
            return None, desc, f"{desc} -> no ADS match"
        return docs[0], desc, None

    au = clean(fields.get("author", "")).split(" and ")[0].split(",")[0].strip()
    yr = clean(fields.get("year", ""))
    terms = title_terms(fields.get("title", ""))
    year_bit = f" year:{yr}" if re.fullmatch(r"\d{4}", yr) else ""
    base = f'author:"{au}"{year_bit}'
    desc = f"author/title: {au} {yr}".strip()
    closest = None
    for n in range(len(terms), -1, -1):
        q = base if n == 0 else base + " " + " ".join(terms[:n])
        docs, note = ads_get(q, token, rows=5)
        if docs is None:
            return None, desc, f"{desc} -> ADS error ({note})"
        if not docs:
            continue
        d = max(docs, key=lambda doc: title_score(
            fields.get("title", ""), (doc.get("title") or [""])[0]))
        hit = (d.get("title") or ["(none)"])[0]
        if titles_match(fields.get("title", ""), hit):
            return d, desc, None
        closest = hit
    if closest:
        return None, desc, f"{desc} -> no title match; closest: {closest}"
    return None, desc, f"{desc} -> no ADS match"


def write_list(fh, heading, rows):
    if not rows:
        return
    fh.write(f"## {heading}\n\n")
    for row in rows:
        fh.write(row + "\n")
    fh.write("\n")


# ------------------------------------------------------------------- main --
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tex", default=os.path.join(LATEX, "main.tex"))
    ap.add_argument("--bib", default=os.path.join(LATEX, "refs.bib"))
    ap.add_argument("-o", "--out", default=os.path.join(LATEX, "citations_ads.md"))
    ap.add_argument("--all", action="store_true",
                    help="include bib entries that are never linked from the text")
    ap.add_argument("--dry-run", action="store_true",
                    help="print the queries without contacting ADS")
    ap.add_argument("--delay", type=float, default=0.15)
    args = ap.parse_args()

    bib = parse_bib(args.bib)
    keys = cited_keys(args.tex)
    missing = [k for k in keys if k not in bib]
    if args.all:
        keys += [k for k in bib if k not in keys]

    print(f"{len(bib)} bib entries; {len(keys)} to resolve", file=sys.stderr)
    if missing:
        print(f"WARNING: cited but absent from the .bib: {missing}", file=sys.stderr)

    if args.dry_run:
        for k in keys:
            desc, q = query_for(k, bib.get(k, {}))
            print(f"{k:28s} {desc or 'NO IDENTIFIER'}")
        return

    load_dotenv()
    token = os.environ.get("ADS_TOKEN") or os.environ.get("ADS_DEV_KEY")
    if not token:
        sys.exit("Set ADS_TOKEN in .env (https://ui.adsabs.harvard.edu/user/settings/token)")

    blocks, unresolved = [], []
    title_mismatches, year_mismatches = [], []
    for n, k in enumerate(keys, 1):
        f = bib.get(k, {})
        d, desc, err = fetch_record(f, token)
        if err:
            unresolved.append((k, err))
            continue
        au = d.get("author", [])
        aus = "; ".join(au[:4]) + (" et al." if len(au) > 4 else "")
        bib_title = clean(f.get("title", "(none)"))
        ads_title = (d.get("title") or ["(none)"])[0]
        bib_year = clean(f.get("year", ""))
        ads_year = str(d.get("year", "?"))
        title_ok = titles_match(bib_title, ads_title)
        year_ok = True
        if re.fullmatch(r"\d{4}", bib_year) and re.fullmatch(r"\d{4}", ads_year):
            year_ok = bib_year == ads_year
        if not title_ok:
            title_mismatches.append((k, bib_title, ads_title))
        if not year_ok:
            year_mismatches.append((k, bib_year, ads_year))
        blocks.append(
            f"## {k}\n\n"
            f"- **queried by:** {desc}\n"
            f"- **bibcode:** {d.get('bibcode','?')}\n"
            f"- **bib title:** {bib_title}\n"
            f"- **ADS title:** {ads_title}\n"
            f"- **title check:** {'ok' if title_ok else 'MISMATCH'}\n"
            f"- **authors:** {aus}\n"
            f"- **year / pub:** {ads_year} / {d.get('pub','?')}"
            f"{'' if year_ok else ' **YEAR MISMATCH** (bib ' + bib_year + ')'}\n"
            f"- **citations:** {d.get('citation_count','?')}\n\n"
            f"**Abstract:** {d.get('abstract','(no abstract in ADS)')}\n"
        )
        flag = "" if title_ok and year_ok else "  **"
        print(f"  [{n}/{len(keys)}] {k}{flag}", file=sys.stderr)
        time.sleep(args.delay)

    tex_name = os.path.basename(args.tex)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(f"# ADS records for citations in {tex_name}\n\n")
        fh.write(
            f"Resolved {len(blocks)} of {len(keys)}. "
            f"{len(title_mismatches)} title mismatches, "
            f"{len(year_mismatches)} year mismatches, "
            f"{len(unresolved)} unresolved.\n\n"
        )
        write_list(
            fh, "Cited but absent from the .bib",
            [f"- {k}" for k in missing],
        )
        write_list(
            fh, "TITLE MISMATCH",
            [f"- **{k}**: bib `{bib_t}` / ADS `{ads_t}`"
             for k, bib_t, ads_t in title_mismatches],
        )
        write_list(
            fh, "YEAR MISMATCH",
            [f"- **{k}**: bib {bib_y}, ADS {ads_y}"
             for k, bib_y, ads_y in year_mismatches],
        )
        if unresolved:
            fh.write("# UNRESOLVED - check these by hand\n\n")
            for k, why in unresolved:
                fh.write(f"- **{k}**: {why}\n")
            fh.write("\n")
        fh.write("\n".join(blocks))
    print(f"\nwrote {args.out} ({len(blocks)} resolved, "
          f"{len(unresolved)} unresolved, "
          f"{len(title_mismatches)} title mismatches, "
          f"{len(year_mismatches)} year mismatches)", file=sys.stderr)
    if missing:
        print("cited but absent: " + ", ".join(missing), file=sys.stderr)
    for k, bib_t, ads_t in title_mismatches:
        print(f"TITLE MISMATCH {k}: {bib_t} || {ads_t}", file=sys.stderr)
    for k, bib_y, ads_y in year_mismatches:
        print(f"YEAR MISMATCH {k}: bib {bib_y}, ADS {ads_y}", file=sys.stderr)
    for k, why in unresolved:
        print(f"UNRESOLVED {k}: {why}", file=sys.stderr)


if __name__ == "__main__":
    main()
