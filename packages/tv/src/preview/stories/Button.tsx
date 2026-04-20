import { Button } from '@weekend/ui';

export default function ButtonStory() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-bold mb-3">Primary</h2>
        <div className="flex gap-3 items-center">
          <Button size="sm">Play</Button>
          <Button size="md">Play</Button>
          <Button size="lg">Play</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">Outline</h2>
        <div className="flex gap-3 items-center">
          <Button variant="outline" size="sm">Cancel</Button>
          <Button variant="outline" size="md">Cancel</Button>
          <Button variant="outline" size="lg">Cancel</Button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">Ghost</h2>
        <div className="flex gap-3 items-center">
          <Button variant="ghost" size="sm">Skip</Button>
          <Button variant="ghost" size="md">Skip</Button>
          <Button variant="ghost" size="lg">Skip</Button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">Focus state</h2>
        <p className="text-fg-muted text-sm mb-2">Tab into this button to see focus ring.</p>
        <Button>Focus me</Button>
      </section>
    </div>
  );
}
