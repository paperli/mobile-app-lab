// A · Honey & Champagne from Speaking Orb Lab, published version 8.
// https://speaking-orb-lab.weekend.chatgpt.site/?tint=honey
// Preserve its surface, reflections and inward rim feather. The TV adaptation
// replaces the flat backdrop with premultiplied transparency and fades the
// quad edges so the full halo composites cleanly over both stage and upsell.
// Voice response is applied upstream in host-orb.js (1.4×); glow stays at 40%.
export const shaderProps = { time: 0, energy: 0, glow: 0.4, canary: 1, mint: 0 }
export const OrbShader = {
  props: shaderProps,
  update() {
    this.uniform1f('u_time', this.props.time)
    this.uniform1f('u_energy', this.props.energy)
    this.uniform1f('u_glow', this.props.glow)
    this.uniform1f('u_canary', this.props.canary)
    this.uniform1f('u_mint', this.props.mint)
  },
  fragment: `
    precision mediump float;
    varying vec2 v_nodeCoords;
    varying vec4 v_color;
    uniform float u_time;
    uniform float u_energy;
    uniform float u_glow;
    uniform float u_canary;
    uniform float u_mint;
    float bell(float x, float s) { return exp(-x*x/s); }
    void main() {
      vec2 p = (v_nodeCoords - 0.5) * 2.0;
      float t = u_time;
      float e = min(u_energy, 1.3);
      float breath = 1.0 + 0.025*sin(t*0.72) + e*0.12;
      p /= breath;
      p.x += 0.012*sin(t*0.41);
      p.y += 0.009*cos(t*0.53);
      float a = atan(p.y, p.x);
      float r = length(p);
      float wobble = 0.007*sin(3.0*a+t*0.53) + 0.008*sin(2.0*a-t*0.71);
      wobble += e*0.015*sin(3.0*a-t*2.3);
      float radius = 0.305 + wobble;
      float d = r-radius;
      vec3 bg = vec3(0.0);
      float halo = exp(-r*r/0.27) * (0.22+u_glow*0.82);
      vec3 canary = vec3(1.0,0.85490,0.03922); // Weekend Canary #FFDA0A
      vec3 color = bg + mix(vec3(0.015,0.20,0.85),vec3(0.82,0.43,0.008),u_canary)*halo;
      vec2 top = p-vec2(0.03,-0.22);
      float plume = exp(-dot(top,top)/0.16)*0.25*u_glow;
      color += mix(vec3(0.0,0.61,0.85),canary,u_canary)*plume;
      float lavender = pow(0.5+0.5*cos(a+2.45+0.14*sin(t*0.6)),3.0);
      float pearl = pow(0.5+0.5*cos(a-0.86+0.28*sin(t*0.42)),8.0);
      vec3 accent = mix(vec3(1.0,0.90,0.63),vec3(0.60,0.96,0.80),u_mint);
      vec3 rimColor = mix(mix(vec3(0.0,0.78,0.96),canary,u_canary),mix(vec3(0.89,0.58,0.92),accent,u_canary),lavender);
      rimColor = mix(rimColor,mix(vec3(0.86,1.0,1.0),vec3(1.0,0.98,0.76),u_canary),pearl*0.90);
      // Keep the outer bloom separate from the surface's inward feather.
      float wide = bell(d,0.019)*(0.18+u_glow*0.24);
      color += rimColor*wide;
      // Layered interior: a drifting blue pocket, a broad luminous fold, and
      // a soft inner crescent. These overlap like the reference's fluid fill.
      float inner = 1.0-smoothstep(radius-0.055,radius+0.012,r);
      vec2 q = p/radius;
      float phase = t*0.58;
      float cs = cos(phase), sn = sin(phase);
      vec2 flow = mat2(cs,-sn,sn,cs)*q;
      flow.x += 0.10*sin(flow.y*2.5+t*0.43);
      flow.y += 0.08*sin(flow.x*2.8-t*0.37)*(1.0+e*0.35);
      vec2 pocketCoords = (flow-vec2(-0.16,-0.20))*vec2(1.05,1.25);
      float pocketRadius = length(pocketCoords);
      float pocket = 1.0-smoothstep(0.28,0.86,pocketRadius);
      float fold = bell(flow.y+0.29*sin(flow.x*2.7)-0.39,0.23);
      float crescent = bell(pocketRadius-0.70,0.060)*smoothstep(-0.30,0.65,flow.y);
      float depth = sqrt(max(0.0,1.0-dot(q,q)));
      vec3 bodyColor = mix(vec3(0.015,0.52,0.83),vec3(0.94,0.66,0.06),u_canary);
      vec3 goldDepth = mix(vec3(0.69,0.43,0.075),vec3(0.24,0.53,0.32),u_mint);
      vec3 deepColor = mix(vec3(0.022,0.18,0.66),goldDepth,u_canary);
      vec3 lightColor = mix(vec3(0.0,0.88,0.97),canary,u_canary);
      vec3 core = bodyColor*(0.88+depth*0.12);
      core = mix(core,deepColor,pocket*0.92);
      core = mix(core,lightColor,clamp(fold*0.55+crescent*0.55,0.0,0.90));
      // Two Canary palettes: warm honey/champagne or cool mint/pearl.
      // Broad reflections vary the fill without a contrasting red center.
      float satinTint = bell(flow.x+0.42,0.16)*bell(flow.y-0.16,0.48);
      float accentTint = bell(flow.x+0.40,0.16)*bell(flow.y+0.49,0.12);
      core = mix(core,vec3(1.0,0.91,0.59),satinTint*0.42*u_canary);
      core = mix(core,accent,accentTint*0.58*u_canary);
      float innerLight = bell(length(q)-0.82,0.030)*(0.5+0.5*cos(a-phase-0.3));
      core = mix(core,lightColor,innerLight*0.40);
      color = mix(color,core,inner*0.98);
      // The rim melts into the fill over almost a third of the radius.
      // Composite after the body so its mask cannot cut a hard inner edge;
      // screen blending keeps bright colors from clipping into a solid band.
      float rimWidth = d < 0.0 ? 0.0085 : 0.0012;
      float rim = bell(d,rimWidth)*(0.50+e*0.04);
      color += (vec3(1.0)-color)*rimColor*rim;
      // A clear glossy surface sits above the moving interior. An analytic
      // sphere normal curves the softbox reflection without another pass.
      vec3 normal = normalize(vec3(q,depth+0.001));
      vec3 reflectionDir = normalize(vec3(-0.34+0.025*sin(t*0.22),-0.48,0.81));
      vec3 tangent = normalize(vec3(0.48,-0.34,0.0));
      vec3 bitangent = normalize(cross(reflectionDir,tangent));
      vec3 offset = normal-reflectionDir;
      vec2 highlight = vec2(dot(offset,tangent),dot(offset,bitangent));
      float softbox = exp(-highlight.x*highlight.x/0.145-highlight.y*highlight.y/0.012);
      float highlightCore = exp(-highlight.x*highlight.x/0.080-highlight.y*highlight.y/0.0024);
      float reflectionHaze = exp(-highlight.x*highlight.x/0.30-highlight.y*highlight.y/0.080);
      float surfaceMask = 1.0-smoothstep(0.88,1.0,length(q));
      float lowerReflection = bell(length(q)-0.83,0.0025)*pow(0.5+0.5*cos(a-0.88),14.0);
      float gloss = (softbox*0.40+highlightCore*0.43+reflectionHaze*0.075+lowerReflection*0.35)*surfaceMask;
      color *= 1.0-inner*(0.11*(1.0-depth));
      vec3 reflectedLight = mix(vec3(0.90,0.99,1.0),vec3(1.0,0.985,0.83),u_canary);
      color = mix(color,reflectedLight,clamp(gloss*(1.0+e*0.06),0.0,0.90));
      float fade = 1.0-smoothstep(0.70,0.99,r);
      // Fade inside the quad even at peak speech expansion.
      fade *= 1.0-smoothstep(0.88,1.0,length((v_nodeCoords-0.5)*2.0));
      color = mix(bg,color,fade);
      color = clamp(color,0.0,1.0);
      // Premultiplied transparency lets the halo blend over the TV scene.
      float alpha = max(inner*0.98*fade,max(color.r,max(color.g,color.b)));
      gl_FragColor = vec4(color,alpha) * v_color;
    }
  `,
}

