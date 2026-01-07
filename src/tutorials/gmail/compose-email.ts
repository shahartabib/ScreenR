/**
 * POC 1: How to Compose a New Email in Gmail
 */

import { AutomationStep } from '../../types/index.js';

export const TUTORIAL_TITLE = 'How to Compose a New Email in Gmail';
export const TUTORIAL_DESCRIPTION = 'Learn how to write and send a new email using Gmail.';
export const TARGET_URL = 'https://mail.google.com';

export const steps: AutomationStep[] = [
  {
    id: 'step-1',
    action: 'navigate',
    value: 'https://mail.google.com',
    description: 'Open Gmail',
    narration: 'First, let\'s open Gmail in your browser.',
    waitAfter: 2000,
  },
  {
    id: 'step-2',
    action: 'wait',
    value: '60000', // Wait up to 60 seconds for user to login if needed
    description: 'Wait for Gmail to load (login if needed)',
    narration: 'Wait for Gmail to fully load.',
    waitForSelector: 'div[gh="cm"], .T-I.T-I-KE.L3', // Wait for compose button to appear
  },
  {
    id: 'step-3',
    action: 'click',
    selector: 'div[gh="cm"], .T-I.T-I-KE.L3', // Compose button
    description: 'Click the Compose button',
    narration: 'Click on the Compose button in the top left corner to start a new email.',
    waitAfter: 1500,
    highlight: {
      x: 5,
      y: 15,
      type: 'pulse',
    },
  },
  {
    id: 'step-4',
    action: 'wait',
    value: '1000',
    description: 'Wait for compose window',
    narration: 'The compose window will open.',
  },
  {
    id: 'step-5',
    action: 'click',
    selector: 'input[name="to"], textarea[name="to"]',
    description: 'Click the To field',
    narration: 'Click on the To field to enter the recipient\'s email address.',
    waitAfter: 500,
    highlight: {
      x: 65,
      y: 35,
      type: 'circle',
    },
  },
  {
    id: 'step-6',
    action: 'type',
    selector: 'input[name="to"], textarea[name="to"]',
    value: 'example@email.com',
    description: 'Enter recipient email',
    narration: 'Type the email address of the person you want to send the email to.',
    waitAfter: 1000,
  },
  {
    id: 'step-7',
    action: 'click',
    selector: 'input[name="subjectbox"]',
    description: 'Click the Subject field',
    narration: 'Now click on the Subject field to add a subject line.',
    waitAfter: 500,
    highlight: {
      x: 65,
      y: 42,
      type: 'circle',
    },
  },
  {
    id: 'step-8',
    action: 'type',
    selector: 'input[name="subjectbox"]',
    value: 'Hello from ScreenR!',
    description: 'Enter email subject',
    narration: 'Type a clear and descriptive subject for your email.',
    waitAfter: 1000,
  },
  {
    id: 'step-9',
    action: 'click',
    selector: 'div[aria-label="Message Body"], div[role="textbox"]',
    description: 'Click the message body',
    narration: 'Click in the message body area to start writing your email.',
    waitAfter: 500,
    highlight: {
      x: 65,
      y: 60,
      type: 'rectangle',
    },
  },
  {
    id: 'step-10',
    action: 'type',
    selector: 'div[aria-label="Message Body"], div[role="textbox"]',
    value: 'This is a test email composed using the ScreenR tutorial system.',
    description: 'Type email message',
    narration: 'Write your message in the body of the email.',
    waitAfter: 1500,
  },
  {
    id: 'step-11',
    action: 'hover',
    selector: 'div[aria-label="Send"], div[data-tooltip="Send"]',
    description: 'Hover over Send button',
    narration: 'When you\'re ready, hover over the Send button at the bottom of the compose window.',
    waitAfter: 1500,
    highlight: {
      x: 40,
      y: 85,
      type: 'pulse',
    },
  },
  {
    id: 'step-12',
    action: 'wait',
    value: '2000',
    description: 'Final review',
    narration: 'Review your email before sending. Click Send when you\'re ready, or close the window to save as a draft.',
  },
];

export const questions = [
  {
    at: 8000, // After compose button explanation
    pauseVideo: true,
    question: 'Where is the Compose button located in Gmail?',
    type: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Top right corner' },
      { id: 'b', text: 'Top left corner' },
      { id: 'c', text: 'Bottom of the page' },
      { id: 'd', text: 'In the settings menu' },
    ],
    correctAnswer: 1,
    feedback: {
      correct: 'Correct! The Compose button is in the top left corner of Gmail.',
      incorrect: 'Not quite. The Compose button is located in the top left corner of Gmail.',
    },
  },
];
