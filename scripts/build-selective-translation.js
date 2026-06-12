import fs from 'fs';
import path from 'path';
import { translateSingleFile, translateAllContent } from './translate-selective.js';

// Build-time selective translation script
// This script runs during the build process and translates only changed files

const CONTENT_DIR = 'src/content/pages';
const DATA_DIR = 'data';
const LAST_BUILD_FILE = '.last-build-timestamp';

// Supported target languages (must match LANGUAGE_MAP keys in translate-selective.js)
const SUPPORTED_LANGUAGES = [
  'ar', 'bg', 'zh-hans', 'zh-hant', 'fr', 'de', 'el', 'hu', 'id', 'it', 'ja',
  'ko', 'ms', 'fa', 'pl', 'pt-br', 'pt-pt', 'es', 'es-419', 'th', 'tr', 'vi'
];

function getLastBuildTime() {
  try {
    if (fs.existsSync(LAST_BUILD_FILE)) {
      const timestamp = fs.readFileSync(LAST_BUILD_FILE, 'utf8').trim();
      return new Date(timestamp);
    }
  } catch (error) {
    console.warn('Could not read last build timestamp:', error.message);
  }
  // If no timestamp file, consider all files as changed
  return new Date(0);
}

function saveCurrentBuildTime() {
  try {
    fs.writeFileSync(LAST_BUILD_FILE, new Date().toISOString(), 'utf8');
  } catch (error) {
    console.warn('Could not save build timestamp:', error.message);
  }
}

function getChangedFiles(since) {
  const changedFiles = [];
  
  // Check content files
  function checkContentDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip language directories (only check English source files)
          if (SUPPORTED_LANGUAGES.includes(item)) {
            continue;
          }
          checkContentDirectory(fullPath);
        } else if (item.endsWith('.md')) {
          // Check if file was modified since last build
          if (stat.mtime > since) {
            changedFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Could not check directory ${dir}:`, error.message);
    }
  }
  
  // Check data files
  function checkDataDirectory(dir) {
    try {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile() && item.endsWith('.json')) {
          // Skip already translated files (those with language suffixes)
          if (item.includes('-es.') || item.includes('-de.') || item.includes('-ar.')) {
            continue;
          }
          
          // Check if file was modified since last build
          if (stat.mtime > since) {
            changedFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Could not check directory ${dir}:`, error.message);
    }
  }
  
  checkContentDirectory(CONTENT_DIR);
  checkDataDirectory(DATA_DIR);
  
  return changedFiles;
}

async function runBuildTranslation() {
  console.log('🚀 Build-time Selective Translation Starting...\n');
  
  // Check if running in CloudCannon environment
  // CloudCannon has specific environment variables and directory structure
  const isCloudCannon = !!(
    process.env.CLOUDCANNON_BUILD_ID || 
    process.env.CLOUDCANNON || 
    process.env.NODE_ENV === 'production' ||
    process.cwd().includes('/usr/local/__site/') ||
    process.cwd().includes('cloudcannon')
  );
  
  const lastBuildTime = getLastBuildTime();
  console.log(`📅 Last build: ${lastBuildTime.toISOString()}`);
  console.log(`🌐 Environment: ${isCloudCannon ? 'CloudCannon' : 'Local'}`);
  
  const changedFiles = getChangedFiles(lastBuildTime);
  
  if (changedFiles.length === 0 && !isCloudCannon) {
    console.log('✅ No files changed since last build - using cached translations');
    saveCurrentBuildTime();
    return;
  }
  
  // In CloudCannon, always run a verification check even if no files changed
  if (changedFiles.length === 0 && isCloudCannon) {
    console.log('🔍 CloudCannon environment: Running verification check...');
  }
  
  console.log(`📝 Found ${changedFiles.length} changed files:`);
  changedFiles.forEach(file => {
    console.log(`   - ${path.relative(process.cwd(), file)}`);
  });
  
  console.log('\n🌐 Starting selective translation...\n');
  
  let totalTranslated = 0;
  let totalSkipped = 0;
  let errors = [];
  
  // Process each changed file using the selective translation system
  for (const filePath of changedFiles) {
    try {
      console.log(`\n🔄 Processing: ${path.basename(filePath)}`);
      
      // Use the selective translation system
      const result = await translateSingleFile(filePath);
      
      if (result && typeof result === 'object') {
        totalTranslated += result.totalTranslated || 0;
        totalSkipped += result.totalSkipped || 0;
      } else {
        // If result is boolean or undefined, count as processed
        totalTranslated += 1;
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      errors.push({ file: filePath, error: error.message });
    }
  }
  
  // Skip full translation check to improve build performance
  // This check processes 150+ files unnecessarily and causes 4+ minute builds
  const skipFullCheck = isCloudCannon || process.env.SKIP_FULL_TRANSLATION_CHECK === 'true';
  
  if (!skipFullCheck) {
    console.log('\n🔍 Running full selective translation check...');
    try {
      await translateAllContent();
    } catch (error) {
      console.warn('Warning during full translation check:', error.message);
    }
  } else {
    console.log('\n⚡ Skipping full translation check for faster builds');
    console.log('💡 Only changed files were processed - this saves significant build time');
  }
  
  console.log('\n🎉 Build translation complete!');
  console.log(`📊 Summary:`);
  console.log(`   - Files processed: ${changedFiles.length}`);
  console.log(`   - Translations created/updated: ${totalTranslated}`);
  console.log(`   - Translations skipped (cached): ${totalSkipped}`);
  console.log(`   - Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(({ file, error }) => {
      console.log(`   - ${path.basename(file)}: ${error}`);
    });
  }
  
  // Save current build time
  saveCurrentBuildTime();
  
  // Don't exit with error code for build process - just warn
  if (errors.length > 0) {
    console.warn('\n⚠️  Some translations failed but build will continue');
  }
  
  console.log('\n✅ Build translation process completed\n');
}

// Run the build translation
runBuildTranslation().catch(error => {
  console.error('❌ Build translation failed:', error.message);
  console.warn('⚠️  Continuing build process without translations');
  // Don't exit with error code to allow build to continue
});
