/* ---------- The spectrum under the pointer ---------- */
// A direction's light is the sum of its sources, each with the luminance the sky drawing already
// gives it (cd/m²) and a spectrum of its own, from 380 to 780 nm in 1 nm steps:
//   - Sunlight and moonlight scattered by the air: the model's own spectra (spectra.py, its
//     native 10 nm), read from spectra.bin at the nearest stored Sun heights and directions.
//   - The Sun's and Moon's disks: the model's direct sunlight, the Moon's a little redder (its
//     reflectance rises by about half from 400 to 750 nm).
//   - The natural night sky: zodiacal light and faint stars (sunlight), and airglow: the
//     557.7 nm and 630/636 nm oxygen lines, the sodium D lines and the OH bands, with the O2
//     Herzberg bands and a blue-green continuum set so the total has the colour the sky drawing
//     uses (xy 0.294, 0.324). Without oxygen, the O2 Herzberg II band from split CO2 instead.
//   - City light: high-pressure sodium (broadened, self-absorbed D lines) and white LEDs
//     (a 452 nm chip under a broad phosphor), mixed to each epoch's glow colour, or 1815's oil
//     flames (1850 K).
//   - The Milky Way: old starlight, as a 4800 K body.
//   - The aurora: its four emissions at that point, as aurora.js lists their lines.
// Narrow features the 10 nm model does not resolve are drawn on top: the Sun's Fraunhofer lines
// on everything that is sunlight, and the O2 A and B bands and the 720 nm water band of the air
// along the way, scaled by each epoch's O2 and water. Too narrow to move the colour; drawn so
// the plot shows them.
const SP_L0=380, SP_N=401;
const SP_LAM=Float32Array.from({length:SP_N}, (_, i)=>SP_L0+i);
function spG(x, mu, s1, s2){ const s=x<mu?s1:s2; return Math.exp(-0.5*((x-mu)/s)**2); }
// CIE 1931 (the Wyman, Sloan & Shirley 2013 fit, as skymodel.py).
const SP_CMF=Array.from(SP_LAM, l=>[1.056*spG(l,599.8,37.9,31.0)+0.362*spG(l,442.0,16.0,26.7)-0.065*spG(l,501.1,20.4,26.2),
  0.821*spG(l,568.8,46.9,40.5)+0.286*spG(l,530.9,16.3,31.1), 1.217*spG(l,437.0,11.8,36.0)+0.681*spG(l,459.0,26.0,13.8)]);
function spY(S){ let y=0; for(let i=0;i<SP_N;i++) y+=S[i]*SP_CMF[i][1]; return y; }
function spNorm(S){ const y=spY(S); return y>0?S.map(v=>v/y):S; }
const spGauss=(c, s)=>Float32Array.from(SP_LAM, l=>Math.exp(-0.5*((l-c)/s)**2));
// Lines [nm, photons] as 0.6 nm Gaussians, in energy.
function spLines(list){ const S=new Float32Array(SP_N); for(const [c, r] of list){ const g=spGauss(c, 0.6); for(let i=0;i<SP_N;i++) S[i]+=r/c*g[i]/1.504; } return S; }
function spAdd(...parts){ const S=new Float32Array(SP_N); for(const [k, P] of parts) for(let i=0;i<SP_N;i++) S[i]+=k*P[i]; return S; }
function spPlanck(T){ return Float32Array.from(SP_LAM, l=>1/Math.pow(l, 5)/(Math.exp(1.4388e7/(l*T))-1)); }
const SP_FRAUN=[[393.37, 0.6, 0.8, 'Ca II K'], [396.85, 0.55, 0.8, 'Ca II H'], [410.17, 0.25, 0.5, 'Hδ'], [430.8, 0.3, 0.6, 'G band'], [434.05, 0.25, 0.5, 'Hγ'],
  [486.13, 0.3, 0.5, 'Hβ'], [517.3, 0.25, 1.0, 'Mg b'], [527.0, 0.15, 0.5, 'Fe'], [589.3, 0.35, 0.6, 'Na D'], [656.28, 0.35, 0.5, 'Hα']];
