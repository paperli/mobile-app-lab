// Story: interactive hub layout prototype (Hero v2 + tile shelf + detail).
import { HubPrototype } from '../../prototype/hub/HubPrototype';

export default function HubV2Story() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Hub Layout — v2 (prototype)</h2>
      <p className="text-sm text-fg-muted mb-6 max-w-3xl">
        30-game hub built code-only per the arcade runbook: Hero v2 (1920×800) + a
        16:9 tile shelf. Art, logotypes and screenshots are stylized from each game's
        theme — no raster assets. Browse with ← / → and open a game to see its three
        screenshots.
      </p>
      <HubPrototype />
    </div>
  );
}
