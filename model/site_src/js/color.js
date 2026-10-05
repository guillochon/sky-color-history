const EP = __EP__;
const DAY = __DAY__;
if(!DAY.epochs.y2100) DAY.epochs.y2100=DAY.epochs.modern;
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

