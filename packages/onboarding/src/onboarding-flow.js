export function skipDestination(phase) {
  if (phase <= 1) return null;
  if (phase === 2) return 3;
  if (phase === 3) return 4;
  if (phase <= 6) return 7;
  if (phase === 7) return 8;
  return 'hub';
}

export function nextFocus(buttons, current, key, puzzleReady) {
  const skip = buttons.findIndex(button => button.isSkip);
  if(skip<0&&!buttons.some(b=>b.type==='answer'))return buttons.length?0:-1;
  const answers = buttons.map((b, i) => b.type === 'answer' ? i : -1).filter(i => i >= 0);
  if (!answers.length || !puzzleReady) {
    if (key === 'right' || key === 'down') return skip;
    return -1;
  }
  if (current === skip) return key === 'left' || key === 'up' ? answers[3] : skip;
  const index = answers.indexOf(current);
  if (index < 0) return key === 'right' || key === 'down' ? skip : answers[0];
  if (key === 'right') return index % 2 === 0 ? answers[index + 1] : skip;
  if (key === 'down') return index < 2 ? answers[index + 2] : skip;
  if (key === 'left' && index % 2) return answers[index - 1];
  if (key === 'up' && index > 1) return answers[index - 2];
  return current;
}
