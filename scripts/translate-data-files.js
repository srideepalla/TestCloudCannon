import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import crypto from 'crypto';

const DEEPL_API_KEY = '23b4b747-bac9-43f3-b559-4534a1e4d857';
const DEEPL_API_URL = 'https://api.deepl.com';

// Cache directory for storing content hashes
const CACHE_DIR = '.translation-cache';
const DATA_HASH_FILE = path.join(CACHE_DIR, 'data-hashes.json');

const LANGUAGE_MAP = {
  'ar': 'AR',           // Arabic
  'bg': 'BG',           // Bulgarian
  'zh-hans': 'ZH-HANS', // Chinese (simplified)
  'zh-hant': 'ZH-HANT', // Chinese (traditional)
  'fr': 'FR',           // French
  'de': 'DE',           // German
  'el': 'EL',           // Greek
  'hu': 'HU',           // Hungarian
  'id': 'ID',           // Indonesian
  'it': 'IT',           // Italian
  'ja': 'JA',           // Japanese
  'ko': 'KO',           // Korean
  'ms': 'MS',           // Malay
  'fa': 'FA',           // Persian
  'pl': 'PL',           // Polish
  'pt-br': 'PT-BR',     // Portuguese (Brazilian)
  'pt-pt': 'PT-PT',     // Portuguese (European)
  'es': 'ES',           // Spanish
  'es-419': 'ES-419',   // Spanish (Latin American)
  'th': 'TH',           // Thai
  'tr': 'TR',           // Turkish
  'vi': 'VI'            // Vietnamese
};

// All supported target languages (folder names under src/content/pages/ and data/ suffixes)
const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP);

// Cache functions
function loadDataHashes() {
  try {
    if (fs.existsSync(DATA_HASH_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_HASH_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Could not load data cache:', error.message);
  }
  return {};
}

function saveDataHashes(hashes) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(DATA_HASH_FILE, JSON.stringify(hashes, null, 2), 'utf8');
  } catch (error) {
    console.warn('Could not save data cache:', error.message);
  }
}

function generateContentHash(content) {
  // Normalize line endings to LF for cross-platform consistency
  const normalized = typeof content === 'string' 
    ? content.replace(/\r\n/g, '\n') 
    : content;
  return crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex');
}

// Simple translation function
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text;
  }

  try {
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('target_lang', LANGUAGE_MAP[targetLang]);
    params.append('source_lang', 'EN');

    const response = await fetch(`${DEEPL_API_URL}/v2/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    if (!response.ok) {
      return text;
    }

    const data = await response.json();
    return data.translations[0].text;

  } catch (error) {
    return text;
  }
}

// Recursively translate object
async function translateObject(obj, targetLang) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    const translatedArray = [];
    for (let i = 0; i < obj.length; i++) {
      translatedArray[i] = await translateObject(obj[i], targetLang);
    }
    return translatedArray;
  }

  const translated = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip certain keys that shouldn't be translated
    const skipKeys = [
      'url', 'link', 'image', 'logo', 'bgColor', 'themeColor', 'hoverBgColor',
      'flag', 'code', 'searchPlaceholder', 'searchButtonText'
    ];

    if (skipKeys.includes(key)) {
      translated[key] = value;
      continue;
    }

    // Skip URLs and paths
    if (typeof value === 'string' && (
      value.startsWith('http') ||
      value.startsWith('/') ||
      value.startsWith('#') ||
      value.includes('.svg') ||
      value.includes('.png') ||
      value.includes('.jpg')
    )) {
      translated[key] = value;
      continue;
    }

    // Translate string values
    if (typeof value === 'string' && value.trim() !== '') {
      translated[key] = await translateText(value, targetLang);
    } else if (typeof value === 'object') {
      translated[key] = await translateObject(value, targetLang);
    } else {
      translated[key] = value;
    }
  }

  return translated;
}

// Translate a data file
async function translateDataFile(filePath, targetLang, dataHashes) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Generate hash and cache key
    const currentHash = generateContentHash(data);
    // Normalize to forward slashes for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');
    const cacheKey = `${normalizedPath}_${targetLang}`;

    // Create output path
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath, '.json');
    const outputPath = path.join(dir, `${filename}-${targetLang}.json`);

    // Check if translation is cached and output file exists
    if (dataHashes[cacheKey] === currentHash && fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipping ${filePath} → ${targetLang.toUpperCase()} (no changes)`);
      return true;
    }

    console.log(`🔄 Translating ${filePath} to ${targetLang.toUpperCase()}...`);

    const translatedData = await translateObject(data, targetLang);

    fs.writeFileSync(outputPath, JSON.stringify(translatedData, null, 2), 'utf8');

    // Update cache
    dataHashes[cacheKey] = currentHash;

    console.log(`✅ Created ${outputPath}`);
    return true;

  } catch (error) {
    console.error(`Error translating ${filePath}:`, error);
    return false;
  }
}

// Main function
async function translateAllDataFiles() {
  console.log('📄 Translating data files...\n');

  // Load existing cache
  const dataHashes = loadDataHashes();

  const dataFiles = [
    'data/header.json',
    'data/footer.json'
  ];

  const languages = SUPPORTED_LANGUAGES;
  let processedCount = 0;
  let skippedCount = 0;

  for (const file of dataFiles) {
    if (fs.existsSync(file)) {
      for (const lang of languages) {
        const success = await translateDataFile(file, lang, dataHashes);
        if (success) {
          processedCount++;
          // Check if it was skipped (cached)
          const content = fs.readFileSync(file, 'utf8');
          const data = JSON.parse(content);
          const currentHash = generateContentHash(data);
          // Normalize to forward slashes for cross-platform compatibility
          const normalizedPath = file.replace(/\\/g, '/');
          const cacheKey = `${normalizedPath}_${lang}`;
          if (dataHashes[cacheKey] === currentHash) {
            skippedCount++;
          }
        }
        // Small delay between translations
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      console.warn(`⚠️  File not found: ${file}`);
    }
  }

  // Save updated cache
  saveDataHashes(dataHashes);

  console.log(`\n🎉 Data files: ${processedCount}/${dataFiles.length * languages.length} processed`);
  if (skippedCount > 0) {
    console.log(`📊 ${skippedCount} files skipped (no changes)`);
  }
}

translateAllDataFiles().catch(console.error);
