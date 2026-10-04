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
#sunmark{position:absolute;width:36px;height:36px;margin:-18px 0 0 -18px;pointer-events:none;z-index:6;color:#fff}
#sunmark svg{display:block;width:100%;height:100%;overflow:visible}
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
<p class="hint">A whole-sky (fisheye) view: the zenith is at the center and the horizon is the rim, north at the top. Equinox geometry, so the Sun rises due east at 6:00 and sets due west at 18:00 everywhere; at the poles the noon Sun sits only 15° above the horizon. The Moon is placed for the selected date and clock time at the selected latitude, on your time zone's central meridian. On this dome the Sun and Moon are enlarged together so the phase stays readable; in the VR view both are drawn at four times that angular size. Moonlight is the same sky grid as sunlight, added on top, with the Moon at its own place in the sky. Its brightness follows the lunar phase and the Moon's angular size at that epoch.</p>
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

<div class="foot">Model and data: spherical-shell single scattering with a delta-Eddington multiple-scattering correction, 380–780 nm, CIE 1931 color matching, sRGB output without chromatic adaptation. Colors are what a daylight-balanced camera would record, not what an adapted eye would perceive. Clouds are omitted; paleoatmosphere compositions carry order-of-magnitude uncertainty. Time of day is interpolated between 34 computed solar zenith angles. From the horizon to 20° below it, those samples are spaced 1° apart; from 20° to 30° below, that last sky fades to black. The plane-parallel multiple-scattering term fades out from 10° above the horizon through sunrise. The Moon is a NASA LROC color map (SVS CGI Moon Kit). Moonlight is that same sky grid with the Moon in place of the Sun, added to the sunlight, and scaled by the Allen phase law (Krisciunas &amp; Schaefer 1991) and by the square of the Moon's angular size at that epoch. Its phase is the angle between it and the Sun drawn here. Its size follows the Earth–Moon distance at each epoch: cyclostratigraphic distances from Farhat et al. 2022, and about 70% of today's distance at 3.2 Ga from the Moodies Group (Eulenfeld &amp; Heubeck 2023). Ages older than 3.2 Ga extend that trend and stay beyond 30 Earth radii.</div>
</main>
<div id="vr" aria-hidden="true">
<canvas id="vrc"></canvas>
<div id="sunmark" hidden><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 24 L18 8 L29 24" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 24 L18 8 L29 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
<div class="vrhud">
  <div class="vrtop"><div id="vrplace"></div><div class="vrtop-right"><div id="vrclock"></div><button type="button" id="vrpad-play" class="vrplay" data-act="play" aria-pressed="true" aria-label="Pause"><svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z"/></svg></button></div></div>
  <div class="vrbot">
    <div class="vrkeys"><span>mouse looks</span><span><kbd>w</kbd><kbd>a</kbd><kbd>s</kbd><kbd>d</kbd> move</span><span><kbd>shift</kbd> faster</span><span><kbd>h</kbd> scenery</span><span><kbd>c</kbd> clouds</span><span><kbd>m</kbd> <span id="vrmusiclabel">music</span></span><span><kbd>esc</kbd> leave</span><span><kbd>space</kbd> play / pause</span><span><kbd>←</kbd><kbd>→</kbd> step time</span><span><kbd>↑</kbd><kbd>↓</kbd> change era</span></div>
    <div class="vrnote">The plain, the shapes, and the clouds are scenery. The sky is the model.</div>
    <div class="vrpad" role="toolbar" aria-label="View controls">
      <div class="vrpad-row">
        <button type="button" id="vrpad-scenery" data-act="scenery" aria-pressed="true" aria-label="Scenery"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19l6-11 4 6 3-4 5 9z"/></svg></button>
        <button type="button" id="vrpad-clouds" data-act="clouds" aria-pressed="true" aria-label="Clouds"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6-1.6A3.5 3.5 0 0 0 7 18z"/></svg></button>
        <button type="button" id="vrpad-music" data-act="music" aria-pressed="true" aria-label="Music"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v10"/><circle cx="7" cy="18" r="2.4" fill="currentColor" stroke="none"/><circle cx="17" cy="14" r="2.4" fill="currentColor" stroke="none"/></svg></button>
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
  let Ymax=1e-30, Yhold=1e-30;
  const addField=(X, src, scale, vz, comp)=>{
    if(!src || src.fade<=0 || scale<=0) return null;
    let azr=Math.abs(comp-src.az); if(azr>180) azr=360-azr;
    const S=domeXYZ(ep.key,dLat,src.si,src.st,Math.min(vz,88),azr);
    const f=src.fade*scale;
    X[0]+=S[0]*f; X[1]+=S[1]*f; X[2]+=S[2]*f;
    return S;
  };
  for(let ir=0;ir<=NR;ir++){ const row=[]; const vz=90*ir/NR; for(let ia=0;ia<=NA;ia++){ const comp=360*ia/NA;
      const X=[0,0,0];
      const Xsun=addField(X, sunSrc, 1, vz, comp); if(Xsun && Xsun[1]>Yhold) Yhold=Xsun[1];
      addField(X, moonSrc, mScale, vz, comp);
      if(X[1]>Ymax) Ymax=X[1]; row.push(X);} grid.push(row); }
  const Yref = autoExpo ? Math.max(past>0?Yhold:Ymax, 1e-6*YREF) : YREF; const k = autoExpo?0.85:0.85, p = autoExpo?0.5:0.4;
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
  if(!fast) drawMoonOnDome(moon, sunAz, 90-sza);
  if(!fast && rr-SUNR<R && sunRelD>3e-4){
    dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
    const col=hex(sunRGB);
    dctx.globalAlpha=1; dctx.fillStyle=col; dctx.beginPath(); dctx.arc(sx,sy,SUNR,0,Math.PI*2); dctx.fill(); dctx.restore();
  }
  skyNow={colgrid, sza, sunAz, sunRGB, sunOn:sunRelD>3e-4 && sza<90+SUN_RADIUS_DEG*DISK_SCALE+35/60, moon, gen:++skyGen};
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
  const sumAt=(vz,comp)=>{ const X=[0,0,0]; addField(X,sunSrc,1,vz,comp); addField(X,moonSrc,mScale,vz,comp); return X; };
  const zX=sumAt(0, sunAz), hX=sumAt(88, sunAz+90);
  const fmt=X=>{ if(X[1]<=1e-7*YREF) return 'dark'; const s=X[0]+X[1]+X[2]; const c=cct(X[0]/s,X[1]/s); return (c>800&&c<60000? c.toLocaleString()+' K':'—')+` · ${(100*X[1]/YREF).toPrecision(2)}%`; };
  document.getElementById('rzen').textContent=fmt(zX); document.getElementById('rhor').textContent=fmt(hX);
  document.getElementById('rsun').textContent = sza>=90 ? 'below horizon' : (sunRel<=3e-4 ? 'not visible' : (()=>{const s=sX[0]+sX[1]+sX[2]; return cct(sX[0]/s,sX[1]/s).toLocaleString()+' K · '+(sunRel*100).toPrecision(2)+'%';})());
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
    const nrm=vnorm(vadd(vscale(b.east,u), vscale(b.north,v), vscale(b.md, Math.sqrt(1-u*u-v*v))));
    const lit=smooth01(-0.02,0.05, vdot(nrm,sd));
    px[o+3]=Math.round(lit*255);
  }
  sctx.putImageData(img,0,0);
}
function drawMoonOnDome(moon, sunAz, sunEl){
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
let skyNow=null, skyGen=0, skyUploaded=-1, vrOn=false, vrYaw=0, vrPitch=8, vrX=0, vrY=0, vrScenery=true, vrClouds=true, cloudScroll=0, cloudMinPrev=null, vrRelock=false, vrGL=null, vrRAF=0, vrWalk=0, vrWalkStamp=0, vrNav=false, vrLinkKey='';
const vrHeld=new Set();
const VRFS=`#version 300 es
precision highp float;
uniform sampler2D sky; uniform sampler2D moonMap; uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunRad,sunOn,nr,na,sunMu,showScn;
uniform float moonAz,moonEl,moonRad,moonOn,latRad;
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
    float te=trueAlt(elevDeg), teR=te*0.01745329252, cth=cos(teR);
    vec3 src=vec3(sin(comp)*cth, cos(comp)*cth, sin(teR));
    if(moonOn>0.5&&te>-1.2){
      float mA=moonAz*0.01745329252, mZ=(90.0-moonEl)*0.01745329252;
      vec3 md=normalize(vec3(sin(mA)*sin(mZ), cos(mA)*sin(mZ), cos(mZ)));
      if(dot(src,md)>cos(moonRad)){
        vec3 ncp=vec3(0.0, cos(latRad), sin(latRad));
        vec3 north=ncp-md*dot(ncp,md);
        if(dot(north,north)<1e-6) north=vec3(1.0,0.0,0.0);
        north=normalize(north);
        vec3 east=normalize(cross(north, md));
        float s=sin(moonRad);
        float x=dot(src,east)/s, y=dot(src,north)/s, rr=sqrt(x*x+y*y);
        if(rr>1.0){ x/=rr; y/=rr; rr=1.0; }
        vec3 alb=texture(moonMap, vec2(x*0.5+0.5, y*0.5+0.5)).rgb;
        vec3 nrm=normalize(east*x+north*y+md*sqrt(max(1.0-rr*rr,0.0)));
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
    if(sunOn>0.5&&te>-1.0&&dot(src,sd)>cos(sunRad)) skyC=sunCol;
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
float cloudNoise(vec2 plane, float z, float detail, float lod, float sc){
  vec3 uv=vec3(plane*sc, z);
  float edge=0.78-cloudCov*0.62;
  float gate=smoothstep(edge, edge+mix(0.10, 0.28, lod), texture(noise, uv).g);
  // Same billow the clouds had before the tile grew, four times smaller, so the
  // 28 km coverage still groups them and the cells themselves are not huge coins.
  float k=mix(4.0, 2.4, lod);
  vec3 q=vec3(uv.xy*k, uv.z*mix(2.2, 1.1, lod));
  if(detail>0.35){
    vec2 w=texture(noise, q*1.8+vec3(0.6,2.4,1.3)).rg;
    q+=vec3(w.x-0.5, w.y-0.5, (w.x-w.y)*0.4)*0.22*detail;
  }
  float core=smoothstep(mix(0.40, 0.22, lod), mix(0.72, 0.92, lod), texture(noise, q).r);
  if(detail>0.35){
    float mid=texture(noise, q*2.15+vec3(1.7,3.4,0.5)).r;
    float lump=mid;
    if(detail>0.65){
      float fine=texture(noise, q*3.8+vec3(4.1,0.8,2.6)).r;
      lump=mid*0.58+fine*0.42;
    }
    core=mix(core, clamp((core-(1.0-lump)*0.40)/0.60, 0.0, 1.0), detail);
  }
  return core*gate;
}
float cloudDen(vec3 p, float detail, float lod, float deck){
  vec2 dh=p.xy-eye.xy;
  float R=833333.0;
  float numer=dot(dh,dh)+p.z*(p.z+2.0*R);
  float alt=numer/(sqrt(dot(dh,dh)+(p.z+R)*(p.z+R))+R);
  float ph=clamp((alt-1500.0)/4900.0, 0.0, 1.0);
  float grad=smoothstep(0.0, mix(0.10, 0.20, lod), ph)*smoothstep(1.0, mix(0.58, 0.40, lod), ph);
  float sc=cloudScale*mix(1.0, 0.85, lod);
  float zK=mix(0.58, 0.22, max(smoothstep(0.12, 0.55, lod), deck));
  float zc=ph*zK+0.13;
  vec2 wind=vec2(cloudDrift, cloudDrift*0.42);
  return cloudNoise(p.xy+wind, zc, detail, lod, sc)*grad;
}
float lightBeer(vec3 p, vec3 sd, float lod, float deck){
  float tau=0.0, ls=mix(240.0, 1100.0, lod);
  for(int i=0;i<5;i++){ p+=sd*ls; tau+=cloudDen(p, 0.0, lod, deck)*ls; }
  return exp(-tau*0.0026);
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
  float tIn=shellT(ro, rd, 1500.0), tOut=shellT(ro, rd, 6400.0);
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
  tOut=min(tOut, 120000.0);
  float dt=clamp((tOut-tIn)/40.0, 80.0, mix(280.0, 2200.0, smoothstep(8000.0, 45000.0, tIn)));
  float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float t=tIn+dt*ign, T=1.0, tAcc=0.0;
  float deck=smoothstep(0.30, 0.06, rd.z);
  vec3 col=vec3(0.0);
  for(int i=0;i<40;i++){
    if(T<0.04||t>tOut) break;
    float j=fract(ign+float(i)*0.61803398875);
    vec3 p=ro+rd*(t+(j-0.5)*dt);
    float lod=max(smoothstep(7000.0, 26000.0, t), smoothstep(0.28, 0.05, rd.z)*smoothstep(3000.0, 12000.0, t));
    float detail=smoothstep(42000.0, 6000.0, t)*smoothstep(0.01, 0.09, rd.z);
    float den=cloudDen(p, detail, lod, deck);
    if(den>0.02){
      float beer=lightBeer(p, sd, lod, deck);
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
      float a=1.0-exp(-den*dt*0.0032);
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
  const u={}; for(const n of ['res','yaw','pitch','fov','sunAz','sunEl','sunRad','sunOn','sunCol','ground','eye','nr','na','sunMu','showScn','moonAz','moonEl','moonRad','moonOn','latRad']) u[n]=gl.getUniformLocation(prog, n);
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
  gl.uniform1f(u.fov, VR_FOV_DEG*Math.PI/180);
  gl.uniform1f(u.sunRad, SUN_RADIUS_DEG*DISK_SCALE*Math.PI/180);
  vrGL={gl,u,tex,prog,buf,moonTex};
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
  const mu=Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180)), s=skyNow.sunRGB, amb=[ar,ag,ab];
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
  gl.uniform1f(u.sunMu, Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180)));
  gl.uniform3fv(u.sunCol, new Float32Array(skyNow.sunRGB.map(v=>v/255)));
  gl.uniform3fv(u.ground, groundRGB());
  gl.uniform1f(u.showScn, vrScenery?1:0);
  const sc=sceneFor(EP[dIdx].key); gl.uniform4fv(u.obj, sc.o); gl.uniform1fv(u.kind, sc.k);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if(vrClouds&&vrGL.cloudProg){
    const cw=Math.max(2,c.width>>1), ch=Math.max(2,c.height>>1);
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
    gl.uniform1f(cu.sunMu, Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180)));
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
  document.getElementById('vrclock').textContent=(document.getElementById('moonDate').value||'')+' · '+hh+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0')+' · '+(dayPlaying?'playing':'paused');
  placeSunMark();
  syncVRLink(false);
}
function placeSunMark(){
  const mark=document.getElementById('sunmark');
  if(!skyNow){ mark.hidden=true; return; }
  const fov=VR_FOV_DEG*Math.PI/180, W=window.innerWidth, H=window.innerHeight;
  const fy=Math.tan(fov*0.5), fx=fy*(W/Math.max(H,1));
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180;
  const cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  const el=apparentEl(90-skyNow.sza)*Math.PI/180, az=skyNow.sunAz*Math.PI/180;
  const sd=[Math.sin(az)*Math.cos(el), Math.cos(az)*Math.cos(el), Math.sin(el)];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const depth=dot(sd,[sy*cp, cy*cp, sp]);
  const camX=dot(sd,[cy, -sy, 0]), camY=dot(sd,[-sy*sp, -cy*sp, cp]);
  const ahead=depth>0.02;
  let nx, ny;
  if(ahead){ nx=(camX/depth)/fx; ny=(camY/depth)/fy; }
  else { const m=Math.hypot(camX,camY)||1; nx=camX/m; ny=camY/m; }
  const margin=(SUN_RADIUS_DEG*DISK_SCALE*Math.PI/180)/fy;
  const inView=ahead && Math.abs(nx)<1+margin && Math.abs(ny)<1+margin;
  // Hide only while the disk itself is on screen. Below the horizon the disk
  // is not drawn, so the chevron stays and sits on the Sun's direction.
  if(skyNow.sunOn && inView){ mark.hidden=true; return; }
  let px, py;
  if(!skyNow.sunOn && inView){ px=W/2+nx*W/2; py=H/2-ny*H/2; }
  else {
    const s=Math.max(Math.abs(nx), Math.abs(ny), 1e-6); nx/=s; ny/=s;
    const inset=46; px=W/2+nx*(W/2-inset); py=H/2-ny*(H/2-inset);
  }
  const rgb=skyNow.sunRGB;
  mark.hidden=false;
  mark.style.left=px+'px';
  mark.style.top=py+'px';
  mark.style.color=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  mark.style.transform=`rotate(${Math.atan2(nx, ny)}rad)`;
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
  if(!vrOn) return; vrOn=false; stopVRMusic(); vrRelock=false; vrLinkKey=''; vrHeld.clear(); document.getElementById('sunmark').hidden=true; if(vrWalk){ cancelAnimationFrame(vrWalk); vrWalk=0; }
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
