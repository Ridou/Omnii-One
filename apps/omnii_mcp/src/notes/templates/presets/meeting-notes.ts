/**
 * Meeting Notes Template
 *
 * Pre-structured template for meeting documentation with
 * attendees, agenda, decisions, and action items.
 */

import type { NoteTemplate } from '../../types';

export const meetingNotesTemplate: NoteTemplate = {
  type: 'meeting-notes',
  name: 'Meeting Notes',
  defaultFrontmatter: {
    type: 'meeting-notes',
    tags: ['meeting'],
  },
  template: `---
type: meeting-notes
meeting_title: {{meeting.title}}
date: {{date}}
attendees:
{{attendees_yaml}}
project: {{meeting.project}}
author: {{currentUser}}
tags:
  - meeting
  - {{meeting.project}}
---

# {{meeting.title}}

**Date:** {{date}}
**Attendees:** {{attendees_list}}
{{#if meeting.project}}**Project:** [[{{meeting.project}}]]{{/if}}

## Agenda

- [ ]

## Discussion Notes



## Key Decisions

-

## Action Items

{{#each meeting.attendees}}
- [ ] **@{{this}}:**
{{/each}}

## Follow-up

- **Next Meeting:**
- **Topics for Next Time:**
  -

---
*Created by {{currentUser}} on {{date}}*
`,
};
