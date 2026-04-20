import { SystemButton } from '@weekend/ui';

export default function SystemButtonStory() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-bold mb-2">Hub variant (44px default)</h2>
        <SystemButton variant="hub" onPress={() => alert('Hub system pressed')} />
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Hub variant (56px, matches current TopBar)</h2>
        <SystemButton variant="hub" size={56} onPress={() => alert('Hub system pressed')} />
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Game variant</h2>
        <SystemButton
          variant="game"
          size={56}
          gameLogo={<span className="text-2xl font-bold">SQ</span>}
          onPress={() => alert('Game system pressed')}
        />
      </section>
    </div>
  );
}
