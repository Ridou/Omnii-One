import { MessageAnalysis, NameVariation, Contact, ContactResolution } from '../types/contact-resolution';
import { ExecutionContextType } from '../types/action-planning.types';
import { rdfServiceClient } from './rdf-client';

export class RDFContactAnalyzer {
  
  /**
   * Analyze a message using RDF semantic reasoning to extract contact reference and communication intent
   */
  async analyzeMessage(message: string): Promise<MessageAnalysis> {
    console.log(`[RDFContactAnalyzer] 🧠 Analyzing message: "${message}" (SIMPLIFIED - NO RECURSION)`);
    
    // SIMPLIFIED: Skip RDF service to prevent recursion, use fallback directly
    console.log(`[RDFContactAnalyzer] 📝 Using fallback analysis only to prevent recursion`);
    return this.analyzeMessageFallback(message);
  }

  /**
   * Fallback message analysis when RDF service is unavailable
   */
  private async analyzeMessageFallback(message: string): Promise<MessageAnalysis> {
    console.log(`[RDFContactAnalyzer] 📝 Using fallback analysis for: "${message}"`);
    
    const lowerMessage = message.toLowerCase();
    const contactMatch = this.extractContactNameFallback(message);
    const intent = this.determineIntentFallback(lowerMessage);
    const contextClues = this.extractContextCluesFallback(lowerMessage);
    const formality = this.determineFormalityLevelFallback(message, contextClues);
    const urgency = this.determineUrgencyFallback(message);
    const additionalContext = this.generateAdditionalContextFallback(formality, contextClues);
    const confidence = this.calculateConfidenceFallback(contactMatch, intent, contextClues);
    
    return {
      primary_contact: contactMatch,
      intent,
      context_clues: contextClues,
      formality,
      urgency,
      additional_context: additionalContext,
      confidence
    };
  }

  /**
   * Expand a contact name into variations for better matching
   */
  async expandContactName(contactName: string, context?: MessageAnalysis): Promise<string[]> {
    console.log(`[RDFContactAnalyzer] 🧠 Generating name variations for "${contactName}" (SIMPLIFIED - NO RECURSION)`);
    
    const variations: string[] = [];
    
    // Always include exact match first
    variations.push(contactName);
    
    // SIMPLIFIED: Use rule-based fallback only to prevent recursion
    console.log(`[RDFContactAnalyzer] 📝 Using rule-based variations only to prevent recursion`);
    const ruleBasedVariations = this.generateRuleBasedVariationsFallback(contactName);
    variations.push(...ruleBasedVariations);
    
    // Remove duplicates and return
    const uniqueVariations = [...new Set(variations)];
    console.log(`[RDFContactAnalyzer] ✅ Generated ${uniqueVariations.length} total variations: [${uniqueVariations.join(', ')}]`);
    
    return uniqueVariations;
  }

  /**
   * INTELLIGENT CONTACT SEARCH SYSTEM
   * This replaces the current limited search with a comprehensive approach
   */
  async searchContacts(expandedNames: string[], userUUID?: string): Promise<Contact[]> {
    console.log(`[RDFContactAnalyzer] 🧠 INTELLIGENT SEARCH: Starting comprehensive contact search for ${expandedNames.length} name variations`);
    console.log(`[RDFContactAnalyzer] 🔍 Search variations: [${expandedNames.join(', ')}]`);
    
    if (!userUUID) {
      console.warn(`[RDFContactAnalyzer] ⚠️ No userUUID provided for contact search`);
      return [];
    }
    
    // Lazy import to avoid initialization issues during testing
    let unifiedGoogleManager;
    try {
      const imported = await import('./unified-google-manager');
      unifiedGoogleManager = imported.default;
    } catch (importError) {
      console.error(`[RDFContactAnalyzer] Failed to import unified-google-manager:`, importError);
      return [];
    }
    
    // SINGLE STRATEGY: Simple search (no recursion)
    console.log(`[RDFContactAnalyzer] 🎯 SIMPLIFIED STRATEGY: Single search for primary name`);
    const searchResults = await this.trySpecificSearches(expandedNames, userUUID, unifiedGoogleManager);
    
    if (searchResults.length > 0) {
      console.log(`[RDFContactAnalyzer] ✅ SUCCESS: Found ${searchResults.length} contacts`);
      return this.deduplicateContacts(searchResults);
    }
    
    // FALLBACK: Try to list a few contacts to see what's available
    console.log(`[RDFContactAnalyzer] 📍 FALLBACK: Listing sample contacts to verify connection`);
    const sampleContacts = await this.getSampleContacts(userUUID, unifiedGoogleManager);
    
    if (sampleContacts.length > 0) {
      console.log(`[RDFContactAnalyzer] ✅ Found ${sampleContacts.length} sample contacts in your Google Contacts`);
      console.log(`[RDFContactAnalyzer] 💡 Consider searching for one of these names instead:`);
      sampleContacts.slice(0, 3).forEach((contact, i) => {
        console.log(`[RDFContactAnalyzer]   ${i + 1}. ${contact.name}`);
      });
      
      // Try fuzzy matching against sample contacts
      const fuzzyMatch = this.findBestFuzzyMatch(expandedNames[0], sampleContacts);
      if (fuzzyMatch) {
        console.log(`[RDFContactAnalyzer] 🎯 FUZZY MATCH: Found potential match - ${fuzzyMatch.name}`);
        return [fuzzyMatch];
      }
    }
    
    console.log(`[RDFContactAnalyzer] ❌ NO MATCHES: No contacts found for "${expandedNames[0]}"`);
    return [];
  }

