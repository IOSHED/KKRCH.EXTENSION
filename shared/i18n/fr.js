/** @type {Record<string, string>} */
const KKEXT_I18N_FR = Object.freeze({
  brand: 'KKOROCHE',
  brandTag: 'liens courts',

  loading: 'Un instant…',

  authTitle: 'Connectez-vous',
  authLead:
    'Appuyez sur le bouton pour ouvrir le site. Connectez-vous avec Yandex ou Google. S’il n’y a pas encore de compte, il sera créé automatiquement.',
  authLogin: 'Se connecter',
  authWaiting: 'Terminez la connexion dans l’onglet du site…',
  authCancelWait: 'Annuler',
  authDone: 'Connexion réussie',
  bridgeHint:
    'Extension KKOROCHE : connexion réussie. Vous pouvez fermer cet onglet et revenir à l’extension.',

  projectWhereTitle: 'Où enregistrer ?',
  projectWhereLead:
    'Choisissez un projet pour les nouveaux liens. Vous pourrez le modifier plus tard dans les paramètres.',
  projectLabel: 'Projet',
  projectCreateOption: '+ Créer un nouveau',
  projectNamePlaceholder: 'Nom du nouveau projet',
  projectContinue: 'Continuer',
  projectNeedName: 'Entrez le nom du projet',
  projectNeedSelect: 'Choisissez un projet',
  projectSaveFailed: 'Impossible d’enregistrer le projet',
  projectCreateFailed: 'Impossible de créer le projet',
  projectLimit: 'Limite de projets atteinte pour votre offre',
  savingTo: 'Enregistrement dans : {name}',

  settingsTitle: 'Paramètres',
  settingsBack: 'Retour',
  settingsProjectLabel: 'Projet pour les liens',
  settingsOpenFailed: 'Impossible d’ouvrir les paramètres',
  logout: 'Se déconnecter',

  urlLabel: 'Lien long',
  urlPlaceholder: 'Collez un lien ici',
  folderLabel: 'Dossier',
  folderRoot: 'Sans dossier',
  folderCreateOption: '+ Créer un nouveau',
  folderNamePlaceholder: 'Nom du nouveau dossier',
  folderNeedName: 'Entrez le nom du dossier',
  folderCreateFailed: 'Impossible de créer le dossier',
  submit: 'Raccourcir',
  submitting: 'Un instant…',

  needUrl: 'Collez d’abord un lien',
  needFullUrl: 'Utilisez un lien complet commençant par https://',
  createFailed: 'Impossible de créer le lien court',
  loadFailed: 'Impossible de charger les données',
  bootFailed: 'Erreur de chargement. Réinstallez l’extension.',
  noProjects: 'Aucun projet',
  noScope: 'Aucun projet',

  resultTitle: 'Terminé !',
  resultLead: 'Votre lien court :',
  copy: 'Copier',
  copied: 'Copié',
  back: 'En créer un autre',

  paywallTitle: 'Limite de l’offre',
  paywallLead: 'Passez à une autre offre pour continuer',
  paywallReasonLabel: 'Pourquoi ceci apparaît',
  paywallDefault: 'Vous avez atteint une limite. Ouvrez le site pour choisir une offre.',
  paywallBilling: 'Choisir une offre',
  paywallClose: 'Fermer',
  paywallShorts: 'Plus de liens courts sur votre offre.',

  settingsTitleAria: 'Paramètres',
  clearCreate: 'Annuler',
  confirmCreate: 'Créer',
  sessionExpired: 'Session expirée — reconnectez-vous',
  loginFailed: 'Connexion impossible',
});

const kkext = (globalThis.kkext = globalThis.kkext || {});
kkext.I18N = kkext.I18N || {};
kkext.I18N.fr = KKEXT_I18N_FR;
