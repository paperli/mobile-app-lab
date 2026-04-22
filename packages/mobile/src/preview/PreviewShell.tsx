import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { stories } from './stories';

export function PreviewShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = stories.find((s) => location.pathname === `/ui-preview/${s.slug}`);

  return (
    <div className="w-full h-full bg-bg text-fg font-sans flex flex-col">
      <div className="p-3 border-b border-fg-10 flex items-center gap-2">
        <span className="text-sm text-fg-muted">UI Preview:</span>
        <select
          className="bg-bg-elevated text-fg px-2 py-1 rounded-card text-sm flex-1"
          value={current?.slug ?? ''}
          onChange={(e) => navigate(`/ui-preview/${e.target.value}`)}
        >
          <option value="" disabled>Pick a story…</option>
          {stories.map((s) => (
            <option key={s.slug} value={s.slug}>{s.label}</option>
          ))}
        </select>
      </div>
      <main className="flex-1 overflow-auto p-4">
        <Routes>
          {stories.map((s) => (
            <Route key={s.slug} path={s.slug} element={<s.Component />} />
          ))}
          <Route path="*" element={<div className="text-fg-muted">Pick a story above.</div>} />
        </Routes>
      </main>
    </div>
  );
}
