/**
 * ScreenR Project Types
 * Defines the structure for interactive tutorial videos
 */

/**
 * Learning Modes
 * - show-me: Passive viewing - user watches the tutorial video
 * - guide-me: Guided practice - user clicks where highlighted, system validates
 * - test-me: Assessment - user performs task without guidance, scored
 */
export type LearningMode = 'show-me' | 'guide-me' | 'test-me';

export interface Project {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  duration: number; // in milliseconds
  createdAt: string;
  layers: ProjectLayers;
  interactiveSteps: InteractiveStep[]; // Steps for guide-me and test-me modes
  scorm?: ScormConfig;
  defaultLanguage: string; // e.g., 'he', 'en', 'ar'
  availableLanguages: string[]; // Languages with translations
}

export interface ProjectLayers {
  video: VideoLayer;
  audio: AudioLayer;
  subtitles: SubtitleEntry[];
  highlights: HighlightEntry[];
  questions: QuestionEntry[];
  summary?: SummaryLayer;
}

export interface VideoLayer {
  src: string; // path to webm/mp4 file
  width: number;
  height: number;
}

export interface AudioLayer {
  src: string; // path to mp3/wav file
  volume: number; // 0-1
}

export interface SubtitleEntry {
  id: string;
  start: number; // ms
  end: number; // ms
  text: string;
}

export interface HighlightEntry {
  id: string;
  start: number; // ms
  end: number; // ms
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width?: number;
  height?: number;
  type: 'circle' | 'rectangle' | 'arrow' | 'pulse';
  color?: string;
  label?: string;
  // Auto-detected element info
  elementInfo?: ElementInfo;
  // Translations for the tooltip
  translations?: Record<string, TooltipTranslation>;
  // Screenshot filename for Guide Me mode
  screenshotFile?: string;
}

/**
 * Auto-detected information about an element
 */
export interface ElementInfo {
  tagName: string; // e.g., 'input', 'button', 'a'
  fieldName: string; // Detected name from label/placeholder/aria-label
  fieldType?: string; // e.g., 'email', 'text', 'submit'
  action: string; // e.g., 'click', 'type', 'hover'
  value?: string; // Value entered (for type actions)
  selector: string; // CSS selector used
}

/**
 * Tooltip text in a specific language
 */
export interface TooltipTranslation {
  fieldName: string; // Translated field name
  actionDescription: string; // e.g., "Click on Email field" / "לחץ על שדה האימייל"
}

export interface QuestionEntry {
  id: string;
  at: number; // ms - when to show
  pauseVideo: boolean;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'click-target';
  options?: QuestionOption[];
  correctAnswer: string | number;
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface SummaryLayer {
  keyPoints: string[];
  chapters: ChapterEntry[];
  generatedBy: 'ai' | 'manual';
}

export interface ChapterEntry {
  title: string;
  startTime: number; // ms
}

export interface ScormConfig {
  version: '1.2' | '2004';
  completionThreshold: number; // 0-1
  passingScore?: number; // 0-100
  trackQuestions: boolean;
}

/**
 * Interactive Step - Used for guide-me and test-me modes
 * Defines clickable areas and expected user actions
 */
export interface InteractiveStep {
  id: string;
  order: number; // Sequence in the tutorial
  instruction: string; // What to tell the user (guide-me: shown, test-me: hidden)
  hint?: string; // Optional hint for test-me mode (shown after wrong attempts)

  // Target area the user should click
  target: ClickTarget;

  // What happens when user clicks correctly
  onCorrect?: {
    feedback?: string;
    autoAdvance?: boolean; // Move to next step automatically
    playSegment?: { start: number; end: number }; // Play video segment as confirmation
  };

  // What happens when user clicks incorrectly
  onIncorrect?: {
    feedback?: string;
    showHint?: boolean;
    maxAttempts?: number; // After this, show the correct answer
  };

  // For test-me scoring
  scoring?: {
    points: number;
    timeBonus?: boolean; // Extra points for fast completion
    penaltyPerWrongClick?: number;
  };
}

export interface ClickTarget {
  // Position as percentage of viewport (0-100)
  x: number;
  y: number;
  width: number;
  height: number;

  // Visual appearance in guide-me mode
  highlightType?: 'pulse' | 'glow' | 'arrow' | 'none';
  highlightColor?: string;

  // Tolerance for click detection (in pixels)
  tolerance?: number;
}

/**
 * Session state for tracking user progress in interactive modes
 */
export interface InteractiveSession {
  mode: LearningMode;
  projectId: string;
  currentStepIndex: number;
  startTime: number;

  // Scoring (for test-me mode)
  score: number;
  maxScore: number;
  attempts: StepAttempt[];

  // Completion tracking
  completedSteps: string[];
  isComplete: boolean;
}

export interface StepAttempt {
  stepId: string;
  timestamp: number;
  clickX: number;
  clickY: number;
  isCorrect: boolean;
  attemptNumber: number;
}

/**
 * Step types for automation
 */
export interface AutomationStep {
  id: string;
  action: StepAction;
  selector?: string;
  value?: string;
  description: string; // Human readable description
  narration: string; // Text to be spoken
  waitAfter?: number; // ms to wait after action
  waitForSelector?: string; // Wait for this selector before proceeding (for wait action)
  highlight?: {
    x: number;
    y: number;
    type: HighlightEntry['type'];
  };
}

export type StepAction =
  | 'navigate'
  | 'click'
  | 'type'
  | 'wait'
  | 'scroll'
  | 'hover'
  | 'screenshot';

/**
 * Tutorial request from user
 */
export interface TutorialRequest {
  prompt: string; // e.g., "How to create a filter in Gmail"
  targetApp: string; // e.g., "gmail"
  options?: {
    language?: string;
    voiceId?: string;
    includeQuestions?: boolean;
  };
}