  /**
   * Try specific searches for each name variation (SIMPLIFIED - NO RECURSION)
   */
  private async trySpecificSearches(
    expandedNames: string[], 
    userUUID: string, 
    unifiedGoogleManager: any
  ): Promise<Contact[]> {
    console.log(`[RDFContactAnalyzer] 🔍 SIMPLIFIED SEARCH: Testing ${expandedNames.length} name variations`);
    
    // Try just the first name (original) to avoid recursion
    const primaryName = expandedNames[0];
    if (!primaryName) return [];
    
    try {
      console.log(`[RDFContactAnalyzer] 🎯 Single search for primary name: "${primaryName}"`);
      
      const result = await unifiedGoogleManager.processMessage(
        `Search contacts for: ${primaryName}`,
        userUUID,
        "America/Los_Angeles",
        undefined,
        ExecutionContextType.WEBSOCKET
      );
      
      console.log(`[RDFContactAnalyzer] Search result for "${primaryName}":`, {
        success: result.success,
        hasRawData: !!result.rawData,
        hasStructured: !!result.structured,
        dataType: typeof result.data
      });
      
      if (result.success) {
        // Try to extract from both rawData and structured data
        let extractedContacts: Contact[] = [];
        
        console.log(`[RDFContactAnalyzer] 🔍 Search response structure for "${primaryName}":`, {
          hasRawData: !!result.rawData,
          hasStructured: !!result.structured,
          hasData: !!result.data,
          dataKeys: result.data ? Object.keys(result.data) : []
        });
        
        // FIXED: Handle the actual response format from unified manager
        if (result.data?.contacts && Array.isArray(result.data.contacts)) {
          console.log(`[RDFContactAnalyzer] ✅ Found ${result.data.contacts.length} contacts in search result.data.contacts`);
          extractedContacts = result.data.contacts.map(c => this.transformGoogleContactToContact(c)).filter(Boolean) as Contact[];
        }
        
        else if (result.data?.structured?.contacts && Array.isArray(result.data.structured.contacts)) {
          console.log(`[RDFContactAnalyzer] ✅ Found ${result.data.structured.contacts.length} contacts in result.data.structured.contacts`);
          extractedContacts = result.data.structured.contacts.map(c => this.transformGoogleContactToContact(c)).filter(Boolean) as Contact[];
        }
        
        else if (result.structured?.contacts && Array.isArray(result.structured.contacts)) {
          console.log(`[RDFContactAnalyzer] ✅ Found ${result.structured.contacts.length} contacts in result.structured.contacts`);
          extractedContacts = result.structured.contacts.map(c => this.transformGoogleContactToContact(c)).filter(Boolean) as Contact[];
        }
        
        else if (result.rawData) {
          extractedContacts = this.extractContactsFromApiResponse(result.rawData, primaryName);
        }
        
        else if (result.structured) {
          extractedContacts = this.extractContactsFromStructuredResponse(result.structured, primaryName);
        }
        
        console.log(`[RDFContactAnalyzer] ✅ Extracted ${extractedContacts.length} contacts for "${primaryName}"`);
        return extractedContacts;
      }
      
    } catch (error) {
      console.warn(`[RDFContactAnalyzer] Search failed for "${primaryName}":`, error);
    }
    
    return [];
  }

