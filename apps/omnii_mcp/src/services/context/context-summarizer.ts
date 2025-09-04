import { EmailData, TaskData, CalendarData, ContactData } from '@omnii/validators';
import { RelevantContext, CachedConcept } from './context-relevance-engine';

// Enhanced system prompt with dynamic context
interface ContextPrompt {
  systemPrompt: string;
  contextSummary: string;
  totalTokens: number;
  includedDataTypes: string[];
}

export class ContextSummarizer {
  private readonly MAX_TOKENS_DEFAULT = 8000;
  private readonly TOKEN_ESTIMATE_RATIO = 4; // ~4 characters per token
  
  /**
   * Enhanced system prompt architecture for ChatGPT/Claude-like experience
   */
  private readonly OMNII_SYSTEM_PROMPT = `You are Omnii, an intelligent personal assistant with access to comprehensive user data.

CONTEXT AWARENESS:
- You have access to real emails, tasks, calendar events, contacts, and brain concepts
- Always consider temporal relevance (what's due today, recent communications)
- Prioritize actionable insights over raw data dumps

COMMUNICATION STYLE:
- Be conversational but precise, like ChatGPT/Claude
- Use contextual understanding to anticipate needs
- Offer specific, actionable suggestions
- Ask clarifying questions when intent is ambiguous

AUTOMATION CAPABILITIES:
- Proactively suggest task creation from conversations
- Detect scheduling opportunities from email context
- Surface relevant contacts for current discussion
- Connect related concepts from user's knowledge graph

RESPONSE STRUCTURE:
1. Direct answer to user query
2. Relevant context from cached data (if applicable)
3. Suggested actions or next steps
4. Follow-up questions to deepen assistance

INTERACTION PRINCIPLES:
- What You See Is What You Get (WYSIWYG)
- Progressive disclosure of complexity
- Contextual action suggestions
- Transparent reasoning when requested`;

  /**
   * Create concise summaries for AI context
   */
  createContextPrompt(relevantContext: RelevantContext, maxTokens: number = this.MAX_TOKENS_DEFAULT): ContextPrompt {
    console.log(`[ContextSummarizer] 🔄 Creating context prompt with max tokens: ${maxTokens}`);
    
    const summaries: string[] = [];
    const includedTypes: string[] = [];
    let estimatedTokens = this.estimateTokens(this.OMNII_SYSTEM_PROMPT);
    
    // Add email context if relevant
    if (relevantContext.emailContext.relevant.length > 0 && relevantContext.emailContext.confidence > 0.3) {
      const emailSummary = this.summarizeEmailContext(relevantContext.emailContext.relevant);
      const emailTokens = this.estimateTokens(emailSummary);
      
      if (estimatedTokens + emailTokens < maxTokens * 0.8) { // Reserve 20% for other content
        summaries.push(emailSummary);
        includedTypes.push('emails');
        estimatedTokens += emailTokens;
      }
    }
    
    // Add task context if relevant
    if (relevantContext.taskContext.relevant.length > 0 && relevantContext.taskContext.confidence > 0.3) {
      const taskSummary = this.summarizeTaskContext(relevantContext.taskContext.relevant);
      const taskTokens = this.estimateTokens(taskSummary);
      
      if (estimatedTokens + taskTokens < maxTokens * 0.8) {
        summaries.push(taskSummary);
        includedTypes.push('tasks');
        estimatedTokens += taskTokens;
      }
    }
    
    // Add calendar context if relevant
    if (relevantContext.calendarContext.relevant.length > 0 && relevantContext.calendarContext.confidence > 0.3) {
      const calendarSummary = this.summarizeCalendarContext(relevantContext.calendarContext.relevant);
      const calendarTokens = this.estimateTokens(calendarSummary);
      
      if (estimatedTokens + calendarTokens < maxTokens * 0.8) {
        summaries.push(calendarSummary);
        includedTypes.push('calendar');
        estimatedTokens += calendarTokens;
      }
    }
    
    // Add contact context if relevant
    if (relevantContext.contactContext.relevant.length > 0 && relevantContext.contactContext.confidence > 0.3) {
      const contactSummary = this.summarizeContactContext(relevantContext.contactContext.relevant);
      const contactTokens = this.estimateTokens(contactSummary);
      
      if (estimatedTokens + contactTokens < maxTokens * 0.8) {
        summaries.push(contactSummary);
        includedTypes.push('contacts');
        estimatedTokens += contactTokens;
      }
    }
    
    // Add concept context if relevant
    if (relevantContext.conceptContext.relevant.length > 0 && relevantContext.conceptContext.confidence > 0.3) {
      const conceptSummary = this.summarizeConceptContext(relevantContext.conceptContext.relevant);
      const conceptTokens = this.estimateTokens(conceptSummary);
      
      if (estimatedTokens + conceptTokens < maxTokens * 0.8) {
        summaries.push(conceptSummary);
        includedTypes.push('concepts');
        estimatedTokens += conceptTokens;
      }
    }
    
    // Combine all summaries
    const contextSummary = summaries.length > 0 
      ? `\n\nCURRENT CONTEXT:\n${summaries.join('\n\n')}`
      : '';
    
    const finalPrompt = this.OMNII_SYSTEM_PROMPT + contextSummary;
    
    console.log(`[ContextSummarizer] ✅ Created context prompt: ${estimatedTokens} tokens, ${includedTypes.length} data types`);
    
    return {
      systemPrompt: finalPrompt,
      contextSummary,
      totalTokens: estimatedTokens,
      includedDataTypes: includedTypes
    };
  }
  
