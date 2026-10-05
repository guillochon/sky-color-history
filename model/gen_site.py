import json
D = json.load(open('/home/claude/skycolors.json'))
LIMB = json.load(open('/home/claude/limb_all.json'))
DAY = json.load(open('/home/claude/daycycle.json'))
import io, contextlib
ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(open('/home/claude/gen_report.py').read(), ns)
PROSE = ns['PROSE']
order = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','carbon30','kpg66','volcanic','modern','modernpoll']
ages = {'hadean44':'4.4 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27thin':'2.7 Ga','archean27':'2.7 Ga','archean27vthick':'2.7 Ga','proterozoic22':'2.2 Ga','snowball07':'700 Ma','carbon30':'300 Ma','kpg66':'66 Ma','volcanic':'1815 CE','modern':'Today','modernpoll':'Today'}
short = {'hadean44':'Early Hadean','hadean40':'Late Hadean','archean38':'Early Archean','archean27thin':'Thin haze','archean27':'Thick haze','archean27vthick':'Very thick haze','proterozoic22':'Post-oxidation','snowball07':'Snowball Earth','carbon30':'Carboniferous','kpg66':'Impact winter','volcanic':'Volcanic year','modern':'Clean air','modernpoll':'Polluted city'}
byk = {r['key']: r for r in D}
EP = []
for k in order:
    r = byk[k]
    EP.append(dict(key=k, name=r['name'], sub=r['sub'].replace('tau(550nm)','τ(550 nm)'), age=ages[k], short=short[k], prose=PROSE[k],
                   lat={L: dict(z=[v['zenith']['x'], v['zenith']['y'], v['zenith']['Y']], h=[v['horizon']['x'], v['horizon']['y'], v['horizon']['Y']],
                                zc=int(v['zenith']['cct']), hc=int(v['horizon']['cct'])) for L, v in r['lat'].items()},
                   limb=LIMB[k]))
YREF = byk['modern']['lat']['Equator']['zenith']['Y']

html = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Earth's Sky Through Time</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,700;1,6..72,300;1,6..72,400&display=swap" rel="stylesheet">
<style>
:root{--bg:#dfe2e8;--bg2:#cfd3db;--ink:#1a2130;--ink2:#4a5263;--rule:#a4aab6;--space:#0a0c12;--stage:#6f737b;--accent:#1a2130;
 box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171b24;--bg2:#1f2430;--ink:#e9ebef;--ink2:#aeb4c0;--rule:#3d4453;--accent:#e9ebef}}
:root[data-theme="dark"]{--bg:#171b24;--bg2:#1f2430;--ink:#e9ebef;--ink2:#aeb4c0;--rule:#3d4453;--accent:#e9ebef}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Newsreader,Georgia,"Times New Roman",serif;font-weight:300;font-size:18px;line-height:1.45}
main{max-width:1100px;margin:0 auto;padding:1rem 1rem 4rem}
h1{font-weight:300;font-size:clamp(2rem,6vw,3.6rem);line-height:1.02;margin:0;letter-spacing:-.01em}
h1 em{font-style:italic}
h2{font-weight:400;font-size:1.6rem;margin:2.6rem 0 .3rem;line-height:1.1}
p{margin:.35rem 0 .8rem;max-width:64ch}
.lede{color:var(--ink2);font-size:1.1rem}
.stage{background:var(--space);border-radius:4px;overflow:hidden;position:relative}
.stage.light{background:var(--stage)}
canvas{display:block;width:100%;height:auto}
.row{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:1.2rem;align-items:start}
@media (max-width:760px){.row{grid-template-columns:1fr}}
.controls{display:flex;flex-wrap:wrap;gap:.6rem 1rem;align-items:center;margin:.7rem 0 .2rem}
button{font:inherit;font-size:.95rem;color:var(--ink);background:var(--bg2);border:1px solid var(--rule);border-radius:3px;padding:.28rem .8rem;cursor:pointer}
button[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
select{font:inherit;font-size:.95rem;color:var(--ink);background:var(--bg2);border:1px solid var(--rule);border-radius:3px;padding:.28rem .5rem;max-width:100%}
input[type=range]{width:100%;accent-color:var(--ink);margin:.4rem 0}
.track{position:relative;height:3.6rem;margin:0 1.4rem}
#ttrack{height:5.2rem}
#tslider,#hslider{width:calc(100% - 2.8rem);margin:.4rem 1.4rem}
.tick{position:absolute;top:0;transform:translateX(-50%);font-size:.72rem;color:var(--ink2);text-align:center;white-space:nowrap;line-height:1.15;cursor:pointer}
button.tick{background:none;border:none;border-radius:0;padding:0;font-weight:400}
.tick.row1{top:1.15rem}.tick.row1 i{height:26px;margin-top:-18px}
.tick.on{z-index:2;color:var(--ink);font-weight:700}
button.tick.on{background:none;color:var(--ink)}
.tick i{display:block;width:1px;height:8px;background:var(--rule);margin:0 auto 3px}
.tick .name{display:none;position:absolute;left:50%;top:3.2rem;transform:translateX(-50%);background:var(--ink);color:var(--bg);font-weight:400;font-size:.75rem;line-height:1.2;padding:.12rem .45rem;border-radius:3px;pointer-events:none;z-index:6;white-space:nowrap}
.tick.row1 .name{top:2.05rem}
.tick:hover .name,.tick:focus-visible .name{display:block}
.readout{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.4rem 1rem;font-size:.92rem;color:var(--ink2);margin:.5rem 0}
.readout b{display:block;font-weight:400;color:var(--ink);font-size:1.15rem}
.domes{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;background:var(--stage);padding:.5rem;border-radius:4px}
.domes figure{margin:0}.domes .sky{height:110px;border-radius:2px}
.domes figcaption{font-size:.78rem;color:#f2f3f5;margin-top:.3rem;line-height:1.2}
.domes figcaption small{display:block;color:#cfd3da;font-size:.7rem}
.epoch-title{margin:.2rem 0 0;font-size:1.45rem;font-weight:400;line-height:1.15}
.epoch-sub{color:var(--ink2);font-size:.95rem;margin:0 0 .15rem}
.epoch-wiki{color:var(--ink2);font-size:.85rem;margin:0 0 .6rem}
.epoch-wiki a{color:inherit}
.swatchbar{display:flex;gap:2px;height:26px;border-radius:2px;overflow:hidden;background:var(--stage);padding:2px;margin:.4rem 0}
.swatchbar i{flex:1}
.legend{font-size:.8rem;color:var(--ink2)}
.foot{border-top:1px solid var(--rule);margin-top:3rem;padding-top:1rem;font-size:.9rem;color:var(--ink2)}
.foot a{color:inherit}
.hint{font-size:.85rem;color:var(--ink2)}
@media (max-width:760px){.tick .lb{visibility:hidden}.tick.on .lb{visibility:visible}.tick:first-child .lb,.tick:last-child .lb{visibility:visible}.tick.on .lb{background:var(--bg);padding:0 .3rem}}
.tick.on .lb{background:var(--bg);padding:0 .3rem;border-radius:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}.vrbtn{animation:none}}
.tip{position:absolute;pointer-events:none;background:rgba(20,22,30,.92);color:#fff;font-size:.85rem;padding:.3rem .5rem .3rem .35rem;border-radius:3px;display:none;white-space:nowrap;z-index:5;transform:translate(14px,-50%)}
.tip i{display:inline-block;width:1.1em;height:1.1em;border-radius:2px;vertical-align:-3px;margin-right:.4em;border:1px solid rgba(255,255,255,.5)}
.stage canvas{cursor:crosshair}
.titlebar{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:1rem 0 .4rem}
.titlebar h1{margin:0}
.repo{display:inline-flex;align-items:center;gap:.4rem;color:var(--ink2);font-size:.95rem;text-decoration:none;white-space:nowrap}
.repo svg{width:1.05em;height:1.05em;display:block;fill:currentColor}
.repo:hover{color:var(--ink)}
.titlelinks{display:flex;flex-direction:column;align-items:flex-end;gap:.2rem}
.report{color:var(--ink2);font-size:.95rem;white-space:nowrap}
.report:hover{color:var(--ink)}
@keyframes vrpulse{0%,100%{transform:scale(1);box-shadow:0 0 0 4px rgba(255,196,0,.5),0 8px 24px rgba(0,0,0,.45)}50%{transform:scale(1.08);box-shadow:0 0 0 14px rgba(255,196,0,0),0 10px 28px rgba(0,0,0,.5)}}
.vrbtn{position:absolute;top:.55rem;right:.55rem;z-index:6;color:#1c1400;background:#ffc400;border:2px solid #fff4c2;font-size:1.35rem;font-weight:700;letter-spacing:.14em;padding:.5rem 1.15rem;border-radius:6px;box-shadow:0 0 0 4px rgba(255,196,0,.45),0 8px 24px rgba(0,0,0,.45);animation:vrpulse 1.8s ease-in-out infinite}
.vrbtn:hover{color:#1c1400;background:#ffd84a}
#vr{display:none;position:fixed;inset:0;z-index:40;background:#000;overflow:hidden;cursor:none}
#vr.on{display:block}
#vr canvas{position:absolute;inset:0;width:100%;height:100%;cursor:none}
.aim{position:absolute;width:36px;height:36px;margin:-18px 0 0 -18px;pointer-events:none;color:#fff}
.aim .chev{display:block;width:100%;height:100%;overflow:visible}
.aim .badge{position:absolute;left:50%;top:50%;width:18px;height:18px;overflow:visible}
#sunmark{z-index:7}
#sunmark .badge{width:36px;height:36px}
#moonmark{z-index:6;color:#e8e8ea}
#moonDate{font:inherit;font-size:.95rem;color:var(--ink);background:var(--bg2);border:1px solid var(--rule);border-radius:3px;padding:.22rem .45rem}
.vrhud{position:absolute;inset:0;pointer-events:none;color:#fff;font-size:.98rem}
.vrtop,.vrbot{position:absolute;left:0;right:0;display:flex;justify-content:space-between;gap:1rem;padding:.85rem 1.15rem;text-shadow:0 1px 3px #000}
.vrtop{top:0;background:linear-gradient(rgba(8,10,16,.6),transparent);align-items:flex-start}
.vrbot{bottom:0;background:linear-gradient(transparent,rgba(8,10,16,.62));align-items:flex-end}
.vrkeys{display:flex;flex-wrap:wrap;gap:.3rem 1rem}
.vrkeys kbd{font:inherit;font-size:.88rem;border:1px solid rgba(255,255,255,.55);border-radius:3px;padding:0 .38rem;margin-right:.3rem;background:rgba(8,10,16,.5)}
.vrnote{max-width:48ch;text-align:right;font-size:.82rem;opacity:.9}
#vrclock{font-size:1.25rem}
.vrpad{display:none}
.vrpad-row{display:flex;justify-content:center;gap:.45rem}
.vrpad button,.vrplay{width:2.75rem;height:2.75rem;padding:0;display:inline-flex;align-items:center;justify-content:center;color:#fff;background:rgba(8,10,16,.5);border:1px solid rgba(255,255,255,.5);border-radius:10px;touch-action:manipulation}
.vrpad button[aria-pressed="true"],.vrplay[aria-pressed="true"]{color:#1c1400;background:#ffc400;border-color:#fff4c2}
.vrpad button svg,.vrplay svg{width:1.4rem;height:1.4rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.vrtop-right{display:flex;align-items:flex-start;gap:.55rem}
.vrplay{display:none;pointer-events:auto;flex:none}
.vrplay .icon-play{display:none}
.vrplay[aria-pressed="false"] .icon-pause{display:none}
.vrplay[aria-pressed="false"] .icon-play{display:block}
@media (hover:none) and (pointer:coarse), (max-width:820px) and (pointer:coarse){
  .vrkeys,.vrnote{display:none}
  .vrpad{display:flex;flex-direction:column;gap:.45rem;width:100%;pointer-events:auto;padding-bottom:env(safe-area-inset-bottom,0px)}
  .vrplay{display:inline-flex}
  .vrtop{padding-top:max(.85rem, env(safe-area-inset-top, 0px))}
  #vr,#vr canvas{cursor:auto}
}
</style></head><body><main>
<div class="titlebar"><h1>Earth's sky <em>through time</em></h1><div class="titlelinks"><a class="repo" href="https://github.com/guillochon/sky-color-history"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.65-.18 1.35-.27 2.04-.27.68 0 1.35.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>GitHub</a><a class="report" href="main.pdf">see full report here</a></div></div>
<p class="lede">An interactive companion to the sky-color reconstruction. Scrub the timeline to watch the atmosphere change from the steam-and-CO₂ Hadean to today, then pick an epoch and scrub through a day to see how its sky moved from dawn to dusk. Every color comes from the same spectral radiative-transfer model as the report.</p>

<h2>Four and a half billion years</h2>
<p class="hint">The globe is seen from space at equinox with the Sun behind you, so latitude runs from the equator at the center line to the poles at top and bottom. The atmosphere is drawn 30× too thick so that altitude structure shows.</p>
<div class="row">
 <div>
  <div class="stage" id="gstage"><div class="tip" id="gtip"></div><canvas id="globe" width="720" height="720" aria-label="Volumetric rendering of Earth's atmosphere for the selected epoch"></canvas></div>
  <input id="tslider" type="range" min="0" max="12" step="0.01" value="11" aria-label="Epoch">
  <div class="track" id="ttrack"></div>
  <div class="controls"><button id="tplay" aria-pressed="false">Play</button><span class="hint">or drag the slider; ← → keys step</span></div>
 </div>
 <div>
  <h3 class="epoch-title" id="tname"></h3>
  <p class="epoch-sub" id="tsub"></p>
  <p class="epoch-wiki"><a id="twiki" href="https://en.wikipedia.org/wiki/Holocene" target="_blank" rel="noopener noreferrer">Holocene on Wikipedia</a></p>
  <div class="domes" id="tdomes"></div>
  <p class="legend">Noon sky, zenith at top and horizon at bottom, at the equator, mid-latitudes and the summer pole; the Sun's disk in its own color and brightness. Brightness relative to today's clean sky.</p>
  <p id="tprose"></p>
 </div>
</div>

<h2>A day under that sky</h2>
<p class="hint">A whole-sky (fisheye) view: the zenith is at the center and the horizon is the rim, north at the top. Equinox geometry, so the Sun rises due east at 6:00 and sets due west at 18:00 everywhere; at the poles the noon Sun sits only 15° above the horizon. The Moon is placed for the selected date and clock time at the selected latitude, on your time zone's central meridian. On this dome the Sun and Moon are enlarged together so the phase stays readable; in the VR view both are drawn at four times their true angular size. Moonlight is the same sky grid as sunlight, added on top, with the Moon at its own place in the sky. Its brightness follows the lunar phase and the Moon's angular size at that epoch. When the Moon covers part of the Sun, sunlight throughout the sky is scaled by the fraction of that drawn solar disk still visible, so a partial eclipse is more common than for the true sizes, and a true overlap is still covered. The thousand brightest stars are drawn on this dome and in the VR view at their present-day places. The faintest of them is a single pixel, and size grows with brightness so that the hundred brightest keep the sizes they already had.</p>
<div class="row">
 <div>
  <div class="stage" id="dstage"><button type="button" id="vrbtn" class="vrbtn" title="Full-screen view: look around while the day plays">VR</button><div class="tip" id="dtip"></div><canvas id="dome" width="600" height="600" aria-label="Whole-sky view for the selected epoch, latitude and time of day"></canvas></div>
  <input id="hslider" type="range" min="0" max="1440" step="5" value="720" aria-label="Time of day (minutes)">
  <div class="track" id="htrack"></div>
  <div class="controls">
   <button id="hplay" aria-pressed="false">Play</button>
   <span id="hclock" style="font-size:1.2rem;min-width:5.5ch"></span>
   <label>Date <input id="moonDate" type="date" aria-label="Date for the Moon"></label>
   <button id="expo" aria-pressed="false" title="Normalize brightness so that color is visible in dim skies">Auto-exposure</button>
  </div>
 </div>
 <div>
  <div class="controls">
   <select id="depoch" aria-label="Epoch"></select>
   <span role="group" aria-label="Latitude"><button data-lat="Equator" aria-pressed="false">Equator</button> <button data-lat="Mid-latitude" aria-pressed="true">45°</button> <button data-lat="Polar" aria-pressed="false">75°</button></span>
  </div>
  <div class="readout">
   <div>Sun elevation<b id="relev"></b></div>
   <div>Zenith<b id="rzen"></b></div>
   <div>Horizon (side)<b id="rhor"></b></div>
   <div>Sun's disk<b id="rsun"></b></div>
   <div>Moon<b id="rmoon"></b></div>
  </div>
  <div class="swatchbar" id="hbar"></div>
  <p class="legend">Sky along the Sun's vertical: from the horizon under the Sun, up through the zenith, down to the opposite horizon.</p>
  <p id="dprose" class="hint"></p>
 </div>
</div>

<div class="foot">Model and data: spherical-shell single scattering with a delta-Eddington multiple-scattering correction, 380–780 nm, CIE 1931 color matching, sRGB output without chromatic adaptation. Colors are what a daylight-balanced camera would record, not what an adapted eye would perceive. Clouds are omitted; paleoatmosphere compositions carry order-of-magnitude uncertainty. Time of day is interpolated between 34 computed solar zenith angles. From the horizon to 20° below it, those samples are spaced 1° apart; from 20° to 30° below, that last sky fades to black. The plane-parallel multiple-scattering term fades out from 10° above the horizon through sunrise. The Moon is a NASA LROC color map (SVS CGI Moon Kit). Moonlight is that same sky grid with the Moon in place of the Sun, added to the sunlight, and scaled by the Allen phase law (Krisciunas &amp; Schaefer 1991) and by the square of the Moon's angular size at that epoch. Its phase is the angle between it and the Sun drawn here. A partial solar eclipse scales that sunlight by the fraction of the drawn solar disk the Moon leaves uncovered. Its size follows the Earth–Moon distance at each epoch: cyclostratigraphic distances from Farhat et al. 2022, and about 70% of today's distance at 3.2 Ga from the Moodies Group (Eulenfeld &amp; Heubeck 2023). Ages older than 3.2 Ga extend that trend and stay beyond 30 Earth radii. The thousand brightest stars are Yale Bright Star Catalogue places (Hoffleit &amp; Warren 1991), carried from J2000 to the year on the clock by precession and proper motion. The faintest is a single pixel, and size grows with brightness so that the hundred brightest keep the sizes they already had.</div>
</main>
<div id="vr" aria-hidden="true">
<canvas id="vrc"></canvas>
<div id="sunmark" class="aim" hidden><svg class="chev" viewBox="0 0 36 36" aria-hidden="true"><path d="M7 24 L18 8 L29 24" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 24 L18 8 L29 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#000" stroke-width="3.2" stroke-linecap="round"><path d="M12 1.6v3M12 19.4v3M1.6 12h3M19.4 12h3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M19.5 4.5l-2.1 2.1M6.6 17.4l-2.1 2.1"/></g><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 1.6v3M12 19.4v3M1.6 12h3M19.4 12h3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M19.5 4.5l-2.1 2.1M6.6 17.4l-2.1 2.1"/></g><circle cx="12" cy="12" r="4.3" fill="#000"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg></div>
<div id="moonmark" class="aim" hidden><svg class="chev" viewBox="0 0 36 36" aria-hidden="true"><path d="M7 24 L18 8 L29 24" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 24 L18 8 L29 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><canvas class="badge" id="moonphase" width="64" height="64" aria-hidden="true"></canvas></div>
<div class="vrhud">
  <div class="vrtop"><div id="vrplace"></div><div class="vrtop-right"><div id="vrclock"></div><button type="button" id="vrpad-play" class="vrplay" data-act="play" aria-pressed="true" aria-label="Pause"><svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z"/></svg></button></div></div>
  <div class="vrbot">
    <div class="vrkeys"><span>mouse looks</span><span><kbd>w</kbd><kbd>a</kbd><kbd>s</kbd><kbd>d</kbd> move</span><span><kbd>shift</kbd> faster</span><span><kbd>h</kbd> scenery</span><span><kbd>c</kbd> clouds</span><span><kbd>m</kbd> <span id="vrmusiclabel">music</span></span><span><kbd>esc</kbd> leave</span><span><kbd>space</kbd> play / pause</span><span><kbd>←</kbd><kbd>→</kbd> step time</span><span><kbd>↑</kbd><kbd>↓</kbd> change era</span><span><kbd>e</kbd> next eclipse</span></div>
    <div class="vrnote">The plain, the shapes, and the clouds are scenery. The sky is the model.</div>
    <div class="vrpad" role="toolbar" aria-label="View controls">
      <div class="vrpad-row">
        <button type="button" id="vrpad-scenery" data-act="scenery" aria-pressed="true" aria-label="Scenery"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19l6-11 4 6 3-4 5 9z"/></svg></button>
        <button type="button" id="vrpad-clouds" data-act="clouds" aria-pressed="true" aria-label="Clouds"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6-1.6A3.5 3.5 0 0 0 7 18z"/></svg></button>
        <button type="button" id="vrpad-music" data-act="music" aria-pressed="true" aria-label="Music"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v10"/><circle cx="7" cy="18" r="2.4" fill="currentColor" stroke="none"/><circle cx="17" cy="14" r="2.4" fill="currentColor" stroke="none"/></svg></button>
        <button type="button" data-act="eclipse" aria-label="Next eclipse"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.2" cy="12" r="4.5"/><circle cx="14.8" cy="12" r="4.5"/></svg></button>
      </div>
      <div class="vrpad-row">
        <button type="button" data-act="time" data-dir="-5" aria-label="Earlier"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7 L6 12 L11 17"/><circle cx="16.5" cy="12" r="3.2"/></svg></button>
        <button type="button" data-act="time" data-dir="5" aria-label="Later"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.5" cy="12" r="3.2"/><path d="M13 7 L18 12 L13 17"/></svg></button>
        <button type="button" data-act="era" data-dir="-1" aria-label="Previous era"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10M7 11h10"/><path d="M8 14l4 5 4-5"/></svg></button>
        <button type="button" data-act="era" data-dir="1" aria-label="Next era"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10l4-5 4 5"/><path d="M7 14h10M7 18h10"/></svg></button>
      </div>
    </div>
  </div>
</div>
</div>
<script>
const EP = __EP__;
const DAY = __DAY__;
const YREF = __YREF__;
const M = [[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]];
const g = v => v<=0.0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-0.055;
function xyY2XYZ(c){ const [x,y,Y]=c; if(y<=0||Y<=0) return [0,0,0]; return [x*Y/y, Y, (1-x-y)*Y/y]; }
function XYZ2rgb(X, expo){ // linear rgb 0..1, soft hue-preserving clip
  let r=M[0][0]*X[0]+M[0][1]*X[1]+M[0][2]*X[2], gg=M[1][0]*X[0]+M[1][1]*X[1]+M[1][2]*X[2], b=M[2][0]*X[0]+M[2][1]*X[1]+M[2][2]*X[2];
  r=Math.max(0,r*expo); gg=Math.max(0,gg*expo); b=Math.max(0,b*expo);
  const mx=Math.max(r,gg,b); if(mx>1){r/=mx;gg/=mx;b/=mx;} return [r,gg,b];
}
function tone(X, Yref, k=0.85, p=0.4, cap=0.92, floor=0){ // returns sRGB 0..255
  // Non-positive luminance has no color. A hard floor above that cut a contour
  // into moonlight, so anything dimmer follows the same curve down to black.
  if(!(X[1]>0)) return [0,0,0];
  let t=Math.min(cap, k*Math.pow(X[1]/Yref,p)); t=Math.max(t,floor);
  const rgb=XYZ2rgb(X, t/X[1]); return rgb.map(v=>Math.round(255*g(v)));
}
function cct(x,y){ const n=(x-0.3320)/(0.1858-y); return Math.round(449*n**3+3525*n**2+6823.3*n+5520.33); }
const hex = a => '#'+a.map(v=>v.toString(16).padStart(2,'0')).join('');

/* ---------- Section 1: globe through time ---------- */
const globe=document.getElementById('globe'), gctx=globe.getContext('2d');
const cache={};
function tag(ctx, text, x, y){ // white label on a translucent chip, readable on a bright limb
  const m=ctx.measureText(text), w=m.width, asc=m.actualBoundingBoxAscent||12, desc=m.actualBoundingBoxDescent||3, px=5, py=2;
  let left=ctx.textAlign==='center'?x-w/2:ctx.textAlign==='right'?x-w:x;
  const max=ctx.canvas.width-3;
  if(left+w+px>max){ x-=left+w+px-max; left=max-w-px; }
  if(left-px<3){ x+=3-(left-px); left=3+px; }
  ctx.save(); ctx.fillStyle='rgba(8,10,16,.62)'; ctx.beginPath(); ctx.roundRect(left-px, y-asc-py, w+px*2, asc+desc+py*2, 3); ctx.fill(); ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.92)'; ctx.fillText(text, x, y);
}
function renderGlobe(ep){
  if(cache[ep.key]) return cache[ep.key];
  const W=globe.width,H=globe.height; const off=document.createElement('canvas'); off.width=W; off.height=H; const ctx=off.getContext('2d');
  const img=ctx.createImageData(W,H), px=img.data; const d=ep.limb; const lats=d.lats, alts=d.alts, hmax=alts[alts.length-1];
  const cx=W/2, cy=H/2, R=W*0.30, EX=0.5;
  const samp=(xs,x)=>{ if(x<=xs[0]) return [0,0]; for(let i=0;i<xs.length-1;i++) if(x<xs[i+1]) return [i,(x-xs[i])/(xs[i+1]-xs[i])]; return [xs.length-2,1]; };
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy); let c=[0.02,0.024,0.04];
    if(r<R){ const lat=Math.min(82.5,Math.abs(Math.asin(dy/R))*180/Math.PI); const [i,t]=samp(lats,lat); const a=d.disk[i],b=d.disk[i+1]; const mu=Math.pow(Math.max(0,1-(r/R)**2),0.18); c=[0,1,2].map(q=>(a[q]+(b[q]-a[q])*t)*mu); }
    else if(r<R*(1+EX)){ const h=(r/R-1)/EX*hmax; const lat=Math.min(82.5,Math.abs(Math.asin(dy/r))*180/Math.PI); const [i,t]=samp(lats,lat),[j,u]=samp(alts,h); const G=d.limb;
      c=[0,1,2].map(q=>{const a=G[i][j][q]+(G[i][j+1][q]-G[i][j][q])*u, b=G[i+1][j][q]+(G[i+1][j+1][q]-G[i+1][j][q])*u; return a+(b-a)*t;});
      const f=Math.min(1,(R*(1+EX)-r)/(R*EX*0.08)); c=c.map((v,q)=>[0.02,0.024,0.04][q]+(v-[0.02,0.024,0.04][q])*f); }
    const o=(y*W+x)*4; px[o]=c[0]*255; px[o+1]=c[1]*255; px[o+2]=c[2]*255; px[o+3]=255;
  }
  ctx.putImageData(img,0,0);
  ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='15px Newsreader, Georgia, serif';
  [[0,'0'],[20,'20'],[50,'50'],[100,'100 km']].forEach(([h,l],n)=>{const rr=R*(1+EX*h/hmax); ctx.beginPath(); ctx.moveTo(cx+rr,cy); ctx.lineTo(cx+rr,cy+9); ctx.stroke(); tag(ctx,l,cx+rr-6,cy+26+(n%2?16:0));});
  tag(ctx,'equator',cx-R*0.98+6,cy-6); tag(ctx,'pole',cx-16,cy-R-8);
  cache[ep.key]=off; return off;
}
let tPos=11, tIdx=11;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let refreshGlobeTip=()=>{}, refreshDomeTip=()=>{};
function drawGlobeAt(pos){ // blend between neighboring epochs
  const i=Math.floor(pos), t=pos-i; const a=renderGlobe(EP[i]);
  gctx.globalAlpha=1; gctx.drawImage(a,0,0);
  if(t>0.001 && i<EP.length-1){ const b=renderGlobe(EP[i+1]); gctx.globalAlpha=t; gctx.drawImage(b,0,0); gctx.globalAlpha=1; }
  gctx.font='italic 22px Newsreader, Georgia, serif'; tag(gctx, EP[Math.round(pos)].name, 18, globe.height-18);
  refreshGlobeTip();
}
const WIKI={
  hadean44:['Hadean','https://en.wikipedia.org/wiki/Hadean'],
  hadean40:['Hadean','https://en.wikipedia.org/wiki/Hadean'],
  archean38:['Eoarchean','https://en.wikipedia.org/wiki/Eoarchean'],
  archean27thin:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  archean27:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  archean27vthick:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  proterozoic22:['Paleoproterozoic','https://en.wikipedia.org/wiki/Paleoproterozoic'],
  snowball07:['Snowball Earth','https://en.wikipedia.org/wiki/Snowball_Earth'],
  carbon30:['Carboniferous','https://en.wikipedia.org/wiki/Carboniferous'],
  kpg66:['Cretaceous–Paleogene extinction event','https://en.wikipedia.org/wiki/Cretaceous–Paleogene_extinction_event'],
  volcanic:['Year Without a Summer','https://en.wikipedia.org/wiki/Year_Without_a_Summer'],
  modern:['Holocene','https://en.wikipedia.org/wiki/Holocene'],
  modernpoll:['Air pollution','https://en.wikipedia.org/wiki/Air_pollution']
};
function showEpoch(pos){
  tPos=pos; drawGlobeAt(pos);
  const i=Math.round(pos); if(i===tIdx && document.getElementById('tname').textContent) return; tIdx=i;
  const ep=EP[i];
  document.getElementById('tname').textContent=ep.name;
  document.getElementById('tsub').textContent=ep.sub;
  const wiki=WIKI[ep.key], wa=document.getElementById('twiki');
  wa.href=wiki[1]; wa.textContent=wiki[0]+' on Wikipedia';
  document.getElementById('tprose').textContent=ep.prose;
  const domes=document.getElementById('tdomes'); domes.innerHTML='';
  for(const L of ['Equator','Mid-latitude','Polar summer']){ const v=ep.lat[L]; const zc=hex(tone(xyY2XYZ(v.z),YREF)), hc=hex(tone(xyY2XYZ(v.h),YREF));
    domes.insertAdjacentHTML('beforeend',`<figure><div class="sky" style="background:linear-gradient(${zc},${hc})"></div><figcaption>${L}<small>zenith ${v.zc.toLocaleString()} K · horizon ${v.hc.toLocaleString()} K</small></figcaption></figure>`); }
  document.querySelectorAll('#ttrack .tick').forEach((t,j)=>{ const on=j===i; t.classList.toggle('on',on); if(on) t.setAttribute('aria-current','true'); else t.removeAttribute('aria-current'); });
}
const track=document.getElementById('ttrack');
EP.forEach((ep,i)=>{ const t=document.createElement('button'); t.type='button'; t.className='tick row'+(i%2); t.style.left=(100*i/(EP.length-1))+'%'; t.setAttribute('aria-label',ep.name); t.innerHTML='<i></i><span class="lb"></span><span class="name"></span>'; t.querySelector('.lb').textContent=ep.age; t.querySelector('.name').textContent=ep.name; t.addEventListener('click',()=>{ tslider.value=i; showEpoch(i); }); track.appendChild(t); });
const tslider=document.getElementById('tslider');
tslider.addEventListener('input',()=>{ showEpoch(+tslider.value); });
let tRAF=null; const tplay=document.getElementById('tplay');
tplay.addEventListener('click',()=>{ if(tRAF){cancelAnimationFrame(tRAF);tRAF=null;tplay.textContent='Play';tplay.setAttribute('aria-pressed','false');return;}
  tplay.textContent='Pause'; tplay.setAttribute('aria-pressed','true'); let last=performance.now();
  const speed=1/2200; // epochs per ms (2.2 s per epoch)
  const step=now=>{ const dt=now-last; last=now; let p=tPos+dt*speed; if(p>EP.length-1) p=0; tslider.value=p.toFixed(2); showEpoch(p); tRAF=requestAnimationFrame(step); };
  tRAF=requestAnimationFrame(step); });
/* ---------- Section 2: a day under that sky ---------- */
const dome=document.getElementById('dome'), dctx=dome.getContext('2d');
const sel=document.getElementById('depoch'); EP.forEach((ep,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=`${ep.age} — ${ep.name}`; sel.appendChild(o); });
let dIdx=11, dLat='Mid-latitude', minutes=720, autoExpo=false;
const DAYMIN=1440; // midnight to midnight
sel.value=dIdx;
const LATDEG={'Equator':0,'Mid-latitude':45,'Polar':75};
const SZ=DAY.szas, VZ=DAY.vz, AZ=DAY.az;
function sunGeom(lat,min){ const h=(min/60-12)*15*Math.PI/180, phi=lat*Math.PI/180; const cz=Math.cos(phi)*Math.cos(h); const z=Math.acos(Math.max(-1,Math.min(1,cz)))*180/Math.PI;
  const A=Math.atan2(Math.sin(h), Math.cos(h)*Math.sin(phi)); let comp=180+A*180/Math.PI; if(lat===0){ comp = h<0?90:270; } return {sza:z, az:((comp%360)+360)%360}; }
function idx(xs,x){ if(x<=xs[0]) return [0,0]; for(let i=0;i<xs.length-1;i++) if(x<xs[i+1]) return [i,(x-xs[i])/(xs[i+1]-xs[i])]; return [xs.length-2,1]; }
// interpolate XYZ of the dome grid at (sza, vz, azrel): linear in sza, monotone cubic in vz and az
function herm(xs, ys, x){ // PCHIP: ys is an array of [X,Y,Z]; stays between adjacent samples
  const n=xs.length; if(x<=xs[0]) return ys[0]; if(x>=xs[n-1]) return ys[n-1];
  let i=0; while(i<n-2 && x>=xs[i+1]) i++;
  const h=xs[i+1]-xs[i], t=(x-xs[i])/h, t2=t*t, t3=t2*t;
  const sgn=v=>v<0?-1:v>0?1:0;
  const slope=(k,q)=>{
    if(n<3) return (ys[1][q]-ys[0][q])/(xs[1]-xs[0]);
    const at=k0=>{ const hl=xs[k0]-xs[k0-1], hr=xs[k0+1]-xs[k0];
      const dl=(ys[k0][q]-ys[k0-1][q])/hl, dr=(ys[k0+1][q]-ys[k0][q])/hr;
      if(dl*dr<=0) return 0; const w1=2*hr+hl, w2=hr+2*hl; return (w1+w2)/(w1/dl+w2/dr); };
    if(k>0 && k<n-1) return at(k);
    const left=k===0, h0=left?xs[1]-xs[0]:xs[n-1]-xs[n-2], h1=left?xs[2]-xs[1]:xs[n-2]-xs[n-3];
    const d0=(left?ys[1][q]-ys[0][q]:ys[n-1][q]-ys[n-2][q])/h0, d1=(left?ys[2][q]-ys[1][q]:ys[n-2][q]-ys[n-3][q])/h1;
    let m=((2*h0+h1)*d0-h0*d1)/(h0+h1);
    if(sgn(m)!==sgn(d0)) m=0; else if(sgn(d0)!==sgn(d1) && Math.abs(m)>3*Math.abs(d0)) m=3*d0;
    return m;
  };
  const out=[0,0,0];
  for(let q=0;q<3;q++){
    const y0=ys[i][q], y1=ys[i+1][q], m0=slope(i,q), m1=slope(i+1,q);
    out[q]=Math.max(0,(2*t3-3*t2+1)*y0+(t3-2*t2+t)*h*m0+(-2*t3+3*t2)*y1+(t3-t2)*h*m1);
  }
  return out;
}
const dense={}; // per (epoch,lat,sza-slice): 91 x 91 table of XYZ, 1 deg in vz, 2 deg in az
function denseSlice(key, lat, s){
  const id=key+'|'+lat+'|'+s; if(dense[id]) return dense[id];
  const G=DAY.epochs[key][lat].dome[s].map(row=>row.map(xyY2XYZ));
  const T=new Float32Array(91*91*3);
  const cols=[]; for(let a=0;a<=90;a++){ cols.push(G.map(row=>herm(AZ,row,a*2))); }
  for(let v=0;v<=90;v++){ for(let a=0;a<=90;a++){ const X=herm(VZ,cols[a],Math.min(v,88)); const o=(v*91+a)*3; T[o]=X[0];T[o+1]=X[1];T[o+2]=X[2]; } }
  dense[id]=T; return T;
}
function domeXYZ(key, lat, si, st, vz, azr){
  const out=[0,0,0];
  const fv=Math.min(90,vz), iv=Math.min(89,Math.floor(fv)), tv=fv-iv; const fa=azr/2, ia=Math.min(89,Math.floor(fa)), ta=fa-ia;
  for(const [s,ws] of [[si,1-st],[si+1,st]]) if(ws>0){
    const T=denseSlice(key,lat,s);
    for(let q=0;q<3;q++){ const o00=(iv*91+ia)*3+q, o01=(iv*91+ia+1)*3+q, o10=((iv+1)*91+ia)*3+q, o11=((iv+1)*91+ia+1)*3+q;
      const a=T[o00]*(1-ta)+T[o01]*ta, b=T[o10]*(1-ta)+T[o11]*ta; out[q]+=ws*(a*(1-tv)+b*tv); }
  }
  return out;
}
function skySource(sza, az){
  // Samples run through 20° below the horizon. From there to 30°, fade that last sky to black.
  const last=SZ[SZ.length-1], past=Math.max(0, sza-last);
  const fade=past<=0 ? 1 : Math.max(0, 1-past/10);
  const [si,st]=idx(SZ, Math.min(Math.max(sza, SZ[0]), last));
  return {si, st, fade, az, past};
}
function renderDay(fast){
  vrNote='';
  const ep=EP[dIdx], rec=DAY.epochs[ep.key][dLat]; const {sza,az:sunAz}=sunGeom(LATDEG[dLat],minutes);
  const W=dome.width,H=dome.height, cx=W/2, cy=H/2, R=W*0.46;
  // Moonlight is the Sun's sky field, evaluated at the Moon and added. Hold the
  // Sun's pre-fade luminance so auto-exposure does not undo the twilight fade.
  const sunSrc=skySource(sza, sunAz);
  const moon=lunarPlace(LATDEG[dLat]);
  const moonSrc=skySource(90-moon.el, moon.az);
  const mScale=moonSkyScale(moon, sunAz, 90-sza);
  const si=sunSrc.si, st=sunSrc.st, past=sunSrc.past;
  const NR=72, NA=144; const grid=[];
  const addField=(X, src, scale, vz, comp)=>{
    if(!src || src.fade<=0) return null;
    let azr=Math.abs(comp-src.az); if(azr>180) azr=360-azr;
    const S=domeXYZ(ep.key,dLat,src.si,src.st,Math.min(vz,88),azr);
    if(scale>0){ const f=src.fade*scale; X[0]+=S[0]*f; X[1]+=S[1]*f; X[2]+=S[2]*f; }
    return S;
  };
  // Partial eclipse: the Moon is outside the air, so it only hides part of the
  // photosphere. The whole sunlit sky scales by the fraction still visible.
  // The disks are the ones drawn in this view, which are larger than the true disks.
  const diskScale=vrOn?DISK_SCALE:(DOME_DISK/(dome.width*0.46))*90/SUN_RADIUS_DEG;
  const sepDeg=Math.acos(Math.max(-1,Math.min(1,vdot(horizDir(moon.az,moon.el),horizDir(sunAz,90-sza)))))*180/Math.PI;
  const sunVis=1-sunCovered(sepDeg, SUN_RADIUS_DEG*diskScale, moon.radDeg*diskScale);
  let Ymax=1e-30, Yhold=1e-30, Ysun=1e-30;
  for(let ir=0;ir<=NR;ir++){ const row=[]; const vz=90*ir/NR; for(let ia=0;ia<=NA;ia++){ const comp=360*ia/NA;
      const X=[0,0,0];
      const Xsun=addField(X, sunSrc, sunVis, vz, comp);
      if(Xsun){ const y=Xsun[1]*sunSrc.fade; if(y>Ysun) Ysun=y; if(Xsun[1]>Yhold) Yhold=Xsun[1]; }
      addField(X, moonSrc, mScale, vz, comp);
      if(X[1]>Ymax) Ymax=X[1]; row.push(X);} grid.push(row); }
  const Ybase=past>0?Yhold:Math.max(Ysun,Ymax);
  const Yref = autoExpo ? Math.max(Ybase, 1e-6*YREF) : YREF; const k = autoExpo?0.85:0.85, p = autoExpo?0.5:0.4;
  const colgrid=grid.map(row=>row.map(X=>tone(X,Yref,k,p,0.95)));
  if(!fast){ const img=dctx.createImageData(W,H), px=img.data;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy); const o=(y*W+x)*4;
    if(r>R){ px[o]=10;px[o+1]=12;px[o+2]=18;px[o+3]=255; continue; }
    const fr=(r/R)*NR, ir=Math.min(NR-1,Math.floor(fr)), tr=fr-ir;
    let ang=Math.atan2(dx,-dy)*180/Math.PI; if(ang<0) ang+=360; const fa=ang/360*NA, ia=Math.min(NA-1,Math.floor(fa)), ta=fa-ia;
    for(let q=0;q<3;q++){ const a=colgrid[ir][ia][q]*(1-ta)+colgrid[ir][ia+1][q]*ta, b=colgrid[ir+1][ia][q]*(1-ta)+colgrid[ir+1][ia+1][q]*ta; px[o+q]=a*(1-tr)+b*tr; }
    px[o+3]=255;
  }
  dctx.putImageData(img,0,0); }
  // sun
  const sunc=rec.sun[Math.min(si+ (st>0.5?1:0), rec.sun.length-1)];
  const sX=xyY2XYZ(sunc); const sunRel = sX[1]/DAY.epochs['modern']['Equator'].sun[0][2];
  // Blend chromaticity between samples so the disk color moves continuously.
  // Below about 1e-6 the direct beam is a one-wavelength leftover. In the early
  // Hadean that leftover sits on the green part of the spectrum locus, and drawing
  // it at full brightness makes a green disk. Hold the last sample that still has a hue.
  const noonY=DAY.epochs['modern']['Equator'].sun[0][2];
  const hue=i=>rec.sun[i][1]>0 && rec.sun[i][2]>=1e-6;
  let i0=si; while(i0>0 && !hue(i0)) i0--;
  const i1=Math.min(si+1, rec.sun.length-1), c0=rec.sun[i0], c1=hue(i1)?rec.sun[i1]:c0, u=hue(i1)?st:0;
  const sXd=xyY2XYZ([c0[0]*(1-u)+c1[0]*u, c0[1]*(1-u)+c1[1]*u, 1]);
  let visI=si; while(visI>0 && rec.sun[visI][2]/noonY<=3e-4) visI--;
  const sunRelD=rec.sun[visI][2]/noonY;
  const SUNR=DOME_DISK, rr=R*sza/90, a=sunAz*Math.PI/180, sx=cx+rr*Math.sin(a), sy=cy-rr*Math.cos(a);
  const sunRGB=tone(sXd, sXd[1], 0.95,0.4,0.98);
  const stars=placeStars(LATDEG[dLat]);
  if(!fast) drawStarsOnDome(stars.marks, colgrid);
  const sunUpPix=!fast && rr-SUNR<R && sunRelD>3e-4;
  if(sunUpPix){
    dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
    const col=hex(sunRGB);
    dctx.globalAlpha=1; dctx.fillStyle=col; dctx.beginPath(); dctx.arc(sx,sy,SUNR,0,Math.PI*2); dctx.fill(); dctx.restore();
  }
  if(!fast) drawMoonOnDome(moon, sunAz, 90-sza, sunUpPix?{x:sx,y:sy,r:SUNR}:null);
  skyNow={colgrid, sza, sunAz, sunRGB, sunVis, sunOn:sunRelD>3e-4 && sza<90+SUN_RADIUS_DEG*DISK_SCALE+35/60, moon, stars:stars.tex, starBins:stars.bins, starIdx:stars.idx, starIdxCount:stars.idxCount, gen:++skyGen};
  document.getElementById('rmoon').textContent = (moon.el<-moon.radDeg ? 'below horizon' : moon.el.toFixed(1)+'°')+' · '+Math.round(moonLit(moon, sunAz, 90-sza)*100)+'% lit · '+(mScale/MOON_SUN_FULL).toPrecision(2)+'× full';
  if(vrOn) paintVR();
  if(fast) return;
  // compass + rim
  dctx.strokeStyle='rgba(255,255,255,.35)'; dctx.lineWidth=1.5; dctx.beginPath(); dctx.arc(cx,cy,R,0,7); dctx.stroke();
  dctx.fillStyle='rgba(255,255,255,.8)'; dctx.font='16px Newsreader, Georgia, serif'; dctx.textAlign='center';
  dctx.fillText('N',cx,cy-R-6); dctx.fillText('S',cx,cy+R+18); dctx.fillText('E',cx+R+12,cy+6); dctx.fillText('W',cx-R-12,cy+6); dctx.textAlign='left';
  dctx.font='italic 20px Newsreader, Georgia, serif'; dctx.fillText(`${ep.name} · ${dLat==='Polar'?'75° latitude':dLat==='Mid-latitude'?'45° latitude':'equator'}`, 16, H-16);
  // readouts
  document.getElementById('hclock').textContent=clockLabel(minutes);
  document.getElementById('relev').textContent=(90-sza).toFixed(1)+'°';
  const sumAt=(vz,comp)=>{ const X=[0,0,0]; addField(X,sunSrc,sunVis,vz,comp); addField(X,moonSrc,mScale,vz,comp); return X; };
  const zX=sumAt(0, sunAz), hX=sumAt(88, sunAz+90);
  const fmt=X=>{ if(X[1]<=1e-7*YREF) return 'dark'; const s=X[0]+X[1]+X[2]; const c=cct(X[0]/s,X[1]/s); return (c>800&&c<60000? c.toLocaleString()+' K':'—')+` · ${(100*X[1]/YREF).toPrecision(2)}%`; };
  document.getElementById('rzen').textContent=fmt(zX); document.getElementById('rhor').textContent=fmt(hX);
  document.getElementById('rsun').textContent = sza>=90 ? 'below horizon' : (sunRel<=3e-4 ? 'not visible' : (()=>{const s=sX[0]+sX[1]+sX[2]; return cct(sX[0]/s,sX[1]/s).toLocaleString()+' K · '+(sunRel*100).toPrecision(2)+'%';})());
  if(sza<90 && sunVis<0.999) document.getElementById('rsun').textContent+=' · '+Math.round((1-sunVis)*100)+'% covered';
  // swatch bar along the sun's vertical
  const bar=document.getElementById('hbar'); bar.innerHTML='';
  const pts=[[88,0],[75,0],[60,0],[45,0],[30,0],[15,0],[0,0],[15,180],[30,180],[45,180],[60,180],[75,180],[88,180]];
  for(const [vz,azr] of pts){ const X=sumAt(vz, sunAz+azr); const i=document.createElement('i'); i.style.background=hex(tone(X,Yref,k,p,0.95)); i.title=`${vz}° from zenith, ${azr?'away from':'toward'} the Sun`; bar.appendChild(i); }
  document.getElementById('dprose').textContent = ep.prose;
  markHour();
  refreshDomeTip();
}
function warm(){ const ep=EP[dIdx], key=ep.key, lat=dLat; let s=0; const step=()=>{ if(EP[dIdx].key!==key||dLat!==lat) return; while(s<SZ.length && dense[key+'|'+lat+'|'+s]) s++; if(s>=SZ.length) return; denseSlice(key,lat,s); s++; (window.requestIdleCallback||setTimeout)(step); }; (window.requestIdleCallback||setTimeout)(step); }
sel.addEventListener('change',()=>{ dIdx=+sel.value; renderDay(); warm(); });
document.querySelectorAll('[data-lat]').forEach(b=>b.addEventListener('click',()=>{ dLat=b.dataset.lat; document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); renderDay(); warm(); }));
const hslider=document.getElementById('hslider'); hslider.addEventListener('input',()=>{ minutes=+hslider.value; renderDay(); });
document.getElementById('moonDate').addEventListener('change',()=>renderDay());
const htrack=document.getElementById('htrack');
const HMIN=+hslider.min, HMAX=+hslider.max;
function clockLabel(m){ if(m>=DAYMIN) return '24:00'; const hh=Math.floor(m/60), mm=Math.floor(m%60); return hh+':'+String(mm).padStart(2,'0'); }
for(let m=HMIN, n=0; m<=HMAX; m+=60, n++){ const t=document.createElement('button'); t.type='button'; t.className='tick row'+(n%2); t.style.left=(100*(m-HMIN)/(HMAX-HMIN))+'%'; t.dataset.min=String(m); t.innerHTML=`<i></i><span class="lb">${clockLabel(m)}</span>`; t.addEventListener('click',()=>{ minutes=m; hslider.value=minutes; renderDay(); }); htrack.appendChild(t); }
function markHour(){ const ticks=[...htrack.querySelectorAll('.tick')]; let best=0, bd=Infinity; ticks.forEach((t,j)=>{ const d=Math.abs(+t.dataset.min-minutes); if(d<bd){ bd=d; best=j; } }); ticks.forEach((t,j)=>{ const on=j===best; t.classList.toggle('on',on); if(on) t.setAttribute('aria-current','true'); else t.removeAttribute('aria-current'); }); }
const expo=document.getElementById('expo'); expo.addEventListener('click',()=>{ autoExpo=!autoExpo; expo.setAttribute('aria-pressed',autoExpo); renderDay(); });
let hTimer=null, dayPlaying=false, playRAF=0, playStamp=0; const hplay=document.getElementById('hplay');
function adoptPlayRate(){
  if(hTimer){ clearInterval(hTimer); hTimer=null; }
  if(playRAF){ cancelAnimationFrame(playRAF); playRAF=0; }
  if(!dayPlaying) return;
  if(vrOn){
    // Page play covers 5 minutes of sky per 60 ms. In VR that rate is five times slower, and time advances continuously so the Sun does not jump.
    playStamp=performance.now();
    const frame=now=>{
      if(!dayPlaying||!vrOn) return;
      playRAF=requestAnimationFrame(frame);
      let dt=(now-playStamp)/1000; playStamp=now; if(dt>0.05) dt=0.05;
      stepWalk(dt);
      minutes+=dt*(5/0.06)/5;
      while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); }
      hslider.value=minutes; renderDay(true);
    };
    playRAF=requestAnimationFrame(frame);
  }else hTimer=setInterval(()=>{ minutes+=5; while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); } hslider.value=minutes; renderDay(); },60);
}
hplay.addEventListener('click',()=>{
  if(dayPlaying){ dayPlaying=false; adoptPlayRate(); hplay.textContent='Play'; hplay.setAttribute('aria-pressed','false'); if(vrOn) syncVRLink(true); if(vrOn&&walking()) pumpWalk(); }
  else { dayPlaying=true; if(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); } hplay.textContent='Pause'; hplay.setAttribute('aria-pressed','true'); adoptPlayRate(); }
  syncVRPad();
  if(vrOn) paintVR();
});
/* ---------- first-person view of the day sky ---------- */
const SUN_RADIUS_DEG=0.2666; // mean solar angular radius: IAU radius over one astronomical unit
const SUNANG=SUN_RADIUS_DEG; // VR disk. The fisheye enlarges the Sun and Moon together.
const VR_FOV_DEG=60; // twice the angle a desktop monitor fills
const DISK_SCALE=4; // Sun and Moon are drawn at four times their angular size
const DOME_DISK=11; // fisheye solar radius in pixels, half the previous enlargement
// Sæmundsson 1986: true altitude (degrees) to apparent altitude. Matches Bennett in the shader.
function apparentEl(h){ if(h>80) return h; const u=h+10.3/(h+5.11); if(u<0.25) return h; return h+(1.02/Math.tan(u*Math.PI/180))/60; }
// Mean Earth-Moon distance in Earth radii. Younger than 3.2 Ga the values are
// interpolated from Farhat, Auclair-Desrotour, Boué & Laskar 2022, A&A 665, L1,
// Table 2 (and the Williams Elatina point in Table 3). 3.2 Ga is 70% of the
// present distance, from Eulenfeld & Heubeck 2023, JGR Planets. Older ages
// extend the long-term drift and stay beyond 30 Earth radii.
const MOON_RE={
  modern:60.14, modernpoll:60.14, volcanic:60.14,
  kpg66:59.93, carbon30:58.56, snowball07:57.71,
  proterozoic22:50.98, archean27thin:47.60, archean27:47.60, archean27vthick:47.60,
  archean38:40.4, hadean40:39.8, hadean44:38.7
};
const MOON_R_KM=1737.4, EARTH_R_KM=6378.14;
// Allen 1976 phase law, as used by Krisciunas & Schaefer 1991, PASP 103, 1033.
// Full-Moon V is −12.73 and the Sun is −26.74, both at mean distance. Within 7°
// of full the Moon is up to 35% brighter than that curve (opposition surge).
const MOON_V_FULL=-12.73, MOON_V_SUN=-26.74, MOON_OPP=0.35, MOON_RE_NOW=60.14;
const MOON_SUN_FULL=Math.pow(10, -0.4*(MOON_V_FULL-MOON_V_SUN));
function moonRadiusDeg(key){ return Math.atan(MOON_R_KM/((MOON_RE[key]||60.14)*EARTH_R_KM))*180/Math.PI; }
function rev(x){ x%=360; return x<0?x+360:x; }
function sind(x){ return Math.sin(x*Math.PI/180); }
function cosd(x){ return Math.cos(x*Math.PI/180); }
function dayNumber(y,m,D,ut){ const div=(a,b)=>Math.trunc(a/b); return 367*y - div(7*(y+div(m+9,12)),4) + div(275*m,9) + D - 730530 + ut/24; }
function localISODate(t){ const p=n=>String(n).padStart(2,'0'); return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate()); }
function shiftMoonDate(days){
  const el=document.getElementById('moonDate');
  const raw=el.value||localISODate(new Date());
  const [Y,M,D]=raw.split('-').map(Number);
  el.value=localISODate(new Date(Y, M-1, D+days));
}
function instantUT(){
  const raw=(document.getElementById('moonDate').value)||localISODate(new Date());
  const [Y,M,D]=raw.split('-').map(Number);
  const local=new Date(Y,M-1,D, Math.floor(minutes/60), Math.floor(minutes%60), Math.floor((minutes*60)%60));
  return { y:local.getUTCFullYear(), m:local.getUTCMonth()+1, D:local.getUTCDate(),
    ut:local.getUTCHours()+local.getUTCMinutes()/60+local.getUTCSeconds()/3600,
    lon:-local.getTimezoneOffset()/60*15 };
}
// Low-precision lunar theory, Schlyter / van Flandern & Pulkkinen, about 0.05°.
function moonEquatorial(d){
  const ecl=23.4393-3.563e-7*d;
  const ws=282.9404+4.70935e-5*d, Ms=rev(356.0470+0.9856002585*d);
  const Nm=rev(125.1228-0.0529538083*d), wm=rev(318.0634+0.1643573223*d), Mm=rev(115.3654+13.0649929509*d);
  const e=0.054900, a=60.2666, i=5.1454;
  let E=Mm+e*(180/Math.PI)*sind(Mm)*(1+e*cosd(Mm));
  E=E-(E-e*(180/Math.PI)*sind(E)-Mm)/(1-e*cosd(E));
  const xv=a*(cosd(E)-e), yv=a*(Math.sqrt(1-e*e)*sind(E));
  const v=Math.atan2(yv,xv)*180/Math.PI, r0=Math.hypot(xv,yv);
  const xh=r0*(cosd(Nm)*cosd(v+wm)-sind(Nm)*sind(v+wm)*cosd(i));
  const yh=r0*(sind(Nm)*cosd(v+wm)+cosd(Nm)*sind(v+wm)*cosd(i));
  const zh=r0*(sind(v+wm)*sind(i));
  let lonecl=Math.atan2(yh,xh)*180/Math.PI, latecl=Math.atan2(zh,Math.hypot(xh,yh))*180/Math.PI;
  const Ls=rev(Ms+ws), Lm=rev(Mm+wm+Nm), Dm=Lm-Ls, F=Lm-Nm;
  lonecl+=-1.274*sind(Mm-2*Dm)+0.658*sind(2*Dm)-0.186*sind(Ms)-0.059*sind(2*Mm-2*Dm)-0.057*sind(Mm-2*Dm+Ms)+0.053*sind(Mm+2*Dm)+0.046*sind(2*Dm-Ms)+0.041*sind(Mm-Ms)-0.035*sind(Dm)-0.031*sind(Mm+Ms)-0.015*sind(2*F-2*Dm)+0.011*sind(Mm-4*Dm);
  latecl+=-0.173*sind(F-2*Dm)-0.055*sind(Mm-F-2*Dm)-0.046*sind(Mm+F-2*Dm)+0.033*sind(F+2*Dm)+0.017*sind(2*Mm+F);
  const r=r0-0.58*cosd(Mm-2*Dm)-0.46*cosd(2*Dm);
  const xg=r*cosd(lonecl)*cosd(latecl), yg=r*sind(lonecl)*cosd(latecl), zg=r*sind(latecl);
  const ye=yg*cosd(ecl)-zg*sind(ecl), ze=yg*sind(ecl)+zg*cosd(ecl);
  return {RA:Math.atan2(ye,xg)*180/Math.PI, Dec:Math.atan2(ze,Math.hypot(xg,ye))*180/Math.PI, Ls};
}
function altaz(lat,dec,H){
  const phi=lat*Math.PI/180, d=dec*Math.PI/180, h=H*Math.PI/180;
  const sinAlt=Math.sin(phi)*Math.sin(d)+Math.cos(phi)*Math.cos(d)*Math.cos(h);
  const alt=Math.asin(Math.max(-1,Math.min(1,sinAlt)))*180/Math.PI;
  const A=Math.atan2(Math.sin(h), Math.cos(h)*Math.sin(phi)-Math.tan(d)*Math.cos(phi));
  let az=(180+A*180/Math.PI)%360; if(az<0) az+=360;
  return {alt, az};
}
function lunarPlace(lat){
  const ins=instantUT(), eq=moonEquatorial(dayNumber(ins.y,ins.m,ins.D,ins.ut));
  const GMST=rev(eq.Ls+180+ins.ut*15), LST=rev(GMST+ins.lon);
  let H=rev(LST-rev(eq.RA)); if(H>180) H-=360;
  const p=altaz(lat, eq.Dec, H), radDeg=moonRadiusDeg(EP[dIdx].key);
  return {az:p.az, el:p.alt, radDeg, rad:radDeg*Math.PI/180, on:apparentEl(p.alt)>-radDeg*DISK_SCALE};
}

// Yale Bright Star Catalogue, 5th revised ed. (Hoffleit & Warren 1991): the thousand
// brightest stars at J2000.0. T CrB is left out; the catalog magnitude is its 1946
// outburst, and the star is about tenth magnitude the rest of the time. Each row is
// right ascension and declination in degrees, V, B-V, proper motion in arcseconds
// per year (mu alpha cos delta, then mu delta), color temperature in kelvin, and a name.
const STARS=[
[101.2871,-16.7161,-1.46,0.00,-0.553,-1.205,9750,"Sirius"],
[95.9879,-52.6958,-0.72,0.15,0.022,0.021,7500,"Canopus"],
[213.9154,19.1825,-0.04,1.23,-1.093,-1.998,4850,"Arcturus"],
[219.8996,-60.8353,-0.01,0.71,-3.642,0.699,5800,"Rigel Kentaurus"],
[279.2346,38.7836,0.03,0.00,0.202,0.286,10000,"Vega"],
[79.1725,45.9981,0.08,0.80,0.076,-0.425,5500,"Capella"],
[78.6346,-8.2017,0.12,-0.03,0.000,-0.001,14000,"Rigel"],
[114.8254,5.2250,0.38,0.42,-0.710,-1.023,6750,"Procyon"],
[24.4288,-57.2367,0.46,-0.16,0.095,-0.035,24000,"Achernar"],
[88.7929,7.4069,0.50,1.85,0.026,0.009,3350,"Betelgeuse"],
[210.9558,-60.3731,0.61,-0.23,-0.032,-0.019,28000,"Agena"],
[297.6958,8.8683,0.77,0.22,0.538,0.386,8250,"Altair"],
[68.9800,16.5092,0.85,1.54,0.063,-0.190,4250,"Aldebaran"],
[247.3517,-26.4319,0.96,1.83,-0.010,-0.020,3350,"Antares"],
[201.2983,-11.1614,0.98,-0.23,-0.041,-0.028,28000,"Spica"],
[116.3287,28.0261,1.14,1.00,-0.628,-0.046,5000,"Pollux"],
[344.4129,-29.6222,1.16,0.09,0.333,-0.165,9250,"Fomalhaut"],
[191.9300,-59.6886,1.25,-0.23,-0.048,-0.014,30000,"Becrux"],
[310.3579,45.2803,1.25,0.09,0.003,0.002,9500,"Deneb"],
[186.6496,-63.0992,1.33,-0.24,-0.036,-0.012,30000,"Acrux"],
[219.9004,-60.8356,1.33,0.88,-3.646,0.700,4850,"Alp2Cen"],
[152.0929,11.9672,1.35,-0.11,-0.248,0.006,16000,"Regulus"],
[104.6562,-28.9722,1.50,-0.21,0.004,0.003,26000,"Adara"],
[187.7913,-57.1133,1.63,1.59,0.023,-0.262,3050,"Gacrux"],
[263.4021,-37.1039,1.63,-0.22,-0.001,-0.029,26000,"Shaula"],
[81.2829,6.3497,1.64,-0.22,-0.009,-0.014,26000,"Bellatrix"],
[81.5729,28.6075,1.65,-0.13,0.022,-0.175,16000,"Alnath"],
[138.3000,-69.7172,1.68,0.00,-0.162,0.108,9500,"Miaplacidus"],
[84.0533,-1.2019,1.70,-0.19,0.001,-0.002,30000,"Alnilam"],
[186.6521,-63.0994,1.73,-0.26,-0.034,-0.007,28000,"Alp2Cru"],
[332.0583,-46.9611,1.74,-0.13,0.129,-0.151,16000,"Alnair"],
[193.5071,55.9597,1.77,-0.02,0.112,-0.006,10000,"Alioth"],
[122.3833,-47.3367,1.78,-0.22,-0.004,0.006,14086,"Suhail al Muhlif"],
[51.0808,49.8611,1.79,0.48,0.024,-0.025,6750,"Mirphak"],
[165.9321,61.7508,1.79,1.07,-0.119,-0.067,5000,"Dubhe"],
[107.0979,-26.3933,1.84,0.68,-0.003,0.004,6300,"Wezen"],
[276.0429,-34.3847,1.85,-0.03,-0.038,-0.124,12000,"Kaus Australis"],
[125.6283,-59.5097,1.86,1.28,-0.026,0.014,4550,"Avior"],
[206.8850,49.3133,1.86,-0.19,-0.122,-0.011,24000,"Alkaid"],
[264.3300,-42.9978,1.87,0.40,0.015,-0.002,7350,"Sargas"],
[89.8821,44.9475,1.90,0.03,-0.057,0.000,9500,"Menkalinan"],
[252.1662,-69.0278,1.92,1.44,0.014,-0.034,4700,"Alp TrA"],
[99.4279,16.3992,1.93,0.00,0.042,-0.042,10000,"Alhena"],
[306.4121,-56.7350,1.94,-0.20,0.007,-0.089,26000,"Peacock"],
[131.1758,-54.7083,1.96,0.04,0.023,-0.078,9750,"Del Vel"],
[95.6750,-17.9558,1.98,-0.23,-0.006,0.000,28000,"Murzim"],
[113.6500,31.8883,1.98,0.03,-0.171,-0.098,9750,"Castor"],
[141.8967,-8.6586,1.98,1.44,-0.014,0.033,4550,"Alphard"],
[31.7933,23.4625,2.00,1.15,0.190,-0.148,4700,"Hamal"],
[37.9529,89.2642,2.02,0.60,0.038,-0.015,6450,"Polaris"],
[283.8163,-26.2967,2.02,-0.22,0.013,-0.054,26000,"Nunki"],
[10.8975,-17.9867,2.04,1.02,0.234,0.033,5100,"Diphda"],
[85.1896,-1.9428,2.05,-0.21,0.003,-0.002,33000,"Alnitak"],
[2.0971,29.0906,2.06,-0.11,0.136,-0.163,14000,"Alpheratz"],
[17.4329,35.6206,2.06,1.58,0.178,-0.114,3500,"Mirach"],
[86.9392,-9.6697,2.06,-0.17,0.002,-0.002,30000,"Saiph"],
[211.6708,-36.3700,2.06,1.01,-0.519,-0.519,5000,"Menkent"],
[222.6763,74.1556,2.08,1.47,-0.031,0.012,4400,"Kocab"],
[263.7337,12.5600,2.08,0.15,0.120,-0.226,8750,"Rasalhague"],
[340.6671,-46.8847,2.10,1.60,0.137,-0.008,2750,"Bet Gru"],
[47.0421,40.9556,2.12,-0.05,0.004,-0.001,14000,"Algol"],
[177.2650,14.5719,2.14,0.09,-0.497,-0.114,9250,"Denebola"],
[190.3792,-48.9597,2.17,-0.01,-0.189,-0.005,9750,"Gam Cen"],
[305.5571,40.2567,2.20,0.68,0.004,0.000,6300,"Sadr"],
[136.9992,-43.4325,2.21,1.66,-0.019,0.013,4400,"Alsuhail"],
[10.1271,56.5372,2.23,1.17,0.053,-0.032,5000,"Shedir"],
[83.0017,-0.2992,2.23,-0.22,0.001,-0.002,33000,"Mintaka"],
[233.6721,26.7147,2.23,-0.02,0.121,-0.089,10000,"Alphekka"],
[269.1517,51.4889,2.23,1.52,-0.008,-0.019,4250,"Etamin"],
[120.8963,-40.0033,2.25,-0.26,-0.027,0.012,45000,"Naos"],
[139.2725,-59.2753,2.25,0.18,-0.020,0.008,8000,"Turais"],
[30.9750,42.3297,2.26,1.37,0.045,-0.052,4550,"Almaak"],
[2.2946,59.1497,2.27,0.34,0.525,-0.181,7200,"Caph"],
[200.9812,54.9253,2.27,0.02,0.122,-0.020,9750,"Mizar"],
[252.5408,-34.2933,2.29,1.15,-0.611,-0.255,4700,"Eps Sco"],
[204.9717,-53.4664,2.30,-0.22,-0.028,-0.016,28000,"Eps Cen"],
[220.4825,-47.3883,2.30,-0.20,-0.021,-0.018,28000,"Alp Lup"],
[218.8767,-42.1578,2.31,-0.19,-0.035,-0.035,28000,"Eta Cen"],
[240.0833,-22.6217,2.32,-0.12,-0.012,-0.022,30000,"Dschubba"],
[165.4604,56.3825,2.37,-0.02,0.082,0.034,9750,"Merak"],
[6.5708,-42.3061,2.39,1.09,0.203,-0.396,5000,"Ankaa"],
[326.0467,9.8750,2.39,1.53,0.031,-0.001,4700,"Enif"],
[265.6221,-39.0300,2.41,-0.22,-0.006,-0.027,28000,"Kap Sco"],
[345.9438,28.0828,2.42,1.67,0.189,0.137,3200,"Scheat"],
[257.5946,-15.7247,2.43,0.06,0.039,0.098,9500,"Sabik"],
[178.4575,53.6947,2.44,0.00,0.095,0.012,10000,"Phad"],
[319.6450,62.5856,2.44,0.22,0.151,0.049,8250,"Alderamin"],
[111.0238,-29.3031,2.45,-0.08,-0.004,0.005,20000,"Aludra"],
[311.5529,33.9703,2.46,1.03,0.356,0.328,5000,"Gienah Cygni"],
[14.1771,60.7167,2.47,-0.15,0.026,-0.005,30000,"Gam Cas"],
[346.1904,15.2053,2.49,-0.04,0.063,-0.042,12000,"Markab"],
[140.5283,-55.0108,2.50,-0.18,-0.008,0.009,26000,"Kap Vel"],
[45.5700,4.0897,2.53,1.64,-0.009,-0.078,3350,"Menkar"],
[208.8850,-47.2883,2.55,-0.22,-0.057,-0.042,26000,"Zet Cen"],
[168.5271,20.5236,2.56,0.12,0.142,-0.130,9000,"Zosma"],
[249.2896,-10.5672,2.56,0.02,0.014,0.026,33000,"Zet Oph"],
[83.1825,-17.8222,2.58,0.21,0.001,0.002,7500,"Arneb"],
[183.9517,-17.5419,2.59,-0.11,-0.161,0.023,14000,"Gienah Ghurab"],
[182.0896,-50.7225,2.60,-0.12,-0.034,-0.008,26000,"Del Cen"],
[285.6529,-29.8803,2.60,0.08,-0.015,-0.002,9500,"Ascella"],
[154.9929,19.8417,2.61,1.15,0.306,-0.147,4850,"Algieba"],
[229.2517,-9.3831,2.61,-0.11,-0.096,-0.019,14000,"Zuben Elschemali"],
[89.9304,37.2125,2.62,-0.08,0.048,-0.081,10000,"The Aur"],
[241.3592,-19.8056,2.62,-0.07,-0.006,-0.019,28000,"Graffias"],
[28.6600,20.8081,2.64,0.13,0.096,-0.111,8750,"Sharatan"],
[84.9121,-34.0742,2.64,-0.12,0.007,-0.026,16000,"Phaet"],
[188.5967,-23.3967,2.65,0.89,0.002,-0.054,5500,"Kraz in Becvar"],
[236.0671,6.4256,2.65,1.17,0.137,0.047,4700,"Unukalhai"],
[21.4542,60.2353,2.68,0.13,0.297,-0.051,8750,"Ruchbah"],
[208.6713,18.3978,2.68,0.58,-0.063,-0.358,6000,"Mufrid"],
[224.6329,-43.1339,2.68,-0.22,-0.035,-0.039,26000,"Bet Lup"],
[74.2483,33.1661,2.69,1.53,0.003,-0.018,4550,"Hassaleh in Becvar"],
[161.6925,-49.4200,2.69,0.90,0.074,-0.048,5500,"Mu Vel"],
[189.2958,-69.1356,2.69,-0.20,-0.048,-0.013,26000,"Alp Mus"],
[262.6908,-37.2958,2.69,-0.22,-0.001,-0.031,26000,"Lesath"],
[109.2858,-37.0975,2.70,1.62,-0.009,0.004,4550,"Pi Pup"],
[221.2467,27.0742,2.70,0.97,-0.049,0.021,5000,"Izar"],
[275.2487,-29.8281,2.70,1.38,0.035,-0.028,4550,"Kaus Meridionalis"],
[296.5650,10.6133,2.72,1.52,0.018,-0.002,4550,"Tarazed"],
[243.5863,-3.6944,2.74,1.58,-0.044,-0.143,3500,"Yed Prior"],
[245.9979,61.5142,2.74,0.91,-0.017,0.061,5200,"Eta Dra"],
[200.1492,-36.7122,2.75,0.04,-0.341,-0.085,9500,"Iot Cen"],
[222.7196,-16.0417,2.75,0.15,-0.106,-0.067,9250,"Zuben Elgenubi"],
[160.7392,-64.3944,2.76,-0.22,-0.023,0.010,30000,"The Car"],
[83.8583,-5.9100,2.77,-0.24,0.000,0.001,33000,"Nair al Saif"],
[247.5550,21.4897,2.77,0.94,-0.098,-0.015,5300,"Kornephoros"],
[265.8683,4.5672,2.77,1.16,-0.040,0.159,4700,"Cebalrai"],
[233.7854,-41.1669,2.78,-0.20,-0.015,-0.028,26000,"Gam Lup"],
[76.9625,-5.0864,2.79,0.13,-0.095,-0.081,9250,"Cursa"],
[262.6083,52.3014,2.79,0.98,-0.016,0.015,5800,"Rastaban"],
[6.4379,-77.2542,2.80,0.62,2.215,0.324,5800,"Bet Hyi"],
[183.7862,-58.7489,2.80,-0.23,-0.041,-0.009,26000,"Del Cru"],
[121.8858,-24.3042,2.81,0.43,-0.083,0.049,6600,"Called Iota Pup in Argelanders atlas, and in Bayer"],
[250.3217,31.6031,2.81,0.65,-0.470,0.394,6000,"Zet Her"],
[276.9925,-25.4217,2.81,1.04,-0.044,-0.185,4850,"Kaus Borealis"],
[248.9708,-28.2161,2.82,-0.25,-0.008,-0.022,30000,"See HR 6084"],
[3.3092,15.1836,2.83,-0.23,0.003,-0.012,26000,"Algenib"],
[195.5442,10.9592,2.83,0.94,-0.273,0.020,5200,"Vindemiatrix"],
[82.0613,-20.7594,2.84,0.82,-0.004,-0.089,5500,"Nihal"],
[58.5329,31.8836,2.85,0.12,0.006,-0.010,28000,"Zet Per"],
[238.7854,-63.4306,2.85,0.29,-0.191,-0.398,7200,"Bet TrA"],
[261.3250,-55.5300,2.85,1.46,-0.008,-0.025,4550,"Bet Ara"],
[29.6925,-61.5697,2.86,0.28,0.264,0.027,7500,"Head of Hydrus"],
[334.6254,-60.2597,2.86,1.39,-0.072,-0.043,4550,"Alp Tuc"],
[56.8713,24.1050,2.87,-0.09,0.019,-0.046,16000,"ALCYONE. The brightest of the Pleiades"],
[296.2437,45.1308,2.87,-0.03,0.053,0.047,12000,"Del Cyg"],
[326.7600,-16.1272,2.87,0.29,0.263,-0.297,8750,"Deneb Algedi"],
[95.7400,22.5136,2.88,1.64,0.054,-0.111,3050,"Tejat Posterior"],
[113.6500,31.8886,2.88,0.04,-0.172,-0.099,9500,"Alp Gem"],
[59.4633,40.0103,2.89,-0.18,0.018,-0.026,30000,"Eps Per"],
[229.7275,-68.6794,2.89,0.00,-0.072,-0.031,9750,"Gam TrA"],
[239.7129,-26.1142,2.89,-0.19,-0.011,-0.026,28000,"Pi Sco"],
[245.2971,-25.5928,2.89,0.13,-0.010,-0.021,28000,"Alniyat"],
[287.4408,-21.0236,2.89,0.35,0.000,-0.035,7200,"Albaldah"],
[111.7875,8.2894,2.90,-0.09,-0.052,-0.038,14000,"Gomeisa"],
[194.0071,38.3183,2.90,-0.12,-0.234,0.056,10000,"Cor Caroli"],
[322.8896,-5.5711,2.91,0.83,0.021,-0.008,6000,"Sadalsuud"],
[46.1992,53.5064,2.93,0.70,0.000,-0.005,5200,"Gam Per"],
[102.4842,-50.6147,2.93,1.20,0.036,-0.070,4850,"Tau Pup"],
[340.7504,30.2214,2.94,0.86,0.015,-0.025,5800,"Matar"],
[59.5075,-13.5086,2.95,1.59,0.061,-0.111,3500,"Zaurak"],
[187.4663,-16.5156,2.95,-0.05,-0.210,-0.138,12000,"Algorab"],
[262.9604,-49.8761,2.95,-0.17,-0.031,-0.070,26000,"Alp Ara"],
[331.4458,-0.3197,2.96,0.98,0.020,-0.010,5800,"Sadalmelik"],
[100.9829,25.1311,2.98,1.40,-0.006,-0.013,5200,"Mebsuta"],
[146.4629,23.7742,2.98,0.80,-0.046,-0.011,5900,"Ras Elased Australis"],
[75.4921,43.8233,2.99,0.54,-0.001,-0.004,7500,"Al Anz"],
[271.4521,-30.4242,2.99,1.00,-0.053,-0.185,5000,"Nash"],
[286.3525,13.8633,2.99,0.01,-0.005,-0.096,10000,"Deneb el Okab"],
[32.3858,34.9872,3.00,0.14,0.150,-0.040,8750,"Bet Tri"],
[84.4113,21.1425,3.00,-0.19,0.000,-0.021,22000,"Zet Tau"],
[182.5312,-22.6197,3.00,1.33,-0.071,0.014,4700,"Minkar"],
[199.7304,-23.1717,3.00,0.92,0.064,-0.045,5200,"Gam Hya"],
[55.7313,47.7875,3.01,-0.13,0.028,-0.034,20000,"Del Per"],
[146.7754,-65.0719,3.01,0.28,-0.012,0.011,8500,"Ups Car"],
[167.4158,44.4986,3.01,1.14,-0.065,-0.028,4850,"Psi UMa"],
[328.4821,-37.3650,3.01,-0.12,0.102,-0.021,14000,"Gam Gru"],
[95.0783,-30.0633,3.02,-0.19,0.009,0.003,26000,"Furud"],
[105.7562,-23.8333,3.02,-0.08,-0.004,0.003,24000,"Omi2CMa"],
[218.0196,38.3083,3.03,0.19,-0.114,0.153,8250,"Seginus"],
[266.8963,-40.1269,3.03,0.51,0.000,-0.008,7200,"Iot1Sco"],
[34.8362,-2.9775,3.04,1.42,-0.008,-0.237,2450,"Mira"],
[207.4042,-42.4739,3.04,-0.17,-0.023,-0.020,26000,"Mu Cen"],
[155.5821,41.4994,3.05,1.59,-0.082,0.035,3500,"Tania Australis"],
[191.5704,-68.1081,3.05,-0.18,-0.039,-0.017,26000,"Bet Mus"],
[230.1821,71.8339,3.05,0.05,-0.019,0.020,9250,"Pherkad"],
[288.1388,67.6617,3.07,1.00,0.094,0.093,5100,"Nodus Secundus"],
[252.9675,-38.0475,3.08,-0.20,-0.011,-0.025,28000,"Mu 1Sco"],
[292.6804,27.9597,3.08,1.13,0.002,-0.002,4550,"Albireo"],
[305.2529,-14.7814,3.08,0.79,0.042,0.002,6300,"Dabih. Beta1 = Dabih Major"],
[133.8483,5.9456,3.11,1.00,-0.099,0.014,5100,"Zet Hya"],
[162.4062,-16.1936,3.11,1.25,0.094,0.200,4700,"Nu Hya"],
[274.4067,-36.7617,3.11,1.56,-0.128,-0.167,3050,"Eta Sgr"],
[309.3917,-47.2914,3.11,1.00,0.053,0.066,5000,"Alp Ind"],
[87.7400,-35.7683,3.12,1.16,0.059,0.401,4700,"Wezn"],
[140.2637,34.3925,3.13,1.55,-0.221,0.019,3950,"Alp Lyn"],
[142.8054,-57.0344,3.13,1.55,-0.032,0.004,4250,"HR 3803"],
[173.9450,-63.0197,3.13,-0.04,-0.041,-0.005,12000,"Lam Cen"],
[224.7904,-42.1042,3.13,-0.20,-0.019,-0.024,26000,"Kap Cen"],
[254.6550,-55.9903,3.13,1.60,-0.019,-0.036,4550,"Zet Ara"],
[134.8017,48.0417,3.14,0.19,-0.444,-0.226,8250,"Talitha"],
[258.7579,24.8392,3.14,0.08,-0.021,-0.157,9250,"Sarin"],
[258.7617,36.8092,3.16,1.44,-0.026,0.004,4550,"Pi Her"],
[76.6287,41.2344,3.17,-0.18,0.029,-0.068,24000,"Hoedus II. One of the kids, with HR 1612"],
[99.4404,-43.1961,3.17,-0.11,0.002,-0.006,14000,"Nu Pup"],
[143.2142,51.6772,3.17,0.46,-0.954,-0.531,6600,"The UMa"],
[257.1967,65.7147,3.17,-0.12,-0.020,0.022,18000,"Aldhibah"],
[281.4142,-26.9908,3.17,-0.11,0.053,0.000,14000,"Phi Sgr"],
[72.4600,6.9614,3.19,0.45,0.466,0.012,6600,"Designated Tabit by Becvar but Allen gives Thabit as Burritts name for an unlettered star on his atlas, the Upsilon of Heis (HR 1855). The superscripts for Pi Ori adopted in the Harvard catalogues and taken over in the BS correspond to the Heis atlas and Argelanders identifications of Flamsteed numbers. Very many old catalogues follow the BAC. Heis superscripts 1,2,3,4 are respectively 4,2,1,3 in the BAC"],
[76.3654,-22.3711,3.19,1.46,0.025,-0.074,4250,"Eps Lep"],
[220.6267,-64.9753,3.19,0.24,-0.192,-0.232,8750,"Alp Cir"],
[254.4171,9.3750,3.20,1.15,-0.291,-0.010,4700,"Kap Oph"],
[318.2342,30.2269,3.20,0.99,0.001,-0.056,5200,"Zet Cyg"],
[267.4646,-37.0433,3.21,1.17,0.049,0.033,4700,"HR 6630"],
[354.8367,77.6325,3.21,1.03,-0.067,0.151,4850,"Alrai"],
[230.3429,-40.6475,3.22,-0.22,-0.015,-0.026,28000,"Del Lup"],
[302.8263,-0.8214,3.23,-0.07,0.038,0.004,12000,"The Aql"],
[322.1650,70.5608,3.23,-0.22,0.010,0.007,28000,"Alfirk"],
[44.5654,-40.3047,3.24,0.14,-0.045,0.019,9000,"Acamar"],
[56.8096,-74.2389,3.24,1.62,0.047,0.114,3200,"Gam Hyi"],
[244.5804,-4.6925,3.24,0.96,0.085,0.041,5100,"Yed Posterior"],
[284.7358,32.6894,3.24,-0.05,-0.002,0.002,12000,"Sulafat"],
[112.3075,-43.3014,3.25,1.51,-0.055,0.187,4250,"Sig Pup"],
[275.3275,-2.8989,3.26,0.94,-0.547,-0.700,5000,"Eta Ser"],
[9.8321,30.8608,3.27,1.28,0.136,-0.091,4550,"Del And"],
[68.4992,-55.0450,3.27,-0.10,0.051,-0.003,10000,"Alp Dor"],
[102.0475,-61.9414,3.27,0.21,-0.069,0.269,8250,"Alp Pic"],
[211.5929,-26.6825,3.27,1.12,0.044,-0.139,4700,"Pi Hya"],
[260.5025,-24.9994,3.27,-0.22,-0.004,-0.020,26000,"The Oph"],
[343.6625,-15.8208,3.27,0.05,-0.040,-0.025,9250,"Skat"],
[93.7192,22.5067,3.28,1.60,-0.068,-0.012,3050,"Propus"],
[226.0175,-25.2819,3.29,1.70,-0.073,-0.043,3050,"Brachium"],
[231.2325,58.9661,3.29,1.16,-0.009,0.017,4700,"Ed Asich"],
[16.5208,-46.7186,3.31,0.89,-0.027,-0.001,5200,"Bet Phe"],
[78.2329,-16.2056,3.31,-0.11,0.043,-0.026,12000,"Mu Lep"],
[183.8567,57.0325,3.31,0.08,0.104,0.009,9250,"Megrez"],
[153.4342,-70.0381,3.32,-0.08,-0.039,0.007,14000,"Ome Car"],
[158.0058,-61.6853,3.32,-0.09,-0.019,0.009,22000,"HR 4140"],
[286.7350,-27.6706,3.32,1.19,-0.053,-0.251,4850,"Tau Sgr"],
[258.0383,-43.2392,3.33,0.41,0.024,-0.287,7050,"Eta Sco"],
[117.3237,-24.8597,3.34,1.24,-0.003,-0.002,5400,"Azmidiske"],
[168.5600,15.4294,3.34,-0.01,-0.061,-0.079,9500,"Chort"],
[261.3483,-56.3775,3.34,-0.13,-0.002,-0.012,28000,"Gam Ara"],
[269.7567,-9.7736,3.34,0.99,-0.007,-0.116,5000,"Nu Oph"],
[63.6062,-62.4739,3.35,0.91,0.045,0.045,5200,"Alp Ret"],
[332.7138,58.2011,3.35,1.57,0.015,0.004,4850,"Zet Cep"],
[81.1192,-2.3969,3.36,-0.17,0.002,0.000,28000,"Eta Ori"],
[101.3225,12.8956,3.36,0.43,-0.116,-0.191,6750,"Alzirr"],
[127.5662,60.7181,3.36,0.84,-0.133,-0.107,5500,"Muscida"],
[291.3746,3.1147,3.36,0.32,0.257,0.082,7050,"Del Aql"],
[203.6733,-0.5958,3.37,0.11,-0.285,0.042,9250,"Heze"],
[230.6704,-44.6894,3.37,-0.18,-0.019,-0.013,26000,"Eps Lup"],
[28.5987,63.6700,3.38,-0.15,0.032,-0.021,24000,"Called Segin in Becvar"],
[131.6942,6.4189,3.38,0.68,-0.189,-0.051,5500,"Eps Hya"],
[193.9008,3.3975,3.38,1.58,-0.469,-0.054,3050,"Auva"],
[46.2942,38.8403,3.39,1.65,0.130,-0.106,2900,"Gorgonea Tertia"],
[67.1654,15.8708,3.40,0.18,0.103,-0.025,8250,"The2Tau"],
[154.2708,-61.3322,3.40,1.54,-0.024,0.005,4550,"HR 4050"],
[340.3654,10.8314,3.40,-0.09,0.080,-0.013,14000,"Homam"],
[22.0913,-43.3183,3.41,1.57,-0.014,-0.209,3500,"Gam Phe"],
[28.2704,29.5789,3.41,0.49,0.011,-0.235,6600,"Metallah"],
[207.3762,-41.6878,3.41,-0.22,-0.022,-0.021,26000,"Nu Cen"],
[228.0712,-52.0992,3.41,0.92,-0.112,-0.073,5200,"Zet Lup"],
[240.0304,-38.3969,3.41,-0.22,-0.022,-0.032,26000,"Eta Lup"],
[266.6146,27.7206,3.42,0.75,-0.311,-0.751,5500,"Mu Her"],
[311.2396,-66.2031,3.42,0.16,-0.046,0.012,8250,"Bet Pav"],
[311.3225,61.8389,3.43,0.92,0.087,0.818,5000,"Eta Cep"],
[12.2750,57.8158,3.44,0.57,1.100,-0.529,6150,"Achird, according to Becvar"],
[137.7417,-58.9669,3.44,-0.19,-0.026,0.008,26000,"a Car"],
[154.1725,23.4172,3.44,0.31,0.018,-0.007,7500,"Adhafera"],
[286.5621,-4.8825,3.44,-0.09,-0.017,-0.090,12000,"Lam Aql"],
[17.1475,-10.1822,3.45,1.16,0.218,-0.138,4850,"Dheneb"],
[154.2742,42.9144,3.45,0.03,-0.164,-0.038,9500,"Tania Borealis. With HR 4069, Al Kafzah al Thaniyah"],
[282.5200,33.3628,3.45,0.00,0.003,-0.003,14000,"Sheliak"],
[40.8250,3.2358,3.47,0.09,-0.142,-0.152,9250,"Kaffaljidhma"],
[60.1700,12.4903,3.47,-0.12,-0.006,-0.012,24000,"Lam Tau"],
[105.4296,-27.9347,3.47,1.73,-0.005,0.005,3950,"Sig CMa"],
[119.1946,-52.9822,3.47,-0.18,-0.029,0.021,24000,"Chi Car"],
[228.8758,33.3147,3.47,0.95,0.086,-0.112,5200,"Del Boo"],
[299.6892,19.4922,3.47,1.57,0.066,0.024,3500,"Gam Sge"],
[169.6196,33.0942,3.48,1.40,-0.026,0.028,4550,"Alula Borealis"],
[258.6621,14.3903,3.48,1.44,-0.006,0.036,2750,"Rasalgethi"],
[342.5008,24.6017,3.48,0.93,0.147,-0.042,5200,"Mu Peg"],
[342.1388,-51.3169,3.49,0.08,0.108,-0.071,9250,"Eps Gru"],
[26.0171,-15.9375,3.50,0.72,-1.718,0.856,5200,"Tau Cet"],
[225.4867,40.3906,3.50,0.97,-0.041,-0.028,5200,"Nekkar"],
[276.7433,-45.9683,3.51,-0.17,-0.016,-0.054,24000,"Alp Tel"],
[284.4325,-21.1067,3.51,1.18,0.033,-0.012,4850,"Xi 2Sgr"],
[124.1288,9.1856,3.52,1.48,-0.044,-0.049,4400,"Altarf"],
[145.2875,9.8922,3.52,0.49,-0.142,-0.037,6600,"Subra"],
[151.8333,16.7628,3.52,-0.03,-0.002,0.000,10000,"Eta Leo"],
[342.4200,66.2006,3.52,1.05,-0.065,-0.125,5000,"Iot Cep"],
[67.1542,19.1803,3.53,1.01,0.107,-0.038,5100,"Ain"],
[110.0308,21.9822,3.53,0.34,-0.026,-0.012,7200,"Wasat"],
[237.4050,-3.4303,3.53,-0.04,-0.086,-0.024,10000,"Mu Ser"],
[250.7242,38.9222,3.53,0.92,0.037,-0.083,5300,"Eta Her"],
[332.5500,6.1978,3.53,0.08,0.276,0.027,9500,"Baham"],
[55.8121,-9.7633,3.54,0.92,-0.092,0.745,5000,"Rana in Becvar. But see HR 188"],
[83.7846,9.9342,3.54,-0.18,0.000,-0.006,36000,"Meissa"],
[149.2158,-54.5678,3.54,-0.08,-0.010,0.003,20000,"Phi Vel"],
[173.2504,-31.8578,3.54,0.94,-0.206,-0.040,5300,"Xi Hya"],
[264.3967,-15.3986,3.54,0.26,-0.042,-0.058,7500,"Xi Ser"],
[86.7387,-14.8219,3.55,0.10,-0.016,-0.001,9250,"Zet Lep"],
[214.8508,-46.0578,3.55,-0.18,-0.013,0.002,26000,"Iot Lup"],
[4.8571,-8.8239,3.56,1.22,-0.014,-0.036,4850,"Deneb Kaitos Shemali"],
[34.1275,-51.5122,3.56,-0.12,0.096,-0.027,14000,"Phi Eri"],
[64.4737,-33.7983,3.56,-0.12,0.067,-0.008,12000,"Ups4Eri"],
[169.8354,-14.7786,3.56,1.12,-0.122,0.208,5200,"Del Crt"],
[230.4517,-36.2614,3.56,1.54,-0.089,-0.084,4250,"Phi1Lup"],
[302.1817,-66.1819,3.56,0.76,1.207,-1.131,5400,"Del Pav"],
[24.4983,48.6283,3.57,1.28,0.065,-0.113,4550,"51 And also called Upsilon Per, but outside IAU boundaries of Perseus"],
[116.1117,24.3981,3.57,0.93,-0.033,-0.052,5200,"Kap Gem"],
[253.0838,-38.0175,3.57,-0.21,-0.011,-0.024,26000,"Mu 2Sco"],
[275.2642,72.7328,3.57,0.49,0.532,-0.350,6450,"Chi Dra"],
[304.5137,-12.5447,3.57,0.94,0.064,0.004,5200,"Secunda Giedi"],
[109.5233,16.5403,3.58,0.11,-0.048,-0.037,9250,"Lam Gem"],
[217.9575,30.3714,3.58,1.30,-0.100,0.119,4550,"Rho Boo"],
[234.2562,-28.1350,3.58,1.38,-0.009,0.003,4550,"Ups Lib"],
[185.3400,-60.4011,3.59,1.42,-0.175,0.087,4550,"Eps Cru"],
[21.0058,-8.1833,3.60,1.06,-0.079,-0.218,5000,"The Cet"],
[51.2033,9.0289,3.60,0.89,-0.066,-0.078,5400,"Omi Tau"],
[79.4017,-6.8444,3.60,-0.11,-0.015,-0.008,20000,"Tau Ori"],
[86.1158,-22.4483,3.60,0.47,-0.293,-0.370,6600,"Gam Lep"],
[103.1971,33.9611,3.60,0.10,-0.002,-0.048,9250,"The Gem"],
[135.9062,47.1567,3.60,0.00,-0.033,-0.054,9750,"Kap UMa"],
[142.6750,-40.4667,3.60,0.36,-0.182,0.073,7050,"Psi Vel"],
[116.3137,-37.9686,3.61,1.73,-0.010,0.002,4700,"Called c Pup in Argelander, Norton and most modern catalogues, this was originally called b Pup by Lacaille (1763)"],
[152.6471,-12.3542,3.61,1.01,-0.202,-0.089,5000,"Lam Hya"],
[177.6738,1.7647,3.61,0.55,0.743,-0.271,6150,"Zavijah"],
[22.8708,15.3458,3.62,0.97,0.028,-0.006,5300,"Eta Psc"],
[130.0733,-52.9219,3.62,-0.18,-0.022,0.019,24000,"Sometimes called omicron Vel, but the letter had originally been \"o\" (Roman), not omicron"],
[195.5675,-71.5489,3.62,1.18,0.256,-0.021,4700,"Del Mus"],
[253.6458,-42.3614,3.62,1.37,-0.124,-0.236,4400,"Zet2Sco"],
[262.7746,-60.6839,3.62,-0.10,-0.059,-0.096,14000,"Del Ara"],
[266.4333,-64.7239,3.62,1.19,-0.014,-0.054,4700,"Eta Pav"],
[345.4804,42.3261,3.62,-0.09,0.023,-0.006,18000,"Omi And"],
[42.4958,27.2606,3.63,-0.10,0.067,-0.118,14000,"Ari"],
[57.2904,24.0533,3.63,-0.09,0.018,-0.047,14000,"Atlas"],
[309.3875,14.5953,3.63,0.44,0.113,-0.033,6750,"Rotanev"],
[176.4017,-66.7286,3.64,0.16,-0.103,0.037,8250,"Lam Mus"],
[64.9483,15.6275,3.65,0.99,0.115,-0.025,5000,"Hyadum I"],
[190.4150,-1.4494,3.65,0.36,-0.565,0.012,7500,"Porrima"],
[211.0971,64.3758,3.65,-0.05,-0.055,0.018,10000,"Thuban"],
[313.7025,-58.4542,3.65,1.25,0.017,-0.026,4850,"Bet Ind"],
[9.2429,53.8969,3.66,-0.20,0.019,-0.009,26000,"Zet Cas"],
[234.6642,-29.7778,3.66,-0.17,-0.015,-0.030,26000,"Tau Lib"],
[271.6579,-50.0917,3.66,-0.08,-0.010,-0.014,26000,"The Ara"],
[347.3617,-21.1725,3.66,1.22,0.055,0.031,4850,"Aqr"],
[142.8821,63.0619,3.67,0.33,0.109,0.028,7500,"UMa"],
[236.5471,15.4219,3.67,0.06,0.067,-0.045,9500,"Bet Ser"],
[130.8979,-33.1864,3.68,-0.18,-0.011,0.011,28000,"Alp Pyx"],
[190.4150,-1.4494,3.68,0.00,-0.565,0.012,7500,"Gam Vir"],
[231.9571,29.1058,3.68,0.28,-0.179,0.086,7500,"Nusakan"],
[325.0229,-16.6622,3.68,0.32,0.190,-0.023,7500,"Nashira"],
[49.8792,-21.7578,3.69,1.62,0.052,0.033,3050,"Tau4Eri"],
[72.8017,5.6050,3.69,-0.17,-0.001,0.001,26000,"See HR 1543"],
[146.3117,-62.5078,3.69,1.22,-0.014,0.007,5500,"HR 3884"],
[349.2912,3.2822,3.69,0.92,0.762,0.017,5100,"Gam Psc"],
[28.9896,-51.6089,3.70,0.85,0.681,0.292,5200,"Chi Eri"],
[56.2188,24.1133,3.70,-0.11,0.019,-0.046,18000,"Electra"],
[269.4412,29.2478,3.70,0.94,0.084,-0.017,5200,"Xi Her"],
[89.1013,-14.1678,3.71,0.33,-0.042,0.139,7350,"Eta Lep"],
[176.5125,47.7794,3.71,1.18,-0.137,0.030,5000,"Discordances as to whether Xi or Iota and Kappa UMa (HR 3569, 3594) should be El Koprah, Alkaphrah"],
[237.7042,4.4778,3.71,0.15,0.128,0.063,9500,"Eps Ser"],
[298.8283,6.4067,3.71,0.86,0.048,-0.482,5200,"Alshain"],
[73.5629,2.4406,3.72,-0.18,0.000,0.000,24000,"Pi 5Ori"],
[89.8817,54.2847,3.72,1.00,0.081,-0.125,5000,"Del Aur"],
[221.5621,1.8928,3.72,-0.01,-0.114,-0.026,10000,"Vir"],
[316.2329,43.9278,3.72,1.65,0.008,0.001,4400,"Xi Cyg"],
[318.6979,38.0456,3.72,0.39,0.160,0.435,7200,"Tau Cyg"],
[27.8650,-10.3350,3.73,1.14,0.041,-0.039,5000,"Baten Kaitos"],
[53.2325,-9.4583,3.73,0.88,-0.974,0.021,4700,"Eps Eri"],
[118.0542,-40.5758,3.73,1.04,-0.010,0.003,4850,"a Puppis, often misnamed alpha"],
[271.8375,9.5639,3.73,0.12,-0.060,0.080,9000,"Oph"],
[51.7925,9.7328,3.74,-0.09,0.060,-0.039,12000,"Xi Tau"],
[321.6667,-22.4114,3.74,1.00,0.001,0.023,5600,"(Schoenfeld 1886), SD-23d442"],
[343.1538,-7.5797,3.74,1.64,0.011,0.037,3200,"Lam Aqr"],
[75.6196,41.0758,3.75,1.22,0.009,-0.022,4400,"Haedi"],
[136.0387,-47.0978,3.75,1.20,-0.044,-0.013,4700,"HR 3614"],
[245.4800,19.1531,3.75,0.27,-0.047,0.043,7750,"Gam Her"],
[266.9733,2.7072,3.75,0.04,-0.022,-0.074,10000,"Gam Oph"],
[268.3821,56.8728,3.75,1.18,0.094,0.080,4700,"Grumium"],
[337.2929,58.4153,3.75,0.60,0.015,0.001,6750,"Del Cep"],
[42.6742,55.8956,3.76,1.68,0.017,-0.014,4550,"Miram in Becvar"],
[65.7338,17.5425,3.76,0.98,0.107,-0.030,5000,"Hyadum II"],
[83.4062,-62.4897,3.76,0.82,0.002,0.009,6600,"Bet Dor"],
[252.4463,-59.0414,3.76,1.57,0.038,-0.028,4250,"Eta Ara"],
[325.3687,-77.3900,3.76,1.00,0.045,-0.240,5000,"Nu Oct"],
[331.7529,25.3450,3.76,0.44,0.298,0.025,6750,"Iot Peg"],
[56.2983,42.5786,3.77,0.42,-0.014,-0.002,6750,"Nu Per"],
[126.4342,-66.1369,3.77,1.13,-0.036,-0.155,4850,"Bet Vol"],
[286.1708,-21.7417,3.77,1.01,0.080,-0.060,5100,"Omi Sgr"],
[289.2758,53.3686,3.77,0.96,0.059,0.125,5100,"Kap Cyg"],
[309.9096,15.9119,3.77,-0.06,0.066,-0.002,12000,"Sualocin"],
[311.9192,-9.4958,3.77,0.00,0.035,-0.034,9750,"Albali"],
[337.8229,50.2825,3.77,0.01,0.138,0.019,9750,"Alp Lac"],
[107.1871,-70.4989,3.78,1.04,0.023,0.106,5000,"Gam2Vol"],
[163.3733,-58.8533,3.78,0.95,0.067,0.030,4850,"HR 4257"],
[106.0271,20.5703,3.79,0.79,-0.009,0.000,6450,"Mekbuda"],
[111.4317,27.7981,3.79,1.03,-0.123,-0.086,5100,"Propus, a name more commonly applied to HR 2216"],
[292.4262,51.7297,3.79,0.14,0.020,0.130,8750,"Iot2Cyg"],
[303.4079,46.7414,3.79,1.28,0.004,0.003,4700,"See HR 7730"],
[47.3742,44.8572,3.80,0.98,0.177,-0.157,5000,"Kap Per"],
[147.7475,59.0386,3.80,0.29,-0.293,-0.151,7200,"Ups UMa"],
[154.9942,19.8406,3.80,0.00,0.312,-0.169,5300,"Gam2Leo"],
[233.7004,10.5375,3.80,0.26,-0.074,-0.005,7500,"Del Ser"],
[233.7004,10.5392,3.80,0.26,-0.074,0.012,7500,"Del Ser"],
[264.8662,46.0064,3.80,-0.18,-0.005,0.005,24000,"Iot Her"],
[84.6867,-2.6000,3.81,-0.24,0.002,0.001,33000,"Sig Ori"],
[87.8304,-20.8792,3.81,0.99,0.227,-0.649,5000,"Del Lep"],
[156.5225,-16.8364,3.81,1.48,-0.128,-0.080,4400,"Mu Hya"],
[68.8875,-30.5622,3.82,0.98,-0.045,-0.012,5200,"Theemim"],
[139.7113,36.8025,3.82,0.06,-0.030,-0.122,9250,"Lyn"],
[156.9696,-58.7394,3.82,0.31,-0.013,0.000,7200,"HR 4114"],
[247.7283,1.9839,3.82,0.01,-0.027,-0.073,10000,"Marfic"],
[296.8471,18.5342,3.82,1.41,0.007,0.008,3200,"Del Sge"],
[354.3913,46.4581,3.82,1.01,0.162,-0.421,5200,"Lam And"],
[56.0796,32.2883,3.83,0.05,0.007,-0.011,28000,"Atik"],
[163.3279,34.2150,3.83,1.04,0.087,-0.278,5000,"Praecipua"],
[209.5679,-42.1008,3.83,-0.21,-0.024,-0.021,26000,"Phi Cen"],
[221.9650,-79.0447,3.83,1.43,-0.012,-0.015,4550,"Alp Aps"],
[271.8858,28.7625,3.83,-0.03,0.001,0.009,12000,"Omi Her"],
[297.0433,70.2678,3.83,0.89,0.082,0.037,5300,"Tyl"],
[67.1438,15.9622,3.84,0.95,0.103,-0.027,5000,"The1Tau"],
[130.1567,-46.6489,3.84,0.71,0.000,0.003,7050,"HR 3445"],
[133.7617,-60.6447,3.84,-0.10,-0.021,0.038,14000,"HR 3571"],
[159.3254,-48.2258,3.84,0.30,-0.155,-0.017,6900,"HR 4167"],
[172.8508,69.3311,3.84,1.62,-0.039,-0.017,3500,"Gianfar"],
[235.6858,26.2956,3.84,0.00,-0.105,0.045,12000,"Gam CrB"],
[275.9246,21.7697,3.84,1.18,0.196,-0.242,4700,"Her"],
[335.4142,-1.3872,3.84,-0.05,0.132,0.007,10000,"Sadalachbia"],
[56.0500,-64.8069,3.85,1.13,0.313,0.076,4700,"Bet Ret"],
[86.8212,-51.0664,3.85,0.17,0.011,0.085,8750,"Bet Pic"],
[95.5283,-33.4364,3.85,0.88,-0.024,-0.055,5300,"Del Col"],
[108.7029,-26.7728,3.85,-0.17,-0.008,0.006,26000,"Ome CMa"],
[153.6842,-42.1219,3.85,0.05,-0.145,0.045,9500,"HR 4023"],
[158.2029,9.3067,3.85,-0.14,-0.007,-0.003,28000,"Rho Leo"],
[239.1133,15.6617,3.85,0.48,0.312,-1.281,6600,"Gam Ser"],
[243.8596,-63.6856,3.85,1.11,0.002,-0.011,5800,"Del TrA"],
[278.8017,-8.2442,3.85,1.33,-0.015,-0.312,4550,"Alp Sct"],
[63.5004,-42.2944,3.86,1.10,0.046,-0.209,4850,"Alp Hor"],
[189.4258,-48.5411,3.86,0.05,-0.184,-0.005,9500,"Tau Cen"],
[269.0633,37.2506,3.86,1.35,0.004,0.006,4850,"The Her"],
[273.4408,-21.0589,3.86,0.23,0.002,0.001,14000,"Mu Sgr"],
[14.1883,38.4994,3.87,0.13,0.152,0.033,8750,"Mu And"],
[48.0179,-28.9869,3.87,0.52,0.339,0.640,6300,"Fornacis"],
[56.4567,24.3678,3.87,-0.07,0.020,-0.046,14000,"Maia"],
[69.5450,-14.3039,3.87,1.09,-0.075,-0.156,4700,"Sceptrum"],
[82.8029,-35.4706,3.87,1.14,0.022,-0.035,4850,"Eps Col"],
[103.5329,-24.1839,3.87,1.73,-0.008,0.013,4700,"Omi1CMa"],
[188.1167,-72.1331,3.87,-0.15,-0.058,-0.002,20000,"Gam Mus"],
[188.3708,69.7883,3.87,-0.13,-0.059,0.012,18000,"Kap Dra"],
[209.6700,-44.8036,3.87,-0.20,-0.025,-0.024,26000,"Ups1Cen"],
[227.9838,-48.7378,3.87,-0.05,-0.095,-0.049,12000,"Kap1Lup"],
[2.3529,-45.7475,3.88,1.03,0.124,-0.181,5000,"Eps Phe"],
[138.5912,2.3142,3.88,-0.06,0.129,-0.310,12000,"The Hya"],
[148.1908,26.0069,3.88,1.22,-0.216,-0.056,4700,"Ras Elased Borealis"],
[202.7613,-39.4075,3.88,1.17,-0.012,-0.015,5100,"HR 5089"],
[220.7650,-5.6583,3.88,0.38,0.109,-0.316,7200,"Rijl al Awwa"],
[239.2212,-29.2142,3.88,-0.20,-0.013,-0.025,26000,"Rho Sco"],
[44.1071,-8.8981,3.89,1.11,0.079,-0.220,4850,"Azha"],
[170.2517,-54.4911,3.89,-0.15,-0.036,-0.006,20000,"Pi Cen"],
[184.9767,-0.6669,3.89,0.02,-0.063,-0.018,9500,"Zaniah"],
[244.9350,46.3133,3.89,-0.15,-0.011,0.040,20000,"Tau Her"],
[248.3625,-78.8972,3.89,0.91,-0.131,-0.076,5200,"Gam Aps"],
[299.0767,35.0833,3.89,1.02,-0.032,-0.027,5000,"Eta Cyg"],
[126.4150,-3.9064,3.90,-0.02,-0.066,-0.023,10000,"HR 3314"],
[298.1183,1.0056,3.90,0.89,0.011,-0.007,6600,"Eta Aql"],
[347.5900,-45.2467,3.90,1.02,0.136,-0.030,4850,"Iot Gru"],
[60.7892,5.9892,3.91,0.03,0.005,-0.003,9750,"Nu Tau"],
[131.5071,-46.0417,3.91,0.00,-0.001,0.000,9750,"HR 3487"],
[144.9642,-1.1428,3.91,1.32,0.049,-0.064,4700,"Iot Hya"],
[167.1475,-58.9750,3.91,1.23,-0.007,0.000,5600,"HR 4337"],
[187.0100,-50.2306,3.91,-0.19,-0.030,-0.015,26000,"Sig Cen"],
[233.8817,-14.7894,3.91,1.01,0.065,0.009,5200,"Zuben Elakrab"],
[17.0963,-55.2458,3.92,-0.08,0.019,0.025,18000,"Zet Phe"],
[255.0725,30.9264,3.92,-0.01,-0.047,0.028,10000,"Eps Her"],
[318.9558,5.2478,3.92,0.53,0.059,-0.088,6000,"Kitalpha"],
[69.0796,-3.3525,3.93,-0.21,0.002,-0.005,26000,"Nu Eri"],
[115.3117,-9.5511,3.93,1.02,-0.073,-0.019,5000,"In early catalogues called Gamma Mon"],
[290.4183,-17.8472,3.93,0.22,-0.024,0.024,7500,"Rho1Sgr"],
[6.5508,-43.6800,3.94,0.17,0.109,0.029,8250,"Kap Phe"],
[131.1712,18.1542,3.94,1.08,-0.018,-0.228,5000,"Asellus Australis"],
[170.9812,10.5292,3.94,0.41,0.168,-0.075,6900,"Iot Leo"],
[314.2933,41.1672,3.94,0.02,0.012,-0.016,9750,"Nu Cyg"],
[22.8129,-49.0728,3.95,0.99,0.142,0.151,5000,"Del Phe"],
[43.5646,52.7625,3.95,0.74,0.000,-0.005,5600,"Tau Per"],
[99.1708,-19.2558,3.95,1.06,0.059,-0.062,4850,"Nu 2CMa"],
[115.4550,-72.6061,3.95,1.04,0.030,0.018,5000,"Zet Vol"],
[200.9850,54.9217,3.95,0.13,0.119,-0.028,9750,"Zet UMa"],
[237.7396,-33.6272,3.95,-0.04,-0.006,-0.030,12000,"Chi Lup"],
[341.6329,23.5656,3.95,1.07,0.058,-0.010,5200,"Lam Peg"],
[66.0092,-34.0169,3.96,1.49,0.069,0.051,4400,"Eri"],
[89.7867,-42.8153,3.96,1.14,0.022,-0.014,5000,"Eta Col"],
[102.4604,-32.5086,3.96,-0.23,-0.007,0.004,28000,"Kap CMa"],
[115.9521,-28.9547,3.96,0.18,0.002,0.005,9500,"Called Tau in Argelander, Bayer, HP 1462, (but now Tau is HR 2553). HR 2996 called l in HR 50 and Lacaille 1763"],
[182.9129,-52.3686,3.96,-0.15,-0.035,-0.016,24000,"Rho Cen"],
[241.7017,-20.6692,3.96,-0.04,-0.009,-0.021,28000,"Ome1Sco"],
[300.1479,-72.9106,3.96,-0.03,0.074,-0.132,10000,"Eps Pav"],
[87.8725,39.1486,3.97,1.13,-0.005,0.007,5100,"Nu Aur"],
[130.0258,-35.3083,3.97,0.94,0.012,-0.022,5300,"Bet Pyx"],
[135.1600,41.7828,3.97,0.44,-0.440,-0.246,6750,"Formerly known as 10 UMa, in Lynx"],
[137.8192,-62.3172,3.97,-0.18,-0.043,0.009,24000,"HR 3663"],
[270.1612,2.9317,3.97,0.02,0.002,-0.008,20000,"Oph"],
[290.9717,-40.6161,3.97,-0.10,0.030,-0.123,14000,"Rukbat"],
[337.3175,-43.4956,3.97,1.03,0.028,-0.005,5400,"Del1Gru"],
[350.7425,-20.1006,3.97,1.10,-0.120,-0.096,5000,"Aqr"],
[30.8587,72.4214,3.98,-0.01,-0.045,0.022,9500,"Cas"],
[93.7137,-6.2747,3.98,1.32,-0.008,-0.019,4850,"Called Alpha Mon in BAC and many early catalogues. Now HR 2970 is called Alpha Mon"],
[109.2075,-67.9572,3.98,0.79,-0.007,0.005,6600,"Del Vol"],
[303.8679,47.7144,3.98,1.52,0.001,0.008,4550,"Originally called Omicron2 Cyg in GCVS, the name has been changed to V1488 Cyg because of much confusion as to which star is Omicron1, which Omicron2. See HR 7730"],
[349.3575,-58.2358,3.99,0.40,-0.029,0.079,7350,"Gam Tuc"],
[30.0013,-21.0778,4.00,1.57,0.135,-0.024,3500,"Ups Cet"],
[43.4704,-49.8903,4.00,2.11,0.135,0.014,2450,"HR 868"],
[135.6117,-66.3961,4.00,0.14,-0.002,-0.096,9500,"Alp Vol"],
[156.0987,-74.0317,4.00,0.35,-0.021,-0.026,7200,"HR 4102"],
[220.4900,-37.7936,4.00,-0.17,-0.023,-0.032,24000,"HR 5471"],
[34.3287,33.8472,4.01,0.02,0.047,-0.051,9750,"Gam Tri"],
[132.6329,-27.7100,4.01,1.27,-0.130,0.087,4550,"Gam Pyx"],
[201.3063,54.9881,4.01,0.16,0.118,-0.016,8750,"Alcor"],
[240.4721,58.5653,4.01,0.52,-0.320,0.335,6300,"The Dra"],
[242.9988,-19.4606,4.01,0.04,-0.010,-0.023,24000,"Jabbah"],
[280.7588,-71.4281,4.01,1.14,-0.005,-0.156,5000,"Zet Pav"],
[290.6596,-44.4589,4.01,-0.10,0.009,-0.020,12000,"Arkab Prior"],
[307.3487,30.3686,4.01,0.40,0.007,0.000,6750,"Cyg"],
[342.3979,-13.5925,4.01,1.57,-0.012,-0.038,3500,"Sometimes called Tau2 Aqr"],
[359.8279,6.8633,4.01,0.42,0.153,-0.115,6900,"Ome Psc"],
[71.3754,-3.2547,4.02,-0.15,0.016,-0.013,20000,"Mu Eri"],
[131.6742,28.7600,4.02,1.01,-0.025,-0.042,5300,"Iot Cnc"],
[182.1033,-24.7289,4.02,0.32,0.086,-0.040,7200,"Alchiba"],
[244.9600,-50.1556,4.02,1.08,-0.155,-0.053,5200,"Gam2Nor"],
[284.9058,15.0683,4.02,1.08,-0.051,-0.073,4850,"Deneb el Okab"],
[285.4200,-5.7389,4.02,1.09,-0.019,-0.033,4850,"Aql"],
[323.4954,45.5919,4.02,0.89,-0.023,-0.094,5200,"Rho Cyg"],
[338.8392,-0.1175,4.02,-0.09,0.091,-0.056,12000,"Eta Aqr"],
[75.8546,60.4422,4.03,0.92,-0.006,-0.016,5900,"Bet Cam"],
[176.4650,6.5294,4.03,1.51,-0.018,-0.184,3350,"Nu Vir"],
[193.6483,-57.1778,4.03,-0.17,-0.033,-0.006,26000,"Mu 1Cru"],
[271.3637,2.4994,4.03,0.86,0.266,-1.093,5000,"Oph"],
[308.3033,11.3033,4.03,-0.13,0.013,-0.022,18000,"Deneb Dulfim"],
[59.7413,35.7911,4.04,0.01,0.002,0.000,39000,"Menkib"],
[62.1654,47.7125,4.04,-0.03,0.021,-0.030,24000,"Per"],
[62.9663,-6.8375,4.04,0.33,0.010,0.082,7200,"Beid"],
[184.6088,-64.0031,4.04,-0.17,-0.050,-0.010,26000,"Zet Cru"],
[283.8338,43.9461,4.04,1.59,0.023,0.083,2750,"Lyr"],
[47.2667,49.6133,4.05,0.59,1.263,-0.091,6000,"Iot Per"],
[170.2842,6.0294,4.05,-0.06,-0.092,-0.012,12000,"Sig Leo"],
[215.1392,-37.8853,4.05,-0.03,-0.063,-0.012,10000,"Psi Cen"],
[216.2992,51.8508,4.05,0.50,-0.236,-0.397,6450,"Asellus Primus"],
[219.4717,-49.4258,4.05,-0.15,-0.024,-0.031,20000,"Rho Lup"],
[220.9142,-35.1736,4.05,1.35,-0.064,-0.180,4550,"HR 5485"],
[227.2108,-45.2797,4.05,-0.18,-0.016,-0.019,24000,"Lam Lup"],
[11.8346,24.2672,4.06,1.12,-0.100,-0.083,4850,"Zet And"],
[113.9804,26.8958,4.06,1.54,-0.034,-0.106,3500,"Ups Gem"],
[254.8963,-53.1606,4.06,1.45,0.004,0.017,4400,"Eps1Ara"],
[25.9150,50.6886,4.07,-0.04,0.026,-0.014,26000,"Phi Per"],
[39.8708,0.3286,4.07,-0.22,0.014,-0.004,26000,"Del Cet"],
[74.0929,13.5144,4.07,1.15,-0.074,-0.047,4700,"Omi2Ori"],
[103.5475,-12.0386,4.07,1.43,-0.137,-0.013,4400,"The CMa"],
[124.6317,-76.9197,4.07,0.39,0.110,0.108,6750,"Alp Cha"],
[131.1000,-42.6492,4.07,0.87,-0.012,0.018,5500,"HR 3477"],
[207.3692,15.7978,4.07,1.52,-0.095,0.042,4250,"Ups Boo"],
[229.3783,-58.8011,4.07,0.09,-0.100,-0.137,9250,"Bet Cir"],
[316.4867,-17.2328,4.07,-0.01,0.083,-0.060,9750,"The Cap"],
[143.6112,-59.2294,4.08,0.01,-0.012,0.014,20000,"HR 3825"],
[164.9437,-18.2989,4.08,1.09,-0.460,0.130,5000,"Alkes"],
[171.2204,-17.6839,4.08,0.21,-0.098,0.004,8750,"Gam Crt"],
[214.0037,-6.0006,4.08,0.52,-0.004,-0.432,6600,"Syrma"],
[320.5217,19.8044,4.08,1.11,0.106,0.064,4850,"Peg"],
[325.8767,58.7800,4.08,2.35,0.003,-0.003,3200,"Herschels \"Garnet Star\". Both Bayer (1603) and Argelander (1843) showed Mu Cep in the position of 14 Cep = HR 8406. Heis (1872), however, in cataloguing the stars in Argelanders Atlas, misidentified Mu as the star currently known as the variable Mu Cep (HR 8316). A third star, 13 Cep (HR 8371), was identified in BAC and numerous subsequent old catalogues as Mu Cep. See HR 8371, HR 8406"],
[24.1992,41.4056,4.09,0.54,-0.171,-0.382,6300,"Ups And"],
[35.4371,-68.6594,4.09,0.03,-0.050,0.002,9250,"Del Hyi"],
[45.5979,-23.6244,4.09,0.16,-0.145,-0.054,9000,"Tau3Eri"],
[84.2262,9.2906,4.09,0.95,0.091,-0.305,5000,"Phi2Ori"],
[237.1850,18.1417,4.09,1.62,-0.051,-0.088,3500,"Kap Ser"],
[40.1667,-39.8556,4.11,1.02,0.138,-0.032,5000,"Iot Eri"],
[39.8975,-68.2669,4.11,-0.06,0.086,-0.002,12000,"Eps Hyi"],
[52.7183,12.9367,4.11,1.12,0.020,-0.002,5000,"Tau"],
[117.3096,-46.3733,4.11,-0.18,0.000,0.006,30000,"HR 3055"],
[158.8671,-78.6078,4.11,1.58,-0.042,0.014,3500,"Gam Cha"],
[176.6283,-61.1783,4.11,0.90,-0.027,-0.015,5500,"HR 4522"],
[184.3921,-67.9608,4.11,1.58,-0.244,-0.025,2750,"Eps Mus"],
[234.1800,-66.3169,4.11,1.17,0.023,-0.055,4850,"Eps TrA"],
[287.3679,-37.9044,4.11,0.04,0.084,-0.098,9500,"Alfecca Meridiana"],
[287.5071,-39.3408,4.11,1.20,0.003,-0.038,5000,"Bet CrA"],
[312.9554,-26.9192,4.11,1.64,-0.006,-0.001,3500,"Ome Cap"],
[337.4396,-43.7494,4.11,1.57,-0.007,0.000,2900,"Del2Gru"],
[41.0500,49.2283,4.12,0.49,0.336,-0.089,6300,"The Per"],
[90.5958,9.6475,4.12,0.16,0.015,-0.028,9500,"Mu Ori"],
[105.9396,-15.6333,4.12,-0.12,-0.002,-0.008,14000,"Muliphen"],
[147.8696,-14.8467,4.12,0.92,0.017,-0.026,5300,"Ups1Hya"],
[181.3021,8.7331,4.12,0.98,-0.220,0.046,5200,"Omi Vir"],
[345.2200,-52.7542,4.12,0.98,-0.067,-0.014,5200,"Zet Gru"],
[277.2079,-49.0708,4.13,1.02,0.144,-0.242,5200,"Zet Tel"],
[298.8154,-41.8683,4.13,1.08,0.017,0.056,5000,"Iot Sgr"],
[326.1613,25.6450,4.13,0.43,0.034,0.010,6750,"Kap Peg"],
[333.9925,37.7489,4.13,1.46,0.013,0.004,4550,"Lac"],
[354.9875,5.6264,4.13,0.51,0.378,-0.438,6450,"Iot Psc"],
[63.7246,48.4094,4.14,0.95,0.005,-0.018,6000,"Mu Per"],
[80.9867,-7.8081,4.14,0.96,-0.015,-0.043,5200,"Ori"],
[129.4112,-42.9892,4.14,0.11,-0.006,0.008,8500,"HR 3426"],
[233.2325,31.3592,4.14,-0.13,-0.019,-0.011,18000,"The CrB"],
[311.5237,-25.2708,4.14,0.43,-0.050,-0.157,6900,"Psi Cap"],
[355.1021,44.3339,4.14,-0.08,0.083,-0.019,12000,"Kap And"],
[97.2408,20.2122,4.15,-0.13,-0.007,-0.014,18000,"Nu Gem"],
[107.9663,-0.4928,4.15,-0.01,-0.001,0.005,9500,"Del Mon"],
[181.7204,-64.6136,4.15,0.34,0.033,-0.037,7200,"Eta Cru"],
[238.4562,-16.7294,4.15,1.02,0.099,0.133,5200,"The Lib"],
[239.3971,26.8778,4.15,1.23,-0.076,-0.061,4700,"Eps CrB"],
[341.5137,-81.3817,4.15,0.20,-0.067,-0.001,7750,"Bet Oct"],
[8.2500,62.9317,4.16,0.14,0.003,-0.003,28000,"Kap Cas"],
[91.0300,23.2633,4.16,0.82,-0.008,-0.100,5300,"Propus, a name more commonly applied to HR 2216"],
[129.4142,5.7036,4.16,0.00,-0.066,-0.007,9750,"Del Hya"],
[249.0938,-35.2556,4.16,1.57,0.022,0.000,4100,"HR 6166"],
[334.2083,-7.7833,4.16,0.98,0.121,-0.022,5200,"Ancha"],
[57.3637,-36.2003,4.17,0.95,-0.046,-0.051,5100,"HR 1195"],
[261.5925,-24.1753,4.17,0.28,0.000,-0.116,9250,"Oph"],
[340.1642,-27.0436,4.17,-0.11,0.030,-0.001,14000,"Eps PsA"],
[56.5817,23.9483,4.18,-0.06,0.021,-0.045,18000,"Merope"],
[112.2779,31.7844,4.18,0.32,0.155,0.175,7500,"Rho Gem"],
[214.0958,46.0883,4.18,0.08,-0.187,0.161,10000,"Lam Boo"],
[207.3612,-34.4508,4.19,1.50,-0.042,-0.057,2900,"Cen"],
[213.2242,-10.2736,4.19,1.33,0.008,0.140,4700,"Kap Vir"],
[281.4154,20.5464,4.19,0.46,-0.008,-0.335,6600,"Her"],
[333.7583,57.0436,4.19,0.28,0.447,0.048,7500,"Eps Cep"],
[341.6733,12.1728,4.19,0.50,0.235,-0.498,6600,"Xi Peg"],
[82.6963,5.9481,4.20,-0.14,0.012,-0.034,20000,"Ori"],
[119.2146,-22.8800,4.20,0.72,-0.026,0.009,6450,"See HR 2954"],
[248.5258,42.4369,4.20,-0.01,-0.011,0.046,12000,"Sig Her"],
[52.2671,59.9403,4.21,0.41,-0.003,-0.004,12000,"HR 1035"],
[85.1900,-1.9428,4.21,0.00,0.004,-0.002,30000,"Zet Ori"],
[156.9708,36.7072,4.21,0.90,-0.118,-0.101,5100,"Bet LMi"],
[343.9871,-32.5397,4.21,0.97,0.018,0.031,5200,"Del PsA"],
[348.9729,-9.0878,4.21,1.11,0.372,-0.016,5000,"Psi1Aqr"],
[66.3421,22.2939,4.22,0.13,0.096,-0.048,8250,"Kap1Tau"],
[275.1896,71.3378,4.22,-0.10,-0.004,0.040,10000,"Phi Dra"],
[281.7938,-4.7478,4.22,1.10,-0.004,-0.016,5600,"Bet Sct"],
[283.0542,-62.1875,4.22,-0.14,-0.006,-0.014,26000,"Lam Pav"],
[307.3954,62.9942,4.22,0.20,0.044,-0.013,8250,"The Cep"],
[311.4154,30.7197,4.22,1.05,-0.010,0.028,5100,"Cyg"],
[321.6108,-65.3661,4.22,0.49,0.079,0.799,6600,"Gam Pav"],
[348.5808,-6.0489,4.22,1.56,0.042,-0.196,3350,"Phi Aqr"],
[5.0179,-64.8747,4.23,0.58,1.705,1.164,6150,"Zet Tuc"],
[42.6463,38.3186,4.23,0.34,0.197,-0.105,7200,"Per"],
[54.1225,48.1928,4.23,-0.06,0.024,-0.026,20000,"Psi Per"],
[56.7121,-23.2497,4.23,0.42,-0.158,-0.529,7050,"Tau6Eri"],
[206.4217,-33.0439,4.23,0.38,-0.462,-0.146,7050,"Cen"],
[241.6479,-36.8022,4.23,-0.17,-0.017,-0.029,26000,"The Lup"],
[247.8454,-34.7044,4.23,-0.16,-0.009,-0.017,26000,"HR 6143"],
[251.4921,82.0372,4.23,0.89,0.017,0.006,5500,"Eps UMi"],
[297.6412,32.9142,4.23,1.82,-0.027,-0.040,2600,"Chi Cyg"],
[319.3542,39.3947,4.23,0.12,0.001,-0.003,12000,"Sig Cyg"],
[326.6983,49.3094,4.23,-0.12,0.004,-0.002,24000,"Pi 2Cyg"],
[118.3258,-48.1031,4.24,-0.14,0.004,0.001,30000,"Early catalogues (Lacaille 1763) called this star R but it is not the var. now named R Pup. Re-named J Pup"],
[250.7692,-77.5175,4.24,1.06,-0.287,-0.350,5000,"Bet Aps"],
[304.4121,-12.5083,4.24,1.07,0.023,0.001,5700,"Prima Giedi"],
[17.1863,86.2569,4.25,1.21,0.076,-0.012,4700,"2 UMi in Cep"],
[17.3758,47.2419,4.25,-0.07,0.010,-0.009,16000,"Phi And"],
[36.7463,-47.7039,4.25,-0.14,0.023,-0.010,20000,"Kap Eri"],
[41.0308,-13.8586,4.25,-0.14,-0.008,-0.015,16000,"Pi Cet"],
[64.0067,-51.4867,4.25,0.30,0.106,0.182,6900,"Gam Dor"],
[69.1725,41.2647,4.25,1.22,-0.005,-0.016,4400,"Per"],
[68.9137,10.1608,4.25,0.18,0.055,-0.046,8750,"Tau"],
[125.7088,43.1881,4.25,1.55,-0.021,-0.096,4400,"Alsciaukat"],
[134.6217,11.8578,4.25,0.14,0.034,-0.031,8750,"Acubens"],
[156.7879,-31.0678,4.25,1.45,-0.075,0.011,4400,"Alp Ant"],
[216.8812,75.6961,4.25,1.44,0.009,0.023,4400,"UMi"],
[26.3483,9.1578,4.26,0.96,0.073,0.048,5200,"Torcularis Septentrionalis"],
[89.9838,45.9369,4.26,1.72,0.000,-0.005,3050,"Pi Aur"],
[184.5863,-79.3122,4.26,-0.12,-0.048,0.017,20000,"Bet Cha"],
[188.4354,41.3575,4.26,0.59,-0.705,0.292,6000,"Chara is the name assigned either to this star or, more generally, to the \"southern hound\" of the constellation Canes Venatici"],
[197.9683,27.8781,4.26,0.57,-0.801,0.882,6150,"Bet Com"],
[210.4117,1.5444,4.26,0.10,0.018,-0.021,9250,"Tau Vir"],
[242.1925,44.9350,4.26,-0.07,-0.025,0.038,12000,"Phi Her"],
[265.3537,-12.8753,4.26,0.08,-0.069,-0.052,9500,"Omi Ser"],
[41.2354,10.1142,4.27,0.31,0.284,-0.036,7500,"Mu Cet"],
[49.9821,-43.0697,4.27,0.71,3.043,0.725,5200,"HR 1008"],
[53.4471,-21.6328,4.27,-0.11,0.048,-0.027,14000,"Tau5Eri"],
[69.5396,12.5108,4.27,0.12,0.103,-0.013,8500,"Tau"],
[77.2867,-8.7542,4.27,-0.19,0.002,-0.004,26000,"Lam Eri"],
[122.3721,-47.3458,4.27,-0.23,-0.004,-0.005,28000,"Gam1Vel"],
[193.3592,-40.1789,4.27,0.21,0.063,-0.022,8250,"HR 4889"],
[196.7275,-49.9061,4.27,-0.19,-0.026,-0.012,28000,"Xi 2Cen"],
[229.6333,-47.8750,4.27,-0.08,-0.026,-0.038,14000,"Mu Lup"],
[311.6646,16.1242,4.27,1.04,-0.032,-0.197,4850,"Gam2Del"],
[331.6092,-13.8697,4.27,-0.07,0.042,-0.056,12000,"Iot Aqr"],
[15.7358,7.8900,4.28,0.96,-0.078,0.023,5000,"Eps Psc"],
[37.0396,8.4600,4.28,-0.06,0.040,-0.009,12000,"Xi 2Cet"],
[54.2183,0.4017,4.28,0.58,-0.233,-0.483,6150,"Tau"],
[66.5771,22.8136,4.28,0.26,0.107,-0.046,8000,"Some sources call this Upsilon1 and HR 1399 Upsilon2 Tau"],
[70.5613,22.9569,4.28,-0.13,-0.002,-0.016,24000,"Tau Tau"],
[115.8279,28.8836,4.28,1.12,0.065,-0.232,4850,"Sig Gem"],
[159.8267,-55.6033,4.28,1.04,-0.019,0.005,5800,"HR 4180"],
[178.2275,-33.9081,4.28,-0.10,-0.050,0.005,12000,"Bet Hya"],
[247.7846,-16.6128,4.28,0.92,-0.051,-0.035,5200,"Phi Oph"],
[320.5617,-16.8344,4.28,0.90,0.033,0.004,5300,"Iot Cap"],
[346.7200,-43.5206,4.28,0.42,-0.039,-0.023,6750,"The Gru"],
[351.9921,6.3789,4.28,1.07,-0.121,-0.045,4850,"The Psc"],
[61.6458,50.3514,4.29,0.02,-0.015,-0.036,10000,"Lam Per"],
[63.8838,8.8922,4.29,-0.06,0.021,-0.024,24000,"Mu Tau"],
[66.3725,17.9281,4.29,0.05,0.108,-0.028,9500,"Del3Tau"],
[73.5125,66.3428,4.29,0.03,0.000,0.006,33000,"Alp Cam"],
[79.8937,-13.1767,4.29,-0.26,-0.001,-0.003,30000,"Lam Lep"],
[144.2717,81.3264,4.29,1.48,-0.019,-0.014,4550,"HR 3751"],
[261.8388,-29.8669,4.29,0.40,0.020,-0.139,6750,"Oph"],
[264.1367,-38.6353,4.29,1.09,-0.012,-0.201,5000,"HR 6546"],
[290.8050,-44.7997,4.29,0.34,0.097,-0.054,7200,"Arkab Posterior"],
[326.3621,61.1208,4.29,0.52,-0.003,-0.003,9500,"Nu Cep"],
[330.9475,64.6278,4.29,0.34,0.209,0.085,9250,"Alkurhah"],
[332.4967,33.1783,4.29,0.46,-0.014,-0.021,6750,"Pi 2Peg"],
[337.8762,-32.3461,4.29,0.01,0.065,-0.018,10000,"Bet PsA"],
[354.5342,43.2681,4.29,-0.10,0.029,-0.001,14000,"Iot And"],
[56.3021,24.4672,4.30,-0.11,0.018,-0.045,18000,"Taygeta"],
[130.8063,3.3986,4.30,-0.20,-0.019,-0.001,24000,"Eta Hya"],
[174.2371,-0.8239,4.30,1.00,0.004,0.043,5200,"Ups Leo"],
[283.6258,36.8989,4.30,1.68,-0.009,0.010,2900,"Del2Lyr"],
[303.3496,56.5678,4.30,0.11,0.063,0.083,9250,"Cyg"],
[14.6517,-29.3575,4.31,-0.16,0.022,0.004,16000,"Alp Scl"],
[142.9300,22.9681,4.31,1.54,-0.021,-0.033,4250,"Alterf"],
[188.0175,-16.1961,4.31,0.38,-0.426,-0.061,7200,"Eta Crv"],
[231.1225,37.3772,4.31,0.31,-0.146,0.087,7200,"Alkalurops"],
[70.1104,-19.6717,4.32,1.61,0.021,-0.096,2900,"Eri"],
[112.0408,8.9256,4.32,1.43,-0.062,0.017,4550,"Gam CMi"],
[131.5938,-13.5478,4.32,0.90,0.016,-0.011,5200,"Hya"],
[177.4213,-63.7883,4.32,-0.15,-0.021,0.006,24000,"HR 4537"],
[216.7287,-83.6678,4.32,1.31,-0.105,-0.007,4700,"Del Oct"],
[222.9100,-43.5756,4.32,-0.15,-0.020,-0.027,20000,"Omi Lup"],
[236.0146,77.7944,4.32,0.04,0.020,-0.001,9250,"Zet UMi"],
[241.8513,-20.8686,4.32,0.84,0.041,-0.038,5700,"Ome2Sco"],
[309.5846,-1.1053,4.32,0.95,0.015,-0.022,5300,"Aql"],
[17.7758,55.1497,4.33,0.17,0.229,-0.022,8250,"Marfak. Name shared with HR 321"],
[30.5117,2.7636,4.33,0.03,0.033,-0.005,10000,"Alrisha"],
[97.9637,-23.4183,4.33,-0.24,-0.006,0.012,30000,"Xi 1CMa"],
[130.1542,-59.7611,4.33,-0.11,-0.001,0.000,28000,"HR 3457"],
[180.7562,-63.3128,4.33,0.27,-0.150,0.008,8750,"The1Cru"],
[193.2788,-48.9433,4.33,1.37,-0.076,-0.030,4550,"HR 4888"],
[215.0813,-56.3867,4.33,0.12,-0.014,-0.009,18000,"HR 5358"],
[234.5133,-42.5675,4.33,1.42,-0.153,0.057,4400,"Ome Lup"],
[260.2071,-12.8469,4.33,0.03,0.042,0.004,9500,"Nu Ser"],
[274.9654,36.0644,4.33,1.17,-0.015,0.043,4700,"Kap Lyr"],
[122.1483,-2.9839,4.34,0.97,-0.017,-0.005,5800,"Zet Mon"],
[139.0508,-57.5414,4.34,1.63,-0.014,-0.007,3350,"HR 3696"],
[210.4308,-45.6036,4.34,0.60,0.002,-0.019,6600,"Ups2Cen"],
[229.4579,-30.1489,4.34,1.10,-0.008,-0.010,5100,"Lup"],
[261.6288,4.1403,4.34,1.50,0.004,0.007,4700,"Sig Oph"],
[326.2367,-33.0258,4.34,-0.05,0.034,-0.094,10000,"Iot PsA"],
[326.1279,17.3500,4.34,1.17,0.012,-0.013,5500,"Peg"],
[44.5679,-40.3044,4.35,0.08,-0.064,0.018,9750,"The2Eri"],
[47.9075,19.7267,4.35,1.03,0.152,-0.011,4700,"Botein"],
[86.1933,-65.7356,4.35,0.21,-0.031,0.008,8250,"Del Dor"],
[93.8446,29.4981,4.35,1.02,-0.073,-0.262,5200,"Kap Aur"],
[104.3188,58.4225,4.35,0.85,-0.005,-0.135,5500,"Lyn"],
[121.9825,-68.6172,4.35,-0.11,-0.026,0.025,18000,"Eps Vol"],
[125.1604,-77.4844,4.35,1.16,-0.134,0.042,4700,"The Cha"],
[144.2067,-49.3553,4.35,0.17,-0.125,0.025,8750,"HR 3836"],
[216.5450,-45.3794,4.35,0.43,0.016,-0.008,6900,"Tau2Lup"],
[272.1450,-63.6683,4.35,0.22,0.013,-0.188,8250,"Pi Pav"],
[9.2204,33.7194,4.36,-0.14,0.015,-0.004,20000,"Pi And"],
[10.8383,-57.4631,4.36,0.00,-0.006,0.011,10000,"Eta Phe"],
[52.6438,47.9953,4.36,1.35,0.004,0.020,4550,"Sig Per"],
[61.1737,22.0819,4.36,1.07,0.090,-0.059,5000,"Tau"],
[72.6529,8.9003,4.36,0.01,0.004,-0.032,9750,"See HR 1543"],
[78.3079,-12.9414,4.36,-0.10,-0.014,-0.009,12000,"Kap Lep"],
[89.3842,-35.2833,4.36,-0.18,0.000,0.009,26000,"Gam Col"],
[132.1083,5.8378,4.36,-0.04,-0.017,-0.034,10000,"Rho Hya"],
[186.7346,28.2683,4.36,1.13,-0.083,-0.080,4850,"Gam Com"],
[211.5117,-41.1797,4.36,-0.19,-0.017,-0.020,26000,"Chi Cen"],
[272.1896,20.8144,4.36,-0.16,-0.001,-0.005,26000,"Her"],
[263.0538,86.5864,4.36,0.02,0.009,0.056,9750,"Yildun"],
[275.8067,-61.4939,4.36,1.48,0.001,0.003,4400,"Xi Pav"],
[281.1933,37.6050,4.36,0.19,0.028,0.024,9000,"Zet1Lyr"],
[281.7554,18.1814,4.36,0.13,0.073,0.116,8750,"Her"],
[289.0921,38.1336,4.36,1.26,-0.001,0.004,5000,"The Lyr"],
[294.1804,-1.2864,4.36,-0.08,0.004,-0.018,20000,"Iot Aql"],
[337.3825,47.7069,4.36,1.68,0.002,0.000,3500,"Lac"],
[7.8863,-62.9581,4.37,-0.07,0.090,-0.054,12000,"Bet1Tuc"],
[9.6387,29.3117,4.37,0.87,-0.227,-0.254,5400,"Eps And"],
[33.2500,8.8467,4.37,0.89,-0.022,-0.009,5400,"Xi 1Cet"],
[94.1379,-35.1406,4.37,1.00,0.000,0.086,5000,"Kap Col"],
[104.0342,-17.0542,4.37,-0.07,-0.003,0.002,24000,"Iot CMa"],
[151.9762,9.9975,4.37,1.45,-0.080,-0.061,4550,"Leo"],
[295.0242,18.0139,4.37,0.78,0.014,-0.021,5900,"Sham"],
[295.2621,17.4761,4.37,1.05,0.010,-0.032,5200,"Bet Sge"],
[299.9342,-35.2764,4.37,-0.15,0.006,-0.026,24000,"The1Sgr"],
[353.2429,-37.8183,4.37,-0.09,0.087,0.021,12000,"Bet Scl"],
[83.0533,18.5944,4.38,2.07,0.002,-0.001,3200,"Tau"],
[197.4875,-5.5389,4.38,-0.01,-0.032,-0.033,9750,"The Vir"],
[253.5021,10.1653,4.38,-0.08,-0.051,-0.036,14000,"Iot Oph"],
[73.2237,-5.4528,4.39,0.25,-0.023,0.021,6900,"Ome Eri"],
[98.7442,-52.9756,4.39,-0.02,-0.003,0.007,10000,"HR 2435"],
[120.5662,2.3344,4.39,1.25,-0.031,0.105,4700,"HR 3145"],
[165.0387,-42.2258,4.39,0.11,0.028,0.003,9250,"HR 4293"],
[260.2508,-21.1128,4.39,0.39,0.232,-0.206,7350,"Xi Oph"],
[288.4396,39.1461,4.39,-0.15,0.004,0.002,26000,"Aladfar"],
[302.2221,77.7114,4.39,-0.05,0.011,0.024,12000,"Kap Cep"],
[319.9667,-53.4497,4.39,0.19,0.105,-0.072,8750,"The Ind"],
[349.4758,-9.1825,4.39,-0.15,0.021,-0.012,20000,"Psi2Aqr"],
[351.5117,-20.6419,4.39,1.47,-0.052,-0.058,4250,"Aqr"],
[102.4637,-53.6222,4.40,0.92,0.000,0.030,5400,"HR 2554"],
[109.6767,-24.9542,4.40,-0.15,-0.009,0.010,33000,"Tau CMa"],
[122.2567,-19.2450,4.40,-0.15,-0.014,-0.002,20000,"Pup"],
[225.7250,2.0914,4.40,1.04,-0.054,0.016,5000,"Vir"],
[329.4796,-54.9925,4.40,0.28,0.048,-0.007,7500,"Del Ind"],
[351.3450,23.4042,4.40,0.61,0.193,0.037,6300,"Ups Peg"],
[28.4117,-46.3025,4.41,1.59,-0.086,-0.087,2900,"Psi Phe"],
[83.7050,9.4894,4.41,-0.16,0.002,-0.004,30000,"Phi1Ori"],
[88.5954,20.2761,4.41,0.59,-0.189,-0.084,6000,"Chi1Ori"],
[107.7850,30.2453,4.41,1.26,-0.030,-0.045,4700,"Tau Gem"],
[119.5600,-49.2450,4.41,-0.17,-0.011,0.008,28000,"HR 3129"],
[169.5458,31.5292,4.41,0.59,-0.430,-0.586,6000,"Alula Australis"],
[222.5721,-27.9603,4.41,1.40,-0.241,-0.059,4400,"Hya"],
[262.6846,26.1106,4.41,1.44,0.020,0.018,4550,"Maasym"],
[269.6258,30.1894,4.41,0.39,0.000,0.007,7200,"Nu Her"],
[346.9746,75.3875,4.41,0.80,0.012,-0.030,5800,"Pi Cep"],
[349.7058,-32.5319,4.41,1.13,0.019,-0.070,4850,"Gam Scl"],
[0.4900,-6.0142,4.41,1.63,0.051,-0.041,3050,"Psc"],
[14.3017,23.4175,4.42,0.94,-0.044,-0.048,5200,"Eta And"],
[56.5354,-12.1017,4.42,1.63,0.048,0.058,3200,"Pi Eri"],
[91.8929,14.7683,4.42,-0.17,0.006,-0.021,24000,"Nu Ori"],
[165.5825,20.1797,4.42,0.05,-0.006,0.042,9750,"Leo"],
[215.7592,-39.5122,4.42,-0.18,-0.027,-0.032,16000,"HR 5378"],
[218.1537,-50.4569,4.42,-0.19,-0.043,-0.010,26000,"Sig Lup"],
[246.7558,-18.4564,4.42,0.28,-0.002,-0.022,26000,"Chi Oph"],
[311.9342,-5.0278,4.42,1.65,0.003,-0.040,3050,"Aqr"],
[337.2087,-0.0200,4.42,0.38,0.209,0.042,7050,"Zet2Aqr"],
[12.1708,7.5850,4.43,1.50,0.085,-0.052,4400,"Del Psc"],
[63.8179,-7.6528,4.43,0.82,-2.242,-3.414,4850,"Keid"],
[99.4725,-18.2375,4.43,1.15,-0.010,-0.007,4850,"Nu 3CMa"],
[220.2871,13.7283,4.43,0.05,0.053,-0.016,9500,"Zet Boo"],
[236.6108,7.3531,4.43,0.60,-0.223,-0.067,6000,"Lam Ser"],
[305.9654,32.1900,4.43,1.33,0.049,-0.005,4700,"Cyg"],
[310.8646,15.0744,4.43,0.32,-0.019,-0.043,8250,"Del Del"],
[319.4796,34.8969,4.43,-0.11,0.014,-0.002,26000,"Ups Cyg"],
[335.8900,52.2292,4.43,1.02,-0.013,-0.186,5200,"Bet Lac"],
[3.6600,-18.9328,4.44,1.66,-0.024,-0.067,3050,"Cet"],
[25.3579,5.4875,4.44,1.36,-0.021,0.002,4550,"Nu Psc"],
[64.1204,-59.3019,4.44,1.08,-0.051,-0.164,4700,"Eps Ret"],
[95.9421,4.5928,4.44,0.18,-0.018,0.011,8750,"Eps Mon"],
[123.5121,-40.3481,4.44,1.17,0.047,-0.068,4850,"HR 3243"],
[129.6892,3.3414,4.44,1.21,-0.018,-0.018,4850,"Al Minliar al Shuja"],
[284.2375,-67.2336,4.44,0.71,-0.010,0.012,6750,"Kap Pav"],
[292.1762,24.6650,4.44,1.50,-0.125,-0.106,3500,"Anser (rarely used)"],
[70.1404,-41.8639,4.45,0.34,-0.141,-0.077,7200,"Alp Cae"],
[78.0746,-11.8692,4.45,-0.10,0.027,-0.015,14000,"Iot Lep"],
[113.5133,-22.2961,4.45,0.51,-0.040,0.046,6600,"HR 2906"],
[122.8396,-39.6186,4.45,1.62,0.000,-0.004,4550,"HR 3225"],
[124.6388,-36.6594,4.45,0.22,-0.106,0.097,8250,"HR 3270"],
[135.0225,-41.2539,4.45,0.65,-0.039,0.045,5200,"HR 3591"],
[158.8971,-57.5578,4.45,1.62,-0.023,0.000,4550,"HR 4159"],
[161.4450,-80.5403,4.45,-0.19,-0.049,0.008,26000,"Del2Cha"],
[248.0342,-21.4664,4.45,0.13,0.028,0.039,8250,"Ome Oph"],
[270.4383,1.3053,4.45,0.02,0.015,-0.012,9500,"Oph"],
[288.8875,73.3556,4.45,1.25,-0.140,0.107,4700,"Tau Dra"],
[293.5225,7.3789,4.45,1.17,0.216,-0.157,4550,"Mu Aql"],
[42.2725,-32.4058,4.46,0.99,0.090,0.155,5000,"Bet For"],
[78.3229,2.8611,4.46,1.19,0.001,-0.006,5000,"Rho Ori"],
[141.1637,26.1822,4.46,1.23,-0.033,-0.048,4700,"Al Minliar al Asad"],
[177.7862,-45.1736,4.46,1.30,-0.070,-0.010,4550,"HR 4546"],
[218.6700,29.7450,4.46,0.36,0.189,0.132,7200,"Sig Boo"],
[331.5288,-39.5433,4.46,1.37,-0.023,-0.124,4550,"Lam Gru"],
[340.1288,44.2764,4.46,1.33,0.094,0.012,4700,"Lac"],
[343.1317,-32.8756,4.46,-0.04,-0.030,-0.025,10000,"Gam PsA"],
[41.2758,-18.5725,4.47,0.48,0.330,0.038,6600,"Tau1Eri"],
[50.0850,29.0483,4.47,1.55,-0.008,-0.016,4700,"HR 999"],
[57.3800,65.5261,4.47,1.88,-0.007,-0.013,3200,"HR 1155"],
[74.3217,53.7522,4.47,-0.02,-0.024,0.007,9750,"Cam"],
[74.6371,1.7142,4.47,1.40,-0.002,-0.003,4700,"Pi 6Ori"],
[101.9650,2.4122,4.47,1.11,-0.018,-0.012,5000,"Mon"],
[169.1654,-3.6517,4.47,0.21,-0.108,-0.036,8250,"Phi Leo"],
[182.0217,-50.6614,4.47,-0.15,-0.035,-0.010,18000,"HR 4618"],
[246.7962,-47.5550,4.47,-0.07,-0.005,-0.030,22000,"Eps Nor"],
[346.6704,-23.7431,4.47,0.90,0.066,-0.003,5100,"Aqr"],
[92.9850,14.2089,4.48,-0.18,0.003,-0.020,24000,"Xi Ori"],
[94.9058,59.0108,4.48,0.01,-0.008,0.026,9500,"Lyn"],
[97.0421,-32.5800,4.48,-0.17,-0.018,0.024,22000,"Lam CMa"],
[137.2179,51.6047,4.48,0.27,-0.137,-0.030,7500,"UMa"],
[136.2867,-72.6028,4.48,0.61,-0.013,-0.005,6150,"HR 3643"],
[151.8575,35.2447,4.48,0.18,0.053,0.004,8250,"LMi"],
[167.9146,-22.8258,4.48,0.03,0.003,-0.100,9500,"Bet Crt"],
[294.1104,50.2211,4.48,0.38,-0.017,0.257,6900,"The Cyg"],
[336.8333,-64.9664,4.48,-0.03,0.071,0.003,12000,"Del Tuc"],
[66.5867,15.6183,4.49,0.25,0.112,-0.023,7500,"Tau"],
[100.9971,13.2278,4.49,1.16,-0.003,-0.058,5000,"Gem"],
[108.1400,-46.7594,4.49,0.32,-0.132,0.103,7500,"HR 2740"],
[118.1613,-38.8631,4.49,-0.19,-0.002,-0.006,26000,"Called b Pup in Argelander and most modern catalogues. Was originally called a Pup by Lacaille (1763)"],
[131.6771,-56.7697,4.49,-0.17,-0.010,0.008,24000,"HR 3498"],
[151.9846,-0.3717,4.49,-0.04,-0.016,-0.013,10000,"Alp Sex"],
[224.2958,-4.3464,4.49,0.32,-0.094,-0.150,7500,"Lib"],
[318.6204,10.0069,4.49,0.50,0.049,-0.305,6750,"Del Equ"],
[333.4696,39.7150,4.49,1.39,0.038,0.013,4550,"HR 8485"],
[355.6804,-14.5450,4.49,-0.04,0.101,-0.066,12000,"Ome2Aqr"],
[98.2258,7.3331,4.50,0.00,-0.001,-0.006,10000,"Mon"],
[114.7054,-26.8017,4.50,-0.17,-0.017,0.019,18000,"Markab"],
[117.0217,-25.9372,4.50,-0.05,-0.009,0.006,30000,"Omi Pup"],
[143.7062,52.0514,4.50,0.01,-0.065,-0.035,9500,"UMa"],
[155.2283,-56.0431,4.50,-0.12,-0.016,0.003,24000,"HR 4074"],
[163.9033,24.7497,4.50,0.01,-0.072,-0.012,9750,"Leo"],
[206.8154,17.4567,4.50,0.48,-0.482,0.041,6600,"Tau Boo"],
[246.0258,-20.0375,4.50,1.01,-0.027,-0.047,5000,"Psi Oph"],
[316.7821,-25.0058,4.50,1.61,-0.023,-0.043,3500,"Cap"],
[332.0958,-32.9886,4.50,0.05,0.080,-0.031,9500,"Mu PsA"],
[355.5117,1.7800,4.50,0.20,-0.129,-0.155,8250,"Lam Psc"],
[359.9792,-65.5772,4.50,-0.08,0.048,-0.024,12000,"Eps Tuc"],
[17.9150,30.0897,4.51,1.09,0.072,-0.035,5000,"Tau Psc"],
[41.9771,29.2472,4.51,1.11,0.149,-0.123,4850,"Ari"],
[60.2242,-62.1594,4.51,1.65,0.002,0.026,2900,"Gam Ret"],
[68.3775,-29.7667,4.51,0.98,-0.102,-0.275,5000,"Ups1Eri"],
[87.4571,-56.1667,4.51,1.10,0.083,-0.076,4850,"Gam Pic"],
[142.3113,-35.9514,4.51,1.44,-0.022,0.001,4550,"Eps Ant"],
[230.8446,-59.3208,4.51,0.19,-0.016,-0.038,20000,"Gam Cir"],
[300.7046,67.8736,4.51,1.32,0.016,0.046,4550,"Rho Dra"],
[311.0096,-51.9211,4.51,0.27,0.158,-0.058,8250,"Eta Ind"],
[311.3379,57.5797,4.51,0.54,-0.064,-0.236,6300,"Labelled Upsilon Cep in Burritts Atlas, not confirmed elsewhere. It is not the double star described by Allen as Castula, Upsilon1,2 Cep"],
[317.3987,-11.3717,4.51,0.94,0.095,-0.015,5200,"Nu Aqr"],
[322.1808,-21.8072,4.51,0.91,0.138,-0.006,5500,"DM is CoD"],
[337.6221,43.1233,4.51,-0.09,-0.001,-0.005,26000,"Lac"],
[4.5821,36.7853,4.52,0.05,-0.063,-0.041,9500,"Sig And"],
[37.2667,67.4025,4.52,0.12,-0.017,0.011,8750,"Iot Cas"],
[87.2938,39.1811,4.52,0.94,-0.025,-0.022,5200,"Tau Aur"],
[144.8375,-61.3281,4.52,-0.07,-0.041,0.021,12000,"HR 3856"],
[214.7775,-13.3711,4.52,0.13,-0.015,0.030,9500,"Lam Vir"],
[235.3879,19.6703,4.52,0.04,-0.057,-0.046,9750,"Iot Ser"],
[260.9208,37.1458,4.52,-0.03,-0.037,0.006,12000,"Rho Her"],
[299.2367,-27.1700,4.52,1.46,0.008,-0.013,4700,"Terebellum, name shared with HR 7597, 7618, 7650"],
[303.9421,27.8142,4.52,1.26,-0.036,0.008,4550,"Vul"],
[346.7512,9.4094,4.52,1.57,0.011,-0.014,3350,"Peg"],
[348.1375,49.4064,4.52,0.29,0.092,0.098,7500,"And"],
[12.4533,41.0789,4.53,-0.15,0.023,-0.019,20000,"Nu And"],
[42.8783,35.0597,4.53,1.56,0.009,-0.061,4250,"Per"],
[90.0142,-3.0742,4.53,1.22,0.012,-0.076,4850,"HR 2113"],
[114.3421,-34.9686,4.53,-0.09,-0.022,0.014,14000,"HR 2937"],
[176.9963,20.2189,4.53,0.55,-0.149,-0.003,5500,"Leo"],
[200.6579,-60.9883,4.53,-0.13,-0.039,-0.014,24000,"HR 5035"],
[201.0021,-64.5358,4.53,0.85,0.029,-0.026,5400,"HR 5041"],
[272.8075,-45.9544,4.53,1.01,-0.017,-0.037,5000,"Eps Tel"],
[311.8521,36.4908,4.53,-0.11,0.009,-0.005,20000,"Lam Cyg"],
[345.9692,3.8200,4.53,-0.12,0.013,-0.011,18000,"Fum al Samakah"],
[7.8900,-62.9658,4.54,0.15,0.101,-0.056,9500,"Bet2Tuc"],
[11.1812,48.2844,4.54,-0.07,0.019,-0.008,20000,"Omi Cas"],
[30.4892,70.9069,4.54,0.16,-0.067,0.004,9250,"Also called A Cas"],
[52.4787,58.8786,4.54,0.56,0.006,-0.002,10000,"HR 1040"],
[79.5446,33.3717,4.54,1.27,0.045,-0.160,4700,"Aur"],
[98.7642,-22.9647,4.54,-0.05,0.011,0.016,10000,"Xi 2CMa"],
[112.4492,12.0067,4.54,1.28,0.000,-0.019,4850,"CMi"],
[213.3708,51.7903,4.54,0.20,0.063,-0.002,8000,"Asellus Tertius"],
[226.1112,26.9475,4.54,1.24,-0.174,-0.006,4700,"Psi Boo"],
[228.0554,-19.7917,4.54,-0.08,-0.036,-0.039,10000,"Iot1Lib"],
[230.7892,-36.8586,4.54,-0.15,-0.018,-0.023,22000,"Phi2Lup"],
[233.9717,-44.9586,4.54,-0.18,-0.025,-0.030,24000,"HR 5781"],
[261.6579,-5.0867,4.54,0.39,-0.092,-0.043,7050,"HR 6493"],
[266.8900,-27.8308,4.54,0.80,-0.001,-0.009,6450,"Sgr"],
[358.5958,57.4994,4.54,1.22,-0.002,-0.002,5800,"Rho Cas"],
[76.1017,-35.4833,4.55,1.20,0.129,-0.051,4550,"Gam1Cae"],
[105.0167,76.9775,4.55,1.36,0.071,-0.013,4400,"HR 2527"],
[143.5558,36.3975,4.55,0.92,0.006,-0.022,5200,"LMi"],
[222.8471,19.1011,4.55,0.76,0.137,-0.098,5200,"Xi Boo"],
[245.1592,-24.1694,4.55,0.84,-0.003,-0.023,8750,"Omi Sco"],
[316.6504,47.6483,4.55,1.57,0.008,0.001,4400,"Cyg"],
[352.2888,12.7606,4.55,0.94,0.064,0.027,5300,"Peg"],
[0.9350,-17.3361,4.55,-0.05,0.026,-0.009,12000,"Cet"],
[59.6863,-61.4003,4.56,1.62,0.011,-0.018,3200,"Del Ret"],
[136.6325,38.4522,4.56,1.04,-0.028,-0.014,5300,"HR 3612"],
[143.6204,69.8303,4.56,0.77,-0.063,0.077,5600,"UMa"],
[207.9567,-32.9944,4.56,-0.13,-0.033,-0.038,20000,"Cen"],
[216.5342,-45.2214,4.56,-0.15,-0.012,-0.013,26000,"Tau1Lup"],
[325.4804,71.3114,4.56,1.10,0.117,0.099,4850,"Cep"],
[84.7963,4.1214,4.57,-0.11,0.001,-0.003,24000,"Ome Ori"],
[142.9954,-1.1850,4.57,0.10,-0.012,-0.011,9250,"Tau2Hya"],
[154.9033,-55.0294,4.57,1.62,-0.014,0.003,4550,"HR 4063"],
[160.8837,-60.5667,4.57,1.71,-0.032,0.006,4400,"HR 4200"],
[246.3542,14.0333,4.57,0.00,0.044,-0.059,12000,"Kajam"],
[272.0208,-28.4572,4.57,0.94,0.027,-0.030,5300,"HR 6766"],
[322.4871,23.6389,4.57,1.62,0.024,0.004,3350,"Peg"],
[335.2567,46.5367,4.57,-0.10,0.023,0.005,18000,"Lac"],
[336.1292,49.4764,4.57,0.09,-0.007,-0.003,12000,"Lac"],
[357.2317,-28.1303,4.57,0.01,0.105,-0.106,10000,"Del Scl"],
[54.2737,-40.2747,4.58,1.04,-0.005,-0.030,4850,"HR 1106"],
[88.3317,27.6122,4.58,-0.02,0.003,-0.012,10000,"Tau"],
[137.0121,-25.8583,4.58,1.59,0.041,0.008,4400,"Kap Pyx"],
[147.9200,-46.5478,4.58,1.20,-0.008,-0.001,5500,"HR 3912"],
[265.4846,72.1489,4.58,0.42,0.025,-0.267,6750,"Dsiban"],
[298.3654,24.0797,4.58,-0.06,0.027,0.038,12000,"Vul"],
[300.6646,-27.7097,4.58,1.65,0.036,0.017,2900,"See HR 7597"],
[10.3317,-46.0850,4.59,0.97,-0.014,-0.002,5200,"Mu Phe"],
[55.7088,-37.3136,4.59,1.20,-0.088,-0.077,4700,"HR 1143"],
[81.7092,3.0956,4.59,-0.21,0.002,-0.004,26000,"Psi2Ori"],
[83.8467,-4.8383,4.59,-0.19,0.004,0.000,28000,"Ori"],
[115.8850,-28.4111,4.59,1.63,-0.014,0.025,4550,"Pup"],
[148.0267,54.0644,4.59,0.03,-0.004,0.021,9250,"Phi UMa"],
[238.4029,-25.3272,4.59,-0.07,-0.016,-0.025,26000,"Sco"],
[243.0758,-27.9264,4.59,-0.16,-0.013,-0.025,26000,"Sco"],
[263.9150,-46.5056,4.59,-0.03,-0.028,-0.035,10000,"Sig Ara"],
[283.6871,22.6450,4.59,0.78,0.000,0.001,5600,"Her"],
[287.0871,-40.4967,4.59,1.09,0.037,-0.026,4850,"Del CrA"],
[290.1671,65.7147,4.59,0.02,0.012,0.045,9500,"Pi Dra"],
[313.0321,27.0969,4.59,0.83,-0.067,-0.065,5300,"Vul"],
[337.2071,-0.0203,4.59,0.00,0.181,0.009,6600,"Zet1Aqr"],
[97.2042,-7.0328,4.60,-0.10,-0.017,0.000,24000,"Bet Mon"],
[130.0533,64.3278,4.60,1.17,-0.060,0.023,4850,"Muscida, with HR 3391"],
[142.2871,-2.7689,4.60,0.46,0.130,-0.015,6600,"Tau1Hya"]
];
const STAR_N=STARS.length;
// V of the hundredth star. Brighter stars, and every star this bright, keep the
// sizes from when the dome showed only that hundred.
const STAR_VANCHOR=STARS[Math.min(99, STARS.length-1)][2];
const STAR_VFAINT=STARS.reduce((m,s)=>s[2]>m?s[2]:m,-99);
const STAR_PX_ANCHOR=1.8, STAR_PX_FAINT=1;
const STAR_FLUX_FAINT=Math.pow(10, -0.4*(STAR_VFAINT-STAR_VANCHOR));
const STAR_FAINT_EXP=STAR_FLUX_FAINT<1 ? Math.log(STAR_PX_FAINT/STAR_PX_ANCHOR)/Math.log(STAR_FLUX_FAINT) : 0.22;
// Cube cells keep the VR shader from testing every star at every pixel.
// Eight cells on a side, six faces. A star is copied into every cell whose center
// lies within a glow-radius of it, and the shader reads only the cell under the pixel.
const STAR_CUBE=8, STAR_CELLS=6*STAR_CUBE*STAR_CUBE, STAR_BIN_MAX=96, STAR_IDX_W=1024;
const STAR_CELL_HD=10.05;
const STAR_CELL_CENTERS=(()=>{
  const n=STAR_CUBE, out=new Float32Array(STAR_CELLS*3);
  let c=0;
  for(let face=0; face<6; face++){
    for(let iv=0; iv<n; iv++){
      for(let iu=0; iu<n; iu++){
        const u=-1+(iu+0.5)*2/n, v=-1+(iv+0.5)*2/n;
        let x,y,z;
        if(face===0){ x=1; y=u; z=v; }
        else if(face===1){ x=-1; y=-u; z=v; }
        else if(face===2){ x=u; y=1; z=v; }
        else if(face===3){ x=-u; y=-1; z=v; }
        else if(face===4){ x=u; y=v; z=1; }
        else { x=-u; y=v; z=-1; }
        const m=Math.hypot(x,y,z)||1;
        out[c++]=x/m; out[c++]=y/m; out[c++]=z/m;
      }
    }
  }
  return out;
})();
// Tanner Helland's blackbody curve, divided by its luminance so equal V means equal brightness.
function starTint(kelvin){
  const t=Math.max(1000,Math.min(40000,kelvin))/100;
  let r,g,b;
  if(t<=66){
    r=255; g=99.4708025861*Math.log(t)-161.1195681661;
    b=t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307;
  }else{
    r=329.698727446*Math.pow(t-60,-0.1332047592);
    g=288.1221695283*Math.pow(t-60,-0.0755148492); b=255;
  }
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  const y=0.2126*r+0.7152*g+0.0722*b||1;
  return [r/y,g/y,b/y];
}
// Present-day mean place. epochKey is the geological scene; every scene uses this
// catalog for now. Proper motion is applied in the J2000 frame, then equatorial
// precession (Lieske, as given by Meeus) carries the place to `year`. Those series
// only hold for centuries, so a historical sky replaces this function and keeps the call.
function starMeanPlace(star, epochKey, year){
  void epochKey;
  const dt=year-2000, cosDec=Math.cos(star[1]*Math.PI/180);
  const ra0=star[0]+(star[4]/3600)*dt/(Math.abs(cosDec)<1e-4?(cosDec<0?-1e-4:1e-4):cosDec);
  const dec0=star[1]+(star[5]/3600)*dt;
  const T=dt/100, T2=T*T, T3=T2*T, arc=Math.PI/180/3600;
  const zeta=(2306.2181*T+0.30188*T2+0.017998*T3)*arc;
  const zed=(2306.2181*T+1.09468*T2+0.018203*T3)*arc;
  const theta=(2004.3109*T-0.42665*T2-0.041833*T3)*arc;
  const a=ra0*Math.PI/180+zeta, sd=Math.sin(dec0*Math.PI/180), cd=Math.cos(dec0*Math.PI/180);
  const A=cd*Math.sin(a), B=Math.cos(theta)*cd*Math.cos(a)-Math.sin(theta)*sd, C=Math.sin(theta)*cd*Math.cos(a)+Math.cos(theta)*sd;
  let ra=(Math.atan2(A,B)+zed)*180/Math.PI; ra=((ra%360)+360)%360;
  return {ra, dec:Math.asin(Math.max(-1,Math.min(1,C)))*180/Math.PI};
}
// Daylight exposure hides the stars. Flux is relative to the old faint limit.
// At that magnitude and brighter, size and brightness stay as they were.
// Fainter stars follow a power of the same flux, fit so the faintest star is one pixel.
function starDisplay(star){
  const flux=Math.pow(10, -0.4*(star[2]-STAR_VANCHOR));
  const amp=Math.min(1, 0.62*Math.pow(Math.max(flux, 0), 0.5));
  const px=flux>=1
    ? STAR_PX_ANCHOR*Math.pow(Math.min(flux, 42), 0.22)
    : STAR_PX_ANCHOR*Math.pow(Math.max(flux, 1e-6), STAR_FAINT_EXP);
  const tint=starTint(star[6]||10000);
  return {px, rgb:tint.map(c=>Math.min(2.4, c)*amp)};
}
function starBinsFor(up){
  const pxMax=STAR_PX_ANCHOR*Math.pow(42, 0.22);
  const sig=pxMax*(VR_FOV_DEG*Math.PI/180)/Math.max(window.innerHeight, 1);
  const cutoff=Math.acos(Math.max(-1, Math.min(1, 1-8*sig*sig)))*180/Math.PI;
  const infl=Math.min(12, cutoff+0.8);
  const cosKeep=Math.cos((STAR_CELL_HD+infl)*Math.PI/180);
  const lists=Array.from({length:STAR_CELLS}, ()=>[]);
  const cap=STAR_IDX_W*32;
  let used=0;
  for(const s of up){
    for(let c=0;c<STAR_CELLS;c++){
      const o=c*3, p0=STAR_CELL_CENTERS[o], p1=STAR_CELL_CENTERS[o+1], p2=STAR_CELL_CENTERS[o+2];
      if(s.x*p0+s.y*p1+s.z*p2<cosKeep) continue;
      const bin=lists[c];
      if(bin.length>=STAR_BIN_MAX || used>=cap) continue;
      bin.push(s.i); used++;
    }
  }
  const idx=new Float32Array(STAR_IDX_W*32*4);
  const info=new Float32Array(64*6*4);
  let cursor=0;
  for(let c=0;c<STAR_CELLS;c++){
    const bin=lists[c], x=c%64, y=(c/64)|0, q=(y*64+x)*4;
    info[q]=cursor; info[q+1]=bin.length;
    for(let k=0;k<bin.length;k++){
      const t=cursor+k, tx=t%STAR_IDX_W, ty=(t/STAR_IDX_W)|0;
      idx[(ty*STAR_IDX_W+tx)*4]=bin[k];
    }
    cursor+=bin.length;
  }
  return {info, idx, count:cursor};
}
function placeStars(lat){
  const epochKey=EP[dIdx].key, ins=instantUT();
  const year=+(document.getElementById('moonDate').value||localISODate(new Date())).slice(0,4);
  const eq=moonEquatorial(dayNumber(ins.y,ins.m,ins.D,ins.ut));
  const LST=rev(rev(eq.Ls+180+ins.ut*15)+ins.lon);
  const tex=new Float32Array(STAR_N*8), marks=[], up=[];
  for(let i=0;i<STARS.length && i<STAR_N;i++){
    const star=STARS[i], place=starMeanPlace(star, epochKey, year);
    let H=rev(LST-rev(place.ra)); if(H>180) H-=360;
    const p=altaz(lat, place.dec, H), show=starDisplay(star), o=i*4;
    if(!(p.alt>0)) continue;
    const dir=horizDir(p.az, p.alt);
    tex[o]=dir[0]; tex[o+1]=dir[1]; tex[o+2]=dir[2]; tex[o+3]=show.px;
    tex[STAR_N*4+o]=show.rgb[0]; tex[STAR_N*4+o+1]=show.rgb[1]; tex[STAR_N*4+o+2]=show.rgb[2]; tex[STAR_N*4+o+3]=1;
    marks.push({az:p.az, el:p.alt, px:show.px, rgb:show.rgb});
    up.push({i, x:dir[0], y:dir[1], z:dir[2]});
  }
  const bins=starBinsFor(up);
  return {tex, marks, bins:bins.info, idx:bins.idx, idxCount:bins.count};
}
function skyByte(colgrid, el, az){
  const NR=colgrid.length-1, NA=colgrid[0].length-1, vz=Math.max(0,Math.min(90,90-el));
  let ang=az%360; if(ang<0) ang+=360;
  const fr=vz/90*NR, ir=Math.min(NR-1,Math.floor(fr)), tr=fr-ir;
  const fa=ang/360*NA, ia=Math.min(NA-1,Math.floor(fa)), ta=fa-ia;
  const chan=q=>{ const a=colgrid[ir][ia][q]*(1-ta)+colgrid[ir][ia+1][q]*ta, b=colgrid[ir+1][ia][q]*(1-ta)+colgrid[ir+1][ia+1][q]*ta; return a*(1-tr)+b*tr; };
  return 0.2126*chan(0)+0.7152*chan(1)+0.0722*chan(2);
}
function drawStarsOnDome(marks, colgrid){
  const W=dome.width, H=dome.height, cx=W/2, cy=H/2, R=W*0.46;
  dctx.save();
  dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
  dctx.globalCompositeOperation='lighter';
  for(const s of marks){
    const night=1-smooth01(0.05, 0.22, skyByte(colgrid, s.el, s.az)/255);
    if(night<0.03) continue;
    const rr=R*(90-s.el)/90, a=s.az*Math.PI/180, x=cx+rr*Math.sin(a), y=cy-rr*Math.cos(a);
    const col=s.rgb.map(c=>Math.round(Math.min(255, c*night*255)));
    const g=dctx.createRadialGradient(x,y,0,x,y,s.px);
    g.addColorStop(0, 'rgb('+col[0]+','+col[1]+','+col[2]+')');
    g.addColorStop(0.35, 'rgba('+col[0]+','+col[1]+','+col[2]+',0.45)');
    g.addColorStop(1, 'rgba('+col[0]+','+col[1]+','+col[2]+',0)');
    dctx.fillStyle=g; dctx.beginPath(); dctx.arc(x,y,s.px,0,Math.PI*2); dctx.fill();
  }
  dctx.restore();
}
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const vscale=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const vadd=(a,b,c)=>[a[0]+b[0]+c[0],a[1]+b[1]+c[1],a[2]+b[2]+c[2]];
const vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function vnorm(a){ const m=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/m,a[1]/m,a[2]/m]; }
function horizDir(az,el){ const a=az*Math.PI/180, e=el*Math.PI/180, c=Math.cos(e); return [Math.sin(a)*c, Math.cos(a)*c, Math.sin(e)]; }
function smooth01(e0,e1,x){ const t=Math.max(0,Math.min(1,(x-e0)/(e1-e0))); return t*t*(3-2*t); }
function moonLit(moon, sunAz, sunEl){ return (1-vdot(horizDir(moon.az,moon.el), horizDir(sunAz,sunEl)))/2; }
function moonSkyScale(moon, sunAz, sunEl){
  const d=vdot(horizDir(moon.az, moon.el), horizDir(sunAz, sunEl));
  const a=Math.acos(Math.max(-1, Math.min(1, -d)))*180/Math.PI;
  const phase=Math.pow(10, -0.4*(0.026*a + 4e-9*a*a*a*a));
  const opp=a<7 ? 1+MOON_OPP*(1-a/7) : 1;
  const re=MOON_RE[EP[dIdx].key]||MOON_RE_NOW;
  return MOON_SUN_FULL*phase*opp*(MOON_RE_NOW/re)*(MOON_RE_NOW/re);
}
// Fraction of a solar disk of radius rSun covered by a lunar disk of radius rMoon.
// Separation and radii are in the same units. A true overlap is a subset of an
// enlarged one, since both radii are scaled by the same factor.
function sunCovered(sep, rSun, rMoon){
  if(!(rSun>0)) return 0;
  const d=sep, R=rMoon;
  if(d>=rSun+R) return 0;
  if(d<=Math.abs(R-rSun)) return R>=rSun?1:(R*R)/(rSun*rSun);
  const r2=rSun*rSun, R2=R*R, d2=d*d;
  const ang=Math.acos(Math.min(1, Math.max(-1, (d2+r2-R2)/(2*d*rSun))));
  const bng=Math.acos(Math.min(1, Math.max(-1, (d2+R2-r2)/(2*d*R))));
  const area=r2*ang+R2*bng-0.5*Math.sqrt(Math.max(0,(-d+rSun+R)*(d+rSun-R)*(d-rSun+R)*(d+rSun+R)));
  return Math.min(1, Math.max(0, area/(Math.PI*r2)));
}
function moonSunSep(lat, ms){
  const t=new Date(ms);
  const min=t.getHours()*60+t.getMinutes()+t.getSeconds()/60+t.getMilliseconds()/60000;
  const ut=t.getUTCHours()+t.getUTCMinutes()/60+t.getUTCSeconds()/3600+t.getUTCMilliseconds()/3600000;
  const lon=-t.getTimezoneOffset()/60*15;
  const eq=moonEquatorial(dayNumber(t.getUTCFullYear(), t.getUTCMonth()+1, t.getUTCDate(), ut));
  const GMST=rev(eq.Ls+180+ut*15), LST=rev(GMST+lon);
  let H=rev(LST-rev(eq.RA)); if(H>180) H-=360;
  const p=altaz(lat, eq.Dec, H), sun=sunGeom(lat, min);
  return Math.acos(Math.max(-1,Math.min(1,vdot(horizDir(p.az,p.alt), horizDir(sun.az, 90-sun.sza)))))*180/Math.PI;
}
// Equinox Sun is above the horizon strictly between 06:00 and 18:00 local time.
function sunUpDuring(a, b){
  if(!(b>a)) return false;
  const rise=6*3600000, day=86400000;
  let t=a;
  for(let n=0;n<3;n++){
    const d=new Date(t), sod=((d.getHours()*60+d.getMinutes())*60+d.getSeconds())*1000+d.getMilliseconds();
    const up0=t-sod+rise, up1=up0+12*3600000;
    if(up0<b && up1>a) return true;
    t=up0+day;
    if(t>=b) break;
  }
  return false;
}
function findNextEclipse(afterMs){
  const lat=LATDEG[dLat], limit=DISK_SCALE*(SUN_RADIUS_DEG+moonRadiusDeg(EP[dIdx].key));
  const hit=ms=>moonSunSep(lat, ms)<limit;
  const step=10*60*1000, horizon=afterMs+8*365.25*86400000;
  let prev=hit(afterMs), t=afterMs+step;
  while(t<=horizon){
    const now=hit(t);
    if(now && !prev){
      let lo=t-step, hi=t;
      for(let i=0;i<18;i++){ const mid=(lo+hi)/2; if(hit(mid)) hi=mid; else lo=mid; }
      const start=hi;
      let end=t, guard=start+20*3600000;
      while(end<guard && hit(end)) end+=step;
      lo=Math.max(start, end-step); hi=Math.min(end, guard);
      for(let i=0;i<18;i++){ const mid=(lo+hi)/2; if(hit(mid)) lo=mid; else hi=mid; }
      if(sunUpDuring(start, hi)) return start;
      t=hi+step; prev=false; continue;
    }
    prev=now; t+=step;
  }
  return null;
}
const moonImg=new Image(), moonSprite=document.createElement('canvas');
moonSprite.width=moonSprite.height=96;
let moonReady=false;
function moonBasis(moon){
  const md=horizDir(moon.az, moon.el), lat=LATDEG[dLat]*Math.PI/180, ncp=[0, Math.cos(lat), Math.sin(lat)];
  let north=vadd(ncp, vscale(md, -vdot(ncp,md)), [0,0,0]);
  if(vdot(north,north)<1e-8) north=[1,0,0];
  north=vnorm(north);
  return {md, north, east:vnorm(vcross(north, md))};
}
function paintMoonSprite(moon, sunAz, sunEl){
  const sctx=moonSprite.getContext('2d',{willReadFrequently:true});
  sctx.clearRect(0,0,96,96); sctx.drawImage(moonImg,0,0,96,96);
  const img=sctx.getImageData(0,0,96,96), px=img.data, b=moonBasis(moon), sd=horizDir(sunAz,sunEl);
  for(let j=0;j<96;j++) for(let i=0;i<96;i++){
    const u=(i+0.5)/96*2-1, v=1-(j+0.5)/96*2, o=(j*96+i)*4;
    if(u*u+v*v>1){ px[o+3]=0; continue; }
    const nrm=vnorm(vadd(vscale(b.east,u), vscale(b.north,v), vscale(b.md, -Math.sqrt(1-u*u-v*v))));
    const lit=smooth01(-0.02,0.05, vdot(nrm,sd));
    px[o+3]=Math.round(lit*255);
  }
  sctx.putImageData(img,0,0);
}
function drawMoonOnDome(moon, sunAz, sunEl, sunDisk){
  if(!moonReady||moon.el<-moon.radDeg) return;
  const W=dome.width, H=dome.height, cx=W/2, cy=H/2, R=W*0.46;
  const rr=R*(90-moon.el)/90, a=moon.az*Math.PI/180, mx=cx+rr*Math.sin(a), my=cy-rr*Math.cos(a);
  const rad=moon.radDeg*(DOME_DISK/SUN_RADIUS_DEG);
  const b=moonBasis(moon), step=vnorm(vadd(b.md, vscale(b.north,0.02), [0,0,0]));
  const el2=Math.asin(Math.max(-1,Math.min(1,step[2])))*180/Math.PI;
  let az2=Math.atan2(step[0], step[1])*180/Math.PI; if(az2<0) az2+=360;
  const rr2=R*(90-el2)/90, p1x=cx+rr2*Math.sin(az2*Math.PI/180), p1y=cy-rr2*Math.cos(az2*Math.PI/180);
  paintMoonSprite(moon, sunAz, sunEl);
  // Same veil as the VR sky: extinct the Moon (blue first) and add it onto the
  // air already drawn, so a bright sky hides the photograph.
  const spr=moonSprite.getContext('2d',{willReadFrequently:true}).getImageData(0,0,96,96).data;
  const ang=Math.atan2(p1x-mx, -(p1y-my)), ca=Math.cos(ang), sa=Math.sin(ang);
  const x0=Math.max(0,Math.floor(mx-rad-1)), y0=Math.max(0,Math.floor(my-rad-1));
  const x1=Math.min(W-1,Math.ceil(mx+rad+1)), y1=Math.min(H-1,Math.ceil(my+rad+1));
  if(x1<x0||y1<y0) return;
  const bw=x1-x0+1, bh=y1-y0+1, img=dctx.getImageData(x0,y0,bw,bh), px=img.data;
  const samp=(u,v)=>{
    const x=(u*0.5+0.5)*96-0.5, y=((1-v)*0.5)*96-0.5, i0=Math.floor(x), j0=Math.floor(y), tx=x-i0, ty=y-j0;
    const at=(i,j)=>{ if(i<0||j<0||i>95||j>95) return [0,0,0,0]; const o=(j*96+i)*4; return [spr[o],spr[o+1],spr[o+2],spr[o+3]]; };
    const A=at(i0,j0), B=at(i0+1,j0), C=at(i0,j0+1), D=at(i0+1,j0+1), m=(p,q,t)=>p*(1-t)+q*t;
    return [0,1,2,3].map(k=>m(m(A[k],B[k],tx),m(C[k],D[k],tx),ty));
  };
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy>R*R) continue;
    const qx=x-mx, qy=y-my, lx=qx*ca+qy*sa, ly=-qx*sa+qy*ca, u=lx/rad, v=-ly/rad;
    if(u*u+v*v>1) continue;
    const s=samp(u,v), lit=s[3]/255, wlit=0.06+0.94*lit;
    const el=90*(1-Math.hypot(dx,dy)/R), mu=Math.max(Math.sin(Math.max(el,0)*Math.PI/180), 0.04);
    const Tr=Math.exp(-0.12/mu), Tg=Math.exp(-0.22/mu), Tb=Math.exp(-0.48/mu);
    const o=((y-y0)*bw+(x-x0))*4;
    if(sunDisk){ const bx=x-sunDisk.x, by=y-sunDisk.y; if(bx*bx+by*by<=sunDisk.r*sunDisk.r){ px[o]=0; px[o+1]=0; px[o+2]=0; continue; } }
    const skyY=(0.2126*px[o]+0.7152*px[o+1]+0.0722*px[o+2])/255;
    const t=Math.max(0,Math.min(1,skyY/1.15)), veil=1-t*t*(3-2*t);
    px[o]=Math.min(255, px[o]+s[0]/255*wlit*Tr*veil*255);
    px[o+1]=Math.min(255, px[o+1]+s[1]/255*wlit*Tg*veil*255);
    px[o+2]=Math.min(255, px[o+2]+s[2]/255*wlit*Tb*veil*255);
  }
  dctx.putImageData(img,x0,y0);
}
function uploadMoon(){
  if(!vrGL||!moonReady) return;
  const gl=vrGL.gl; gl.bindTexture(gl.TEXTURE_2D, vrGL.moonTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, moonImg);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  if(vrOn) paintVR();
}
moonImg.onload=()=>{ moonReady=true; uploadMoon(); renderDay(); };
const LAND={ // stand-in surface color, not from the radiative-transfer model
  hadean44:[.18,.12,.08], hadean40:[.16,.12,.08], archean38:[.15,.13,.10],
  archean27thin:[.20,.16,.11], archean27:[.22,.16,.10], archean27vthick:[.24,.15,.09],
  proterozoic22:[.16,.18,.11], snowball07:[.78,.82,.86], carbon30:[.12,.22,.08],
  kpg66:[.17,.15,.13], volcanic:[.18,.16,.14], modern:[.15,.22,.09], modernpoll:[.17,.18,.11]
};
let skyNow=null, skyGen=0, skyUploaded=-1, vrNote='', vrOn=false, vrYaw=0, vrPitch=8, vrX=0, vrY=0, vrScenery=true, vrClouds=true, cloudScroll=0, cloudMinPrev=null, vrRelock=false, vrGL=null, vrRAF=0, vrWalk=0, vrWalkStamp=0, vrNav=false, vrLinkKey='';
const vrHeld=new Set();
const VRFS=`#version 300 es
precision highp float;
uniform sampler2D sky; uniform sampler2D moonMap; uniform sampler2D starMap; uniform sampler2D starBin; uniform sampler2D starIdx; uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunRad,sunOn,nr,na,sunMu,showScn;
uniform float moonAz,moonEl,moonRad,moonOn,latRad,starPx;
uniform vec3 sunCol,ground,eye;
uniform vec4 obj[12];
uniform float kind[12];
out vec4 fragColor;
float coneT(vec3 ro,vec3 rd,vec2 c,float R,float h){
  float k=R/max(h,0.001);
  vec3 f=vec3(ro.x-c.x, ro.y-c.y, h-ro.z);
  float A=rd.x*rd.x+rd.y*rd.y-k*k*rd.z*rd.z;
  if(abs(A)<1e-5) return -1.0;
  float B=2.0*(f.x*rd.x+f.y*rd.y+k*k*f.z*rd.z);
  float C=f.x*f.x+f.y*f.y-k*k*f.z*f.z;
  float disk=B*B-4.0*A*C; if(disk<0.0) return -1.0;
  float s=sqrt(disk), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A), t=-1.0;
  if(t0>0.05){ float z=ro.z+rd.z*t0; if(z>=0.0&&z<=h) t=t0; }
  if(t1>0.05){ float z=ro.z+rd.z*t1; if(z>=0.0&&z<=h&&(t<0.0||t1<t)) t=t1; }
  return t;
}
vec3 coneN(vec3 p,vec2 c,float R,float h){ float k=R/max(h,0.001); vec2 d=p.xy-c; return normalize(vec3(d, k*max(length(d),0.001))); }
float boxT(vec3 ro,vec3 rd,vec2 c,float r,float h){
  vec3 mn=vec3(c.x-r,c.y-r,0.0), mx=vec3(c.x+r,c.y+r,h);
  float tn=0.0, tf=1e8;
  if(abs(rd.x)<1e-5){ if(ro.x<mn.x||ro.x>mx.x) return -1.0; }
  else { float a=(mn.x-ro.x)/rd.x, b=(mx.x-ro.x)/rd.x; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.y)<1e-5){ if(ro.y<mn.y||ro.y>mx.y) return -1.0; }
  else { float a=(mn.y-ro.y)/rd.y, b=(mx.y-ro.y)/rd.y; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.z)<1e-5){ if(ro.z<mn.z||ro.z>mx.z) return -1.0; }
  else { float a=(mn.z-ro.z)/rd.z, b=(mx.z-ro.z)/rd.z; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  float t=tn>0.05?tn:(tf>0.05?tf:-1.0); return t;
}
vec3 boxN(vec3 p,vec2 c,float r,float h){
  vec3 q=(p-vec3(c,h*0.5))/vec3(r,r,max(h*0.5,0.001)); vec3 a=abs(q);
  if(a.x>=a.y&&a.x>=a.z) return vec3(sign(q.x),0.0,0.0);
  if(a.y>=a.z) return vec3(0.0,sign(q.y),0.0);
  return vec3(0.0,0.0,sign(q.z));
}
float ellT(vec3 ro,vec3 rd,vec2 c,float R,float H){
  vec3 f=vec3((ro.x-c.x)/R,(ro.y-c.y)/R,ro.z/H), d=vec3(rd.x/R,rd.y/R,rd.z/H);
  float A=dot(d,d), B=2.0*dot(f,d), C=dot(f,f)-1.0, disk=B*B-4.0*A*C;
  if(disk<0.0||A<1e-8) return -1.0;
  float s=sqrt(disk), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A), t=-1.0;
  if(t0>0.05&&ro.z+rd.z*t0>=0.0) t=t0;
  if(t1>0.05&&ro.z+rd.z*t1>=0.0&&(t<0.0||t1<t)) t=t1;
  return t;
}
vec3 ellN(vec3 p,vec2 c,float R,float H){ return normalize(vec3((p.x-c.x)/(R*R),(p.y-c.y)/(R*R),p.z/(H*H))); }
float apparentEl(float h){ // Saemundsson 1986, true altitude (deg) to apparent
  if(h>80.0) return h;
  float u=h+10.3/(h+5.11);
  if(u<0.25) return h;
  return h+(1.02/tan(u*0.01745329252))/60.0;
}
float trueAlt(float app){ // Bennett 1982, apparent altitude (deg) to true
  if(app>80.0) return app;
  return app-(1.0/tan((app+7.31/(app+4.4))*0.01745329252))/60.0;
}
int starCubeCell(vec3 d){
  float ax=abs(d.x), ay=abs(d.y), az=abs(d.z);
  int face; float u, v, s;
  if(ax>=ay && ax>=az){
    s=ax;
    if(d.x>=0.0){ face=0; u=d.y/s; }
    else { face=1; u=-d.y/s; }
    v=d.z/s;
  }else if(ay>=ax && ay>=az){
    s=ay;
    if(d.y>=0.0){ face=2; u=d.x/s; }
    else { face=3; u=-d.x/s; }
    v=d.z/s;
  }else{
    s=az;
    if(d.z>=0.0){ face=4; u=d.x/s; }
    else { face=5; u=-d.x/s; }
    v=d.y/s;
  }
  int iu=clamp(int(floor((u+1.0)*4.0)), 0, 7);
  int iv=clamp(int(floor((v+1.0)*4.0)), 0, 7);
  return (face*8+iv)*8+iu;
}
void main(){
  float aspect=res.x/max(res.y,1.0); float fy=tan(fov*0.5); float fx=fy*aspect;
  float u=((gl_FragCoord.x/res.x)*2.0-1.0)*fx;
  float v=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy,-sy,0.0)+v*vec3(-sy*sp,-cy*sp,cp));
  vec3 ro=eye;
  float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
  float elevDeg=asin(clamp(rd.z,-1.0,1.0))*57.2957795;
  float compDeg=comp*57.2957795;
  float sunA=sunAz*0.01745329252, sunZen=(90.0-sunEl)*0.01745329252;
  vec3 sd=normalize(vec3(sin(sunA)*sin(sunZen), cos(sunA)*sin(sunZen), cos(sunZen)));
  float tGround=rd.z<0.0?-ro.z/rd.z:1e8;
  float tBest=1e8, kBest=0.0, hBest=1.0; vec3 nBest=vec3(0.0,0.0,1.0), pBest=ro;
  for(int i=0;i<12;i++){
    float kk=kind[i]; if(kk<0.5) continue;
    vec4 q=obj[i]; float t=-1.0; vec3 n=vec3(0.0,0.0,1.0);
    if(kk>3.5&&kk<4.5){ t=boxT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=boxN(ro+rd*t,q.xy,q.z,q.w); }
    else if(kk>2.5&&kk<3.5){ t=ellT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=ellN(ro+rd*t,q.xy,q.z,q.w); }
    else { t=coneT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=coneN(ro+rd*t,q.xy,q.z,q.w); }
    if(t>0.0&&t<tBest&&t<tGround){ tBest=t; kBest=kk; hBest=q.w; nBest=n; pBest=ro+rd*t; if(dot(nBest,rd)>0.0) nBest=-nBest; }
  }
  vec3 col;
  if(showScn<0.5) kBest=0.0;
  if(kBest>0.5){
    vec3 albedo=vec3(0.46,0.38,0.31);
    if(kBest>4.5) albedo=vec3(0.10,0.26,0.08);
    else if(kBest>3.5) albedo=vec3(0.74,0.71,0.66);
    else if(kBest>2.5) albedo=vec3(0.86,0.90,0.94);
    else if(kBest>1.5){ albedo=vec3(0.32,0.26,0.23); if(pBest.z>0.75*hBest) albedo=vec3(0.72,0.16,0.03); }
    float ndl=max(dot(nBest,sd),0.0);
    float lit=(0.42+0.95*ndl)*(0.4+0.6*sunMu);
    if(kBest>2.5&&kBest<3.5) lit=(0.78+0.35*ndl)*(0.85+0.15*sunMu);
    col=albedo*lit;
  }else{
    float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
    float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
    vec3 skyC=texture(sky, vec2(uTex,vTex)).rgb;
    float skyL=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
    float te=trueAlt(elevDeg), teR=te*0.01745329252, cth=cos(teR);
    vec3 src=vec3(sin(comp)*cth, cos(comp)*cth, sin(teR));
    bool inSun=sunOn>0.5&&te>-1.0&&dot(src,sd)>cos(sunRad);
    bool onBody=inSun;
    if(inSun) skyC=sunCol;
    if(moonOn>0.5&&te>-1.2){
      float mA=moonAz*0.01745329252, mZ=(90.0-moonEl)*0.01745329252;
      vec3 md=normalize(vec3(sin(mA)*sin(mZ), cos(mA)*sin(mZ), cos(mZ)));
      if(dot(src,md)>cos(moonRad)){
        onBody=true;
        if(inSun) skyC=vec3(0.0);
        else {
        vec3 ncp=vec3(0.0, cos(latRad), sin(latRad));
        vec3 north=ncp-md*dot(ncp,md);
        if(dot(north,north)<1e-6) north=vec3(1.0,0.0,0.0);
        north=normalize(north);
        vec3 east=normalize(cross(north, md));
        float s=sin(moonRad);
        float x=dot(src,east)/s, y=dot(src,north)/s, rr=sqrt(x*x+y*y);
        if(rr>1.0){ x/=rr; y/=rr; rr=1.0; }
        vec3 alb=texture(moonMap, vec2(x*0.5+0.5, y*0.5+0.5)).rgb;
        vec3 nrm=normalize(east*x+north*y-md*sqrt(max(1.0-rr*rr,0.0)));
        float lit=smoothstep(-0.02, 0.05, dot(nrm,sd));
        // The air in front of the Moon extincts it (blue first) and the sky
        // already drawn is that same air, so a bright sky veils the disk.
        float mu=max(sin(max(te,0.0)*0.01745329252), 0.04);
        vec3 T=exp(-vec3(0.12, 0.22, 0.48)/mu);
        vec3 moonC=alb*(0.06+0.94*lit)*T;
        float skyY=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
        skyC+=moonC*(1.0-smoothstep(0.0, 1.15, skyY));
        }
      }
    }
    if(!onBody && te>0.0){
      float night=1.0-smoothstep(0.05, 0.22, skyL);
      if(night>0.02){
        int cell=starCubeCell(src);
        vec4 info=texelFetch(starBin, ivec2(cell- (cell/64)*64, cell/64), 0);
        int start=int(info.r+0.5), count=int(info.g+0.5);
        for(int k=0;k<96;k++){
          if(k>=count) break;
          int id=start+k;
          int si=int(texelFetch(starIdx, ivec2(id- (id/1024)*1024, id/1024), 0).r+0.5);
          vec4 sp=texelFetch(starMap, ivec2(si, 0), 0);
          float sig=sp.w*starPx;
          if(sig<=0.0) continue;
          float c=dot(src, sp.xyz);
          if(c<1.0-8.0*sig*sig) continue;
          float wgt=exp(-0.5*max(0.0, 2.0*(1.0-c))/(sig*sig));
          skyC+=texelFetch(starMap, ivec2(si, 1), 0).rgb*wgt*night;
        }
      }
    }
    float hlen=length(rd.xy);
    float toward=hlen>1e-4?dot(rd.xy/hlen, vec2(sin(sunA),cos(sunA))):0.0;
    vec3 gcol=showScn>0.5?ground*mix(0.9,1.08,clamp(toward*0.5+0.5,0.0,1.0)):vec3(0.02,0.025,0.04);
    float w=max(fwidth(elevDeg),0.04);
    col=mix(gcol, skyC, smoothstep(-w,w,elevDeg));
  }
  fragColor=vec4(col,1.0);
}`;

