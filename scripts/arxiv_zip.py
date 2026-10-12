#!/usr/bin/env python3
"""
Zip the files arXiv needs to compile the manuscript.

main.tex, refs.bib, and every figure named by \\includegraphics are taken
from latex/ and stored with those same paths (figures stay under figures/). The
document class and packages are in arXiv's TeX Live, so none are bundled.
The compiled PDF, .bbl, and aux files are omitted. arXiv runs BibTeX itself.

    python scripts/arxiv_zip.py              # write view-from-earth-arxiv.zip
    python scripts/arxiv_zip.py --out PATH   # choose the zip path
    python scripts/arxiv_zip.py --dry-run    # list files, do not write
"""

import argparse
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LATEX = ROOT / "latex"
TEX_NAME = "main.tex"
DEFAULT_ZIP = ROOT / "view-from-earth-arxiv.zip"

# Optional [...] before the brace, so \\includegraphics[width=...]{...} matches.
FILE_CMD = re.compile(
    r"\\(?:includegraphics|input|include)\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}"
)
BIB_CMD = re.compile(r"\\(?:bibliography|addbibresource)\s*\{([^}]+)\}")


def strip_comments(text):
    """Drop TeX comments. A % preceded by an odd number of backslashes is kept."""
    kept = []
    for line in text.splitlines(keepends=True):
        i = 0
        newline = "\n" if line.endswith("\n") else ""
        body = line[:-1] if newline else line
        while True:
            j = body.find("%", i)
            if j < 0:
                kept.append(body + newline)
                break
            backslashes = 0
            k = j - 1
            while k >= 0 and body[k] == "\\":
                backslashes += 1
                k -= 1
            if backslashes % 2 == 1:
                i = j + 1
                continue
            kept.append(body[:j] + newline)
            break
    return "".join(kept)


def _bib_name(token):
    name = token.strip()
    if not name:
        return None
    path = Path(name)
    if path.suffix.lower() not in {".bib"}:
        path = path.with_suffix(".bib")
    return path.as_posix()


def sources(tex_text):
    """Paths relative to latex/, in first-use order, starting with the .tex."""
    ordered = [TEX_NAME]
    seen = set(ordered)
    body = strip_comments(tex_text)
    for match in FILE_CMD.finditer(body):
        name = match.group(1).strip()
        if not name or name in seen:
            continue
        seen.add(name)
        ordered.append(name)
    for match in BIB_CMD.finditer(body):
        for token in match.group(1).split(","):
            name = _bib_name(token)
            if not name or name in seen:
                continue
            seen.add(name)
            ordered.append(name)
    return ordered


def collect():
    tex_path = LATEX / TEX_NAME
    if not tex_path.is_file():
        print(f"Missing {tex_path.relative_to(ROOT)}", file=sys.stderr)
        sys.exit(1)
    names = sources(tex_path.read_text(encoding="utf-8"))
    missing = [name for name in names if not (LATEX / name).is_file()]
    if missing:
        print("Missing from latex/:", file=sys.stderr)
        for name in missing:
            print(f"  {name}", file=sys.stderr)
        sys.exit(1)
    return [(LATEX / name, name) for name in names]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_ZIP,
        help=f"zip path (default: {DEFAULT_ZIP.name})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="list files and sizes, do not write",
    )
    args = parser.parse_args()

    items = collect()
    width = max(len(name) for _, name in items)
    total = 0
    for src, name in items:
        size = src.stat().st_size
        total += size
        print(f"  {name:{width}s} {size / 1024:8.1f} KB")
    print(f"  {'total':{width}s} {total / 1024:8.1f} KB")

    if args.dry_run:
        return

    out = args.out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for src, name in items:
            zf.write(src, arcname=name)
    print(f"Wrote {out} ({out.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