const SP_FRAUN_T=Float32Array.from(SP_LAM, l=>SP_FRAUN.reduce((t, [c, d, s])=>t*(1-d*Math.exp(-0.5*((l-c)/s)**2)), 1));
// Telluric optical depth per airmass at full strength: O2 A (R-branch head at 759.6 nm, P branch
// to 770), O2 B (686.9–694), H2O (718–735).
const SP_TAU_O2=Float32Array.from(SP_LAM, l=>(l>=759&&l<=770?2.0*(l<762?1:0.25+0.75*(770-l)/8):0)+(l>=686.5&&l<=694?0.55*(l<689?1:(694-l)/5):0));
const SP_TAU_H2O=Float32Array.from(SP_LAM, l=>0.25*Math.exp(-0.5*((l-725)/5)**2));
// O2 relative to today's 21%, and the water column relative to today's.
const SP_O2={hadean44:0, hadean40:0, archean38:0, archean27thin:0, archean27:0, archean27vthick:0, proterozoic22:0.01, snowball07:0.1, carbon30:1.57};
const SP_H2O={hadean44:4, snowball07:0.2};
// The night's sources, each to unit luminance.
const SP_SUN5772=spNorm(spPlanck(5772));
const SP_AIRGLOW=spNorm(spAdd([1, spLines([[557.7, 250], [589.0, 40], [589.6, 25], [630.0, 50], [636.4, 16]])],
  [1, Float32Array.from(SP_LAM, l=>[[632, 80], [655, 150], [700, 300], [735, 350], [775, 300]].reduce((s, [c, r])=>s+r/c*Math.exp(-0.5*((l-c)/7)**2)/(7*2.5066), 0))],
  [1, Float32Array.from(SP_LAM, l=>l<=490?5.8/l*Math.exp(-0.5*((l-420)/30)**2):0)],
  [1, Float32Array.from(SP_LAM, l=>4.03/l*Math.exp(-0.5*((l-510)/55)**2))]));
const SP_HERZ=spNorm(Float32Array.from(SP_LAM, l=>Math.exp(-0.5*((l-450)/45)**2)/l));
const SP_HPS=spNorm(spAdd([1, Float32Array.from(SP_LAM, l=>(0.9*Math.exp(-0.5*((l-583)/5)**2)/5+Math.exp(-0.5*((l-596)/6)**2)/6+1.6*Math.exp(-0.5*((l-589)/22)**2)/22)/l)],
  [0.4, spLines([[568.8, 0.06], [615.4, 0.05], [498.3, 0.02], [466.5, 0.015]])]));
const SP_LED=spNorm(Float32Array.from(SP_LAM, l=>(0.13*Math.exp(-0.5*((l-452)/10)**2)/10+Math.exp(-0.5*((l-575)/50)**2)/50)/l));
const SP_OIL=spNorm(spPlanck(1850)), SP_MW=spNorm(spPlanck(4800));
// Aurora emissions per kR, with their photopic luminance (aurora.js).
const SP_AUR=[[[557.7, 1]], [[630.0, 0.76], [636.4, 0.24]], [[391.4, 3.0], [427.8, 1.0], [470.9, 0.28], [423.6, 0.25], [380.5, 0.4], [399.8, 0.2], [405.9, 0.1]],
  [[687.5, .15], [678.9, .22], [670.5, .25], [662.4, .2], [654.5, .12], [646.9, .06], [595, .08], [606, .06]]].map(spLines).map(spNorm);
