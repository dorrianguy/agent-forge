#!/usr/bin/env node
/**
 * Test Voice Agent TTS - Full flow test
 */

const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickButtonWithText(page, texts) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent.trim(), btn);
    const isVisible = await page.evaluate(el => el.offsetParent !== null, btn);
    if (isVisible && texts.some(t => text.toLowerCase().includes(t.toLowerCase()))) {
      await btn.click();
      console.log(`   ✅ Clicked: "${text}"`);
      return true;
    }
  }
  return false;
}

async function testVoiceTTS() {
  console.log('🎙️ Testing Voice Agent TTS - Full Flow\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to voice builder
    console.log('Step 1: Navigate to voice builder...');
    await page.goto('http://localhost:3008/build/voice', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('   ✅ Voice builder loaded\n');

    // Step 1: Select Template (Voice Support Agent)
    console.log('Step 2: Select template...');
    await page.waitForSelector('button', { timeout: 10000 });
    await clickButtonWithText(page, ['Voice Support Agent']);
    await delay(1500);

    // Step 2: Describe Agent - Fill in details
    console.log('\nStep 3: Configure agent details...');
    await page.screenshot({ path: 'voice-step-describe.png', fullPage: true });

    // Fill in business name if field exists
    const inputs = await page.$$('input');
    for (const input of inputs) {
      const placeholder = await page.evaluate(el => el.placeholder, input);
      if (placeholder) {
        await input.click({ clickCount: 3 });
        await input.type('Test Company Support');
        console.log('   ✅ Input filled');
        break;
      }
    }

    // Fill in textarea if exists
    const textareas = await page.$$('textarea');
    for (const ta of textareas) {
      await ta.click({ clickCount: 3 });
      await ta.type('This voice agent handles customer support calls. It answers questions about products and services.');
      console.log('   ✅ Description filled');
      break;
    }

    // Click Choose Voice / Continue
    console.log('   Looking for next button...');
    const clicked1 = await clickButtonWithText(page, ['Choose Voice', 'Continue', 'Next']);
    await delay(1500);

    // Step 3: Voice Selection
    console.log('\nStep 4: Voice selection...');
    await page.screenshot({ path: 'voice-step-select.png', fullPage: true });

    // Select a voice card (look for voice cards with cursor-pointer)
    const voiceCards = await page.$$('[class*="cursor-pointer"]');
    console.log(`   Found ${voiceCards.length} clickable elements`);
    if (voiceCards.length > 0) {
      await voiceCards[0].click();
      console.log('   ✅ Voice selected');
    }
    await delay(500);

    // Click Build Voice Agent
    console.log('   Looking for Build button...');
    const clicked2 = await clickButtonWithText(page, ['Build Voice Agent', 'Build', 'Create']);
    await delay(6000); // Wait for build simulation

    // Step 4: Check completion and test voice
    console.log('\nStep 5: Agent built - looking for Test Voice button...');
    await page.screenshot({ path: 'voice-step-complete.png', fullPage: true });

    // Get current buttons
    const currentButtons = await page.$$eval('button', btns =>
      btns.map(b => b.textContent.trim()).filter(t => t)
    );
    console.log('   Available buttons:', currentButtons);

    // Try to find and click Test Voice Agent
    const clicked3 = await clickButtonWithText(page, ['Test Voice', 'Play', 'Preview', 'Hear']);

    if (clicked3) {
      console.log('   🔊 Voice test triggered - listen for audio!\n');
    } else {
      console.log('   ⚠️ Test Voice button not found\n');
    }

    // Wait to hear the audio
    console.log('⏳ Waiting 10 seconds for audio...');
    await delay(10000);

    // Final screenshot
    await page.screenshot({ path: 'voice-test-final.png', fullPage: true });
    console.log('📸 Screenshots saved');

    console.log('\n✅ Voice TTS test complete!');
    console.log('   - If you heard human-like voice: OpenAI TTS is working');
    console.log('   - If robotic voice: Fallback to browser TTS (add OPENAI_API_KEY to .env)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (page) {
      await page.screenshot({ path: 'voice-test-error.png' });
    }
  } finally {
    await browser.close();
  }
}

testVoiceTTS();
