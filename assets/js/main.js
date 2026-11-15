// ---------- i18n ----------
// Strings live in assets/i18n/<lang>.json; available languages are listed in assets/i18n/languages.json.
// English is the base: any key missing from another language falls back to it.
const root = document.documentElement;
const DEFAULT_LANG = 'en';
let strings = {};

const tr = (key) => strings[key] ?? key;

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function pickLang(available) {
  const codes = Object.keys(available);
  const fromUrl = new URLSearchParams(location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem('tf-lang'); } catch (e) { /* ignore */ }
  const browser = (navigator.languages || [navigator.language]).map((l) => (l || '').slice(0, 2).toLowerCase());
  return [fromUrl, saved, ...browser].find((l) => l && codes.includes(l)) || DEFAULT_LANG;
}

function applyStrings() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = tr(el.dataset.i18n).replace('{year}', new Date().getFullYear());
  }
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = tr(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll('[data-i18n-alt]')) el.alt = tr(el.dataset.i18nAlt);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', tr(el.dataset.i18nAria));
  document.title = tr('meta.title');
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = tr('meta.description');
  syncThemeLabel();
}

async function setLang(lang) {
  let base = {}, over = {};
  try {
    base = await loadJSON(`assets/i18n/${DEFAULT_LANG}.json`);
    if (lang !== DEFAULT_LANG) over = await loadJSON(`assets/i18n/${lang}.json`);
  } catch (e) { console.error(e); }
  strings = { ...base, ...over };
  root.lang = lang;
  applyStrings();
  root.setAttribute('data-lang', lang);
}

async function initI18n() {
  let available = { [DEFAULT_LANG]: 'English' };
  try { available = await loadJSON('assets/i18n/languages.json'); } catch (e) { /* single language */ }
  const lang = pickLang(available);
  await setLang(lang);

  const select = document.querySelector('[data-lang-select]');
  if (select && Object.keys(available).length > 1) {
    for (const [code, name] of Object.entries(available)) select.add(new Option(name, code));
    select.value = lang;
    select.hidden = false;
    select.addEventListener('change', () => {
      try { localStorage.setItem('tf-lang', select.value); } catch (e) { /* ignore */ }
      setLang(select.value);
    });
  }
}

// ---------- Theme toggle ----------
const themeBtn = document.querySelector('[data-theme-toggle]');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function isDark() {
  const attr = root.getAttribute('data-theme');
  return attr ? attr === 'dark' : prefersDark.matches;
}

function syncThemeLabel() {
  if (themeBtn) themeBtn.textContent = isDark() ? tr('rail.themeLight') : tr('rail.themeDark');
}

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('tf-theme', next); } catch (e) { /* ignore */ }
    syncThemeLabel();
  });
}

// ---------- Reveal on scroll + waypoint scroll-spy ----------
const reveals = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  reveals.forEach((el) => io.observe(el));

  const links = new Map();
  document.querySelectorAll('.wpnav a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a, id) => a.classList.toggle('is-active', id === e.target.id));
    }
  }, { rootMargin: '-35% 0px -60% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
} else {
  reveals.forEach((el) => el.setAttribute('data-in', ''));
}

initI18n().finally(() => root.setAttribute('data-lang', root.lang || DEFAULT_LANG));
