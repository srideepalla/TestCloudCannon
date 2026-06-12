import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import crypto from 'crypto';

const DEEPL_API_KEY = '23b4b747-bac9-43f3-b559-4534a1e4d857';
const DEEPL_API_URL = 'https://api.deepl.com';

// Cache directory for storing content hashes
const CACHE_DIR = '.translation-cache';
const HASH_FILE = path.join(CACHE_DIR, 'content-hashes.json');

// Language mappings
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

// Fields that should be translated
const TRANSLATABLE_FIELDS = [
  'title',
  'page_description',
  'text',
  'heading',
  'subhead',
  'kicker',
  'description',
  'button_text',
  'form_heading',
  'main_heading_top',
  'main_heading_bottom',
  'heading_top',
  'heading_bottom',
  'know_more_button_text',
  'form_submit_button_text',
  'form_footer_text_line_1',
  'form_footer_text_line_2',
  'form_consent_text',
  'content_html'
];

function shouldSkipTranslation(text) {
  if (!text || typeof text !== 'string') return true;
  
  // Skip hex colors, URLs, file paths, and short technical strings
  if (text.match(/^#[0-9a-fA-F]{3,8}$/) ||           // Hex colors
      text.match(/^https?:\/\//) ||                   // URLs
      text.match(/^\/[a-zA-Z0-9\/_.-]*$/) ||         // File paths
      text.match(/^\.[a-zA-Z0-9]+$/) ||              // File extensions
      text.length < 3 ||                             // Very short strings
      text.match(/^[0-9px%em]+$/)) {                 // CSS values
    return true;
  }
  
  return false;
}

async function translateTexts(texts, targetLang) {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter out texts that shouldn't be translated
  const validTexts = texts.filter(text => 
    text && typeof text === 'string' && text.trim() !== '' && !shouldSkipTranslation(text)
  );

  if (validTexts.length === 0) {
    return texts; // Return original array if nothing to translate
  }

  try {
    // DeepL supports multiple texts in one API call
    const params = new URLSearchParams();
    validTexts.forEach(text => {
      params.append('text', text);
    });
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
      const errorText = await response.text();
      console.error(`❌ DeepL API Error ${response.status}: ${errorText}`);
      
      if (response.status === 456) {
        console.error('🚨 DeepL API Error 456: Quota exceeded or invalid API key');
        console.error('💡 Solutions:');
        console.error('   - Check if your API key is valid');
        console.error('   - Verify you have remaining quota');
        console.error('   - Try again later if rate limited');
        process.exit(1);
      }
      
      throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Map translations back to original positions
    const translations = data.translations.map(t => t.text);
    let translationIndex = 0;
    
    return texts.map(originalText => {
      if (originalText && typeof originalText === 'string' && originalText.trim() !== '' && !shouldSkipTranslation(originalText)) {
        return translations[translationIndex++];
      }
      return originalText; // Return unchanged if not translated
    });
    
  } catch (error) {
    console.error(`Batch translation error:`, error.message);
    return texts; // Return original texts if translation fails
  }
}

function isTranslatableField(key) {
  // Skip color, URL, and technical fields
  if (key.includes('color') || key.includes('Color') || 
      key.includes('url') || key.includes('Url') || key.includes('URL') ||
      key.includes('link') || key.includes('Link') ||
      key.includes('image') || key.includes('Image') ||
      key.includes('icon') || key.includes('Icon') ||
      key === 'style' || key === 'type' || key === '_bookshop_name') {
    return false;
  }
  
  return TRANSLATABLE_FIELDS.some(field => 
    key === field || key.includes(field) || key.endsWith('_text') || key.endsWith('_heading')
  );
}

// Content hashing functions
function getContentHash(content) {
  return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
}

function loadContentHashes() {
  try {
    if (fs.existsSync(HASH_FILE)) {
      return JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Could not load content hashes:', error.message);
  }
  return {};
}

function saveContentHashes(hashes) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2), 'utf8');
  } catch (error) {
    console.warn('Could not save content hashes:', error.message);
  }
}

function getFileKey(filePath, targetLang) {
  const relativePath = path.relative('src/content/pages', filePath);
  return `${relativePath}:${targetLang}`;
}

// Collect all translatable texts from an object recursively
function collectTranslatableTexts(obj, path = '', collected = []) {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      collectTranslatableTexts(item, `${path}[${index}]`, collected);
    });
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (isTranslatableField(key) && typeof value === 'string' && !shouldSkipTranslation(value)) {
        collected.push({
          path: currentPath,
          text: value
        });
      } else {
        collectTranslatableTexts(value, currentPath, collected);
      }
    }
  }
  
  return collected;
}

// Apply translations back to the object using paths
function applyTranslations(obj, translations) {
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone
  
  translations.forEach(({ path, translatedText }) => {
    const pathParts = path.split(/[\.\[\]]/).filter(Boolean);
    let current = result;
    
    // Navigate to the parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!isNaN(part)) {
        current = current[parseInt(part)];
      } else {
        current = current[part];
      }
    }
    
    // Set the translated value
    const lastPart = pathParts[pathParts.length - 1];
    if (!isNaN(lastPart)) {
      current[parseInt(lastPart)] = translatedText;
    } else {
      current[lastPart] = translatedText;
    }
  });
  
  return result;
}

