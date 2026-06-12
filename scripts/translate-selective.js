import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
// fetch is a built-in global in Node 18+
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
  'pageHeading',
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
  'content_html',
  'name', // For language names in header
  'searchPlaceholder',
  'searchButtonText',
  'login_button_text'
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
      key.includes('flag') || key.includes('Flag') ||
      key === 'style' || key === 'type' || key === '_bookshop_name' ||
      key === 'code' || key === 'openInNewTab') {
    return false;
  }
  
  return TRANSLATABLE_FIELDS.some(field => 
    key === field || key.includes(field) || key.endsWith('_text') || key.endsWith('_heading')
  );
}

// Content hashing functions
function getContentHash(content) {
  // Normalize line endings to LF for cross-platform consistency
  const normalized = typeof content === 'string' 
    ? content.replace(/\r\n/g, '\n') 
    : content;
  return crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex');
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
  const relativePath = path.relative(process.cwd(), filePath);
  // Normalize to forward slashes for cross-platform compatibility
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return `${normalizedPath}:${targetLang}`;
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

// Translate a markdown/MDX body, block by block, so a tag problem in one paragraph
// only keeps THAT paragraph in English instead of reverting the whole body.
//  - Multi-line constructs that must never be translated (code fences, <Embed> form
//    blocks, <script>, import/export) are protected file-wide first.
//  - The body is split into blocks on blank lines. Per block, inline HTML elements
//    (<a>, <strong>, <u>, ...) are pulled out and translated in isolation with
//    tag_handling=html (so their inner text translates but tags stay intact); the
//    surrounding prose is translated as plain text.
//  - A block is only used if its tags survived exactly (</> counts + tag multiset);
//    otherwise that single block falls back to its English source.
//  - All block proses and all elements are sent in just two batched DeepL calls.
async function translateMarkdownBody(body, targetLang) {
  if (!body || body.trim() === '') return body;

  // Normalize HTML entities so encoding differences (&amp; vs &, &#x27; vs ', etc.)
  // don't cause false tag mismatches when comparing a translated element to its
  // original — DeepL keeps &amp; in hrefs, and we must not reject the element for it.
  const normEnt = (s) => s
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');

  const tagsOf = (s) => (normEnt(s).match(/<[^>]*>/g) || []).map((t) => t.replace(/\s+/g, ' ')).sort();
  // Translated `a` is "clean" vs original `b` only if (after entity normalization) it
  // has the same < and > counts (catches stray/duplicated `<` like `<<span`) AND the
  // same tag multiset.
  const cleanTags = (a, b) => {
    const na = normEnt(a);
    const nb = normEnt(b);
    if ((na.match(/</g) || []).length !== (nb.match(/</g) || []).length) return false;
    if ((na.match(/>/g) || []).length !== (nb.match(/>/g) || []).length) return false;
    const x = tagsOf(a);
    const y = tagsOf(b);
    return x.length === y.length && x.every((t, i) => t === y[i]);
  };

  // Batch DeepL call. Returns an array of translated strings, or null on failure.
  const deeplChunk = async (texts, useHtml) => {
    try {
      const params = new URLSearchParams();
      texts.forEach((t) => params.append('text', t));
      params.append('target_lang', LANGUAGE_MAP[targetLang]);
      params.append('source_lang', 'EN');
      params.append('preserve_formatting', '1');
      if (useHtml) params.append('tag_handling', 'html');

      const response = await fetch(`${DEEPL_API_URL}/v2/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        console.error(`❌ DeepL API Error ${response.status} (body): ${await response.text()}`);
        return null;
      }
      const data = await response.json();
      // Return raw text: keep &amp; in hrefs and entities intact so elements match
      // their originals; entities in visible text render fine in MDX.
      return data.translations.map((t) => t.text);
    } catch (error) {
      console.error('Body translation error:', error.message);
      return null;
    }
  };

  // DeepL caps texts per request (~50); chunk so big pages don't exceed it.
  const deepl = async (texts, useHtml) => {
    if (texts.length === 0) return [];
    const out = [];
    for (let i = 0; i < texts.length; i += 45) {
      const part = await deeplChunk(texts.slice(i, i + 45), useHtml);
      if (part == null) return null;
      out.push(...part);
    }
    return out;
  };

  // File-wide: protect multi-line constructs (also keeps them from being split).
  const verbatim = [];
  const keepV = (m) => { verbatim.push(m); return `@@V${verbatim.length - 1}@@`; };
  const protectedBody = body
    .replace(/```[\s\S]*?```/g, keepV)
    .replace(/<Embed\b[\s\S]*?<\/Embed>/gi, keepV)
    .replace(/<script\b[\s\S]*?<\/script>/gi, keepV)
    .replace(/^[ \t]*(?:import|export)\s.*$/gm, keepV);

  // Split into segments on blank lines AND on <br>/<hr> (CRLF-aware). Separators
  // (odd indices) — blank lines and the void tags themselves — are preserved verbatim,
  // so <br> is never sent to DeepL (it silently drops them, especially in long lists).
  const parts = protectedBody.split(/(\r?\n[ \t]*\r?\n|<br\s*\/?>|<hr\s*\/?>)/gi);
  const blocks = parts.map((part, idx) => {
    if (idx % 2 === 1 || part == null || part.trim() === '') return { sep: true, text: part };
    const els = [];
    const raws = [];
    const prose = part
      .replace(/<(a|strong|em|b|i|u|span)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
        els.push(m);
        return `@@E${els.length - 1}@@`;
      })
      // Self-closing JSX (<Video/>, <Anchor/>, <img/>) — keep verbatim, not translated
      // (DeepL drops them or alters their attributes).
      .replace(/<[A-Za-z][^>]*\/>/g, (m) => {
        raws.push(m);
        return `@@R${raws.length - 1}@@`;
      });
    return { sep: false, original: part, prose, els, raws };
  });

  // Two batched calls: every block's prose (plain), every block's elements (html).
  const proseInputs = blocks.filter((b) => !b.sep).map((b) => b.prose);
  const elementInputs = blocks.filter((b) => !b.sep).flatMap((b) => b.els);
  const proseOut = await deepl(proseInputs, false);
  const elemOut = elementInputs.length ? await deepl(elementInputs, true) : [];
  if (proseOut == null || elemOut == null) return body; // hard failure -> keep English body

  let pi = 0;
  let ei = 0;
  const result = blocks
    .map((b) => {
      if (b.sep) return b.text;
      const tProse = proseOut[pi++];
      const myElems = b.els.map((el) => {
        const t = elemOut[ei++];
        return cleanTags(t, el) ? t : el; // keep English element if html mode mangled it
      });
      // All placeholders must survive, else restoration leaves a stray token.
      let ok = tProse != null;
      for (let k = 0; k < b.els.length && ok; k++) {
        if (!tProse.includes(`@@E${k}@@`)) ok = false;
      }
      for (let k = 0; k < b.raws.length && ok; k++) {
        if (!tProse.includes(`@@R${k}@@`)) ok = false;
      }
      if (!ok) return b.original;
      const reconstructed = tProse
        .replace(/@@E(\d+)@@/g, (_, i) => myElems[Number(i)])
        .replace(/@@R(\d+)@@/g, (_, i) => b.raws[Number(i)]);
      // Per-block safety: the reconstructed block must have the same tags as the
      // original; otherwise keep the English block.
      return cleanTags(reconstructed, b.original) ? reconstructed : b.original;
    })
    .join('');

  // Restore file-wide protected constructs.
  return result.replace(/@@V(\d+)@@/g, (_, i) => verbatim[Number(i)]);
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
    const markdownContent = parts.slice(2).join('---');

    // Generate content hash for the English source (frontmatter + body)
    const currentHash = getContentHash({ frontmatter, body: markdownContent });
    const fileKey = getFileKey(filePath, targetLang);
    const previousHash = contentHashes[fileKey];

    // Check if English source content has changed since last translation
    if (currentHash === previousHash) {
      console.log(`⏭️  Skipping ${path.basename(filePath)} (${targetLang}) - English source unchanged`);
      return false; // No translation needed
    }
    
    // If target file exists but no hash in cache, check if we should translate
    if (fs.existsSync(targetFile) && !previousHash) {
      console.log(`⏭️  Target exists, adding English source to cache: ${path.basename(filePath)} (${targetLang})`);
      contentHashes[fileKey] = currentHash;
      return false; // No translation needed, just cache the English source hash
    }

    console.log(`\n🔄 Translating ${path.basename(filePath)} to ${targetLang}...`);

    // Translate the frontmatter
    const translatedFrontmatter = await translateObject(frontmatter, targetLang);

    // Translate the markdown/MDX body prose (frontmatter-only pages have an empty body)
    const translatedBody = await translateMarkdownBody(markdownContent, targetLang);

    // Create translated content
    const translatedYaml = yaml.dump(translatedFrontmatter, {
      lineWidth: -1,
      noRefs: true
    });

    const translatedContent = `---\n${translatedYaml}---${translatedBody}`;
    
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

async function translateJsonFile(filePath, targetLang, contentHashes) {
  try {
    // Create target file with language suffix (matching existing convention)
    const relativePath = path.relative('data', filePath);
    const parsedPath = path.parse(relativePath);
    const targetFile = path.join('data', `${parsedPath.name}-${targetLang}${parsedPath.ext}`);

    // Read and parse the English source file
    const content = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(content);

    // Generate content hash for the English source
    const currentHash = getContentHash(jsonData);
    const fileKey = getFileKey(filePath, targetLang);
    const previousHash = contentHashes[fileKey];

    // Check if English source content has changed since last translation
    if (currentHash === previousHash) {
      console.log(`⏭️  Skipping ${path.basename(filePath)} (${targetLang}) - English source unchanged`);
      return false; // No translation needed
    }
    
    // If target file exists but no hash in cache, check if we should translate
    if (fs.existsSync(targetFile) && !previousHash) {
      console.log(`⏭️  Target exists, adding English source to cache: ${path.basename(filePath)} (${targetLang})`);
      contentHashes[fileKey] = currentHash;
      return false; // No translation needed, just cache the English source hash
    }

    console.log(`\n🔄 Translating ${path.basename(filePath)} to ${targetLang}...`);
    
    // Translate the JSON data
    const translatedData = await translateObject(jsonData, targetLang);
    
    // Create translated content
    const translatedContent = JSON.stringify(translatedData, null, 2);
    
    // No need to create directory since we're using the same data directory
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

async function translateSingleFile(filePath, targetLanguages = SUPPORTED_LANGUAGES) {
  console.log(`🌐 Starting selective translation for: ${filePath}\n`);
  
  // Validate API key first
  await validateDeepLAPI();
  
  // Load existing content hashes
  const contentHashes = loadContentHashes();
  
  let totalTranslated = 0;
  let totalSkipped = 0;
  
  // Determine file type and translate accordingly
  const isMarkdown = filePath.endsWith('.md') || filePath.endsWith('.mdx');
  const isJson = filePath.endsWith('.json');
  
  if (!isMarkdown && !isJson) {
    console.error(`❌ Unsupported file type: ${filePath}`);
    return { totalTranslated: 0, totalSkipped: 0, error: 'Unsupported file type' };
  }
  
  // Translate for each language
  for (const lang of targetLanguages) {
    console.log(`\n📝 Translating to ${lang.toUpperCase()}...`);
    
    let wasTranslated = false;
    
    if (isMarkdown) {
      wasTranslated = await translateMarkdownFile(filePath, lang, contentHashes);
    } else if (isJson) {
      wasTranslated = await translateJsonFile(filePath, lang, contentHashes);
    }
    
    if (wasTranslated) {
      totalTranslated++;
    } else {
      totalSkipped++;
    }
  }
  
  // Save updated hashes
  saveContentHashes(contentHashes);
  
  console.log('\n🎉 Translation complete!');
  console.log(`📊 Summary: ${totalTranslated} files translated, ${totalSkipped} files skipped (no changes)`);
  
  if (totalTranslated > 0) {
    console.log('💰 DeepL API calls saved by caching:', totalSkipped);
  }
  
  return { totalTranslated, totalSkipped };
}

async function translateAllContent() {
  const contentDir = 'src/content/pages';
  const dataDir = 'data';
  
  // Check if specific language is requested via command line argument
  const targetLanguage = process.argv[2];
  const languages = targetLanguage ? [targetLanguage] : SUPPORTED_LANGUAGES;
  
  console.log('🌐 Starting content translation...\n');
  
  // Validate API key first
  await validateDeepLAPI();
  
  // Load existing content hashes
  const contentHashes = loadContentHashes();
  
  // Get all markdown files
  function getMarkdownFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip language directories to avoid processing translated files
        if (SUPPORTED_LANGUAGES.includes(item)) {
          console.log(`⏭️  Skipping language directory: ${item}`);
          continue;
        }
        files.push(...getMarkdownFiles(fullPath));
      } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  // Get all JSON files from data directory (only English source files)
  function getJsonFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip language directories to avoid processing translated files
        if (SUPPORTED_LANGUAGES.includes(item)) {
          console.log(`⏭️  Skipping language directory: ${item}`);
          continue;
        }
        files.push(...getJsonFiles(fullPath));
      } else if (item.endsWith('.json')) {
        // Only process English source files (exclude already translated files)
        if (!isTranslatedFile(item)) {
          files.push(fullPath);
        } else {
          console.log(`⏭️  Skipping translated file: ${item}`);
        }
      }
    }
    
    return files;
  }
  
  // Helper function to identify translated files
  function isTranslatedFile(filename) {
    // Check if filename contains language suffixes
    const languageSuffixes = ['-es.', '-de.', '-ar.'];
    return languageSuffixes.some(suffix => filename.includes(suffix));
  }
  
  const markdownFiles = getMarkdownFiles(contentDir);
  const jsonFiles = getJsonFiles(dataDir);
  const allFiles = [...markdownFiles, ...jsonFiles];
  
  console.log(`Found ${markdownFiles.length} markdown files and ${jsonFiles.length} JSON files to translate`);
  console.log('Files to translate:', allFiles.map(f => path.basename(f)));
  
  let totalTranslated = 0;
  let totalSkipped = 0;
  
  // Translate for each language
  for (const lang of languages) {
    console.log(`\n📝 Translating content to ${lang.toUpperCase()}...`);
    
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const progress = `(${i + 1}/${allFiles.length})`;
      console.log(`${progress} Processing ${path.basename(file)}...`);
      
      let wasTranslated = false;
      
      if (file.endsWith('.md') || file.endsWith('.mdx')) {
        wasTranslated = await translateMarkdownFile(file, lang, contentHashes);
      } else if (file.endsWith('.json')) {
        wasTranslated = await translateJsonFile(file, lang, contentHashes);
      }
      
      if (wasTranslated) {
        totalTranslated++;
      } else {
        totalSkipped++;
      }
    }
  }
  
  // Save updated hashes
  saveContentHashes(contentHashes);
  
  console.log('\n🎉 Translation complete!');
  console.log(`📊 Summary: ${totalTranslated} files translated, ${totalSkipped} files skipped (no changes)`);
  
  if (totalTranslated > 0) {
    console.log('💰 DeepL API calls saved by caching:', totalSkipped);
  }
}

// Export functions for use in other scripts
export { translateSingleFile, translateAllContent, validateDeepLAPI, translateMarkdownFile, translateJsonFile };

// Run the translation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  
  if (filePath && fs.existsSync(filePath)) {
    // Translate single file
    translateSingleFile(filePath).catch(console.error);
  } else {
    // Translate all content
    translateAllContent().catch(console.error);
  }
}
