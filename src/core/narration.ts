/**
 * Narration Module
 * Handles text-to-speech generation for tutorial voiceovers
 */

import fs from 'fs';
import path from 'path';
import { SubtitleEntry } from '../types/index.js';

export interface NarrationConfig {
  provider: 'openai' | 'elevenlabs' | 'mock';
  apiKey?: string;
  voiceId?: string;
  outputDir: string;
}

export interface NarrationSegment {
  id: string;
  text: string;
  audioPath?: string;
  duration?: number; // estimated duration in ms
}

const DEFAULT_CONFIG: NarrationConfig = {
  provider: 'mock',
  outputDir: './output/audio',
};

// Approximate speaking rate: ~150 words per minute
const WORDS_PER_MINUTE = 150;
const MS_PER_WORD = (60 * 1000) / WORDS_PER_MINUTE;

export function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return Math.round(wordCount * MS_PER_WORD);
}

export async function generateNarration(
  segments: NarrationSegment[],
  config: Partial<NarrationConfig> = {}
): Promise<NarrationSegment[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Ensure output directory exists
  if (!fs.existsSync(finalConfig.outputDir)) {
    fs.mkdirSync(finalConfig.outputDir, { recursive: true });
  }

  const results: NarrationSegment[] = [];

  for (const segment of segments) {
    const duration = estimateDuration(segment.text);

    switch (finalConfig.provider) {
      case 'openai':
        // OpenAI TTS implementation
        const audioPath = await generateOpenAITTS(
          segment,
          finalConfig
        );
        results.push({
          ...segment,
          audioPath,
          duration,
        });
        break;

      case 'elevenlabs':
        // ElevenLabs implementation (placeholder)
        console.log(`[ElevenLabs] Would generate: "${segment.text}"`);
        results.push({
          ...segment,
          duration,
        });
        break;

      case 'mock':
      default:
        // Mock implementation for testing
        console.log(`[Mock TTS] "${segment.text}" (~${duration}ms)`);
        results.push({
          ...segment,
          duration,
        });
        break;
    }
  }

  return results;
}

async function generateOpenAITTS(
  segment: NarrationSegment,
  config: NarrationConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required for TTS');
  }

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: config.apiKey });

  const outputPath = path.join(config.outputDir, `${segment.id}.mp3`);

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: (config.voiceId as any) || 'alloy',
    input: segment.text,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

export function segmentsToSubtitles(
  segments: NarrationSegment[],
  startTimes: number[]
): SubtitleEntry[] {
  return segments.map((segment, index) => {
    const start = startTimes[index] || 0;
    const duration = segment.duration || estimateDuration(segment.text);

    return {
      id: segment.id,
      start,
      end: start + duration,
      text: segment.text,
    };
  });
}

export function createNarrationSegments(
  steps: Array<{ id: string; narration: string }>
): NarrationSegment[] {
  return steps.map((step) => ({
    id: step.id,
    text: step.narration,
  }));
}
