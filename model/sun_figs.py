"""The report's figure of the Sun's surface through time -> latex/figures/sun_closeup.jpg.

For each epoch the site's walk-around view finds the Sun at noon and is shot three times in one
page session, as report_figs.py shoots its views (headless Chrome over the DevTools Protocol): the
whole disk; the largest spot group, found in that shot as the darkest patch against the disk
around it; and that group's largest spot close up, where the photosphere's own fine structure
(granulation, penumbral filaments, umbral dots) takes over from the spot map. The shots are cut to
squares and set in a grid, one column per epoch, with each field's width in km on the Sun (the
site draws the Sun at DISK_SCALE times its size, so its zoom is not a true angular field).

The site must be served (python -m http.server -d site, or the site-alt preview on 8767):
    uv run sun_figs.py [http://localhost:8767]
"""
import asyncio, base64, io, json, math, subprocess, sys, tempfile, time, urllib.request
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

import websockets
from report_figs import CHROME, W, H, JS_HIDE, OUT, js_shot
from surface_montage import font

R_SUN = 695700.0     # km
DISK_SCALE = 4       # moon.js
# key, label, date, clock (minutes)
EPOCHS = [
    ('protoearth455', '4.55 Ga, proto-Earth', '2000-03-20', 720),
    ('archean38', '3.8 Ga', '2000-03-20', 720),
    ('proterozoic22', '2.2 Ga', '2000-03-20', 720),
    ('modern', 'Today (8 August 2024)', '2024-08-08', 720),
]
DISK_FOV = 2.6       # degrees, the whole drawn disk
SQ = 900             # the square cut from each 1600 x 900 shot

JS_AIM = """(async()=>{ const sl=ms=>new Promise(r=>setTimeout(r,ms));
  vrYaw=%f; vrPitch=%f; vrFov=%f; requestVR(); await sl(%d);
  if(dayPlaying){ document.getElementById('hplay').click(); requestVR(); await sl(1500); }
  return %s; })()"""
JS_STATE = '({yaw:vrYaw, pitch:vrPitch, fov:vrFov, sunRad:skyNow.moon.sunRadDeg})'


def lum(png):
    a = np.asarray(Image.open(io.BytesIO(png)).convert('RGB'), np.float64)
    return a, a @ [0.2126, 0.7152, 0.0722]