// Canvas fallback uses the lab's layered gradients and softbox reflections.
// It approximates the field while keeping the same honey/champagne palette.
export const CanvasOrbShader = {
  props: shaderProps,
  saveAndRestore: true,
  render(ctx, node) {
    const { tx, ty } = node.globalTransform
    const w = node.w, h = node.h
    const t = this.props.time, e = Math.min(this.props.energy, 1.3), g = this.props.glow
    const canary = this.props.canary > .5
    ctx.save()
    const opacity = ctx.globalAlpha
    ctx.translate(tx + w/2, ty + h/2)
    const scale = Math.min(w,h)/2
    const breath = 1 + .025*Math.sin(t*.72) + e*.12
    ctx.scale(breath,breath)
    const halo = ctx.createRadialGradient(0,-scale*.06,0,0,0,scale*.95)
    halo.addColorStop(0,(canary?'rgba(255,218,10,':'rgba(0,119,214,')+(.30+g*.26)+')')
    halo.addColorStop(.43,(canary?'rgba(224,155,2,':'rgba(0,93,218,')+(.12+g*.28)+')')
    halo.addColorStop(.72,(canary?'rgba(205,116,0,':'rgba(0,71,205,')+(g*.10)+')')
    halo.addColorStop(1,canary?'rgba(180,100,0,0)':'rgba(0,60,180,0)')
    ctx.fillStyle=halo;ctx.fillRect(-scale,-scale,scale*2,scale*2)
    const ring = ctx.createLinearGradient(-scale*.3,-scale*.24,scale*.25,scale*.26)
    ring.addColorStop(0,canary?'#ffe6a1':'#a89ced');ring.addColorStop(.35,canary?'#ffdc78':'#bbabed');ring.addColorStop(.6,canary?'#ffda0a':'#04d9f1');ring.addColorStop(.86,canary?'#fffaca':'#c5ffff');ring.addColorStop(1,canary?'#fff19e':'#b9f7ff')
    const path = (offset=0) => {
      ctx.beginPath()
      for(let i=0;i<=72;i++){
        const a=i/72*Math.PI*2
        const r=(.305+offset+.007*Math.sin(3*a+t*.53)+.008*Math.sin(2*a-t*.71)+e*.015*Math.sin(3*a-t*2.3))*scale
        const x=Math.cos(a)*r,y=Math.sin(a)*r
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)
      }
      ctx.closePath()
    }
    ctx.strokeStyle=ring;ctx.lineJoin='round'
    for(let i=28;i>=1;i--){
      const width=.015+i*.008
      ctx.lineWidth=scale*width;ctx.globalAlpha=opacity*.018*Math.exp(-Math.pow(width/.15,2))*(.8+g*.35);path();ctx.stroke()
    }
    ctx.globalAlpha=opacity
    const radius=scale*.305
    const layer=(x,y,sx,sy,rgb,alpha)=>{
      ctx.save();ctx.translate(x*radius,y*radius);ctx.scale(sx,sy)
      const fill=ctx.createRadialGradient(0,0,0,0,0,radius)
      fill.addColorStop(0,`rgba(${rgb},${alpha})`);fill.addColorStop(.48,`rgba(${rgb},${alpha*.72})`);fill.addColorStop(1,`rgba(${rgb},0)`)
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.restore()
    }
    ctx.save();ctx.rotate(t*.58)
    const core=ctx.createRadialGradient(0,0,0,0,0,radius)
    core.addColorStop(0,canary?'#e8a104':'#047acc');core.addColorStop(.76,canary?'#e8a104':'#047acc');core.addColorStop(1,canary?'rgba(232,161,4,0)':'rgba(4,122,204,0)')
    ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill()
    layer(-.16+.06*Math.sin(t*.43),-.2,.76,.62,canary?'176,110,19':'6,46,168',.96)
    layer(.17,.35,.68,.51,canary?'255,218,10':'0,214,240',.82)
    layer(.52,.1,.3,.68,canary?'255,218,10':'0,214,240',.62)
    layer(-.22,.59,.5,.25,canary?'255,230,69':'0,224,247',.56)
    if(canary){layer(-.42,.16,.46,.66,'255,232,150',.42);layer(-.4,-.49,.42,.35,'255,230,161',.58)}
    ctx.restore()
    ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=ring;ctx.lineWidth=scale*.012
    for(let i=-80;i<=36;i++){
      const offset=i*.003,width=offset<0?.0085:.0012
      ctx.globalAlpha=opacity*Math.exp(-offset*offset/width)*(.12+e*.008);path(offset);ctx.stroke()
    }
    ctx.restore()
    ctx.save();ctx.translate(radius*(-.34+.025*Math.sin(t*.22)),radius*-.48);ctx.rotate(-.62)
    layer(0,0,.57,.28,canary?'255,251,218':'230,252,255',.17)
    layer(0,0,.44,.12,canary?'255,251,218':'230,252,255',.60)
    layer(0,0,.31,.055,canary?'255,255,236':'247,255,255',.58)
    ctx.restore()
    ctx.save();ctx.translate(radius*.52,radius*.61);ctx.rotate(-.66)
    layer(0,0,.24,.055,canary?'255,248,210':'212,253,255',.38)
    ctx.restore()
    ctx.restore()
  }
}
