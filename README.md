# Browser Extensions — KKRCH

Popup extensions for Chrome (and Chromium), Firefox, and Safari: shorten the current
(or pasted) link, choose a **project** and **folder**, copy the short
link.

## Quick Start

```bash
# local (API → http://127.0.0.1:8000, site → http://localhost:5173):
py ./scripts/i_manager.py -B -L -S extensions

cd services/extensions
npm run build:local   # local
npm run build:prod    # production ккрч.рф
```

Local build behaves like prod regarding authorization: **Sign in** opens
`http://localhost:5173/auth?from=extension` (Yandex/Google OAuth). Requires
running frontend `:5173` and backend `:8000`, plus redirect URI
`http://localhost:5173/home` in the provider console.

| Browser               | How to load                                                                                      |
|-----------------------|--------------------------------------------------------------------------------------------------|
| Chrome / Edge / Brave | `chrome://extensions` → developer mode → "Load unpacked" → `dist/chrome`                         |
| Firefox               | `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on" → `dist/firefox/manifest.json` |
| Safari                | see below                                                                                        |

## User Flow

1. Open popup → **Sign in** / **Create account** (the website opens, Yandex ID OAuth).
2. After signing in on the website, the extension picks up the session (banner on the page).
3. In the popup: project at the top, URL, folder → **Shorten**.
4. Result screen: short link, **Copy**, **Back**.
5. When the plan limit is reached — a message and a **Go to payment** button (`/home/checkout`).

The active tab's URL is inserted automatically if it is `http(s)://…`.

## Structure

```
shared/     shared code (popup, background, content-bridge, API)
targets/    manifest.json for chrome / firefox / safari
scripts/    build.mjs
dist/       build artifacts (do not commit)
```

Styles and UI patterns are taken from the dashboard modals
(`services/frontend/src/lib/home/modals`, `styles.css`: accent / radius / inputs).

API: `POST /shorts/{scope_id}` with `targets: [{ url, weight: 100 }]`,
`GET /scopes`, `GET /folders/{scope_id}` — see the frontend OpenAPI.

## Safari

1. `npm run build`
2. On macOS: Xcode → File → New → Project → Safari Web Extension App, or
   `xcrun safari-web-extension-converter dist/safari --project-location ./safari-xcode`
3. Signing and distribution via App Store / Developer ID — separately.

The manifest in `targets/safari` is compatible with Safari Web Extensions (MV3).

## Local Development Against localhost

In the extension storage, set `config`:

```json
{
  "siteOrigin": "http://localhost:5173",
  "shortHost": "127.0.0.1:8000",
  "shortScheme": "http"
}
```

Origins are already allowed in `host_permissions` / content_scripts.

## Session Security

Tokens and fingerprint are copied from the website (the same keys as the SPA). Requests
go through the content script on the website tab where possible, so that the User-Agent
matches the OAuth session (otherwise a refresh with a different UA will destroy the tokens).

## Reference

- Website: [ккрч.рф](https://ккрч.рф), [kkrch.com](https://kkrch.com)
- API DOCS: [KKRCH.EU](https://github.com/IOSHED/KKRCH.EU), [KKRCH.RU](https://github.com/IOSHED/KKRCH.RU)
