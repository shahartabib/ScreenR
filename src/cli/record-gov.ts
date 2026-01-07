/**
 * Record Government Procurement Site Tutorial
 * With auto-detection of element positions and names
 */

import { chromium, ElementHandle } from 'playwright';
import fs from 'fs';
import path from 'path';
import { detectElement, generateTranslations, DetectedElement } from '../core/element-detector.js';
import { HighlightEntry } from '../types/index.js';

const OUTPUT_DIR = './output/recordings';
const METADATA_DIR = './output/metadata';
const SCREENSHOTS_DIR = './output/screenshots';
const TARGET_URL = 'https://mr.gov.il/ilgstorefront/he/register';

interface RecordedStep {
  timestamp: number;
  element: DetectedElement;
  translations: Record<string, { fieldName: string; actionDescription: string }>;
  screenshotFile?: string; // Screenshot filename for this step
}

async function main() {
  console.log('🎬 מקליט הדרכה - אתר המכרזים הממשלתי');
  console.log('='.repeat(50));

  // Ensure output directories exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(METADATA_DIR)) {
    fs.mkdirSync(METADATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // Generate unique session ID for screenshots
  const sessionId = Date.now().toString(36);
  let stepCounter = 0;

  console.log('\n🌐 מפעיל דפדפן...');
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
  const recordedSteps: RecordedStep[] = [];
  const startTime = Date.now();

  try {
    console.log('📄 פותח את דף ההרשמה...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('🔍 מחפש וממפה שדות בטופס...\n');

    // Find and interact with form fields
    const formFields = await page.$$('input, button[type="submit"], select, textarea');

    for (const field of formFields) {
      const fieldType = await field.getAttribute('type');
      const fieldTag = await field.evaluate(el => el.tagName.toLowerCase());

      // Skip hidden fields
      if (fieldType === 'hidden') continue;

      // Check if element is visible
      const isVisible = await field.isVisible();
      if (!isVisible) continue;

      // Detect element info
      const detected = await detectElement(page, field, 'click');
      if (!detected) continue;

      console.log(`📍 נמצא: ${detected.info.fieldName} (${detected.info.tagName})`);
      console.log(`   מיקום: x=${detected.x.toFixed(1)}%, y=${detected.y.toFixed(1)}%`);

      // Scroll element into view
      await field.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Record timestamp
      const timestamp = Date.now() - startTime;

      // Perform action based on field type
      if (fieldTag === 'input' && (fieldType === 'email' || fieldType === 'text')) {
        // Take screenshot BEFORE action (clean state)
        stepCounter++;
        const screenshotFile = `${sessionId}_step${stepCounter.toString().padStart(3, '0')}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFile);
        await page.screenshot({ path: screenshotPath });
        console.log(`   📸 צילום מסך: ${screenshotFile}`);

        // Click and type
        await field.click();
        await page.waitForTimeout(300);

        const testValue = fieldType === 'email' ? 'demo@example.com' : 'טקסט לדוגמה';
        await field.fill(testValue);

        // Re-detect with type action and value
        const typedElement = await detectElement(page, field, 'type', testValue);
        if (typedElement) {
          const translations = generateTranslations(typedElement.info);
          recordedSteps.push({ timestamp, element: typedElement, translations, screenshotFile });
          console.log(`   ✏️ הוזן: "${testValue}"`);
        }

        await page.waitForTimeout(500);
      } else if (fieldTag === 'button' || fieldType === 'submit') {
        // Take screenshot BEFORE action
        stepCounter++;
        const screenshotFile = `${sessionId}_step${stepCounter.toString().padStart(3, '0')}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFile);
        await page.screenshot({ path: screenshotPath });
        console.log(`   📸 צילום מסך: ${screenshotFile}`);

        // Hover over button (don't click submit)
        await field.hover();

        const hoverElement = await detectElement(page, field, 'hover');
        if (hoverElement) {
          const translations = generateTranslations(hoverElement.info);
          recordedSteps.push({ timestamp, element: hoverElement, translations, screenshotFile });
          console.log(`   👆 ריחוף על כפתור`);
        }

        await page.waitForTimeout(500);
      } else if (fieldTag === 'select') {
        // Take screenshot BEFORE action
        stepCounter++;
        const screenshotFile = `${sessionId}_step${stepCounter.toString().padStart(3, '0')}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFile);
        await page.screenshot({ path: screenshotPath });
        console.log(`   📸 צילום מסך: ${screenshotFile}`);

        // Click on select
        await field.click();

        const clickElement = await detectElement(page, field, 'click');
        if (clickElement) {
          const translations = generateTranslations(clickElement.info);
          recordedSteps.push({ timestamp, element: clickElement, translations, screenshotFile });
        }

        await page.waitForTimeout(300);
        await page.keyboard.press('Escape'); // Close dropdown
      }

      console.log('');
    }

    console.log('⏹️ מסיים הקלטה...');
    await page.waitForTimeout(1000);

  } catch (error) {
    console.error('❌ שגיאה:', error);
  }

  // Close and save video
  await page.close();

  const video = page.video();
  let videoPath: string | null = null;

  if (video) {
    videoPath = await video.path();
    console.log(`\n✅ הסרטון נשמר: ${path.resolve(videoPath)}`);
  }

  // Save metadata with detected elements
  if (videoPath && recordedSteps.length > 0) {
    const videoFilename = path.basename(videoPath, '.webm');
    const metadataPath = path.join(METADATA_DIR, `${videoFilename}.json`);

    const metadata = {
      videoPath,
      targetUrl: TARGET_URL,
      recordedAt: new Date().toISOString(),
      sessionId,
      screenshotsDir: SCREENSHOTS_DIR,
      defaultLanguage: 'he',
      availableLanguages: ['he', 'en', 'ar'],
      steps: recordedSteps,
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 מטא-דאטה נשמרה: ${metadataPath}`);
    console.log(`   ${recordedSteps.length} שדות מזוהים`);
  }

  await context.close();
  await browser.close();

  console.log('\n🎉 ההקלטה הושלמה!');
}

main().catch(console.error);
