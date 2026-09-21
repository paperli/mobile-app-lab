// Rasterize typography once, then let Lightning own placement, tint and animation.
// Explicit line boxes avoid renderer 3.3.1 containment / tracking differences.
const cache=new Map();
const faces={Repro:['Weekend Repro',400],ReproMedium:['Weekend Repro',500],ReproBold:['Weekend Repro',700],Serif:['GT Super Text',400],SerifBold:['GT Super Text',700],Korinna:['ITC Korinna Std',700]};
export function prepareFonts(){return Promise.all(Object.keys(faces).map(k=>{const f=faces[k];return document.fonts.load(f[1]+' 40px "'+f[0]+'"');}));}
// `shadow` is a blur radius in px; it pads the canvas so the blur isn't clipped
// and records that padding on the canvas as `.pad`, which the caller subtracts
// from x/y to keep the glyphs where they were. The shadow is drawn black, which
// survives Lightning's colour tint (black × anything is black) — so a tinted
// text node still gets a neutral drop shadow.
/** Rendered width of a single line, so callers can size a box to its content. */
export function measureWidth(text,size,font,tracking=0){
 const ctx=document.createElement('canvas').getContext('2d'),face=faces[font]||faces.Repro;
 ctx.font=face[1]+' '+size+'px "'+face[0]+'"';
 return ctx.measureText(text).width+Math.max(0,text.length-1)*tracking;
}

export function textTexture(text,size,width,align,font,line,tracking,shadow=0){
 const key=[text,size,width,align,font,line,tracking,shadow].join('|');if(cache.has(key))return cache.get(key);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),face=faces[font]||faces.Repro,fontString=face[1]+' '+size+'px "'+face[0]+'"';ctx.font=fontString;
 const measure=s=>ctx.measureText(s).width+Math.max(0,s.length-1)*tracking;
 const lines=[];text.split('\n').forEach(paragraph=>{let row='';paragraph.split(' ').forEach(word=>{const candidate=row?row+' '+word:word;if(row&&measure(candidate)>width){lines.push(row);row=word;}else row=candidate;});lines.push(row);});
 const pad=shadow?Math.ceil(shadow*1.6):0;
 canvas.width=Math.ceil(width)+pad*2;canvas.height=Math.ceil(lines.length*size*line)+pad*2;canvas.pad=pad;
 ctx.font=fontString;ctx.fillStyle='white';ctx.textBaseline='alphabetic';
 if(shadow){ctx.shadowColor='rgba(0,0,0,.72)';ctx.shadowBlur=shadow;ctx.shadowOffsetY=Math.round(shadow*.28);}
 const metrics=ctx.measureText('Hg'),ascent=metrics.fontBoundingBoxAscent||size*.8,descent=metrics.fontBoundingBoxDescent||size*.2,baseline=(size*line-ascent-descent)/2+ascent;
 lines.forEach((row,i)=>{if('letterSpacing' in ctx)ctx.letterSpacing='0px';let x=(align==='center'?(width-measure(row))/2:align==='right'?width-measure(row):0)+pad;const y=baseline+i*size*line+pad;
  if('letterSpacing' in ctx){ctx.letterSpacing=tracking+'px';ctx.fillText(row,x,y);}else if(!tracking)ctx.fillText(row,x,y);else{for(let j=0;j<row.length;j++){const offset=ctx.measureText(row.slice(0,j+1)).width-ctx.measureText(row[j]).width+j*tracking;ctx.fillText(row[j],x+offset,y);}}
 });
 if(cache.size>=96)cache.delete(cache.keys().next().value);cache.set(key,canvas);return canvas;
}
