/**
 * Contact Notes Template
 *
 * Pre-structured notes for tracking interactions with
 * a specific person, linked to their contact entity.
 */

import type { NoteTemplate } from '../../types';

export const contactNotesTemplate: NoteTemplate = {
  type: 'contact-notes',
  name: 'Contact Notes',
  defaultFrontmatter: {
    type: 'contact-notes',
    tags: ['people', 'contacts'],
  },
  template: `---
type: contact-notes
contact_name: {{contact.name}}
company: {{contact.company}}
email: {{contact.email}}
last_contact: {{date}}
tags:
  - people
  - contacts
{{#if contact.company}}  - {{contact.company}}{{/if}}
---

# {{contact.name}}

**Company:** [[{{contact.company}}]]
**Email:** {{contact.email}}
**Last Contact:** {{date}}

## Background

*Who they are, how we met, their role:*



## Conversation History

### {{date}}

**Context:**

**Key Points:**
-

## Follow-up Items

- [ ]

## Notes & Observations

*Communication style, preferences, things to remember:*



## Related

-

---
*Last updated: {{date}}*
`,
};
