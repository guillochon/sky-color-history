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
function colorTip(canvas, tip, inside, pixel=()=>null){
  const ctx=canvas.getContext('2d'); let cur=null, copiedUntil=0, hovering=false, px=0, py=0;
  const refresh=()=>{
    if(!hovering){ tip.style.display='none'; return; }
    if(!inside(px,py)){ tip.style.display='none'; cur=null; return; }
    const x=Math.max(0,Math.min(canvas.width-1,Math.round(px))), y=Math.max(0,Math.min(canvas.height-1,Math.round(py)));
    const d=pixel(x,y)||ctx.getImageData(x,y,1,1).data; cur=hex([d[0],d[1],d[2]]);
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
refreshDomeTip=colorTip(dome, document.getElementById('dtip'), (x,y)=>{ const r=Math.hypot(x-dome.width/2,y-dome.height/2); return r<dome.width*0.46; }, domePixel);
