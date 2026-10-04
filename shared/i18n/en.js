/** @type {Record<string, string>} */
const KKEXT_I18N_EN = Object.freeze({
  brand: 'KKOROCHE',
  brandTag: 'short links',

  loading: 'Just a moment…',

  authTitle: 'Sign in to your account',
  authLead:
    'Tap the button to open the site. Sign in with Yandex or Google. If you don’t have an account yet, it will be created automatically.',
  authLogin: 'Sign in',
  authWaiting: 'Finish signing in on the site tab…',
  authCancelWait: 'Cancel',
  authDone: 'Signed in',
  bridgeHint: 'KKOROCHE extension: signed in. You can close this tab and return to the extension.',

  projectWhereTitle: 'Where to save?',
  projectWhereLead: 'Choose a project for new links. You can change this later in settings.',
  projectLabel: 'Project',
  projectCreateOption: '+ Create new',
  projectNamePlaceholder: 'New project name',
  projectContinue: 'Continue',
  projectNeedName: 'Enter a project name',
  projectNeedSelect: 'Choose a project',
  projectSaveFailed: 'Could not save the project',
  projectCreateFailed: 'Could not create the project',
  projectLimit: 'Project limit reached for your plan',
  savingTo: 'Saving to: {name}',

  settingsTitle: 'Settings',
  settingsBack: 'Back',
  settingsProjectLabel: 'Project for links',
  settingsOpenFailed: 'Could not open settings',
  logout: 'Sign out',

  urlLabel: 'Long URL',
  urlPlaceholder: 'Paste a link here',
  folderLabel: 'Folder',
  folderRoot: 'No folder',
  folderCreateOption: '+ Create new',
  folderNamePlaceholder: 'New folder name',
  folderNeedName: 'Enter a folder name',
  folderCreateFailed: 'Could not create the folder',
  submit: 'Shorten',
  submitting: 'Just a moment…',

  needUrl: 'Paste a link first',
  needFullUrl: 'Use a full link starting with https://',
  createFailed: 'Could not create the short link',
  loadFailed: 'Could not load data',
  bootFailed: 'Load error. Reinstall the extension.',
  noProjects: 'No projects',
  noScope: 'No project',

  resultTitle: 'Done!',
  resultLead: 'Your short link:',
  copy: 'Copy',
  copied: 'Copied',
  back: 'Make another',

  paywallTitle: 'Plan limit',
  paywallLead: 'Upgrade your plan to continue',
  paywallReasonLabel: 'Why this appeared',
  paywallDefault: 'You hit a plan limit. Open the site to choose another plan.',
  paywallBilling: 'Choose a plan',
  paywallClose: 'Close',
  paywallShorts: 'No short links left on your plan.',

  settingsTitleAria: 'Settings',
  clearCreate: 'Cancel',
  confirmCreate: 'Create',
  sessionExpired: 'Session expired — sign in again',
  loginFailed: 'Could not sign in',
});

const kkext = (globalThis.kkext = globalThis.kkext || {});
kkext.I18N = kkext.I18N || {};
kkext.I18N.en = KKEXT_I18N_EN;
