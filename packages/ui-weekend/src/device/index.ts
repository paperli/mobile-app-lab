// Device shells shared across the prototypes. Nothing here imports React, so
// the Lightning/Blits onboarding bundle can use it too — import this subpath
// (@weekend/ui/device) rather than the package root, which does pull React.
export { createPhoneModal, IPHONE_17_PRO } from './PhoneModal'
export type { PhoneModal, PhoneModalOptions } from './PhoneModal'
export {
  fitStage,
  STAGE_W,
  STAGE_H,
  FRAME_MARGIN,
  FRAME_BEZEL,
  FRAME_CHIN,
  TV_FRAME_CHROME,
} from './tvFrame'
export type { StageFit, StageReserve } from './tvFrame'
