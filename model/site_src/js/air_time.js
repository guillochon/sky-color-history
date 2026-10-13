/* ---------- the air through time ---------- */
// The sky's precomputed parts (the day-cycle colours, the setting Sun's bands, the crepuscular
// rays' tables, the light in the Earth's shadow, the tooltip's spectra) are made for a set of
// airs along the timeline (airgrid.py, airtime.py): every epoch's own, more wherever the air
// changes between them, and each event at steps of its strength. The page blends the two either
// side of the time shown, by the year between background airs and by the event's level
// (eventLevel) while one is on: luminance in log, chromaticity and the rest linearly. Each air's
// parts are in its own file (air/<id>.bin), fetched when it is first wanted; while one loads the
// sky keeps the air it has. The polluted city is an alternative to today's air, its own.
// An epoch shown away from its own time (auto-select off) keeps its own air.
const AIR=__AIR__;
const airNodes=new Map(), airLoads={}, airSpec=new Map(), airSpecLoads={};
const AIR_LMIN=1e-3, AIR_WSTEP=64;
function loadAirNode(id){
  if(!airLoads[id]) airLoads[id]=fetch(`air/${id}.bin`).then(r=>{ if(!r.ok) throw new Error(`air/${id}.bin: ${r.status}`); return r.arrayBuffer(); })
    .then(buf=>{
      const n=new DataView(buf).getUint32(0, true), head=JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
      airNodes.set(id, {...head, day:decodeDay(buf.slice(4+n))});
    })
    .catch(err=>{ airLoads[id]=null; console.error(err); });
  return airLoads[id];
}
// An air's sky spectra (spectrum.js), or null while they load.
function airSpectra(id){
  if(airSpec.has(id)) return airSpec.get(id);
  if(!airSpecLoads[id]) airSpecLoads[id]=fetch(`air/${id}.sp.bin`).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status))
    .then(buf=>{ airSpec.set(id, new Uint8Array(buf)); refreshDomeTip(); refreshVRTip(); refreshBarTip(); })
    .catch(()=>{ airSpecLoads[id]=null; });
  return null;
}
// [x, id] pairs in order of x: the two either side of x and how far on, in steps of 1/AIR_WSTEP.
function airBracket(P, x){
  let i=0;
  while(i<P.length-2 && P[i+1][0]<=x) i++;
  const w=P.length<2?0:Math.round(Math.max(0, Math.min(1, (x-P[i][0])/(P[i+1][0]-P[i][0])))*AIR_WSTEP)/AIR_WSTEP;
  return w===0?{a:P[i][1], b:P[i][1], w:0}:w===1?{a:P[i+1][1], b:P[i+1][1], w:0}:{a:P[i][1], b:P[i+1][1], w};
}
// The airs for the time shown: {a, b, w}, or null for the epoch's own.
function airTarget(){
  const key=EP[dIdx].key;
  if(AIR.sc[key]) return {a:AIR.sc[key], b:AIR.sc[key], w:0};
  const A=eventTime();
  if(epochIndexAt(A)!==dIdx) return null;
  for(const ev of EPOCH_EVENTS){
    const l=eventLevel(ev, A);
    if(!(l>AIR_LMIN)) continue;
    const mid=ev.start+ev.rise+ev.hold/2;
    const set=AIR.ev.filter(e=>e.key===ev.key).reduce((b, e)=>!b||Math.abs(e.at-mid)<Math.abs(b.at-mid)?e:b, null);
    if(set) return airBracket(set.lv, l);
  }
  return airBracket(AIR.bg, A);
}
// The blended air in use: {key, idx, a, b, w, sp, shadow, shaft, sun, air}, its day cycle in
// DAY.epochs[key]. Its key ('~a|b|w') stands for the epoch's wherever the sky is looked up.
let AIR_CUR=null;
function airFor(key){ return AIR_CUR && AIR_CUR.idx===dIdx && key===EP[dIdx].key?AIR_CUR.key:key; }
function airNow(){ return AIR_CUR && AIR_CUR.idx===dIdx?AIR_CUR:EP[dIdx]; }
function airDrop(){
  if(!AIR_CUR) return;
  const k=AIR_CUR.key;
  delete DAY.epochs[k];
  for(const id in dense) if(id.startsWith(k+'|')) delete dense[id];
  lunarLuts.delete(k);
  AIR_CUR=null;
}
// Brings the air up to the time shown; called before each sky is made.
function airSync(){
  const t=airTarget();
  if(!t){ airDrop(); return; }
  const key=`~${t.a}|${t.b}|${t.w}`;
  if(AIR_CUR && AIR_CUR.key===key && AIR_CUR.idx===dIdx) return;
  const A=airNodes.get(t.a), B=airNodes.get(t.b);
  if(!A || !B){
    Promise.all([loadAirNode(t.a), loadAirNode(t.b)]).then(()=>{ if(airNodes.has(t.a) && airNodes.has(t.b)) requestRender(); });
    if(AIR_CUR && AIR_CUR.idx!==dIdx) airDrop();
    return;
  }
  airDrop();
  const w=t.w, cur={key, idx:dIdx, a:t.a, b:t.b, w, sp:w<0.5?t.a:t.b};
  if(w===0) Object.assign(cur, {day:A.day, shadow:A.shadow, shaft:A.shaft, sun:A.sun, air:A.air});
  else Object.assign(cur, {day:airBlendDay(A.day, B.day, w), shadow:airBlendShadow(A.shadow, B.shadow, w), shaft:airBlendShaft(A.shaft, B.shaft, w),
    sun:{k:lerp(A.sun.k, B.sun.k, w), w:A.sun.w.map((v, i)=>lerp(v, B.sun.w[i], w)), t:A.sun.t.map((v, i)=>lerp(v, B.sun.t[i], w))},
    air:Object.fromEntries(Object.keys(A.air).map(k=>[k, lerp(A.air[k], B.air[k], w)]))});
  DAY.epochs[key]=cur.day;
  AIR_CUR=cur;
}
function lerp(a, b, w){ return a*(1-w)+b*w; }
function lerpLog(a, b, w){ return a>0 && b>0?Math.exp(Math.log(a)*(1-w)+Math.log(b)*w):lerp(a, b, w); }
function airBlendXYY(p, q, w){ return [lerp(p[0], q[0], w), lerp(p[1], q[1], w), lerpLog(p[2], q[2], w)]; }
function airBlendDay(A, B, w){
  const out={};
  for(const lat in A) out[lat]={
    dome:A[lat].dome.map((g, s)=>g.map((row, v)=>row.map((c, a)=>airBlendXYY(c, B[lat].dome[s][v][a], w)))),
    sun:A[lat].sun.map((c, s)=>airBlendXYY(c, B[lat].sun[s], w)),
  };
  return out;
}
function airBlendShadow(A, B, w){
  return {D:lerp(A.D, B.D, w), rhoMax:lerp(A.rhoMax, B.rhoMax, w), Y:A.Y.map((v, i)=>lerpLog(v, B.Y[i], w)),
    rgb:A.rgb.map((c, i)=>c.map((v, q)=>lerp(v, B.rgb[i][q], w))), sp:A.sp.map((r, i)=>r.map((v, j)=>lerp(v, B.sp[i][j], w)))};
}
// The rays' parts are matched by their profile (kind, p, q); one the other air lacks has no depth there.
function airBlendShaft(A, B, w){
  const id=c=>c.slice(0, 3).join(','), none=c=>[c[0], c[1], c[2], c[3], 0, 0, 0, 0, 0, 0], keys=[];
  for(const c of [...A.comps, ...B.comps]) if(!keys.includes(id(c))) keys.push(id(c));
  const comps=keys.map(k=>{
    const a=A.comps.find(c=>id(c)===k), b=B.comps.find(c=>id(c)===k), p=a||none(b), q=b||none(a);
    return p.map((v, i)=>i<3?v:i===3?(a&&b?lerp(p[3], q[3], w):(a||b)[3]):lerp(v, q[i], w));
  });
  const sa=atob(A.share), sb=atob(B.share);
  let s='';
  for(let i=0;i<sa.length;i++) s+=String.fromCharCode(Math.round(lerp(sa.charCodeAt(i), sb.charCodeAt(i), w)));
  return {comps, share:btoa(s)};
}
