import { asset } from '../config';
import { navigate } from '../router';
import { useGame, useSession } from '../state';
import { ProtoButton } from '../ProtoSheet';
import { AccountMenu } from './AccountMenu';

/** Weekend marketing header: logo top-left, account state top-right. */
export function WkHeader() {
  const s = useSession();
  const GAME = useGame();
  return (
    <header className="wk-header">
      <a href={`#${GAME.id}`} aria-label="Weekend home" style={{ display: 'flex', alignItems: 'center' }}>
        <img className="wk-logo" src={asset('img/weekend-logo.svg')} alt="Weekend" />
      </a>
      <div className="wk-header-right">
        <ProtoButton />
        {s.user ? (
          <AccountMenu email={s.user} />
        ) : (
          <button type="button" className="wk-header-link" onClick={() => navigate('signin')}>
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