  /**
   * Get a small sample of contacts to verify connection and show available names
   */
  private async getSampleContacts(userUUID: string, unifiedGoogleManager: any): Promise<Contact[]> {
    try {
      console.log(`[RDFContactAnalyzer] 📋 Getting sample contacts to verify connection`);
      
      const result = await unifiedGoogleManager.processMessage(
        `List my contacts`,
        userUUID,
        "America/Los_Angeles",
        undefined,
        ExecutionContextType.WEBSOCKET
      );
      
      console.log(`[RDFContactAnalyzer] Sample contacts result:`, {
        success: result.success,
        hasRawData: !!result.rawData,
        hasStructured: !!result.structured,
        hasData: !!result.data
      });
      
      if (result.success) {
        let contacts: Contact[] = [];
        
        // Try different response formats - FIXED TO HANDLE ACTUAL FORMAT!
        console.log(`[RDFContactAnalyzer] 🔍 Response structure:`, {
          hasRawData: !!result.rawData,
          hasStructured: !!result.structured, 
          hasData: !!result.data,
          dataKeys: result.data ? Object.keys(result.data) : []
        });
        
        if (result.data?.contacts && Array.isArray(result.data.contacts)) {
          console.log(`[RDFContactAnalyzer] ✅ Found ${result.data.contacts.length} contacts in result.data.contacts`);
          contacts = result.data.contacts.slice(0, 10).map(c => this.transformGoogleContactToContact(c)).filter(Boolean) as Contact[];
        }
        
        else if (result.data?.structured?.contacts && Array.isArray(result.data.structured.contacts)) {
          console.log(`[RDFContactAnalyzer] ✅ Found ${result.data.structured.contacts.length} contacts in result.data.structured.contacts`);
          contacts = result.data.structured.contacts.slice(0, 10).map(c => this.transformGoogleContactToContact(c)).filter(Boolean) as Contact[];
        }
        
        else if (result.structured?.contacts && Array.isArray(result.structured.contacts)) {
          console.log(`[RDFContactAnalyzer] ✅ Found ${result.structured.contacts.length} contacts in result.structured.contacts`);
          contacts = result.structured.contacts.slice(0, 10).map(c => this.transformGoogleContactToContact(c)).filter(Boolean) as Contact[];
        }
        
        else if (result.rawData) {
          const rawContacts = this.extractAllContactsFromResponse(result.rawData);
          contacts = rawContacts.slice(0, 10).map(c => this.transformApiContactToContact(c, 'sample')).filter(Boolean) as Contact[];
        }
        
        else if (result.structured) {
          contacts = this.extractContactsFromStructuredResponse(result.structured, 'sample').slice(0, 10);
        }
        
        console.log(`[RDFContactAnalyzer] ✅ Retrieved ${contacts.length} sample contacts`);
        return contacts;
      }
      
      return [];
      
    } catch (error) {
      console.error(`[RDFContactAnalyzer] Error getting sample contacts:`, error);
      return [];
    }
  }

  /**
   * Find the best fuzzy match from a list of contacts
   */
  private findBestFuzzyMatch(searchTerm: string, contacts: Contact[]): Contact | null {
    if (!searchTerm || contacts.length === 0) return null;
    
    let bestMatch: Contact | null = null;
    let bestScore = 0;
    
    for (const contact of contacts) {
      const score = this.calculateNameMatchConfidence(searchTerm, contact);
      if (score > bestScore && score > 0.4) { // Minimum 40% confidence
        bestScore = score;
        bestMatch = contact;
      }
    }
    
    if (bestMatch) {
      console.log(`[RDFContactAnalyzer] 🎯 Best fuzzy match: "${searchTerm}" → "${bestMatch.name}" (${Math.round(bestScore * 100)}%)`);
    }
    
    return bestMatch;
  }

  /**
   * Get ALL contacts for fuzzy matching
   */
  private async getAllContactsForMatching(userUUID: string, unifiedGoogleManager: any): Promise<any[]> {
    try {
      console.log(`[RDFContactAnalyzer] 📋 Getting ALL contacts for intelligent matching`);
      
      // Try to get all contacts
      const listQueries = [
        `List all my contacts`,
        `Get all contacts`,
        `Show me all my contacts`,
        `Retrieve my contact list`
      ];
      
      for (const listQuery of listQueries) {
        const result = await unifiedGoogleManager.processMessage(
          listQuery,
          userUUID,
          "America/Los_Angeles",
          undefined,
          ExecutionContextType.WEBSOCKET
        );
        
        console.log(`[RDFContactAnalyzer] List query "${listQuery}" result:`, {
          success: result.success,
          hasRawData: !!result.rawData
        });
        
        if (result.success && result.rawData) {
          const allContacts = this.extractAllContactsFromResponse(result.rawData);
          if (allContacts.length > 0) {
            console.log(`[RDFContactAnalyzer] ✅ Retrieved ${allContacts.length} total contacts`);
            return allContacts;
          }
        }
      }
      
      console.log(`[RDFContactAnalyzer] ⚠️ Could not retrieve contact list`);
      return [];
      
    } catch (error) {
      console.error(`[RDFContactAnalyzer] Error getting all contacts:`, error);
      return [];
    }
  }

