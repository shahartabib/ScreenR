/**
 * POC 3: How to Create a Filter in Gmail
 */

import { AutomationStep } from '../../types/index.js';

export const TUTORIAL_TITLE = 'How to Create a Filter in Gmail';
export const TUTORIAL_DESCRIPTION = 'Learn how to automatically organize incoming emails by creating filters in Gmail.';
export const TARGET_URL = 'https://mail.google.com';

export const steps: AutomationStep[] = [
  {
    id: 'step-1',
    action: 'navigate',
    value: 'https://mail.google.com',
    description: 'Open Gmail',
    narration: 'Start by opening Gmail in your web browser.',
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
    action: 'click',
    selector: 'button[aria-label="Show search options"], span.gb_Lf',
    description: 'Click search options',
    narration: 'Click on the small arrow or "Show search options" in the search bar to open advanced search.',
    waitAfter: 1500,
    highlight: {
      x: 45,
      y: 5,
      type: 'pulse',
    },
  },
  {
    id: 'step-4',
    action: 'wait',
    value: '1000',
    description: 'Wait for search options',
    narration: 'The advanced search options panel will appear.',
  },
  {
    id: 'step-5',
    action: 'type',
    selector: 'input[name="from"], input[aria-label="From"]',
    value: 'newsletter@example.com',
    description: 'Enter From address',
    narration: 'In the "From" field, enter the email address you want to filter. For example, a newsletter sender.',
    waitAfter: 1000,
    highlight: {
      x: 35,
      y: 20,
      type: 'circle',
    },
  },
  {
    id: 'step-6',
    action: 'type',
    selector: 'input[name="subject"], input[aria-label="Subject"]',
    value: 'Weekly Newsletter',
    description: 'Enter subject filter',
    narration: 'You can also filter by subject. Enter keywords that appear in the subject line.',
    waitAfter: 1000,
    highlight: {
      x: 35,
      y: 30,
      type: 'circle',
    },
  },
  {
    id: 'step-7',
    action: 'click',
    selector: 'button[aria-label="Create filter"], span:contains("Create filter")',
    description: 'Click Create filter',
    narration: 'Click the "Create filter" button at the bottom of the search options.',
    waitAfter: 2000,
    highlight: {
      x: 70,
      y: 65,
      type: 'pulse',
    },
  },
  {
    id: 'step-8',
    action: 'wait',
    value: '1000',
    description: 'Wait for filter options',
    narration: 'Now you\'ll see options for what Gmail should do with matching emails.',
  },
  {
    id: 'step-9',
    action: 'click',
    selector: 'input[aria-label="Skip the Inbox"], input[name="skipInbox"]',
    description: 'Select Skip Inbox',
    narration: 'Check "Skip the Inbox" if you want these emails to bypass your inbox.',
    waitAfter: 800,
    highlight: {
      x: 25,
      y: 25,
      type: 'circle',
    },
  },
  {
    id: 'step-10',
    action: 'click',
    selector: 'input[aria-label="Apply the label"], input[name="applyLabel"]',
    description: 'Select Apply label',
    narration: 'Check "Apply the label" and choose a label to automatically categorize these emails.',
    waitAfter: 800,
    highlight: {
      x: 25,
      y: 35,
      type: 'circle',
    },
  },
  {
    id: 'step-11',
    action: 'click',
    selector: 'div[aria-label="Choose label"] select, select.J-J5-Ji',
    description: 'Choose label',
    narration: 'Select which label to apply from the dropdown menu.',
    waitAfter: 1000,
  },
  {
    id: 'step-12',
    action: 'click',
    selector: 'input[aria-label="Mark as read"], input[name="markAsRead"]',
    description: 'Select Mark as read',
    narration: 'Optionally, check "Mark as read" if you don\'t need notifications for these emails.',
    waitAfter: 800,
    highlight: {
      x: 25,
      y: 45,
      type: 'circle',
    },
  },
  {
    id: 'step-13',
    action: 'click',
    selector: 'button[aria-label="Create filter"][data-action="createFilter"], button.J-at1-auR',
    description: 'Click Create filter button',
    narration: 'Click "Create filter" to save your filter. From now on, Gmail will automatically apply these actions to matching emails.',
    waitAfter: 2000,
    highlight: {
      x: 75,
      y: 65,
      type: 'pulse',
    },
  },
  {
    id: 'step-14',
    action: 'wait',
    value: '2000',
    description: 'Filter created',
    narration: 'Your filter has been created! Gmail will now automatically process matching emails according to your rules.',
  },
];

export const questions = [
  {
    at: 10000,
    pauseVideo: true,
    question: 'What can Gmail filters do automatically?',
    type: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Only delete emails' },
      { id: 'b', text: 'Apply labels, skip inbox, mark as read, and more' },
      { id: 'c', text: 'Only forward emails' },
      { id: 'd', text: 'Only block senders' },
    ],
    correctAnswer: 1,
    feedback: {
      correct: 'Correct! Gmail filters can perform multiple actions like applying labels, skipping inbox, marking as read, forwarding, and more.',
      incorrect: 'Actually, Gmail filters can do many things: apply labels, skip the inbox, mark as read, star emails, forward them, and more!',
    },
  },
  {
    at: 25000,
    pauseVideo: true,
    question: 'Where do you go to create a filter in Gmail?',
    type: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'The Compose button' },
      { id: 'b', text: 'The search bar options (Show search options)' },
      { id: 'c', text: 'The trash folder' },
      { id: 'd', text: 'The starred emails' },
    ],
    correctAnswer: 1,
    feedback: {
      correct: 'Correct! You access filter creation through the search bar by clicking "Show search options".',
      incorrect: 'To create a filter, you need to click "Show search options" in the search bar at the top of Gmail.',
    },
  },
];
