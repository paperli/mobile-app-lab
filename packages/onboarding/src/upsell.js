// Adapted from the local hub's LandingScreen hero and its game-art wall.
const columns = [
  ['song-quiz','karaoke','20-questions','wits-end','jeopardy','the-price-is-right'],
  ['jeopardy','are-you-smarter','guess-the-emoji','hub','wheel-of-fortune','karaoke'],
  ['wheel-of-fortune','the-price-is-right','wits-end','song-quiz','are-you-smarter','20-questions'],
  ['karaoke','20-questions','hub','jeopardy','guess-the-emoji','wits-end'],
  ['are-you-smarter','guess-the-emoji','song-quiz','the-price-is-right','hub','wheel-of-fortune'],
  ['the-price-is-right','wits-end','jeopardy','20-questions','karaoke','hub'],
];
let warmedArt;
export function warmUpsellArt() {
  if(warmedArt)return;
  warmedArt=[...new Set(columns.flat())].map(game=>{
    const image=new Image();image.src=`assets/landing-wall/tv-${game}.webp`;
    if(image.decode)image.decode().catch(()=>{});
    return image;
  });
}
export function renderUpsell(scene) {
  const tv = document.getElementById('tv');
  const root = document.createElement('section');
  root.className = `tv-upsell ${scene.connected ? 'paired' : 'unpaired'}`;
  root.setAttribute('aria-label', 'Weekend Premium');
  root.innerHTML = `<div class="upsell-wall" aria-hidden="true">${columns.map((games, i) => `<div class="upsell-column" style="--duration:${[34,40,37,34,40,37][i]}s;--offset:${[0,-46,-70,-24,-58,-36][i]}px;--delay:${[0,-8,-17,-5,-23,-12][i]}s"><div class="upsell-belt">${[...games,...games].map(game => `<img src="assets/landing-wall/tv-${game}.webp" alt="">`).join('')}</div></div>`).join('')}</div>
    <div class="upsell-scrim"></div><img class="upsell-brand" src="assets/weekend-logo.png" alt="Weekend">
    <div class="upsell-copy"><p class="upsell-eyebrow">WEEKEND PREMIUM</p><h1>Unlimited puzzles,<br>shout out your answer<br><em>on TV</em></h1><p class="upsell-subtitle">Start free for 7 days</p><p class="upsell-connected" ${scene.connected?'':'hidden'}>✓ Phone connected</p></div>
    <div class="upsell-pairing"><img class="upsell-qr" alt="Scan to sign up on your phone"><div><h2>${scene.connected ? 'Finish signing up<br>on your phone' : 'Scan to start<br>your free trial'}</h2><p>${scene.connected ? 'Your next game night is a few taps away.' : 'One subscription. Every game night.'}</p></div></div>`;
  let qrSource;
  const update=()=>{
    root.className=`tv-upsell ${scene.connected?'paired':'unpaired'}`;
    root.querySelector('.upsell-connected').hidden=!scene.connected;
    root.querySelector('.upsell-pairing h2').innerHTML=scene.connected?'Finish signing up<br>on your phone':'Scan to start<br>your free trial';
    root.querySelector('.upsell-pairing p').textContent=scene.connected?'Your next game night is a few taps away.':'One subscription. Every game night.';
    const nextSource=scene.qrSource||'assets/pairing-session.png';
    if(nextSource!==qrSource){root.querySelector('.upsell-qr').src=nextSource;qrSource=nextSource;}
  };
  update();
  tv.appendChild(root);
  const fit = () => { root.style.transform = `scale(${tv.clientWidth / 1920})`; };
  fit();
  const observer = new ResizeObserver(fit); observer.observe(tv);
  let closed=false;
  const close=(immediate=false)=>{
    if(closed)return;closed=true;observer.disconnect();
    if(immediate||scene.reduced){root.remove();return;}
    root.classList.add('is-leaving');setTimeout(()=>root.remove(),750);
  };
  close.update=update;
  return close;
}