const CLOUDFS=`#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler3D noise; uniform sampler2D sky; uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunMu,showScn,cloudCov,cloudScale,cloudDrift,nr,na;
uniform vec3 sunCol,amb,eye;
uniform vec4 obj[12];
uniform float kind[12];
out vec4 fragColor;
float coneT(vec3 ro,vec3 rd,vec2 c,float R,float h){
  float k=R/max(h,0.001);
  vec3 f=vec3(ro.x-c.x, ro.y-c.y, h-ro.z);
  float A=rd.x*rd.x+rd.y*rd.y-k*k*rd.z*rd.z;
  if(abs(A)<1e-5) return -1.0;
  float B=2.0*(f.x*rd.x+f.y*rd.y+k*k*f.z*rd.z);
  float C=f.x*f.x+f.y*f.y-k*k*f.z*f.z;
  float disk=B*B-4.0*A*C; if(disk<0.0) return -1.0;
  float s=sqrt(disk), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A), t=-1.0;
  if(t0>0.05){ float z=ro.z+rd.z*t0; if(z>=0.0&&z<=h) t=t0; }
  if(t1>0.05){ float z=ro.z+rd.z*t1; if(z>=0.0&&z<=h&&(t<0.0||t1<t)) t=t1; }
  return t;
}
float boxT(vec3 ro,vec3 rd,vec2 c,float r,float h){
  vec3 mn=vec3(c.x-r,c.y-r,0.0), mx=vec3(c.x+r,c.y+r,h);
  float tn=0.0, tf=1e8;
  if(abs(rd.x)<1e-5){ if(ro.x<mn.x||ro.x>mx.x) return -1.0; }
  else { float a=(mn.x-ro.x)/rd.x, b=(mx.x-ro.x)/rd.x; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.y)<1e-5){ if(ro.y<mn.y||ro.y>mx.y) return -1.0; }
  else { float a=(mn.y-ro.y)/rd.y, b=(mx.y-ro.y)/rd.y; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.z)<1e-5){ if(ro.z<mn.z||ro.z>mx.z) return -1.0; }
  else { float a=(mn.z-ro.z)/rd.z, b=(mx.z-ro.z)/rd.z; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  return tn>0.05?tn:(tf>0.05?tf:-1.0);
}
float ellT(vec3 ro,vec3 rd,vec2 c,float R,float H){
  vec3 f=vec3((ro.x-c.x)/R,(ro.y-c.y)/R,ro.z/H), d=vec3(rd.x/R,rd.y/R,rd.z/H);
  float A=dot(d,d), B=2.0*dot(f,d), C=dot(f,f)-1.0, disk=B*B-4.0*A*C;
  if(disk<0.0||A<1e-8) return -1.0;
  float s=sqrt(disk), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A), t=-1.0;
  if(t0>0.05&&ro.z+rd.z*t0>=0.0) t=t0;
  if(t1>0.05&&ro.z+rd.z*t1>=0.0&&(t<0.0||t1<t)) t=t1;
  return t;
}
float shellT(vec3 ro, vec3 rd, float H){
  // Sphere of radius 833 km under the viewer. A level view meets the 1.5 km base at about 50 km.
  float R=833333.0;
  vec2 dh=ro.xy-eye.xy;
  float c=dot(dh,dh)+(ro.z-H)*(ro.z+H+2.0*R);
  if(c>=0.0) return -1.0;
  float b=dot(vec3(dh, ro.z+R), rd);
  float disc=b*b-c;
  if(disc<=0.0) return -1.0;
  return -c/(b+sqrt(disc));
}
float cloudDen(vec3 p, float detail, float lod, float deck, float dt, float dph){
  vec2 dh=p.xy-eye.xy;
  float R=833333.0;
  float numer=dot(dh,dh)+p.z*(p.z+2.0*R);
  float alt=numer/(sqrt(dot(dh,dh)+(p.z+R)*(p.z+R))+R);
  float ph=clamp((alt-1500.0)/14700.0, 0.0, 1.0);
  float sc=cloudScale*mix(1.0, 0.85, lod);
  vec2 wind=vec2(cloudDrift, cloudDrift*0.42);
  vec2 plane=p.xy+wind;
  // Broad regions decide where clouds exist. The shape inside a region is a
  // separate blob, so the deck is not one slab.
  float edge=0.78-cloudCov*0.62;
  float gate=smoothstep(edge, edge+mix(0.06, 0.14, lod), texture(noise, vec3(plane*sc*0.42, 0.17)).g);
  if(gate<0.03) return 0.0;
  // Cell width stays near the step length. Smaller cells skipped by a shallow
  // ray showed up as stripes parallel to the horizon.
  float cell=1.0/(sc*4.0);
  float kMax=cell/max(dt*2.0, 1.0);
  float k=min(mix(1.7, 1.15, lod), kMax);
  float billow=texture(noise, vec3(plane*sc*k, 0.41)).r;
  float lift=texture(noise, vec3(plane*sc*k+vec2(4.2, 1.7), 0.73)).r;
  // Each cell has its own center and thickness. A shared ceiling was a long
  // bright rim; these rims no longer sit on one altitude.
  float center=mix(0.18, 0.82, lift);
  float halfH=mix(0.12, 0.46, billow*0.35+lift*0.65);
  // Short rim on a tall cloud, but never thinner than the march can resolve.
  // Averaged across the step so the dropoff stays a clean edge, not a terrace.
  float rim=max(halfH*0.18, 0.055);
  float bodySum=0.0;
  for(int s=0;s<3;s++){
    float u=(ph+(float(s)-1.0)*dph*0.5-center)/halfH;
    bodySum+=smoothstep(0.0, rim/halfH, clamp(1.0-abs(u), 0.0, 1.0));
  }
  float body=bodySum/3.0;
  if(body<0.02) return 0.0;
  float core=smoothstep(0.32, 0.50, billow);
  // One soft change from the base of this cloud to its top, shifted per cell
  // so the dense part does not line up across the sky.
  float shape=0.78;
  if(detail>0.4 && k*1.45<=kMax+0.05){
    float inn=texture(noise, vec3(plane*sc*min(k*1.45, kMax), 0.2+lift+ph*0.55)).r;
    shape=mix(0.38, 1.0, inn);
  }
  return gate*core*body*shape;
}
float lightBeer(vec3 p, vec3 sd, float lod, float deck, float dt){
  float ls=mix(1600.0, 5200.0, lod);
  float dph=ls*max(sd.z, 0.0)/14700.0;
  float tau=cloudDen(p+sd*ls, 0.0, lod, deck, dt, dph)*ls;
  tau+=cloudDen(p+sd*(ls*2.2), 0.0, lod, deck, dt, dph*2.2)*ls;
  return exp(-tau*(0.0026/3.0));
}
void main(){
  float aspect=res.x/max(res.y,1.0); float fy=tan(fov*0.5); float fx=fy*aspect;
  float u=((gl_FragCoord.x/res.x)*2.0-1.0)*fx;
  float v=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy,-sy,0.0)+v*vec3(-sy*sp,-cy*sp,cp));
  vec3 ro=eye;
  float sunA=sunAz*0.01745329252, sunZen=(90.0-sunEl)*0.01745329252;
  vec3 sd=normalize(vec3(sin(sunA)*sin(sunZen), cos(sunA)*sin(sunZen), cos(sunZen)));
  if(rd.z<0.001){ fragColor=vec4(0.0); return; }
  // 1.5 km to 16.2 km, three times the old thickness. Density eases off toward
  // the top, and the march below runs to the far side instead of stopping short.
  float tIn=shellT(ro, rd, 1500.0), tOut=shellT(ro, rd, 16200.0);
  if(tIn<0.0||tOut<tIn){ fragColor=vec4(0.0); return; }
  float tHit=1e8;
  if(showScn>0.5){
    for(int i=0;i<12;i++){
      float kk=kind[i]; if(kk<0.5) continue;
      vec4 q=obj[i]; float t=-1.0;
      if(kk>3.5&&kk<4.5) t=boxT(ro,rd,q.xy,q.z,q.w);
      else if(kk>2.5&&kk<3.5) t=ellT(ro,rd,q.xy,q.z,q.w);
      else t=coneT(ro,rd,q.xy,q.z,q.w);
      if(t>0.0&&t<tHit) tHit=t;
    }
  }
  if(tHit>tIn) tOut=min(tOut, tHit-2.0);
  if(tOut<=tIn){ fragColor=vec4(0.0); return; }
  float dt=max((tOut-tIn)/36.0, 160.0);
  float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float t=tIn+dt*ign, T=1.0, tAcc=0.0;
  float deck=smoothstep(0.30, 0.06, rd.z);
  vec3 col=vec3(0.0);
  for(int i=0;i<36;i++){
    if(T<0.04||t>tOut) break;
    vec3 p=ro+rd*t;
    float lod=max(smoothstep(7000.0, 26000.0, t), smoothstep(0.28, 0.05, rd.z)*smoothstep(3000.0, 12000.0, t));
    float detail=smoothstep(42000.0, 6000.0, t)*smoothstep(0.01, 0.09, rd.z);
    float den=cloudDen(p, detail, lod, deck, dt, dt*rd.z/14700.0);
    if(den>0.02){
      float beer=lightBeer(p, sd, lod, deck, dt);
      float silver=pow(clamp(dot(rd, sd), 0.0, 1.0), 5.0);
      vec3 sunLit=sunCol*beer*mix(0.55, 1.55, silver)*(0.20+0.80*max(sunMu,0.0));
      vec3 skyLit=amb*(0.28+0.35*beer);
      vec3 lin=sunLit+skyLit;
      float sunPeak=max(sunLit.r, max(sunLit.g, sunLit.b));
      float peak=max(lin.r, max(lin.g, lin.b));
      float sunShare=peak>1e-4?clamp(sunPeak/peak,0.0,1.0):0.0;
      if(peak>1.0) lin/=peak;
      // An 8-bit target clips each channel on its own, which turns this sum white.
      // Put some of the solar hue back on the sunlit part, at the same lightness.
      float yLin=dot(lin, vec3(0.2126,0.7152,0.0722));
      float ySun=max(dot(sunCol, vec3(0.2126,0.7152,0.0722)), 1e-4);
      vec3 sunHue=sunCol*(yLin/ySun);
      float huePeak=max(sunHue.r, max(sunHue.g, sunHue.b));
      if(huePeak>1.0) sunHue/=huePeak;
      lin=mix(lin, sunHue, sunShare*0.55);
      float a=1.0-exp(-den*dt*(0.0032/3.0));
      float w=a*T;
      col+=lin*w;
      tAcc+=t*w;
      T*=1.0-a;
    }
    t+=dt;
  }
  float alpha=1.0-T;
  if(alpha>0.02){
    float tMean=tAcc/alpha;
    float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
    float elevDeg=asin(clamp(rd.z,-1.0,1.0))*57.2957795;
    vec3 skyC=texture(sky, vec2((fract(comp*57.2957795/360.0)*na+0.5)/(na+1.0), ((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0))).rgb;
    float tau=tMean*0.000011*(0.10+0.90*smoothstep(0.42, 0.012, rd.z));
    float fog=min(0.78, 1.0-exp(-tau));
    col=mix(col, skyC*alpha, fog);
  }
  fragColor=vec4(col, alpha);
}`;
const COMPFS=`#version 300 es
precision highp float;
uniform sampler2D cloudTex; uniform vec2 res;
uniform float yaw,pitch,fov,showScn;
uniform vec3 eye;
uniform vec4 obj[12];
uniform float kind[12];
out vec4 fragColor;
float coneT(vec3 ro,vec3 rd,vec2 c,float R,float h){
  float k=R/max(h,0.001);
  vec3 f=vec3(ro.x-c.x, ro.y-c.y, h-ro.z);
  float A=rd.x*rd.x+rd.y*rd.y-k*k*rd.z*rd.z;
  if(abs(A)<1e-5) return -1.0;
  float B=2.0*(f.x*rd.x+f.y*rd.y+k*k*f.z*rd.z);
  float C=f.x*f.x+f.y*f.y-k*k*f.z*f.z;
  float disk=B*B-4.0*A*C; if(disk<0.0) return -1.0;
  float s=sqrt(disk), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A), t=-1.0;
  if(t0>0.05){ float z=ro.z+rd.z*t0; if(z>=0.0&&z<=h) t=t0; }
  if(t1>0.05){ float z=ro.z+rd.z*t1; if(z>=0.0&&z<=h&&(t<0.0||t1<t)) t=t1; }
  return t;
}
float boxT(vec3 ro,vec3 rd,vec2 c,float r,float h){
  vec3 mn=vec3(c.x-r,c.y-r,0.0), mx=vec3(c.x+r,c.y+r,h);
  float tn=0.0, tf=1e8;
  if(abs(rd.x)<1e-5){ if(ro.x<mn.x||ro.x>mx.x) return -1.0; }
  else { float a=(mn.x-ro.x)/rd.x, b=(mx.x-ro.x)/rd.x; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.y)<1e-5){ if(ro.y<mn.y||ro.y>mx.y) return -1.0; }
  else { float a=(mn.y-ro.y)/rd.y, b=(mx.y-ro.y)/rd.y; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.z)<1e-5){ if(ro.z<mn.z||ro.z>mx.z) return -1.0; }
  else { float a=(mn.z-ro.z)/rd.z, b=(mx.z-ro.z)/rd.z; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  return tn>0.05?tn:(tf>0.05?tf:-1.0);
}
float ellT(vec3 ro,vec3 rd,vec2 c,float R,float H){
  vec3 f=vec3((ro.x-c.x)/R,(ro.y-c.y)/R,ro.z/H), d=vec3(rd.x/R,rd.y/R,rd.z/H);
  float A=dot(d,d), B=2.0*dot(f,d), C=dot(f,f)-1.0, disk=B*B-4.0*A*C;
  if(disk<0.0||A<1e-8) return -1.0;
  float s=sqrt(disk), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A), t=-1.0;
  if(t0>0.05&&ro.z+rd.z*t0>=0.0) t=t0;
  if(t1>0.05&&ro.z+rd.z*t1>=0.0&&(t<0.0||t1<t)) t=t1;
  return t;
}
float shellT(vec3 ro, vec3 rd, float H){
  float R=833333.0;
  vec2 dh=ro.xy-eye.xy;
  float c=dot(dh,dh)+(ro.z-H)*(ro.z+H+2.0*R);
  if(c>=0.0) return -1.0;
  float b=dot(vec3(dh, ro.z+R), rd);
  float disc=b*b-c;
  if(disc<=0.0) return -1.0;
  return -c/(b+sqrt(disc));
}
void main(){
  vec4 c=texture(cloudTex, gl_FragCoord.xy/res);
  if(c.a<0.004||showScn<0.5){ fragColor=c; return; }
  float aspect=res.x/max(res.y,1.0); float fy=tan(fov*0.5); float fx=fy*aspect;
  float u=((gl_FragCoord.x/res.x)*2.0-1.0)*fx;
  float v=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy,-sy,0.0)+v*vec3(-sy*sp,-cy*sp,cp));
  vec3 ro=eye;
  float tIn=shellT(ro, rd, 1500.0);
  if(tIn<0.0){ fragColor=c; return; }
  float tHit=1e8;
  for(int i=0;i<12;i++){
    float kk=kind[i]; if(kk<0.5) continue;
    vec4 q=obj[i]; float t=-1.0;
    if(kk>3.5&&kk<4.5) t=boxT(ro,rd,q.xy,q.z,q.w);
    else if(kk>2.5&&kk<3.5) t=ellT(ro,rd,q.xy,q.z,q.w);
    else t=coneT(ro,rd,q.xy,q.z,q.w);
    if(t>0.0&&t<tHit) tHit=t;
  }
  if(tHit<tIn){ fragColor=vec4(0.0); return; }
  fragColor=c;
}
`;
function makeCloudNoise(){
  const N=64, data=new Uint8Array(N*N*N*4);
  const hsh=(i,j,k)=>{ let n=Math.imul(i|0,374761393)+Math.imul(j|0,668265263)+Math.imul(k|0,1274126177); n=(n^(n>>>13))>>>0; n=Math.imul(n,1274126177); return ((n^(n>>>16))>>>0)/4294967295; };
  const worley=(x,y,z,cells)=>{
    const cell=N/cells, cx=Math.floor(x/cell), cy=Math.floor(y/cell), cz=Math.floor(z/cell);
    let md=1e9; const wrap=i=>((i%cells)+cells)%cells;
    for(let dz=-1;dz<=1;dz++) for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
      const ix=cx+dx, iy=cy+dy, iz=cz+dz, wx=wrap(ix), wy=wrap(iy), wz=wrap(iz);
      const px=(ix+hsh(wx,wy,wz))*cell, py=(iy+hsh(wy+17,wz,wx))*cell, pz=(iz+hsh(wz+41,wx,wy))*cell;
      let ddx=x-px, ddy=y-py, ddz=z-pz; const H=N*0.5;
      if(ddx>H) ddx-=N; else if(ddx<-H) ddx+=N;
      if(ddy>H) ddy-=N; else if(ddy<-H) ddy+=N;
      if(ddz>H) ddz-=N; else if(ddz<-H) ddz+=N;
      const d=ddx*ddx+ddy*ddy+ddz*ddz; if(d<md) md=d;
    }
    return 1-Math.min(1, Math.sqrt(md)/(cell*1.05));
  };
  for(let z=0;z<N;z++) for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const o=((z*N+y)*N+x)*4;
    data[o]=Math.round(worley(x,y,z,4)*255);
    data[o+1]=Math.round(worley(x,y,z,2)*255);
    data[o+3]=255;
  }
  return data;
}
// How common water clouds were. A steam Hadean and the wet Carboniferous carry a
// thick field; organic haze, snowball ice, and the impact winter leave only a few.
const CLOUD_COV={
  hadean44:0.88, hadean40:0.74, archean38:0.48, archean27thin:0.42, archean27:0.30,
  archean27vthick:0.16, proterozoic22:0.58, snowball07:0.22, carbon30:0.82, kpg66:0.08,
  volcanic:0.52, modern:0.50, modernpoll:0.56
};
function cloudField(key){
  const cov=CLOUD_COV[key]??0.5;
  return {cov, scale:1/(36000-cov*16800)};
}
function vrCaption(){
  if(vrScenery&&vrClouds) return 'The plain, the shapes, and the clouds are scenery. The sky is the model.';
  if(vrScenery) return 'Clouds are hidden. The plain and the shapes are scenery. The sky is the model.';
  if(vrClouds) return 'The shapes are hidden. The clouds are scenery. The sky is the model.';
  return 'Scenery and clouds are hidden. The sky is the model.';
}
function ensureCloudTarget(w, h){
  const gl=vrGL.gl;
  if(vrGL.cw===w&&vrGL.ch===h) return;
  vrGL.cw=w; vrGL.ch=h;
  gl.bindTexture(gl.TEXTURE_2D, vrGL.cloudTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.cloudFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.cloudTex, 0);
}
function glShader(gl, type, src){ const s=gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; } return s; }
function initVR(){
  if(vrGL) return vrGL.gl;
  const canvas=document.getElementById('vrc');
  const gl=canvas.getContext('webgl2',{alpha:false,depth:false,stencil:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl) return null;
  const vs=glShader(gl, gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}');
  const fs=glShader(gl, gl.FRAGMENT_SHADER, VRFS);
  if(!vs||!fs) return null;
  const prog=gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.bindAttribLocation(prog,0,'a'); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ console.warn(gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const locA=gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(locA); gl.vertexAttribPointer(locA,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const u={}; for(const n of ['res','yaw','pitch','fov','sunAz','sunEl','sunRad','sunOn','sunCol','ground','eye','nr','na','sunMu','showScn','moonAz','moonEl','moonRad','moonOn','latRad','starPx']) u[n]=gl.getUniformLocation(prog, n);
  u.obj=gl.getUniformLocation(prog,'obj[0]'); u.kind=gl.getUniformLocation(prog,'kind[0]');
  gl.uniform1i(gl.getUniformLocation(prog,'sky'), 0);
  gl.uniform1i(gl.getUniformLocation(prog,'moonMap'), 1);
  const moonTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, moonTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([180,180,180,255]));
  gl.generateMipmap(gl.TEXTURE_2D);
  const starTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, starTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, STAR_N, 2, 0, gl.RGBA, gl.FLOAT, new Float32Array(STAR_N*8));
  gl.uniform1i(gl.getUniformLocation(prog,'starMap'), 3);
  const starBinTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, starBinTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 64, 6, 0, gl.RGBA, gl.FLOAT, new Float32Array(64*6*4));
  gl.uniform1i(gl.getUniformLocation(prog,'starBin'), 4);
  const starIdxTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, starIdxTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1024, 32, 0, gl.RGBA, gl.FLOAT, new Float32Array(1024*32*4));
  gl.uniform1i(gl.getUniformLocation(prog,'starIdx'), 5);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(u.fov, VR_FOV_DEG*Math.PI/180);
  gl.uniform1f(u.sunRad, SUN_RADIUS_DEG*DISK_SCALE*Math.PI/180);
  vrGL={gl,u,tex,prog,buf,moonTex,starTex,starBinTex,starIdxTex,starUploaded:-1};
  if(moonReady) uploadMoon();
  const cfs=glShader(gl, gl.FRAGMENT_SHADER, CLOUDFS), compFs=glShader(gl, gl.FRAGMENT_SHADER, COMPFS);
  if(cfs&&compFs){
    const cp=gl.createProgram(); gl.attachShader(cp,vs); gl.attachShader(cp,cfs); gl.bindAttribLocation(cp,0,'a'); gl.linkProgram(cp);
    const pp=gl.createProgram(); gl.attachShader(pp,vs); gl.attachShader(pp,compFs); gl.bindAttribLocation(pp,0,'a'); gl.linkProgram(pp);
    if(!gl.getProgramParameter(cp, gl.LINK_STATUS)||!gl.getProgramParameter(pp, gl.LINK_STATUS)){ console.warn(gl.getProgramInfoLog(cp)||gl.getProgramInfoLog(pp)); }
    else {
      const cu={}; for(const n of ['res','yaw','pitch','fov','eye','sunAz','sunEl','sunCol','sunMu','amb','showScn','cloudCov','cloudScale','cloudDrift','nr','na']) cu[n]=gl.getUniformLocation(cp, n);
      cu.obj=gl.getUniformLocation(cp,'obj[0]'); cu.kind=gl.getUniformLocation(cp,'kind[0]');
      const noise=gl.createTexture();
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, noise);
      const nd=makeCloudNoise();
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 64, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, nd);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
      gl.useProgram(cp); gl.uniform1i(gl.getUniformLocation(cp,'noise'), 1); gl.uniform1i(gl.getUniformLocation(cp,'sky'), 0); gl.uniform1f(cu.fov, VR_FOV_DEG*Math.PI/180);
      const compU={}; for(const n of ['res','yaw','pitch','fov','showScn']) compU[n]=gl.getUniformLocation(pp, n);
      compU.eye=gl.getUniformLocation(pp,'eye'); compU.obj=gl.getUniformLocation(pp,'obj[0]'); compU.kind=gl.getUniformLocation(pp,'kind[0]');
      gl.useProgram(pp); gl.uniform1i(gl.getUniformLocation(pp,'cloudTex'), 2); gl.uniform1f(compU.fov, VR_FOV_DEG*Math.PI/180);
      const cloudTex=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, cloudTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      vrGL.cloudProg=cp; vrGL.compProg=pp; vrGL.cu=cu; vrGL.compU=compU; vrGL.noise=noise; vrGL.cloudTex=cloudTex; vrGL.cloudFbo=gl.createFramebuffer(); vrGL.cw=0; vrGL.ch=0;
      gl.activeTexture(gl.TEXTURE0); gl.useProgram(prog);
    }
  }
  return gl;
}
function sizeVR(){
  const c=document.getElementById('vrc'), dpr=Math.min(window.devicePixelRatio||1, 2);
  const w=Math.max(2, Math.round(window.innerWidth*dpr)), h=Math.max(2, Math.round(window.innerHeight*dpr));
  if(c.width!==w||c.height!==h){ c.width=w; c.height=h; }
  if(vrGL){ vrGL.gl.viewport(0,0,c.width,c.height); }
}
function sceneFor(key){ // a dozen stand-ins: [bearing deg, distance m, radius m, height m, kind]
  const spots=list=>{ const o=new Float32Array(48), k=new Float32Array(12);
    for(let i=0;i<12;i++){ const s=list[i], a=s[0]*Math.PI/180; o[i*4]=Math.sin(a)*s[1]; o[i*4+1]=Math.cos(a)*s[1]; o[i*4+2]=s[2]; o[i*4+3]=s[3]; k[i]=s[4]; }
    return {o,k}; };
  const VOLC=[[175,320,80,150,2],[205,560,130,240,2],[140,900,200,340,2],[250,3000,700,520,2],[310,5200,1400,1000,1],[350,8000,2200,1500,1],[100,9000,2500,1600,1],[160,7000,1800,1100,1],[230,11000,2800,1700,1],[40,6500,1600,900,1],[70,4200,1100,780,1],[280,4800,1000,640,1]];
  const ICE=[[165,220,70,36,3],[195,420,130,60,3],[120,700,220,90,3],[240,1100,300,120,3],[210,1900,900,200,3],[260,3400,1600,280,3],[320,2100,1000,220,3],[30,7000,2000,900,3],[100,9000,2400,1100,3],[190,8000,1800,800,3],[250,11000,2600,1200,3],[330,6000,1600,700,3]];
  const TREES=[[10,70,5,24,5],[35,120,7,32,5],[60,85,4,20,5],[95,160,8,36,5],[140,95,6,28,5],[180,200,9,42,5],[220,110,5,26,5],[270,150,7,34,5],[40,6000,1600,900,1],[140,8500,2200,1300,1],[230,5000,1400,750,1],[310,10000,2500,1500,1]];
  const PEAKS=[[170,380,110,190,1],[200,720,170,300,1],[140,1200,260,420,1],[55,4200,1300,800,1],[95,2200,700,420,1],[230,4500,1400,880,1],[280,2600,800,500,1],[330,3800,1100,700,1],[70,8000,2200,1400,1],[160,9500,2600,1600,1],[240,7000,1800,1100,1],[310,11000,2800,1500,1]];
  const city=(dk,hk)=>[[8,45*dk,10,18*hk,4],[25,70*dk,14,36*hk,4],[48,55*dk,9,14*hk,4],[70,100*dk,16,55*hk,4],[110,80*dk,12,28*hk,4],[150,60*dk,11,22*hk,4],[190,130*dk,18,72*hk,4],[230,90*dk,13,40*hk,4],[300,7500,2000,1200,1],[20,9000,2400,1400,1],[160,11000,2800,1600,1],[250,6000,1500,800,1]].map(s=>s[4]===4?[s[0],s[1],s[2]*0.5,s[3]*0.5,s[4]]:s);
  if(key==='snowball07') return spots(ICE);
  if(key==='carbon30') return spots(TREES);
  if(key==='modern') return spots(city(2.2,1));
  if(key==='modernpoll') return spots(city(1.5,1.55));
  if(key==='hadean44'||key==='hadean40'||key==='archean38'||key==='archean27thin'||key==='archean27'||key==='archean27vthick'||key==='volcanic') return spots(VOLC);
  return spots(PEAKS);
}
function groundRGB(){
  const alb=LAND[EP[dIdx].key]||[.2,.18,.14], cg=skyNow.colgrid, NR=cg.length-1, NA=cg[0].length-1;
  let ar=0,ag=0,ab=0,n=0; const ir=Math.round(NR*0.45);
  for(let ia=0; ia<=NA; ia+=8){ const c=cg[ir][ia]; ar+=c[0]; ag+=c[1]; ab+=c[2]; n++; }
  const z=cg[0][0]; ar=ar/n*0.65+z[0]*0.35; ag=ag/n*0.65+z[1]*0.35; ab=ab/n*0.65+z[2]*0.35;
  const mu=Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180))*(skyNow.sunVis==null?1:skyNow.sunVis), s=skyNow.sunRGB, amb=[ar,ag,ab];
  return new Float32Array(alb.map((a,i)=>Math.min(255, a*(0.42*amb[i]+1.25*mu*s[i]+16))/255));
}
function paintVR(){
  if(!vrOn||!vrGL||!skyNow) return;
  const {gl,u,tex}=vrGL, c=gl.canvas;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.disable(gl.BLEND);
  gl.viewport(0,0,c.width,c.height);
  if(skyUploaded!==skyNow.gen){
    const cg=skyNow.colgrid, h=cg.length, w=cg[0].length, data=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const p=cg[y][x], o=(y*w+x)*4; data[o]=p[0]; data[o+1]=p[1]; data[o+2]=p[2]; data[o+3]=255; }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.uniform1f(u.nr, h-1); gl.uniform1f(u.na, w-1); skyUploaded=skyNow.gen;
  }
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, vrGL.moonTex);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.useProgram(vrGL.prog);
  gl.uniform2f(u.res, c.width, c.height);
  gl.uniform1f(u.yaw, vrYaw*Math.PI/180); gl.uniform1f(u.pitch, vrPitch*Math.PI/180);
  gl.uniform3f(u.eye, vrX, vrY, 2);
  gl.uniform1f(u.sunAz, skyNow.sunAz); gl.uniform1f(u.sunEl, 90-skyNow.sza);
  gl.uniform1f(u.moonAz, skyNow.moon.az); gl.uniform1f(u.moonEl, skyNow.moon.el);
  gl.uniform1f(u.moonRad, skyNow.moon.rad*DISK_SCALE); gl.uniform1f(u.moonOn, skyNow.moon.on?1:0);
  gl.uniform1f(u.latRad, LATDEG[dLat]*Math.PI/180);
  gl.uniform1f(u.sunOn, skyNow.sunOn?1:0);
  gl.uniform1f(u.sunMu, Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180))*(skyNow.sunVis==null?1:skyNow.sunVis));
  gl.uniform3fv(u.sunCol, new Float32Array(skyNow.sunRGB.map(v=>v/255)));
  gl.uniform3fv(u.ground, groundRGB());
  gl.uniform1f(u.showScn, vrScenery?1:0);
  const sc=sceneFor(EP[dIdx].key); gl.uniform4fv(u.obj, sc.o); gl.uniform1fv(u.kind, sc.k);
  gl.uniform1f(u.starPx, (VR_FOV_DEG*Math.PI/180)/Math.max(window.innerHeight,1));
  if(skyNow.stars && vrGL.starTex && vrGL.starUploaded!==skyNow.gen){
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, vrGL.starTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, STAR_N, 2, gl.RGBA, gl.FLOAT, skyNow.stars);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, vrGL.starBinTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, 6, gl.RGBA, gl.FLOAT, skyNow.starBins);
    const rows=Math.max(1, Math.ceil(skyNow.starIdxCount/1024));
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, vrGL.starIdxTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1024, rows, gl.RGBA, gl.FLOAT, skyNow.starIdx.subarray(0, 1024*rows*4));
    gl.activeTexture(gl.TEXTURE0);
    vrGL.starUploaded=skyNow.gen;
  }
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if(vrClouds&&vrGL.cloudProg){
    const cw=Math.max(2,(c.width*2)/3), ch=Math.max(2,(c.height*2)/3);
    if(cloudMinPrev==null) cloudMinPrev=minutes;
    else { let dm=minutes-cloudMinPrev; if(dm<-DAYMIN/2) dm+=DAYMIN; cloudMinPrev=minutes; cloudScroll+=dm*88; }
    const field=cloudField(EP[dIdx].key), cu=vrGL.cu;
    ensureCloudTarget(cw, ch);
    gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.cloudFbo);
    gl.viewport(0,0,cw,ch); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(vrGL.cloudProg);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, vrGL.noise);
    gl.uniform2f(cu.res, cw, ch);
    gl.uniform1f(cu.yaw, vrYaw*Math.PI/180); gl.uniform1f(cu.pitch, vrPitch*Math.PI/180);
    gl.uniform3f(cu.eye, vrX, vrY, 2);
    gl.uniform1f(cu.sunAz, skyNow.sunAz); gl.uniform1f(cu.sunEl, 90-skyNow.sza);
    gl.uniform1f(cu.sunMu, Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180))*(skyNow.sunVis==null?1:skyNow.sunVis));
    gl.uniform3fv(cu.sunCol, new Float32Array(skyNow.sunRGB.map(v=>v/255)));
    const cg=skyNow.colgrid, ay=Math.min(cg.length-1, Math.round((cg.length-1)*0.25)), ap=cg[ay][Math.floor(cg[ay].length/2)];
    gl.uniform3f(cu.amb, ap[0]/255, ap[1]/255, ap[2]/255);
    gl.uniform1f(cu.nr, cg.length-1); gl.uniform1f(cu.na, cg[0].length-1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1f(cu.showScn, vrScenery?1:0);
    gl.uniform1f(cu.cloudCov, field.cov); gl.uniform1f(cu.cloudScale, field.scale); gl.uniform1f(cu.cloudDrift, cloudScroll);
    gl.uniform4fv(cu.obj, sc.o); gl.uniform1fv(cu.kind, sc.k);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0,0,c.width,c.height);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(vrGL.compProg);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, vrGL.cloudTex);
    const pu=vrGL.compU;
    gl.uniform2f(pu.res, c.width, c.height);
    gl.uniform1f(pu.yaw, vrYaw*Math.PI/180); gl.uniform1f(pu.pitch, vrPitch*Math.PI/180);
    gl.uniform3f(pu.eye, vrX, vrY, 2);
    gl.uniform1f(pu.showScn, vrScenery?1:0);
    gl.uniform4fv(pu.obj, sc.o); gl.uniform1fv(pu.kind, sc.k);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);
  }
  const hh=minutes>=DAYMIN?24:Math.floor(minutes/60), mm=minutes>=DAYMIN?0:Math.floor(minutes%60), ss=minutes>=DAYMIN?0:Math.floor((minutes%1)*60);
  const lat=dLat==='Polar'?'75°':dLat==='Mid-latitude'?'45°':'equator';
  document.getElementById('vrplace').textContent=EP[dIdx].name+' · '+lat;
  document.querySelector('.vrnote').textContent=vrCaption();
  document.getElementById('vrclock').textContent=(document.getElementById('moonDate').value||'')+' · '+hh+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0')+' · '+(dayPlaying?'playing':'paused')+(vrNote?' · '+vrNote:'');
  placeBodyMarks();
  syncVRLink(false);
}
function projectBody(elDeg, azDeg, radiusDeg){
  const fov=VR_FOV_DEG*Math.PI/180, W=window.innerWidth, H=window.innerHeight;
  const fy=Math.tan(fov*0.5), fx=fy*(W/Math.max(H,1));
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180;
  const cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  const el=apparentEl(elDeg)*Math.PI/180, az=azDeg*Math.PI/180;
  const sd=[Math.sin(az)*Math.cos(el), Math.cos(az)*Math.cos(el), Math.sin(el)];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const depth=dot(sd,[sy*cp, cy*cp, sp]);
  const camX=dot(sd,[cy, -sy, 0]), camY=dot(sd,[-sy*sp, -cy*sp, cp]);
  const ahead=depth>0.02;
  let nx, ny;
  if(ahead){ nx=(camX/depth)/fx; ny=(camY/depth)/fy; }
  else { const m=Math.hypot(camX,camY)||1; nx=camX/m; ny=camY/m; }
  const margin=(radiusDeg*Math.PI/180)/fy;
  const inView=ahead && Math.abs(nx)<1+margin && Math.abs(ny)<1+margin;
  return {nx, ny, inView, W, H};
}
function markPoint(proj){
  let nx=proj.nx, ny=proj.ny;
  const {inView, W, H}=proj;
  let px, py;
  if(inView){ px=W/2+nx*W/2; py=H/2-ny*H/2; }
  else {
    const s=Math.max(Math.abs(nx), Math.abs(ny), 1e-6); nx/=s; ny/=s;
    px=W/2+nx*(W/2-46); py=H/2-ny*(H/2-46);
  }
  const ur=Math.hypot(nx,ny)||1;
  return {px, py, ux:nx/ur, uy:ny/ur};
}
function placeMark(mark, proj, show){
  const at=markPoint(proj);
  if(!show){ mark.hidden=true; return at; }
  const {px, py, ux, uy}=at, off=26;
  mark.hidden=false;
  mark.style.left=px+'px'; mark.style.top=py+'px';
  mark.querySelector('.chev').style.transform=`rotate(${Math.atan2(ux, uy)}rad)`;
  mark.querySelector('.badge').style.transform=`translate(calc(-50% + ${(-ux*off).toFixed(1)}px), calc(-50% + ${(uy*off).toFixed(1)}px))`;
  return at;
}
function drawMoonPhase(lit, toward){
  const c=document.getElementById('moonphase'), ctx=c.getContext('2d'), s=c.width, r=s*0.36;
  ctx.clearRect(0,0,s,s);
  ctx.save(); ctx.translate(s/2,s/2); ctx.rotate(toward);
  ctx.fillStyle='#2a2c32'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.clip();
  ctx.fillStyle='#e8e8ea';
  const k=1-2*Math.max(0,Math.min(1,lit));
  ctx.beginPath();
  ctx.arc(0,0,r,-Math.PI/2,Math.PI/2,false);
  ctx.ellipse(0,0,Math.max(0.001,Math.abs(k))*r,r,0,Math.PI/2,-Math.PI/2,k>0);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle='#000'; ctx.lineWidth=s*0.06; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}
