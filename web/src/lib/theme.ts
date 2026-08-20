/**
 * Theme handling. The chosen theme is a data-theme attribute on <html>, which the
 * stylesheet keys off; "system" removes the attribute and lets prefers-color-scheme
 * decide. The choice persists in localStorage and is applied before first paint by a
 * tiny inline script in index.html (which must agree with DEFAULT_THEME).
 */

export const THEMES = [
  { id: 'system', label: 'System', hint: 'follow the OS' },
  { id: 'light', label: 'Light', hint: 'clean and bright' },
  { id: 'dark', label: 'Dark', hint: 'easy on the eyes' },
  { id: 'slate', label: 'Slate', hint: 'muted blue-grey' },
  { id: 'midnight', label: 'Midnight', hint: 'deep navy dark' },
  { id: 'paper', label: 'Paper', hint: 'warm, long reading' },
  { id: 'sage', label: 'Sage', hint: 'soft green calm' },
  { id: 'mist', label: 'Mist', hint: 'cool, low glare' },
  { id: 'forest', label: 'Forest', hint: 'warm green dark' },
  { id: 'dusk', label: 'Dusk', hint: 'amber, low blue' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

/** Used when the visitor has never picked a theme. Keep in sync with index.html. */
export const DEFAULT_THEME: ThemeId = 'slate';

const KEY = 'learnai.theme';

export function currentTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored && THEMES.some((t) => t.id === stored)) return stored as ThemeId;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_THEME;
}

export function applyTheme(theme: ThemeId): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* the theme still applies for this visit */
  }
}
