// Replica of prod web-checkout AuthScreen (hub/apps/web-checkout/src/screens/
// AuthScreen.tsx + AuthScreen.constants.ts). Copy is verbatim. The one change
// from prod: the email arrives pre-filled from the landing page.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { asset } from '../config';
import { afterAuth, navigate } from '../router';
import { EMAIL_RE, findAccount, saveAccount, setSession, useSession } from '../state';

const COPY = {
  signup: {
    title: "Let's get started",
    subtitle: 'Create your account in seconds and start playing instantly!',
    button: 'Create account',
    loading: 'Creating account...',
    switchText: 'Already subscribed?',
    switchLink: 'Sign in',
    docTitle: 'Sign Up | Weekend Games',
  },
  signin: {
    title: 'Sign in',
    subtitle: "To start, let's sign in to your account to access your Weekend Game Pass.",
    button: 'Sign in',
    loading: 'Signing in...',
    switchText: 'New to Weekend?',
    switchLink: 'Sign up',
    docTitle: 'Sign In | Weekend Games',
  },
} as const;

export function AuthPage({ mode, next }: { mode: 'signup' | 'signin'; next: string | null }) {
  const session = useSession();
  const c = COPY[mode];
  const [email, setEmail] = useState(session.email);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const prefilled = !!session.email;
  // Prod hides social sign-in inside in-app browsers (AuthScreen.tsx:62-63).
  const inApp = session.src === 'tiktok';

  useEffect(() => {
    document.title = c.docTitle;
    (prefilled ? pwRef : emailRef).current?.focus({ preventScroll: true });
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const emailOk = EMAIL_RE.test(email.trim());
  const pwOk = password.length >= 8;
  const confirmOk = mode === 'signin' || confirm === password;
  const valid = emailOk && pwOk && confirmOk;
  const errEmail = touched.email && email.length > 0 && !emailOk ? 'Invalid email' : '';
  const errPw = touched.password && password.length > 0 && !pwOk ? 'Minimum 8 characters' : '';
  const errConfirm = touched.confirm && confirm.length > 0 && !confirmOk ? 'Passwords must match' : '';

  const withNext = (to: string) => (next ? `${to}?next=${next}` : to);
  const switchMode = () => {
    setSession({ email: email.trim() });
    navigate(withNext(mode === 'signup' ? 'signin' : 'signup'), { replace: true });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    const value = email.trim();
    if (mode === 'signup' && findAccount(value)) {
      setExists(true);
      return;
    }
    setBusy(c.loading);
    window.setTimeout(() => {
      if (mode === 'signup' || !findAccount(value)) saveAccount(value, { subscribed: false });
      afterAuth(value, next);
    }, 750);
  };

  const social = (provider: 'Google' | 'Apple') => {
    setBusy(provider === 'Google' ? 'Redirecting to Google...' : 'Signing in with Apple...');
    const value = emailOk ? email.trim() : `player@${provider === 'Google' ? 'gmail.com' : 'icloud.com'}`;
    window.setTimeout(() => {
      if (!findAccount(value)) saveAccount(value, { subscribed: false });
      afterAuth(value, next);
    }, 900);
  };

  return (
    <div className="pc pc-auth">
      <nav className="pc-nav">
        <a href={`#${session.game}`} aria-label="Weekend">
          <img src={asset('img/weekend-logo.svg')} alt="Weekend" />
        </a>
      </nav>
      <main className="pc-body">
        <div className="pc-card">
          <div>
            <h2 className="pc-h2">{c.title}</h2>
            <p className="pc-sub">{c.subtitle}</p>
          </div>

          {!inApp && (
            <>
              <div className="pc-social">
                <button type="button" onClick={() => social('Google')} disabled={!!busy}>
                  <img src={asset('icons/googleIcon.svg')} alt="" />
                  Continue with Google
                </button>
                <button type="button" className="apple" onClick={() => social('Apple')} disabled={!!busy}>
                  <img src={asset('icons/appleIcon.svg')} alt="" />
                  Continue with Apple
                </button>
              </div>
              <div className="pc-or">or</div>
            </>
          )}

          <form className="pc-form" onSubmit={submit} noValidate>
            <div className="pc-field">
              <label htmlFor="auth-email" className="sr">Email</label>
              <input
                ref={emailRef}
                id="auth-email"
                className={`pc-input${errEmail ? ' is-invalid' : ''}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setExists(false);
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
            </div>
            {errEmail && <p className="pc-err">{errEmail}</p>}

            <div className="pc-field">
              <label htmlFor="auth-pw" className="sr">Password</label>
              <input
                ref={pwRef}
                id="auth-pw"
                className={`pc-input has-eye${errPw ? ' is-invalid' : ''}`}
                type={show ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              />
              <button type="button" className="pc-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                <img src={asset(show ? 'icons/eyeOpen.svg' : 'icons/eyeClosed.svg')} alt="" />
              </button>
            </div>
            {errPw && <p className="pc-err">{errPw}</p>}

            {mode === 'signup' && (
              <>
                <div className="pc-field">
                  <label htmlFor="auth-confirm" className="sr">Confirm password</label>
                  <input
                    id="auth-confirm"
                    className={`pc-input${errConfirm ? ' is-invalid' : ''}`}
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  />
                </div>
                {errConfirm && <p className="pc-err">{errConfirm}</p>}
              </>
            )}

            {exists && (
              <p className="pc-err" role="alert">
                An account with this email already exists.{' '}
                <button type="button" className="pc-link" onClick={switchMode}>Sign in</button>
              </p>
            )}

            <button type="submit" className="pc-btn" disabled={!valid || !!busy}>
              {busy ?? c.button}
            </button>
            {mode === 'signin' && (
              <a className="pc-forgot" href="#signin" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
            )}
          </form>

          <p className="pc-switch">
            {c.switchText}{' '}
            <button type="button" className="pc-link" onClick={switchMode}>
              {c.switchLink}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