const SP_AUR_Y=[1.927e-4, 4.271e-5, 9.359e-6, 2.335e-5];
// Each lamp mix by luminance share of sodium, matching the glow's x (day.js SKYGLOW).
function spGlow(key){
  const g=SKYGLOW[key]; if(!g) return null;
  if(key==='volcanic') return SP_OIL;
  const xOf=S=>{ let X=0, Y=0, Z=0; for(let i=0;i<SP_N;i++){ X+=S[i]*SP_CMF[i][0]; Y+=S[i]*SP_CMF[i][1]; Z+=S[i]*SP_CMF[i][2]; } return X/(X+Y+Z); };
  let lo=0, hi=1;
  for(let k=0;k<30;k++){ const w=(lo+hi)/2; if(xOf(spAdd([w, SP_HPS], [1-w, SP_LED]))<g[1]) lo=w; else hi=w; }
  return spAdd([lo, SP_HPS], [1-lo, SP_LED]);
}
// The model's sky spectra, loaded the first time they are wanted.
let spData=null, spLoading=null;
function spLoad(){
  if(spData||spLoading) return spLoading;
  spLoading=fetch('spectra.bin').then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(buf=>{
    const n=new DataView(buf).getUint32(0, true), head=JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
    spData={...head, bytes:new Uint8Array(buf, 4+n), nl:head.lam.length, slots:head.vz.length*head.az.length+1};
    if(spTipRefresh) spTipRefresh();
  }).catch(()=>{ spLoading=null; });
  return spLoading;
}
// The stored epoch for key: 2100 and the supernova epochs have today's air.
function spEpoch(key){ return spData.epochs.indexOf(spData.epochs.includes(key)?key:'modern'); }
// log10 shape at (sza index si, slot), 10 nm grid.
function spRaw(e, lat, si, slot){
  const D=spData, o=((((e*D.lats.length+lat)*D.szas.length+si)*D.slots)+slot)*D.nl, out=new Float32Array(D.nl);
  for(let i=0;i<D.nl;i++) out[i]=D.lo*(1-D.bytes[o+i]/255);
  return out;
}
// The scattered-light spectrum for Sun zenith angle sza, view zenith angle vz and azimuth from
// the Sun azr, interpolated in log between the stored samples, on the 1 nm grid, unit luminance.
function spSky(key, lat, sza, vz, azr){
  const D=spData, e=spEpoch(key), li=D.lats.indexOf(lat);
  const [si, st]=bracket(D.szas, sza), [vi, vt]=bracket(D.vz, vz), [ai, at]=bracket(D.az, azr), na=D.az.length;
  const acc=new Float32Array(D.nl);
  for(const [s, ws] of [[si, 1-st], [si+1, st]]) for(const [v, wv] of [[vi, 1-vt], [vi+1, vt]]) for(const [a, wa] of [[ai, 1-at], [ai+1, at]]){
    const w=ws*wv*wa; if(!(w>0)) continue;
    const r=spRaw(e, li, s, v*na+a); for(let i=0;i<D.nl;i++) acc[i]+=w*r[i];
  }
  return spNorm(spTo1nm(acc));
}
function spSunDisk(key, lat, sza){
  const D=spData, e=spEpoch(key), li=D.lats.indexOf(lat), i=Math.max(0, D.szas.findIndex(z=>z>=Math.min(sza, 89)));
  return spTo1nm(spRaw(e, li, i, D.slots-1));
}
// 10 nm log grid to the 1 nm linear grid.
function spTo1nm(lg){
  const D=spData, out=new Float32Array(SP_N);
  for(let i=0;i<SP_N;i++){ const x=(SP_LAM[i]-D.lam[0])/(D.lam[1]-D.lam[0]), k=Math.min(D.nl-2, Math.floor(x)), f=x-k; out[i]=Math.pow(10, lg[k]*(1-f)+lg[k+1]*f); }
  return out;
}
function spAirmass(el){ return airmass(Math.max(el, 0)); }
// The light toward true altitude el, azimuth az. disk is 'sun', 'moon' or null; aurora the
// four emissions there (kR) or null; litHere, on the Moon, how sunlit that point of it is (0–1). Returns {S (1 nm, cd/m² per nm-ish units), Y (cd/m²),
// parts: [[name, Y]], marks: annotations}.
function skySpectrum(el, az, disk, aurora, litHere=1){
  const key=EP[dIdx].key, lat=dLat, cdu=cdPerUnit(), vz=Math.min(90-el, 88), parts=[], marks=[];
  const S=new Float32Array(SP_N), sunlit=new Float32Array(SP_N);
  const add=(name, Y, shape, sun)=>{ if(!(Y>0)) return; parts.push([name, Y]); const T=sun?sunlit:S; for(let i=0;i<SP_N;i++) T[i]+=Y*shape[i]; };
  const sunSrc=skySource(skyNow.sza, skyNow.sunAz), azr=a=>{ let d=Math.abs(az-a)%360; return d>180?360-d:d; };
  if(disk==='sun') add('Sun’s disk', 1, spNorm(spSunDisk(key, lat, skyNow.sza)), true);
  else{
    if(disk==='moon'){
      // The Moon's surface: its brightness per lit area (the full Moon's 2,500 cd/m², by the
      // phase law and the Moon's size then), dimmed by the air. Its night side has only
      // earthshine, sunlight off the Earth's day side (bluer), about 2e-4 of its day side when
      // the Earth looks full from the Moon. The air in front adds its own light below.
      const mo=skyNow.moon, frac=Math.max(moonLit(mo, skyNow.sunAz, 90-skyNow.sza), 0.02);
      const day=2500*(skyNow.moonRel||0)/frac/Math.pow(mo.radDeg/0.259, 2)*extinction(el, extK(key));
      const red=spSunDisk(key, lat, 90-mo.el).map((v, i)=>v*(0.8+0.0014*(SP_LAM[i]-450)));
      add('the Moon, sunlit', day*litHere, spNorm(red), true);
      add('the Moon, earthshine', day*2e-4*(1-frac)*(1-litHere), spNorm(red.map((v, i)=>v*550/SP_LAM[i])), true);
    }
    if(sunSrc.fade>0){ const X=domeXYZ(key, lat, sunSrc.si, sunSrc.st, vz, azr(skyNow.sunAz)); add('sunlit air', X[1]*sunSrc.fade*skyNow.sunVis*skyNow.sunFlux*cdu, spSky(key, lat, skyNow.sza, vz, azr(skyNow.sunAz)), true); }
    const mo=skyNow.moon, mSrc=skySource(90-mo.el, mo.az);
    if(mSrc.fade>0&&skyNow.mScale>0){ const X=domeXYZ(key, lat, mSrc.si, mSrc.st, vz, azr(mo.az)); add('moonlit air', X[1]*mSrc.fade*skyNow.mScale*cdu, spNorm(spSky(key, lat, 90-mo.el, vz, azr(mo.az)).map((v, i)=>v*(0.8+0.0014*(SP_LAM[i]-450)))), true); }
    // The natural night sky and city light, as nightRows draws them.
    const q=6371/6471, sz=Math.sin(vz*Math.PI/180), f=absZenith(key)*(0.4+0.6*extinction(el, extK(key)))/Math.sqrt(1-q*q*sz*sz);
    const fo=AIRGLOW_O[key]??1, fc=AIRGLOW_CO2[key]||0;
    add('zodiacal light and stars', (1-AIRGLOW_SHARE)*NIGHT_NATURAL*f, SP_SUN5772, true);
    add('airglow', AIRGLOW_SHARE*fo*NIGHT_NATURAL*f, SP_AIRGLOW);
    add('violet O₂ airglow', AIRGLOW_SHARE*fc*NIGHT_NATURAL*f, SP_HERZ);
    const glow=SKYGLOW[key];
    if(glow) add(key==='volcanic'?'oil lamps':'city light', glow[0]*(1+2.2*Math.exp(-el/12)), spGlow(key));
    if(mwMap&&skyNow.gal){ const L=mwAt(skyNow.gal, horizDir(az, el))*extinction(el, extK(key))*extZenith(key); add('Milky Way', L, SP_MW); }
    if(aurora) aurora.forEach((I, k)=>add(['aurora, oxygen green', 'aurora, oxygen red', 'aurora, nitrogen violet', 'aurora, nitrogen red'][k], I*SP_AUR_Y[k], SP_AUR[k]));
  }
  // Air along the way.
  const X=Math.min(spAirmass(el)+(disk==='sun'?0:(sunSrc.fade>0?spAirmass(90-skyNow.sza)*0.5:0)), 40), o2=(SP_O2[key]??1)*X, h2o=(SP_H2O[key]??1)*X;
  for(let i=0;i<SP_N;i++){ const T=Math.exp(-SP_TAU_O2[i]*o2-SP_TAU_H2O[i]*h2o); S[i]=(S[i]+sunlit[i]*SP_FRAUN_T[i])*T; }
  const Y=parts.reduce((s, p)=>s+p[1], 0);
  // What to label: the strongest sources' own features.
  const share=n=>parts.filter(p=>p[0].startsWith(n)).reduce((s, p)=>s+p[1], 0)/Math.max(Y, 1e-30);
  const sun=share('sunlit')+share('moonlit')+share('Sun')+share('the Moon')+share('zodiacal');
  const ozone=!(key in SP_O2)||SP_O2[key]>=0.01;
  if(share('sunlit')+share('moonlit')>0.3){
    if(ozone&&key!=='proterozoic22') marks.push({a:500, b:680, t:'O₃ Chappuis', band:true});
    if(key.startsWith('archean27')) marks.push({a:380, b:480, t:'organic haze', band:true});
    if(key==='kpg66') marks.push({a:380, b:780, t:'soot dims all colours', band:true, quiet:true});
  }
  if(sun>0.3){ marks.push({l:393.4, t:'Ca II H&K'}, {l:486.1, t:'Hβ'}, {l:517.3, t:'Mg b'}, {l:656.3, t:'Hα'}); if(share('Sun')+share('sunlit')<0.5) marks.push({l:589.3, t:'Na D'}); }
  if(o2>0.05) marks.push({l:760.5, t:'O₂ A'}, {l:687.5, t:'O₂ B'});
  if(SP_TAU_H2O[345]*h2o>0.15) marks.push({l:725, t:'H₂O'});
  if(share('airglow')>0.1){ marks.push({l:557.7, t:'[O I] 557.7', em:true}, {l:589.3, t:'Na D', em:true}, {l:630, t:'[O I] 630', em:true}, {l:735, t:'OH', em:true}); }
  if(share('violet')>0.1) marks.push({l:450, t:'O₂ Herzberg II', em:true});
  if(share('city')>0.15){ if(key==='y2100') marks.push({l:452, t:'LED', em:true}); else marks.push({l:589.3, t:'Na (sodium lamps)', em:true}, {l:452, t:'LED', em:true}); }
  if(share('oil')>0.15) marks.push({l:700, t:'flames, 1850 K', em:true});
  if(share('aurora, oxygen green')>0.05) marks.push({l:557.7, t:'[O I] 557.7', em:true});
  if(share('aurora, oxygen red')>0.03) marks.push({l:630, t:'[O I] 630', em:true});
  if(share('aurora, nitrogen violet')>0.02) marks.push({l:391.4, t:'N₂⁺ 391', em:true}, {l:427.8, t:'N₂⁺ 428', em:true});
  if(share('aurora, nitrogen red')>0.05) marks.push({l:670, t:'N₂ 1P', em:true});
  return {S, Y, parts, marks};
}
// The plot: the spectrum filled with the colour of each wavelength, linear, normalized to the
// continuum so a bright line runs off the top (marked with a caret) rather than flattening the rest.
// Past 690 nm the fit's tails turn the hue back toward green, so the deep red holds from there.
const SP_RGB=SP_CMF.map((c, i)=>SP_CMF[Math.min(i, 310)]).map(([x, y, z])=>{ const r=3.2406*x-1.5372*y-0.4986*z, gr=-0.9689*x+1.8758*y+0.0415*z, b=0.0557*x-0.2040*y+1.0570*z, m=Math.max(r, gr, b, 1e-6);
  return [r, gr, b].map(v=>Math.round(255*g(Math.max(0, v/m)*0.75+0.08))); });
