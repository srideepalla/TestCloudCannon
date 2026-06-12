import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { translateSingleFile } from './translate-single-file.js';

// File watcher for automatic translation during development
// Watches English content files and translates them when changed

const CONTENT_DIR = 'src/content/pages';
const DEBOUNCE_DELAY = 2000; // 2 seconds debounce to avoid multiple rapid translations

// Supported target languages (must match LANGUAGE_MAP keys in the translate-*.js scripts)
const SUPPORTED_LANGUAGES = [
  'ar', 'bg', 'zh-hans', 'zh-hant', 'fr', 'de', 'el', 'hu', 'id', 'it', 'ja',
  'ko', 'ms', 'fa', 'pl', 'pt-br', 'pt-pt', 'es', 'es-419', 'th', 'tr', 'vi'
];

class TranslationWatcher {
  constructor() {
    this.debounceTimers = new Map();
    this.isTranslating = new Set();
    this.watcher = null;
  }

  async start() {
    console.log('🔍 Starting file watcher for automatic translation...\n');
    console.log(`📁 Watching: ${CONTENT_DIR}`);
    console.log('📝 Only English content files (not in language subdirectories) will trigger translations\n');

    // Watch for changes in the content directory
    this.watcher = chokidar.watch(`${CONTENT_DIR}/**/*.{md,mdx}`, {
      ignored: [
        // Ignore language subdirectories
        ...SUPPORTED_LANGUAGES.map(lang => `${CONTENT_DIR}/${lang}/**`),
        // Ignore hidden files and cache
        /(^|[\/\\])\../,
        '**/node_modules/**',
        '**/.git/**'
      ],
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('add', (filePath) => this.handleFileChange(filePath))
      .on('error', (error) => console.error('❌ Watcher error:', error))
      .on('ready', () => {
        console.log('✅ File watcher is ready and monitoring for changes');
        console.log('💡 Edit any English content file to see automatic translation in action\n');
      });
  }

  async handleFileChange(filePath) {
    const normalizedPath = path.normalize(filePath);
    const relativePath = path.relative(process.cwd(), normalizedPath);
    
    console.log(`📝 File changed: ${relativePath}`);

    // Check if we're already translating this file
    if (this.isTranslating.has(normalizedPath)) {
      console.log('⏳ Translation already in progress for this file, skipping...');
      return;
    }

    // Clear existing debounce timer for this file
    if (this.debounceTimers.has(normalizedPath)) {
      clearTimeout(this.debounceTimers.get(normalizedPath));
    }

    // Set up debounced translation
    const timer = setTimeout(async () => {
      await this.translateFile(normalizedPath);
      this.debounceTimers.delete(normalizedPath);
    }, DEBOUNCE_DELAY);

    this.debounceTimers.set(normalizedPath, timer);
  }

  async translateFile(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    try {
      // Mark as translating
      this.isTranslating.add(filePath);
      
      console.log(`\n🌐 Starting automatic translation for: ${relativePath}`);
      
      // Force translation since the file was just changed
      process.env.FORCE_TRANSLATION = 'true';
      
      const result = await translateSingleFile(filePath);
      
      console.log(`✅ Translation complete for ${path.basename(filePath)}`);
      console.log(`   - ${result.totalTranslated} translations created`);
      console.log(`   - ${result.totalSkipped} translations skipped`);
      console.log('👀 Watching for more changes...\n');
      
    } catch (error) {
      console.error(`❌ Translation failed for ${relativePath}:`, error.message);
      console.log('👀 Continuing to watch for changes...\n');
    } finally {
      // Clean up
      this.isTranslating.delete(filePath);
      delete process.env.FORCE_TRANSLATION;
    }
  }

  stop() {
    if (this.watcher) {
      console.log('\n🛑 Stopping file watcher...');
      this.watcher.close();
      
      // Clear all pending timers
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();
      
      console.log('✅ File watcher stopped');
    }
  }
}

// Handle graceful shutdown
function setupGracefulShutdown(watcher) {
  const shutdown = () => {
    watcher.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGQUIT', shutdown);
}

// Main execution
async function main() {
  const watcher = new TranslationWatcher();
  
  // Setup graceful shutdown
  setupGracefulShutdown(watcher);
  
  try {
    await watcher.start();
    
    // Keep the process running
    console.log('Press Ctrl+C to stop watching\n');
    
  } catch (error) {
    console.error('❌ Failed to start file watcher:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
