/**
 * Daily Journal Template
 *
 * Pre-structured daily note for reflection and planning
 * with navigation links to previous/next days.
 */

import type { NoteTemplate } from '../../types';

export const dailyJournalTemplate: NoteTemplate = {
  type: 'daily-journal',
  name: 'Daily Journal',
  defaultFrontmatter: {
    type: 'daily-journal',
    tags: ['journal', 'daily-notes'],
  },
  template: `---
type: daily-journal
date: {{date}}
day_of_week: {{dayOfWeek}}
author: {{currentUser}}
tags:
  - journal
  - daily-notes
---

# {{dayOfWeek}}, {{date}}

## Morning Intentions

**Energy Level:** /10

**Top 3 Priorities:**
1.
2.
3.

**Grateful For:**
-

## Notes & Ideas



## End of Day Reflection

**Wins:**
-

**Challenges:**
-

**Learnings:**
-

**Tomorrow's Focus:**
-

---
[[{{previousDate}}]] | [[{{nextDate}}]]
`,
};