function drawSpectrum(cv, sp){
  const dpr=Math.min(window.devicePixelRatio||1, 2), W=264, H=118;
  if(cv.width!==W*dpr){ cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px'; }
  const c=cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const L=6, R=W-6, T=30, B=H-16, X=l=>L+(l-SP_L0)/(SP_N-1)*(R-L);
  const S=sp.S, sorted=Array.from(S).sort((a, b)=>a-b), cont=sorted[Math.floor(SP_N*0.9)]||1, top=Math.max(Math.max(...S)>3*cont?2.2*cont:Math.max(...S), 1e-30);
  const Yv=v=>B-(B-T)*Math.min(v/top, 1);
  for(let i=0;i<SP_N-1;i++){ const x0=X(SP_LAM[i]), x1=X(SP_LAM[i+1]); c.fillStyle=`rgb(${SP_RGB[i].join(',')})`; c.globalAlpha=0.55;
    const y=Yv(Math.min(S[i], S[i+1])); c.fillRect(x0, y, x1-x0+0.5, B-y); }
  c.globalAlpha=1; c.strokeStyle='#fff'; c.lineWidth=1.1; c.beginPath();
  for(let i=0;i<SP_N;i++){ const x=X(SP_LAM[i]), y=Yv(S[i]); if(i) c.lineTo(x, y); else c.moveTo(x, y); }
  c.stroke();
  for(let i=1;i<SP_N-1;i++) if(S[i]>top&&S[i]>=S[i-1]&&S[i]>=S[i+1]){ const x=X(SP_LAM[i]); c.fillStyle='#fff'; c.beginPath(); c.moveTo(x-3, T-1); c.lineTo(x+3, T-1); c.lineTo(x, T-5); c.fill(); }
  c.strokeStyle='rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(L, B+0.5); c.lineTo(R, B+0.5); c.stroke();
  c.fillStyle='rgba(255,255,255,.7)'; c.font='9px system-ui, sans-serif'; c.textAlign='center';
  for(const l of [400, 500, 600, 700]){ c.fillRect(X(l), B, 1, 3); c.fillText(String(l), X(l), B+12); }
  c.textAlign='right'; c.fillText('nm', R, B+12);
  // Annotations: bands as a bracket along the top; lines as a tick and a label, staggered over two
  // rows and dropped when they would collide.
  const rows=[[], []], fits=(row, a, b)=>rows[row].every(([p, q])=>b<p-2||a>q+2);
  c.font='9px system-ui, sans-serif';
  for(const m of sp.marks.filter(m=>m.band)){
    const a=X(m.a), b=X(m.b); c.strokeStyle='rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(a, 26); c.lineTo(a, 23); c.lineTo(b, 23); c.lineTo(b, 26); c.stroke();
    const w=c.measureText(m.t).width, mid=(a+b)/2; c.fillStyle='rgba(255,255,255,.85)'; c.textAlign='center'; c.fillText(m.t, mid, 20); rows[1].push([mid-w/2, mid+w/2]);
  }
  const seen=new Set();
  for(const m of sp.marks.filter(m=>!m.band)){
    if(seen.has(m.t)) continue; seen.add(m.t);
    const x=X(m.l), w=c.measureText(m.t).width, a=Math.max(L, Math.min(R-w, x-w/2)), b=a+w, row=fits(0, a, b)?0:(fits(1, a, b)?1:-1);
    if(row<0) continue;
    rows[row].push([a, b]);
    const ty=row?20:9;
    c.fillStyle=m.em?'#ffe08a':'#9fd0ff'; c.textAlign='left'; c.fillText(m.t, a, ty);
    c.strokeStyle=m.em?'rgba(255,224,138,.55)':'rgba(159,208,255,.55)'; c.beginPath(); c.moveTo(x+0.5, ty+2); c.lineTo(x+0.5, Math.max(Yv(S[Math.round(m.l-SP_L0)]||0)-2, ty+3)); c.stroke();
  }
}
// The tooltip body for a direction: the swatch line is the caller's; this adds the plot and the
// sources. el is true altitude in degrees.
let spTipRefresh=null;
function spectrumHTML(box, el, az, opts={}){
  let cv=box.querySelector('canvas.spc'), src=box.querySelector('.spsrc');
  if(!cv){ cv=document.createElement('canvas'); cv.className='spc'; src=document.createElement('div'); src.className='spsrc'; box.append(cv, src); }
  if(opts.note){ cv.style.display='none'; src.textContent=opts.note; return; }
  if(!spData){ spLoad(); cv.style.display='none'; src.textContent='Loading the spectrum…'; return; }
  const sp=skySpectrum(el, az, opts.disk||null, opts.aurora||null, opts.lit??1);
  cv.style.display='block'; drawSpectrum(cv, sp);
  const fmt=Y=>Y>=1?Y.toPrecision(3)+' cd/m²':(Y>=1e-3?(Y*1e3).toPrecision(3)+' mcd/m²':skyMagArcsec(Y).toFixed(1)+' mag/arcsec²');
  const top=sp.parts.slice().sort((a, b)=>b[1]-a[1]).filter(p=>p[1]>sp.Y*0.02).slice(0, 4).map(p=>`${p[0]} ${Math.round(100*p[1]/sp.Y)}%`);
  src.textContent=opts.disk==='sun'?'The Sun’s disk: sunlight through the air'
    :fmt(sp.Y)+' · '+top.join(' · ')+(opts.cloud?' · behind the cloud':'');
}
// The dome's tooltip: the direction under canvas pixel (x, y), and whether it is on the Sun or Moon.
function domeSpectrum(x, y, box){
  if(!skyNow) return;
  const W=dome.width, R=W*0.46, dx=x-W/2, dy=y-dome.height/2, r=Math.hypot(dx, dy);
  let az=Math.atan2(dx, -dy)*180/Math.PI; if(az<0) az+=360;
  const el=90-90*r/R, at=(bAz, bEl)=>{ const rr=R*(90-bEl)/90, a=bAz*Math.PI/180; return Math.hypot(x-(W/2+rr*Math.sin(a)), y-(dome.height/2-rr*Math.cos(a))); };
  const mo=skyNow.moon, sunR=DOME_DISK*mo.sunRadDeg/SUN_RADIUS_DEG;
  const lit=mo.on&&mo.el>-mo.radDeg?moonLitAt(horizDir(az, el), DOME_DISK*mo.radDeg/SUN_RADIUS_DEG*90/R):null;
  const disk=lit!=null?'moon':(skyNow.sunOn&&skyNow.sunVis>0.01&&at(skyNow.sunAz, 90-skyNow.sza)<sunR?'sun':null);
  const st=skyNow.aur, aurora=disk!=='sun'&&st&&st.on&&domeAur.gl?auroraProbe(domeAur.gl, domeAur.store, st, horizDir(az, el)):null;
  spectrumHTML(box, el, az, {disk, aurora, lit});
}
// How sunlit the Moon is at direction dir, with the disk drawn radDeg degrees in radius, or
// null off the disk: the surface normal there against the Sun, as the sky shader does.
function moonLitAt(dir, radDeg){
  const mo=skyNow.moon, b=moonBasis(mo), c=vdot(dir, b.md), s=Math.sin(radDeg*Math.PI/180);
  if(c<0) return null;
  const v=vadd(dir, vscale(b.md, -c), [0, 0, 0]), x=vdot(v, b.east)/s, y=vdot(v, b.north)/s, r2=x*x+y*y;
  if(r2>1) return null;
  const n=vnorm(vadd(vscale(b.east, x), vscale(b.north, y), vscale(b.md, -Math.sqrt(1-r2))));
  return smooth01(-0.02, 0.05, vdot(n, horizDir(skyNow.sunAz, 90-skyNow.sza)));
}
// The globe: the limb at tangent height h (km) or, with h null, the disk, at latitude lat; the
// latitude is the Sun's zenith angle there (limb_grid.py). The model's spectra, with the Sun's
// lines and the air's O2 and water bands along a path of airmass X.
function globeSpectrum(key, lat, h){
  const G=spData.limb, D=spData, e=G.epochs.indexOf(G.epochs.includes(key)?key:'modern'), na=G.alts.length+1;
  const off=D.epochs.length*D.lats.length*D.szas.length*D.slots*D.nl;
  const raw=(i, j)=>{ const o=off+((e*G.lats.length+i)*na+j)*D.nl, out=new Float32Array(D.nl); for(let k=0;k<D.nl;k++) out[k]=D.lo*(1-D.bytes[o+k]/255); return out; };
  const [li, lt]=bracket(G.lats, lat), acc=new Float32Array(D.nl);
  const cells=h==null?[[na-1, 1]]:(([j, u])=>[[j, 1-u], [j+1, u]])(bracket(G.alts, h));
  for(const [i, wi] of [[li, 1-lt], [li+1, lt]]) for(const [j, wj] of cells){ const r=raw(i, j); for(let k=0;k<D.nl;k++) acc[k]+=wi*wj*r[k]; }
  const S=spTo1nm(acc), mu=Math.max(Math.cos(lat*Math.PI/180), 0.05);
  // A tangent path holds about 38 vertical columns of the air above its lowest point (8 km
  // scale height), counted down the Sun's side and up again; the disk, down and back up. Water
  // stays low (2 km scale height).
  const X=Math.min(h==null?2/mu:76*Math.exp(-h/8), 60), o2=(SP_O2[key]??1)*X, h2o=(SP_H2O[key]??1)*X*(h==null?1:Math.exp(-h/2));
  for(let i=0;i<SP_N;i++) S[i]*=SP_FRAUN_T[i]*Math.exp(-SP_TAU_O2[i]*o2-SP_TAU_H2O[i]*h2o);
  const marks=[{l:393.4, t:'Ca II H&K'}, {l:486.1, t:'Hβ'}, {l:517.3, t:'Mg b'}, {l:656.3, t:'Hα'}];
  if((!(key in SP_O2)||SP_O2[key]>=0.01)&&key!=='proterozoic22') marks.unshift({a:500, b:680, t:'O₃ Chappuis', band:true});
  if(key.startsWith('archean27')) marks.unshift({a:380, b:480, t:'organic haze', band:true});
  if(o2>0.05) marks.push({l:760.5, t:'O₂ A'}, {l:687.5, t:'O₂ B'});
  if(SP_TAU_H2O[345]*h2o>0.15) marks.push({l:725, t:'H₂O'});
  return {S, Y:1, parts:[], marks};
}
// The globe's tooltip under canvas pixel (x, y), as renderGlobe lays it out.
function globeSpectrumTip(x, y, box){
  let cv=box.querySelector('canvas.spc'), src=box.querySelector('.spsrc');
  if(!cv){ cv=document.createElement('canvas'); cv.className='spc'; src=document.createElement('div'); src.className='spsrc'; box.append(cv, src); }
  if(!spData){ spLoad(); cv.style.display='none'; src.textContent='Loading the spectrum…'; return; }
  const ep=EP[Math.round(tPos)], W=globe.width, R=W*0.30, EX=0.5, hmax=ep.limb.alts[ep.limb.alts.length-1];
  const dx=x-W/2, dy=y-globe.height/2, r=Math.hypot(dx, dy), disk=r<R;
  const lat=Math.min(82.5, Math.abs(Math.asin(Math.max(-1, Math.min(1, dy/(disk?R:r)))))*180/Math.PI), h=disk?null:(r/R-1)/EX*hmax;
  cv.style.display='block'; drawSpectrum(cv, globeSpectrum(ep.key, lat, h));
  src.textContent=disk?`The disk at ${Math.round(lat)}° latitude: sunlight off the ground and back out through the air`
    :`The limb ${Math.round(h)} km up at ${Math.round(lat)}° latitude: sunlight scattered along the line of sight`;
}
