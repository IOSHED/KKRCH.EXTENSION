const kkext = (globalThis.kkext = globalThis.kkext || {});

const REFRESH_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
/** @type {Promise<void> | null} */
let refreshInFlight = null;

/**
 * Prefer content-script fetch on a site tab (same User-Agent as OAuth).
 * Fingerprint = hash(UA + X-Fingerprint); direct extension fetch breaks refresh.
 */

/**
 * @param {ExtConfig} cfg
 * @returns {Promise<Array<{ id?: number }>>}
 */
async function findSiteTabs(cfg) {
  const origin = String(cfg.siteOrigin || '').replace(/\/$/, '');
  if (!origin || typeof kkext.tabsQuery !== 'function') return [];
  try {
    return (await kkext.tabsQuery({ url: [`${origin}/*`] })) || [];
  } catch {
    return [];
  }
}

/**
 * @param {ExtConfig} cfg
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, headers?: Record<string, string>, skipAuth?: boolean }} [options]
 */
async function fetchViaSiteTab(cfg, method, path, options = {}) {
  if (typeof kkext.tabsSendMessage !== 'function') return null;

  let tabs = await findSiteTabs(cfg);
  // Refresh must not hit extension UA — open a quiet site tab if needed.
  if (!tabs.length && path.includes('/auth/refresh') && typeof kkext.tabsCreate === 'function') {
    try {
      await kkext.tabsCreate({ url: kkext.homeUrl(cfg), active: false });
      await new Promise((r) => setTimeout(r, 900));
      tabs = await findSiteTabs(cfg);
    } catch {
      /* fall through */
    }
  }

  const session = options.skipAuth ? null : await kkext.getSession();
  for (const tab of tabs) {
    if (tab.id == null) continue;
    try {
      const resp = await kkext.tabsSendMessage(tab.id, {
        type: 'kkext.api',
        method,
        path,
        apiBasePath: cfg.apiBasePath || '/api/v1',
        acceptLanguage: kkext.locale || cfg.acceptLanguage || 'en',
        body: options.body,
        headers: options.headers || {},
        session,
      });
      if (resp && typeof resp === 'object' && typeof resp.status === 'number') {
        return {
          ok: Boolean(resp.ok),
          status: resp.status,
          data: resp.data,
          url: path,
          via: 'site',
        };
      }
    } catch {
      /* try next tab */
    }
  }
  return null;
}

/**
 * @param {ExtConfig} cfg
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, headers?: Record<string, string>, skipAuth?: boolean }} [options]
 */
async function fetchDirect(cfg, method, path, options = {}) {
  /** @type {Record<string, string>} */
  const headers = {
    'Accept-Language': kkext.locale || cfg.acceptLanguage || 'en',
    ...(options.headers || {}),
  };

  if (!options.skipAuth) {
    const session = await kkext.getSession();
    if (!session) {
      throw Object.assign(new Error('Не авторизован'), { kind: 'auth_error', status: 401 });
    }
    headers.Authorization = `Bearer ${session.access_token}`;
    if (session.fingerprint) {
      headers['X-Fingerprint'] = session.fingerprint;
    }
  }

  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const url = kkext.apiUrl(cfg, path);
  console.info('[kkext] fetch', method, url);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller?.signal,
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    console.info('[kkext] response', res.status, path);
    return { ok: res.ok, status: res.status, data, url, via: 'direct' };
  } catch (e) {
    console.error('[kkext] fetch failed', url, e);
    const err = new Error(
      e instanceof Error && e.name === 'AbortError'
        ? `Таймаут запроса: ${url}`
        : `Сеть: ${e instanceof Error ? e.message : String(e)} (${url})`,
    );
    err.kind = 'network_error';
    err.status = 0;
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * @param {ExtConfig} cfg
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, headers?: Record<string, string>, skipAuth?: boolean }} [options]
 */
async function fetchApi(cfg, method, path, options = {}) {
  const viaSite = await fetchViaSiteTab(cfg, method, path, options);
  if (viaSite) return viaSite;

  // Never refresh with a mismatched UA — that revokes the session server-side.
  if (path.includes('/auth/refresh')) {
    throw Object.assign(new Error(kkext.t('sessionExpired')), {
      kind: 'auth_error',
      status: 401,
    });
  }

  return fetchDirect(cfg, method, path, options);
}

/**
 * @param {ExtConfig} cfg
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, headers?: Record<string, string>, skipAuth?: boolean }} [options]
 */
kkext.apiRequest = async function apiRequest(cfg, method, path, options = {}) {
  if (!options.skipAuth) {
    await kkext.ensureFreshAccessToken(cfg);
  }

  const result = await fetchApi(cfg, method, path, options);

  if (!result.ok) {
    const err = new Error(result.data?.reason || result.data?.kind || `HTTP ${result.status}`);
    err.kind = result.data?.kind;
    err.status = result.status;
    err.payload = result.data;
    throw err;
  }
  return result.data;
};

