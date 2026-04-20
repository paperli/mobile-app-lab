import { useState } from 'react';
import { Dialog, Button } from '@weekend/ui';

export default function DialogStory() {
  const [plainOpen, setPlainOpen] = useState(false);
  const [backlitOpen, setBacklitOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-bold mb-3">Plain dialog</h2>
        <Button onClick={() => setPlainOpen(true)}>Open plain</Button>
        <Dialog.Root open={plainOpen} onOpenChange={setPlainOpen}>
          <Dialog.Portal>
            <Dialog.Overlay />
            <Dialog.Content variant="plain">
              <Dialog.Title className="text-2xl font-bold mb-2">Plain dialog</Dialog.Title>
              <Dialog.Description className="text-fg-muted mb-6">
                Flat panel, standard drop shadow.
              </Dialog.Description>
              <Dialog.Close asChild>
                <Button variant="ghost">Close</Button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Backlit dialog</h2>
        <Button onClick={() => setBacklitOpen(true)}>Open backlit</Button>
        <Dialog.Root open={backlitOpen} onOpenChange={setBacklitOpen}>
          <Dialog.Portal>
            <Dialog.Overlay />
            <Dialog.Content variant="backlit">
              <Dialog.Title className="text-3xl font-bold mb-2">Backlit dialog</Dialog.Title>
              <Dialog.Description className="text-fg-muted mb-6">
                Cyan stroke blur + radial wash behind the panel. Signature Weekend chrome.
              </Dialog.Description>
              <Dialog.Close asChild>
                <Button variant="outline">Close</Button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </section>
    </div>
  );
}
