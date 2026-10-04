# AGENTS.md — services/extensions

Browser extensions (Chrome / Firefox / Safari Web Extension) for ККОРОЧЕ.

## Layout

```
shared/           — common popup, background, content, API, RU i18n, styles
targets/          — per-browser manifest.json
scripts/build.mjs — packs shared + manifest → dist/{chrome,firefox,safari}
dist/             — load unpacked from here (gitignored)
```

## Commands

```bash
# local build → apiOrigin http://127.0.0.1:8000, site http://127.0.0.1:5173
py ./scripts/i_manager.py -B -L -S extensions

cd services/extensions
npm run build:local   # local backend
npm run build:prod    # ккрч.рф
```

Local-сборка ближе к prod: кнопка **Войти** открывает сайт
`/auth?from=extension` (реальный OAuth). `POST /qa/session` в UI не
используется (остаётся только на backend для e2e при `APP_ENVIRONMENT=local`).

Load:
- Chrome: `chrome://extensions` → Developer mode → Load unpacked → `dist/chrome`
- Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → `dist/firefox/manifest.json`
- Safari: convert `dist/safari` with Xcode «Convert to Safari Web Extension» (see README)

## Auth model

OAuth `redirect_uri` is **always** `{siteOrigin}/home` (same as the website).
Clients (extension, future apps) must **not** register separate redirect URIs —
they only pass `from` / `next` on `/auth` so the SPA can route after login.

1. Popup opens site `/auth?from=extension&next=/home` (`kkext.authUrl`).
2. Site starts Yandex/Google with `redirect_uri = {siteOrigin}/home`.
3. Content script on site origins reads frontend `localStorage` tokens +
   `urlshortener_fingerprint` and pushes them into `chrome.storage.local`.
4. API calls go to `apiOrigin` (local: `:8000`); site UI stays on `siteOrigin`.

### Local OAuth console

Allow exactly (already used by the site):

- `http://localhost:5173/home`

Local extension build uses `siteOrigin: http://localhost:5173` on purpose —
`127.0.0.1` ≠ `localhost` for providers. **Do not add** an extension-specific
redirect URI. Only add `http://127.0.0.1:5173/home` if you also open the site
manually via `127.0.0.1` (optional; not required for the extension).

## Local smoke

```js
// DevTools → Application → Extension storage, or from popup console:
chrome.storage.local.set({
  config: {
    siteOrigin: 'http://localhost:5173', // or your frontend origin
    shortHost: 'localhost:8000',
    shortScheme: 'http',
  },
});
```

Also add matching `host_permissions` / content_scripts if the origin is not
already listed.

## Locale

UI: `ru` / `en` / `fr` / `de` (`shared/i18n/*` + `index.js`). Default `locale: auto`
→ browser language. Override via `chrome.storage.local.config.locale`.

## Auth / fingerprint

OAuth fingerprint = `hash(User-Agent + X-Fingerprint)`. API (особенно
`/auth/refresh`) идёт через content script на вкладке `siteOrigin`, иначе
сервер инвалидирует refresh. Баннер «вход выполнен» только после
`savePulledSession` с непустым fingerprint.

## Submodule / deploy

Не деплоить на VPS. См. `SUBMODULE.md`. `release.sh` → `prune_dev_trees`.
