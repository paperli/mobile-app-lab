// Canary host shader, tracking Speaking Orb Lab (speaking-orb-lab.weekend.chatgpt.site).
//
// Two deliberate departures from the lab's build, both so the orb can sit on the
// TV stage instead of the lab's flat backdrop:
//   1. bg is black rather than the lab's #080a0e, and
//   2. the fragment returns a computed alpha rather than 1.0,
// so the halo dissolves into whatever the stage is showing behind it.
// Everything else — the feathered rim and the layered interior (drifting
// pocket, luminous fold, inner crescent) — is the lab's current field.
//
// `glow` is the lab's Glow control (0–1) and defaults to the 40% we tuned for
// the TV stage. Voice response is applied to `energy` upstream in host-orb.js.
export const shaderProps = { time: 0, energy: 0, glow: 0.4, canary: 1 }
export const OrbShader = {
  props: shaderProps,
  update() {
    this.uniform1f('u_time', this.props.time)
    this.uniform1f('u_energy', this.props.energy)
    this.uniform1f('u_glow', this.props.glow)
    this.uniform1f('u_canary', this.props.canary)
  },
  fragment: `
    precision mediump float;
    varying vec2 v_nodeCoords;
    varying vec4 v_color;
    uniform float u_time;
    uniform float u_energy;
    uniform float u_glow;
    uniform float u_canary;
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
      vec3 rimColor = mix(mix(vec3(0.0,0.78,0.96),canary,u_canary),mix(vec3(0.89,0.58,0.92),vec3(1.0,0.65,0.10),u_canary),lavender);
      rimColor = mix(rimColor,mix(vec3(0.86,1.0,1.0),vec3(1.0,0.98,0.76),u_canary),pearl*0.90);
      // Feather toward the core and keep the bright ridge narrow so the rim
      // reads as light, rather than a thick, clipped band of solid color.
      float innerFeather = smoothstep(-0.065,0.012,d);
      float wide = bell(d,0.019)*(0.18+u_glow*0.24);
      float soft = bell(d,0.0012)*(0.55+e*0.06);
      float silk = bell(d-0.008,0.00035)*0.15;
      color += rimColor*(wide+(soft+silk)*innerFeather);
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
      vec3 bodyColor = mix(vec3(0.015,0.52,0.83),vec3(0.91,0.63,0.015),u_canary);
      vec3 deepColor = mix(vec3(0.022,0.18,0.66),vec3(0.68,0.35,0.005),u_canary);
      vec3 lightColor = mix(vec3(0.0,0.88,0.97),canary,u_canary);
      vec3 core = bodyColor*(0.88+depth*0.12);
      core = mix(core,deepColor,pocket*0.92);
      core = mix(core,lightColor,clamp(fold*0.55+crescent*0.55,0.0,0.90));
      float innerLight = bell(length(q)-0.82,0.030)*(0.5+0.5*cos(a-phase-0.3));
      core = mix(core,lightColor,innerLight*0.40);
      color = mix(color,core,inner*0.98);
      color += mix(vec3(0.20,0.90,1.0),vec3(1.0,0.96,0.55),u_canary)*bell(d+0.012,0.0006)*pearl*0.15*innerFeather;
      float fade = 1.0-smoothstep(0.70,0.99,r);
      color = mix(bg,color,fade);
      color = clamp(color,0.0,1.0);
      // Opaque through the body, then follow the brightest channel out through
      // the halo so the glow fades rather than ending on a hard disc edge.
      float alpha = max(inner * 0.98 * fade, max(color.r,max(color.g,color.b)));
      gl_FragColor = vec4(color,alpha) * v_color;
    }
  `,
}

// Used only when a WebGL context is unavailable. Still a Blits/Lightning shader,
// but visually approximate: Canvas gradients cannot reproduce the fragment field,
// so the layered interior collapses to a single radial core.
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
    ring.addColorStop(0,canary?'#ffac25':'#a89ced');ring.addColorStop(.35,canary?'#ffcc46':'#bbabed');ring.addColorStop(.6,canary?'#ffda0a':'#04d9f1');ring.addColorStop(.86,canary?'#fffaca':'#c5ffff');ring.addColorStop(1,canary?'#fff19e':'#b9f7ff')
    const path = () => {
      ctx.beginPath()
      for(let i=0;i<=72;i++){
        const a=i/72*Math.PI*2
        const r=(.305+.007*Math.sin(3*a+t*.53)+.008*Math.sin(2*a-t*.71)+e*.015*Math.sin(3*a-t*2.3))*scale
        const x=Math.cos(a)*r,y=Math.sin(a)*r
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)
      }
      ctx.closePath()
    }
    ctx.strokeStyle=ring;ctx.lineJoin='round'
    for(let i=28;i>=1;i--){
      const width=.012+i*.008
      ctx.lineWidth=scale*width;ctx.globalAlpha=opacity*.05*Math.exp(-Math.pow(width/.13,2))*(.8+g*.35);path();ctx.stroke()
    }
    ctx.globalAlpha=opacity
    const core=ctx.createRadialGradient(scale*.09*Math.cos(t*.6),scale*.07,0,0,0,scale*.285)
    core.addColorStop(0,canary?'#986000':'#006da8');core.addColorStop(.68,canary?'#d5ae08':'#079ac8');core.addColorStop(.90,canary?'rgba(255,218,10,.65)':'rgba(0,155,204,.65)');core.addColorStop(1,canary?'rgba(255,218,10,0)':'rgba(0,155,204,0)')
    ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,scale*.285,0,Math.PI*2);ctx.fill()
    ctx.restore()
  }
}
