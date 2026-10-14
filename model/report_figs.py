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
    'archean':      dict(moment='Hazy afternoon, 2.52 Ga'),
    'ordovician':   dict(moment='Meteor storm and ring, 466 Ma'),
    'kpg':          dict(moment='Noon after the asteroid'),
    'geminga':      dict(moment='The Geminga supernova'),
    'town1815':     dict(moment='A town night in 1815'),
    # The Moment looks too high to show a town; this faces the city 2.8 km to the north-east, its
    # towers along the bottom of the frame.
    'city':         dict(epoch='modern', date='2026-07-08', t=1380, look=[35, 10], fov=30, wait=8000),
    'sats2100':     dict(moment='Satellites at dusk, 2100'),
    # Telescope views, framed by the find tool and zoomed past it.
    'saturn':       dict(epoch='modern', date='2017-06-15', t=1410, look={'find': 'Saturn'}, zoom=0.29, clouds=False, wait=10000),
    # Jupiter (jup): over the nights from the date (nights of them), the Sun 18° down and Jupiter 30°
    # up or more, the time its Red Spot best faces us with Jupiter high; the frame's height span of
    # Jupiter's drawn radii, at aim
    # 0 on its centre or 1 on the Red Spot. The shot is turned so the equator lies level and cropped
    # (crop: its aspect; at: where across it the aim falls; fixed: the crop the same whatever the turn,
    # so the two disks match), in a square frame of size pixels that leaves room for the turn.
    # jupiter_montage() puts them together as view_jupiter.jpg: the spot at its largest (1879, as
    # long as the record gives it and at its reddest) and today, and today's spot close up.
    'jupiter_1879': dict(epoch='modern', date='1879-08-31', jup=dict(span=3.1, aim=0, nights=10), crop=1, fixed=True, size=2000, clouds=False, scenery=False, wait=8000),
    'jupiter_2026': dict(epoch='modern', date='2026-10-11', jup=dict(span=3.1, aim=0, nights=10), crop=1, fixed=True, size=2000, clouds=False, scenery=False, wait=8000),
    'jupiter_grs':  dict(epoch='modern', date='2026-10-11', jup=dict(span=1.3, aim=1, nights=10), crop=2, at=1/3, size=2600, clouds=False, scenery=False, wait=8000),
    # The proto-Earth's meteors: the whole sky at midnight on the page's fisheye dome (dome: the dome
    # alone, at twice the pixels), and the first ground strike after the date of magnitude −26 or
    # brighter with the Sun 18° down, at 80% of its fall (impact: the share of the fall), looked at
    # where it is halfway down. The weather's clouds are taken away (gain cloud 0), not the cloud
    # pass, which draws the bolide's dust trail.
    'proto_dome':   dict(epoch='protoearth455', date='2026-10-11', t=0, dome=True, wait=5000),
    'proto_impact': dict(epoch='protoearth455', date='2026-10-11', t=0, impact=0.8, minM=-26, fov=40, gain={'cloud': 0}, wait=12000),
    # Snowball Earth's diamond dust at mid-latitude, the morning Sun 22° up (sunEl: the first minute
    # of the date it reaches that height, the view turned to its azimuth): the 22° and 46° halos, the
    # sun dogs, the tangent arcs, the circumzenithal arc and the parhelic circle in one frame (wh: the
    # viewport's width and height).
    'halos':        dict(epoch='snowball07', date='2026-03-20', sunEl=22, look=[0, 37], fov=90, wh=(1600, 1280), clouds=False, wait=8000),
}

# The total solar eclipse figure: in each of these epochs the first total eclipse after
# ECL_FROM with the Sun at least 25° up at mid-eclipse (found as the site's t key finds them), shot
# at four moments: the partial phase 70 percent of the way to totality, the diamond ring just
# before second contact, mid-totality, and mid-totality wide with the horizon in view. The
# close-ups share one scale, so the Moon's size shows; they leave the scenery out, which a low Sun
# would sit behind. eclipse_montage() puts them together as view_eclipses.jpg.
ECL_EPOCHS = [('modern', 'Today'), ('carbon30', '300 Ma'), ('proterozoic22', '2.2 Ga'),
              ('archean27', '2.52 Ga, thick haze'), ('hadean40', '4.0 Ga')]
