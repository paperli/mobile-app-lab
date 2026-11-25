// Sticky section shortcuts under the header: plain text links that scroll to
// their section. No "current section" highlight, by design.

export interface NavSection {
  id: string;
  label: string;
}

/** Space a jumped-to section needs under the sticky bar. Jumping down tucks
 *  the brand row away, so only the links bar is left on top. */
const LINKS_H = 44;
const offset = (goingDown: boolean) => (goingDown ? 0 : window.innerWidth >= 960 ? 68 : 56) + LINKS_H;

export function SectionNav({ sections }: { sections: NavSection[] }) {
  const go = (id: string) => {
    if (id === sections[0].id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    window.scrollTo({ top: top + window.scrollY - offset(top > 0), behavior: 'smooth' });
  };

  return (
    <nav className="sec-nav" aria-label="Page sections">
      <div className="sec-nav-track">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="sec-link"
            onClick={(e) => {
              // Hash routing owns location.hash, so scroll instead of navigating.
              e.preventDefault();
              go(s.id);
            }}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
