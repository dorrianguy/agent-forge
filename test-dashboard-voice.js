#!/usr/bin/env node
/**
 * Test Dashboard Voice Assistant
 */

const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testDashboardVoice() {
  console.log('🎙️ Testing Dashboard Voice Assistant\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to dashboard
    console.log('Step 1: Navigate to dashboard...');
    await page.goto('http://localhost:3007/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('   ✅ Dashboard loaded\n');

    // Wait for page to settle
    await delay(2000);

    // Take screenshot
    await page.screenshot({ path: 'dashboard-initial.png', fullPage: true });
    console.log('   📸 Screenshot: dashboard-initial.png\n');

    // Check if voice assistant button appears
    console.log('Step 2: Looking for voice assistant...');
    const buttons = await page.$$eval('button', btns =>
      btns.map(b => ({
        text: b.textContent.trim().substring(0, 50),
        hasIcon: b.querySelector('svg') !== null,
        className: b.className
      }))
    );
    console.log('   Found buttons:', buttons.length);

    // Look for the voice assistant floating button (should have Mic icon)
    const voiceButtonExists = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.className.includes('fixed') && btn.className.includes('bottom')) {
          return true;
        }
      }
      return false;
    });

    if (voiceButtonExists) {
      console.log('   ✅ Voice assistant button found\n');
    } else {
      console.log('   ⚠️ Voice assistant button not found - may need auth\n');
    }

    // Wait for voice greeting (auto-opens after 1.5s)
    console.log('Step 3: Waiting for voice greeting...');
    await delay(3000);

    // Take screenshot after greeting should have started
    await page.screenshot({ path: 'dashboard-voice-greeting.png', fullPage: true });
    console.log('   📸 Screenshot: dashboard-voice-greeting.png\n');

    // Check for voice assistant panel
    const panelExists = await page.evaluate(() => {
      const panels = document.querySelectorAll('[class*="fixed"][class*="bottom-24"]');
      return panels.length > 0;
    });

    if (panelExists) {
      console.log('   ✅ Voice assistant panel opened\n');
    } else {
      console.log('   Voice panel may not be visible (might redirect to login)\n');
    }

    // Check current page
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // If redirected to login/pricing, that's expected behavior
    if (currentUrl.includes('login') || currentUrl.includes('pricing')) {
      console.log('   ℹ️ Redirected (dashboard requires auth/subscription)\n');
    }

    // Wait to hear audio
    console.log('⏳ Waiting 8 seconds for audio playback...');
    await delay(8000);

    // Final screenshot
    await page.screenshot({ path: 'dashboard-voice-final.png', fullPage: true });
    console.log('📸 Final screenshot saved\n');

    console.log('✅ Dashboard voice assistant test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (page) {
      await page.screenshot({ path: 'dashboard-voice-error.png' });
    }
  } finally {
    await browser.close();
  }
}

testDashboardVoice();