ECL_PHASES = [('partial', 'Partial phase'), ('ring', 'Diamond ring'), ('total', 'Totality'), ('wide', 'Totality, wide')]
ECL_FROM, ECL_FOV, ECL_WIDE = '2026-10-11', 14, 75
for _k, _ in ECL_EPOCHS:
    for _ph, _ in ECL_PHASES:
        SHOTS[f'ecl_{_k}_{_ph}'] = dict(epoch=_k, date=ECL_FROM, t=0, ecl=_ph, minEl=25, clouds=False, scenery=_ph == 'wide',
                                        fov=ECL_WIDE if _ph == 'wide' else ECL_FOV, wait=6000)

JS_HIDE = """(()=>{const s=document.createElement('style');s.textContent='.vrui,.vrhud,.vrtop,.vrbot,.vrkeys,.vrpad,.vrnote,.vrmini,.vrwalk,.vrstick,#vrtip,#vrload,#vrprep,#sunmark,#moonmark,#snmark{display:none!important}';document.head.appendChild(s);return 1})()"""

def js_shot(s):
    """The page script that sets up one shot and resolves when it has painted."""
    return """(async()=>{
  const sl=ms=>new Promise(r=>setTimeout(r,ms)), S=%s;
  let fixT=null, jupInfo=null;
  // A look is [azimuth, elevation], or {find: name} (an array's own .find must not be mistaken for it).
  for(let i=0;i<80&&typeof openMoment!=='function';i++) await sl(250);
  if(S.dome){
    setEpoch(EP.findIndex(e=>e.key===S.epoch)); dLat=S.lat||'Mid-latitude';
    document.getElementById('moonDate').value=S.date; minutes=S.t; hslider.value=String(minutes); renderDay();
    if(dayPlaying) document.getElementById('hplay').click();
    const d=document.getElementById('domeMet'); d.scrollIntoView({block:'center'}); await sl(S.wait);
    const r=d.getBoundingClientRect();
    return {epoch:EP[dIdx].key, meteors:MET.list.length, clip:{x:r.x+scrollX, y:r.y+scrollY, width:r.width, height:r.height, scale:1}};
  }
  if(S.moment){
    const m=MOMENTS.find(x=>x.title===S.moment); if(!m) return 'no moment '+S.moment;
    openMoment(m);
  } else {
    setEpoch(EP.findIndex(e=>e.key===S.epoch)); dLat=S.lat||'Mid-latitude';
    document.getElementById('moonDate').value=S.date; minutes=S.t||0; hslider.value=String(minutes); renderDay();
    if(S.clouds!==undefined) vrClouds=S.clouds;
    if(S.scenery!==undefined) vrScenery=S.scenery;
    if(S.ecl){
      // The next total eclipse, its partial phase, and the moment this shot shows.
      let after=pageMs(), ev=null;
      for(let n=0;n<40;n++){ ev=findNextEclipse(after, true); if(!ev||ev.type==='total'&&eclipseAt((ev.start+ev.end)/2).el>=S.minEl) break; after=ev.start+1000; }
      if(!ev) return 'no total eclipse';
      const p=findNextEclipse(ev.start-0.4*86400000, false), mid=(ev.start+ev.end)/2;
      let t=mid;
      if(S.ecl==='partial') t=p.start+0.7*(ev.start-p.start);
      if(S.ecl==='ring'){
        // The sliver left (the disks as drawn) at half a percent of the Sun's width: beads and the ring.
        const w=ms=>eclipseGap(ms, true)-0.005*2*DISK_SCALE*eclipseAt(ms).rS;
        let lo=ev.start-3600000, hi=ev.start;
        for(let i=0;i<40;i++){ const m=(lo+hi)/2; if(w(m)>0) lo=m; else hi=m; }
        t=lo;
      }
      fixT=()=>{ const at=pageAt(dayOfMs(t)); document.getElementById('moonDate').value=at.date; minutes=at.min; hslider.value=String(minutes); renderDay();
        const g=sunGeom(LATDEG[dLat], minutes), el=90-g.sza; vrYaw=g.az; vrPitch=S.ecl==='wide'?Math.min(el, S.fov/2-6):el; };
      fixT();
    }
    if(S.sunEl){
      let m=0; while(m<720&&90-sunGeom(LATDEG[dLat], m).sza<S.sunEl) m++;
      fixT=()=>{ minutes=m; hslider.value=String(minutes); renderDay(); vrYaw=sunGeom(LATDEG[dLat], m).az; vrPitch=S.look[1]; };
      fixT();
    }
    if(S.impact){
      // The ground strikes listed about the date, the first bright enough by night.
      const I=metImpacts(astroDay()*86400), m=I.next.find(q=>q.M<=S.minM&&90-sunGeom(LATDEG[dLat], pageAt(q.t0/86400).min).sza<-18);
      if(!m) return 'no impact';
      fixT=()=>{ const at=pageAt((m.t0+S.impact*m.T)/86400); document.getElementById('moonDate').value=at.date; minutes=at.min; hslider.value=String(minutes); renderDay();
        const a=metApparent(m, 0.5, extK(S.epoch)); vrYaw=(Math.atan2(a.dir[0], a.dir[1])*180/Math.PI+360)%%360; vrPitch=a.el; };
      fixT();
    }
    if(S.jup){
      // Jupiter (kind 3), the Red Spot's surface normal (22.4° south planetographic, 19.9°
      // planetocentric) and how squarely it faces us; the spot sits on the drawn disk at that normal.
      const J=()=>skyNow.bodies.find(b=>b.kind===3), lat=-19.9*Math.PI/180;
      const spot=b=>{ const g=b.grs, n=vadd(vscale(g.dir, Math.cos(lat)), vscale(b.pole, Math.sin(lat)), [0, 0, 0]); return {n, face:-vdot(n, b.dir)}; };
      const setT=([dt, m])=>{ document.getElementById('moonDate').value=dt; minutes=m; hslider.value=String(minutes); renderDay(); };
      // The nights from the date on (nights of them), every 4 minutes: Jupiter 30° up or more,
      // and the spot most squarely toward us, then Jupiter highest.
      let best=null, bs=-9;
      for(let n=0;n<(S.jup.nights||1);n++){
        const dt=new Date(Date.parse(S.date+'T00:00Z')+n*864e5).toISOString().slice(0, 10);
        for(let m=0;m<1440;m+=4){
          setT([dt, m]); const b=J();
          if(!b||!b.grs||90-skyNow.sza>-18) continue;
          const el=Math.asin(b.dir[2]), s=spot(b).face+0.5*Math.sin(el);
          if(el>30*Math.PI/180&&s>bs){ bs=s; best=[dt, m]; }
        }
      }
      if(best===null) return 'no Jupiter';
      fixT=()=>{ setT(best); const b=J(), R=b.rad, sp=spot(b);
        const o=vscale(vadd(sp.n, vscale(b.dir, -vdot(sp.n, b.dir)), [0, 0, 0]), R*S.jup.aim), d=vnorm(vadd(b.dir, o, [0, 0, 0]));
        const el=Math.asin(d[2])*180/Math.PI;
        vrYaw=(Math.atan2(d[0], d[1])*180/Math.PI+360)%%360; vrPitch=shaderApparent(el).a; vrFov=S.jup.span*R*180/Math.PI;
        // The pole's direction on the screen, clockwise from up, by the view's own axes.
        const y=vrYaw*Math.PI/180, p=vrPitch*Math.PI/180, P=b.pole;
        const px=P[0]*Math.cos(y)-P[1]*Math.sin(y), py=-P[0]*Math.sin(y)*Math.sin(p)-P[1]*Math.cos(y)*Math.sin(p)+P[2]*Math.cos(p);
        jupInfo={roll:Math.atan2(px, py)*180/Math.PI, face:sp.face, el:Math.asin(b.dir[2])*180/Math.PI, L:b.grs.L}; };
      fixT();
    }
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
  if(fixT) fixT();
  requestVR(); await sl(S.wait||5000);
  if(dayPlaying){ document.getElementById('hplay').click(); if(fixT) fixT(); requestVR(); await sl(1500); }
  return {epoch:EP[dIdx].key, fov:vrFov, yaw:vrYaw, pitch:vrPitch, playing:dayPlaying, date:document.getElementById('moonDate').value, t:minutes, eclipse:skyNow.eclipse, jup:jupInfo};
})()""" % (json.dumps(s), "{k:S.look.find==='Sun'?'sun':S.look.find==='Moon'?'moon':'body',name:S.look.find}")

