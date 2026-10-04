/**
 * Cross-browser WebExtension API helpers.
 * Firefox `chrome.*` often has no Promise return; `browser.*` does.
 */
(function () {
  const kkext = (globalThis.kkext = globalThis.kkext || {});
  const root =
    typeof globalThis.browser !== 'undefined' && globalThis.browser.runtime
      ? globalThis.browser
      : globalThis.chrome;

  kkext.browser = root;

  /**
   * @template T
   * @param {unknown} maybePromise
   * @param {(cb: (value: T) => void) => void} viaCallback
   * @returns {Promise<T>}
   */
  function asPromise(maybePromise, viaCallback) {
    if (maybePromise != null && typeof /** @type {{ then?: unknown }} */ (maybePromise).then === 'function') {
      return /** @type {Promise<T>} */ (maybePromise);
    }
    return new Promise((resolve, reject) => {
      try {
        viaCallback((value) => {
          const err = root.runtime && root.runtime.lastError;
          if (err) reject(new Error(err.message || String(err)));
          else resolve(value);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /** @param {string | string[] | Record<string, unknown>} keys */
  kkext.storageGet = function storageGet(keys) {
    return asPromise(root.storage.local.get(keys), (cb) => root.storage.local.get(keys, cb));
  };

  /** @param {Record<string, unknown>} values */
  kkext.storageSet = function storageSet(values) {
    return asPromise(root.storage.local.set(values), (cb) => root.storage.local.set(values, cb));
  };

  /** @param {string | string[]} keys */
  kkext.storageRemove = function storageRemove(keys) {
    return asPromise(root.storage.local.remove(keys), (cb) => root.storage.local.remove(keys, cb));
  };

  /** @param {object} query */
  kkext.tabsQuery = function tabsQuery(query) {
    return asPromise(root.tabs.query(query), (cb) => root.tabs.query(query, cb));
  };

  /** @param {{ url: string, active?: boolean }} createProperties */
  kkext.tabsCreate = function tabsCreate(createProperties) {
    return asPromise(root.tabs.create(createProperties), (cb) =>
      root.tabs.create(createProperties, cb),
    );
  };

  /**
   * @param {number} tabId
   * @param {object} message
   */
  kkext.tabsSendMessage = function tabsSendMessage(tabId, message) {
    return asPromise(root.tabs.sendMessage(tabId, message), (cb) =>
      root.tabs.sendMessage(tabId, message, cb),
    );
  };

  /** @param {object} message */
  kkext.runtimeSendMessage = function runtimeSendMessage(message) {
    try {
      return asPromise(root.runtime.sendMessage(message), (cb) => {
        try {
          root.runtime.sendMessage(message, cb);
        } catch (e) {
          cb(/** @type {any} */ ({ ok: false, error: String(e) }));
        }
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  /**
   * @template T
   * @param {Promise<T>} promise
   * @param {number} ms
   * @param {string} [label]
   * @returns {Promise<T>}
   */
  kkext.withTimeout = function withTimeout(promise, ms, label) {
    let timer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(label || `Timeout ${ms}ms`));
      }, ms);
    });
    return Promise.race([promise, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  };
})();
