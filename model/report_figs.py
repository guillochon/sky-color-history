"""The report's views from the ground: screenshots of the site's walk-around view, taken in headless
Chrome over the Chrome DevTools Protocol, written to latex/figures/view_<name>.jpg for the paper
(gen_report.py embeds the same files in the HTML report).

Each shot is either one of the site's Moments (moments.js MOMENTS, opened as its card opens it)
or a view set here: epoch, latitude, date and clock time, where to look and how wide, a body
found and framed as the find tool frames it, clouds and scenery on or off. The clock is paused
and the overlay hidden before the shot.

The site must be served (python -m http.server -d site, or the site-alt preview on 8767):
    uv run report_figs.py [http://localhost:8767] [name ...]
"""
import asyncio, base64, json, os, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

import websockets

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'latex' / 'figures'
CHROME = os.environ.get('CHROME', r'C:/Program Files/Google/Chrome/Application/chrome.exe')
W, H = 1600, 900

# name: a Moment by title, or a view. look: [azimuth, elevation] or {'find': name} (framed by
# the find tool; fov scales its field), fov in degrees. gain raises the Milky Way's (mw) or the
# aurora's (aur) brightness over the page's for print (vrFigGain); its caption must say so.
SHOTS = {
    'hadean':       dict(moment='A Hadean evening, 4.5 Ga'),
    'aurora':       dict(moment='Aurora over the young Earth, 3.8 Ga', gain={'aur': 100}, wait=8000),
    'archean':      dict(moment='Archean afternoon, 2.7 Ga'),
    'ordovician':   dict(moment='Meteor storm and ring, 466 Ma'),
    'milkyway300':  dict(moment='The Milky Way, 300 Ma', gain={'mw': 80}, fov=80, wait=9000),
    'kpg':          dict(moment='Noon after the asteroid'),
    'geminga':      dict(moment='The Geminga supernova'),
    'town1815':     dict(moment='A town night in 1815'),
    # The Moment looks too high to show a town; this faces the city 2.8 km to the north-east, its
    # towers along the bottom of the frame.
    'city':         dict(epoch='modern', date='2026-07-08', t=1380, look=[35, 10], fov=30, wait=8000),
    'sats2100':     dict(moment='Satellites at dusk, 2100'),
    # Telescope views, framed by the find tool and zoomed past it.
    'jupiter':      dict(epoch='modern', date='2026-10-11', t=240, look={'find': 'Jupiter'}, zoom=0.55, clouds=False, wait=8000),
    'saturn':       dict(epoch='modern', date='2017-06-15', t=1410, look={'find': 'Saturn'}, zoom=0.29, clouds=False, wait=10000),
}

JS_HIDE = """(()=>{const s=document.createElement('style');s.textContent='.vrui,.vrhud,.vrtop,.vrbot,.vrkeys,.vrpad,.vrnote,.vrmini,.vrwalk,.vrstick,#vrtip,#vrload,#vrprep,#sunmark,#moonmark,#snmark{display:none!important}';document.head.appendChild(s);return 1})()"""

def js_shot(s):
    """The page script that sets up one shot and resolves when it has painted."""
    return """(async()=>{
  const sl=ms=>new Promise(r=>setTimeout(r,ms)), S=%s;
  // A look is [azimuth, elevation], or {find: name} (an array's own .find must not be mistaken for it).
  for(let i=0;i<80&&typeof openMoment!=='function';i++) await sl(250);
  if(S.moment){
    const m=MOMENTS.find(x=>x.title===S.moment); if(!m) return 'no moment '+S.moment;
    openMoment(m);
  } else {
    setEpoch(EP.findIndex(e=>e.key===S.epoch)); dLat=S.lat||'Mid-latitude';
    document.getElementById('moonDate').value=S.date; minutes=S.t; hslider.value=String(minutes); renderDay();
    if(S.clouds!==undefined) vrClouds=S.clouds;
    if(S.scenery!==undefined) vrScenery=S.scenery;
    vrEntryLook=()=>{ if(Array.isArray(S.look)){ vrYaw=S.look[0]; vrPitch=S.look[1]; } };
    enterVR(false); paintVR();
  }
  for(let i=0;i<120&&!vrOn;i++) await sl(250);
  await sl(2500);
  // Entering starts the clock, sometimes only after the shaders load: paused once it has started.
  for(let i=0;i<40&&!dayPlaying;i++) await sl(250);
  if(dayPlaying) document.getElementById('hplay').click();
  // The flight may not have ended; the view is then centered on the found thing itself.
  if(S.look&&!Array.isArray(S.look)){ const T=%s; findStart(T); await sl(9000); vrFind=null; const w=findWhere(T); if(w){ vrYaw=w.az; vrPitch=Math.asin(w.d[2])*180/Math.PI; } }
  if(S.gain) Object.assign(vrFigGain, S.gain);
  if(S.fov) vrFov=S.fov; else if(S.zoom) vrFov*=S.zoom;
  if(Array.isArray(S.look)&&!S.moment){ vrYaw=S.look[0]; vrPitch=S.look[1]; }
  requestVR(); await sl(S.wait||5000);
  if(dayPlaying){ document.getElementById('hplay').click(); requestVR(); await sl(1500); }
  return {epoch:EP[dIdx].key, fov:vrFov, yaw:vrYaw, pitch:vrPitch, playing:dayPlaying};
})()""" % (json.dumps(s), "{k:S.look.find==='Sun'?'sun':S.look.find==='Moon'?'moon':'body',name:S.look.find}")

async def run(base, names):
    prof = tempfile.mkdtemp(prefix='viewfigs')
    port = 9341
    p = subprocess.Popen([CHROME, '--headless=new', f'--remote-debugging-port={port}', '--use-angle=d3d11', '--hide-scrollbars',
                          f'--window-size={W},{H}', f'--user-data-dir={prof}', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
            await call('Page.enable')
            await call('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=1, mobile=False)
            for name in names:
                await call('Page.navigate', url=f'{base}/?cb={time.time()}')
                await asyncio.sleep(3)
                await call('Runtime.evaluate', expression=JS_HIDE, returnByValue=True)
                r = await call('Runtime.evaluate', expression=js_shot(SHOTS[name]), awaitPromise=True, returnByValue=True, timeout=120000)
                print(name, r.get('result', {}).get('result', {}).get('value', r))
                await call('Runtime.evaluate', expression=JS_HIDE, returnByValue=True)
                shot = await call('Page.captureScreenshot', format='jpeg', quality=90)
                (OUT / f'view_{name}.jpg').write_bytes(base64.b64decode(shot['result']['data']))
    finally:
        p.kill()

if __name__ == '__main__':
    base = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith('http') else 'http://localhost:8767'
    names = [a for a in sys.argv[1:] if not a.startswith('http')] or list(SHOTS)
    asyncio.run(run(base.rstrip('/'), names))
