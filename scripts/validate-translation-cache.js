#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = '.translation-cache';
const CACHE_FILE = path.join(CACHE_DIR, 'content-hashes.json');

// Supported target languages (must match LANGUAGE_MAP keys in the translate-*.js scripts)
const SUPPORTED_LANGUAGES = [
  'ar', 'bg', 'zh-hans', 'zh-hant', 'fr', 'de', 'el', 'hu', 'id', 'it', 'ja',
  'ko', 'ms', 'fa', 'pl', 'pt-br', 'pt-pt', 'es', 'es-419', 'th', 'tr', 'vi'
];

console.log('🔍 Validating translation cache consistency...\n');

// Function to generate content hash
function generateContentHash(content) {
  return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
}

// Function to check if file exists and get its hash
function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return generateContentHash(content);
  } catch (error) {
    console.warn(`Could not read ${filePath}:`, error.message);
    return null;
  }
}

// Load cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`📊 Loaded cache with ${Object.keys(cache).length} entries`);
  } catch (error) {
    console.error('❌ Could not load cache file:', error.message);
    process.exit(1);
  }
} else {
  console.log('⚠️  No cache file found - this is normal for first run');
}

// Validate key files
const keyFiles = [
  'src/content/pages/index.md',
  ...SUPPORTED_LANGUAGES.map(lang => `src/content/pages/${lang}/index.md`)
];

let issues = 0;
let validEntries = 0;

console.log('🔍 Checking key files:\n');

for (const filePath of keyFiles) {
  const currentHash = getFileHash(filePath);
  const cachedHash = cache[filePath];
  
  if (!currentHash) {
    console.log(`❌ ${filePath}: File missing`);
    issues++;
  } else if (!cachedHash) {
    console.log(`⚠️  ${filePath}: Not in cache (will be processed on next build)`);
  } else if (currentHash === cachedHash) {
    console.log(`✅ ${filePath}: Cache valid`);
    validEntries++;
  } else {
    console.log(`🔄 ${filePath}: Content changed (will be re-translated)`);
  }
}

// Check for orphaned cache entries
console.log('\n🔍 Checking for orphaned cache entries:\n');

let orphanedEntries = 0;
for (const [filePath, hash] of Object.entries(cache)) {
  if (filePath.startsWith('src/content/pages/') && filePath.endsWith('.md')) {
    if (!fs.existsSync(filePath)) {
      console.log(`🗑️  ${filePath}: Cached but file doesn't exist`);
      orphanedEntries++;
    }
  }
}

// Summary
console.log('\n📊 Cache Validation Summary:');
console.log(`   - Valid entries: ${validEntries}`);
console.log(`   - Issues found: ${issues}`);
console.log(`   - Orphaned entries: ${orphanedEntries}`);
console.log(`   - Total cache entries: ${Object.keys(cache).length}`);

if (issues === 0 && orphanedEntries === 0) {
  console.log('\n✅ Translation cache is healthy!');
} else if (issues > 0) {
  console.log('\n⚠️  Some issues found - builds may take longer until resolved');
} else {
  console.log('\n💡 Cache has some orphaned entries but is otherwise healthy');
}

// Environment check
const isCloudCannon = !!(
  process.env.CLOUDCANNON_BUILD_ID || 
  process.env.CLOUDCANNON || 
  process.env.NODE_ENV === 'production' ||
  process.cwd().includes('/usr/local/__site/') ||
  process.cwd().includes('cloudcannon')
);

console.log(`\n🌐 Environment: ${isCloudCannon ? 'CloudCannon' : 'Local'}`);
console.log(`📁 Working directory: ${process.cwd()}`);

if (isCloudCannon) {
  console.log('💡 In CloudCannon: Cache will be rebuilt if missing after pull');
} else {
  console.log('💡 Local environment: Cache persists between builds');
}