def font(px):
    from PIL import ImageFont
    for f in ('C:/Windows/Fonts/arial.ttf', '/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        try: return ImageFont.truetype(f, px)
        except OSError: pass
    return ImageFont.load_default()

def eclipse_montage():
    """The eclipse shots as one figure: an epoch a row, the three close-ups cropped square and the
    wide view at its own 16:9, with the phases over the columns and the epochs down the left."""
    from PIL import Image, ImageDraw
    S, WW, gap, top, left = 400, 711, 6, 44, 44
    cols = [(S if ph != 'wide' else WW) for ph, _ in ECL_PHASES]
    W = left + sum(cols) + gap * (len(cols) - 1)
    H = top + len(ECL_EPOCHS) * S + gap * (len(ECL_EPOCHS) - 1)
    sheet = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(sheet); f = font(26)
    x = left
    for (ph, lab), cw in zip(ECL_PHASES, cols):
        d.text((x + (cw - d.textlength(lab, font=f)) / 2, 8), lab, fill=(30, 30, 30), font=f); x += cw + gap
    for r, (k, lab) in enumerate(ECL_EPOCHS):
        y, x = top + r * (S + gap), left
        for (ph, _), cw in zip(ECL_PHASES, cols):
            im = Image.open(OUT / f'view_ecl_{k}_{ph}.jpg')
            if ph != 'wide':
                # The close-ups: the middle 720 pixels square, with the Sun at the centre.
                cx, cy = im.width // 2, im.height // 2
                im = im.crop((cx - 360, cy - 360, cx + 360, cy + 360))
            sheet.paste(im.resize((cw, S), Image.LANCZOS), (x, y)); x += cw + gap
        t = Image.new('RGB', (S, left), (255, 255, 255)); td = ImageDraw.Draw(t)
        td.text(((S - td.textlength(lab, font=f)) / 2, 6), lab, fill=(30, 30, 30), font=f)
        sheet.paste(t.rotate(90, expand=True), (0, y))
    sheet.save(OUT / 'view_eclipses.jpg', quality=90)
    print(OUT / 'view_eclipses.jpg', sheet.size)

def proto_montage():
    """The proto-Earth's meteors as one figure: the dome on the left, the impact on the right,
    cropped to 4:3 about its middle, at the dome's height."""
    from PIL import Image
    a, b = Image.open(OUT / 'view_proto_dome.jpg'), Image.open(OUT / 'view_proto_impact.jpg')
    b = b.crop(((b.width - b.height * 4 // 3) // 2, 0, (b.width + b.height * 4 // 3) // 2, b.height))
    b = b.resize((a.height * 4 // 3, a.height), Image.LANCZOS)
    gap = 12
    sheet = Image.new('RGB', (a.width + gap + b.width, a.height), (255, 255, 255))
    sheet.paste(a, (0, 0)); sheet.paste(b, (a.width + gap, 0))
    sheet.save(OUT / 'view_proto_meteors.jpg', quality=90)
    print(OUT / 'view_proto_meteors.jpg', sheet.size)

def level_crop(path, roll, aspect, at=0.5, fixed=False):
    """A Jupiter shot turned by roll degrees so its pole points up and its equator lies level, cropped
    to the given aspect (width over height) with the frame's middle at the fraction at of the way
    across, as large as the turned frame leaves whole. fixed sizes the crop for the worst turn, 45°,
    whatever the roll, so shots of one span show Jupiter at one size."""
    import math
    from PIL import Image
    im = Image.open(path).rotate(roll, resample=Image.BICUBIC)
    r = 45 if fixed else roll
    a, c, s = im.width, abs(math.cos(math.radians(r))), abs(math.sin(math.radians(r)))
    def fits(w):
        h, x0 = w / aspect, -at * w
        # Each corner, turned back into the shot's own frame, must lie inside it.
        return all(abs(x * c - y * s) <= a / 2 and abs(x * s + y * c) <= a / 2
                   for x in (x0, x0 + w) for y in (-h / 2, h / 2))
    lo, hi = 0, a
    for _ in range(30):
        m = (lo + hi) / 2; lo, hi = (m, hi) if fits(m) else (lo, m)
    w, h = int(lo), int(lo / aspect)
    x = a // 2 - int(at * w)
    im.crop((x, (a - h) // 2, x + w, (a - h) // 2 + h)).save(path, quality=92)

def jupiter_montage():
    """The Jupiter figure: the two disks side by side, the spot at its largest and today, labeled
    over each, and today's spot close up below at the full width."""
    from PIL import Image, ImageDraw
    a, b, c = (Image.open(OUT / f'view_jupiter_{k}.jpg') for k in ('1879', '2026', 'grs'))
    gap, top, Wd = 12, 44, 1800
    s = (Wd - gap) // 2
    ch = Wd // 2
    sheet = Image.new('RGB', (Wd, top + s + gap + ch), (255, 255, 255)); d = ImageDraw.Draw(sheet); f = font(26)
    for i, (im, lab) in enumerate(((a, '1879: the Red Spot at its largest'), (b, '2026'))):
        x = i * (s + gap)
        d.text((x + (s - d.textlength(lab, font=f)) / 2, 8), lab, fill=(30, 30, 30), font=f)
        sheet.paste(im.resize((s, s), Image.LANCZOS), (x, top))
    sheet.paste(c.resize((Wd, ch), Image.LANCZOS), (0, top + s + gap))
    sheet.save(OUT / 'view_jupiter.jpg', quality=90)
    print(OUT / 'view_jupiter.jpg', sheet.size)

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
                # The dome alone is shot, its canvases drawn at twice the pixels.
                sz = SHOTS[name].get('size'); w, h = SHOTS[name].get('wh') or (sz or W, sz or H)
                await call('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=2 if SHOTS[name].get('dome') else 1, mobile=False)
                # A shot that comes back without its view (the walk-around view not entered, or a
                # Jupiter shot without Jupiter) is taken again, and stops the run on the third try
                # rather than saving the page behind it.
                for attempt in range(3):
                    await call('Page.navigate', url=f'{base}/?cb={time.time()}')
                    await asyncio.sleep(3)
                    await call('Runtime.evaluate', expression=JS_HIDE, returnByValue=True)
                    r = await call('Runtime.evaluate', expression=js_shot(SHOTS[name]), awaitPromise=True, returnByValue=True, timeout=120000)
                    v = r.get('result', {}).get('result', {}).get('value')
                    print(name, v if v is not None else r)
                    if isinstance(v, dict) and (v.get('clip') or v.get('fov')) and (v.get('jup') or not SHOTS[name].get('jup')): break
                else:
                    raise SystemExit(f'{name}: no view after 3 tries')
                await call('Runtime.evaluate', expression=JS_HIDE, returnByValue=True)
                clip = v.get('clip') if isinstance(v, dict) else None
                shot = await call('Page.captureScreenshot', format='jpeg', quality=90, **({'clip': clip} if clip else {}))
                (OUT / f'view_{name}.jpg').write_bytes(base64.b64decode(shot['result']['data']))
                if isinstance(v, dict) and v.get('jup'): level_crop(OUT / f'view_{name}.jpg', v['jup']['roll'], SHOTS[name]['crop'], SHOTS[name].get('at', 0.5), SHOTS[name].get('fixed', False))
    finally:
        p.kill()

if __name__ == '__main__':
    base = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith('http') else 'http://localhost:8767'
    # 'eclipses', 'proto' or 'jupiter' alone rebuilds that figure from the shots already taken.
    names = [a for a in sys.argv[1:] if not a.startswith('http')] or list(SHOTS)
    shots = [n for n in names if n in SHOTS]
    if shots: asyncio.run(run(base.rstrip('/'), shots))
    if 'eclipses' in names or any(n.startswith('ecl_') for n in names): eclipse_montage()
    if 'proto' in names or any(n.startswith('proto_') for n in names): proto_montage()
    if 'jupiter' in names or any(n.startswith('jupiter_') for n in names): jupiter_montage()
