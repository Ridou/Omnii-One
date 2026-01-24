import { EmailData, TaskData, CalendarData, ContactData } from '@omnii/validators';
import { rdfServiceClient } from '../rdf/rdf-client';

// Types for cached concepts
interface CachedConcept {
  id: string;
  name?: string;
  content?: string;
  description?: string;
  labels: string[];
  properties: Record<string, any>;
  relevanceScore?: number;
}

// Context relevance result interface
interface RelevantContext {
  emailContext: { relevant: EmailData[], confidence: number };
  taskContext: { relevant: TaskData[], confidence: number };
  calendarContext: { relevant: CalendarData[], confidence: number };
  contactContext: { relevant: ContactData[], confidence: number };
  conceptContext: { relevant: CachedConcept[], confidence: number };
  totalRelevanceScore: number;
  reasoning: string[];
}

// Context conditions for filtering
interface ContextCondition {
  type: 'temporal' | 'semantic' | 'priority' | 'frequency';
  weight: number;
  threshold?: number;
}

export class ContextRelevanceEngine {
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.3;
  private readonly MAX_CONTEXT_ITEMS_PER_TYPE = 5;
  
  /**
   * Analyze user message and determine what cached data is relevant
   * Uses RDF insights for semantic understanding and temporal analysis
   */
  async analyzeRelevantContext(
    message: string, 
    rdfInsights: any,
    cachedData: {
      emails?: EmailData[];
      tasks?: TaskData[];
      calendar?: CalendarData[];
      contacts?: ContactData[];
      concepts?: CachedConcept[];
    }
  ): Promise<RelevantContext> {
    console.log(`[ContextRelevanceEngine] 🔍 Analyzing context for: "${message}"`);
    
    const reasoning: string[] = [];
    reasoning.push(`Analyzing message: "${message.substring(0, 50)}..."`);
    
    // Extract key terms and intent from RDF insights
    const extractedConcepts = rdfInsights?.ai_reasoning?.extracted_concepts || [];
    const primaryIntent = rdfInsights?.ai_reasoning?.intent_analysis?.primary_intent || 'unknown';
    const urgencyLevel = rdfInsights?.ai_reasoning?.intent_analysis?.urgency_level || 'medium';
    
    reasoning.push(`Primary intent: ${primaryIntent}, Urgency: ${urgencyLevel}`);
    reasoning.push(`Found ${extractedConcepts.length} semantic concepts in message`);
    
    // Generate search terms from message and RDF insights
    const searchTerms = this.generateSearchTerms(message, extractedConcepts, primaryIntent);
    reasoning.push(`Generated search terms: ${searchTerms.join(', ')}`);
    
    // Analyze each data type for relevance
    const emailContext = await this.analyzeEmailRelevance(
      searchTerms, 
      cachedData.emails || [], 
      urgencyLevel,
      reasoning
    );
    
    const taskContext = await this.analyzeTaskRelevance(
      searchTerms,
      cachedData.tasks || [],
      urgencyLevel,
      primaryIntent,
      reasoning
    );
    
    const calendarContext = await this.analyzeCalendarRelevance(
      searchTerms,
      cachedData.calendar || [],
      urgencyLevel,
      reasoning
    );
    
    const contactContext = await this.analyzeContactRelevance(
      searchTerms,
      cachedData.contacts || [],
      reasoning
    );
    
    const conceptContext = await this.analyzeConceptRelevance(
      searchTerms,
      extractedConcepts,
      cachedData.concepts || [],
      reasoning
    );
    
    // Calculate total relevance score
    const totalRelevanceScore = (
      emailContext.confidence * 0.25 +
      taskContext.confidence * 0.25 +
      calendarContext.confidence * 0.2 +
      contactContext.confidence * 0.15 +
      conceptContext.confidence * 0.15
    );
    
    reasoning.push(`Total relevance score: ${totalRelevanceScore.toFixed(2)}`);
    
    return {
      emailContext,
      taskContext,
      calendarContext,
      contactContext,
      conceptContext,
      totalRelevanceScore,
      reasoning
    };
  }
  