async function translateObject(obj, targetLang) {
  // Collect all translatable texts from the entire object
  const translatableTexts = collectTranslatableTexts(obj);
  
  if (translatableTexts.length === 0) {
    return obj;
  }
  
  console.log(`🔄 Translating ${translatableTexts.length} texts in one batch...`);
  
  // Extract just the text strings for translation
  const textsToTranslate = translatableTexts.map(item => item.text);
  
  // Translate all texts in one API call
  const translatedTexts = await translateTexts(textsToTranslate, targetLang);
  
  // Map translations back to their paths
  const translationsWithPaths = translatableTexts.map((item, index) => ({
    path: item.path,
    originalText: item.text,
    translatedText: translatedTexts[index]
  }));
  
  // Log some examples
  translationsWithPaths.slice(0, 3).forEach(({ path, originalText, translatedText }) => {
    console.log(`✅ ${path}: ${originalText.substring(0, 30)}... → ${translatedText.substring(0, 30)}...`);
  });
  
  if (translationsWithPaths.length > 3) {
    console.log(`   ... and ${translationsWithPaths.length - 3} more translations`);
  }
  
  // Apply all translations to the object
  return applyTranslations(obj, translationsWithPaths);
}

async function translateMarkdownFile(filePath, targetLang, contentHashes) {
  try {
    // Create target directory structure first to validate path
    const relativePath = path.relative('src/content/pages', filePath);
    const targetDir = path.join('src/content/pages', targetLang);
    const targetFile = path.join(targetDir, relativePath);
    
    // Ensure we're not creating nested language folders - only check for actual nesting issues
    const normalizedPath = targetFile.replace(/\\/g, '/'); // Normalize path separators
    if (SUPPORTED_LANGUAGES.some(l => normalizedPath.includes(`/${targetLang}/${l}/`))) {
      console.error(`❌ Invalid target path detected: ${targetFile}`);
      return false;
    }

    // Read and parse the English source file
    const content = fs.readFileSync(filePath, 'utf8');
    const parts = content.split('---');
    
    if (parts.length < 3) {
      console.error(`Invalid markdown format in ${filePath}`);
      return false;
    }

    // Parse YAML frontmatter from English source
    const frontmatter = yaml.load(parts[1]);

    // Generate content hash for the English source frontmatter
    const currentHash = getContentHash(frontmatter);
    const fileKey = getFileKey(filePath, targetLang);
    const previousHash = contentHashes[fileKey];

    // Always translate if forced or content has changed
    const forceTranslation = process.env.FORCE_TRANSLATION === 'true';
    if (!forceTranslation && currentHash === previousHash) {
      console.log(`⏭️  Skipping ${path.basename(filePath)} (${targetLang}) - English source unchanged`);
      return false; // No translation needed
    }

    const markdownContent = parts.slice(2).join('---');

    console.log(`\n🔄 Translating ${path.basename(filePath)} to ${targetLang}...`);
    
    // Translate the frontmatter
    const translatedFrontmatter = await translateObject(frontmatter, targetLang);
    
    // Create translated content
    const translatedYaml = yaml.dump(translatedFrontmatter, {
      lineWidth: -1,
      noRefs: true
    });
    
    const translatedContent = `---\n${translatedYaml}---${markdownContent}`;
    
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, translatedContent, 'utf8');
    
    // Update hash cache
    contentHashes[fileKey] = currentHash;
    
    console.log(`✅ Created ${targetFile}`);
    return true; // Translation completed
    
  } catch (error) {
    console.error(`Error translating ${filePath}:`, error);
    return false;
  }
}

async function validateDeepLAPI() {
  console.log('🔍 Validating DeepL API key...');
  
  try {
    const response = await fetch(`${DEEPL_API_URL}/v2/usage`, {
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      }
    });

    if (!response.ok) {
      console.error('❌ DeepL API key validation failed');
      console.error(`Status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error: ${errorText}`);
      process.exit(1);
    }

    const usage = await response.json();
    console.log('✅ DeepL API key is valid');
    console.log(`📊 Usage: ${usage.character_count}/${usage.character_limit} characters`);
    
    if (usage.character_count >= usage.character_limit) {
      console.error('❌ DeepL API quota exceeded');
      process.exit(1);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to validate DeepL API:', error.message);
    process.exit(1);
  }
}

// Function to translate a single file to all languages
async function translateSingleFile(filePath) {
  console.log(`🌐 Starting translation for: ${filePath}\n`);
  
  // Validate API key first
  await validateDeepLAPI();
  
  // Load existing content hashes
  const contentHashes = loadContentHashes();
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Check if it's a markdown file
  if (!filePath.endsWith('.md')) {
    console.error(`❌ File is not a markdown file: ${filePath}`);
    process.exit(1);
  }
  
  // Check if it's in the English content directory (not in a language subdirectory)
  const relativePath = path.relative('src/content/pages', filePath);
  if (relativePath.startsWith('es/') || relativePath.startsWith('de/') || relativePath.startsWith('ar/')) {
    console.error(`❌ File is already in a language directory. Only translate English source files.`);
    process.exit(1);
  }
  
  const languages = SUPPORTED_LANGUAGES;
  let totalTranslated = 0;
  let totalSkipped = 0;
  
  // Translate for each language
  for (const lang of languages) {
    console.log(`\n📝 Translating to ${lang.toUpperCase()}...`);
    
    const wasTranslated = await translateMarkdownFile(filePath, lang, contentHashes);
    if (wasTranslated) {
      totalTranslated++;
    } else {
      totalSkipped++;
    }
  }
  
  // Save updated hashes
  saveContentHashes(contentHashes);
  
  console.log('\n🎉 Translation complete!');
  console.log(`📊 Summary: ${totalTranslated} translations created, ${totalSkipped} skipped (no changes)`);
  
  return { totalTranslated, totalSkipped };
}

// Main execution
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('❌ Usage: node translate-single-file.js <file-path>');
    console.error('Example: node translate-single-file.js src/content/pages/index.md');
    process.exit(1);
  }
  
  try {
    await translateSingleFile(filePath);
  } catch (error) {
    console.error('❌ Translation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// Export for use in other scripts
export { translateSingleFile, translateMarkdownFile, loadContentHashes, saveContentHashes };
