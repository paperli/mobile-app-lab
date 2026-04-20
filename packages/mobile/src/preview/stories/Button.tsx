import { Button } from '@weekend/ui';

export default function ButtonStory() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-lg font-bold mb-2">Primary</h2>
        <div className="flex flex-col gap-2">
          <Button size="sm">Play</Button>
          <Button size="md">Play</Button>
          <Button size="lg">Play</Button>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Outline</h2>
        <div className="flex flex-col gap-2">
          <Button variant="outline">Cancel</Button>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Ghost</h2>
        <div className="flex flex-col gap-2">
          <Button variant="ghost">Skip</Button>
        </div>
      </section>
    </div>
  );
}
