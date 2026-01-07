/**
 * ScreenR Studio Types
 * Types for the Studio application - Projects with multiple tutorials
 */

import { HighlightEntry, InteractiveStep } from './project.js';

/**
 * Studio Project - Contains multiple tutorials for the same application
 */
export interface StudioProject {
  id: string;
  name: string; // e.g., "Gmail", "אתר המכרזים הממשלתי"
  description?: string;
  targetUrl: string; // Base URL of the application
  createdAt: string;
  updatedAt: string;

  // Tutorials within this project
  tutorials: Tutorial[];

  // Shared settings
  settings: ProjectSettings;
}

/**
 * A single tutorial within a project
 */
export interface Tutorial {
  id: string;
  title: string; // e.g., "הרשמה לאתר", "יצירת פילטר"
  description?: string;
  prompt: string; // The original prompt used to create this tutorial
  createdAt: string;
  updatedAt: string;

  // Tutorial content
  videoFile?: string; // Path to video file
  duration: number; // in milliseconds

  // Steps/Highlights
  steps: TutorialStep[];

  // For player
  interactiveSteps?: InteractiveStep[];

  // Status
  status: TutorialStatus;
}

export type TutorialStatus = 'draft' | 'recording' | 'processing' | 'ready' | 'error';

/**
 * A step within a tutorial
 */
export interface TutorialStep {
  id: string;
  order: number;

  // Timing
  timestamp: number; // When this step occurs in the video
  duration: number; // How long to show/highlight

  // Element info
  elementInfo: {
    tagName: string;
    fieldName: string;
    fieldType?: string;
    action: string;
    value?: string;
    selector: string;
  };

  // Position (percentage of viewport)
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Visual
  screenshotFile?: string;
  highlightType: 'circle' | 'rectangle' | 'arrow' | 'pulse';

  // Translations
  translations: Record<string, StepTranslation>;
}

export interface StepTranslation {
  fieldName: string;
  actionDescription: string;
  instruction?: string; // For Guide Me mode
  hint?: string; // Hint for Test Me mode
}

/**
 * Project settings
 */
export interface ProjectSettings {
  defaultLanguage: string;
  availableLanguages: string[];

  // Credentials for recording (not stored permanently)
  credentials?: {
    username: string;
    password: string;
  };

  // Recording settings
  viewport: {
    width: number;
    height: number;
  };

  // Theme/branding
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
  };
}

/**
 * Recording session
 */
export interface RecordingSession {
  id: string;
  projectId: string;
  tutorialId?: string;

  status: 'pending' | 'recording' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;

  // Recording data
  prompt: string;
  url: string;
  steps: any[];
  videoPath?: string;

  // Error info
  error?: string;

  // Timestamps
  startedAt: string;
  completedAt?: string;
}

/**
 * API Request/Response types
 */

export interface CreateProjectRequest {
  name: string;
  description?: string;
  targetUrl: string;
  settings?: Partial<ProjectSettings>;
}

export interface CreateTutorialRequest {
  projectId: string;
  title: string;
  description?: string;
  prompt: string;
  url?: string; // Override project's targetUrl
  credentials?: {
    username: string;
    password: string;
  };
}

export interface UpdateStepRequest {
  fieldName?: string;
  translations?: Record<string, Partial<StepTranslation>>;
  position?: Partial<TutorialStep['position']>;
  highlightType?: TutorialStep['highlightType'];
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  targetUrl: string;
  createdAt: string;
  updatedAt: string;
  tutorialCount: number;
  thumbnail?: string;
}

export interface TutorialListItem {
  id: string;
  title: string;
  description?: string;
  status: TutorialStatus;
  createdAt: string;
  duration: number;
  stepCount: number;
  thumbnail?: string;
}
