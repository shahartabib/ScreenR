/**
 * ScreenR Demo Runner
 * Demonstrates the POC by recording a Gmail tutorial
 */

import path from 'path';
import fs from 'fs';
import {
  createSession,
  executeSteps,
  closeSession,
} from './core/browser.js';
import {
  generateNarration,
  createNarrationSegments,
} from './core/narration.js';
import { assembleProject } from './core/assembler.js';
import * as gmailTutorials from './tutorials/gmail/index.js';
import { AutomationStep, QuestionEntry } from './types/index.js';

const OUTPUT_DIR = './output/projects';

type TutorialName = 'compose-email' | 'create-label' | 'create-filter';

interface TutorialModule {
  TUTORIAL_TITLE: string;
  TUTORIAL_DESCRIPTION: string;
  TARGET_URL: string;
  steps: AutomationStep[];
  questions: Omit<QuestionEntry, 'id'>[];
}

async function runDemo(tutorialName: TutorialName = 'compose-email') {
  console.log('🎬 ScreenR Demo Runner');
  console.log('='.repeat(50));

  // Select tutorial
  const tutorials: Record<TutorialName, TutorialModule> = {
    'compose-email': gmailTutorials.composeEmail,
    'create-label': gmailTutorials.createLabel,
    'create-filter': gmailTutorials.createFilter,
  };

  const tutorial = tutorials[tutorialName];
  if (!tutorial) {
    console.error(`Unknown tutorial: ${tutorialName}`);
    console.log('Available tutorials:', Object.keys(tutorials).join(', '));
    process.exit(1);
  }

  console.log(`\n📚 Tutorial: ${tutorial.TUTORIAL_TITLE}`);
  console.log(`📝 ${tutorial.TUTORIAL_DESCRIPTION}`);
  console.log(`🔗 Target: ${tutorial.TARGET_URL}`);
  console.log(`📊 Steps: ${tutorial.steps.length}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const recordingDir = './output/recordings';
  if (!fs.existsSync(recordingDir)) {
    fs.mkdirSync(recordingDir, { recursive: true });
  }

  try {
    // Step 1: Generate narration segments (mock for now)
    console.log('🎙️  Generating narration...');
    const narrationSegments = createNarrationSegments(tutorial.steps);
    const processedNarration = await generateNarration(narrationSegments, {
      provider: 'mock', // Change to 'openai' when API key is available
    });
    console.log(`   Generated ${processedNarration.length} narration segments\n`);

    // Step 2: Create browser session and record
    console.log('🌐 Starting browser session...');
    console.log('   ⚠️  Note: You need to be logged into Gmail for this demo');
    console.log('   The browser will open and record your actions\n');

    const session = await createSession({
      headless: false,
      recordVideo: true,
      outputDir: recordingDir,
      viewport: { width: 1280, height: 720 },
      useUserProfile: false, // Use fresh browser - user will login during recording
    });

    console.log('▶️  Executing tutorial steps...\n');
    await executeSteps(session, tutorial.steps);

    console.log('\n⏹️  Closing session and saving video...');
    const videoPath = await closeSession(session);

    if (!videoPath) {
      throw new Error('Failed to save video recording');
    }

    console.log(`   Video saved: ${videoPath}\n`);

    // Step 3: Assemble the project
    console.log('📦 Assembling project...');
    const { project, outputDir } = await assembleProject(
      {
        title: tutorial.TUTORIAL_TITLE,
        description: tutorial.TUTORIAL_DESCRIPTION,
        targetUrl: tutorial.TARGET_URL,
        videoPath,
        steps: tutorial.steps,
        timestamps: session.timestamps,
        narrationSegments: processedNarration,
        questions: tutorial.questions,
        generateSummary: true,
      },
      OUTPUT_DIR
    );

    console.log(`   Project ID: ${project.id}`);
    console.log(`   Output: ${outputDir}\n`);

    // Step 4: Summary
    console.log('✅ Demo Complete!');
    console.log('='.repeat(50));
    console.log(`\n📁 Project files created in: ${outputDir}`);
    console.log('\nTo view the tutorial:');
    console.log(`  1. cd "${outputDir}"`);
    console.log('  2. Start a local server: npx serve .');
    console.log('  3. Open http://localhost:3000 in your browser');
    console.log('\nOr run: npm run serve\n');

    return { project, outputDir };
  } catch (error) {
    console.error('\n❌ Error running demo:', error);
    throw error;
  }
}

// Parse command line arguments
const tutorialArg = process.argv[2] as TutorialName | undefined;
runDemo(tutorialArg || 'compose-email');
