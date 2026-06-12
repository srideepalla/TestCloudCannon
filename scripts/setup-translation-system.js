import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Setup script for the automatic translation system
async function setupTranslationSystem() {
  console.log('🚀 Setting up Automatic Translation System...\n');
  
  const steps = [
    {
      name: 'Check Node.js version',
      action: () => {
        const nodeVersion = process.version;
        console.log(`Node.js version: ${nodeVersion}`);
        if (parseInt(nodeVersion.slice(1)) < 16) {
          throw new Error('Node.js 16 or higher is required');
        }
      }
    },
    {
      name: 'Verify project structure',
      action: () => {
        const requiredDirs = [
          'src/content/pages',
          'scripts'
        ];
        
        for (const dir of requiredDirs) {
          if (!fs.existsSync(dir)) {
            throw new Error(`Required directory missing: ${dir}`);
          }
        }
        
        console.log('✅ Project structure verified');
      }
    },
    {
      name: 'Check required files',
      action: () => {
        const requiredFiles = [
          'scripts/translate-single-file.js',
          'scripts/cloudcannon-build-hook.js',
          'scripts/watch-and-translate.js',
          'cloudcannon.config.yml',
          'package.json'
        ];
        
        for (const file of requiredFiles) {
          if (!fs.existsSync(file)) {
            throw new Error(`Required file missing: ${file}`);
          }
        }
        
        console.log('✅ All required files present');
      }
    },
    {
      name: 'Install dependencies',
      action: () => {
        console.log('📦 Installing dependencies...');
        try {
          execSync('npm install', { stdio: 'inherit' });
          console.log('✅ Dependencies installed');
        } catch (error) {
          throw new Error('Failed to install dependencies');
        }
      }
    },
    {
      name: 'Create cache directory',
      action: () => {
        const cacheDir = '.translation-cache';
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
          console.log('✅ Translation cache directory created');
        } else {
          console.log('✅ Translation cache directory exists');
        }
      }
    },
    {
      name: 'Verify DeepL API access',
      action: async () => {
        console.log('🔍 Testing DeepL API access...');
        try {
          // Import and test the API
          const { default: fetch } = await import('node-fetch');
          const response = await fetch('https://api.deepl.com/v2/usage', {
            headers: {
              'Authorization': 'DeepL-Auth-Key 23b4b747-bac9-43f3-b559-4534a1e4d857',
            }
          });
          
          if (response.ok) {
            const usage = await response.json();
            console.log(`✅ DeepL API access verified (${usage.character_count}/${usage.character_limit} characters used)`);
          } else {
            throw new Error(`API responded with status ${response.status}`);
          }
        } catch (error) {
          console.warn(`⚠️  DeepL API test failed: ${error.message}`);
          console.warn('   Translation may not work until API access is configured');
        }
      }
    },
    {
      name: 'Test translation system',
      action: async () => {
        console.log('🧪 Testing translation system...');
        try {
          const testFile = 'src/content/pages/index.md';
          if (fs.existsSync(testFile)) {
            // Import the translation function
            const { translateSingleFile } = await import('./translate-single-file.js');
            
            // Test with a small change to force translation
            process.env.FORCE_TRANSLATION = 'true';
            
            console.log(`   Testing with: ${testFile}`);
            const result = await translateSingleFile(testFile);
            
            console.log(`✅ Translation test completed (${result.totalTranslated} translations, ${result.totalSkipped} skipped)`);
            
            delete process.env.FORCE_TRANSLATION;
          } else {
            console.log('⚠️  No test file found, skipping translation test');
          }
        } catch (error) {
          console.warn(`⚠️  Translation test failed: ${error.message}`);
          console.warn('   System is installed but may need configuration');
        }
      }
    }
  ];
  
  let completedSteps = 0;
  
  for (const step of steps) {
    try {
      console.log(`\n${completedSteps + 1}. ${step.name}...`);
      await step.action();
      completedSteps++;
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      console.log(`\n🛑 Setup stopped at step ${completedSteps + 1} of ${steps.length}`);
      process.exit(1);
    }
  }
  
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('   • For local development: npm run translate:watch');
  console.log('   • To translate a single file: npm run translate:single <file-path>');
  console.log('   • To translate all content: npm run translate');
  console.log('   • CloudCannon will automatically run translations on build');
  console.log('\n📖 See TRANSLATION_SYSTEM.md for complete documentation');
}

// Run setup
setupTranslationSystem().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
