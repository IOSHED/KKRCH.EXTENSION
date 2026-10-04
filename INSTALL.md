# Установка prod-сборки в Chrome / Firefox / Safari

## Сборка

```bash
cd services/extensions
npm run build:prod
# → dist/chrome, dist/firefox, dist/safari
```

Или: `py ./scripts/i_manager.py -B -S extensions` (без `-L` = prod origins).

Проверьте в `dist/*/popup/popup.bundle.js`, что `siteOrigin` / `apiOrigin` =
`https://ккрч.рф` (не localhost).

---

## Chrome / Edge / Brave / Chromium

1. Откройте `chrome://extensions` (Edge: `edge://extensions`).
2. Включите **Режим разработчика**.
3. **Загрузить распакованное расширение** → выберите папку  
   `services/extensions/dist/chrome`  
   (нужна именно папка с `manifest.json` внутри).
4. Закрепите иконку на панели.

Обновление после пересборки: на карточке расширения → **Обновить** (круговая стрелка).

> В Chrome Web Store пока не публикуем — только unpacked / позже ZIP для ревью.

---

## Firefox

1. Откройте `about:debugging#/runtime/this-firefox`.
2. **Временное дополнение…** → укажите файл  
   `services/extensions/dist/firefox/manifest.json`.
3. Дополнение активно до перезапуска Firefox (temporary add-on).

Для постоянного локального теста (не Store):

```bash
cd services/extensions/dist/firefox
# упаковать zip корня dist/firefox (manifest в корне архива)
```

или используйте `web-ext run` / `web-ext sign` при публикации на AMO.

Перезагрузка: снова «Временное дополнение» или кнопка Reload на карточке в
`about:debugging`.

---

## Safari (macOS)

1. Нужны Xcode и Safari 17+ (Web Extension).
2. Соберите prod: `npm run build:prod` → `dist/safari`.
3. В Xcode: **File → New → Project → Safari Extension App**, либо  
   **Develop → Convert to Safari Web Extension…** и укажите `dist/safari`.
4. В Safari: **Настройки → Расширения** — включите расширение, выдайте доступ
   к сайту `ккрч.рф` / `kkrch.com` при запросе.
5. Меню **Develop → Allow Unsigned Extensions** (для локальной отладки).

Подробнее: [Apple — Safari web extensions](https://developer.apple.com/documentation/safariservices/safari_web_extensions).

---

## Проверка после установки

1. Popup → **Войти** → OAuth на `https://ккрч.рф/auth?from=extension`.
2. После входа — баннер «вход выполнен» на сайте.
3. Вернитесь в popup: экран «Куда сохранять?» или форма сокращения.
4. Сократите ссылку; при ошибке токена обновите расширение и повторите вход
   (нужна вкладка сайта для refresh с тем же User-Agent).