  /**
   * Create concise summaries for email context
   */
  summarizeEmailContext(emails: EmailData[]): string {
    if (emails.length === 0) return '';
    
    const summaryLines: string[] = [];
    summaryLines.push(`RECENT EMAIL CONTEXT (${emails.length} relevant emails):`);
    
    emails.slice(0, 5).forEach((email, index) => {
      const from = email.from || 'Unknown';
      const subject = email.subject || 'No subject';
      const preview = email.preview ? email.preview.substring(0, 100) + '...' : '';
      const date = email.date ? this.formatRelativeDate(new Date(email.date)) : '';
      const readStatus = email.isRead ? '' : '[UNREAD] ';
      
      summaryLines.push(`${index + 1}. ${readStatus}${from}: "${subject}" ${date}`);
      if (preview) {
        summaryLines.push(`   Preview: ${preview}`);
      }
    });
    
    // Add summary insights
    const unreadCount = emails.filter(e => !e.isRead).length;
    const recentCount = emails.filter(e => 
      e.date && (Date.now() - new Date(e.date).getTime()) < 24 * 60 * 60 * 1000
    ).length;
    
    summaryLines.push(`\nEmail insights: ${unreadCount} unread, ${recentCount} from today`);
    
    return summaryLines.join('\n');
  }
  
