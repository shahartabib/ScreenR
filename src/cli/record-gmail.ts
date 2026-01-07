/**
 * Interactive Gmail Recording Script
 * Opens browser, waits for you to login, then records the compose email flow
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const OUTPUT_DIR = './output/recordings';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🎬 Gmail Tutorial Recorder');
  console.log('='.repeat(50));
  console.log('\nThis script will:');
  console.log('  1. Open a browser');
  console.log('  2. Wait for you to login to Gmail');
  console.log('  3. Record as you compose an email');
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Launch browser with recording
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  // Navigate to Gmail
  console.log('📧 Opening Gmail...');
  await page.goto('https://mail.google.com');

  console.log('\n⏳ Please login to Gmail in the browser window.');
  console.log('   Once you see your inbox, press ENTER here to continue...');
  await ask('');

  console.log('\n🎥 Recording started!');
  console.log('   Now perform these actions in the browser:');
  console.log('   1. Click "Compose" button');
  console.log('   2. Enter a recipient email');
  console.log('   3. Enter a subject');
  console.log('   4. Type your message');
  console.log('   5. (Optional) Click Send or close');
  console.log('\n   Press ENTER when done to stop recording...');
  await ask('');

  console.log('\n⏹️ Stopping recording...');

  // Close page to finalize video
  await page.close();

  // Get video path
  const video = page.video();
  let videoPath: string | null = null;

  if (video) {
    videoPath = await video.path();
    console.log(`\n✅ Video saved: ${videoPath}`);
  }

  await context.close();
  await browser.close();

  console.log('\n🎉 Recording complete!');
  if (videoPath) {
    console.log(`\n📁 Your video is at: ${path.resolve(videoPath)}`);
  }
}

main().catch(console.error);