/** @param {ExtConfig} cfg */
kkext.ensureFreshAccessToken = async function ensureFreshAccessToken(cfg) {
  const session = await kkext.getSession();
  if (!session) return;
  const expiresAt = session.access_token_expires_at;
  if (!expiresAt || expiresAt - Date.now() > REFRESH_MARGIN_MS) return;

  const meta = await kkext.getSessionMeta();
  if (meta?.kind === 'qa') {
    await kkext.loginWithQa(cfg, meta.email || cfg.qaEmail);
    return;
  }

  await kkext.refreshSession(cfg);
};

/** @param {ExtConfig} cfg */
kkext.refreshSession = async function refreshSession(cfg) {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const session = await kkext.getSession();
    if (!session?.refresh_token) {
      throw Object.assign(new Error('Нет refresh-токена'), { kind: 'auth_error', status: 401 });
    }
    if (!session.fingerprint) {
      await kkext.clearSession();
      throw Object.assign(new Error(kkext.t('sessionExpired')), {
        kind: 'auth_error',
        status: 401,
      });
    }

    const result = await fetchApi(cfg, 'POST', '/auth/refresh', {
      body: { refresh_token: session.refresh_token },
      headers: { 'X-Fingerprint': session.fingerprint },
      skipAuth: true,
    });

    if (!result.ok) {
      await kkext.clearSession();
      const err = new Error(result.data?.reason || kkext.t('sessionExpired'));
      err.kind = 'auth_error';
      err.status = result.status || 401;
      throw err;
    }

    const tokens = result.data?.tokens || result.data;
    if (!tokens?.access_token || !tokens?.refresh_token) {
      throw new Error('Некорректный ответ refresh');
    }

    await kkext.saveSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_token_expires_at: tokens.expires_in
        ? Date.now() + Number(tokens.expires_in) * 1000
        : session.access_token_expires_at,
      fingerprint: session.fingerprint,
    });
  })();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
};

/**
 * Local backend only (`APP_ENVIRONMENT=local`): POST /qa/session.
 * Not used by the extension UI (OAuth via site). Kept for DevTools smoke.
 * @param {ExtConfig} cfg
 * @param {string} [email]
 */
kkext.loginWithQa = async function loginWithQa(cfg, email) {
  const qaEmail = String(email || cfg.qaEmail || 'extension-qa@kkrch.local').trim();
  const data = await kkext.apiRequest(cfg, 'POST', '/qa/session', {
    skipAuth: true,
    body: { email: qaEmail },
  });

  if (!data?.access_token || !data?.refresh_token) {
    throw new Error('QA-сессия: нет токенов в ответе');
  }

  await kkext.saveSession({
    access_token: String(data.access_token),
    refresh_token: String(data.refresh_token),
    access_token_expires_at: data.expires_in
      ? Date.now() + Number(data.expires_in) * 1000
      : null,
    fingerprint: '',
  });
  await kkext.saveSessionMeta({ kind: 'qa', email: qaEmail });
  return data;
};

/** @param {ExtConfig} cfg */
kkext.fetchScopes = async function fetchScopes(cfg) {
  return kkext.apiRequest(cfg, 'GET', '/scopes');
};

/**
 * @param {ExtConfig} cfg
 * @param {{ name: string, description?: string }} body
 */
kkext.createScope = async function createScope(cfg, body) {
  return kkext.apiRequest(cfg, 'POST', '/scopes', { body });
};

/** @param {ExtConfig} cfg @param {number} scopeId */
kkext.fetchFolders = async function fetchFolders(cfg, scopeId) {
  return kkext.apiRequest(cfg, 'GET', `/folders/${scopeId}`);
};

/**
 * @param {ExtConfig} cfg
 * @param {number} scopeId
 * @param {{ name: string, parentId?: string | null }} input
 */
kkext.createFolder = async function createFolder(cfg, scopeId, input) {
  /** @type {Record<string, unknown>} */
  const folder = { name: String(input.name || '').trim() };
  if (input.parentId) folder.parent_id = input.parentId;
  return kkext.apiRequest(cfg, 'POST', `/folders/${scopeId}/bulk`, {
    body: { folders: [folder] },
  });
};

/**
 * @param {ExtConfig} cfg
 * @param {number} scopeId
 * @param {{ url: string, folderId?: string | null }} input
 */
kkext.createShort = async function createShort(cfg, scopeId, input) {
  /** @type {Record<string, unknown>} */
  const body = {
    targets: [{ url: String(input.url).trim(), weight: 100 }],
    short_name: '{random_suffix=8}',
    redirect_type: 302,
    is_captcha: false,
    currency: 'RUB',
  };
  if (input.folderId) body.folder_id = input.folderId;
  return kkext.apiRequest(cfg, 'POST', `/shorts/${scopeId}`, { body });
};
