/**
 * Browser Automation Module
 * Handles Playwright browser control and screen recording
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import { AutomationStep } from '../types/index.js';

export interface BrowserConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  recordVideo: boolean;
  outputDir: string;
  useUserProfile?: boolean;
  userDataDir?: string;
}

export interface RecordingSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  videoPath: string | null;
  timestamps: StepTimestamp[];
  startTime: number;
}

export interface StepTimestamp {
  stepId: string;
  startTime: number;
  endTime: number;
}

const DEFAULT_CONFIG: BrowserConfig = {
  headless: false,
  viewport: { width: 1280, height: 720 },
  recordVideo: true,
  outputDir: './output/recordings',
  useUserProfile: false,
};

export async function createSession(
  config: Partial<BrowserConfig> = {}
): Promise<RecordingSession> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  let browser: Browser;
  let context: BrowserContext;

  if (finalConfig.useUserProfile) {
    // Use persistent context with user's Chrome profile
    const userDataDir = finalConfig.userDataDir ||
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');

    const contextOptions: any = {
      viewport: finalConfig.viewport,
      channel: 'chrome',
    };

    if (finalConfig.recordVideo) {
      contextOptions.recordVideo = {
        dir: finalConfig.outputDir,
        size: finalConfig.viewport,
      };
    }

    // Launch with persistent context - this uses the user's existing Chrome profile
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: finalConfig.headless,
      ...contextOptions,
    });

    browser = context.browser()!;
  } else {
    browser = await chromium.launch({
      headless: finalConfig.headless,
    });

    const contextOptions: any = {
      viewport: finalConfig.viewport,
    };

    if (finalConfig.recordVideo) {
      contextOptions.recordVideo = {
        dir: finalConfig.outputDir,
        size: finalConfig.viewport,
      };
    }

    context = await browser.newContext(contextOptions);
  }

  const page = context.pages()[0] || await context.newPage();

  return {
    browser,
    context,
    page,
    videoPath: null,
    timestamps: [],
    startTime: Date.now(),
  };
}

export async function executeStep(
  session: RecordingSession,
  step: AutomationStep
): Promise<void> {
  const { page } = session;
  const stepStart = Date.now() - session.startTime;

  console.log(`Executing: ${step.description}`);

  switch (step.action) {
    case 'navigate':
      if (step.value) {
        await page.goto(step.value, { waitUntil: 'networkidle' });
      }
      break;

    case 'click':
      if (step.selector) {
        await page.waitForSelector(step.selector, { state: 'visible' });
        await page.click(step.selector);
      }
      break;

    case 'type':
      if (step.selector && step.value) {
        await page.waitForSelector(step.selector, { state: 'visible' });
        await page.fill(step.selector, step.value);
      }
      break;

    case 'hover':
      if (step.selector) {
        await page.waitForSelector(step.selector, { state: 'visible' });
        await page.hover(step.selector);
      }
      break;

    case 'scroll':
      if (step.selector) {
        await page.waitForSelector(step.selector);
        await page.locator(step.selector).scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(() => window.scrollBy(0, 300));
      }
      break;

    case 'wait':
      if (step.waitForSelector) {
        // Wait for a specific element instead of fixed time
        const timeout = step.value ? parseInt(step.value) : 30000;
        console.log(`   Waiting for: ${step.waitForSelector} (up to ${timeout/1000}s)`);
        await page.waitForSelector(step.waitForSelector, { state: 'visible', timeout });
      } else {
        const waitTime = step.value ? parseInt(step.value) : 1000;
        await page.waitForTimeout(waitTime);
      }
      break;

    case 'screenshot':
      // Screenshot is handled separately, this is just a marker
      break;
  }

  // Wait after action if specified
  if (step.waitAfter) {
    await page.waitForTimeout(step.waitAfter);
  }

  const stepEnd = Date.now() - session.startTime;
  session.timestamps.push({
    stepId: step.id,
    startTime: stepStart,
    endTime: stepEnd,
  });
}

export async function executeSteps(
  session: RecordingSession,
  steps: AutomationStep[]
): Promise<void> {
  for (const step of steps) {
    await executeStep(session, step);
  }
}

export async function closeSession(
  session: RecordingSession
): Promise<string | null> {
  const { page, context, browser } = session;

  // Close page to finalize video recording
  await page.close();

  // Get the video path
  const video = page.video();
  let videoPath: string | null = null;

  if (video) {
    videoPath = await video.path();
    session.videoPath = videoPath;
  }

  await context.close();
  await browser.close();

  return videoPath;
}

export async function getElementPosition(
  page: Page,
  selector: string
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    const element = await page.waitForSelector(selector, { timeout: 5000 });
    if (!element) return null;

    const box = await element.boundingBox();
    if (!box) return null;

    const viewport = page.viewportSize();
    if (!viewport) return null;

    // Return as percentage of viewport
    return {
      x: (box.x / viewport.width) * 100,
      y: (box.y / viewport.height) * 100,
      width: (box.width / viewport.width) * 100,
      height: (box.height / viewport.height) * 100,
    };
  } catch {
    return null;
  }
}
