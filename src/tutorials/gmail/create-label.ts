/**
 * POC 2: How to Create a Label in Gmail
 */

import { AutomationStep } from '../../types/index.js';

export const TUTORIAL_TITLE = 'How to Create a Label in Gmail';
export const TUTORIAL_DESCRIPTION = 'Learn how to organize your emails by creating custom labels in Gmail.';
export const TARGET_URL = 'https://mail.google.com';

export const steps: AutomationStep[] = [
  {
    id: 'step-1',
    action: 'navigate',
    value: 'https://mail.google.com',
    description: 'Open Gmail',
    narration: 'First, open Gmail in your web browser.',
    waitAfter: 3000,
  },
  {
    id: 'step-2',
    action: 'wait',
    value: '2000',
    description: 'Wait for Gmail to load',
    narration: 'Wait for Gmail to fully load.',
  },
  {
    id: 'step-3',
    action: 'scroll',
    selector: 'div[role="navigation"]',
    description: 'Scroll to see labels section',
    narration: 'Look at the left sidebar where you\'ll find the Labels section.',
    waitAfter: 1000,
  },
  {
    id: 'step-4',
    action: 'click',
    selector: 'span[data-action="createLabel"], div[data-tooltip="Create new label"]',
    description: 'Click Create new label',
    narration: 'Click on "Create new label" or the plus icon next to Labels.',
    waitAfter: 1500,
    highlight: {
      x: 10,
      y: 50,
      type: 'pulse',
    },
  },
  {
    id: 'step-4-alt',
    action: 'click',
    selector: 'div.TN[data-tooltip="More"] span.CJ, span.bsU',
    description: 'Alternative: Click More to expand labels',
    narration: 'If you don\'t see the option, click "More" to expand the labels list.',
    waitAfter: 1000,
  },
  {
    id: 'step-5',
    action: 'wait',
    value: '1000',
    description: 'Wait for dialog',
    narration: 'A dialog box will appear for creating your new label.',
  },
  {
    id: 'step-6',
    action: 'type',
    selector: 'input[type="text"][aria-label="Please enter a new label name:"], input.xx',
    value: 'Important Projects',
    description: 'Enter label name',
    narration: 'Type a name for your new label. For example, "Important Projects".',
    waitAfter: 1000,
    highlight: {
      x: 50,
      y: 45,
      type: 'circle',
    },
  },
  {
    id: 'step-7',
    action: 'wait',
    value: '500',
    description: 'Review label name',
    narration: 'You can also choose to nest this label under an existing label if you want to create a hierarchy.',
  },
  {
    id: 'step-8',
    action: 'click',
    selector: 'button[name="ok"], button.J-at1-auR',
    description: 'Click Create button',
    narration: 'Click the Create button to create your new label.',
    waitAfter: 2000,
    highlight: {
      x: 55,
      y: 55,
      type: 'pulse',
    },
  },
  {
    id: 'step-9',
    action: 'wait',
    value: '2000',
    description: 'Label created',
    narration: 'Your new label has been created! You\'ll see it appear in the left sidebar.',
  },
  {
    id: 'step-10',
    action: 'hover',
    selector: 'div[role="navigation"] a[title="Important Projects"]',
    description: 'View new label',
    narration: 'You can now use this label to organize your emails. Simply drag emails to the label or use the Labels button when viewing an email.',
    waitAfter: 2000,
    highlight: {
      x: 10,
      y: 55,
      type: 'circle',
    },
  },
];

export const questions = [
  {
    at: 12000,
    pauseVideo: true,
    question: 'What is the purpose of creating labels in Gmail?',
    type: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'To delete emails faster' },
      { id: 'b', text: 'To organize and categorize emails' },
      { id: 'c', text: 'To block spam' },
      { id: 'd', text: 'To change email colors' },
    ],
    correctAnswer: 1,
    feedback: {
      correct: 'Correct! Labels help you organize and categorize your emails for easier management.',
      incorrect: 'Not quite. Labels are used to organize and categorize your emails so you can find them easily.',
    },
  },
];
