import { useEffect, useRef, useState } from 'react';
import { THEMES, applyTheme, currentTheme, type ThemeId } from '../lib/theme';

/** A small dropdown in the header. Each option shows a swatch of its palette. */
export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>(() => currentTheme());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  function choose(id: ThemeId) {
    applyTheme(id);
    setTheme(id);
    setOpen(false);
  }

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="theme-picker" ref={ref}>
      <button
        className="theme-button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${active.label}`}
        title="Change theme"
      >
        <span className="swatch" data-swatch={active.id} aria-hidden="true" />
        {active.label}
      </button>

      {open && (
        <ul className="theme-menu" role="listbox" aria-label="Choose a theme">
          {THEMES.map((t) => (
            <li key={t.id} role="option" aria-selected={t.id === theme}>
              <button className={t.id === theme ? 'selected' : ''} onClick={() => choose(t.id)}>
                <span className="swatch" data-swatch={t.id} aria-hidden="true" />
                <span className="theme-name">{t.label}</span>
                <span className="theme-hint">{t.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
