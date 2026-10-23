// The Amazon subscription-sheet mock shared by pre-roll and onboarding.
// Prices and payment details are illustrative; there is no payment integration.
const GAMES = ['jeopardy','song-quiz','wheel-of-fortune','cocomelon','guess-the-emoji','bingo','spot-on','sketchy-af','bffs','werds','wits-end','short-list','meme-supreme','weekend-poker','spot-the-gubs','word-rush','20-questions','the-price-is-right'];
export function paywallMarkup({ artBase = 'assets/img/', appIcon = 'assets/img/firetv-weekend-appicon.png', allowSkip = false } = {}) {
  const wall = Array.from({ length:36 }, (_, i) => `<img src="${artBase}tv-${GAMES[i % GAMES.length]}.webp" alt="" />`).join('');
  return `              <div class="pw-bg">
                <div class="pw-wall" id="paywallWall">${wall}</div>
              </div>
              <div class="pw-shade"></div>
              <div class="pw-loading" id="paywallLoading"><span class="pw-spinner"></span></div>
              <div class="pw-content" id="paywallContent">
                <div class="pw-icon">
                  <img src="${appIcon}" alt="Weekend Games" />
                </div>
                <h1 class="pw-title">Subscription Terms for Weekend Games - Jeopardy!, Song Quiz, CoComelon Sing &amp; Play with JJ &amp; More</h1>
                <p class="pw-plan">Selected Plan: Weekend Games - Jeopardy, Wheel of Fortune, Song Quiz &amp; More</p>
                <p class="pw-price">$18.99 monthly</p>
                <p class="pw-legal">
                  By selecting "Continue with Subscription", you agree to the Amazon Appstore Terms of Use
                  www.amazon.com/appstoretou. You authorize us to charge your selected payment method or another
                  payment method you have on file $18.99 monthly plus any applicable taxes until you cancel. You may
                  cancel at any time by going to www.amazon.com/appstoresubscriptions and following the instructions
                  on screen. To avoid the next charge, you must cancel before the next renewal date. You will be
                  notified if the price changes.
                </p>
                <button class="pw-check" data-focus="pw-check" role="checkbox" aria-checked="false">
                  <span class="pw-check__box"></span>
                  <span>Authorize recurring monthly charges to <b>Visa ending in 8060</b></span>
                </button>
                <div class="pw-actions">
                  <button class="pw-btn pw-btn--primary" data-focus="pw-continue" disabled>Continue with Subscription</button>
                  ${allowSkip ? '<button class="pw-btn pw-btn--skip" data-focus="pw-skip">Skip for now</button>' : '<button class="pw-btn" data-focus="pw-change">Change Payment Preference <span class="pw-caret"></span></button>'}
                </div>
              </div>
              <div class="pw-toast" id="paywallToast">You're almost there. Just a few steps left.</div>
              <div class="pw-processing" id="paywallProcessing"><span class="pw-spinner"></span></div>
`;
}
