/**
 * Locale registry + t(). Bundled after ru/en/fr/de message tables.
 */
const kkext = (globalThis.kkext = globalThis.kkext || {});

const SUPPORTED = ['ru', 'en', 'fr', 'de'];

/**
 * @param {string | null | undefined} hint
 * @returns {'ru' | 'en' | 'fr' | 'de'}
 */
kkext.resolveLocale = function resolveLocale(hint) {
  const raw = String(hint || '').trim().toLowerCase().replace('_', '-');
  const primary = raw.split('-')[0] || '';
  if (primary === 'ru') return 'ru';
  if (primary === 'fr') return 'fr';
  if (primary === 'de') return 'de';
  if (primary === 'en') return 'en';
  // "ge" typo / legacy → German
  if (primary === 'ge' || primary === 'ger') return 'de';
  return 'en';
};

/**
 * Prefer config.locale, then browser UI language.
 * @param {string | null | undefined} [cfgLocale]
 */
kkext.detectLocale = function detectLocale(cfgLocale) {
  if (cfgLocale) return kkext.resolveLocale(cfgLocale);
  try {
    if (typeof navigator !== 'undefined') {
      const list = navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language || 'en'];
      for (const lang of list) {
        const code = kkext.resolveLocale(lang);
        if (SUPPORTED.includes(code) && (String(lang).toLowerCase().startsWith(code) || code === 'en')) {
          // Prefer first matching supported language from browser list
          if (
            String(lang).toLowerCase().startsWith('ru') ||
            String(lang).toLowerCase().startsWith('fr') ||
            String(lang).toLowerCase().startsWith('de') ||
            String(lang).toLowerCase().startsWith('en')
          ) {
            return code;
          }
        }
      }
      return kkext.resolveLocale(list[0]);
    }
  } catch {
    /* ignore */
  }
  return 'en';
};

/**
 * @param {string | null | undefined} [locale]
 */
kkext.applyLocale = function applyLocale(locale) {
  const code = kkext.detectLocale(locale);
  const table = (kkext.I18N && kkext.I18N[code]) || (kkext.I18N && kkext.I18N.en) || {};
  kkext.locale = code;
  kkext.messages = table;
  return code;
};

/**
 * @param {string} key
 * @param {Record<string, string | number> | string} [varsOrFallback]
 * @param {string} [fallback]
 */
kkext.t = function t(key, varsOrFallback, fallback) {
  const table = kkext.messages || {};
  let text = table[key];
  /** @type {Record<string, string | number> | null} */
  let vars = null;
  let fb = fallback;
  if (typeof varsOrFallback === 'string') {
    fb = varsOrFallback;
  } else if (varsOrFallback && typeof varsOrFallback === 'object') {
    vars = varsOrFallback;
  }
  if (typeof text !== 'string') text = typeof fb === 'string' ? fb : String(key);
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (_, name) =>
      vars[name] != null ? String(vars[name]) : `{${name}}`,
    );
  }
  return text;
};

// Default until popup/background call applyLocale.
if (!kkext.messages) {
  kkext.applyLocale('en');
}
