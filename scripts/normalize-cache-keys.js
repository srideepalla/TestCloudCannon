import fs from 'fs';
import path from 'path';

// Script to normalize cache keys from Windows backslashes to forward slashes
// for cross-platform compatibility between local (Windows) and CloudCannon (Linux)

const CACHE_FILE = '.translation-cache/content-hashes.json';

function normalizeCacheKeys() {
  console.log('🔧 Normalizing cache keys for cross-platform compatibility...\n');

  if (!fs.existsSync(CACHE_FILE)) {
    console.log('❌ Cache file not found:', CACHE_FILE);
    return;
  }

  // Read existing cache
  const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
  const cache = JSON.parse(cacheContent);

  const normalizedCache = {};
  let changedCount = 0;
  let unchangedCount = 0;

  // Normalize all keys
  for (const [key, value] of Object.entries(cache)) {
    // Replace all backslashes with forward slashes
    const normalizedKey = key.replace(/\\/g, '/');
    
    if (normalizedKey !== key) {
      console.log(`  Normalizing: ${key}`);
      console.log(`           → ${normalizedKey}`);
      changedCount++;
    } else {
      unchangedCount++;
    }
    
    normalizedCache[normalizedKey] = value;
  }

  // Save normalized cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(normalizedCache, null, 2), 'utf8');

  console.log(`\n✅ Cache normalization complete!`);
  console.log(`   - Keys normalized: ${changedCount}`);
  console.log(`   - Keys already normalized: ${unchangedCount}`);
  console.log(`   - Total keys: ${Object.keys(normalizedCache).length}`);
  console.log(`\n💡 All cache keys now use forward slashes for cross-platform compatibility`);
}

normalizeCacheKeys();
