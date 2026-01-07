/**
 * Login Script - Opens browser for Gmail login
 * Run this once to save your Gmail session for future recordings
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const PROFILE_DIR = './output/chrome-profile';

async function login() {
  console.log('🔐 ScreenR Gmail Login');
  console.log('='.repeat(50));
  console.log('\nThis will open a browser for you to log into Gmail.');
  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. Log into your Gmail account');
  console.log('   2. WAIT until you see your Gmail inbox (with your emails)');
  console.log('   3. Only THEN close the browser window to save your session\n');

  // Ensure profile directory exists
  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 720 },
    channel: 'chrome',
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('🌐 Opening Gmail...');
  await page.goto('https://mail.google.com');

  console.log('\n⏳ Waiting for you to complete login...');
  console.log('   Remember: Wait until you see your inbox before closing!\n');

  // Wait for browser to be closed by user
  await new Promise<void>((resolve) => {
    context.on('close', () => {
      resolve();
    });
  });

  console.log('✅ Session saved! You can now run: npm run demo\n');
}

login().catch(console.error);
