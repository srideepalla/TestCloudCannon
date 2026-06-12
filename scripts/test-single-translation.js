import fs from 'fs';
import path from 'path';
import { translateSingleFile } from './translate-single-file.js';

// Test script for single file translation
async function testSingleTranslation() {
  console.log('🧪 Testing single file translation system...\n');
  
  // Test with the index.md file
  const testFile = 'src/content/pages/index.md';
  
  // Check if test file exists
  if (!fs.existsSync(testFile)) {
    console.error(`❌ Test file not found: ${testFile}`);
    process.exit(1);
  }
  
  console.log(`📄 Testing with file: ${testFile}`);
  console.log('🔄 This will translate the file to all supported languages...\n');
  
  try {
    // Force translation for testing
    process.env.FORCE_TRANSLATION = 'true';
    
    const result = await translateSingleFile(testFile);
    
    console.log('\n✅ Test completed successfully!');
    console.log(`📊 Results: ${result.totalTranslated} translations, ${result.totalSkipped} skipped`);
    
    // Verify translated files exist
    const languages = [
      'ar', 'bg', 'zh-hans', 'zh-hant', 'fr', 'de', 'el', 'hu', 'id', 'it', 'ja',
      'ko', 'ms', 'fa', 'pl', 'pt-br', 'pt-pt', 'es', 'es-419', 'th', 'tr', 'vi'
    ];
    console.log('\n🔍 Verifying translated files...');
    
    for (const lang of languages) {
      const translatedFile = path.join('src/content/pages', lang, 'index.md');
      if (fs.existsSync(translatedFile)) {
        console.log(`✅ ${lang}/index.md exists`);
      } else {
        console.log(`❌ ${lang}/index.md missing`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    delete process.env.FORCE_TRANSLATION;
  }
}

testSingleTranslation().catch(console.error);
