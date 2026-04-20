export interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-fg-muted uppercase tracking-widest">Room code</p>
      <p
        className="font-bold tabular-nums"
        style={{ fontSize: 'var(--type-code)', letterSpacing: '0.1em' }}
      >
        {code}
      </p>
    </div>
  );
}
