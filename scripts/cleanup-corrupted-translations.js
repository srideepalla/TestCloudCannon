#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Cleaning up corrupted translation files...\n');

// Supported target languages (must match LANGUAGE_MAP keys in the translate-*.js scripts).
// Sorted longest-first so multi-part codes (es-419, pt-br) are matched before their prefixes.
const SUPPORTED_LANGUAGES = [
  'ar', 'bg', 'zh-hans', 'zh-hant', 'fr', 'de', 'el', 'hu', 'id', 'it', 'ja',
  'ko', 'ms', 'fa', 'pl', 'pt-br', 'pt-pt', 'es', 'es-419', 'th', 'tr', 'vi'
].sort((a, b) => b.length - a.length);

// Function to check if a filename has nested language codes (e.g. foo-es-de.json).
// Strips trailing "-<lang>" suffixes one at a time; more than one means the file
// was translated multiple times and is corrupted.
function hasNestedLanguageCodes(filename) {
  let baseName = path.parse(filename).name;

  let langCount = 0;
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const lang of SUPPORTED_LANGUAGES) {
      if (baseName.endsWith(`-${lang}`)) {
        baseName = baseName.slice(0, -(`-${lang}`.length));
        langCount++;
        stripped = true;
        break;
      }
    }
  }

  // If more than 1 language code, it's corrupted
  return langCount > 1;
}

// Function to clean up corrupted files in a directory
function cleanupDirectory(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dirPath}`);
    return { deleted: 0, errors: 0 };
  }
  
  console.log(`📁 Cleaning ${description}: ${dirPath}`);
  
  const files = fs.readdirSync(dirPath);
  let deleted = 0;
  let errors = 0;
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && hasNestedLanguageCodes(file)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`  ❌ Deleted: ${file}`);
        deleted++;
      } catch (error) {
        console.error(`  ⚠️  Error deleting ${file}:`, error.message);
        errors++;
      }
    }
  }
  
  return { deleted, errors };
}

// Clean up data directory
const dataDir = path.resolve(__dirname, '../data');
const dataResults = cleanupDirectory(dataDir, 'data files');

// Clean up content directories
const contentDir = path.resolve(__dirname, '../src/content/pages');
let contentResults = { deleted: 0, errors: 0 };

// Check for corrupted content files in language directories
const languageDirs = SUPPORTED_LANGUAGES;
for (const lang of languageDirs) {
  const langDir = path.join(contentDir, lang);
  if (fs.existsSync(langDir)) {
    // Look for files with nested language codes in subdirectories
    function cleanupContentRecursively(dir) {
      const items = fs.readdirSync(dir);
      let results = { deleted: 0, errors: 0 };
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Check if directory name has nested language codes
          if (hasNestedLanguageCodes(item)) {
            try {
              fs.rmSync(itemPath, { recursive: true, force: true });
              console.log(`  ❌ Deleted directory: ${path.relative(contentDir, itemPath)}`);
              results.deleted++;
            } catch (error) {
              console.error(`  ⚠️  Error deleting directory ${item}:`, error.message);
              results.errors++;
            }
          } else {
            // Recursively clean subdirectories
            const subResults = cleanupContentRecursively(itemPath);
            results.deleted += subResults.deleted;
            results.errors += subResults.errors;
          }
        } else if (stat.isFile() && hasNestedLanguageCodes(item)) {
          try {
            fs.unlinkSync(itemPath);
            console.log(`  ❌ Deleted: ${path.relative(contentDir, itemPath)}`);
            results.deleted++;
          } catch (error) {
            console.error(`  ⚠️  Error deleting ${item}:`, error.message);
            results.errors++;
          }
        }
      }
      
      return results;
    }
    
    console.log(`📁 Cleaning content files in: ${lang}/`);
    const langResults = cleanupContentRecursively(langDir);
    contentResults.deleted += langResults.deleted;
    contentResults.errors += langResults.errors;
  }
}

// Summary
console.log('\n🎉 Cleanup complete!');
console.log('📊 Summary:');
console.log(`   - Data files deleted: ${dataResults.deleted}`);
console.log(`   - Content files/directories deleted: ${contentResults.deleted}`);
console.log(`   - Total deleted: ${dataResults.deleted + contentResults.deleted}`);
console.log(`   - Errors: ${dataResults.errors + contentResults.errors}`);

if (dataResults.errors + contentResults.errors === 0) {
  console.log('\n✅ All corrupted translation files have been cleaned up!');
  console.log('🔄 You can now run your build process normally.');
} else {
  console.log('\n⚠️  Some files could not be deleted. Please check the errors above.');
}
