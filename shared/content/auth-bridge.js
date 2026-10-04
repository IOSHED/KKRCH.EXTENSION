/**
 * Content script: auth bridge + same-origin API proxy.
 * Runs on cabinet / marketing origins so UA matches OAuth session fingerprint.
 */
(function () {
  const BRIDGE_BANNER_ID = 'kkext-auth-bridge-banner';
  const ext =
    typeof browser !== 'undefined' && browser.runtime ? browser : chrome;

  function readSession() {
    try {
      const access = localStorage.getItem('access_token');
      const refresh = localStorage.getItem('refresh_token');
      const expiresRaw = localStorage.getItem('access_token_expires_at');
      const fingerprint = localStorage.getItem('urlshortener_fingerprint');
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
  }

  function showBridgeBanner() {
    if (document.getElementById(BRIDGE_BANNER_ID)) return;
    const el = document.createElement('div');
    el.id = BRIDGE_BANNER_ID;
    el.setAttribute('role', 'status');
    const lang = (navigator.language || 'en').toLowerCase();
    const hints = {
      ru: 'Расширение ККОРОЧЕ: вход выполнен. Можно закрыть вкладку и вернуться к расширению.',
      fr: 'Extension KKOROCHE : connexion réussie. Vous pouvez fermer cet onglet et revenir à l’extension.',
      de: 'KKOROCHE-Erweiterung: Anmeldung erfolgreich. Sie können diesen Tab schließen und zur Erweiterung zurückkehren.',
      en: 'KKOROCHE extension: signed in. You can close this tab and return to the extension.',
    };
    const code = lang.startsWith('ru')
      ? 'ru'
      : lang.startsWith('fr')
        ? 'fr'
        : lang.startsWith('de')
          ? 'de'
          : 'en';
    el.textContent = hints[code];
    el.style.cssText = [
      'position:fixed',
      'z-index:2147483646',
      'left:50%',
      'bottom:20px',
      'transform:translateX(-50%)',
      'max-width:min(440px,calc(100vw - 24px))',
      'padding:12px 16px',
      'border-radius:12px',
      'background:oklch(0.50 0.19 240)',
      'color:#fff',
      'font:650 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'box-shadow:0 12px 40px oklch(0.50 0.19 240 / 0.35)',
      'text-align:center',
    ].join(';');
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }

  async function pushSessionIfAny() {
    const session = readSession();
    if (!session) return false;
    try {
      const res = await ext.runtime.sendMessage({ type: 'kkext.session', session });
      // Only celebrate after background actually stored a complete session.
      if (!res || res.ok !== true) return false;
      const url = new URL(location.href);
      if (url.searchParams.get('from') === 'extension') {
        showBridgeBanner();
      }
      return true;
    } catch {
      return false;
    }
  }

  ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return undefined;

    if (message.type === 'kkext.ping') {
      sendResponse({ ok: true, hasSession: Boolean(readSession()) });
      return false;
    }

    if (message.type === 'kkext.readSession') {
      sendResponse({ session: readSession() });
      return false;
    }

    if (message.type === 'kkext.api') {
      (async () => {
        try {
          const session = message.session || readSession();
          if (!session?.access_token) {
            sendResponse({ ok: false, status: 401, data: { kind: 'auth_error' }, error: 'no session' });
            return;
          }
          const path = String(message.path || '');
          const method = String(message.method || 'GET').toUpperCase();
          const apiBase = String(message.apiBasePath || '/api/v1');
          const url = `${location.origin}${apiBase}${path.startsWith('/') ? path : `/${path}`}`;

          /** @type {Record<string, string>} */
          const headers = {
            'Accept-Language': String(message.acceptLanguage || 'ru'),
            'X-Fingerprint': session.fingerprint,
            ...(message.headers || {}),
          };

          const isRefresh = path.includes('/auth/refresh');
          if (!isRefresh) {
            headers.Authorization = `Bearer ${session.access_token}`;
          } else if (!headers['X-Fingerprint']) {
            headers['X-Fingerprint'] = session.fingerprint;
          }

          let bodyText;
          if (message.body != null) {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            bodyText = typeof message.body === 'string' ? message.body : JSON.stringify(message.body);
          }

          const res = await fetch(url, { method, headers, body: bodyText });
          const text = await res.text();
          let data = null;
          if (text) {
            try {
              data = JSON.parse(text);
            } catch {
              data = { raw: text };
            }
          }
          sendResponse({ ok: res.ok, status: res.status, data });
        } catch (e) {
          sendResponse({
            ok: false,
            status: 0,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      })();
      return true;
    }

    return undefined;
  });

  // Initial + storage-driven sync (frontend writes tokens after OAuth).
  void pushSessionIfAny();

  window.addEventListener('storage', (ev) => {
    if (ev.key === 'access_token' || ev.key === 'refresh_token' || ev.key === 'urlshortener_fingerprint') {
      void pushSessionIfAny();
    }
  });

  // Same-tab OAuth completion does not fire `storage` — poll briefly after load.
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    void pushSessionIfAny().then((ok) => {
      if (ok || tries > 40) clearInterval(timer);
    });
  }, 500);
})();
