import { QRCodeSVG } from 'qrcode.react';

export interface QRCardProps {
  url: string;
  size?: number;
}

export function QRCard({ url, size = 240 }: QRCardProps) {
  return (
    <div className="bg-white p-4 rounded-card flex flex-col items-center gap-3 text-[rgb(var(--palette-ink-950))]">
      <QRCodeSVG value={url} size={size} level="M" />
      <p className="text-sm font-medium">Scan to join</p>
    </div>
  );
}
