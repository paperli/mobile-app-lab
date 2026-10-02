// A playback-clock timeline, not a collection of timers started at scene entry.
// A stalled/suspended player leaves its visuals at the same point in the take.
export function cueTimeline(cues) {
  const pending = cues.slice().sort((a, b) => a.at - b.at);
  let index = 0, cancelled = false;
  return {
    advance(seconds) {
      while (!cancelled && index < pending.length && pending[index].at <= seconds) {
        pending[index++].run();
      }
    },
    cancel() { cancelled = true; },
  };
}
