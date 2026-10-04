/**
 * Build unpacked extensions into dist/{chrome,firefox,safari}.
 *
 * Usage:
 *   node scripts/build.mjs           # prod (ккрч.рф)
 *   node scripts/build.mjs --local   # local backend :8000 + frontend :5173
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const shared = path.join(root, 'shared');
const frontendIcons = path.resolve(root, '../frontend/public/icons');
const targets = ['chrome', 'firefox', 'safari'];
const isLocal = process.argv.includes('--local');

const PROD_DEFAULTS = {
  mode: 'prod',
  locale: 'auto',
  siteOrigin: 'https://ккрч.рф',
  apiOrigin: 'https://ккрч.рф',
  shortHost: 'ккрч.рф',
  shortScheme: 'https',
  apiBasePath: '/api/v1',
  acceptLanguage: 'en',
  qaEmail: 'extension-qa@kkrch.local',
};

const LOCAL_DEFAULTS = {
  mode: 'local',
  locale: 'auto',
  // Must match OAuth console redirect: http://localhost:5173/home
  // (127.0.0.1 ≠ localhost for Yandex/Google redirect_uri).
  siteOrigin: 'http://localhost:5173',
  apiOrigin: 'http://127.0.0.1:8000',
  shortHost: '127.0.0.1:8000',
  shortScheme: 'http',
  apiBasePath: '/api/v1',
  acceptLanguage: 'en',
  qaEmail: 'extension-qa@kkrch.local',
};

const BUILD_DEFAULTS = isLocal ? LOCAL_DEFAULTS : PROD_DEFAULTS;

const I18N_PARTS = ['i18n/ru.js', 'i18n/en.js', 'i18n/fr.js', 'i18n/de.js', 'i18n/index.js'];

const BACKGROUND_PARTS = [
  'lib/browser-api.js',
  'config.js',
  ...I18N_PARTS,
  'lib/storage.js',
  'lib/util.js',
  'lib/api.js',
  'background/service-worker.js',
];

const POPUP_PARTS = [
  'lib/browser-api.js',
  'config.js',
  ...I18N_PARTS,
  'lib/storage.js',
  'lib/util.js',
  'lib/api.js',
  'popup/popup.js',
];

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function findBrandPng(iconsDir) {
  if (!fs.existsSync(iconsDir)) return null;
  const files = fs.readdirSync(iconsDir);
  const byExact = files.find((f) => f === 'ККОРОЧЕ.png');
  if (byExact) return path.join(iconsDir, byExact);
  const cyrillic = files.find((f) => f.endsWith('.png') && /ККОР|короч/i.test(f));
  if (cyrillic) return path.join(iconsDir, cyrillic);
  const other = files.find(
    (f) => f.endsWith('.png') && !/^favicon|^android|^apple|^mstile/i.test(f),
  );
  return other ? path.join(iconsDir, other) : null;
}

function writeIcons(destIcons) {
  fs.mkdirSync(destIcons, { recursive: true });
  const map = [
    ['favicon-16x16.png', 'icon16.png'],
    ['favicon-32x32.png', 'icon32.png'],
    ['apple-touch-icon.png', 'icon48.png'],
    ['android-chrome-192x192.png', 'icon128.png'],
  ];
  for (const [srcName, destName] of map) {
    const src = path.join(frontendIcons, srcName);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing frontend icon: ${src} (needed for ${destName})`);
    }
    fs.copyFileSync(src, path.join(destIcons, destName));
  }
  const brand = findBrandPng(frontendIcons) || path.join(frontendIcons, 'android-chrome-192x192.png');
  fs.copyFileSync(brand, path.join(destIcons, 'brand.png'));

  const uiIconsDir = path.resolve(root, '../frontend/src/lib/icons');
  for (const name of ['settings.svg', 'check.svg', 'x-mark.svg', 'chevron-down.svg']) {
    const src = path.join(uiIconsDir, name);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing frontend icon: ${src}`);
    }
    fs.copyFileSync(src, path.join(destIcons, name));
  }
}

function writeLocales(dest) {
  const catalogs = {
    ru: {
      extName: 'ККОРОЧЕ — укоротитель ссылок',
      extDescription: 'Сокращайте ссылки в один клик: проект, папка, короткая ссылка.',
    },
    en: {
      extName: 'KKOROCHE — URL shortener',
      extDescription: 'Shorten links in one click: project, folder, short URL.',
    },
    fr: {
      extName: 'KKOROCHE — raccourcisseur d’URL',
      extDescription: 'Raccourcissez des liens en un clic : projet, dossier, lien court.',
    },
    de: {
      extName: 'KKOROCHE — URL-Shortener',
      extDescription: 'Links in einem Klick kürzen: Projekt, Ordner, Kurzlink.',
    },
  };
  for (const [code, strings] of Object.entries(catalogs)) {
    const dir = path.join(dest, '_locales', code);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'messages.json'),
      JSON.stringify(
        {
          extName: { message: strings.extName, description: 'Extension name' },
          extDescription: {
            message: strings.extDescription,
            description: 'Extension description',
          },
        },
        null,
        2,
      ),
    );
  }
}

function injectBuildDefaults(source) {
  const preamble = `globalThis.__KKEXT_BUILD_DEFAULTS__ = ${JSON.stringify(BUILD_DEFAULTS, null, 2)};\n`;
  return preamble + source;
}

/** Top-level `const kkext = ...` cannot appear twice in one bundle (Firefox SyntaxError). */
function stripTopLevelKkextConst(source) {
  return source
    .replace(
      /^\s*const\s+kkext\s*=\s*\(\s*globalThis\.kkext\s*=\s*globalThis\.kkext\s*\|\|\s*\{\s*\}\s*\)\s*;\s*/gm,
      '',
    )
    .replace(/\/\*\s*global\s+importScripts\s*,\s*kkext\s*\*\/\s*/g, '')
    .replace(/\/\*\s*global\s+kkext\s*\*\/\s*/g, '');
}

