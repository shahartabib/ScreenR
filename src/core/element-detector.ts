/**
 * Element Detector
 * Auto-detects element information: position, name, type
 */

import { Page, ElementHandle } from 'playwright';
import { ElementInfo } from '../types/index.js';

export interface DetectedElement {
  // Position as percentage of viewport (0-100)
  x: number;
  y: number;
  width: number;
  height: number;
  // Element info
  info: ElementInfo;
}

/**
 * Detect element position and information
 */
export async function detectElement(
  page: Page,
  element: ElementHandle,
  action: string,
  value?: string
): Promise<DetectedElement | null> {
  try {
    const viewport = page.viewportSize();
    if (!viewport) return null;

    const box = await element.boundingBox();
    if (!box) return null;

    // Get element info from the page context using arrow function
    const info = await element.evaluate((el, actionType): {
      tagName: string;
      fieldName: string;
      fieldType: string | undefined;
      action: string;
      selector: string;
    } => {
      const elem = el as Element;
      const id = elem.getAttribute('id');
      let fieldName: string | null = null;

      // 1. Associated label
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label && label.textContent) {
          fieldName = label.textContent.trim();
        }
      }

      // 2. Parent label
      if (!fieldName) {
        const parentLabel = elem.closest('label');
        if (parentLabel && parentLabel.textContent) {
          const labelText = parentLabel.textContent.trim();
          const elText = elem.textContent || '';
          fieldName = labelText.replace(elText, '').trim();
        }
      }

      // 3. Placeholder
      if (!fieldName) fieldName = elem.getAttribute('placeholder');

      // 4. Aria-label
      if (!fieldName) fieldName = elem.getAttribute('aria-label');

      // 5. Title
      if (!fieldName) fieldName = elem.getAttribute('title');

      // 6. Name attribute
      if (!fieldName) fieldName = elem.getAttribute('name');

      // 7. Button/link text
      if (!fieldName && elem.textContent) fieldName = elem.textContent.trim();

      // 8. Alt text
      if (!fieldName) fieldName = elem.getAttribute('alt');

      // 9. Value
      if (!fieldName) fieldName = elem.getAttribute('value');

      // 10. Fallback
      if (!fieldName || fieldName.length === 0 || fieldName.length >= 100) {
        const type = elem.getAttribute('type') || '';
        fieldName = elem.tagName.toLowerCase() + (type ? ` (${type})` : '');
      }

      const tagName = elem.tagName.toLowerCase();
      const fieldType = elem.getAttribute('type') || undefined;

      // Build selector
      let selector = tagName;
      const name = elem.getAttribute('name');
      const classes = elem.className;

      if (id) {
        selector = `#${id}`;
      } else if (name) {
        selector = `${tagName}[name="${name}"]`;
      } else if (fieldType) {
        selector = `${tagName}[type="${fieldType}"]`;
      } else if (classes && typeof classes === 'string') {
        const mainClass = classes.split(' ')[0];
        if (mainClass) selector = `${tagName}.${mainClass}`;
      }

      return {
        tagName,
        fieldName: fieldName || 'unknown',
        fieldType,
        action: actionType,
        selector
      };
    }, action);

    // Calculate position as percentage
    const x = ((box.x + box.width / 2) / viewport.width) * 100;
    const y = ((box.y + box.height / 2) / viewport.height) * 100;
    const width = (box.width / viewport.width) * 100;
    const height = (box.height / viewport.height) * 100;

    return {
      x,
      y,
      width,
      height,
      info: {
        ...info,
        value,
      },
    };
  } catch (error) {
    console.error('Error detecting element:', error);
    return null;
  }
}

/**
 * Generate action description based on element info
 */
export function generateActionDescription(info: ElementInfo, language: string = 'he'): string {
  const translations: Record<string, Record<string, string>> = {
    he: {
      click: 'לחץ על',
      type: 'הקלד ב',
      hover: 'רחף מעל',
      scroll: 'גלול אל',
      input: 'שדה',
      button: 'כפתור',
      a: 'קישור',
      select: 'בחירה',
      textarea: 'תיבת טקסט',
    },
    en: {
      click: 'Click on',
      type: 'Type in',
      hover: 'Hover over',
      scroll: 'Scroll to',
      input: 'field',
      button: 'button',
      a: 'link',
      select: 'dropdown',
      textarea: 'text area',
    },
    ar: {
      click: 'انقر على',
      type: 'اكتب في',
      hover: 'حرك فوق',
      scroll: 'مرر إلى',
      input: 'حقل',
      button: 'زر',
      a: 'رابط',
      select: 'قائمة',
      textarea: 'مربع نص',
    },
  };

  const t = translations[language] || translations['en'];
  const actionWord = t[info.action] || info.action;
  const elementType = t[info.tagName] || info.tagName;

  // Build description
  let description = `${actionWord} ${info.fieldName}`;

  // Add value info for type actions
  if (info.action === 'type' && info.value) {
    const valuePreview = info.value.length > 20 ? info.value.substring(0, 20) + '...' : info.value;
    if (language === 'he') {
      description += `: "${valuePreview}"`;
    } else if (language === 'ar') {
      description += `: "${valuePreview}"`;
    } else {
      description += `: "${valuePreview}"`;
    }
  }

  return description;
}

/**
 * Generate translations for all supported languages
 */
export function generateTranslations(info: ElementInfo): Record<string, { fieldName: string; actionDescription: string }> {
  const languages = ['he', 'en', 'ar'];
  const translations: Record<string, { fieldName: string; actionDescription: string }> = {};

  for (const lang of languages) {
    translations[lang] = {
      fieldName: info.fieldName, // Keep original field name
      actionDescription: generateActionDescription(info, lang),
    };
  }

  return translations;
}
