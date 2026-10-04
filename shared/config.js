/** @typedef {{
 *   mode: 'local' | 'prod',
 *   locale: string,
 *   siteOrigin: string,
 *   apiOrigin: string,
 *   shortHost: string,
 *   shortScheme: string,
 *   apiBasePath: string,
 *   acceptLanguage: string,
 *   qaEmail: string,
 * }} ExtConfig */

/**
 * Injected by scripts/build.mjs (`--local` or prod).
 * Do not edit by hand — override at runtime via chrome.storage.local.config.
 */
const BUILD_DEFAULTS = globalThis.__KKEXT_BUILD_DEFAULTS__ || {
  mode: 'prod',
  locale: 'auto',
  siteOrigin: 'https://ккрч.рф',
  apiOrigin: 'https://ккрч.рф',
  shortHost: 'ккрч.рф',
  shortScheme: 'https',
  apiBasePath: '/api/v1',
  acceptLanguage: 'en',
  qaEmail: 'extension-qa@kkrch.local',
};

const DEFAULT_CONFIG = Object.freeze({ ...BUILD_DEFAULTS });

/** @type {ExtConfig | null} */
let cached = null;

const kkext = (globalThis.kkext = globalThis.kkext || {});

kkext.DEFAULT_CONFIG = DEFAULT_CONFIG;

/** @returns {Promise<ExtConfig>} */
kkext.getConfig = async function getConfig() {
  if (cached) return cached;
  try {
    const data = kkext.storageGet
      ? await kkext.storageGet('config')
      : await new Promise((resolve) => {
          chrome.storage.local.get('config', resolve);
        });
    const override = data?.config && typeof data.config === 'object' ? data.config : {};
    const merged = { ...DEFAULT_CONFIG, ...override };
    if (DEFAULT_CONFIG.mode === 'local' && typeof merged.siteOrigin === 'string') {
      // Site is Vite on localhost — never the API host, never 127.0.0.1
      // (OAuth redirect_uri allowlist uses http://localhost:5173/home).
      if (/:(8000)\/?$/.test(merged.siteOrigin) || /127\.0\.0\.1:5173/.test(merged.siteOrigin)) {
        merged.siteOrigin = DEFAULT_CONFIG.siteOrigin;
      }
    }
    // Keep Accept-Language in sync with UI locale (auto → browser language).
    if (typeof kkext.detectLocale === 'function') {
      const loc = kkext.detectLocale(merged.locale === 'auto' ? null : merged.locale);
      merged.acceptLanguage = loc;
    } else if (typeof kkext.resolveLocale === 'function') {
      merged.acceptLanguage = kkext.resolveLocale(
        merged.locale === 'auto' ? null : merged.locale,
      );
    }
    cached = Object.freeze(merged);
  } catch {
    cached = DEFAULT_CONFIG;
  }
  return cached;
};

kkext.clearConfigCache = function clearConfigCache() {
  cached = null;
};

/** @param {ExtConfig} cfg @param {string} path */
kkext.apiUrl = function apiUrl(cfg, path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = (cfg.apiOrigin || cfg.siteOrigin || '').replace(/\/$/, '');
  return `${base}${cfg.apiBasePath}${p}`;
};

/**
 * Open the site auth page. OAuth `redirect_uri` is always `{siteOrigin}/home`
 * (provider console) — entry points (extension, future clients) only pass
 * `from` / `next`, never a separate redirect URI.
 *
 * @param {ExtConfig} cfg
 * @param {{ from?: string, next?: string }} [opts]
 */
kkext.authUrl = function authUrl(cfg, opts) {
  const u = new URL('/auth', cfg.siteOrigin);
  u.searchParams.set('from', opts?.from || 'extension');
  u.searchParams.set('next', opts?.next || '/home');
  return u.toString();
};

/** @param {ExtConfig} cfg */
kkext.billingUrl = function billingUrl(cfg) {
  return new URL('/home/checkout', cfg.siteOrigin).toString();
};

/** @param {ExtConfig} cfg */
kkext.homeUrl = function homeUrl(cfg) {
  const origin = String(cfg?.siteOrigin || DEFAULT_CONFIG.siteOrigin).replace(/\/$/, '');
  return `${origin}/home`;
};
