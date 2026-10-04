/* global kkext */

(function () {
  /** @type {string} */
  let view = 'loading';
  /** @type {any} */
  let cfg = null;
  /** @type {Array<{ id: number, name: string }>} */
  let scopes = [];
  /** @type {Array<{ id: string, name: string, label: string }>} */
  let foldersFlat = [];
  let selectedScopeId = /** @type {number | null} */ (null);
  let selectedFolderId = /** @type {string | null} */ (null);
  let createdShortUrl = '';
  let submitting = false;
  let authPollTimer = /** @type {ReturnType<typeof setInterval> | null} */ (null);
  const CREATE_SCOPE_VALUE = '__create__';
  const CREATE_FOLDER_VALUE = '__create__';

  const VIEWS = [
    'view-loading',
    'view-auth',
    'view-project',
    'view-create',
    'view-settings',
    'view-result',
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  function t(key, varsOrFallback, fallback) {
    try {
      if (kkext && typeof kkext.t === 'function') {
        return kkext.t(key, varsOrFallback, fallback);
      }
    } catch {
      /* ignore */
    }
    if (typeof varsOrFallback === 'string') return varsOrFallback;
    return fallback || key;
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && 'placeholder' in el) el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
    if (kkext.locale) document.documentElement.lang = kkext.locale;
    document.title = t('brand');
  }

  function fitPopupHeight() {
    // Firefox keeps the previous popup height unless we pin it to content.
    const app = $('app') || document.body;
    const modal = $('paywall-modal');
    const modalOpen = modal && !modal.classList.contains('hidden');
    const h = Math.ceil(
      modalOpen
        ? Math.max(app.getBoundingClientRect().height, 360)
        : app.getBoundingClientRect().height,
    );
    if (h < 1) return;
    document.documentElement.style.height = `${h}px`;
    document.body.style.height = `${h}px`;
  }

  function showView(name) {
    view = name;
    for (const id of VIEWS) {
      const el = $(id);
      if (el) el.classList.toggle('hidden', id !== `view-${name}`);
    }
    document.documentElement.style.height = 'auto';
    document.body.style.height = 'auto';
    requestAnimationFrame(() => {
      fitPopupHeight();
      requestAnimationFrame(fitPopupHeight);
    });
  }

  /** @param {string} [reason] */
  function showPaywall(reason) {
    const modal = $('paywall-modal');
    const text = $('paywall-reason');
    if (text) {
      text.textContent = reason || t('paywallDefault');
    }
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    }
    fitPopupHeight();
  }

  function hidePaywall() {
    const modal = $('paywall-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
    fitPopupHeight();
  }

  /** @param {unknown} e @param {string} [fallback] */
  function handlePaywallOrThrow(e, fallback) {
    if (kkext.isPaywallError(e)) {
      showPaywall(e instanceof Error ? e.message : fallback);
      return true;
    }
    return false;
  }

  function showNote(id, text, isWarn) {
    const el = $(id);
    if (!el) return;
    if (!text) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = text;
    el.classList.toggle('note-warn', Boolean(isWarn));
    el.classList.remove('hidden');
  }

  function openHome() {
    void (async () => {
      try {
        if (!cfg) cfg = await kkext.getConfig();
        const url = kkext.homeUrl(cfg);
        if (typeof kkext.tabsCreate === 'function') {
          await kkext.tabsCreate({ url, active: true });
          return;
        }
      } catch {
        /* fall through */
      }
      void kkext.runtimeSendMessage?.({ type: 'kkext.openHome' });
    })();
  }

  function setAuthWaiting(on, text) {
    showNote(
      'auth-waiting',
      on ? text || t('authWaiting') : '',
      false,
    );
    const cancel = $('btn-cancel-wait');
    if (cancel) cancel.classList.toggle('hidden', !on);
  }

  function stopAuthPoll() {
    if (authPollTimer) {
      clearInterval(authPollTimer);
      authPollTimer = null;
    }
  }

  function startAuthPoll() {
    stopAuthPoll();
    setAuthWaiting(true);
    authPollTimer = setInterval(async () => {
      try {
        if (typeof kkext.isAuthenticated === 'function' && (await kkext.isAuthenticated())) {
          stopAuthPoll();
          setAuthWaiting(false);
          await afterLogin();
        }
      } catch {
        /* keep polling */
      }
    }, 800);
  }

  async function openAuth() {
    try {
      await kkext.runtimeSendMessage({ type: 'kkext.openAuth' });
      startAuthPoll();
    } catch (e) {
      showNote('auth-waiting', e instanceof Error ? e.message : t('loginFailed'), true);
    }
  }

  /**
   * @param {HTMLSelectElement | null} sel
   * @param {number | null} selectedId
   * @param {{ preferCreate?: boolean }} [opts]
   */
  function fillScopeSelect(sel, selectedId, opts) {
    if (!sel) return;
    sel.innerHTML = '';

    const createOpt = document.createElement('option');
    createOpt.value = CREATE_SCOPE_VALUE;
    createOpt.textContent = t('projectCreateOption');
    sel.appendChild(createOpt);

    for (const s of scopes) {
      const opt = document.createElement('option');
      opt.value = String(s.id);
      opt.textContent = s.name;
      sel.appendChild(opt);
    }

    if (opts?.preferCreate || selectedId == null || !scopes.some((s) => s.id === selectedId)) {
      sel.value = CREATE_SCOPE_VALUE;
    } else {
      sel.value = String(selectedId);
    }
  }

  /**
   * Swap select ↔ text input (optional action row) in the same field.
   * @param {string} selectId
   * @param {string} inputId
   * @param {boolean} creating
   * @param {string} [rowId]
   */
  function syncSwapInput(selectId, inputId, creating, rowId) {
    const sel = /** @type {HTMLSelectElement | null} */ ($(selectId));
    const input = /** @type {HTMLInputElement | null} */ ($(inputId));
    const row = rowId ? $(rowId) : null;
    if (!sel || !input) return;
    sel.classList.toggle('hidden', creating);
    if (row) {
      row.classList.toggle('hidden', !creating);
    } else {
      input.classList.toggle('hidden', !creating);
    }
    if (creating) {
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }
    fitPopupHeight();
  }

  /**
   * @param {string} selectId
   * @param {string} inputId
   * @param {string} createValue
   * @param {string} fallbackValue
   * @param {string} [rowId]
   */
  function cancelSwapCreate(selectId, inputId, createValue, fallbackValue, rowId) {
    const sel = /** @type {HTMLSelectElement | null} */ ($(selectId));
    const input = /** @type {HTMLInputElement | null} */ ($(inputId));
    if (input) input.value = '';
    if (sel) {
      if (sel.value === createValue) sel.value = fallbackValue;
    }
    syncSwapInput(selectId, inputId, false, rowId);
  }

  function renderFolders() {
    const sel = /** @type {HTMLSelectElement | null} */ ($('folder-select'));
    if (!sel) return;
    sel.innerHTML = '';

    const createOpt = document.createElement('option');
    createOpt.value = CREATE_FOLDER_VALUE;
    createOpt.textContent = t('folderCreateOption');
    sel.appendChild(createOpt);

    const root = document.createElement('option');
    root.value = '';
    root.textContent = t('folderRoot');
    sel.appendChild(root);

    for (const f of foldersFlat) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.label;
      sel.appendChild(opt);
    }

    if (selectedFolderId && foldersFlat.some((f) => f.id === selectedFolderId)) {
      sel.value = selectedFolderId;
    } else {
      sel.value = '';
    }

    const nameInput = /** @type {HTMLInputElement | null} */ ($('folder-new-name'));
    if (nameInput) nameInput.value = '';
    syncSwapInput('folder-select', 'folder-new-name', false, 'folder-new-row');
  }

  function updateCreateHint() {
    const el = $('create-project-hint');
    if (!el) return;
    const scope = scopes.find((s) => s.id === selectedScopeId);
    el.textContent = scope ? t('savingTo', { name: scope.name }) : '';
  }

  async function loadScopes() {
    if (!cfg) cfg = await kkext.getConfig();
    const data = await kkext.withTimeout(kkext.fetchScopes(cfg), 8000, 'scopes');
    scopes = (data.scopes || []).map((s) => ({
      id: Number(s.id),
      name: String(s.name || `${t('projectLabel')} ${s.id}`),
    }));
  }

  async function loadFoldersForScope(scopeId) {
    if (!cfg || scopeId == null) {
      foldersFlat = [];
      selectedFolderId = null;
      renderFolders();
      return;
    }
    try {
      const data = await kkext.withTimeout(kkext.fetchFolders(cfg, scopeId), 8000, 'folders');
      const list = data.folders || data || [];
      foldersFlat = kkext.flattenFolders(Array.isArray(list) ? list : []);
      const prefs = await kkext.getPrefs();
      selectedFolderId =
        prefs.folderId && foldersFlat.some((f) => f.id === prefs.folderId) ? prefs.folderId : null;
    } catch {
      foldersFlat = [];
      selectedFolderId = null;
    }
    renderFolders();
  }

  async function afterLogin() {
    showView('loading');
    try {
      await loadScopes();
      const prefs = await kkext.getPrefs();
      const savedOk = prefs.scopeId != null && scopes.some((s) => s.id === prefs.scopeId);
      if (!prefs.projectSetupDone || !savedOk) {
        selectedScopeId = savedOk ? prefs.scopeId : scopes[0]?.id ?? null;
        fillScopeSelect(
          /** @type {HTMLSelectElement | null} */ ($('project-select')),
          selectedScopeId,
          { preferCreate: !scopes.length },
        );
        const nameInput = /** @type {HTMLInputElement | null} */ ($('project-new-name'));
        if (nameInput) nameInput.value = '';
        showNote('project-error', '', true);
        showView('project');
        syncSwapInput(
          'project-select',
          'project-new-name',
          /** @type {HTMLSelectElement} */ ($('project-select')).value === CREATE_SCOPE_VALUE,
        );
        return;
      }
      selectedScopeId = prefs.scopeId;
      await showCreateFlow();
    } catch (e) {
      try {
        await kkext.clearSession();
      } catch {
        /* ignore */
      }
      showView('auth');
      showNote('auth-waiting', e instanceof Error ? e.message : t('loadFailed'), true);
    }
  }

  async function showCreateFlow() {
    updateCreateHint();
    await loadFoldersForScope(selectedScopeId);
    await prefillActiveTabUrl();
    showView('create');
  }

  async function continueProjectSetup() {
    const nameInput = /** @type {HTMLInputElement | null} */ ($('project-new-name'));
    const select = /** @type {HTMLSelectElement | null} */ ($('project-select'));
    showNote('project-error', '', true);

    try {
      if (select?.value === CREATE_SCOPE_VALUE) {
        const newName = (nameInput?.value || '').trim();
        if (!newName) {
          showNote('project-error', t('projectNeedName'), true);
          syncSwapInput('project-select', 'project-new-name', true);
          return;
        }
        if (!cfg) cfg = await kkext.getConfig();
        const created = await kkext.createScope(cfg, { name: newName });
        const scope = created.scope || created;
        selectedScopeId = Number(scope.id);
        await loadScopes();
      } else {
        const v = select?.value || '';
        selectedScopeId = v ? Number(v) : null;
      }

      if (selectedScopeId == null || Number.isNaN(selectedScopeId)) {
        showNote('project-error', t('projectNeedSelect'), true);
        return;
      }

      await kkext.savePrefs({
        scopeId: selectedScopeId,
        folderId: null,
        projectSetupDone: true,
      });
      await showCreateFlow();
    } catch (e) {
      if (handlePaywallOrThrow(e, t('projectLimit'))) return;
      showNote('project-error', e instanceof Error ? e.message : t('projectSaveFailed'), true);
    }
  }

  async function openSettings() {
    showView('loading');
    try {
      await loadScopes();
      const prefs = await kkext.getPrefs();
      if (prefs.scopeId != null && scopes.some((s) => s.id === prefs.scopeId)) {
        selectedScopeId = prefs.scopeId;
      }
      fillScopeSelect(
        /** @type {HTMLSelectElement | null} */ ($('settings-scope-select')),
        selectedScopeId,
      );
      const nameInput = /** @type {HTMLInputElement | null} */ ($('settings-new-name'));
      if (nameInput) nameInput.value = '';
      showNote('settings-error', '', true);
      showView('settings');
      syncSwapInput('settings-scope-select', 'settings-new-name', false, 'settings-new-row');
    } catch (e) {
      showView('create');
      showNote('create-error', e instanceof Error ? e.message : t('settingsOpenFailed'), true);
    }
  }

  async function onSettingsScopeChange() {
    const select = /** @type {HTMLSelectElement | null} */ ($('settings-scope-select'));
    showNote('settings-error', '', true);
    if (!select || select.value === CREATE_SCOPE_VALUE) {
      syncSwapInput('settings-scope-select', 'settings-new-name', true, 'settings-new-row');
      return;
    }
    const id = Number(select.value);
    if (Number.isNaN(id)) {
      showNote('settings-error', t('projectNeedSelect'), true);
      return;
    }
    selectedScopeId = id;
    await kkext.savePrefs({
      scopeId: selectedScopeId,
      folderId: null,
      projectSetupDone: true,
    });
    syncSwapInput('settings-scope-select', 'settings-new-name', false, 'settings-new-row');
    await showCreateFlow();
  }

  async function createScopeFromSettings() {
    const nameInput = /** @type {HTMLInputElement | null} */ ($('settings-new-name'));
    const name = (nameInput?.value || '').trim();
    if (!name) {
      showNote('settings-error', t('projectNeedName'), true);
      syncSwapInput('settings-scope-select', 'settings-new-name', true, 'settings-new-row');
      return;
    }
    try {
      if (!cfg) cfg = await kkext.getConfig();
      const created = await kkext.createScope(cfg, { name });
      const scope = created.scope || created;
      selectedScopeId = Number(scope.id);
      await loadScopes();
      await kkext.savePrefs({
        scopeId: selectedScopeId,
        folderId: null,
        projectSetupDone: true,
      });
      if (nameInput) nameInput.value = '';
      showNote('settings-error', '', true);
      await showCreateFlow();
    } catch (e) {
      if (handlePaywallOrThrow(e, t('projectLimit'))) return;
      showNote('settings-error', e instanceof Error ? e.message : t('projectCreateFailed'), true);
    }
  }

  async function ensureFolderForSubmit() {
    const sel = /** @type {HTMLSelectElement | null} */ ($('folder-select'));
    const nameInput = /** @type {HTMLInputElement | null} */ ($('folder-new-name'));
    if (!sel || sel.value !== CREATE_FOLDER_VALUE) {
      return selectedFolderId;
    }
    const name = (nameInput?.value || '').trim();
    if (!name) {
      throw Object.assign(new Error(t('folderNeedName')), { kind: 'folder_name_required' });
    }
    if (!cfg || selectedScopeId == null) {
      throw new Error(t('noScope'));
    }
    const created = await kkext.createFolder(cfg, selectedScopeId, { name });
    const folders = created.folders || [];
    const folder = folders[0];
    if (!folder?.id) {
      const err0 = (created.errors || [])[0];
      throw new Error(err0?.reason || err0?.kind || t('folderCreateFailed'));
    }
    selectedFolderId = String(folder.id);
    if (nameInput) nameInput.value = '';
    await loadFoldersForScope(selectedScopeId);
    return selectedFolderId;
  }

  async function prefillActiveTabUrl() {
    const input = /** @type {HTMLInputElement | null} */ ($('long-url'));
    if (!input || input.value.trim()) return;
    try {
      const tabs = await kkext.withTimeout(
        kkext.tabsQuery({ active: true, currentWindow: true }),
        1500,
        'tab',
      );
      const url = tabs?.[0]?.url || '';
      if (/^https?:\/\//i.test(url)) input.value = url;
    } catch {
      /* ignore */
    }
  }

  async function submitCreate() {
    if (!cfg || submitting || selectedScopeId == null) return;
    const input = /** @type {HTMLInputElement | null} */ ($('long-url'));
    const btn = /** @type {HTMLButtonElement | null} */ ($('btn-submit'));
    if (!input || !btn) return;

    showNote('url-error', '', true);
    showNote('create-error', '', true);
    const longUrl = input.value.trim();
    if (!longUrl) {
      showNote('url-error', t('needUrl'), true);
      return;
    }
    if (!kkext.validateLongUrl(longUrl)) {
      showNote('url-error', t('needFullUrl'), true);
      return;
    }

    submitting = true;
    btn.disabled = true;
    btn.textContent = t('submitting');
    try {
      let folderId;
      try {
        folderId = await ensureFolderForSubmit();
      } catch (e) {
        if (e && typeof e === 'object' && /** @type {{ kind?: string }} */ (e).kind === 'folder_name_required') {
          showNote('create-error', e instanceof Error ? e.message : t('folderNeedName'), true);
          syncSwapInput('folder-select', 'folder-new-name', true, 'folder-new-row');
          return;
        }
        throw e;
      }
      await kkext.savePrefs({
        scopeId: selectedScopeId,
        folderId,
        projectSetupDone: true,
      });
      const data = await kkext.createShort(cfg, selectedScopeId, {
        url: longUrl,
        folderId,
      });
      const short = data.short || data;
      createdShortUrl = kkext.buildShortCopyUrl(short, cfg);
      const el = $('short-url');
      if (el) el.textContent = createdShortUrl;
      const copyBtn = $('btn-copy');
      if (copyBtn) copyBtn.textContent = t('copy');
      showView('result');
    } catch (e) {
      if (handlePaywallOrThrow(e, t('paywallShorts'))) {
        /* modal open */
      } else if (kkext.isAuthError(e)) {
        await kkext.clearSession();
        showView('auth');
        showNote('auth-waiting', t('sessionExpired'), true);
      } else {
        showNote(
          'create-error',
          e instanceof Error ? e.message : t('createFailed'),
          true,
        );
      }
    } finally {
      submitting = false;
      btn.disabled = false;
      btn.textContent = t('submit');
    }
  }

  async function copyShort() {
    const btn = $('btn-copy');
    try {
      await navigator.clipboard.writeText(createdShortUrl);
      if (btn) btn.textContent = t('copied');
      setTimeout(() => {
        if (btn) btn.textContent = t('copy');
      }, 1600);
    } catch {
      /* ignore */
    }
  }

  function bind() {
    document.querySelectorAll('[data-open-home]').forEach((el) => {
      el.addEventListener('click', () => openHome());
    });

    on('btn-login', 'click', () => void openAuth());
    on('btn-cancel-wait', 'click', () => {
      stopAuthPoll();
      setAuthWaiting(false);
      void kkext.setAuthPending?.(false);
    });

    on('btn-project-continue', 'click', () => void continueProjectSetup());
    on('project-select', 'change', () => {
      const sel = /** @type {HTMLSelectElement | null} */ ($('project-select'));
      syncSwapInput('project-select', 'project-new-name', sel?.value === CREATE_SCOPE_VALUE);
    });
    on('btn-settings', 'click', () => void openSettings());
    on('btn-settings-back', 'click', () => void showCreateFlow());
    on('settings-scope-select', 'change', () => {
      void onSettingsScopeChange();
    });
    on('btn-settings-create', 'click', () => void createScopeFromSettings());
    on('btn-settings-cancel', 'click', () => {
      cancelSwapCreate(
        'settings-scope-select',
        'settings-new-name',
        CREATE_SCOPE_VALUE,
        selectedScopeId != null ? String(selectedScopeId) : CREATE_SCOPE_VALUE,
        'settings-new-row',
      );
    });
    on('settings-new-name', 'keydown', (e) => {
      const key = /** @type {KeyboardEvent} */ (e).key;
      if (key === 'Enter') {
        e.preventDefault();
        void createScopeFromSettings();
      } else if (key === 'Escape') {
        e.preventDefault();
        cancelSwapCreate(
          'settings-scope-select',
          'settings-new-name',
          CREATE_SCOPE_VALUE,
          selectedScopeId != null ? String(selectedScopeId) : CREATE_SCOPE_VALUE,
          'settings-new-row',
        );
      }
    });

    on('btn-logout', 'click', () => {
      void (async () => {
        try {
          await kkext.clearSession();
        } catch {
          /* ignore */
        }
        showView('auth');
      })();
    });

    on('btn-submit', 'click', () => void submitCreate());
    on('btn-back', 'click', () => {
      const input = /** @type {HTMLInputElement | null} */ ($('long-url'));
      if (input) input.value = '';
      void showCreateFlow();
    });
    on('btn-copy', 'click', () => void copyShort());
    on('btn-billing', 'click', () => {
      hidePaywall();
      void (async () => {
        try {
          if (!cfg) cfg = await kkext.getConfig();
          const url = kkext.billingUrl(cfg);
          if (typeof kkext.tabsCreate === 'function') {
            await kkext.tabsCreate({ url, active: true });
            return;
          }
        } catch {
          /* fall through */
        }
        void kkext.runtimeSendMessage?.({ type: 'kkext.openBilling' });
      })();
    });
    on('btn-paywall-close', 'click', () => hidePaywall());
    on('paywall-backdrop', 'click', () => hidePaywall());

    on('folder-select', 'change', (e) => {
      void (async () => {
        const v = /** @type {HTMLSelectElement} */ (e.currentTarget).value;
        if (v === CREATE_FOLDER_VALUE) {
          selectedFolderId = null;
          syncSwapInput('folder-select', 'folder-new-name', true, 'folder-new-row');
          return;
        }
        selectedFolderId = v || null;
        syncSwapInput('folder-select', 'folder-new-name', false, 'folder-new-row');
        await kkext.savePrefs({ folderId: selectedFolderId });
      })();
    });

    on('btn-folder-cancel', 'click', () => {
      cancelSwapCreate('folder-select', 'folder-new-name', CREATE_FOLDER_VALUE, '', 'folder-new-row');
      selectedFolderId = null;
      void kkext.savePrefs({ folderId: null });
    });

    on('folder-new-name', 'keydown', (e) => {
      const key = /** @type {KeyboardEvent} */ (e).key;
      if (key === 'Enter') {
        e.preventDefault();
        void submitCreate();
      } else if (key === 'Escape') {
        e.preventDefault();
        cancelSwapCreate('folder-select', 'folder-new-name', CREATE_FOLDER_VALUE, '', 'folder-new-row');
        selectedFolderId = null;
        void kkext.savePrefs({ folderId: null });
      }
    });

    on('long-url', 'keydown', (e) => {
      if (/** @type {KeyboardEvent} */ (e).key === 'Enter') {
        e.preventDefault();
        void submitCreate();
      }
    });

    on('project-new-name', 'keydown', (e) => {
      const key = /** @type {KeyboardEvent} */ (e).key;
      if (key === 'Enter') {
        e.preventDefault();
        void continueProjectSetup();
      } else if (key === 'Escape') {
        e.preventDefault();
        const fallback = scopes[0] ? String(scopes[0].id) : CREATE_SCOPE_VALUE;
        cancelSwapCreate('project-select', 'project-new-name', CREATE_SCOPE_VALUE, fallback);
      }
    });
  }

  async function boot() {
    bind();
    cfg = kkext.DEFAULT_CONFIG || null;
    const bootLocale = cfg?.locale && cfg.locale !== 'auto' ? cfg.locale : null;
    if (typeof kkext.applyLocale === 'function') {
      kkext.applyLocale(bootLocale);
    }
    applyI18n();
    showView('auth');

    setTimeout(() => {
      if (view === 'loading') {
        showView('auth');
      }
    }, 1200);

    try {
      if (!kkext || typeof kkext.getConfig !== 'function' || typeof kkext.isAuthenticated !== 'function') {
        showNote('auth-waiting', t('bootFailed'), true);
        return;
      }

      cfg = await kkext.withTimeout(kkext.getConfig(), 2500, 'config');
      if (typeof kkext.applyLocale === 'function') {
        const loc = cfg?.locale && cfg.locale !== 'auto' ? cfg.locale : null;
        const code = kkext.applyLocale(loc);
        // Align API Accept-Language with the locale actually applied to UI.
        cfg = Object.freeze({ ...cfg, acceptLanguage: code, locale: code });
        applyI18n();
      }

      if (await kkext.withTimeout(kkext.isAuthenticated(), 2500, 'auth')) {
        await afterLogin();
      }
    } catch (e) {
      showView('auth');
      showNote('auth-waiting', e instanceof Error ? e.message : t('loadFailed'), true);
    }
  }

  void boot();
})();