  /**
   * Create concise summaries for task context
   */
  summarizeTaskContext(tasks: TaskData[]): string {
    if (tasks.length === 0) return '';
    
    const summaryLines: string[] = [];
    summaryLines.push(`CURRENT TASK STATUS (${tasks.length} relevant tasks):`);
    
    // Group tasks by status and priority
    const overdueTasks = tasks.filter(t => t.due && new Date(t.due) < new Date() && t.status !== 'completed');
    const todayTasks = tasks.filter(t => t.due && this.isToday(new Date(t.due)));
    const upcomingTasks = tasks.filter(t => t.due && this.isThisWeek(new Date(t.due)) && !this.isToday(new Date(t.due)));
    
    if (overdueTasks.length > 0) {
      summaryLines.push(`⚠️ OVERDUE (${overdueTasks.length}):`);
      overdueTasks.slice(0, 3).forEach((task, index) => {
        const daysOverdue = Math.floor((Date.now() - new Date(task.due!).getTime()) / (1000 * 60 * 60 * 24));
        summaryLines.push(`   ${index + 1}. "${task.title}" (${daysOverdue} days overdue)`);
      });
    }
    
    if (todayTasks.length > 0) {
      summaryLines.push(`🎯 DUE TODAY (${todayTasks.length}):`);
      todayTasks.slice(0, 3).forEach((task, index) => {
        summaryLines.push(`   ${index + 1}. "${task.title}"`);
      });
    }
    
    if (upcomingTasks.length > 0) {
      summaryLines.push(`📅 THIS WEEK (${upcomingTasks.length}):`);
      upcomingTasks.slice(0, 3).forEach((task, index) => {
        const dueDate = this.formatRelativeDate(new Date(task.due!));
        summaryLines.push(`   ${index + 1}. "${task.title}" (${dueDate})`);
      });
    }
    
    // Add task completion insights
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const pendingCount = tasks.filter(t => t.status === 'needsAction').length;
    
    summaryLines.push(`\nTask insights: ${pendingCount} pending, ${completedCount} completed, ${overdueTasks.length} overdue`);
    
    return summaryLines.join('\n');
  }
  
  /**
   * Create concise summaries for calendar context
   */
  summarizeCalendarContext(events: CalendarData[]): string {
    if (events.length === 0) return '';
    
    const summaryLines: string[] = [];
    summaryLines.push(`CALENDAR CONTEXT (${events.length} relevant events):`);
    
    // Group events by time proximity
    const now = new Date();
    const upcomingEvents = events.filter(e => {
      const startDate = new Date(e.start || '');
      return startDate > now;
    }).sort((a, b) => {
      const aDate = new Date(a.start || '');
      const bDate = new Date(b.start || '');
      return aDate.getTime() - bDate.getTime();
    });
    
    const recentEvents = events.filter(e => {
      const startDate = new Date(e.start || '');
      return startDate <= now && (now.getTime() - startDate.getTime()) < 24 * 60 * 60 * 1000;
    });
    
    if (upcomingEvents.length > 0) {
      summaryLines.push(`📅 UPCOMING EVENTS:`);
      upcomingEvents.slice(0, 3).forEach((event, index) => {
        const startDate = new Date(event.start || '');
        const timeUntil = this.formatRelativeTime(startDate);
        const title = event.title || 'Untitled event';
        summaryLines.push(`   ${index + 1}. "${title}" (${timeUntil})`);
      });
    }
    
    if (recentEvents.length > 0) {
      summaryLines.push(`🕐 RECENT EVENTS:`);
      recentEvents.slice(0, 2).forEach((event, index) => {
        const title = event.title || 'Untitled event';
        summaryLines.push(`   ${index + 1}. "${title}" (recently completed)`);
      });
    }
    
    // Add calendar insights
    const todayEvents = events.filter(e => {
      const eventDate = new Date(e.start || '');
      return this.isToday(eventDate);
    });
    
    summaryLines.push(`\nCalendar insights: ${todayEvents.length} events today, ${upcomingEvents.length} upcoming`);
    
    return summaryLines.join('\n');
  }
  
  /**
   * Create concise summaries for contact context
   */
  summarizeContactContext(contacts: ContactData[]): string {
    if (contacts.length === 0) return '';
    
    const summaryLines: string[] = [];
    summaryLines.push(`RELEVANT CONTACTS (${contacts.length} matches):`);
    
    contacts.slice(0, 5).forEach((contact, index) => {
      const name = contact.name || 'Unknown contact';
      const email = contact.emails?.[0]?.address || '';
      const organization = contact.company || '';
      
      let contactLine = `${index + 1}. ${name}`;
      if (email) contactLine += ` (${email})`;
      if (organization) contactLine += ` - ${organization}`;
      
      summaryLines.push(`   ${contactLine}`);
    });
    
    return summaryLines.join('\n');
  }
  
