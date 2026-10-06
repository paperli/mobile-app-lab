// Adapted from the local hub's LandingScreen hero and its game-art wall, tiled
// from the hub's game-tile exports. 36 slots for 21 games: repeats sit only under
// the darkest scrim (columns 1-2) and on three dark tiles in column 3; columns
// 4-6 hold each game once, bar Jeopardy!, and no repeat sits beside its original.
// Jeopardy! rides columns 4 (~y302) and 6 (~y857, below the unpaired QR panel);
// both scroll down on the same 40 s loop, so they hold a fixed half-loop apart
// and never sit side by side. The Price Is Right (~y416) and Song Quiz (~y602)
// are mid column 5, Wheel of Fortune mid column 6 (~y485), past the side gradient.
const columns = [
  ['guess-the-emoji','wits-end','are-you-smarter','weekend-pool','cocomelon','bingo'],
  ['werds','short-list','meme-supreme','spot-on','20-questions','sketchy-af'],
  ['bffs','are-you-smarter','spot-the-gubs','storytime','word-rush','weekend-poker'],
  ['spot-on','jeopardy','bingo','wits-end','werds','short-list'],
  ['the-price-is-right','song-quiz','storytime','sketchy-af','guess-the-emoji','weekend-pool'],
  ['meme-supreme','wheel-of-fortune','20-questions','jeopardy','weekend-poker','cocomelon'],
];
export const timing = { duration: [34,40,37,40,40,40], offset: [0,-46,-70,-24,-58,-36], delay: [0,-8,-17,-5,-23,-12] };
export { columns as wallColumns };
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
  root.innerHTML = `<div class="upsell-wall" aria-hidden="true">${columns.map((games, i) => `<div class="upsell-column" style="--duration:${timing.duration[i]}s;--offset:${timing.offset[i]}px;--delay:${timing.delay[i]}s"><div class="upsell-belt">${[...games,...games].map(game => `<img src="assets/landing-wall/tv-${game}.webp" alt="">`).join('')}</div></div>`).join('')}</div>
    <div class="upsell-scrim"></div><img class="upsell-brand" src="assets/weekend-logo.png" alt="Weekend">
    <div class="upsell-copy"><h1>Unlimited puzzles,<br>shout out your answer<br><em>on TV</em></h1><p class="upsell-subtitle"></p></div>
    <div class="upsell-pairing"><img class="upsell-qr" alt="Scan to sign up on your phone"><h2>Scan to start<br>your free trial</h2></div>`;
  let qrSource;
  const update=()=>{
    root.className=`tv-upsell ${scene.connected?'paired':'unpaired'}`;
    // Once a phone is connected the copy folds into one line and the QR stands alone.
    root.querySelector('.upsell-subtitle').textContent=scene.connected?'Finish signing up on your phone to start free for 7 days':'Start free for 7 days';
    root.querySelector('.upsell-pairing h2').hidden=scene.connected;
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
