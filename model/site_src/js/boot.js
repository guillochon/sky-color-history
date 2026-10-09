// Today and now, unless a link sets the epoch, place, date, or time.
(function(){
  const t=new Date();
  document.getElementById('moonDate').value=localISODate(t);
  minutes=t.getHours()*60+t.getMinutes()+t.getSeconds()/60;
  hslider.value=String(minutes);
})();
const openVR=applyLink();
tslider.value=dIdx;
moonImg.src='moon.jpg';
// The Milky Way map takes a moment, so it is built once the page is up.
(window.requestIdleCallback||setTimeout)(()=>{ buildMilkyWay(); renderDay(); });
showEpoch(dIdx); renderDay(); warm();
if(openVR) enterVR(true);
// extra(x, y, box), when given, fills a box under the colour line (the dome's spectrum).
function colorTip(canvas, tip, inside, pixel=()=>null, extra=null){
  const ctx=canvas.getContext('2d'); let cur=null, copiedUntil=0, hovering=false, px=0, py=0;
  const refresh=()=>{
    if(!hovering){ tip.style.display='none'; return; }
    if(!inside(px,py)){ tip.style.display='none'; cur=null; return; }
    // The canvas box is read before the tip changes, so the tip forces one layout rather than two.
    const b=canvas.getBoundingClientRect();
    const x=Math.max(0,Math.min(canvas.width-1,Math.round(px))), y=Math.max(0,Math.min(canvas.height-1,Math.round(py)));
    const d=pixel(x,y)||ctx.getImageData(x,y,1,1).data; cur=hex([d[0],d[1],d[2]]);
    if(!tip.firstChild||!tip.querySelector('.tline')) tip.innerHTML='<span class="tline"></span>'+(extra?'<div class="spbox"></div>':'');
    tip.querySelector('.tline').innerHTML=`<i style="background:${cur}"></i>current color ${cur}${performance.now()<copiedUntil?' copied':''}`;
    if(extra) extra(x, y, tip.querySelector('.spbox'));
    tip.style.display='block';
    // Keep the whole tip inside the stage, which clips it.
    const h=tip.offsetHeight, top=Math.max(h/2+4, Math.min(b.height-h/2-4, py*b.height/canvas.height));
    tip.style.left=(px*b.width/canvas.width)+'px'; tip.style.top=top+'px';
    tip.style.transform=px>canvas.width/2?'translate(calc(-100% - 14px), -50%)':'translate(14px, -50%)';
  };
  const show=(e)=>{ const b=canvas.getBoundingClientRect(); px=(e.clientX-b.left)*canvas.width/b.width; py=(e.clientY-b.top)*canvas.height/b.height; hovering=true; refresh(); };
  canvas.addEventListener('mousemove',show);
  canvas.addEventListener('mouseleave',()=>{ hovering=false; tip.style.display='none'; cur=null; });
  const copy=(e)=>{ show(e); if(!cur) return; if(navigator.clipboard){ navigator.clipboard.writeText(cur).then(()=>{ copiedUntil=performance.now()+1200; refresh(); }).catch(()=>{}); } };
  canvas.addEventListener('click',copy);
  canvas.addEventListener('touchstart',e=>{ const t=e.touches[0]; copy({clientX:t.clientX,clientY:t.clientY}); setTimeout(()=>{ hovering=false; tip.style.display='none'; },1500); },{passive:true});
  return refresh;
}
refreshGlobeTip=colorTip(globe, document.getElementById('gtip'), (x,y)=>{ const r=Math.hypot(x-globe.width/2,y-globe.height/2); return r<globe.width*0.30*1.5; }, ()=>null, globeSpectrumTip);
refreshDomeTip=colorTip(dome, document.getElementById('dtip'), (x,y)=>{ const v=domeView(); return Math.hypot(x-v.cx, y-v.cy)<v.R; }, domePixel, domeSpectrum);
// A tooltip that follows the pointer over page elements rather than a canvas: probe(el, fx, fy)
// gives, for the element under the pointer and the pointer's place in it (0–1), the colour line's
// label, its colour and a filler for the spectrum box, or null.
function elemTip(root, sel, tip, probe){
  let at=null, hovering=false;
  const refresh=()=>{
    if(!hovering||!at){ tip.style.display='none'; return; }
    const el=document.elementFromPoint(at[0], at[1]), t=el&&el.closest(sel);
    if(!t||!root.contains(t)){ tip.style.display='none'; return; }
    const b=t.getBoundingClientRect(), r=probe(t, (at[0]-b.left)/b.width, (at[1]-b.top)/b.height);
    if(!r){ tip.style.display='none'; return; }
    if(!tip.querySelector('.tline')) tip.innerHTML='<span class="tline"></span><div class="spbox"></div>';
    tip.querySelector('.tline').innerHTML=`<i style="background:${r.color}"></i>${r.label}`;
    r.fill(tip.querySelector('.spbox'));
    tip.style.display='block';
    const w=tip.offsetWidth, h=tip.offsetHeight, vw=document.documentElement.clientWidth, vh=window.innerHeight;
    tip.style.left=(at[0]+14+w<vw-4?at[0]+14:Math.max(4, at[0]-14-w))+'px';
    tip.style.top=Math.max(4, Math.min(vh-h-4, at[1]-h/2))+'px';
  };
  root.addEventListener('mousemove', e=>{ at=[e.clientX, e.clientY]; hovering=true; refresh(); });
  root.addEventListener('mouseleave', ()=>{ hovering=false; tip.style.display='none'; });
  window.addEventListener('scroll', ()=>{ if(hovering){ hovering=false; tip.style.display='none'; } }, {passive:true});
  root.addEventListener('touchstart', e=>{ const t=e.touches[0]; at=[t.clientX, t.clientY]; hovering=true; refresh(); setTimeout(()=>{ hovering=false; tip.style.display='none'; }, 2500); }, {passive:true});
  return refresh;
}
const ptip=document.getElementById('ptip');
refreshBarTip=elemTip(document.getElementById('hbar'), 'i', ptip, sw=>({
  color:sw.dataset.hex, label:`${sw.getAttribute('aria-label')} · ${sw.dataset.hex}`, fill:box=>barSpectrumTip(sw, box)}));
// The colour at height f of a noon sky's gradient, mixed in sRGB as CSS draws it.
const mixHex=(a, b, f)=>'#'+[1, 3, 5].map(i=>Math.round(parseInt(a.substr(i, 2), 16)*(1-f)+parseInt(b.substr(i, 2), 16)*f).toString(16).padStart(2, '0')).join('');
refreshNoonTip=elemTip(document.getElementById('tdomes'), '.sky', ptip, (sky, fx, fy)=>{
  const f=Math.max(0, Math.min(1, fy)), c=mixHex(sky.dataset.zc, sky.dataset.hc, f);
  return {color:c, label:`${sky.dataset.lat}, ${Math.round(90-88*f)}° up · ${c}`, fill:box=>noonSpectrumTip(sky, f, box)};
});
