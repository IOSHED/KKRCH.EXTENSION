/**
 * Background: session storage + open tabs + pull tokens from site via scripting.
 */

/* global importScripts, kkext */

importScripts(
  '../lib/browser-api.js',
  '../config.js',
  '../i18n/ru.js',
  '../i18n/en.js',
  '../i18n/fr.js',
  '../i18n/de.js',
  '../i18n/index.js',
  '../lib/storage.js',
  '../lib/util.js',
  '../lib/api.js',
);

const ext = () => kkext.browser || chrome;

/** @type {number | null} */
let authTabId = null;

// Align Accept-Language with browser UI locale (same as popup).
void (async () => {
  try {
    const cfg = await kkext.getConfig();
    if (typeof kkext.applyLocale === 'function') {
      const code = kkext.applyLocale(cfg.locale === 'auto' ? null : cfg.locale);
      kkext.clearConfigCache?.();
      // Next getConfig() will re-read storage + set acceptLanguage = code via detectLocale.
      void code;
    }
  } catch {
    /* ignore */
  }
})();

function isSiteUrl(cfg, url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const site = new URL(cfg.siteOrigin);
    return u.origin === site.origin;
  } catch {
    return false;
  }
}

/**
 * Read frontend localStorage tokens from a tab (page world).
 * @param {number} tabId
 */
async function pullSessionFromTab(tabId) {
  const api = ext();
  if (!api.scripting?.executeScript) return null;

  const [{ result } = {}] = await api.scripting.executeScript({
    target: { tabId },
    func: () => {
      try {
        const access = localStorage.getItem('access_token');
        const refresh = localStorage.getItem('refresh_token');
        const expiresRaw = localStorage.getItem('access_token_expires_at');
        const fingerprint = localStorage.getItem('urlshortener_fingerprint') || '';
        // Fingerprint is required: refresh = hash(UA + X-Fingerprint).
        if (!access || !refresh || !fingerprint) return null;
        return {
          access_token: access,
          refresh_token: refresh,
          access_token_expires_at: expiresRaw ? Number(expiresRaw) : null,
          fingerprint,
        };
      } catch {
        return null;
      }
    },
  });

  return result || null;
}

async function savePulledSession(session) {
  const fp = session?.fingerprint != null ? String(session.fingerprint).trim() : '';
  if (!session?.access_token || !session?.refresh_token || !fp) return false;
  await kkext.saveSession({
    access_token: String(session.access_token),
    refresh_token: String(session.refresh_token),
    access_token_expires_at: session.access_token_expires_at ?? null,
    fingerprint: fp,
  });
  await kkext.saveSessionMeta({ kind: 'oauth' });
  await kkext.setAuthPending(false);
  authTabId = null;
  return true;
}

ext().tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  void (async () => {
    if (!(await kkext.isAuthPending()) && authTabId == null) return;
    if (authTabId != null && tabId !== authTabId) return;
    const cfg = await kkext.getConfig();
    if (!isSiteUrl(cfg, tab.url || '')) return;
    try {
      const session = await pullSessionFromTab(tabId);
      if (session) {
        await savePulledSession(session);
        console.info('[kkext] session pulled from tab', tabId);
      }
    } catch (e) {
      console.warn('[kkext] pullSessionFromTab failed', e);
    }
  })();
});

ext().runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return undefined;

  if (message.type === 'kkext.session' && message.session) {
    (async () => {
      const ok = await savePulledSession(message.session);
      sendResponse({ ok });
    })().catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'kkext.openAuth') {
    (async () => {
      const cfg = await kkext.getConfig();
      await kkext.setAuthPending(true);
      const tab = await ext().tabs.create({ url: kkext.authUrl(cfg), active: true });
      authTabId = tab.id ?? null;
      sendResponse({ ok: true, tabId: authTabId });
    })().catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (message.type === 'kkext.pullSiteSession') {
    (async () => {
      const cfg = await kkext.getConfig();
      const origin = cfg.siteOrigin.replace(/\/$/, '');
      const tabs = await kkext.tabsQuery({ url: [`${origin}/*`] });
      for (const tab of tabs || []) {
        if (tab.id == null) continue;
        try {
          const session = await pullSessionFromTab(tab.id);
          if (session && (await savePulledSession(session))) {
            sendResponse({ ok: true });
            return;
          }
        } catch {
          /* try next */
        }
      }
      sendResponse({ ok: false });
    })().catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'kkext.openBilling') {
    (async () => {
      const cfg = await kkext.getConfig();
      await ext().tabs.create({ url: kkext.billingUrl(cfg), active: true });
      sendResponse({ ok: true });
    })().catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (message.type === 'kkext.openHome') {
    (async () => {
      const cfg = await kkext.getConfig();
      await ext().tabs.create({ url: kkext.homeUrl(cfg), active: true });
      sendResponse({ ok: true });
    })().catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (message.type === 'kkext.logout') {
    (async () => {
      await kkext.clearSession();
      await kkext.setAuthPending(false);
      authTabId = null;
      sendResponse({ ok: true });
    })().catch(() => sendResponse({ ok: false }));
    return true;
  }

  void sender;
  return undefined;
});
