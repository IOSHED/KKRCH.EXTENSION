const kkext = (globalThis.kkext = globalThis.kkext || {});

/** Same set as frontend `lib/api/apiError.js` (UpgradeModal / paywall). */
const PAYWALL_KINDS = new Set([
  'scope_not_payed_error',
  'subdomain_not_payed_error',
  'short_name_not_payed_error',
  'transfer_not_payed_error',
  'api_key_not_payed_error',
  'custom_domain_not_payed_error',
  'shorts_batch_limit',
  'shorts_limit_reached',
  'shorts_plan_limit',
  'no_subdomains',
  'premium_subdomain_required',
  'subdomains_limit_reached',
]);

/**
 * @param {Response} res
 * @param {string} fallback
 */
kkext.throwApiError = async function throwApiError(res, fallback) {
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  const err = new Error(data.reason || data.kind || fallback);
  err.kind = typeof data.kind === 'string' ? data.kind : undefined;
  err.status = res.status;
  err.payload = data;
  throw err;
};

/** @param {unknown} err */
kkext.isPaywallError = function isPaywallError(err) {
  if (!err || typeof err !== 'object') return false;
  const e = /** @type {{ kind?: string, status?: number }} */ (err);
  const kind = typeof e.kind === 'string' ? e.kind : '';
  if (kind && PAYWALL_KINDS.has(kind)) return true;
  // Fallback: any 402 plan-limit / not_payed from API
  if (e.status === 402 && kind) {
    return (
      kind.includes('not_payed') ||
      kind.includes('limit') ||
      kind === 'no_subdomains' ||
      kind === 'premium_subdomain_required'
    );
  }
  return false;
};

/** @param {unknown} err */
kkext.isAuthError = function isAuthError(err) {
  if (!err || typeof err !== 'object') return false;
  const e = /** @type {{ kind?: string, status?: number }} */ (err);
  return e.status === 401 || e.kind === 'auth_error';
};

/**
 * @param {string} hostPart subdomain or empty
 * @param {string} shortName
 * @param {{ shortScheme: string, shortHost: string }} cfg
 */
kkext.buildShortPublicUrl = function buildShortPublicUrl(hostPart, shortName, cfg) {
  const clean = String(shortName || '').replace(/^\//, '');
  const authority = hostPart ? `${hostPart}.${cfg.shortHost}` : cfg.shortHost;
  return `${cfg.shortScheme}://${authority}/${clean}`;
};

/**
 * @param {Record<string, unknown>} short
 * @param {{ shortScheme: string, shortHost: string }} cfg
 */
kkext.buildShortCopyUrl = function buildShortCopyUrl(short, cfg) {
  return kkext.buildShortPublicUrl(
    short.subdomain ? String(short.subdomain) : '',
    String(short.short_name || ''),
    cfg,
  );
};

/** @param {string} raw */
kkext.validateLongUrl = function validateLongUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Flatten folders with indentation labels.
 * @param {Array<{ id: string, name: string, parent_id?: string | null, color?: string }>} folders
 * @returns {Array<{ id: string, name: string, label: string, depth: number, color?: string }>}
 */
kkext.flattenFolders = function flattenFolders(folders) {
  const byParent = new Map();
  for (const f of folders || []) {
    const pid = f.parent_id || null;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(f);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) =>
      String(a.name).localeCompare(String(b.name), kkext.locale || 'en'),
    );
  }
  /** @type {Array<{ id: string, name: string, label: string, depth: number, color?: string }>} */
  const out = [];
  function walk(parentId, depth) {
    const kids = byParent.get(parentId) || [];
    for (const f of kids) {
      const pad = depth > 0 ? `${'· '.repeat(depth)}` : '';
      out.push({
        id: String(f.id),
        name: String(f.name),
        label: `${pad}${f.name}`,
        depth,
        color: f.color,
      });
      walk(String(f.id), depth + 1);
    }
  }
  walk(null, 0);
  return out;
};
