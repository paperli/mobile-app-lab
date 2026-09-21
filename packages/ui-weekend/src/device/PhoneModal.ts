/**
 * A draggable phone simulator shell, in plain DOM.
 *
 * Deliberately framework-neutral: the onboarding prototype is Lightning 3 +
 * Blits (no React in its bundle) and the hub is React, so the only thing they
 * can share is something that speaks DOM. React callers can wrap this — see
 * PhoneSimulatorModal.tsx.
 *
 * The caller owns what goes on screen; this owns the window, the drag, the
 * device outline and the aspect ratio.
 *
 * Import the stylesheet alongside it:
 *   import '@weekend/ui/device/phone-modal.css'
 */

/** iPhone 17 Pro logical screen, in points (2622 x 1206 @3x). */
export const IPHONE_17_PRO = { width: 402, height: 874 } as const

export interface PhoneModalOptions {
  /** Label in the drag bar. */
  title?: string
  /** Where the modal is mounted. Defaults to document.body. */
  container?: HTMLElement
  /** Rendered width in px. Height follows from the aspect ratio. */
  width?: number
  /** localStorage key for the remembered position. Pass null to not persist. */
  storageKey?: string | null
  /** Called after the modal closes (including via Escape or the close button). */
  onClose?: () => void
  /**
   * Element id for the modal. Set this when an existing stylesheet already
   * targets a phone panel by id and you want those descendant rules to keep
   * applying (the onboarding passes 'phone' for exactly that reason).
   */
  id?: string
}

export interface PhoneModal {
  /** The outer, draggable element. */
  readonly el: HTMLElement
  /** Fill this with the phone's UI. */
  readonly screen: HTMLElement
  open(): void
  close(): void
  toggle(): void
  readonly isOpen: boolean
  /** Re-centre in the viewport, discarding any remembered position. */
  resetPosition(): void
  destroy(): void
}

const MARGIN = 12

export function createPhoneModal(options: PhoneModalOptions = {}): PhoneModal {
  const {
    title = 'Phone · simulated controller',
    container = document.body,
    width = 300,
    storageKey = 'weekend.phoneModal.position',
    onClose,
    id,
  } = options

  const el = document.createElement('aside')
  el.className = 'wk-phone'
  if (id) el.id = id
  el.hidden = true
  el.style.setProperty('--wk-phone-width', `${width}px`)
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', title)

  el.innerHTML = `
    <header class="wk-phone__bar" tabindex="0" role="button" aria-label="Drag to move the phone simulator. Arrow keys nudge.">
      <span class="wk-phone__grip" aria-hidden="true"></span>
      <p class="wk-phone__title">${title}</p>
      <button type="button" class="wk-phone__close" aria-label="Close phone simulator">&times;</button>
    </header>
    <div class="wk-phone__frame phone-frame">
      <div class="wk-phone__island" aria-hidden="true"></div>
      <div class="wk-phone__screen phone-screen"></div>
      <div class="wk-phone__home" aria-hidden="true"></div>
    </div>
  `

  const bar = el.querySelector<HTMLElement>('.wk-phone__bar')!
  const closeButton = el.querySelector<HTMLButtonElement>('.wk-phone__close')!
  const screen = el.querySelector<HTMLElement>('.wk-phone__screen')!

  container.appendChild(el)

  // Position ------------------------------------------------------------
  // Kept in px against the viewport. Clamped on drag, on open and on resize,
  // so a remembered position from a larger window can't strand it offscreen.
  let x = 0
  let y = 0

  const size = () => ({
    w: el.offsetWidth || width,
    h: el.offsetHeight || width * (IPHONE_17_PRO.height / IPHONE_17_PRO.width),
  })

  function clamp(nextX: number, nextY: number) {
    const { w, h } = size()
    const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN)
    const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN)
    x = Math.min(Math.max(nextX, MARGIN), maxX)
    y = Math.min(Math.max(nextY, MARGIN), maxY)
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    el.style.right = 'auto'
    el.style.bottom = 'auto'
  }

  function defaultPosition() {
    const { w } = size()
    clamp(window.innerWidth - w - 24, 24)
  }

  function remember() {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ x, y }))
    } catch {
      /* Private mode, blocked storage: position just won't persist. */
    }
  }

  function restore() {
    if (!storageKey) return false
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return false
      const saved = JSON.parse(raw) as { x: number; y: number }
      if (!Number.isFinite(saved?.x) || !Number.isFinite(saved?.y)) return false
      clamp(saved.x, saved.y)
      return true
    } catch {
      return false
    }
  }

  // Tracks the last state the observer saw, so open()/close() and a direct
  // `hidden` flip don't double-fire.
  let wasOpen = false

  // Drag ----------------------------------------------------------------
  let dragging = false
  let originX = 0
  let originY = 0

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    if ((event.target as HTMLElement).closest('.wk-phone__close')) return
    dragging = true
    originX = event.clientX - x
    originY = event.clientY - y
    el.classList.add('is-dragging')
    bar.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return
    clamp(event.clientX - originX, event.clientY - originY)
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging) return
    dragging = false
    el.classList.remove('is-dragging')
    try {
      bar.releasePointerCapture(event.pointerId)
    } catch {
      /* Pointer already released. */
    }
    remember()
  }

  // Arrow keys nudge, so the modal is movable without a pointer.
  function onBarKeyDown(event: KeyboardEvent) {
    const step = event.shiftKey ? 40 : 10
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    event.stopPropagation()
    clamp(x + move[0], y + move[1])
    remember()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !el.hidden) {
      event.stopPropagation()
      api.close()
    }
  }

  function onResize() {
    if (!el.hidden) clamp(x, y)
  }

  // Callers can also open/close by flipping `hidden` directly — the onboarding
  // does exactly that when the flow reaches the checkout step. Watch for it so
  // the modal still gets positioned (and still reports closing) either way.
  const observer = new MutationObserver(() => {
    const open = !el.hidden
    if (open === wasOpen) return
    wasOpen = open
    if (open) {
      if (!restore()) defaultPosition()
    } else if (onClose) {
      onClose()
    }
  })
  observer.observe(el, { attributes: true, attributeFilter: ['hidden'] })

  bar.addEventListener('pointerdown', onPointerDown)
  bar.addEventListener('pointermove', onPointerMove)
  bar.addEventListener('pointerup', onPointerUp)
  bar.addEventListener('pointercancel', onPointerUp)
  bar.addEventListener('keydown', onBarKeyDown)
  el.addEventListener('keydown', onKeyDown)
  closeButton.addEventListener('click', () => api.close())
  window.addEventListener('resize', onResize)

  const api: PhoneModal = {
    el,
    screen,
    get isOpen() {
      return !el.hidden
    },
    open() {
      if (!el.hidden) return
      wasOpen = true
      el.hidden = false
      if (!restore()) defaultPosition()
    },
    close() {
      if (el.hidden) return
      wasOpen = false
      el.hidden = true
      if (onClose) onClose()
    },
    toggle() {
      if (el.hidden) api.open()
      else api.close()
    },
    resetPosition() {
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey)
        } catch {
          /* Nothing to clear. */
        }
      }
      defaultPosition()
      remember()
    },
    destroy() {
      bar.removeEventListener('pointerdown', onPointerDown)
      bar.removeEventListener('pointermove', onPointerMove)
      bar.removeEventListener('pointerup', onPointerUp)
      bar.removeEventListener('pointercancel', onPointerUp)
      bar.removeEventListener('keydown', onBarKeyDown)
      el.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
      el.remove()
    },
  }

  return api
}
