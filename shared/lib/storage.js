const kkext = (globalThis.kkext = globalThis.kkext || {});

const SESSION_KEYS = ['access_token', 'refresh_token', 'access_token_expires_at', 'fingerprint'];
const SESSION_META_KEY = 'session_meta';
const PREFS_KEY = 'prefs';
const AUTH_PENDING_KEY = 'auth_pending';

/**
 * @typedef {{
 *   access_token: string,
 *   refresh_token: string,
 *   access_token_expires_at?: number | null,
 *   fingerprint: string,
 * }} ExtSession
 */

/**
 * @typedef {{
 *   scopeId?: number | null,
 *   folderId?: string | null,
 *   projectSetupDone?: boolean,
 * }} ExtPrefs
 */

/** @returns {Promise<ExtSession | null>} */
kkext.getSession = async function getSession() {
  const data = await kkext.storageGet(SESSION_KEYS);
  // fingerprint may be empty for QA sessions (server used None)
  if (!data?.access_token || !data?.refresh_token) return null;
  return {
    access_token: String(data.access_token),
    refresh_token: String(data.refresh_token),
    access_token_expires_at: data.access_token_expires_at
      ? Number(data.access_token_expires_at)
      : null,
    fingerprint: data.fingerprint != null ? String(data.fingerprint) : '',
  };
};

/** @param {ExtSession} session */
kkext.saveSession = async function saveSession(session) {
  await kkext.storageSet({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    access_token_expires_at: session.access_token_expires_at ?? null,
    fingerprint: session.fingerprint ?? '',
  });
};

kkext.clearSession = async function clearSession() {
  await kkext.storageRemove([...SESSION_KEYS, SESSION_META_KEY]);
  await kkext.savePrefs({
    scopeId: null,
    folderId: null,
    projectSetupDone: false,
  });
};

/**
 * @typedef {{ kind?: 'qa' | 'oauth', email?: string }} ExtSessionMeta
 */

/** @returns {Promise<ExtSessionMeta | null>} */
kkext.getSessionMeta = async function getSessionMeta() {
  const data = await kkext.storageGet(SESSION_META_KEY);
  const meta = data?.[SESSION_META_KEY];
  return meta && typeof meta === 'object' ? meta : null;
};

/** @param {ExtSessionMeta} meta */
kkext.saveSessionMeta = async function saveSessionMeta(meta) {
  await kkext.storageSet({ [SESSION_META_KEY]: meta });
};

/** @returns {Promise<boolean>} */
kkext.isAuthenticated = async function isAuthenticated() {
  const session = await kkext.getSession();
  if (!session) return false;
  const meta = await kkext.getSessionMeta();
  // OAuth sessions need fingerprint (refresh = hash(UA + fp)). QA may omit it.
  if (meta?.kind === 'qa') return true;
  return Boolean(session.fingerprint);
};

/** @returns {Promise<ExtPrefs>} */
kkext.getPrefs = async function getPrefs() {
  const data = await kkext.storageGet(PREFS_KEY);
  const prefs = data?.[PREFS_KEY];
  if (!prefs || typeof prefs !== 'object') {
    return { scopeId: null, folderId: null, projectSetupDone: false };
  }
  return {
    scopeId: prefs.scopeId != null ? Number(prefs.scopeId) : null,
    folderId: prefs.folderId != null ? String(prefs.folderId) : null,
    projectSetupDone: Boolean(prefs.projectSetupDone),
  };
};

/** @param {ExtPrefs} prefs */
kkext.savePrefs = async function savePrefs(prefs) {
  const prev = await kkext.getPrefs();
  await kkext.storageSet({
    [PREFS_KEY]: {
      scopeId: prefs.scopeId !== undefined ? prefs.scopeId : prev.scopeId ?? null,
      folderId: prefs.folderId !== undefined ? prefs.folderId : prev.folderId ?? null,
      projectSetupDone:
        prefs.projectSetupDone !== undefined
          ? Boolean(prefs.projectSetupDone)
          : Boolean(prev.projectSetupDone),
    },
  });
};

kkext.setAuthPending = async function setAuthPending(pending) {
  await kkext.storageSet({ [AUTH_PENDING_KEY]: Boolean(pending) });
};

/** @returns {Promise<boolean>} */
kkext.isAuthPending = async function isAuthPending() {
  const data = await kkext.storageGet(AUTH_PENDING_KEY);
  return Boolean(data?.[AUTH_PENDING_KEY]);
};

/**
 * Read session tokens from the website localStorage (same keys as frontend).
 * @returns {ExtSession | null}
 */
kkext.readSiteSessionFromPage = function readSiteSessionFromPage() {
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
};
