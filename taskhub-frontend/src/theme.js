// Centralized theme handling: light/dark, persisted to localStorage and
// applied as a `.dark` class on <html>. A CSS override layer in index.css
// remaps the app's slate/white palette when `.dark` is active, so individual
// pages don't need per-element dark: variants.

const STORAGE_KEY = 'theme';

export const getStoredTheme = () => {
  const t = localStorage.getItem(STORAGE_KEY);
  return t === 'dark' || t === 'light' ? t : 'light';
};

export const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
};

export const setTheme = (theme) => {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  localStorage.setItem(STORAGE_KEY, normalized);
  applyTheme(normalized);
  window.dispatchEvent(new CustomEvent('themechange', { detail: normalized }));
  return normalized;
};

export const toggleTheme = () => setTheme(getStoredTheme() === 'dark' ? 'light' : 'dark');

// Apply immediately on import so there's no flash before React mounts.
applyTheme(getStoredTheme());
