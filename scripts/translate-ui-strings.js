// Translate the nav-chrome UI labels (header/nav bar, footer, sidebar, breadcrumbs)
// from src/data/{mainNav,footer,sidebarNav}.json into every locale, writing a single
// dictionary at src/data/i18n/ui.json: { "<English label>": { "<locale>": "<text>" } }.
//
// Usage: node scripts/translate-ui-strings.js
import fs from 'fs';
import path from 'path';

const DEEPL_API_KEY = '23b4b747-bac9-43f3-b559-4534a1e4d857';
const DEEPL_API_URL = 'https://api.deepl.com';

const LANGUAGE_MAP = {
  ar: 'AR', bg: 'BG', 'zh-hans': 'ZH-HANS', 'zh-hant': 'ZH-HANT', fr: 'FR', de: 'DE',
  el: 'EL', hu: 'HU', id: 'ID', it: 'IT', ja: 'JA', ko: 'KO', ms: 'MS', fa: 'FA',
  pl: 'PL', 'pt-br': 'PT-BR', 'pt-pt': 'PT-PT', es: 'ES', 'es-419': 'ES-419',
  th: 'TH', tr: 'TR', vi: 'VI',
};

// Keys whose string values are user-visible labels worth translating.
const LABEL_KEYS = new Set([
  'name', 'text', 'heading', 'footerText', 'newsletterHeading', 'newsletterText',
]);

// A string is a translatable label only if it isn't a path/url/anchor/short code.
function isLabel(v) {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  if (t.length < 2) return false;
  if (/^\//.test(t)) return false;          // path
  if (/^https?:/i.test(t)) return false;    // url
  if (/^#/.test(t)) return false;           // anchor
  if (/^[A-Za-z]{2}$/.test(t)) return false; // 2-letter code (EN, us, ...)
  return true;
}

// Collect label strings. Skips anything inside a "languages" array (the language
// switcher's native language names, which must stay in their own language).
function collect(obj, inLanguages, set) {
  if (Array.isArray(obj)) {
    obj.forEach((o) => collect(o, inLanguages, set));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const il = inLanguages || k === 'languages';
      if (typeof v === 'string') {
        if (!il && LABEL_KEYS.has(k) && isLabel(v)) set.add(v);
      } else {
        collect(v, il, set);
      }
    }
  }
}

async function deeplChunk(texts, targetLang) {
  const params = new URLSearchParams();
  texts.forEach((t) => params.append('text', t));
  params.append('target_lang', LANGUAGE_MAP[targetLang]);
  params.append('source_lang', 'EN');
  const r = await fetch(`${DEEPL_API_URL}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!r.ok) throw new Error(`DeepL ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.translations.map((t) => t.text);
}

async function deepl(texts, targetLang) {
  const out = [];
  for (let i = 0; i < texts.length; i += 45) {
    out.push(...(await deeplChunk(texts.slice(i, i + 45), targetLang)));
  }
  return out;
}

async function main() {
  const dataDir = 'src/data';
  const set = new Set();
  for (const f of ['mainNav.json', 'footer.json', 'sidebarNav.json']) {
    const p = path.join(dataDir, f);
    if (fs.existsSync(p)) collect(JSON.parse(fs.readFileSync(p, 'utf8')), false, set);
  }
  set.add('Home'); // breadcrumb root label
  set.add('Quick Links'); // hardcoded footer heading in Footer.astro
  const labels = [...set];
  console.log(`Collected ${labels.length} unique UI labels.`);

  const dict = {};
  labels.forEach((l) => (dict[l] = {}));

  for (const lang of Object.keys(LANGUAGE_MAP)) {
    const translated = await deepl(labels, lang);
    labels.forEach((l, i) => (dict[l][lang] = translated[i]));
    console.log(`  ${lang}: ${translated.length} labels`);
  }

  const outPath = 'src/data/i18n/ui.json';
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(dict, null, 2), 'utf8');
  console.log(`Wrote ${outPath} (${labels.length} labels x ${Object.keys(LANGUAGE_MAP).length} locales).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