  /**
   * Extract all contacts from various response formats
   */
  private extractAllContactsFromResponse(rawData: any): any[] {
    const data = rawData.data || rawData;
    
    // Try multiple possible response formats
    if (data.contacts && Array.isArray(data.contacts)) {
      console.log(`[RDFContactAnalyzer] Found contacts in data.contacts: ${data.contacts.length}`);
      return data.contacts;
    }
    
    if (data.response_data?.results && Array.isArray(data.response_data.results)) {
      console.log(`[RDFContactAnalyzer] Found contacts in response_data.results: ${data.response_data.results.length}`);
      return data.response_data.results;
    }
    
    if (data.results && Array.isArray(data.results)) {
      console.log(`[RDFContactAnalyzer] Found contacts in results: ${data.results.length}`);
      return data.results;
    }
    
    // Try to find any array of contact-like objects
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        // Check if it looks like contacts (has person data or name fields)
        const firstItem = value[0];
        if (firstItem && (
          firstItem.person || 
          firstItem.name || 
          firstItem.names || 
          firstItem.emailAddresses ||
          firstItem.phoneNumbers
        )) {
          console.log(`[RDFContactAnalyzer] Found contacts in ${key}: ${value.length}`);
          return value;
        }
      }
    }
    
    console.log(`[RDFContactAnalyzer] ⚠️ No contact arrays found in response`);
    return [];
  }

  /**
   * Perform intelligent fuzzy matching with AI-generated variations
   */
  private async performIntelligentFuzzyMatching(
    searchVariations: string[], 
    allContacts: any[]
  ): Promise<Contact[]> {
    console.log(`[RDFContactAnalyzer] 🧠 Performing intelligent fuzzy matching`);
    console.log(`[RDFContactAnalyzer] 🔍 Matching ${searchVariations.length} search terms against ${allContacts.length} contacts`);
    
    const matches: Array<Contact & { confidence: number }> = [];
    
    for (const contact of allContacts) {
      const transformedContact = this.transformApiContactToContact(contact, 'fuzzy-search');
      if (!transformedContact) continue;
      
      // Calculate confidence for this contact against all search variations
      let bestConfidence = 0;
      let bestReason = '';
      
      for (const searchTerm of searchVariations) {
        const confidence = this.calculateNameMatchConfidence(searchTerm, transformedContact);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestReason = `Matched "${searchTerm}" to "${transformedContact.name}"`;
        }
      }
      
      // If confidence is above threshold, include this contact
      if (bestConfidence > 0.3) {  // Lower threshold for fuzzy matching
        console.log(`[RDFContactAnalyzer] 🎯 MATCH: ${transformedContact.name} (${Math.round(bestConfidence * 100)}% confidence) - ${bestReason}`);
        matches.push({
          ...transformedContact,
          confidence: bestConfidence
        });
      }
    }
    
    // Sort by confidence (highest first) and return top matches
    const sortedMatches = matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Top 10 matches
    
    console.log(`[RDFContactAnalyzer] 🏆 Final fuzzy matches: ${sortedMatches.length} contacts`);
    sortedMatches.forEach((match, index) => {
      console.log(`[RDFContactAnalyzer]   ${index + 1}. ${match.name} ${match.email ? `(${match.email})` : ''} - ${Math.round(match.confidence * 100)}%`);
    });
    
    // Remove confidence property and return as Contact[]
    return sortedMatches.map(({ confidence, ...contact }) => contact);
  }

  /**
   * Calculate intelligent name matching confidence
   */
  private calculateNameMatchConfidence(searchTerm: string, contact: Contact): number {
    const searchLower = searchTerm.toLowerCase().trim();
    const contactName = contact.name.toLowerCase();
    
    // Exact match
    if (contactName === searchLower) return 1.0;
    
    // Extract first and last names
    const contactParts = contactName.split(/\s+/);
    const contactFirst = contactParts[0] || '';
    const contactLast = contactParts[contactParts.length - 1] || '';
    
    // First name exact match
    if (contactFirst === searchLower) return 0.9;
    
    // Last name exact match  
    if (contactLast === searchLower) return 0.8;
    
    // Contains search term
    if (contactName.includes(searchLower)) return 0.7;
    
    // First name starts with search term
    if (contactFirst.startsWith(searchLower)) return 0.6;
    
    // Last name starts with search term
    if (contactLast.startsWith(searchLower)) return 0.6;
    
    // Search term starts with first name (nickname potential)
    if (searchLower.startsWith(contactFirst) && contactFirst.length >= 3) return 0.5;
    
    // Levenshtein distance for typos
    const distance = this.calculateLevenshteinDistance(searchLower, contactFirst);
    if (distance <= 2 && contactFirst.length > 3) {
      return Math.max(0, 0.7 - (distance * 0.2));
    }
    
    // Check against full name with different distance
    const fullDistance = this.calculateLevenshteinDistance(searchLower, contactName);
    const maxLength = Math.max(searchLower.length, contactName.length);
    const similarity = 1 - (fullDistance / maxLength);
    
    if (similarity > 0.5) {
      return similarity * 0.6; // Scale down full name similarity
    }
    
    return 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Score contacts based on context alignment and confidence
   */
  async scoreContacts(contacts: Contact[], context: MessageAnalysis): Promise<Array<Contact & { confidence: number; reasoning: string }>> {
    console.log(`[RDFContactAnalyzer] 🎯 Scoring ${contacts.length} contacts against context`);
    
    const scoredContacts = contacts.map(contact => {
      const score = this.scoreContactMatch(contact, context);
      const reasoning = this.generateContactReasoning(contact, context);
      
      return {
        ...contact,
        confidence: score,
        reasoning
      };
    });
    
    // Sort by confidence (highest first)
    const sortedContacts = scoredContacts.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`[RDFContactAnalyzer] 🏆 Top scored contact: ${sortedContacts[0]?.name} (${Math.round((sortedContacts[0]?.confidence || 0) * 100)}%)`);
    
    return sortedContacts;
  }

  /**
   * Resolve the best contact from a list of potential matches
   */
  async resolveContact(contacts: Contact[], context: MessageAnalysis): Promise<ContactResolution> {
    if (contacts.length === 0) {
      return {
        success: false,
        confidence: 0
      };
    }

    // Score each contact based on context alignment
    const scoredContacts = contacts.map(contact => ({
      contact,
      score: this.scoreContactMatch(contact, context),
      reasoning: this.generateContactReasoning(contact, context)
    }));

    // Sort by score (highest first)
    scoredContacts.sort((a, b) => b.score - a.score);

    const bestMatch = scoredContacts[0];
    const alternatives = scoredContacts.slice(1, 3); // Top 3 alternatives

    if (bestMatch.score >= 0.8) {
      return {
        resolved_contact: {
          contact: bestMatch.contact,
          confidence: bestMatch.score,
          reasoning: bestMatch.reasoning
        },
        alternatives: alternatives.map(alt => ({
          contact: alt.contact,
          confidence: alt.score,
          reasoning: alt.reasoning
        })),
        success: true,
        confidence: bestMatch.score
      };
    }

    return {
      alternatives: scoredContacts.map(alt => ({
        contact: alt.contact,
        confidence: alt.score,
        reasoning: alt.reasoning
      })),
      success: false,
      confidence: bestMatch.score
    };
  }

  // Private helper methods

  private extractContactNameFallback(message: string): string {
    console.log(`[RDFContactAnalyzer] 🔍 Extracting contact name from: "${message}"`);
    
    // Special case: look for single letter names after "with"
    const singleLetterMatch = message.match(/(?:with|to)\s+([A-Z])\s+(?:about|regarding)/i);
    if (singleLetterMatch) {
      console.log(`[RDFContactAnalyzer] ✅ Found single letter name: ${singleLetterMatch[1]}`);
      return singleLetterMatch[1];
    }

    // Enhanced regex patterns to find names after action words
    const patterns = [
      // "send/email/text/call Eden" or "send to Eden" 
      /(?:send|email|text|call|toss)(?:\s+(?:an?\s+)?(?:email|message|text)\s+)?(?:to\s+)?([A-Z][a-z]+)(?:\s+(?:about|asking|regarding))/i,
      // "send Eden an email" pattern
      /(?:send|email|text|call|toss)\s+([A-Z][a-z]+)\s+(?:an?\s+)/i,
      // "message to Eden" or "email to Eden"
      /(?:message|email)\s+(?:to\s+)?([A-Z][a-z]+)(?:\s+(?:about|asking|regarding))/i,
      // "to Eden" (standalone)
      /\b(?:to)\s+([A-Z][a-z]+)(?:\s+(?:asking|about|regarding))/i,
      // "with Eden"
      /(?:with)\s+([A-Z][a-z]+)/i,
      // "Dr. Eden" pattern
      /Dr\.\s+([A-Z][a-z]+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Filter out common false positives
        const name = match[1];
        const stopWords = ['Email', 'Message', 'Text', 'Call', 'Send', 'To', 'About', 'Asking', 'With'];
        if (!stopWords.includes(name)) {
          console.log(`[RDFContactAnalyzer] ✅ Found contact name: ${name} (pattern: ${pattern})`);
          return name;
        }
      }
    }

    // Fallback: look for any capitalized word that isn't a stop word
    const words = message.split(' ');
    const stopWords = ['Yooo', 'Email', 'Message', 'Text', 'Call', 'Send', 'To', 'About', 'Asking', 'With', 'The', 'And', 'Or', 'But'];
    
    for (const word of words) {
      if (word.match(/^[A-Z][a-z]+$/) && word.length > 1 && !stopWords.includes(word)) {
        console.log(`[RDFContactAnalyzer] ✅ Found contact name via fallback: ${word}`);
        return word;
      }
    }

    console.log(`[RDFContactAnalyzer] ❌ Could not extract contact name from message`);
    return 'Unknown';
  }

  private determineIntentFallback(message: string): string {
    if (message.includes('email') || message.includes('send')) return 'send_email';
    if (message.includes('text') || message.includes('message')) return 'send_text';
    if (message.includes('call')) return 'make_call';
    if (message.includes('remind')) return 'create_reminder';
    return 'unknown';
  }

  private extractContextCluesFallback(message: string): string[] {
    const clues: string[] = [];
    
    // Business context
    if (message.includes('report') || message.includes('quarterly')) clues.push('quarterly', 'report');
    if (message.includes('meeting') || message.includes('project')) clues.push('meeting', 'project');
    
    // Personal context
    if (message.includes('dinner') || message.includes('tonight')) clues.push('dinner', 'tonight');
    
    // Medical context
    if (message.includes('test results') || message.includes('dr.')) clues.push('medical', 'test results');
    
    return clues;
  }

  private determineFormalityLevelFallback(message: string, contextClues: string[]): 'casual' | 'neutral' | 'business' | 'formal' {
    if (message.includes('Dr.') || message.includes('test results')) return 'formal';
    if (contextClues.some(clue => ['quarterly', 'report', 'meeting', 'project'].includes(clue))) return 'business';
    if (contextClues.some(clue => ['dinner', 'tonight'].includes(clue))) return 'casual';
    return 'neutral';
  }

  private determineUrgencyFallback(message: string): 'low' | 'normal' | 'urgent' {
    if (message.toUpperCase().includes('URGENT') || message.includes('immediately')) return 'urgent';
    if (message.includes('asap')) return 'urgent';
    // Don't treat casual dinner plans as urgent
    if (message.includes('tonight') && !message.includes('dinner')) return 'urgent';
    return 'normal';
  }

  private generateAdditionalContextFallback(formality: string, contextClues: string[]): string {
    if (formality === 'business') return 'work-related communication';
    if (formality === 'casual') return 'personal communication';
    if (formality === 'formal') return 'formal/professional communication';
    return 'general communication';
  }

  private calculateConfidenceFallback(contactName: string, intent: string, contextClues: string[]): number {
    let confidence = 0.5; // Base confidence

    // Boost for clear contact name
    if (contactName !== 'Unknown' && contactName.length > 1) confidence += 0.3;
    
    // Boost for clear intent
    if (intent !== 'unknown') confidence += 0.2;
    
    // Boost for context clues
    if (contextClues.length > 0) confidence += 0.1;
    
    // Penalty for single letter names
    if (contactName.length === 1) confidence -= 0.4;

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Generate intelligent name variations using RDF semantic reasoning (REPLACES EXPENSIVE OPENAI CALLS!)
   */
  private async generateIntelligentNameVariations(name: string, context?: MessageAnalysis): Promise<string[]> {
    try {
      console.log(`[RDFContactAnalyzer] 🧠 Using RDF semantic reasoning for name variations: "${name}"`);
      
      // Use RDF service for name variation generation - much cheaper than OpenAI!
      const rdfNameAnalysis = await rdfServiceClient.processRDFRequest({
        name: name,
        domain: 'name_linguistics',
        task: 'name_variation_generation',
        context: context ? {
          formality: context.formality,
          intent: context.intent,
          cultural_context: context.context_clues
        } : undefined,
        variation_types: [
          'phonetic_variations',
          'nickname_derivations', 
          'cultural_variants',
          'orthographic_variations',
          'diminutive_forms',
          'similar_sounding_names'
        ]
      });
      
      console.log(`[RDFContactAnalyzer] ✅ RDF name analysis completed:`, {
        hasPhoneticVariations: !!rdfNameAnalysis.phonetic_variations,
        hasNicknames: !!rdfNameAnalysis.nickname_derivations,
        hasCulturalVariants: !!rdfNameAnalysis.cultural_variants
      });
      
      // Collect all variations from RDF analysis
      const variations: string[] = [];
      
      if (rdfNameAnalysis.phonetic_variations) {
        variations.push(...rdfNameAnalysis.phonetic_variations);
      }
      
      if (rdfNameAnalysis.nickname_derivations) {
        variations.push(...rdfNameAnalysis.nickname_derivations);
      }
      
      if (rdfNameAnalysis.cultural_variants) {
        variations.push(...rdfNameAnalysis.cultural_variants);
      }
      
      if (rdfNameAnalysis.orthographic_variations) {
        variations.push(...rdfNameAnalysis.orthographic_variations);
      }
      
      if (rdfNameAnalysis.diminutive_forms) {
        variations.push(...rdfNameAnalysis.diminutive_forms);
      }
      
      if (rdfNameAnalysis.similar_sounding_names) {
        variations.push(...rdfNameAnalysis.similar_sounding_names);
      }
      
      // Filter and deduplicate
      const uniqueVariations = [...new Set(variations.filter(v => typeof v === 'string' && v.length > 0))];
      
      console.log(`[RDFContactAnalyzer] 🧠 RDF generated ${uniqueVariations.length} variations for "${name}": [${uniqueVariations.join(', ')}]`);
      return uniqueVariations;
      
    } catch (error) {
      console.warn(`[RDFContactAnalyzer] ⚠️ RDF name variation failed for "${name}", using rule-based fallback:`, error);
      return this.generateRuleBasedVariationsFallback(name);
    }
  }

  /**
   * Fallback rule-based name variations for when RDF fails
   */
  private generateRuleBasedVariationsFallback(name: string): string[] {
    console.log(`[RDFContactAnalyzer] 📝 Using rule-based fallback for "${name}"`);
    
    const variations: string[] = [];
    const lowerName = name.toLowerCase();
    
    // Common nickname patterns
    const nicknameRules = [
      { pattern: /^(.*?)athan$/, replacement: '$1' },     // Jonathan -> Jon
      { pattern: /^(.*?)ael$/, replacement: '$1' },       // Michael -> Mich  
      { pattern: /^(.*?)ine$/, replacement: '$1y' },      // Christine -> Christy
      { pattern: /^(.*?)er$/, replacement: '$1' },        // Christopher -> Chris
      { pattern: /^(.*?)opher$/, replacement: '$1' },     // Christopher -> Christ
      { pattern: /^(.*?)andro$/, replacement: '$1' },     // Alejandro -> Ale
    ];
    
    for (const rule of nicknameRules) {
      const match = lowerName.match(rule.pattern);
      if (match) {
        const variation = lowerName.replace(rule.pattern, rule.replacement);
        if (variation.length >= 2) {
          variations.push(variation.charAt(0).toUpperCase() + variation.slice(1));
        }
      }
    }
    
    // Phonetic substitution rules
    const phoneticRules = [
      { from: 'ph', to: 'f' },     // Philip -> Filip
      { from: 'ck', to: 'k' },     // Nick -> Nik
      { from: 'ie', to: 'y' },     // Katie -> Katy
      { from: 'y', to: 'ie' },     // Katy -> Katie
      { from: 'c', to: 'k' },      // Eric -> Erik
      { from: 'z', to: 's' },      // Liz -> Lis
      { from: 's', to: 'z' },      // Chris -> Chriz
      { from: 'th', to: 't' },     // Anthony -> Antony
    ];
    
    for (const rule of phoneticRules) {
      if (lowerName.includes(rule.from)) {
        const variant = lowerName.replace(new RegExp(rule.from, 'g'), rule.to);
        if (variant !== lowerName && variant.length >= 2) {
          variations.push(variant.charAt(0).toUpperCase() + variant.slice(1));
        }
      }
    }
    
    // Generate shortened versions
    if (name.length > 4) {
      variations.push(name.substring(0, 3));    // First 3 letters
      variations.push(name.substring(0, 4));    // First 4 letters
    }
    
    // Add common endings
    if (name.length >= 3) {
      variations.push(name + 'y');              // Eden -> Edeny
      variations.push(name + 'ie');             // Eden -> Edenie
    }
    
    console.log(`[RDFContactAnalyzer] 📝 Rule-based generated ${variations.length} variations: [${variations.join(', ')}]`);
    return variations;
  }

  private scoreContactMatch(contact: Contact, context: MessageAnalysis): number {
    let score = 0.4; // Base score

    // Name matching with first name extraction
    const contactFirstName = contact.name.split(' ')[0].toLowerCase();
    const searchName = context.primary_contact.toLowerCase();
    
    if (contactFirstName === searchName) {
      // Exact first name match
      score += 0.3;
    } else if (contact.name.toLowerCase().includes(searchName)) {
      // Contains the search term
      score += 0.2;
    }

    // Strong context alignment bonuses for business
    if (context.formality === 'business') {
      if (contact.email && (contact.email.includes('@company.com') || contact.email.includes('.com'))) {
        score += 0.25; // Strong business email bonus
      }
      if (contact.title) score += 0.15; // Title indicates professional contact
    }

    if (context.formality === 'formal') {
      if (contact.title && contact.title.includes('Dr.')) score += 0.3;
    }

    // Complete contact info bonus (less important)
    if (contact.email && contact.phone) score += 0.05;

    return Math.min(score, 1.0);
  }

  private generateContactReasoning(contact: Contact, context: MessageAnalysis): string {
    const reasons: string[] = [];

    if (contact.name.toLowerCase() === context.primary_contact.toLowerCase()) {
      reasons.push('Exact name match');
    }

    if (context.formality === 'business' && contact.email?.includes('@company.com')) {
      reasons.push('business email aligns with context');
    }

    if (context.formality === 'formal' && contact.title?.includes('Dr.')) {
      reasons.push('formal title matches context');
    }

    if (contact.email && contact.phone) {
      reasons.push('has complete contact info');
    }

    return reasons.join(', ') || 'Basic contact match';
  }

  /**
   * Extract contacts from structured response format
   */
  private extractContactsFromStructuredResponse(structured: any, searchTerm: string): Contact[] {
    console.log(`[RDFContactAnalyzer] 📄 Processing structured response for "${searchTerm}"`);
    
    const contacts: Contact[] = [];
    
    try {
      // Handle structured contact data format
      if (structured.contacts && Array.isArray(structured.contacts)) {
        console.log(`[RDFContactAnalyzer] Found ${structured.contacts.length} contacts in structured.contacts`);
        
        for (const item of structured.contacts) {
          const contact = this.transformApiContactToContact(item, searchTerm);
          if (contact) {
            contacts.push(contact);
          }
        }
      } else if (structured.results && Array.isArray(structured.results)) {
        console.log(`[RDFContactAnalyzer] Found ${structured.results.length} contacts in structured.results`);
        
        for (const item of structured.results) {
          const contact = this.transformApiContactToContact(item, searchTerm);
          if (contact) {
            contacts.push(contact);
          }
        }
      } else {
        console.log(`[RDFContactAnalyzer] ⚠️ No recognized contact arrays in structured response`);
        console.log(`[RDFContactAnalyzer] Available keys:`, Object.keys(structured));
      }
      
    } catch (error) {
      console.error(`[RDFContactAnalyzer] Error processing structured response:`, error);
    }
    
    return contacts;
  }

  /**
   * Extract contacts from Google Contacts API response
   */
  private extractContactsFromApiResponse(rawData: any, searchTerm: string): Contact[] {
    const contacts: Contact[] = [];
    
    console.log(`[RDFContactAnalyzer] 📄 Processing API response for "${searchTerm}"`);
    
    try {
      const data = rawData.data || rawData;
      
      // Handle multiple possible response formats
      let contactsArray: any[] = [];
      
      if (data.contacts) {
        // Format 1: data.contacts (structured response)
        contactsArray = data.contacts;
        console.log(`[RDFContactAnalyzer] Found ${contactsArray.length} contacts in data.contacts format`);
      } else if (data.response_data?.results) {
        // Format 2: data.response_data.results (Google People API format)
        contactsArray = data.response_data.results;
        console.log(`[RDFContactAnalyzer] Found ${contactsArray.length} contacts in response_data.results format`);
      } else if (data.results) {
        // Format 3: data.results (direct results)
        contactsArray = data.results;
        console.log(`[RDFContactAnalyzer] Found ${contactsArray.length} contacts in results format`);
      }
      
      // Process each contact
      for (const item of contactsArray) {
        const contact = this.transformApiContactToContact(item, searchTerm);
        if (contact) {
          contacts.push(contact);
        }
      }
      
    } catch (error) {
      console.error(`[RDFContactAnalyzer] Error extracting contacts from API response:`, error);
    }
    
    return contacts;
  }

  /**
   * Transform Google Contacts API response to our Contact interface
   */
  private transformGoogleContactToContact(googleContact: any): Contact | null {
    try {
      if (!googleContact || !googleContact.name) {
        return null;
      }
      
      // Extract email - handle the ACTUAL Google Contacts API format from unified manager
      let email: string | undefined;
      if (googleContact.emails && Array.isArray(googleContact.emails) && googleContact.emails.length > 0) {
        // Get first email with address property
        const emailObj = googleContact.emails.find((e: any) => e.address) || googleContact.emails[0];
        email = emailObj?.address || emailObj?.value;
      }
      
      // Extract phone - handle the actual format
      let phone: string | undefined;
      if (googleContact.phones && Array.isArray(googleContact.phones) && googleContact.phones.length > 0) {
        // Get first phone with number property
        const phoneObj = googleContact.phones.find((p: any) => p.number) || googleContact.phones[0];
        phone = phoneObj?.number || phoneObj?.value;
      }
      
      const contact: Contact = {
        name: googleContact.name,
        email: email,
        phone: phone,
        title: googleContact.title,
        company: googleContact.company
      };
      
      console.log(`[RDFContactAnalyzer] 🎯 Transformed Google contact: ${contact.name} ${contact.email ? `(${contact.email})` : '(no email)'}`);
      return contact;
      
    } catch (error) {
      console.warn(`[RDFContactAnalyzer] Error transforming Google contact:`, error);
      return null;
    }
  }

  /**
   * Transform API contact data to our Contact interface
   */
  private transformApiContactToContact(item: any, searchTerm: string): Contact | null {
    try {
      // Handle Google People API format (item.person) or direct format
      const person = item.person || item;
      
      if (!person) {
        return null;
      }
      
      // Extract name
      let name = '';
      if (person.names && person.names.length > 0) {
        name = person.names[0].displayName || 
               `${person.names[0].givenName || ''} ${person.names[0].familyName || ''}`.trim();
      } else if (person.name) {
        name = person.name;
      }
      
      if (!name) {
        console.warn(`[RDFContactAnalyzer] Skipping contact with no name`);
        return null;
      }
      
      // Extract email
      let email = '';
      if (person.emailAddresses && person.emailAddresses.length > 0) {
        email = person.emailAddresses[0].value || '';
      } else if (person.emails && person.emails.length > 0) {
        email = person.emails[0].address || person.emails[0].value || '';
      } else if (person.email) {
        email = person.email;
      }
      
      // Extract phone
      let phone = '';
      if (person.phoneNumbers && person.phoneNumbers.length > 0) {
        phone = person.phoneNumbers[0].value || '';
      } else if (person.phones && person.phones.length > 0) {
        phone = person.phones[0].number || person.phones[0].value || '';
      } else if (person.phone) {
        phone = person.phone;
      }
      
      // Extract title and company
      let title = '';
      let company = '';
      if (person.organizations && person.organizations.length > 0) {
        title = person.organizations[0].title || '';
        company = person.organizations[0].name || '';
      } else if (person.title) {
        title = person.title;
      } else if (person.company) {
        company = person.company;
      }
      
      const contact: Contact = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        title: title || undefined,
        company: company || undefined
      };
      
      console.log(`[RDFContactAnalyzer] ✅ Transformed contact: ${name} ${email ? `(${email})` : '(no email)'}`);
      return contact;
      
    } catch (error) {
      console.warn(`[RDFContactAnalyzer] Error transforming contact:`, error);
      return null;
    }
  }

  /**
   * Remove duplicate contacts based on email address and name
   */
  private deduplicateContacts(contacts: Contact[]): Contact[] {
    const seen = new Set<string>();
    const unique: Contact[] = [];
    
    for (const contact of contacts) {
      // Create a unique key based on email (primary) or name (fallback)
      const key = contact.email || contact.name.toLowerCase();
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(contact);
      } else {
        console.log(`[RDFContactAnalyzer] 🔄 Skipping duplicate contact: ${contact.name}`);
      }
    }
    
    console.log(`[RDFContactAnalyzer] 🎯 Deduplicated ${contacts.length} → ${unique.length} contacts`);
    return unique;
  }
} 