function placeBodyMarks(){
  const sunEl=90-skyNow.sza, moon=skyNow.moon;
  const sun=projectBody(sunEl, skyNow.sunAz, SUN_RADIUS_DEG*DISK_SCALE);
  const moonProj=projectBody(moon.el, moon.az, moon.radDeg*DISK_SCALE);
  const sunMark=document.getElementById('sunmark');
  const sunAt=placeMark(sunMark, sun, !(skyNow.sunOn && sun.inView));
  if(!sunMark.hidden){ const rgb=skyNow.sunRGB; sunMark.style.color=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; }
  const moonAt=placeMark(document.getElementById('moonmark'), moonProj, !(moon.on && moonProj.inView));
  if(!document.getElementById('moonmark').hidden){
    drawMoonPhase(moonLit(moon, skyNow.sunAz, sunEl), Math.atan2(sunAt.py-moonAt.py, sunAt.px-moonAt.px));
  }
}
function requestVR(){ if(!vrOn||vrRAF) return; vrRAF=requestAnimationFrame(()=>{ vrRAF=0; paintVR(); }); }
function lookVR(dx, dy){ const deg=VR_FOV_DEG/Math.max(window.innerHeight,1); vrYaw=(vrYaw+dx*deg)%360; if(vrYaw<0) vrYaw+=360; vrPitch=Math.max(-80, Math.min(85, vrPitch-dy*deg)); requestVR(); }
function walking(){ return vrHeld.has('w')||vrHeld.has('a')||vrHeld.has('s')||vrHeld.has('d'); }
function stepWalk(dt){
  if(dt>0.05) dt=0.05;
  let f=0, s=0;
  if(vrHeld.has('w')) f++; if(vrHeld.has('s')) f--; if(vrHeld.has('d')) s++; if(vrHeld.has('a')) s--;
  if(!f&&!s) return;
  const yaw=vrYaw*Math.PI/180, sp=(vrHeld.has('shift')?120:24)*dt, inv=Math.hypot(f,s);
  const east=(Math.sin(yaw)*f+Math.cos(yaw)*s)/inv*sp, north=(Math.cos(yaw)*f-Math.sin(yaw)*s)/inv*sp;
  const sc=sceneFor(EP[dIdx].key);
  const hit=(x,y)=>{ if(!vrScenery) return false; for(let i=0;i<12;i++){ if(sc.k[i]<0.5) continue; const dx=x-sc.o[i*4], dy=y-sc.o[i*4+1], r=sc.o[i*4+2]+0.4; if(dx*dx+dy*dy<r*r) return true; } return false; };
  const nx=vrX+east, ny=vrY+north;
  if(!hit(nx,ny)){ vrX=nx; vrY=ny; } else if(!hit(nx,vrY)) vrX=nx; else if(!hit(vrX,ny)) vrY=ny;
}
function pumpWalk(){
  if(vrWalk||dayPlaying||!vrOn||!walking()) return;
  vrWalkStamp=performance.now();
  const frame=now=>{
    vrWalk=0;
    if(!vrOn||dayPlaying||!walking()) return;
    let dt=(now-vrWalkStamp)/1000; vrWalkStamp=now;
    stepWalk(dt); paintVR();
    vrWalk=requestAnimationFrame(frame);
  };
  vrWalk=requestAnimationFrame(frame);
}
function stepMinutes(d){
  if(dayPlaying) hplay.click();
  minutes+=d;
  while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); }
  while(minutes<0){ minutes+=DAYMIN; shiftMoonDate(-1); }
  hslider.value=minutes; renderDay();
}
function stepEpoch(d){
  dIdx=(dIdx+d%EP.length+EP.length)%EP.length; sel.value=String(dIdx); renderDay(); warm();
}
function jumpNextEclipse(){
  if(dayPlaying){ dayPlaying=false; adoptPlayRate(); hplay.textContent='Play'; hplay.setAttribute('aria-pressed','false'); syncVRPad(); }
  const raw=(document.getElementById('moonDate').value)||localISODate(new Date());
  const [Y,M,D]=raw.split('-').map(Number);
  let after=new Date(Y,M-1,D,0,0,0,0).getTime()+minutes*60000+1000;
  let start=null;
  for(let n=0;n<6;n++){
    start=findNextEclipse(after);
    if(start==null) break;
    if(Math.abs(start-30*60*1000-(after-1000))>90*1000) break;
    after=start+1000;
  }
  if(start==null){ vrNote='no eclipse in the next eight years'; paintVR(); return; }
  const t=new Date(start-30*60*1000);
  document.getElementById('moonDate').value=localISODate(t);
  minutes=t.getHours()*60+t.getMinutes()+t.getSeconds()/60+t.getMilliseconds()/60000;
  hslider.value=minutes;
  const g=sunGeom(LATDEG[dLat], minutes), elev=90-g.sza;
  vrYaw=g.az; vrPitch=Math.max(-8, Math.min(15, elev-8));
  renderDay();
}
function vrQuery(){
  const q=new URLSearchParams(location.search);
  q.set('vr','1');
  q.set('epoch', EP[dIdx].key);
  q.set('lat', dLat==='Equator'?'equator':dLat==='Polar'?'75':'45');
  q.set('t', String(Math.floor(minutes)));
  return q;
}
function vrLinkURL(){ return location.pathname+'?'+vrQuery().toString()+location.hash; }
let vrLinkAt=0;
function syncVRLink(force){
  if(!vrOn||vrNav) return;
  const url=vrLinkURL();
  if(location.pathname+location.search+location.hash===url) return;
  const now=performance.now();
  // Safari throws after about 100 replaceState calls per 30 seconds, and that error was stopping the clock.
  // iOS also repaints the page on each query change. On a phone, leave the clock out of the address bar until playback pauses.
  const q=new URLSearchParams(location.search);
  const latCode=dLat==='Equator'?'equator':dLat==='Polar'?'75':'45';
  const samePlace=q.get('epoch')===EP[dIdx].key && q.get('lat')===latCode;
  if(!force && vrTouch && samePlace) return;
  if(!force && now-vrLinkAt<500) return;
  vrLinkAt=now;
  try{ history.replaceState({vr:1},'',url); }
  catch(err){}
}
function clearVRLink(){
  const q=new URLSearchParams(location.search);
  if(!q.has('vr')) return;
  q.delete('vr');
  const s=q.toString();
  history.replaceState({},'',location.pathname+(s?'?'+s:'')+location.hash);
}
function applyLink(){
  const q=new URLSearchParams(location.search);
  const ep=q.get('epoch');
  if(ep){
    let idx=EP.findIndex(e=>e.key===ep);
    if(idx<0 && /^\d+$/.test(ep)) idx=+ep;
    if(idx>=0 && idx<EP.length){ dIdx=idx; sel.value=String(dIdx); }
  }
  const lat=(q.get('lat')||'').toLowerCase();
  const latName={equator:'Equator','0':'Equator','45':'Mid-latitude',mid:'Mid-latitude','mid-latitude':'Mid-latitude','75':'Polar',polar:'Polar'}[lat];
  if(latName){
    dLat=latName;
    document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.lat===latName?'true':'false'));
  }
  const raw=q.get('t');
  if(raw){
    let m=NaN;
    if(raw.includes(':')){ const p=raw.split(':'); m=(+p[0])*60+(+p[1]||0); }
    else m=+raw;
    if(m>=0 && m<=DAYMIN){ minutes=m; hslider.value=String(minutes); }
  }
  return q.has('vr');
}
const vrTouch=window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 820px) and (pointer: coarse)').matches;
let musicMuted=vrTouch, music=null;
const MUSIC_BPM=74;
const MUSIC_CHORDS=[[50,57,64,69],[55,62,67,71],[47,54,62,66],[52,57,64,69]];
const MUSIC_LEAD=[74,0,0,78,0,76,0,0,81,0,78,0,76,0,0,74,0,0,83,0,81,0,78,0,76,0,0,74,0,0,0,0];
function playTone(midi, when, dur, type, level, dest){
  const ctx=music.ctx, freq=440*Math.pow(2,(midi-69)/12), g=ctx.createGain();
  const a=Math.min(0.6, dur*0.2), r=Math.min(1.2, dur*0.24), hold=Math.max(when+a, when+dur-r);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when+a);
  g.gain.setValueAtTime(level, hold);
  g.gain.exponentialRampToValueAtTime(0.0001, when+dur);
  g.connect(dest);
  const n=type==='sine'?1:2;
  for(let i=0;i<n;i++){
    const o=ctx.createOscillator();
    o.type=type; o.frequency.value=freq*(i?1.007:0.997);
    o.connect(g); o.start(when); o.stop(when+dur+0.02);
  }
}
function scheduleVRMusic(){
  if(!music||music.ctx.state!=='running') return;
  const ctx=music.ctx, eighth=60/MUSIC_BPM/2;
  if(music.next<ctx.currentTime-0.05) music.next=ctx.currentTime+0.05;
  while(music.next<ctx.currentTime+0.35){
    const step=music.step, when=music.next+(step%2?eighth*0.16:0);
    const chord=MUSIC_CHORDS[Math.floor(step/32)%MUSIC_CHORDS.length];
    if(step%32===0){ for(let i=0;i<chord.length;i++) playTone(chord[i], when, eighth*33, 'sawtooth', 0.03, music.filter); }
    if(step%8===0) playTone(chord[0]-12, when, eighth*7.2, 'sine', 0.08, music.master);
    const lead=MUSIC_LEAD[step%32];
    if(lead) playTone(lead, when, eighth*2.4, 'triangle', 0.05, music.filter);
    music.step++; music.next+=eighth;
  }
}
function applyMusicGain(){
  if(!music) return;
  const now=music.ctx.currentTime, level=(vrOn&&!musicMuted)?0.9:0.0001;
  music.master.gain.cancelScheduledValues(now);
  music.master.gain.setValueAtTime(Math.max(music.master.gain.value, 0.0001), now);
  music.master.gain.exponentialRampToValueAtTime(level, now+((musicMuted||!vrOn)?0.28:0.9));
}
function pokeVRMusic(){
  if(!music||!vrOn) return;
  if(music.ctx.state!=='suspended') return;
  const p=music.ctx.resume();
  const go=()=>{ if(!music||!vrOn) return; if(music.next<music.ctx.currentTime) music.next=music.ctx.currentTime+0.06; applyMusicGain(); };
  if(p&&p.then) p.then(go); else go();
}
function startVRMusic(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return;
  if(!music){
    const ctx=new AC(), master=ctx.createGain();
    master.gain.value=0.0001;
    const filter=ctx.createBiquadFilter();
    filter.type='lowpass'; filter.frequency.value=640; filter.Q.value=0.4;
    const lfo=ctx.createOscillator(), lfoG=ctx.createGain();
    lfo.frequency.value=0.055; lfoG.gain.value=70;
    lfo.connect(lfoG); lfoG.connect(filter.frequency); lfo.start();
    const smear=ctx.createDelay(0.08), sg=ctx.createGain();
    smear.delayTime.value=0.024; sg.gain.value=0.28;
    filter.connect(smear); smear.connect(sg); sg.connect(master);
    filter.connect(master); master.connect(ctx.destination);
    music={ctx, master, filter, step:0, next:0, timer:0};
  }
  if(!music.timer) music.timer=setInterval(scheduleVRMusic, 120);
  pokeVRMusic(); applyMusicGain();
}
function stopVRMusic(){
  applyMusicGain();
  if(music&&music.timer){ clearInterval(music.timer); music.timer=0; }
  setTimeout(()=>{ if(music&&!vrOn) music.ctx.suspend(); }, 700);
}
function toggleVRMusic(){
  musicMuted=!musicMuted;
  syncVRPad();
  if(!vrOn) return;
  if(!music) startVRMusic();
  pokeVRMusic(); applyMusicGain();
}
function enterVR(fromLink){
  if(!initVR()) return;
  vrOn=true; vrLockedOnce=false; vrX=0; vrY=0; vrHeld.clear(); const root=document.getElementById('vr'); root.classList.add('on'); root.setAttribute('aria-hidden','false');
  const g=sunGeom(LATDEG[dLat], minutes); vrYaw=g.az; const elev=90-g.sza; vrPitch=Math.max(-8, Math.min(15, elev-8));
  sizeVR(); document.body.style.overflow='hidden'; root.tabIndex=-1; root.focus();
  // Capture the pointer before the slow sky render, while the click is still a user gesture, so yaw is not stopped by the edge of the window.
  vrRelock=true; lockLook();
  if(!dayPlaying){ dayPlaying=true; if(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); } hplay.textContent='Pause'; hplay.setAttribute('aria-pressed','true'); }
  if(!vrNav){
    const url=vrLinkURL();
    if(fromLink===true) history.replaceState({vr:1},'',url);
    else history.pushState({vr:1},'',url);
    vrLinkKey=EP[dIdx].key+'|'+dLat+'|'+Math.floor(minutes);
  }
  renderDay(false);
  adoptPlayRate();
  const fs=root.requestFullscreen?root.requestFullscreen():null; if(fs&&fs.catch) fs.catch(()=>{});
  setTimeout(()=>{ vrRelock=false; }, 700);
  if(!musicMuted) startVRMusic();
  syncVRPad();
}
function lockLook(){
  if(vrTouch||!vrOn||document.pointerLockElement===document.getElementById('vrc')) return;
  const p=document.getElementById('vrc').requestPointerLock(); if(p&&p.catch) p.catch(()=>{});
}
function exitVR(){
  if(!vrOn) return; vrOn=false; stopVRMusic(); vrRelock=false; vrLinkKey=''; vrHeld.clear(); document.getElementById('sunmark').hidden=true; document.getElementById('moonmark').hidden=true; if(vrWalk){ cancelAnimationFrame(vrWalk); vrWalk=0; }
  if(!vrNav) clearVRLink();
  const root=document.getElementById('vr'); root.classList.remove('on','locked'); root.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  if(document.pointerLockElement) document.exitPointerLock();
  if(document.fullscreenElement){ const p=document.exitFullscreen(); if(p&&p.catch) p.catch(()=>{}); }
  adoptPlayRate();
  renderDay(false);
}
document.getElementById('vrbtn').addEventListener('click', ()=>enterVR(false));
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ if(vrOn) syncVRLink(true); return; }
  if(vrOn&&dayPlaying) adoptPlayRate();
});
window.addEventListener('popstate',()=>{
  const want=new URLSearchParams(location.search).has('vr');
  vrNav=true;
  if(want&&!vrOn) enterVR(true);
  else if(!want&&vrOn) exitVR();
  vrNav=false;
});
const vrc=document.getElementById('vrc');
window.addEventListener('mousemove', e=>{ if(!vrOn) return; if(!e.movementX&&!e.movementY) return; lookVR(e.movementX, e.movementY); });
window.addEventListener('pointerdown', ()=>{ if(!vrOn) return; pokeVRMusic(); if(document.pointerLockElement===vrc) return; vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); });
let vrTX=0, vrTY=0;
vrc.addEventListener('touchstart', e=>{ const t=e.touches[0]; vrTX=t.clientX; vrTY=t.clientY; }, {passive:true});
vrc.addEventListener('touchmove', e=>{ if(!vrOn) return; const t=e.touches[0]; lookVR(t.clientX-vrTX, t.clientY-vrTY); vrTX=t.clientX; vrTY=t.clientY; e.preventDefault(); }, {passive:false});
window.addEventListener('resize', ()=>{ if(vrOn){ sizeVR(); paintVR(); } });
document.addEventListener('fullscreenchange', ()=>{
  if(!vrOn) return;
  if(!document.fullscreenElement){ exitVR(); return; }
  vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400);
});
let vrLockedOnce=false;
document.addEventListener('pointerlockchange', ()=>{
  const locked=document.pointerLockElement===vrc;
  document.getElementById('vr').classList.toggle('locked', locked);
  if(locked){ vrLockedOnce=true; return; }
  if(!vrOn||!vrLockedOnce) return;
  if(vrRelock){ lockLook(); return; }
  exitVR();
});
document.addEventListener('keyup',e=>{ if(e.key==='Shift') vrHeld.delete('shift'); else vrHeld.delete(e.key.length===1?e.key.toLowerCase():e.key); });
window.addEventListener('blur',()=>vrHeld.clear());
document.addEventListener('keydown',e=>{
  if(vrOn){
    pokeVRMusic();
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    if(k==='m'&&!e.repeat){ e.preventDefault(); toggleVRMusic(); return; }
    if(k==='w'||k==='a'||k==='s'||k==='d'){ e.preventDefault(); vrHeld.add(k); if(e.shiftKey) vrHeld.add('shift'); if(!dayPlaying) pumpWalk(); return; }
    if(e.key==='Shift'){ vrHeld.add('shift'); return; }
    if(k==='h'&&!e.repeat){ e.preventDefault(); vrScenery=!vrScenery; paintVR(); syncVRPad(); return; }
    if(k==='c'&&!e.repeat){ e.preventDefault(); vrClouds=!vrClouds; paintVR(); syncVRPad(); return; }
    if(e.key==='Escape'){ exitVR(); return; }
    if(e.key===' ' && !e.repeat){ e.preventDefault(); hplay.click(); return; }
    if(e.key==='ArrowRight'){ e.preventDefault(); stepMinutes(5); return; }
    if(e.key==='ArrowLeft'){ e.preventDefault(); stepMinutes(-5); return; }
    if(e.key==='ArrowUp'||e.key===']'){ e.preventDefault(); stepEpoch(1); return; }
    if(e.key==='ArrowDown'||e.key==='['){ e.preventDefault(); stepEpoch(-1); return; }
    if(k==='e'&&!e.repeat){ e.preventDefault(); jumpNextEclipse(); return; }
    return;
  }
  if(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='SELECT') return;
  if(e.key==='ArrowRight'&&tIdx<EP.length-1){tslider.value=tIdx+1;showEpoch(tIdx+1);}
  if(e.key==='ArrowLeft'&&tIdx>0){tslider.value=tIdx-1;showEpoch(tIdx-1);}
});
function syncVRPad(){
  const set=(id,on)=>{ const b=document.getElementById(id); if(b) b.setAttribute('aria-pressed', on?'true':'false'); };
  set('vrpad-scenery', vrScenery);
  set('vrpad-clouds', vrClouds);
  set('vrpad-music', !musicMuted);
  const play=document.getElementById('vrpad-play');
  if(play){ play.setAttribute('aria-pressed', dayPlaying?'true':'false'); play.setAttribute('aria-label', dayPlaying?'Pause':'Play'); }
  const el=document.getElementById('vrmusiclabel');
  if(el) el.textContent=musicMuted?'muted':'music';
}
document.querySelectorAll('.vrpad button, .vrplay').forEach(b=>{
  b.addEventListener('pointerdown', e=>e.stopPropagation());
  b.addEventListener('click', e=>{
    e.preventDefault(); e.stopPropagation();
    const act=b.dataset.act;
    if(act==='scenery'){ vrScenery=!vrScenery; paintVR(); }
    else if(act==='clouds'){ vrClouds=!vrClouds; paintVR(); }
    else if(act==='music'){ toggleVRMusic(); return; }
    else if(act==='play') hplay.click();
    else if(act==='time') stepMinutes(+b.dataset.dir);
    else if(act==='era') stepEpoch(+b.dataset.dir);
    else if(act==='eclipse') jumpNextEclipse();
    syncVRPad();
  });
});
syncVRPad();
const openVR=applyLink();
tslider.value=dIdx;
(function(){
  const t=new Date();
  document.getElementById('moonDate').value=localISODate(t);
  minutes=t.getHours()*60+t.getMinutes()+t.getSeconds()/60;
  hslider.value=String(minutes);
})();
moonImg.src='moon.jpg';
showEpoch(dIdx); renderDay(); warm();
if(openVR) enterVR(true);
function colorTip(canvas, tip, inside){
  const ctx=canvas.getContext('2d'); let cur=null, copiedUntil=0, hovering=false, px=0, py=0;
  const refresh=()=>{
    if(!hovering){ tip.style.display='none'; return; }
    if(!inside(px,py)){ tip.style.display='none'; cur=null; return; }
    const x=Math.max(0,Math.min(canvas.width-1,Math.round(px))), y=Math.max(0,Math.min(canvas.height-1,Math.round(py)));
    const d=ctx.getImageData(x,y,1,1).data; cur=hex([d[0],d[1],d[2]]);
    tip.innerHTML=`<i style="background:${cur}"></i>current color ${cur}${performance.now()<copiedUntil?' copied':''}`;
    const b=canvas.getBoundingClientRect();
    tip.style.left=(px*b.width/canvas.width)+'px'; tip.style.top=(py*b.height/canvas.height)+'px';
    tip.style.transform=px>canvas.width/2?'translate(calc(-100% - 14px), -50%)':'translate(14px, -50%)';
    tip.style.display='block';
  };
  const show=(e)=>{ const b=canvas.getBoundingClientRect(); px=(e.clientX-b.left)*canvas.width/b.width; py=(e.clientY-b.top)*canvas.height/b.height; hovering=true; refresh(); };
  canvas.addEventListener('mousemove',show);
  canvas.addEventListener('mouseleave',()=>{ hovering=false; tip.style.display='none'; cur=null; });
  const copy=(e)=>{ show(e); if(!cur) return; if(navigator.clipboard){ navigator.clipboard.writeText(cur).then(()=>{ copiedUntil=performance.now()+1200; refresh(); }).catch(()=>{}); } };
  canvas.addEventListener('click',copy);
  canvas.addEventListener('touchstart',e=>{ const t=e.touches[0]; copy({clientX:t.clientX,clientY:t.clientY}); setTimeout(()=>{ hovering=false; tip.style.display='none'; },1500); },{passive:true});
  return refresh;
}
refreshGlobeTip=colorTip(globe, document.getElementById('gtip'), (x,y)=>{ const r=Math.hypot(x-globe.width/2,y-globe.height/2); return r<globe.width*0.30*1.5; });
refreshDomeTip=colorTip(dome, document.getElementById('dtip'), (x,y)=>{ const r=Math.hypot(x-dome.width/2,y-dome.height/2); return r<dome.width*0.46; });
</script>
</body></html>'''
html = html.replace('__EP__', json.dumps(EP, separators=(',',':'))).replace('__DAY__', json.dumps(DAY, separators=(',',':'))).replace('__YREF__', repr(YREF))
open('/mnt/user-data/outputs/sky-through-time.html','w').write(html)
print(len(html)/1e6, 'MB')
