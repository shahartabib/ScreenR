/**
 * Assemble Government Site Tutorial Project
 * Creates a full tutorial project from the recorded video with auto-detected metadata
 */

import fs from 'fs';
import path from 'path';
import { assembleProject } from '../core/assembler.js';
import { createNarrationSegments, generateNarration } from '../core/narration.js';
import { AutomationStep, HighlightEntry } from '../types/index.js';

const OUTPUT_DIR = './output/projects';
const RECORDINGS_DIR = './output/recordings';
const METADATA_DIR = './output/metadata';

// Define the steps for the tutorial
const steps: AutomationStep[] = [
  {
    id: 'step-1',
    action: 'navigate',
    value: 'https://mr.gov.il/ilgstorefront/he/register',
    description: 'פתיחת דף ההרשמה',
    narration: 'ראשית, נפתח את דף ההרשמה באתר מינהל הרכש הממשלתי.',
  },
  {
    id: 'step-2',
    action: 'wait',
    value: '2000',
    description: 'המתנה לטעינת הדף',
    narration: 'נחכה שהדף ייטען במלואו.',
  },
  {
    id: 'step-3',
    action: 'click',
    selector: 'input[type="email"]',
    description: 'לחיצה על שדה המייל',
    narration: 'נלחץ על שדה הזנת כתובת האימייל.',
    highlight: {
      x: 50,
      y: 40,
      type: 'circle',
    },
  },
  {
    id: 'step-4',
    action: 'type',
    selector: 'input[type="email"]',
    value: 'demo@example.com',
    description: 'הזנת כתובת אימייל',
    narration: 'נזין את כתובת האימייל שלנו לקבלת עדכונים.',
    highlight: {
      x: 50,
      y: 40,
      type: 'rectangle',
    },
  },
  {
    id: 'step-5',
    action: 'hover',
    selector: 'button[type="submit"]',
    description: 'ריחוף על כפתור השליחה',
    narration: 'נרחף על כפתור השליחה כדי להשלים את ההרשמה.',
    highlight: {
      x: 50,
      y: 55,
      type: 'pulse',
    },
  },
];

const questions = [
  {
    at: 5000,
    pauseVideo: true,
    question: 'מה צריך להזין כדי להירשם לרשימת הדיוור?',
    type: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'מספר טלפון' },
      { id: 'b', text: 'כתובת אימייל' },
      { id: 'c', text: 'תעודת זהות' },
      { id: 'd', text: 'כתובת מגורים' },
    ],
    correctAnswer: 1,
    feedback: {
      correct: 'נכון! יש להזין כתובת אימייל כדי להירשם לעדכונים.',
      incorrect: 'לא בדיוק. יש להזין כתובת אימייל כדי להירשם לרשימת הדיוור.',
    },
  },
];

interface RecordingMetadata {
  videoPath: string;
  targetUrl: string;
  recordedAt: string;
  sessionId?: string;
  screenshotsDir?: string;
  defaultLanguage: string;
  availableLanguages: string[];
  steps: Array<{
    timestamp: number;
    element: {
      x: number;
      y: number;
      width: number;
      height: number;
      info: {
        tagName: string;
        fieldName: string;
        fieldType?: string;
        action: string;
        value?: string;
        selector: string;
      };
    };
    translations: Record<string, { fieldName: string; actionDescription: string }>;
    screenshotFile?: string;
  }>;
}

