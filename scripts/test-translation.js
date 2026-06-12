import fetch from 'node-fetch';

const DEEPL_API_KEY = '23b4b747-bac9-43f3-b559-4534a1e4d857';
const DEEPL_API_URL = 'https://api.deepl.com/v2/translate';

async function testTranslation() {
  console.log('🧪 Testing DeepL API...\n');
  
  // Test 1: Check API usage
  try {
    console.log('1️⃣ Checking API usage...');
    const usageResponse = await fetch('https://api.deepl.com/v2/usage', {
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      }
    });

    if (!usageResponse.ok) {
      console.error(`❌ Usage check failed: ${usageResponse.status}`);
      const errorText = await usageResponse.text();
      console.error(`Error: ${errorText}`);
      return;
    }

    const usage = await usageResponse.json();
    console.log(`✅ API Key Valid`);
    console.log(`📊 Usage: ${usage.character_count}/${usage.character_limit} characters`);
    console.log(`📈 Remaining: ${usage.character_limit - usage.character_count} characters\n`);
    
  } catch (error) {
    console.error('❌ Usage check error:', error.message);
    return;
  }

  // Test 2: Simple translation
  try {
    console.log('2️⃣ Testing simple translation...');
    const testText = 'Hello World';

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: testText,
        target_lang: 'ES',
        source_lang: 'EN'
      })
    });

    if (!response.ok) {
      console.error(`❌ Translation failed: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Translation successful:`);
    console.log(`   Original: "${testText}"`);
    console.log(`   Spanish: "${data.translations[0].text}"\n`);
    
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    return;
  }

  console.log('🎉 All tests passed! DeepL API is working correctly.');
}

testTranslation().catch(console.error);
