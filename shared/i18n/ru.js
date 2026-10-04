/** @type {Record<string, string>} */
const KKEXT_I18N_RU = Object.freeze({
  brand: 'ККОРОЧЕ',
  brandTag: 'короткие ссылки',

  loading: 'Секунду…',

  authTitle: 'Войдите в аккаунт',
  authLead:
    'Нажмите кнопку — откроется сайт. Войдите через Яндекс или Google. Если аккаунта нет, он создастся сам.',
  authLogin: 'Войти',
  authWaiting: 'Откройте вкладку сайта и завершите вход…',
  authCancelWait: 'Отмена',
  authDone: 'Вход выполнен',
  bridgeHint: 'Расширение ККОРОЧЕ: вход выполнен. Можно закрыть вкладку и вернуться к расширению.',

  projectWhereTitle: 'Куда сохранять?',
  projectWhereLead: 'Выберите проект для новых ссылок. Потом это можно изменить в настройках.',
  projectLabel: 'Проект',
  projectCreateOption: '+ Создать новый',
  projectNamePlaceholder: 'Название нового проекта',
  projectContinue: 'Продолжить',
  projectNeedName: 'Введите название проекта',
  projectNeedSelect: 'Выберите проект',
  projectSaveFailed: 'Не удалось сохранить проект',
  projectCreateFailed: 'Не удалось создать проект',
  projectLimit: 'Превышен лимит проектов на тарифе',
  savingTo: 'Сохраняем в: {name}',

  settingsTitle: 'Настройки',
  settingsBack: 'Назад',
  settingsProjectLabel: 'Проект для ссылок',
  settingsOpenFailed: 'Не удалось открыть настройки',
  logout: 'Выйти из аккаунта',

  urlLabel: 'Длинная ссылка',
  urlPlaceholder: 'Вставьте ссылку сюда',
  folderLabel: 'Папка',
  folderRoot: 'Без папки',
  folderCreateOption: '+ Создать новую',
  folderNamePlaceholder: 'Название новой папки',
  folderNeedName: 'Введите название папки',
  folderCreateFailed: 'Не удалось создать папку',
  submit: 'Сократить',
  submitting: 'Секунду…',

  needUrl: 'Сначала вставьте ссылку',
  needFullUrl: 'Нужна ссылка целиком: начиная с https://',
  createFailed: 'Не получилось создать ссылку',
  loadFailed: 'Не удалось загрузить данные',
  bootFailed: 'Ошибка загрузки. Переустановите расширение.',
  noProjects: 'Нет проектов',
  noScope: 'Нет проекта',

  resultTitle: 'Готово!',
  resultLead: 'Ваша короткая ссылка:',
  copy: 'Скопировать',
  copied: 'Скопировано',
  back: 'Сделать ещё одну',

  paywallTitle: 'Лимит тарифа',
  paywallLead: 'Чтобы продолжить, нужен другой тариф',
  paywallReasonLabel: 'Почему появилось',
  paywallDefault: 'На тарифе закончился лимит. Можно перейти на сайт и выбрать тариф.',
  paywallBilling: 'Выбрать тариф',
  paywallClose: 'Закрыть',
  paywallShorts: 'Ссылок на тарифе больше нет.',

  settingsTitleAria: 'Настройки',
  clearCreate: 'Отменить',
  confirmCreate: 'Создать',
  sessionExpired: 'Сессия закончилась — войдите снова',
  loginFailed: 'Не удалось войти',
});

const kkext = (globalThis.kkext = globalThis.kkext || {});
kkext.I18N = kkext.I18N || {};
kkext.I18N.ru = KKEXT_I18N_RU;
