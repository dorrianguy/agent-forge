#!/usr/bin/env node
/**
 * Send Agent Forge codebase to ChatGPT Codex for review
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Gather codebase
function gatherCodebase(baseDir) {
  const files = [
    'app/page.tsx',
    'app/layout.tsx',
    'app/build/page.tsx',
    'app/build/voice/page.tsx',
    'app/dashboard/page.tsx',
    'app/login/page.tsx',
    'app/pricing/page.tsx',
    'app/api/tts/route.ts',
    'app/api/checkout/route.ts',
    'app/api/webhooks/stripe/route.ts',
    'components/VoiceAssistant.tsx',
    'components/voice/VoiceWidget.tsx',
    'lib/auth.ts',
    'lib/supabase.ts',
  ];

  let codebase = '# Agent Forge Codebase Review\n\n';
  codebase += 'Please review this codebase for:\n';
  codebase += '1. Security vulnerabilities\n';
  codebase += '2. Code quality issues\n';
  codebase += '3. Performance improvements\n';
  codebase += '4. Best practices violations\n';
  codebase += '5. Potential bugs\n\n';
  codebase += '---\n\n';

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      codebase += `## ${file}\n\n\`\`\`typescript\n${content}\n\`\`\`\n\n`;
    }
  }

  return codebase;
}

async function sendToCodex() {
  console.log('📦 Gathering Agent Forge codebase...\n');

  const baseDir = process.cwd();
  const codebase = gatherCodebase(baseDir);

  // Save codebase to file for reference
  fs.writeFileSync('codebase-for-review.md', codebase);
  console.log(`✅ Codebase gathered (${(codebase.length / 1024).toFixed(1)} KB)`);
  console.log('   Saved to: codebase-for-review.md\n');

  console.log('🌐 Opening browser to ChatGPT...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized'
    ],
    defaultViewport: null
  });

  let page;
  try {
    page = await browser.newPage();

    // Navigate to ChatGPT
    console.log('Step 1: Navigate to ChatGPT...');
    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('   ✅ ChatGPT loaded\n');

    await delay(3000);
    await page.screenshot({ path: 'chatgpt-home.png' });

    // Check if logged in or need to login
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // Wait for page to settle
    console.log('\nStep 2: Looking for Codex in sidebar...');
    await delay(2000);

    // Try to find and click Codex
    // The sidebar should have navigation items
    const sidebarItems = await page.evaluate(() => {
      const items = [];
      // Look for sidebar links/buttons
      document.querySelectorAll('nav a, nav button, [role="navigation"] a, [role="navigation"] button').forEach(el => {
        items.push({
          text: el.textContent?.trim(),
          tagName: el.tagName
        });
      });
      // Also check for any element containing "Codex"
      document.querySelectorAll('*').forEach(el => {
        if (el.textContent?.toLowerCase().includes('codex') && el.children.length === 0) {
          items.push({
            text: el.textContent.trim(),
            tagName: el.tagName,
            isCodex: true
          });
        }
      });
      return items.slice(0, 20);
    });

    console.log('   Sidebar items found:', sidebarItems.filter(i => i.text).map(i => i.text).slice(0, 10));

    // Try to click on Codex
    const codexClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
        if (el.textContent?.toLowerCase() === 'codex' ||
            el.textContent?.toLowerCase().includes('codex') && el.children.length < 3) {
          if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.onclick || el.closest('a') || el.closest('button')) {
            const clickTarget = el.closest('a') || el.closest('button') || el;
            clickTarget.click();
            return true;
          }
        }
      }
      return false;
    });

    if (codexClicked) {
      console.log('   ✅ Clicked on Codex\n');
      await delay(3000);
    } else {
      console.log('   ⚠️ Codex not found - may need to navigate manually\n');
      console.log('   Try: https://chatgpt.com/codex or look in the sidebar\n');
    }

    await page.screenshot({ path: 'chatgpt-codex.png' });

    // Look for text input area
    console.log('Step 3: Looking for input area...');
    await delay(2000);

    // Find textarea or contenteditable
    const inputFound = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      const contentEditable = document.querySelector('[contenteditable="true"]');
      return {
        hasTextarea: !!textarea,
        hasContentEditable: !!contentEditable
      };
    });

    console.log('   Input elements:', inputFound);

    if (inputFound.hasTextarea || inputFound.hasContentEditable) {
      console.log('\nStep 4: Pasting codebase for review...');

      // Due to size, we'll paste a summary request first
      const reviewRequest = `Please review the Agent Forge codebase. I'll paste the code in the next message.

Key files to review:
- app/page.tsx - Landing page
- app/build/page.tsx - Agent builder
- app/build/voice/page.tsx - Voice agent builder
- app/dashboard/page.tsx - User dashboard
- components/VoiceAssistant.tsx - Voice assistant component
- app/api/tts/route.ts - Text-to-speech API
- lib/auth.ts - Authentication utilities
- lib/supabase.ts - Database client

Focus areas:
1. Security vulnerabilities (XSS, injection, auth bypass)
2. Code quality and best practices
3. Performance issues
4. Potential bugs
5. Error handling

I'll paste the first file now.`;

      // Type into the input
      if (inputFound.hasTextarea) {
        await page.type('textarea', reviewRequest, { delay: 5 });
      } else {
        await page.type('[contenteditable="true"]', reviewRequest, { delay: 5 });
      }

      console.log('   ✅ Review request typed\n');
      await page.screenshot({ path: 'chatgpt-request.png' });
    }

    console.log('\n📋 Codebase saved to: codebase-for-review.md');
    console.log('   You can copy/paste this file into ChatGPT Codex manually.\n');
    console.log('⏳ Browser will stay open for you to complete the review...');
    console.log('   Press Ctrl+C to close when done.\n');

    // Keep browser open indefinitely
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (page) {
      await page.screenshot({ path: 'chatgpt-error.png' });
    }
  }
}

sendToCodex();