def darkest_patch(L, rad=None):
    """The centroid and equivalent radius (px) of the largest dark patch: pixels well below the
    local brightness (limb darkening taken out by a wide median). Given the drawn disk's radius in
    px (the view is centred on the Sun), only patches within 0.8 of it, clear of the limb."""
    if rad:
        r = np.hypot(*np.mgrid[0:L.shape[0], 0:L.shape[1]] - np.array([H / 2, W / 2])[:, None, None])
        keep = r < 0.8 * rad
    else:
        keep = np.ones(L.shape, bool)
    ref = ndimage.median_filter(L, size=61)
    dark = (L < 0.8 * ref) & keep
    lab, n = ndimage.label(ndimage.binary_closing(dark, iterations=3))
    if n == 0: return None
    sizes = ndimage.sum(dark, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    y, x = ndimage.center_of_mass(dark, lab, k)
    return x, y, math.sqrt(sizes[k - 1] / math.pi)


def umbra(L):
    """The centroid (px) of the largest umbra in a group shot: the largest patch under half the
    bright photosphere's level."""
    dark = L < 0.5 * np.percentile(L, 90)
    lab, n = ndimage.label(dark)
    if n == 0: return None
    k = int(np.argmax(ndimage.sum(dark, lab, range(1, n + 1)))) + 1
    y, x = ndimage.center_of_mass(dark, lab, k)
    return x, y


def aim(view, x, y, fov):
    """Yaw and pitch that put shot pixel (x, y) at the middle of the view."""
    f = (H / 2) / math.tan(math.radians(fov) / 2)
    dx, dy = math.degrees(math.atan((x - W / 2) / f)), math.degrees(math.atan((y - H / 2) / f))
    return view['yaw'] + dx / math.cos(math.radians(view['pitch'])), view['pitch'] - dy


def field_km(fov, sun_rad):
    """The width of a square SQ px cut, in km on the drawn Sun."""
    w_deg = fov * SQ / H
    return w_deg / (2 * sun_rad * DISK_SCALE) * 2 * R_SUN


async def shoot(base):
    prof = tempfile.mkdtemp(prefix='sunfigs'); port = 9342
    p = subprocess.Popen([CHROME, '--headless=new', f'--remote-debugging-port={port}', '--use-angle=d3d11', '--hide-scrollbars',
                          f'--window-size={W},{H}', f'--user-data-dir={prof}', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    out = []
    try:
        for _ in range(100):
            try: tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json')); break
            except Exception: time.sleep(0.2)
        ws_url = [t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl']
        async with websockets.connect(ws_url, max_size=1 << 28) as ws:
            n = [0]
            async def call(m, **params):
                n[0] += 1; i = n[0]
                await ws.send(json.dumps({'id': i, 'method': m, 'params': params}))
                while True:
                    r = json.loads(await ws.recv())
                    if r.get('id') == i: return r
            async def ev(js): return (await call('Runtime.evaluate', expression=js, awaitPromise=True, returnByValue=True, timeout=120000))['result']['result'].get('value')
            async def png():
                await ev(JS_HIDE)
                return base64.b64decode((await call('Page.captureScreenshot', format='png'))['result']['data'])
            await call('Page.enable')
            await call('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=1, mobile=False)
            for key, label, date, t in EPOCHS:
                await call('Page.navigate', url=f'{base}/?cb={time.time()}')
                await asyncio.sleep(3); await ev(JS_HIDE)
                await ev(js_shot(dict(epoch=key, date=date, t=t, look={'find': 'Sun'}, fov=DISK_FOV, clouds=False, scenery=False, wait=8000)))
                v = await ev(JS_STATE)
                disk = await png()
                _, L = lum(disk)
                spot = darkest_patch(L, v['sunRad'] * DISK_SCALE / DISK_FOV * H)
                shots = [(disk, DISK_FOV)]
                if spot:
                    yaw, pitch = aim(v, spot[0], spot[1], DISK_FOV)
                    # The group: a field about 5 spot radii across, but no wider than a twelfth of the disk;
                    # then the group's largest umbra in a field a quarter as wide.
                    g_fov = min(DISK_FOV / 12, DISK_FOV * max(spot[2], 4) * 5 / H)
                    v2 = await ev(JS_AIM % (yaw, pitch, g_fov, 15000, JS_STATE))
                    grp = await png(); shots.append((grp, g_fov))
                    _, L2 = lum(grp)
                    s2 = umbra(L2)
                    if s2:
                        yaw2, pitch2 = aim(v2, s2[0], s2[1], g_fov)
                        f_fov = max(0.004, g_fov / 4)
                        await ev(JS_AIM % (yaw2, pitch2, f_fov, 15000, JS_STATE))
                        shots.append((await png(), f_fov))
                print(key, [round(f, 4) for _, f in shots], spot)
                out.append((key, label, shots, v['sunRad']))
    finally:
        p.kill()
    return out


def montage(series):
    pad, lab = 12, 46
    cols = len(series)
    sheet = Image.new('RGB', (cols * SQ + (cols - 1) * pad, 3 * SQ + 2 * pad + lab), (255, 255, 255))
    d = ImageDraw.Draw(sheet); fl, fs = font(40), font(30)
    for c, (key, label, shots, sun_rad) in enumerate(series):
        x = c * (SQ + pad)
        tw = d.textlength(label, font=fl); d.text((x + (SQ - tw) / 2, 2), label, fill=(20, 20, 20), font=fl)
        for r, (png, fov) in enumerate(shots):
            im = Image.open(io.BytesIO(png)).convert('RGB').crop(((W - SQ) // 2, 0, (W + SQ) // 2, SQ))
            y = lab + r * (SQ + pad)
            sheet.paste(im, (x, y))
            km = field_km(fov, sun_rad)
            txt = f'{round(km, 1 - int(math.floor(math.log10(km)))):,.0f} km'   # two significant figures
            d.text((x + 16, y + SQ - 46), txt + ' across', fill=(255, 255, 255), font=fs, stroke_width=2, stroke_fill=(0, 0, 0))
    sheet = sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS)
    sheet.save(OUT / 'sun_closeup.jpg', quality=92)
    print(OUT / 'sun_closeup.jpg', sheet.size)


if __name__ == '__main__':
    base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8767'
    montage(asyncio.run(shoot(base.rstrip('/'))))
