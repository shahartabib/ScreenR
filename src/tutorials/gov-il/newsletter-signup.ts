/**
 * Tutorial: How to sign up for the Government Procurement Newsletter
 */

import { AutomationStep } from '../../types/index.js';

export const TUTORIAL_TITLE = 'הרשמה לרשימת הדיוור - אתר המכרזים הממשלתי';
export const TUTORIAL_DESCRIPTION = 'למד כיצד להירשם לקבלת עדכונים על מכרזים ממשלתיים בדוא"ל.';
export const TARGET_URL = 'https://mr.gov.il/ilgstorefront/he/';

export const steps: AutomationStep[] = [
  {
    id: 'step-1',
    action: 'navigate',
    value: 'https://mr.gov.il/ilgstorefront/he/',
    description: 'פתיחת אתר המכרזים הממשלתי',
    narration: 'ראשית, נפתח את אתר מינהל הרכש הממשלתי.',
    waitAfter: 3000,
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
    action: 'scroll',
    description: 'גלילה למטה לאזור ההרשמה',
    narration: 'נגלול למטה כדי למצוא את אזור ההרשמה לרשימת הדיוור.',
    waitAfter: 1500,
  },
  {
    id: 'step-4',
    action: 'click',
    selector: 'input[type="email"], input[name="email"], .newsletter-input, input[placeholder*="מייל"], input[placeholder*="email"]',
    description: 'לחיצה על שדה המייל',
    narration: 'נלחץ על שדה הזנת כתובת האימייל.',
    waitAfter: 500,
    highlight: {
      x: 50,
      y: 80,
      type: 'circle',
    },
  },
  {
    id: 'step-5',
    action: 'type',
    selector: 'input[type="email"], input[name="email"], .newsletter-input, input[placeholder*="מייל"], input[placeholder*="email"]',
    value: 'example@example.com',
    description: 'הזנת כתובת אימייל',
    narration: 'נזין את כתובת האימייל שלנו.',
    waitAfter: 1000,
  },
  {
    id: 'step-6',
    action: 'hover',
    selector: 'button[type="submit"], .newsletter-button, button:has-text("הרשם"), button:has-text("שלח")',
    description: 'ריחוף מעל כפתור ההרשמה',
    narration: 'נרחף מעל כפתור ההרשמה כדי לשלוח את הטופס.',
    waitAfter: 1500,
    highlight: {
      x: 60,
      y: 80,
      type: 'pulse',
    },
  },
  {
    id: 'step-7',
    action: 'wait',
    value: '2000',
    description: 'סיום',
    narration: 'לאחר לחיצה על הכפתור, תקבלו הודעת אישור על ההרשמה לרשימת הדיוור.',
  },
];

export const questions = [
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
