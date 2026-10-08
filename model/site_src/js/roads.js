// Roads. Each city and neighbourhood has streets on its lot lines, and roads join the towns,
// routed around water, woods, hills, mountains, and the other towns. Buildings stand at least
// 2.5 m inside their lots, so no street meets one.
// Street spacing along x and y: every lot line in a city; in a neighbourhood every second lot
// line one way and every fifth the other, so each house fronts a street. Must match streetD in
// the sky shader and yardTree in the town pass.
const STREET_HW=2.4, ROAD_HW=3.4, ROAD_MAX=64;
function streetPitch(ty){ return ty<1.5?[42, 42]:[48, 120]; }
// g: grid[6] for the sky shader, (centre, radius, type) of each town. r: road[64], segments (x0, y0, x1, y1).
function roadsFor(o, k, t, tn){
  const towns=[], disks=[];
  for(let i=0;i<tn;i++){
    const x=t[i*4], y=t[i*4+1], R=t[i*4+2], ty=t[i*4+3];
    if(ty>0.5 && ty<2.5) towns.push({x, y, R, ty, cell:lotCell(ty)});
    // A pool's shore wanders out to about 1.4 radii; lots reach 0.71 of a cell past the radius.
    disks.push([x, y, ty<0.5?R*1.45+6:ty<2.5?R+lotCell(ty):R+12]);
  }
  for(let i=0;i<12;i++) if(k[i]>0.5) disks.push([o[i*4], o[i*4+1], scRad(k[i], o[i*4+2])+25]);
  const g=new Float32Array(24), r=new Float32Array(ROAD_MAX*4);
  towns.slice(0, 6).forEach((w, i)=>g.set([w.x, w.y, w.R, w.ty], i*4));
  const out={g, gn:Math.min(towns.length, 6), r, rn:0};
  if(towns.length<2) return out;
  // Hills as marchLand places them, kept out of towns as hillClear does.
  // The routes stay within 1500 m of the box around the towns, so the hills near it will do.
  const C=20, x0=Math.min(...towns.map(w=>w.x))-1500, y0=Math.min(...towns.map(w=>w.y))-1500;
  const x1=Math.max(...towns.map(w=>w.x))+1500, y1=Math.max(...towns.map(w=>w.y))+1500;
  for(let gx=Math.floor(x0/1800)-1;gx<=Math.floor(x1/1800)+1;gx++) for(let gy=Math.floor(y0/1800)-1;gy<=Math.floor(y1/1800)+1;gy++){
    if(h12xy(gx, gy)<0.46) continue;
    const cx=(gx+0.5+(h12xy(gx+1.7, gy+1.7)-0.5)*0.44)*1800, cy=(gy+0.5+(h12xy(gx+3.1, gy+3.1)-0.5)*0.44)*1800;
    const R=140+200*h12xy(gx+5.5, gy+5.5);
    let clear=true;
    for(let i=0;i<tn;i++) if(Math.hypot(cx-t[i*4], cy-t[i*4+1])<t[i*4+2]+R*1.28+60) clear=false;
    if(clear) disks.push([cx, cy, R*1.28+25]);
  }
  const blocked=(x, y, pad)=>{
    for(const d of disks){ const dx=x-d[0], dy=y-d[1], r=d[2]+pad; if(dx*dx+dy*dy<r*r) return true; }
    return false;
  };
  const clearSeg=(a, b, pad)=>{
    const n=Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1])/4);
    for(let s=0;s<=n;s++) if(blocked(a[0]+(b[0]-a[0])*s/n, a[1]+(b[1]-a[1])*s/n, pad)) return false;
    return true;
  };
  // A street leaving the town toward p: p0 where the grid ends, p1 out past the town's lots.
  const exitFor=(w, p)=>{
    const [sx, sy]=streetPitch(w.ty), dx=p.x-w.x, dy=p.y-w.y, Re=w.R+0.5*w.cell, Ro=w.R+w.cell+50;
    const along=(horiz)=>{
      if(horiz){ const ly=sy*Math.round(w.y/sy), off=ly-w.y, s=Math.sign(dx)||1;
        return [[w.x+s*Math.sqrt(Re*Re-off*off), ly], [w.x+s*Math.sqrt(Ro*Ro-off*off), ly]]; }
      const lx=sx*Math.round(w.x/sx), off=lx-w.x, s=Math.sign(dy)||1;
      return [[lx, w.y+s*Math.sqrt(Re*Re-off*off)], [lx, w.y+s*Math.sqrt(Ro*Ro-off*off)]];
    };
    for(const horiz of Math.abs(dx)>=Math.abs(dy)?[true, false]:[false, true]){
      const e=along(horiz);
      if(!blocked(e[1][0], e[1][1], ROAD_HW+40)) return e;
    }
    return null;
  };
  // A* on a 20 m grid over the towns' bounding box.
  const W=Math.ceil((x1-x0)/C), H=Math.ceil((y1-y0)/C);
  const bad=new Uint8Array(W*H);
  for(let j=0;j<H;j++) for(let i=0;i<W;i++) bad[j*W+i]=blocked(x0+(i+0.5)*C, y0+(j+0.5)*C, ROAD_HW+30)?1:0;
  const route=(a, b)=>{
    const cellOf=p=>[Math.floor((p[0]-x0)/C), Math.floor((p[1]-y0)/C)];
    const [si, sj]=cellOf(a), [ei, ej]=cellOf(b), s=sj*W+si, e=ej*W+ei;
    const cost=new Float32Array(W*H).fill(Infinity), from=new Int32Array(W*H).fill(-1);
    const heap=[], push=(n, f)=>{ heap.push([f, n]); let c=heap.length-1; while(c>0){ const p=(c-1)>>1; if(heap[p][0]<=heap[c][0]) break; [heap[p], heap[c]]=[heap[c], heap[p]]; c=p; } };
    const pop=()=>{ const top=heap[0], last=heap.pop(); if(heap.length){ heap[0]=last; let c=0; for(;;){ const l=2*c+1, rr=l+1; let m=c; if(l<heap.length&&heap[l][0]<heap[m][0]) m=l; if(rr<heap.length&&heap[rr][0]<heap[m][0]) m=rr; if(m===c) break; [heap[m], heap[c]]=[heap[c], heap[m]]; c=m; } } return top; };
    const hEst=n=>{ const dx=Math.abs(n%W-ei), dy=Math.abs(Math.floor(n/W)-ej); return Math.max(dx, dy)+0.414*Math.min(dx, dy); };
    cost[s]=0; push(s, hEst(s));
    while(heap.length){
      const [f, n]=pop();
      if(n===e) break;
      if(f>cost[n]+hEst(n)+1e-6) continue;
      const i=n%W, j=Math.floor(n/W);
      for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++){
        const ni=i+di, nj=j+dj, m=nj*W+ni;
        if((!di&&!dj)||ni<0||nj<0||ni>=W||nj>=H||(bad[m]&&m!==e)) continue;
        const c=cost[n]+(di&&dj?1.414:1);
        if(c<cost[m]){ cost[m]=c; from[m]=n; push(m, c+hEst(m)); }
      }
    }
    if(from[e]<0) return null;
    const path=[b];
    for(let n=from[e];n>=0&&n!==s;n=from[n]) path.push([x0+(n%W+0.5)*C, y0+(Math.floor(n/W)+0.5)*C]);
    path.push(a);
    return path.reverse();
  };
  // Keep only the corners the road needs: from each point, the farthest one in clear sight.
  // The route keeps 30 m from anything and these lines 25 m, so the corners have room to round.
  const simplify=pts=>{
    const keep=[pts[0]];
    for(let i=0;i<pts.length-1;){
      let j=pts.length-1;
      while(j>i+1 && !clearSeg(pts[i], pts[j], ROAD_HW+25)) j--;
      keep.push(pts[j]); i=j;
    }
    return keep;
  };
  // Cut each corner into two, as far back as stays clear (at most 80 m), so bends curve.
  // Cuts the corner at b between a and c into two corners, or returns null.
  const cut=(a, b, c)=>{
    const la=Math.hypot(a[0]-b[0], a[1]-b[1]), lc=Math.hypot(c[0]-b[0], c[1]-b[1]);
    for(const f of [0.3, 0.2, 0.1]){
      const ca=Math.min(f*la, 80)/la, cc=Math.min(f*lc, 80)/lc;
      const q1=[b[0]+(a[0]-b[0])*ca, b[1]+(a[1]-b[1])*ca], q2=[b[0]+(c[0]-b[0])*cc, b[1]+(c[1]-b[1])*cc];
      if(clearSeg(q1, q2, ROAD_HW+1)) return [q1, q2];
    }
    return null;
  };
  const smooth=pts=>{
    const s=[pts[0]];
    for(let i=1;i<pts.length-1;i++){ const q=cut(pts[i-1], pts[i], pts[i+1]); if(q) s.push(...q); else s.push(pts[i]); }
    s.push(pts[pts.length-1]);
    return s;
  };
  // Join the towns by a spanning tree, nearest first.
  const inTree=[0], edges=[];
  while(inTree.length<towns.length){
    let best=null;
    for(const a of inTree) for(let b=0;b<towns.length;b++){
      if(inTree.includes(b)) continue;
      const d=Math.hypot(towns[a].x-towns[b].x, towns[a].y-towns[b].y);
      if(!best||d<best[2]) best=[a, b, d];
    }
    inTree.push(best[1]); edges.push(best);
  }
  const lines=[];
  for(const [a, b] of edges){
    const ea=exitFor(towns[a], towns[b]), eb=exitFor(towns[b], towns[a]);
    if(!ea||!eb) continue;
    const mid=route(ea[1], eb[1]);
    if(!mid) continue;
    lines.push([ea[0], simplify(mid), eb[0]]);
  }
  // The streets out of town stay straight; the rest is smoothed twice while the segments fit.
  for(let pass=0;pass<2;pass++){
    let used=lines.reduce((n, l)=>n+l[1].length+1, 0);
    for(const l of lines){
      const sm=smooth(l[1]);
      if(used+sm.length-l[1].length<=ROAD_MAX){ used+=sm.length-l[1].length; l[1]=sm; }
    }
  }
  for(const [p0, mid, q0] of lines){
    const pts=[p0, ...mid, q0];
    for(let i=0;i<pts.length-1 && out.rn<ROAD_MAX;i++) r.set([pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]], 4*out.rn++);
  }
  return out;
}
