/**
 * Note Templates Module
 *
 * Exports template engine and preset templates for
 * meeting notes, daily journals, and contact notes.
 */

// Template engine
export {
  fillTemplate,
  getTemplate,
  listTemplates,
  generateTitle,
} from './template-engine';

// Individual templates (for direct access if needed)
export { meetingNotesTemplate } from './presets/meeting-notes';
export { dailyJournalTemplate } from './presets/daily-journal';
export { contactNotesTemplate } from './presets/contact-notes';
