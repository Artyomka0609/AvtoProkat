import { useCallback, useEffect, useRef, useState } from 'react';

const storageKey = 'avtoprokat-theme';
const system = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function validChoice(value) {
  return value === 'dark' || value === 'light' ? value : null;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.bsTheme);
  const choice = useRef(null);
  const transition = useRef(null);

  const apply = useCallback(() => {
    const next = choice.current ?? (system.matches ? 'dark' : 'light');
    document.documentElement.dataset.bsTheme = next;
    document.querySelector('meta[name="theme-color"]').content = next === 'dark' ? '#141c18' : '#204e3a';
    setTheme(next);
  }, []);

  useEffect(() => {
    try { choice.current = validChoice(localStorage.getItem(storageKey)); } catch {}
    apply();
    function sync(event) {
      if (event.key !== storageKey && event.key !== null) return;
      choice.current = validChoice(event.newValue);
      apply();
    }
    system.addEventListener('change', apply);
    window.addEventListener('storage', sync);
    return () => {
      system.removeEventListener('change', apply);
      window.removeEventListener('storage', sync);
    };
  }, [apply]);

  function toggle(event) {
    const current = choice.current ?? document.documentElement.dataset.bsTheme;
    choice.current = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(storageKey, choice.current); } catch {}
    transition.current?.skipTransition();
    if (!document.startViewTransition || reducedMotion.matches) {
      apply();
      return;
    }
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const root = document.documentElement;
    root.style.setProperty('--theme-origin-x', (left + width / 2) + 'px');
    root.style.setProperty('--theme-origin-y', (top + height / 2) + 'px');
    transition.current = document.startViewTransition(apply);
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle}
      aria-label="Тёмная тема" aria-pressed={theme === 'dark'}
      title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <g className="theme-moon"><path d="M20.5 14.1A8.7 8.7 0 0 1 9.9 3.5a8.8 8.8 0 1 0 10.6 10.6Z"/></g>
        <g className="theme-sun"><circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g>
      </svg>
    </button>
  );
}
