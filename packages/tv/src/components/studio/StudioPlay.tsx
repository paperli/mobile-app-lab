import type { StudioPlayStatus, StudioQuestion } from '@mobile-app-lab/shared';
import { Trophy3D } from './Trophy3D';

const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";
const INK = '#F3F4F1';
const CANARY = 'rgb(var(--palette-canary-500))';
const GOOD = '#37d67a';
const BAD = '#ff5a6a';
const BG = 'radial-gradient(120% 90% at 50% -10%, #1a1442 0%, #0a0322 55%, #08060f 100%)';
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export interface StudioPlayProps {
  title: string;
  status: StudioPlayStatus;
  questionIndex: number;
  totalQuestions: number;
  question: StudioQuestion;
  selectedIndex: number | null;
  /** Option the phone's d-pad is hovering (question status only). */
  focusedIndex: number;
  score: number;
}

export function StudioPlay({
  title,
  status,
  questionIndex,
  totalQuestions,
  question,
  selectedIndex,
  focusedIndex,
  score,
}: StudioPlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: BG,
        color: INK,
        fontFamily: FONT,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '5vh 5vw',
        boxSizing: 'border-box',
      }}
    >
      {status === 'results' ? (
        <Results title={title} score={score} totalQuestions={totalQuestions} />
      ) : (
        <QuestionBoard
          title={title}
          status={status}
          questionIndex={questionIndex}
          totalQuestions={totalQuestions}
          question={question}
          selectedIndex={selectedIndex}
          focusedIndex={focusedIndex}
          score={score}
        />
      )}
    </div>
  );
}

function QuestionBoard({
  title,
  status,
  questionIndex,
  totalQuestions,
  question,
  selectedIndex,
  focusedIndex,
  score,
}: Omit<StudioPlayProps, never>) {
  const revealed = status === 'reveal';
  return (
    <>
      {/* Header: game title · progress · score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.6vw', fontWeight: 800, letterSpacing: '0.08em', color: CANARY }}>{title}</div>
        <div style={{ fontSize: '1.3vw', fontWeight: 700, color: 'rgba(243,244,241,0.6)' }}>
          Question {questionIndex + 1} / {totalQuestions}
        </div>
        <div style={{ fontSize: '1.6vw', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {score} <span style={{ color: 'rgba(243,244,241,0.5)', fontWeight: 600, fontSize: '1.1vw' }}>pts</span>
        </div>
      </div>

      {/* Prompt */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '26vh' }}>
        <h1 style={{ margin: 0, textAlign: 'center', maxWidth: '80vw', fontSize: '3.6vw', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.01em' }}>
          {question.prompt}
        </h1>
      </div>

      {/* Options grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.4vh 2.4vw', alignContent: 'center' }}>
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isPicked = i === selectedIndex;
          const isFocused = !revealed && i === focusedIndex;
          let border = '1px solid rgba(255,255,255,0.14)';
          let bg = 'rgba(255,255,255,0.05)';
          let badge = 'rgba(255,255,255,0.12)';
          let boxShadow = 'none';
          let transform = 'scale(1)';
          if (revealed && isCorrect) {
            border = `2px solid ${GOOD}`;
            bg = 'rgba(55,214,122,0.14)';
            badge = GOOD;
          } else if (revealed && isPicked && !isCorrect) {
            border = `2px solid ${BAD}`;
            bg = 'rgba(255,90,106,0.14)';
            badge = BAD;
          } else if (isFocused) {
            // The phone's d-pad cursor.
            border = `2.5px solid ${CANARY}`;
            bg = 'rgba(255,218,10,0.12)';
            badge = CANARY;
            boxShadow = '0 0 0 4px rgba(255,218,10,0.18), 0 10px 30px rgba(0,0,0,0.4)';
            transform = 'scale(1.03)';
          }
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.6vw',
                padding: '2.4vh 2vw',
                borderRadius: 18,
                border,
                background: bg,
                boxShadow,
                transform,
                transition: 'background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
              }}
            >
              <span
                style={{
                  flex: '0 0 auto',
                  width: '3.4vw',
                  height: '3.4vw',
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 12,
                  background: badge,
                  color: isFocused || (revealed && (isCorrect || isPicked)) ? '#0a0322' : INK,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6vw',
                  fontWeight: 800,
                }}
              >
                {OPTION_LETTERS[i]}
              </span>
              <span style={{ fontSize: '2vw', fontWeight: 600 }}>{opt}</span>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div style={{ textAlign: 'center', fontSize: '1.2vw', fontWeight: 700, color: revealed ? CANARY : 'rgba(243,244,241,0.55)' }}>
        {revealed ? 'Get ready for the next one…' : 'Use the d-pad on your phone, then press OK'}
      </div>
    </>
  );
}

function Results({ title, score, totalQuestions }: { title: string; score: number; totalQuestions: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Celebration: the trophy pops in spinning fast, eases to a slow spin,
          with confetti raining down. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Trophy3D spin="celebrate" scale={1.1} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '7vh',
          zIndex: 1,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.6vh',
        }}
      >
        <div style={{ fontSize: '1.6vw', fontWeight: 800, letterSpacing: '0.08em', color: CANARY }}>{title} · COMPLETE</div>
        <h1 style={{ margin: 0, fontSize: '4.4vw', fontWeight: 800, letterSpacing: '-0.02em' }}>
          You scored <span style={{ color: CANARY }}>{score}</span> points
        </h1>
        <p style={{ margin: 0, fontSize: '1.5vw', color: 'rgba(243,244,241,0.6)' }}>
          {totalQuestions} questions · press <b style={{ color: INK }}>OK</b> on your phone to play again
        </p>
      </div>
    </div>
  );
}