  /**
   * Generate search terms from message and RDF insights
   */
  private generateSearchTerms(message: string, extractedConcepts: any[], primaryIntent: string): string[] {
    const terms: Set<string> = new Set();
    
    // Add words from the message (filtered)
    const messageWords = message.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));
    messageWords.forEach(word => terms.add(word));
    
    // Add concept names from RDF analysis
    extractedConcepts.forEach(concept => {
      if (concept.concept_name) {
        terms.add(concept.concept_name.toLowerCase());
      }
    });
    
    // Add intent-based terms
    if (primaryIntent !== 'unknown') {
      terms.add(primaryIntent);
    }
    
    return Array.from(terms).slice(0, 10); // Limit to 10 most relevant terms
  }
  
  /**
   * Analyze email relevance based on semantic similarity and temporal factors
   */
  private async analyzeEmailRelevance(
    searchTerms: string[],
    emails: EmailData[],
    urgencyLevel: string,
    reasoning: string[]
  ): Promise<{ relevant: EmailData[], confidence: number }> {
    if (emails.length === 0) {
      reasoning.push("No emails available for context analysis");
      return { relevant: [], confidence: 0 };
    }
    
    const scoredEmails = emails.map(email => {
      let score = 0;
      
      // Semantic similarity with subject and snippet
      const emailText = `${email.subject || ''} ${email.snippet || ''}`.toLowerCase();
      const matchingTerms = searchTerms.filter(term => emailText.includes(term));
      score += matchingTerms.length * 0.3;
      
      // Temporal relevance (recent emails are more relevant)
      if (email.date) {
        const emailDate = new Date(email.date);
        const daysSinceEmail = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceEmail <= 1) score += 0.3; // Today
        else if (daysSinceEmail <= 7) score += 0.2; // This week
        else if (daysSinceEmail <= 30) score += 0.1; // This month
      }
      
      // Urgency boost for high priority
      if (urgencyLevel === 'high' || urgencyLevel === 'critical') {
        if (email.isImportant) score += 0.2;
        if (!email.isRead) score += 0.15;
      }
      
      return { email, score, matchingTerms };
    });
    
    // Sort by score and take top results
    const relevantEmails = scoredEmails
      .filter(item => item.score >= this.DEFAULT_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_CONTEXT_ITEMS_PER_TYPE);
    
    const confidence = relevantEmails.length > 0 
      ? relevantEmails.reduce((sum, item) => sum + item.score, 0) / relevantEmails.length 
      : 0;
    
    reasoning.push(`Found ${relevantEmails.length} relevant emails (confidence: ${confidence.toFixed(2)})`);
    
    return {
      relevant: relevantEmails.map(item => item.email),
      confidence: Math.min(confidence, 1.0)
    };
  }
  
  /**
   * Analyze task relevance based on keywords, due dates, and priority
   */
  private async analyzeTaskRelevance(
    searchTerms: string[],
    tasks: TaskData[],
    urgencyLevel: string,
    primaryIntent: string,
    reasoning: string[]
  ): Promise<{ relevant: TaskData[], confidence: number }> {
    if (tasks.length === 0) {
      reasoning.push("No tasks available for context analysis");
      return { relevant: [], confidence: 0 };
    }
    
    const scoredTasks = tasks.map(task => {
      let score = 0;
      
      // Semantic similarity with title and notes
      const taskText = `${task.title || ''} ${task.notes || ''}`.toLowerCase();
      const matchingTerms = searchTerms.filter(term => taskText.includes(term));
      score += matchingTerms.length * 0.4;
      
      // Due date relevance
      if (task.due) {
        const dueDate = new Date(task.due);
        const daysUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        
        if (daysUntilDue < 0) score += 0.4; // Overdue - very relevant
        else if (daysUntilDue <= 1) score += 0.3; // Due today
        else if (daysUntilDue <= 7) score += 0.2; // Due this week
      }
      
      // Status relevance
      if (task.status === 'needsAction') score += 0.2;
      
      // Intent-based scoring
      if (primaryIntent.includes('task') || primaryIntent.includes('todo')) {
        score += 0.3;
      }
      
      return { task, score, matchingTerms };
    });
    
    const relevantTasks = scoredTasks
      .filter(item => item.score >= this.DEFAULT_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_CONTEXT_ITEMS_PER_TYPE);
    
    const confidence = relevantTasks.length > 0
      ? relevantTasks.reduce((sum, item) => sum + item.score, 0) / relevantTasks.length
      : 0;
    
    reasoning.push(`Found ${relevantTasks.length} relevant tasks (confidence: ${confidence.toFixed(2)})`);
    
    return {
      relevant: relevantTasks.map(item => item.task),
      confidence: Math.min(confidence, 1.0)
    };
  }
  
  /**
   * Analyze calendar relevance based on time proximity and event content
   */
  private async analyzeCalendarRelevance(
    searchTerms: string[],
    calendar: CalendarData[],
    urgencyLevel: string,
    reasoning: string[]
  ): Promise<{ relevant: CalendarData[], confidence: number }> {
    if (calendar.length === 0) {
      reasoning.push("No calendar events available for context analysis");
      return { relevant: [], confidence: 0 };
    }
    
    const scoredEvents = calendar.map(event => {
      let score = 0;
      
      // Semantic similarity with summary and description
      const eventText = `${event.summary || ''} ${event.description || ''}`.toLowerCase();
      const matchingTerms = searchTerms.filter(term => eventText.includes(term));
      score += matchingTerms.length * 0.4;
      
      // Temporal relevance
      if (event.start?.dateTime || event.start?.date) {
        const startDate = new Date(event.start.dateTime || event.start.date);
        const hoursUntilEvent = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
        
        if (Math.abs(hoursUntilEvent) <= 2) score += 0.4; // Within 2 hours
        else if (Math.abs(hoursUntilEvent) <= 24) score += 0.3; // Today
        else if (Math.abs(hoursUntilEvent) <= 168) score += 0.2; // This week
      }
      
      return { event, score, matchingTerms };
    });
    
    const relevantEvents = scoredEvents
      .filter(item => item.score >= this.DEFAULT_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_CONTEXT_ITEMS_PER_TYPE);
    
    const confidence = relevantEvents.length > 0
      ? relevantEvents.reduce((sum, item) => sum + item.score, 0) / relevantEvents.length
      : 0;
    
    reasoning.push(`Found ${relevantEvents.length} relevant calendar events (confidence: ${confidence.toFixed(2)})`);
    
    return {
      relevant: relevantEvents.map(item => item.event),
      confidence: Math.min(confidence, 1.0)
    };
  }
  
  /**
   * Analyze contact relevance based on name matching and communication frequency
   */
  private async analyzeContactRelevance(
    searchTerms: string[],
    contacts: ContactData[],
    reasoning: string[]
  ): Promise<{ relevant: ContactData[], confidence: number }> {
    if (contacts.length === 0) {
      reasoning.push("No contacts available for context analysis");
      return { relevant: [], confidence: 0 };
    }
    
    const scoredContacts = contacts.map(contact => {
      let score = 0;
      
      // Name matching
      const contactText = `${contact.name || ''} ${contact.emailAddresses?.[0] || ''}`.toLowerCase();
      const matchingTerms = searchTerms.filter(term => contactText.includes(term));
      score += matchingTerms.length * 0.6;
      
      // Partial name matching (first name, last name)
      const names = (contact.name || '').toLowerCase().split(/\s+/);
      searchTerms.forEach(term => {
        if (names.some(name => name.includes(term) || term.includes(name))) {
          score += 0.3;
        }
      });
      
      return { contact, score, matchingTerms };
    });
    
    const relevantContacts = scoredContacts
      .filter(item => item.score >= this.DEFAULT_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_CONTEXT_ITEMS_PER_TYPE);
    
    const confidence = relevantContacts.length > 0
      ? relevantContacts.reduce((sum, item) => sum + item.score, 0) / relevantContacts.length
      : 0;
    
    reasoning.push(`Found ${relevantContacts.length} relevant contacts (confidence: ${confidence.toFixed(2)})`);
    
    return {
      relevant: relevantContacts.map(item => item.contact),
      confidence: Math.min(confidence, 1.0)
    };
  }
  
  /**
   * Analyze concept relevance using semantic similarity and RDF insights
   */
  private async analyzeConceptRelevance(
    searchTerms: string[],
    extractedConcepts: any[],
    concepts: CachedConcept[],
    reasoning: string[]
  ): Promise<{ relevant: CachedConcept[], confidence: number }> {
    if (concepts.length === 0) {
      reasoning.push("No concepts available for context analysis");
      return { relevant: [], confidence: 0 };
    }
    
    const scoredConcepts = concepts.map(concept => {
      let score = 0;
      
      // Semantic similarity with concept content
      const conceptText = `${concept.name || ''} ${concept.content || ''} ${concept.description || ''}`.toLowerCase();
      const matchingTerms = searchTerms.filter(term => conceptText.includes(term));
      score += matchingTerms.length * 0.4;
      
      // RDF-extracted concept matching
      extractedConcepts.forEach(rdfConcept => {
        if (rdfConcept.concept_name && conceptText.includes(rdfConcept.concept_name.toLowerCase())) {
          score += rdfConcept.confidence || 0.5;
        }
      });
      
      // Use existing relevance score if available
      if (concept.relevanceScore) {
        score += concept.relevanceScore * 0.3;
      }
      
      return { concept, score, matchingTerms };
    });
    
    const relevantConcepts = scoredConcepts
      .filter(item => item.score >= this.DEFAULT_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_CONTEXT_ITEMS_PER_TYPE);
    
    const confidence = relevantConcepts.length > 0
      ? relevantConcepts.reduce((sum, item) => sum + item.score, 0) / relevantConcepts.length
      : 0;
    
    reasoning.push(`Found ${relevantConcepts.length} relevant concepts (confidence: ${confidence.toFixed(2)})`);
    
    return {
      relevant: relevantConcepts.map(item => item.concept),
      confidence: Math.min(confidence, 1.0)
    };
  }
  
  /**
   * Smart filtering based on semantic similarity
   */
  filterBySemanticRelevance(data: any[], query: string, threshold: number = 0.5): any[] {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);
    
    return data.filter(item => {
      const itemText = this.extractTextFromItem(item).toLowerCase();
      const matchingTerms = queryTerms.filter(term => itemText.includes(term));
      const relevanceScore = matchingTerms.length / queryTerms.length;
      return relevanceScore >= threshold;
    });
  }
  
  /**
   * Temporal relevance filtering (recent items, upcoming events, etc.)
   */
  filterByTemporalRelevance(data: any[], timeWindow: string): any[] {
    const now = Date.now();
    let windowMs: number;
    
    switch (timeWindow) {
      case 'today': windowMs = 24 * 60 * 60 * 1000; break;
      case 'week': windowMs = 7 * 24 * 60 * 60 * 1000; break;
      case 'month': windowMs = 30 * 24 * 60 * 60 * 1000; break;
      default: windowMs = 7 * 24 * 60 * 60 * 1000; // Default to week
    }
    
    return data.filter(item => {
      const itemDate = this.extractDateFromItem(item);
      if (!itemDate) return false;
      
      const timeDiff = Math.abs(now - itemDate.getTime());
      return timeDiff <= windowMs;
    });
  }
  
  /**
   * Helper: Extract text content from any item for searching
   */
  private extractTextFromItem(item: any): string {
    if (item.subject && item.snippet) return `${item.subject} ${item.snippet}`; // Email
    if (item.title && item.notes) return `${item.title} ${item.notes}`; // Task
    if (item.summary && item.description) return `${item.summary} ${item.description}`; // Calendar
    if (item.name) return item.name; // Contact
    if (item.content || item.description) return item.content || item.description; // Concept
    return JSON.stringify(item);
  }
  
  /**
   * Helper: Extract date from any item for temporal filtering
   */
  private extractDateFromItem(item: any): Date | null {
    if (item.date) return new Date(item.date); // Email
    if (item.due) return new Date(item.due); // Task
    if (item.start?.dateTime || item.start?.date) return new Date(item.start.dateTime || item.start.date); // Calendar
    if (item.updated) return new Date(item.updated); // Any updated timestamp
    return null;
  }
  
  /**
   * Helper: Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word.toLowerCase());
  }
}

// Export singleton instance
export const contextRelevanceEngine = new ContextRelevanceEngine();

// Export types
export type { RelevantContext, CachedConcept }; 