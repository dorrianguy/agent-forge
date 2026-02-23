#!/usr/bin/env node
/**
 * Open ChatGPT Codex and paste code for review
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function openCodex() {
  console.log('🌐 Opening ChatGPT Codex...\n');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized'
    ],
    defaultViewport: null,
    ignoreDefaultArgs: ['--disable-extensions'] // Allow extensions
  });

  let page;
  try {
    page = await browser.newPage();

    // Go directly to Codex
    console.log('Step 1: Navigate to ChatGPT Codex...');
    await page.goto('https://chatgpt.com/codex', { waitUntil: 'networkidle2', timeout: 60000 });

    await delay(3000);
    const url = page.url();
    console.log('   Current URL:', url);

    if (url.includes('auth') || url.includes('login')) {
      console.log('\n⚠️  Login required. Please log in to ChatGPT in the browser.');
      console.log('   After logging in, I\'ll continue automatically...\n');

      // Wait for navigation away from login page
      await page.waitForFunction(
        () => !window.location.href.includes('auth') && !window.location.href.includes('login'),
        { timeout: 300000 } // 5 minutes to login
      );

      console.log('   ✅ Logged in!\n');
      await delay(2000);
    }

    // Take screenshot
    await page.screenshot({ path: 'codex-page.png' });
    console.log('   📸 Screenshot: codex-page.png\n');

    // Check what's on the page
    console.log('Step 2: Analyzing page...');
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasTextarea: !!document.querySelector('textarea'),
        hasContentEditable: !!document.querySelector('[contenteditable="true"]'),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(t => t).slice(0, 10),
        h1s: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()),
        h2s: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim())
      };
    });

    console.log('   Page title:', pageInfo.title);
    console.log('   URL:', pageInfo.url);
    console.log('   Headings:', [...pageInfo.h1s, ...pageInfo.h2s].slice(0, 5));
    console.log('   Buttons:', pageInfo.buttons.slice(0, 5));

    // Read the codebase file
    const codebaseFile = path.join(process.cwd(), 'codebase-for-review.md');
    let codebase = '';
    if (fs.existsSync(codebaseFile)) {
      codebase = fs.readFileSync(codebaseFile, 'utf8');
      console.log(`\n   Codebase loaded: ${(codebase.length / 1024).toFixed(1)} KB\n`);
    }

    // If we have an input area, prepare for paste
    if (pageInfo.hasTextarea || pageInfo.hasContentEditable) {
      console.log('Step 3: Ready to paste code...');
      console.log('   Input area found. You can paste the code now.\n');

      // Copy codebase to clipboard via page
      await page.evaluate((code) => {
        navigator.clipboard.writeText(code).catch(() => {
          // Fallback - create temp textarea
          const ta = document.createElement('textarea');
          ta.value = code;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        });
      }, codebase.substring(0, 50000)); // Limit to 50KB for clipboard

      console.log('   ✅ Code copied to clipboard (first 50KB)');
      console.log('   Press Ctrl+V in the input area to paste\n');
    }

    console.log('📋 Full codebase saved to: codebase-for-review.md');
    console.log('   You can copy sections from this file if needed.\n');
    console.log('⏳ Browser will stay open. Close it when done.\n');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (page) {
      await page.screenshot({ path: 'codex-error.png' });
    }
    // Still keep browser open on error
    console.log('\n⏳ Browser staying open despite error...');
    await new Promise(() => {});
  }
}

openCodex();