function bundleParts(parts) {
  const header = [
    '/* kkext extension bundle */',
    'var kkext = (globalThis.kkext = globalThis.kkext || {});',
    '',
  ].join('\n');

  const body = parts
    .map((rel) => {
      const srcPath = path.join(shared, rel);
      let src = fs.readFileSync(srcPath, 'utf8');
      if (rel === 'config.js') src = injectBuildDefaults(src);
      src = stripTopLevelKkextConst(src);
      return `/* ---- ${rel} ---- */\n${src}`;
    })
    .join('\n\n')
    .replace(/importScripts\([\s\S]*?\);\s*/g, '');

  return `${header}\n${body}`;
}

function buildBackgroundBundle(outDir) {
  const dest = path.join(outDir, 'background', 'service-worker.js');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bundleParts(BACKGROUND_PARTS), 'utf8');
}

function buildPopupBundle(outDir) {
  const dest = path.join(outDir, 'popup', 'popup.bundle.js');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bundleParts(POPUP_PARTS), 'utf8');
}

for (const target of targets) {
  const out = path.join(root, 'dist', target);
  rmrf(out);
  fs.mkdirSync(out, { recursive: true });

  // Only ship what the runtime needs (bundles + assets + content bridge).
  copyDir(path.join(shared, 'styles'), path.join(out, 'styles'));
  copyDir(path.join(shared, 'content'), path.join(out, 'content'));
  fs.mkdirSync(path.join(out, 'popup'), { recursive: true });
  fs.copyFileSync(path.join(shared, 'popup', 'popup.html'), path.join(out, 'popup', 'popup.html'));

  buildBackgroundBundle(out);
  buildPopupBundle(out);

  fs.copyFileSync(
    path.join(root, 'targets', target, 'manifest.json'),
    path.join(out, 'manifest.json'),
  );

  writeIcons(path.join(out, 'icons'));
  writeLocales(out);
  console.log(`built dist/${target} (${BUILD_DEFAULTS.mode}) api=${BUILD_DEFAULTS.apiOrigin}`);
}

console.log('done');
