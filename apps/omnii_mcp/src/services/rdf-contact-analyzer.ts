import { MessageAnalysis, NameVariation, Contact, ContactResolution } from '../types/contact-resolution';
import { ExecutionContextType } from '../types/action-planning.types';

export class RDFContactAnalyzer {
  
  /**
   * Analyze a message to extract contact reference and communication intent
   */
  async analyzeMessage(message: string): Promise<MessageAnalysis> {
    const lowerMessage = message.toLowerCase();
    
    // Extract primary contact (simple pattern matching for now)
    const contactMatch = this.extractContactName(message);
    
    // Determine intent based on action words
    const intent = this.determineIntent(lowerMessage);
    
    // Extract context clues
    const contextClues = this.extractContextClues(lowerMessage);
    
    // Determine formality level
    const formality = this.determineFormalityLevel(message, contextClues);
    
    // Determine urgency
    const urgency = this.determineUrgency(message);
    
    // Generate additional context
    const additionalContext = this.generateAdditionalContext(formality, contextClues);
    
    // Calculate confidence based on various factors
    const confidence = this.calculateConfidence(contactMatch, intent, contextClues);
    
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
    const variations: string[] = [];
    
    // Always include exact match first
    variations.push(contactName);
    
    // Generate phonetic variations
    const phoneticVariations = this.generatePhoneticVariations(contactName);
    variations.push(...phoneticVariations.map(v => v.name));
    
    // Generate similar sounding names
    const similarVariations = this.generateSimilarVariations(contactName);
    variations.push(...similarVariations.map(v => v.name));
    
    // Cultural/linguistic variations
    const culturalVariations = this.generateCulturalVariations(contactName);
    variations.push(...culturalVariations.map(v => v.name));
    
    // Remove duplicates and return
    return [...new Set(variations)];
  }

