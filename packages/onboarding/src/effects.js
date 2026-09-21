// Small cached effect textures replace CSS masks/filters; all animation is Lightning-owned.
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export function radial(color){const c=canvas(256,256),x=c.getContext('2d'),g=x.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,color);g.addColorStop(1,'transparent');x.fillStyle=g;x.fillRect(0,0,256,256);return c;}
export const shade=radial('#032c34b8'),readability=radial('#0206161a');
export const inset=(()=>{const c=canvas(128,128),x=c.getContext('2d');x.shadowColor='#0009';x.shadowBlur=20;x.strokeStyle='#000';x.lineWidth=24;x.strokeRect(-12,-12,152,152);return c;})();
export const spinner=(()=>{const c=canvas(52,52),x=c.getContext('2d');x.lineWidth=5;x.strokeStyle='#ffda0a30';x.beginPath();x.arc(26,26,23.5,0,Math.PI*2);x.stroke();x.strokeStyle='#ffda0a';x.beginPath();x.arc(26,26,23.5,-Math.PI*.75,-Math.PI*.25);x.stroke();return c;})();
export let logoShadow;
export function prepareEffects(){return new Promise(resolve=>{const logo=new Image();logo.onload=()=>{const c=canvas(1130,437),x=c.getContext('2d');
 // Draw the logo offscreen so only its soft silhouette reaches the texture.
 x.shadowBlur=65;x.shadowColor='rgba(0,0,0,.95)';x.shadowOffsetX=2000;x.shadowOffsetY=12;x.drawImage(logo,90-2000,90,950,257);
 x.shadowBlur=24;x.shadowOffsetY=4;x.drawImage(logo,90-2000,90,950,257);logoShadow=c;resolve();};logo.onerror=resolve;logo.src='assets/weekend-logo.png';});}

/** Rounded-rect path, written out longhand because ctx.roundRect lands well
 *  after the Chrome 53 floor the legacy bundle targets. */
function roundRectPath(ctx,left,top,w,h,radius){
 const r=Math.min(radius,w/2,h/2),right=left+w,bottom=top+h;
 ctx.beginPath();ctx.moveTo(left+r,top);
 ctx.arcTo(right,top,right,bottom,r);
 ctx.arcTo(right,bottom,left,bottom,r);
 ctx.arcTo(left,bottom,left,top,r);
 ctx.arcTo(left,top,right,top,r);
 ctx.closePath();
}

// Soft outer glow for a rounded rect: the blurred silhouette and nothing else.
// The renderer's own box-shadow quantizes its falloff into visible steps at TV
// scale, so the glow is rasterized here instead, where the canvas blur is
// smooth, and composited as an ordinary texture behind the element.
//
// The shape is drawn far off-canvas and pulled back by an equal shadow offset,
// so only the shadow lands inside — the solid fill never shows through.
// Three passes — wide halo, mid, tight core — which builds intensity near the
// edge that a single blur can't reach, without reintroducing a hard boundary.
// `pad` is recorded on the canvas; callers offset by it to centre the glow.
const glowCache=new Map();
export function glow(w,h,radius,color,blur){
 const key=[w,h,radius,color,blur].join('|');
 if(glowCache.has(key))return glowCache.get(key);
 const pad=Math.ceil(blur*2.2),c=canvas(Math.ceil(w+pad*2),Math.ceil(h+pad*2)),ctx=c.getContext('2d'),off=Math.ceil(pad+w+120);
 ctx.fillStyle='#000';
 [[blur,1],[blur*0.5,0.85],[blur*0.22,0.7]].forEach(pass=>{
  ctx.shadowColor=color;ctx.shadowBlur=pass[0];ctx.shadowOffsetX=off;ctx.globalAlpha=pass[1];
  roundRectPath(ctx,pad-off,pad,w,h,radius);ctx.fill();
 });
 c.pad=pad;glowCache.set(key,c);return c;
}
