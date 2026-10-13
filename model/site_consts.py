"""Numbers the site's code holds, read from its JavaScript so the report quotes what the page draws.

js_const('moon.js', 'MOON_RE') returns {'modern': 60.14, ...} for an object of numbers, or the
number for a scalar. Only flat literals are read: keys and numbers (or true/false), comments ignored.
"""
import re
from pathlib import Path

JS = Path(__file__).resolve().parent / 'site_src' / 'js'
_SRC = {}

def _src(f):
    if f not in _SRC:
        s = (JS / f).read_text(encoding='utf-8')
        _SRC[f] = re.sub(r'//[^\n]*', '', s)
    return _SRC[f]

def js_const(f, name):
    s = _src(f)
    # A table wrapped in aliasEpochs(...) (epoch_time.js) is read as its literal.
    m = re.search(r'\b' + re.escape(name) + r'\s*=\s*(?:aliasEpochs\()?', s)
    if not m: raise KeyError(f'{name} not in {f}')
    rest = s[m.end():]
    if rest.startswith('{'):
        depth, i = 0, 0
        for i, c in enumerate(rest):
            depth += {'{': 1, '}': -1}.get(c, 0)
            if depth == 0: break
        out = {}
        for k, v in re.findall(r"['\"]?([\w$]+)['\"]?\s*:\s*(\[[^\]]*\]|-?[\d.eE+-]+|true|false)", rest[1:i]):
            if v.startswith('['): out[k] = [float(x) for x in re.findall(r'-?[\d.]+(?:[eE][+-]?\d+)?', v)]
            else: out[k] = True if v == 'true' else False if v == 'false' else float(v)
        return out
    if rest.startswith('['):
        return [float(x) for x in re.findall(r'-?[\d.]+(?:[eE][+-]?\d+)?', rest[:rest.index(']')])]
    v = re.match(r'-?[\d.eE+-]+', rest)
    return float(v.group(0))