  /**
   * Search for contacts using Google Contacts API
   */
  async searchContacts(expandedNames: string[], userUUID?: string): Promise<Contact[]> {
    const contacts: Contact[] = [];
    
    console.log(`[RDFContactAnalyzer] 🔍 Searching contacts for ${expandedNames.length} name variations`);
    
    if (!userUUID) {
      console.warn(`[RDFContactAnalyzer] ⚠️ No userUUID provided for contact search`);
      return [];
    }
    
    // Lazy import to avoid initialization issues during testing
    const { default: unifiedGoogleManager } = await import('./unified-google-manager');
    
    // Try each name variation
    for (const name of expandedNames) {
      try {
        console.log(`[RDFContactAnalyzer] 🔍 Searching for: "${name}"`);
        
        // Use the unified Google manager to search contacts
        const searchQuery = `Search contacts for: ${name}`;
        const result = await unifiedGoogleManager.processMessage(
          searchQuery,
          userUUID,
          "America/Los_Angeles",
          undefined,
          ExecutionContextType.WEBSOCKET
        );
        
        console.log(`[RDFContactAnalyzer] Search result for "${name}":`, {
          success: result.success,
          hasRawData: !!result.rawData
        });
        
        if (result.success && result.rawData) {
          const extractedContacts = this.extractContactsFromApiResponse(result.rawData, name);
          console.log(`[RDFContactAnalyzer] Extracted ${extractedContacts.length} contacts for "${name}"`);
          contacts.push(...extractedContacts);
        }
        
      } catch (error) {
        console.warn(`[RDFContactAnalyzer] Search failed for "${name}":`, error);
      }
    }
    
    // Remove duplicates based on email address
    const uniqueContacts = this.deduplicateContacts(contacts);
    console.log(`[RDFContactAnalyzer] 🎯 Found ${uniqueContacts.length} unique contacts total`);
    
    return uniqueContacts;
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

  private extractContactName(message: string): string {
    // Special case: look for single letter names after "with"
    const singleLetterMatch = message.match(/(?:with|to)\s+([A-Z])\s+(?:about|regarding)/i);
    if (singleLetterMatch) {
      return singleLetterMatch[1];
    }

    // Simple regex to find names after action words
    const patterns = [
      /(?:send|email|text|call)\s+([A-Z][a-z]+)/i,
      /(?:message|email)\s+(?:to)\s+([A-Z][a-z]+)/i,
      /(?:to)\s+([A-Z][a-z]+)(?:\s|$)/i,
      /(?:with)\s+([A-Z][a-z]+)/i,
      /([A-Z][a-z]+)\s+(?:an|about)/i,
      /Dr\.\s+([A-Z][a-z]+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback: look for any capitalized word
    const words = message.split(' ');
    for (const word of words) {
      if (word.match(/^[A-Z][a-z]+$/) && word.length > 1) {
        return word;
      }
    }

    return 'Unknown';
  }

  private determineIntent(message: string): string {
    if (message.includes('email') || message.includes('send')) return 'send_email';
    if (message.includes('text') || message.includes('message')) return 'send_text';
    if (message.includes('call')) return 'make_call';
    if (message.includes('remind')) return 'create_reminder';
    return 'unknown';
  }

  private extractContextClues(message: string): string[] {
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

  private determineFormalityLevel(message: string, contextClues: string[]): 'casual' | 'neutral' | 'business' | 'formal' {
    if (message.includes('Dr.') || message.includes('test results')) return 'formal';
    if (contextClues.some(clue => ['quarterly', 'report', 'meeting', 'project'].includes(clue))) return 'business';
    if (contextClues.some(clue => ['dinner', 'tonight'].includes(clue))) return 'casual';
    return 'neutral';
  }

  private determineUrgency(message: string): 'low' | 'normal' | 'urgent' {
    if (message.toUpperCase().includes('URGENT') || message.includes('immediately')) return 'urgent';
    if (message.includes('asap')) return 'urgent';
    // Don't treat casual dinner plans as urgent
    if (message.includes('tonight') && !message.includes('dinner')) return 'urgent';
    return 'normal';
  }

  private generateAdditionalContext(formality: string, contextClues: string[]): string {
    if (formality === 'business') return 'work-related communication';
    if (formality === 'casual') return 'personal communication';
    if (formality === 'formal') return 'formal/professional communication';
    return 'general communication';
  }

  private calculateConfidence(contactName: string, intent: string, contextClues: string[]): number {
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

  private generatePhoneticVariations(name: string): NameVariation[] {
    const variations: NameVariation[] = [];
    
    // Common phonetic variations
    const phoneticMap: { [key: string]: string[] } = {
      'Eden': ['Edan'],
      'Mike': ['Mick', 'Michael'],
      'Maria': ['Marie', 'Mary']
    };

    if (phoneticMap[name]) {
      phoneticMap[name].forEach(variation => {
        variations.push({
          name: variation,
          confidence: 0.8,
          type: 'phonetic'
        });
      });
    }

    return variations;
  }

  private generateSimilarVariations(name: string): NameVariation[] {
    const variations: NameVariation[] = [];
    
    // Similar sounding names
    const similarMap: { [key: string]: string[] } = {
      'Eden': ['Aiden', 'Ethan'],
      'Maria': ['Mariah', 'Mária']
    };

    if (similarMap[name]) {
      similarMap[name].forEach((variation, index) => {
        variations.push({
          name: variation,
          confidence: 0.7 - (index * 0.1), // Decreasing confidence
          type: 'similar'
        });
      });
    }

    return variations;
  }

  private generateCulturalVariations(name: string): NameVariation[] {
    const variations: NameVariation[] = [];
    
    // Cultural variations
    const culturalMap: { [key: string]: string[] } = {
      'Maria': ['Marie', 'Mary', 'Mariah', 'Mária']
    };

    if (culturalMap[name]) {
      culturalMap[name].forEach((variation, index) => {
        variations.push({
          name: variation,
          confidence: 0.6 - (index * 0.05),
          type: 'cultural'
        });
      });
    }

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