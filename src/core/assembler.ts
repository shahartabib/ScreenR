/**
 * Project Assembler
 * Combines recordings, narration, and metadata into a playable project
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import {
  Project,
  AutomationStep,
  SubtitleEntry,
  HighlightEntry,
  QuestionEntry,
  SummaryLayer,
  InteractiveStep,
} from '../types/index.js';
import { StepTimestamp } from './browser.js';
import { NarrationSegment, estimateDuration } from './narration.js';

export interface AssemblerInput {
  title: string;
  description: string;
  targetUrl: string;
  videoPath: string;
  audioPath?: string;
  steps: AutomationStep[];
  timestamps: StepTimestamp[];
  narrationSegments?: NarrationSegment[];
  questions?: Omit<QuestionEntry, 'id'>[];
  generateSummary?: boolean;
  autoHighlights?: HighlightEntry[]; // Auto-detected highlights with positions
  defaultLanguage?: string;
  availableLanguages?: string[];
}

export interface AssemblerOutput {
  project: Project;
  outputDir: string;
}

export async function assembleProject(
  input: AssemblerInput,
  outputDir: string
): Promise<AssemblerOutput> {
  const projectId = uuid();
  const projectDir = path.join(outputDir, projectId);

  // Create project directory
  fs.mkdirSync(projectDir, { recursive: true });

  // Copy video file
  const videoFileName = 'video.webm';
  const videoDestPath = path.join(projectDir, videoFileName);
  fs.copyFileSync(input.videoPath, videoDestPath);

  // Copy audio file if exists
  let audioFileName: string | undefined;
  if (input.audioPath && fs.existsSync(input.audioPath)) {
    audioFileName = 'narration.mp3';
    fs.copyFileSync(input.audioPath, path.join(projectDir, audioFileName));
  }

  // Calculate total duration from timestamps
  const duration = input.timestamps.length > 0
    ? input.timestamps[input.timestamps.length - 1].endTime
    : 0;

  // Generate subtitles from narration segments and timestamps
  const subtitles = generateSubtitles(input.steps, input.timestamps);

  // Use auto-detected highlights if provided, otherwise generate from steps
  const highlights = input.autoHighlights && input.autoHighlights.length > 0
    ? input.autoHighlights
    : generateHighlights(input.steps, input.timestamps);

  // Add questions with IDs
  const questions: QuestionEntry[] = (input.questions || []).map((q, i) => ({
    ...q,
    id: `question-${i}`,
  }));

  // Generate summary if requested
  const summary: SummaryLayer | undefined = input.generateSummary
    ? generateSummary(input.steps, input.timestamps)
    : undefined;

  // Generate interactive steps for guide-me and test-me modes
  const interactiveSteps = generateInteractiveSteps(input.steps, input.timestamps);

  const project: Project = {
    id: projectId,
    title: input.title,
    description: input.description,
    targetUrl: input.targetUrl,
    duration,
    createdAt: new Date().toISOString(),
    layers: {
      video: {
        src: videoFileName,
        width: 1280,
        height: 720,
      },
      audio: audioFileName
        ? { src: audioFileName, volume: 1 }
        : { src: '', volume: 0 },
      subtitles,
      highlights,
      questions,
      summary,
    },
    interactiveSteps,
    defaultLanguage: input.defaultLanguage || 'en',
    availableLanguages: input.availableLanguages || ['en'],
  };

  // Write project.json
  const projectJsonPath = path.join(projectDir, 'project.json');
  fs.writeFileSync(projectJsonPath, JSON.stringify(project, null, 2));

  // Copy player HTML
  const playerHtmlSrc = path.join(
    path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'),
    '..',
    'player',
    'player.html'
  );
  const playerHtmlDest = path.join(projectDir, 'index.html');

  // On Windows, fix the path
  const fixedPlayerPath = playerHtmlSrc.replace(/\\/g, '/');
  if (fs.existsSync(fixedPlayerPath)) {
    fs.copyFileSync(fixedPlayerPath, playerHtmlDest);
  } else {
    // Fallback: try relative path from cwd
    const altPath = path.join(process.cwd(), 'src', 'player', 'player.html');
    if (fs.existsSync(altPath)) {
      fs.copyFileSync(altPath, playerHtmlDest);
    }
  }

  return {
    project,
    outputDir: projectDir,
  };
}

function generateSubtitles(
  steps: AutomationStep[],
  timestamps: StepTimestamp[]
): SubtitleEntry[] {
  const subtitles: SubtitleEntry[] = [];

  steps.forEach((step) => {
    const timestamp = timestamps.find((t) => t.stepId === step.id);
    if (timestamp && step.narration) {
      subtitles.push({
        id: `subtitle-${step.id}`,
        start: timestamp.startTime,
        end: timestamp.endTime,
        text: step.narration,
      });
    }
  });

  return subtitles;
}

function generateHighlights(
  steps: AutomationStep[],
  timestamps: StepTimestamp[]
): HighlightEntry[] {
  const highlights: HighlightEntry[] = [];

  steps.forEach((step) => {
    if (step.highlight) {
      const timestamp = timestamps.find((t) => t.stepId === step.id);
      if (timestamp) {
        highlights.push({
          id: `highlight-${step.id}`,
          start: timestamp.startTime,
          end: timestamp.endTime,
          x: step.highlight.x,
          y: step.highlight.y,
          type: step.highlight.type,
          width: 5,
          height: 5,
        });
      }
    }
  });

  return highlights;
}

function generateSummary(
  steps: AutomationStep[],
  timestamps: StepTimestamp[]
): SummaryLayer {
  // Extract key points from step descriptions
  const keyPoints = steps
    .filter((s) => s.action !== 'wait')
    .map((s) => s.description);

  // Create chapters based on major steps
  const chapters = steps
    .filter((s) => ['navigate', 'click'].includes(s.action))
    .map((step) => {
      const timestamp = timestamps.find((t) => t.stepId === step.id);
      return {
        title: step.description,
        startTime: timestamp?.startTime || 0,
      };
    });

  return {
    keyPoints,
    chapters,
    generatedBy: 'ai',
  };
}

export function getProjectPath(projectId: string, outputDir: string): string {
  return path.join(outputDir, projectId);
}

function generateInteractiveSteps(
  steps: AutomationStep[],
  timestamps: StepTimestamp[]
): InteractiveStep[] {
  const interactiveSteps: InteractiveStep[] = [];
  let order = 0;

  steps.forEach((step) => {
    // Only create interactive steps for clickable actions
    if (!['click', 'type'].includes(step.action)) return;
    if (!step.highlight) return;

    const timestamp = timestamps.find((t) => t.stepId === step.id);

    interactiveSteps.push({
      id: `interactive-${step.id}`,
      order: order++,
      instruction: step.narration || step.description,
      hint: `Look for the ${step.description.toLowerCase()}`,
      target: {
        x: step.highlight.x,
        y: step.highlight.y,
        width: 10,
        height: 8,
        highlightType: step.highlight.type === 'pulse' ? 'pulse' : 'glow',
        tolerance: 15,
      },
      onCorrect: {
        feedback: 'Great job!',
        autoAdvance: true,
      },
      onIncorrect: {
        feedback: 'Not quite, try again.',
        showHint: true,
        maxAttempts: 3,
      },
      scoring: {
        points: 10,
        penaltyPerWrongClick: 2,
      },
    });
  });

  return interactiveSteps;
}
