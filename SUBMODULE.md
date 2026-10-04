# Extensions as git submodule

Цель: вынести `services/extensions` в отдельный репозиторий (как
`documentation/src/services/http_api`), **не тащить на VPS**.

## Сейчас (монорепо)

- Код живёт в `services/extensions/`
- Сборка: `py ./scripts/i_manager.py -B -L -S extensions` или `npm run build:*`
- `dist/` в `.gitignore` — на сервер артефакты не коммитятся
- `deploy/scripts/release.sh` → `prune_dev_trees` удаляет `services/extensions`
  при релизе (как `documentation/`)

## Когда выносите в submodule

1. Создайте пустой репозиторий (например `IOSHED/KKRCH.extensions`).
2. Вынесите содержимое `services/extensions` в этот репо (история опционально).
3. В корне UrlShortener:

```bash
git rm -r --cached services/extensions
# закоммитьте удаление из дерева monorepo

git submodule add -b main https://github.com/IOSHED/KKRCH.extensions.git services/extensions
```

Ожидаемый блок в `.gitmodules` (рядом с docs):

```ini
[submodule "services/extensions"]
	path = services/extensions
	url = https://github.com/IOSHED/KKRCH.extensions.git
	branch = main
```

4. Clone с submodules:

```bash
git clone --recurse-submodules <urlshortener>
# или
git submodule update --init --recursive
```

5. Deploy/VPS: ничего менять не нужно — `prune_dev_trees` уже снимает
   `services/extensions` после checkout. Compose extensions не монтирует.

## Чего не делать

- Не добавлять `services/extensions` в docker-compose / bundle release
- Не коммитить `dist/` в submodule (оставить gitignore)
- Не требовать submodule на CI prod-образов — только local/dev machines и
  store-паблишинг
