// React adapter for the phone modal.
//
// Kept out of ./device (and therefore out of the index) on purpose: the
// Lightning/Blits onboarding imports @weekend/ui/device and must not pull React
// into that bundle. React callers import @weekend/ui/device/react instead.
import { useEffect, useRef, useState } from 'react';
import { createPhoneModal, type PhoneModal, type PhoneModalOptions } from './PhoneModal';

export interface UsePhoneModalOptions extends PhoneModalOptions {
  /** Mount the modal. Flip to false to unmount it entirely. */
  enabled?: boolean;
  /** Open it as soon as it mounts. */
  openOnMount?: boolean;
}

/**
 * Mounts a phone modal for as long as `enabled` holds, and returns it.
 *
 * Fill `modal.screen` yourself — with `createPortal(children, modal.screen)`
 * for React content, or by assigning innerHTML for plain markup.
 */
export function usePhoneModal(options: UsePhoneModalOptions = {}): PhoneModal | null {
  const { enabled = true, openOnMount = false, ...modalOptions } = options;
  const [modal, setModal] = useState<PhoneModal | null>(null);
  // Options are read once per mount; re-reading them would tear down the modal
  // (and lose its position) on every parent render.
  const optionsRef = useRef(modalOptions);

  useEffect(() => {
    if (!enabled) return undefined;
    const instance = createPhoneModal(optionsRef.current);
    if (openOnMount) instance.open();
    setModal(instance);
    return () => {
      instance.destroy();
      setModal(null);
    };
  }, [enabled, openOnMount]);

  return modal;
}