  /**
   * Create concise summaries for concept context
   */
  summarizeConceptContext(concepts: CachedConcept[]): string {
    if (concepts.length === 0) return '';
    
    const summaryLines: string[] = [];
    summaryLines.push(`BRAIN CONCEPTS (${concepts.length} relevant):`);
    
    concepts.slice(0, 5).forEach((concept, index) => {
      const name = concept.name || `Concept ${concept.id}`;
      const description = concept.description || concept.content || '';
      const preview = description ? description.substring(0, 80) + '...' : '';
      
      summaryLines.push(`   ${index + 1}. ${name}`);
      if (preview) {
        summaryLines.push(`      ${preview}`);
      }
    });
    
    return summaryLines.join('\n');
  }
  
  /**
   * Generate context-specific prompts for different data types
   */
  generateSpecificPrompts(includedTypes: string[]): Record<string, string> {
    const prompts: Record<string, string> = {};
    
    if (includedTypes.includes('emails')) {
      prompts.email = `Use email context to:
- Reference specific conversations
- Suggest replies or follow-ups
- Identify action items mentioned in emails
- Connect email content to current user request`;
    }
    
    if (includedTypes.includes('tasks')) {
      prompts.task = `Leverage task context to:
- Prioritize overdue items
- Suggest task dependencies
- Identify scheduling conflicts
- Recommend task creation from conversation`;
    }
    
    if (includedTypes.includes('calendar')) {
      prompts.calendar = `Use calendar context to:
- Suggest optimal meeting times
- Identify scheduling conflicts
- Reference recent or upcoming events
- Recommend time blocking strategies`;
    }
    
    if (includedTypes.includes('contacts')) {
      prompts.contact = `Use contact context to:
- Suggest relevant people for meetings
- Auto-complete contact information
- Reference communication history
- Recommend networking opportunities`;
    }
    
    if (includedTypes.includes('concepts')) {
      prompts.concept = `Use brain concepts to:
- Connect related ideas and projects
- Reference previous discussions
- Suggest knowledge connections
- Build on existing mental models`;
    }
    
    return prompts;
  }
  
  /**
   * Smart truncation to fit context windows
   */
  truncateToFitTokens(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    // Calculate how much to truncate
    const ratio = maxTokens / estimatedTokens;
    const targetLength = Math.floor(text.length * ratio * 0.9); // 10% safety margin
    
    // Try to truncate at sentence boundaries
    const sentences = text.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length > targetLength) {
        break;
      }
      truncated += sentence + '.';
    }
    
    // If no sentence fit, truncate at word boundaries
    if (truncated.length === 0) {
      const words = text.split(/\s+/);
      for (const word of words) {
        if ((truncated + ' ' + word).length > targetLength) {
          break;
        }
        truncated += (truncated ? ' ' : '') + word;
      }
    }
    
    return truncated + (truncated.length < text.length ? '...' : '');
  }
  
  /**
   * Estimate token count (approximate)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / this.TOKEN_ESTIMATE_RATIO);
  }
  
  /**
   * Format relative date (e.g., "2 days ago", "tomorrow")
   */
  private formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays === -1) return 'yesterday';
    if (diffDays > 0) return `in ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  }
  
  /**
   * Format relative time (e.g., "in 2 hours", "30 minutes ago")
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (Math.abs(diffMinutes) < 60) {
      if (diffMinutes > 0) return `in ${diffMinutes} minutes`;
      return `${Math.abs(diffMinutes)} minutes ago`;
    }
    
    if (Math.abs(diffHours) < 24) {
      if (diffHours > 0) return `in ${diffHours} hours`;
      return `${Math.abs(diffHours)} hours ago`;
    }
    
    return this.formatRelativeDate(date);
  }
  
  /**
   * Check if date is today
   */
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }
  
  /**
   * Check if date is this week
   */
  private isThisWeek(date: Date): boolean {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    return date >= weekStart && date <= weekEnd;
  }
}

// Export singleton instance
export const contextSummarizer = new ContextSummarizer();

// Export types
export type { ContextPrompt }; 