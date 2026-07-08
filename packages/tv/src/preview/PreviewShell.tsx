import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { stories } from './stories';

export function PreviewShell() {
  const location = useLocation();
  return (
    <div className="flex w-full h-full bg-bg text-fg font-sans">
      <nav className="w-60 h-full border-r border-fg-10 p-4 overflow-y-auto">
        <h1 className="text-lg font-bold mb-4">UI Preview</h1>
        <ul className="space-y-1">
          {stories.map((s) => {
            const active = location.pathname === `/ui-preview/${s.slug}`;
            return (
              <li key={s.slug}>
                <Link
                  to={`/ui-preview/${s.slug}`}
                  className={`block px-3 py-2 rounded-card text-sm ${
                    active ? 'bg-fg-10' : 'hover:bg-fg-5'
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="flex-1 h-full overflow-auto p-8">
        <Routes>
          {stories.map((s) => (
            <Route key={s.slug} path={s.slug} element={<s.Component />} />
          ))}
          <Route path="*" element={<div className="text-fg-muted">Pick a story from the left.</div>} />
        </Routes>
      </main>
    </div>
  );
}