async function main() {
  console.log('📦 מרכיב פרויקט הדרכה - אתר המכרזים הממשלתי');
  console.log('='.repeat(50));

  // Find the most recent recording
  const recordings = fs.readdirSync(RECORDINGS_DIR)
    .filter(f => f.endsWith('.webm'))
    .map(f => ({
      name: f,
      path: path.join(RECORDINGS_DIR, f),
      mtime: fs.statSync(path.join(RECORDINGS_DIR, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (recordings.length === 0) {
    console.error('❌ לא נמצאו הקלטות. הרץ קודם: npm run record:gov');
    process.exit(1);
  }

  const latestRecording = recordings[0];
  console.log(`\n🎥 משתמש בהקלטה: ${latestRecording.name}`);
  console.log(`   נוצר: ${latestRecording.mtime.toLocaleString('he-IL')}`);

  // Try to find matching metadata file
  const metadataFilename = latestRecording.name.replace('.webm', '.json');
  const metadataPath = path.join(METADATA_DIR, metadataFilename);
  let metadata: RecordingMetadata | null = null;

  if (fs.existsSync(metadataPath)) {
    console.log(`📋 נמצא קובץ מטא-דאטה: ${metadataFilename}`);
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log(`   ${metadata!.steps.length} שדות מזוהים`);
  } else {
    console.log('⚠️ לא נמצא קובץ מטא-דאטה, משתמש בהגדרות ברירת מחדל');
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate highlights from metadata (auto-detected positions)
  let autoHighlights: HighlightEntry[] = [];
  const screenshotFiles: string[] = [];
  if (metadata && metadata.steps.length > 0) {
    console.log('\n✨ מייצר הדגשות ממיקומים אוטומטיים...');
    autoHighlights = metadata.steps.map((step, index) => {
      // Collect screenshot files for copying later
      if (step.screenshotFile) {
        screenshotFiles.push(step.screenshotFile);
      }
      return {
        id: `highlight-auto-${index}`,
        start: step.timestamp,
        end: step.timestamp + 2000, // 2 seconds per highlight
        x: step.element.x,
        y: step.element.y,
        width: Math.max(step.element.width, 5),
        height: Math.max(step.element.height, 3),
        type: step.element.info.action === 'type' ? 'rectangle' as const : 'pulse' as const,
        label: step.element.info.fieldName,
        elementInfo: step.element.info,
        translations: step.translations,
        screenshotFile: step.screenshotFile,
      };
    });
    console.log(`   נוצרו ${autoHighlights.length} הדגשות`);
    if (screenshotFiles.length > 0) {
      console.log(`   ${screenshotFiles.length} צילומי מסך לייבוא`);
    }
  }

  // Generate mock narration
  console.log('\n🎙️ מייצר קריינות (mock)...');
  const narrationSegments = createNarrationSegments(steps);
  const processedNarration = await generateNarration(narrationSegments, {
    provider: 'mock',
  });

  // Create mock timestamps based on step durations
  let currentTime = 0;
  const timestamps = steps.map(step => {
    const duration = step.action === 'wait'
      ? parseInt(step.value || '1000')
      : (step.waitAfter || 1500);
    const startTime = currentTime;
    currentTime += duration;
    return {
      stepId: step.id,
      startTime,
      endTime: currentTime,
    };
  });

  console.log('\n🔧 מרכיב את הפרויקט...');
  const { project, outputDir } = await assembleProject(
    {
      title: 'הרשמה לרשימת הדיוור - אתר המכרזים הממשלתי',
      description: 'למד כיצד להירשם לקבלת עדכונים על מכרזים ממשלתיים בדוא"ל.',
      targetUrl: metadata?.targetUrl || 'https://mr.gov.il/ilgstorefront/he/register',
      videoPath: latestRecording.path,
      steps,
      timestamps,
      narrationSegments: processedNarration,
      questions,
      generateSummary: true,
      autoHighlights, // Pass auto-detected highlights
      defaultLanguage: metadata?.defaultLanguage || 'he',
      availableLanguages: metadata?.availableLanguages || ['he', 'en', 'ar'],
    },
    OUTPUT_DIR
  );

  // Copy screenshots to project directory
  if (screenshotFiles.length > 0 && metadata?.screenshotsDir) {
    console.log('\n📸 מעתיק צילומי מסך לפרויקט...');
    const screenshotsOutputDir = path.join(outputDir, 'screenshots');
    if (!fs.existsSync(screenshotsOutputDir)) {
      fs.mkdirSync(screenshotsOutputDir, { recursive: true });
    }

    let copiedCount = 0;
    for (const screenshotFile of screenshotFiles) {
      const srcPath = path.join(metadata.screenshotsDir, screenshotFile);
      const destPath = path.join(screenshotsOutputDir, screenshotFile);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        copiedCount++;
      } else {
        console.log(`   ⚠️ לא נמצא: ${screenshotFile}`);
      }
    }
    console.log(`   ✅ הועתקו ${copiedCount} צילומי מסך`);
  }

  console.log('\n✅ הפרויקט הורכב בהצלחה!');
  console.log('='.repeat(50));
  console.log(`\n📁 מזהה פרויקט: ${project.id}`);
  console.log(`📂 תיקייה: ${path.resolve(outputDir)}`);
  console.log(`⏱️ משך: ${(project.duration / 1000).toFixed(1)} שניות`);
  console.log(`📝 כתוביות: ${project.layers.subtitles.length}`);
  console.log(`✨ הדגשות: ${project.layers.highlights.length}`);
  console.log(`📸 צילומי מסך: ${screenshotFiles.length}`);
  console.log(`❓ שאלות: ${project.layers.questions.length}`);
  console.log(`🌍 שפות: ${project.availableLanguages.join(', ')}`);

  console.log('\n🚀 להפעלת הנגן:');
  console.log(`   cd "${outputDir}"`);
  console.log('   npx serve .');
  console.log('   ואז פתח http://localhost:3000');
}

main().catch(console.error);
