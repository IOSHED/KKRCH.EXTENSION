/** @type {Record<string, string>} */
const KKEXT_I18N_DE = Object.freeze({
  brand: 'KKOROCHE',
  brandTag: 'Kurzlinks',

  loading: 'Einen Moment…',

  authTitle: 'Melden Sie sich an',
  authLead:
    'Tippen Sie auf die Schaltfläche — die Website öffnet sich. Melden Sie sich mit Yandex oder Google an. Ohne Konto wird eines automatisch erstellt.',
  authLogin: 'Anmelden',
  authWaiting: 'Schließen Sie die Anmeldung im Website-Tab ab…',
  authCancelWait: 'Abbrechen',
  authDone: 'Angemeldet',
  bridgeHint:
    'KKOROCHE-Erweiterung: Anmeldung erfolgreich. Sie können diesen Tab schließen und zur Erweiterung zurückkehren.',

  projectWhereTitle: 'Wohin speichern?',
  projectWhereLead:
    'Wählen Sie ein Projekt für neue Links. Später können Sie das in den Einstellungen ändern.',
  projectLabel: 'Projekt',
  projectCreateOption: '+ Neu erstellen',
  projectNamePlaceholder: 'Name des neuen Projekts',
  projectContinue: 'Weiter',
  projectNeedName: 'Projektname eingeben',
  projectNeedSelect: 'Projekt auswählen',
  projectSaveFailed: 'Projekt konnte nicht gespeichert werden',
  projectCreateFailed: 'Projekt konnte nicht erstellt werden',
  projectLimit: 'Projektlimit Ihres Tarifs erreicht',
  savingTo: 'Speichern in: {name}',

  settingsTitle: 'Einstellungen',
  settingsBack: 'Zurück',
  settingsProjectLabel: 'Projekt für Links',
  settingsOpenFailed: 'Einstellungen konnten nicht geöffnet werden',
  logout: 'Abmelden',

  urlLabel: 'Lange URL',
  urlPlaceholder: 'Link hier einfügen',
  folderLabel: 'Ordner',
  folderRoot: 'Ohne Ordner',
  folderCreateOption: '+ Neu erstellen',
  folderNamePlaceholder: 'Name des neuen Ordners',
  folderNeedName: 'Ordnername eingeben',
  folderCreateFailed: 'Ordner konnte nicht erstellt werden',
  submit: 'Kürzen',
  submitting: 'Einen Moment…',

  needUrl: 'Zuerst einen Link einfügen',
  needFullUrl: 'Vollständigen Link mit https:// verwenden',
  createFailed: 'Kurzlink konnte nicht erstellt werden',
  loadFailed: 'Daten konnten nicht geladen werden',
  bootFailed: 'Ladefehler. Erweiterung neu installieren.',
  noProjects: 'Keine Projekte',
  noScope: 'Kein Projekt',

  resultTitle: 'Fertig!',
  resultLead: 'Ihr Kurzlink:',
  copy: 'Kopieren',
  copied: 'Kopiert',
  back: 'Noch einen erstellen',

  paywallTitle: 'Tariflimit',
  paywallLead: 'Zum Fortfahren einen anderen Tarif wählen',
  paywallReasonLabel: 'Warum das erscheint',
  paywallDefault: 'Ein Tariflimit ist erreicht. Öffnen Sie die Website, um einen Tarif zu wählen.',
  paywallBilling: 'Tarif wählen',
  paywallClose: 'Schließen',
  paywallShorts: 'Keine Kurzlinks mehr in Ihrem Tarif.',

  settingsTitleAria: 'Einstellungen',
  clearCreate: 'Abbrechen',
  confirmCreate: 'Erstellen',
  sessionExpired: 'Sitzung abgelaufen — bitte erneut anmelden',
  loginFailed: 'Anmeldung fehlgeschlagen',
});

const kkext = (globalThis.kkext = globalThis.kkext || {});
kkext.I18N = kkext.I18N || {};
kkext.I18N.de = KKEXT_I18N_DE;
