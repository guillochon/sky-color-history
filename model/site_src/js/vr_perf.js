// The VR view's frame profiler, on with ?perf in the address bar and off otherwise: every hook
// below is a no-op without it. Each pass's GPU time comes from timer queries, read back frames
// later so the measurement does not stall the GPU; where the browser has no timer queries
// (Safari, Firefox), or with ?perf=sync, each pass is bracketed by gl.finish(), which inflates
// the times but keeps their proportions; try it where every pass's timer query reads alike, as
// a driver that times whole command buffers gives. CPU time is performance.now() around each part. The overlay keeps the last
// 240 painted frames; p copies them as JSON, and vrPerf() in the console returns the same.
const PERF=/[?&]perf(=|&|$)/.test(location.search)?{
  ext:null, sync:false, forceSync:/[?&]perf=sync(&|$)/.test(location.search), gl:null,
  cpu:{}, open:{}, gpuOpen:null,   // this frame's CPU sums, open CPU sections, the open GPU query
  paint:null, pending:[], pool:[],  // this paint's queries, paints awaiting results, spare queries
  frames:[], gpu:[], idle:0, last:0, el:null, shown:0, paints:0
}:null;
const PERF_N=240;
const PERF_GPU=['terrain', 'town', 'aurora', 'sky', 'clouds', 'cloud blend', 'composite'];
const PERF_CPU=['sky model', 'setup', 'terrain', 'town', 'aurora', 'sky', 'clouds', 'cloud mask', 'cloud blend', 'composite', 'labels & HUD', 'tooltips'];
// A CPU section; begun and ended by name. Sections of one name add up within a frame.
function perfBeg(k){ if(PERF) PERF.open[k]=performance.now(); }
function perfEnd(k){ if(!PERF||PERF.open[k]==null) return; PERF.cpu[k]=(PERF.cpu[k]||0)+performance.now()-PERF.open[k]; PERF.open[k]=null; }
// A GPU pass: its CPU dispatch time under the same name, and a timer query around its draws.
// Passes don't nest, as only one timer query can be open at a time.
function perfPass(k){
  if(!PERF||!PERF.gl) return;
  const gl=PERF.gl;
  if(PERF.sync){ gl.finish(); perfBeg(k); PERF.gpuAt=performance.now(); return; }
  perfBeg(k);
  if(!PERF.ext||!PERF.paint) return;
  const q=PERF.pool.pop()||gl.createQuery();
  gl.beginQuery(PERF.ext.TIME_ELAPSED_EXT, q);
  PERF.gpuOpen={k, q};
}
function perfPassEnd(k){
  if(!PERF||!PERF.gl) return;
  const gl=PERF.gl;
  if(PERF.sync){ perfEnd(k); gl.finish(); PERF.paint&&PERF.paint.push({k, ms:performance.now()-PERF.gpuAt}); return; }
  if(PERF.gpuOpen&&PERF.gpuOpen.k===k){ gl.endQuery(PERF.ext.TIME_ELAPSED_EXT); PERF.paint.push(PERF.gpuOpen); PERF.gpuOpen=null; }
  perfEnd(k);
}
function perfPaintBeg(gl){
  if(!PERF) return;
  if(PERF.gl!==gl){
    PERF.gl=gl; PERF.ext=PERF.forceSync?null:gl.getExtension('EXT_disjoint_timer_query_webgl2'); PERF.sync=!PERF.ext;
    PERF.pending=[]; PERF.pool=[]; perfOverlay(); requestAnimationFrame(perfTick);
  }
  PERF.paint=[]; PERF.paints++;
}
function perfPaintEnd(){
  if(!PERF||!PERF.paint) return;
  if(PERF.sync){ perfGPUSample(PERF.paint.map(x=>[x.k, x.ms])); }
  else if(PERF.paint.length) PERF.pending.push(PERF.paint);
  PERF.paint=null;
}
function perfGPUSample(list){
  const s={total:0}; for(const [k, ms] of list){ s[k]=(s[k]||0)+ms; s.total+=ms; }
  PERF.gpu.push(s); if(PERF.gpu.length>PERF_N) PERF.gpu.shift();
}
// Paints whose queries are all in: a disjoint event (the GPU clock jumped) throws the batch away.
function perfCollect(){
  const gl=PERF.gl, ext=PERF.ext;
  if(!ext) return;
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){ for(const p of PERF.pending) for(const x of p) PERF.pool.push(x.q); PERF.pending=[]; return; }
  while(PERF.pending.length){
    const p=PERF.pending[0];
    if(!gl.getQueryParameter(p[p.length-1].q, gl.QUERY_RESULT_AVAILABLE)) break;
    PERF.pending.shift();
    perfGPUSample(p.map(x=>{ const ns=gl.getQueryParameter(x.q, gl.QUERY_RESULT); PERF.pool.push(x.q); return [x.k, ns/1e6]; }));
  }
}
// Once per animation frame: close this frame's CPU sums, read back the GPU, redraw the overlay
// four times a second. A frame with no VR work is idle and stays out of the averages.
function perfTick(now){
  if(!PERF) return;
  requestAnimationFrame(perfTick);
  const dt=PERF.last?now-PERF.last:0; PERF.last=now;
  if(!vrOn){ if(PERF.el) PERF.el.hidden=true; PERF.cpu={}; return; }
  PERF.el.hidden=false;
  const cpu=PERF.cpu; PERF.cpu={};
  if(Object.keys(cpu).length){
    let t=0; for(const k in cpu) t+=cpu[k];
    PERF.frames.push({dt, cpu, total:t, paints:PERF.paints}); if(PERF.frames.length>PERF_N) PERF.frames.shift();
  }else PERF.idle++;
  PERF.paints=0;
  perfCollect(); perfCheckTimer();
  if(now-PERF.shown>250){ PERF.shown=now; perfDraw(); }
}
// ANGLE on Metal (Chrome on a Mac) answers every timer query with about the whole command
// buffer's time, so the passes add up to several frames. Seen over 30 paints, switch to
// gl.finish() brackets and say why.
function perfCheckTimer(){
  if(!PERF.ext||PERF.gpu.length<30||PERF.frames.length<30) return;
  const g=perfStat(PERF.gpu.map(x=>x.total)).avg, f=perfStat(PERF.frames.map(x=>x.dt).filter(d=>d>0));
  if(!f||g<=1.5*f.avg) return;
  for(const p of PERF.pending) for(const x of p) PERF.pool.push(x.q);
  PERF.pending=[]; PERF.gpu=[]; PERF.ext=null; PERF.sync=true;
  PERF.switched='timer queries summed to '+(g/f.avg).toFixed(1)+'× the frame time';
}
function perfStat(xs){
  if(!xs.length) return null;
  const s=xs.slice().sort((a, b)=>a-b), avg=xs.reduce((a, b)=>a+b, 0)/xs.length;
  return {avg, p95:s[Math.min(s.length-1, Math.floor(s.length*0.95))], max:s[s.length-1]};
}
// The numbers behind the overlay: per frame for the CPU (frames where a part didn't run count as
// zero), per paint for the GPU (likewise).
function perfReport(){
  if(!PERF) return null;
  const F=PERF.frames, G=PERF.gpu, c=PERF.gl&&PERF.gl.canvas;
  const cpu={}, gpu={};
  for(const k of PERF_CPU){ const st=perfStat(F.map(f=>f.cpu[k]||0)); if(st&&st.max>0) cpu[k]=st; }
  for(const k of PERF_GPU){ const st=perfStat(G.map(g=>g[k]||0)); if(st&&st.max>0) gpu[k]=st; }
  const dts=F.map(f=>f.dt).filter(d=>d>0);
  return {
    gpuTimer:PERF.ext?'EXT_disjoint_timer_query_webgl2':'gl.finish() brackets (approximate)'+(PERF.switched?', switched: '+PERF.switched:''),
    canvas:c?[c.width, c.height]:null, dpr:window.devicePixelRatio||1,
    epoch:EP[dIdx].key, lat:dLat, fov:vrFov, scenery:vrScenery, clouds:vrClouds, labels:vrLabels, playing:dayPlaying,
    frames:F.length, idleFrames:PERF.idle, frameMs:perfStat(dts), cpuTotal:perfStat(F.map(f=>f.total)), gpuTotal:perfStat(G.map(g=>g.total)),
    cpu, gpu
  };
}
window.vrPerf=perfReport;
function perfOverlay(){
  const el=PERF.el=document.createElement('pre');
  el.id='vrperf';
  el.style.cssText='position:absolute;left:12px;top:64px;z-index:5;margin:0;padding:8px 10px;background:rgba(0,0,0,.72);color:#dfe;font:11px/1.35 ui-monospace,Menlo,monospace;border-radius:6px;pointer-events:none;white-space:pre;max-height:calc(100% - 140px);overflow:hidden';
  document.getElementById('vr').appendChild(el);
  window.addEventListener('keydown', e=>{
    if(!vrOn||e.key.toLowerCase()!=='p'||e.repeat||e.metaKey||e.ctrlKey) return;
    const json=JSON.stringify(perfReport(), (k, v)=>typeof v==='number'?Math.round(v*1000)/1000:v, 2);
    console.log(json);
    if(navigator.clipboard) navigator.clipboard.writeText(json).then(()=>perfFlash('copied'), ()=>perfFlash('logged to console'));
    else perfFlash('logged to console');
  });
}
function perfFlash(s){ PERF.flash=s; PERF.flashAt=performance.now(); perfDraw(); }
function perfDraw(){
  const r=perfReport(), f=v=>v==null?'      –':v.toFixed(2).padStart(8), row=(k, st, tot)=>k.padEnd(13)+f(st.avg)+f(st.p95)+(tot?String(Math.round(100*st.avg/tot)).padStart(6)+'%':'');
  const L=[];
  const fm=r.frameMs;
  L.push('VR perf · '+(fm?(1000/fm.avg).toFixed(0)+' fps · frame '+fm.avg.toFixed(1)+' ms (p95 '+fm.p95.toFixed(1)+')':'waiting for frames'));
  L.push('canvas '+(r.canvas?r.canvas.join('×'):'?')+' @'+r.dpr+'x · '+r.frames+' painted / '+r.idleFrames+' idle frames');
  L.push('GPU: '+(PERF.ext?'timer queries':'gl.finish() brackets, approximate'));
  if(PERF.switched) L.push('  (switched: '+PERF.switched+')');
  L.push('');
  L.push('GPU per paint     avg     p95  share');
  const gt=r.gpuTotal?r.gpuTotal.avg:0;
  for(const k in r.gpu) L.push(row(k, r.gpu[k], gt));
  if(r.gpuTotal) L.push(row('total', r.gpuTotal));
  L.push('');
  L.push('CPU per frame     avg     p95  share');
  const ct=r.cpuTotal?r.cpuTotal.avg:0;
  for(const k in r.cpu) L.push(row(k, r.cpu[k], ct));
  if(r.cpuTotal) L.push(row('total', r.cpuTotal));
  L.push('');
  L.push('p copies JSON'+(PERF.flash&&performance.now()-PERF.flashAt<2000?' · '+PERF.flash:''));
  PERF.el.textContent=L.join('\n');
}
