/**
 * Template Engine
 *
 * Fills note templates with dynamic context data.
 * Uses simple string replacement (not full templating engine)
 * to keep complexity low and predictable.
 */

import { format, addDays, subDays } from 'date-fns';
import type { NoteTemplate, TemplateType, TemplateContext } from '../types';
import { meetingNotesTemplate } from './presets/meeting-notes';
import { dailyJournalTemplate } from './presets/daily-journal';
import { contactNotesTemplate } from './presets/contact-notes';

/** All available templates */
const templates: Record<TemplateType, NoteTemplate> = {
  'meeting-notes': meetingNotesTemplate,
  'daily-journal': dailyJournalTemplate,
  'contact-notes': contactNotesTemplate,
};

/**
 * Get a template by type.
 *
 * @param type - Template type identifier
 * @returns Template definition or undefined
 */
export function getTemplate(type: TemplateType): NoteTemplate | undefined {
  return templates[type];
}

/**
 * List all available templates.
 *
 * @returns Array of template metadata (type and name)
 */
export function listTemplates(): Array<{ type: TemplateType; name: string }> {
  return Object.values(templates).map((t) => ({
    type: t.type,
    name: t.name,
  }));
}

/**
 * Fill a template with context data.
 *
 * Replaces {{placeholders}} with values from context.
 * Handles:
 * - Simple: {{date}}, {{currentUser}}
 * - Nested: {{meeting.title}}, {{contact.name}}
 * - Conditionals: {{#if var}}content{{/if}}
 * - Loops: {{#each array}}{{this}}{{/each}}
 *
 * @param templateType - Which template to use
 * @param context - Data to fill into template
 * @returns Filled template content
 */
export function fillTemplate(
  templateType: TemplateType,
  context: TemplateContext
): string {
  const template = getTemplate(templateType);
  if (!template) {
    throw new Error(`Unknown template type: ${templateType}`);
  }

  let filled = template.template;

  // Format current date
  const dateStr = format(context.currentDate, 'yyyy-MM-dd');
  const dayOfWeek = format(context.currentDate, 'EEEE');

  // Basic replacements
  filled = filled.replace(/\{\{date\}\}/g, dateStr);
  filled = filled.replace(/\{\{dayOfWeek\}\}/g, dayOfWeek);
  filled = filled.replace(/\{\{currentUser\}\}/g, context.currentUser);

  // Daily journal navigation dates
  if (templateType === 'daily-journal') {
    const prevDate = format(subDays(context.currentDate, 1), 'yyyy-MM-dd');
    const nextDate = format(addDays(context.currentDate, 1), 'yyyy-MM-dd');
    filled = filled.replace(/\{\{previousDate\}\}/g, prevDate);
    filled = filled.replace(/\{\{nextDate\}\}/g, nextDate);
  }

  // Meeting context
  if (context.meeting) {
    filled = filled.replace(/\{\{meeting\.title\}\}/g, context.meeting.title);
    filled = filled.replace(
      /\{\{meeting\.project\}\}/g,
      context.meeting.project || ''
    );

    // Attendees list (comma-separated)
    const attendeesList = context.meeting.attendees.join(', ');
    filled = filled.replace(/\{\{attendees_list\}\}/g, attendeesList);

    // Attendees YAML (for frontmatter)
    const attendeesYaml = context.meeting.attendees
      .map((a) => `  - ${a}`)
      .join('\n');
    filled = filled.replace(/\{\{attendees_yaml\}\}/g, attendeesYaml);

    // Handle attendee loop
    filled = processLoop(
      filled,
      'meeting.attendees',
      context.meeting.attendees
    );

    // Handle conditional for project
    filled = processConditional(
      filled,
      'meeting.project',
      !!context.meeting.project
    );
  } else {
    // Remove meeting placeholders if no meeting context
    filled = filled.replace(/\{\{meeting\.[^}]+\}\}/g, '');
    filled = filled.replace(/\{\{attendees_[^}]+\}\}/g, '');
    filled = removeConditional(filled, 'meeting.project');
    filled = removeLoop(filled, 'meeting.attendees');
  }

  // Contact context
  if (context.contact) {
    filled = filled.replace(/\{\{contact\.name\}\}/g, context.contact.name);
    filled = filled.replace(
      /\{\{contact\.company\}\}/g,
      context.contact.company || ''
    );
    filled = filled.replace(
      /\{\{contact\.email\}\}/g,
      context.contact.email || ''
    );

    // Handle conditional for company
    filled = processConditional(
      filled,
      'contact.company',
      !!context.contact.company
    );
  } else {
    filled = filled.replace(/\{\{contact\.[^}]+\}\}/g, '');
    filled = removeConditional(filled, 'contact.company');
  }

  // Clean up any remaining unmatched placeholders
  filled = filled.replace(/\{\{[^}]+\}\}/g, '');

  // Clean up empty lines from removed sections
  filled = filled.replace(/\n{3,}/g, '\n\n');

  return filled;
}

/**
 * Process simple conditional blocks.
 * {{#if var}}content{{/if}}
 */
function processConditional(
  content: string,
  variable: string,
  condition: boolean
): string {
  const regex = new RegExp(
    `\\{\\{#if ${escapeRegex(variable)}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`,
    'g'
  );

  return content.replace(regex, condition ? '$1' : '');
}

/**
 * Remove conditional block entirely.
 */
function removeConditional(content: string, variable: string): string {
  const regex = new RegExp(
    `\\{\\{#if ${escapeRegex(variable)}\\}\\}[\\s\\S]*?\\{\\{/if\\}\\}`,
    'g'
  );
  return content.replace(regex, '');
}

/**
 * Process simple loop blocks.
 * {{#each array}}{{this}}{{/each}}
 */
function processLoop(
  content: string,
  variable: string,
  items: string[]
): string {
  const regex = new RegExp(
    `\\{\\{#each ${escapeRegex(variable)}\\}\\}([\\s\\S]*?)\\{\\{/each\\}\\}`,
    'g'
  );

  return content.replace(regex, (_, template) => {
    return items.map((item) => template.replace(/\{\{this\}\}/g, item)).join('');
  });
}

/**
 * Remove loop block entirely.
 */
function removeLoop(content: string, variable: string): string {
  const regex = new RegExp(
    `\\{\\{#each ${escapeRegex(variable)}\\}\\}[\\s\\S]*?\\{\\{/each\\}\\}`,
    'g'
  );
  return content.replace(regex, '');
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a title for a note based on template type and context.
 *
 * @param templateType - Type of template
 * @param context - Context data
 * @returns Generated title string
 */
export function generateTitle(
  templateType: TemplateType,
  context: TemplateContext
): string {
  const dateStr = format(context.currentDate, 'yyyy-MM-dd');

  switch (templateType) {
    case 'meeting-notes':
      return context.meeting?.title
        ? `${context.meeting.title} - Meeting Notes`
        : `Meeting Notes - ${dateStr}`;

    case 'daily-journal':
      return `Daily Journal - ${dateStr}`;

    case 'contact-notes':
      return context.contact?.name
        ? `${context.contact.name} - Contact Notes`
        : `Contact Notes - ${dateStr}`;

    default:
      return `Note - ${dateStr}`;
  }
}
