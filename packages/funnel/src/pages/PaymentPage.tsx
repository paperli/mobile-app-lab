// Replica of prod web-checkout PaymentScreen2 (dev-preview modes "Paid social"
// and "LG/Samsung annual"). Card fields are mock inputs in the Stripe "night"
// theme; nothing is charged.
import { useEffect, useState, type FormEvent } from 'react';
import { OFFERS, asset } from '../config';
import { finishSubscribed } from '../router';
import { getSession, saveAccount, setSession, useSession } from '../state';

const fmtCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const fmtExp = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
};

export function PaymentPage() {
  const session = useSession();
  const offer = OFFERS[session.offer];
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    document.title = 'Payment | Weekend Games';
  }, []);

  const complete = card.replace(/\s/g, '').length === 16 && exp.replace(/\D/g, '').length === 4 && cvc.length >= 3;

  const valueProps =
    offer.id === 'annual' && plan === 'monthly'
      ? [...offer.valueProps.slice(0, 2), { icon: asset('icons/gift-icon.svg'), text: 'Free for a week, then just $3.25/week, billed monthly. Cancel anytime' }]
      : offer.valueProps;

  const fill = () => {
    setCard('4242 4242 4242 4242');
    setExp('12 / 29');
    setCvc('123');
  };

  const pay = (e: FormEvent) => {
    e.preventDefault();
    if (!complete || state !== 'idle') return;
    setState('loading');
    window.setTimeout(() => {
      setState('success');
      const user = getSession().user;
      if (user) saveAccount(user, { subscribed: true });
      // Flip the session only at hand-off: the route guard would otherwise
      // move a subscribed user off #payment mid-animation.
      window.setTimeout(() => {
        setSession({ subscribed: true });
        finishSubscribed({ welcome: true });
      }, 1200);
    }, 1100);
  };

  return (
    <form className="pc pc-pay" onSubmit={pay} noValidate>
      <nav className="pc-nav">
        <img src={asset('img/weekend-logo.svg')} alt="Weekend" />
      </nav>
      <main className="pc-body">
        <h2 className="pc-h2">{offer.title}</h2>
        <div className="pc-vps">
          {valueProps.map((vp) => (
            <div key={vp.text} className="pc-vp">
              <img src={vp.icon} alt="" />
              <p>{vp.text}</p>
            </div>
          ))}
        </div>

        {offer.plans && (
          <div className="pc-plans" role="group" aria-label="Choose a plan">
            {offer.plans.map((p) => (
              <button key={p.id} type="button" className="pc-plan" aria-pressed={plan === p.id} onClick={() => setPlan(p.id)}>
                <span className="pc-plan-h">
                  {p.title}
                  {p.badge && <span className="pc-badge">{p.badge}</span>}
                </span>
                <span className="pc-plan-p">
                  {p.price}
                  <small>{p.cadence}</small>
                </span>
                <span className="pc-plan-d">{p.detail}</span>
              </button>
            ))}
          </div>
        )}

        <hr className="pc-divider" />

        <div className="pc-method">
          <img className="radio" src={asset('icons/radio-button-selected.svg')} alt="" />
          <p>Credit Card</p>
          <img className="badge" src={asset('icons/creditcard-icon.webp')} alt="Visa" />
        </div>

        <div className="pc-cc">
          <div className="pc-float">
            <input id="cc-num" inputMode="numeric" autoComplete="cc-number" placeholder=" " value={card} onChange={(e) => setCard(fmtCard(e.target.value))} />
            <label htmlFor="cc-num">Card number</label>
          </div>
          <div className="pc-grid2">
            <div className="pc-float">
              <input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder=" " value={exp} onChange={(e) => setExp(fmtExp(e.target.value))} />
              <label htmlFor="cc-exp">MM / YY</label>
            </div>
            <div className="pc-float">
              <input id="cc-cvc" inputMode="numeric" autoComplete="cc-csc" placeholder=" " value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              <label htmlFor="cc-cvc">CVC</label>
            </div>
          </div>
          <button type="button" className="pc-fill" onClick={fill}>
            Fill test card (prototype)
          </button>
        </div>
      </main>

      <div className="pc-bar">
        <div className="pc-bar-inner">
          {offer.dueToday && (
            <div className="pc-due">
              <p className="l">Due today</p>
              <p className="v">{offer.dueToday}</p>
            </div>
          )}
          <button type="submit" className={`pc-btn${state === 'success' ? ' is-success' : ''}`} disabled={!complete && state === 'idle'}>
            {state === 'loading' ? (
              <span className="pc-spinner" aria-label="Processing" />
            ) : state === 'success' ? (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </>
            ) : (
              offer.cta
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
