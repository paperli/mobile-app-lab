import Fuse from 'fuse.js';
import type { NavigationAction, NavigationDirection } from '@mobile-app-lab/shared';

export type VoiceIntent =
  | { kind: 'navigate'; direction: NavigationDirection; confidence: number; raw: string }
  | { kind: 'action'; action: NavigationAction; confidence: number; raw: string }
  | { kind: 'goto'; targetId: string; targetLabel: string; autoLaunch: boolean; confidence: number; raw: string };

export interface MatcherCandidate {
  id: string;
  label: string;
}

export interface MatcherContext {
  /** Candidates available for "goto X" / "play X" matching on the current screen. */
  candidates: readonly MatcherCandidate[];
}

// --- Verb dictionaries ---------------------------------------------------

const DIRECTION_PATTERNS: Array<{ direction: NavigationDirection; pattern: RegExp }> = [
  { direction: 'left',  pattern: /\b(?:go|move|scroll|nudge|swipe)?\s*left\b/i },
  { direction: 'right', pattern: /\b(?:go|move|scroll|nudge|swipe)?\s*right\b/i },
  { direction: 'up',    pattern: /\b(?:go|move|scroll|nudge|swipe)?\s*up\b/i },
  { direction: 'down',  pattern: /\b(?:go|move|scroll|nudge|swipe)?\s*down\b/i },
];

// "ok"-equivalent verbs that mean "select / launch the current focus"
const OK_PATTERN = /\b(start|play|launch|select|enter|go|confirm|begin|open it)\b/i;

// "back"-equivalent verbs
const BACK_PATTERN = /\b(back|cancel|return|exit|close)\b/i;

// "system"-equivalent verbs (open the system menu)
const SYSTEM_PATTERN = /\b(menu|settings|system|pause)\b/i;

// "Goto X" lead-ins — split into focus-only and focus-then-launch.
const FOCUS_LEADS = [
  /\b(?:go to|goto|jump to|switch to|navigate to|focus|focus on|select|highlight)\s+(.+)$/i,
];
const LAUNCH_LEADS = [
  /\b(?:play|launch|open|start|run)\s+(.+)$/i,
];

// --- Matcher -------------------------------------------------------------

const FUSE_THRESHOLD = 0.6;
const MIN_GOTO_CONFIDENCE = 0.35;

/**
 * Map a final transcript to an intent. Returns null when nothing fires.
 *
 * Confidence calibration:
 *  - direct verbs (left/right/start/back/etc.) → 1.0
 *  - bare "play" / "start" → 1.0 (treated as ok)
 *  - "go to X" → 1 - fuseScore against the candidate label (≥ MIN_GOTO_CONFIDENCE)
 */
export function matchVoice(transcript: string, ctx: MatcherContext): VoiceIntent | null {
  const raw = transcript.trim();
  if (!raw) return null;
  const text = raw.toLowerCase();

  // Pull the candidate target out of "go to X" / "play X" forms first so
  // those verbs don't get classified as bare ok actions. Launch verbs flip
  // autoLaunch on so the caller fires both focus + ok.
  for (const lead of LAUNCH_LEADS) {
    const m = text.match(lead);
    if (m && m[1]) {
      const target = m[1].trim().replace(/[.!?]+$/, '');
      const goto = matchGoto(target, ctx, true);
      if (goto) return { ...goto, raw };
    }
  }
  for (const lead of FOCUS_LEADS) {
    const m = text.match(lead);
    if (m && m[1]) {
      const target = m[1].trim().replace(/[.!?]+$/, '');
      const goto = matchGoto(target, ctx, false);
      if (goto) return { ...goto, raw };
    }
  }

  // Bare-target match: e.g. just "song quiz" with no leading verb. Treated
  // as focus-only so the user opts in to launching with a verb.
  const goto = matchGoto(text, ctx, false);

  // Directional verbs — checked before bare-target because someone saying
  // "left" alone shouldn't fuzzy-match a game called "Left 4 Dead".
  for (const { direction, pattern } of DIRECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { kind: 'navigate', direction, confidence: 1.0, raw };
    }
  }

  if (BACK_PATTERN.test(text)) {
    return { kind: 'action', action: 'back', confidence: 1.0, raw };
  }
  if (SYSTEM_PATTERN.test(text)) {
    return { kind: 'action', action: 'system', confidence: 1.0, raw };
  }
  if (OK_PATTERN.test(text)) {
    // "start" / "play" with no target → activate the current focus.
    return { kind: 'action', action: 'ok', confidence: 1.0, raw };
  }

  if (goto) return { ...goto, raw };

  return null;
}

function matchGoto(
  target: string,
  ctx: MatcherContext,
  autoLaunch: boolean,
): Omit<Extract<VoiceIntent, { kind: 'goto' }>, 'raw'> | null {
  if (!target || ctx.candidates.length === 0) return null;
  const fuse = new Fuse(ctx.candidates as MatcherCandidate[], {
    keys: ['label'],
    threshold: FUSE_THRESHOLD,
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
  });
  const results = fuse.search(target);
  if (results.length === 0) return null;
  const best = results[0];
  const confidence = 1 - (best.score ?? 1);
  if (confidence < MIN_GOTO_CONFIDENCE) return null;
  return {
    kind: 'goto',
    targetId: best.item.id,
    targetLabel: best.item.label,
    autoLaunch,
    confidence,
  };
}
