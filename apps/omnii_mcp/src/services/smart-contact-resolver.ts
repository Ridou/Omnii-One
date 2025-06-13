import unifiedGoogleManager from "./unified-google-manager";
import { RDFService } from "./rdf-service";
import { ExecutionContextType } from "../types/action-planning.types";

interface ContactMatch {
  name: string;
  email?: string;
  phone?: string;
  confidence: number;
  reasoning: string;
}

interface SmartContactResult {
  success: boolean;
  exactMatch?: ContactMatch;
  suggestions?: ContactMatch[];
  searchTerm: string;
  message: string;
}

export class SmartContactResolver {
  private rdfService: RDFService | null;
  private contactsCache: Map<string, any[]> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    try {
      this.rdfService = new RDFService();
      console.log('🧠 SmartContactResolver initialized with RDF reasoning');
    } catch (error) {
      console.warn('⚠️ RDF service unavailable for contact resolution, using fallback matching');
      this.rdfService = null;
    }
  }

  /**
   * Smart contact resolution that tries multiple strategies
   */
  async resolveContact(
    searchTerm: string,
    context: ExecutionContextType,
    userId?: string
  ): Promise<SmartContactResult> {
    console.log(`[SmartContactResolver] 🔍 Resolving contact: "${searchTerm}"`);

    // Strategy 1: Try direct exact search first (quick wins)
    const exactResult = await this.tryExactSearch(searchTerm, context, userId);
    if (exactResult.success) {
      console.log(`[SmartContactResolver] ✅ Direct search found exact match for "${searchTerm}"`);
      return exactResult;
    }

    console.log(`[SmartContactResolver] 🧠 Direct search failed, asking RDF for context analysis...`);

    // Strategy 2: Ask RDF for intelligent context analysis and search suggestions
    const rdfSuggestions = await this.getRDFContextSuggestions(searchTerm);
    
    if (rdfSuggestions.length > 0) {
      console.log(`[SmartContactResolver] 🎯 RDF suggested ${rdfSuggestions.length} search variations:`, rdfSuggestions);
      
      // Strategy 3: Multi-query search with OR logic using all RDF suggestions
      const multiQueryResult = await this.searchWithMultipleTerms(rdfSuggestions, context, userId);
      if (multiQueryResult.success) return multiQueryResult;
    }

    console.log(`[SmartContactResolver] ⚠️ RDF-guided searches failed, falling back to comprehensive analysis`);

    // Strategy 4: Get all contacts and do comprehensive intelligent matching (last resort)
    const allContacts = await this.getAllContacts(context, userId);
    if (allContacts.length === 0) {
      return {
        success: false,
        searchTerm,
        message: `No contacts found. Please check your Google Contacts access.`
      };
    }

    console.log(`[SmartContactResolver] 📋 Analyzing ${allContacts.length} total contacts for intelligent matching`);

    // Strategy 5: Fuzzy matching + RDF reasoning on all contacts
    const intelligentMatches = await this.findIntelligentMatches(searchTerm, allContacts, rdfSuggestions);
    
    if (intelligentMatches.length === 0) {
      return {
        success: false,
        searchTerm,
        message: `No contacts found matching "${searchTerm}". You have ${allContacts.length} contacts, but none match this name or its variations.`
      };
    }

    // If we have a high-confidence match, return it as exact
    const bestMatch = intelligentMatches[0];
    if (bestMatch.confidence >= 0.8) {
      console.log(`[SmartContactResolver] ✅ High-confidence intelligent match found: ${bestMatch.name} (${Math.round(bestMatch.confidence * 100)}%)`);
      return {
        success: true,
        exactMatch: bestMatch,
        searchTerm,
        message: `Found contact: ${bestMatch.name} ${bestMatch.email ? `(${bestMatch.email})` : ''}`
      };
    }

    // Return suggestions for user to pick from
    return {
      success: false,
      suggestions: intelligentMatches.slice(0, 3), // Top 3 suggestions
      searchTerm,
      message: `Found ${intelligentMatches.length} possible matches for "${searchTerm}". Did you mean: ${intelligentMatches.slice(0, 2).map(m => m.name).join(' or ')}?`
    };
  }

  /**
   * Ask RDF for context analysis of what the search term could refer to
   */
  private async getRDFContextSuggestions(searchTerm: string): Promise<string[]> {
    if (!this.rdfService) {
      console.log(`[SmartContactResolver] RDF service not available for context analysis`);
      return [];
    }

    try {
      console.log(`[SmartContactResolver] 🧠 Asking RDF for context analysis of "${searchTerm}"`);
      
      const contextPrompt = `Analyze the search term "${searchTerm}" and provide ALL possible interpretations, variations, and related terms that someone might use to refer to a person. Consider:

1. Common nicknames and formal name variations
2. Cultural/language variations (Spanish, English, etc.)
3. Family relationship terms (papi = father, dad, papa, etc.)
4. Shortened versions and informal variations
5. Alternative spellings and phonetic matches
6. Potential typos or similar-sounding names

For "${searchTerm}", what are ALL the possible names, nicknames, or terms this could refer to? Return a comprehensive list of search terms to try.`;

      const rdfResult = await this.rdfService.processHumanInputToOmniiMCP(contextPrompt);
      
      if (rdfResult?.success && rdfResult.data?.structured?.ai_reasoning) {
        const reasoning = rdfResult.data.structured.ai_reasoning;
        const suggestions: string[] = [];
        
        // Extract suggestions from RDF response concepts
        if (reasoning.extracted_concepts) {
          for (const concept of reasoning.extracted_concepts) {
            suggestions.push(concept.concept_name);
          }
        }
        
        // Also parse the response content for additional suggestions
        if (reasoning.response_content) {
          const content = reasoning.response_content.toLowerCase();
          const commonSuggestions = [
            'papa', 'dad', 'father', 'pap', 'papá', 'daddy',
            'alex', 'alexander', 'alejandro', 'santin', 'santín'
          ];
          
          for (const suggestion of commonSuggestions) {
            if (content.includes(suggestion) && !suggestions.includes(suggestion)) {
              suggestions.push(suggestion);
            }
          }
        }
        
        // Add the original search term and basic variations
        suggestions.push(searchTerm);
        if (searchTerm.length >= 3) {
          suggestions.push(searchTerm.substring(0, 3));
          suggestions.push(searchTerm.substring(0, 4));
        }
        
        const uniqueSuggestions = [...new Set(suggestions.filter(s => s && s.length > 0))];
        console.log(`[SmartContactResolver] 🧠 RDF generated ${uniqueSuggestions.length} context suggestions:`, uniqueSuggestions);
        
        return uniqueSuggestions;
      }
    } catch (error) {
      console.warn(`[SmartContactResolver] RDF context analysis failed:`, error);
    }
    
    // Fallback to basic variations if RDF fails
    return [searchTerm, searchTerm.substring(0, 3)];
  }

  /**
   * Search contacts using multiple terms with OR logic
   */
  private async searchWithMultipleTerms(
    searchTerms: string[],
    context: ExecutionContextType,
    userId?: string
  ): Promise<SmartContactResult> {
    console.log(`[SmartContactResolver] 🔍 Multi-term search with ${searchTerms.length} variations`);
    
    for (const term of searchTerms) {
      console.log(`[SmartContactResolver] 🔄 Trying RDF-suggested term: "${term}"`);
      const result = await this.trySearchVariant(term, context, userId, "partial");
      if (result.success) {
        console.log(`[SmartContactResolver] ✅ Found match with RDF-suggested term "${term}"`);
        result.message = `Found contact "${result.exactMatch?.name}" using intelligent context analysis (searched for "${term}")`;
        return result;
      }
    }

    return {
      success: false,
      searchTerm: searchTerms[0],
      message: `No matches found with ${searchTerms.length} intelligent search variations`
    };
  }

  /**
   * Find intelligent matches using fuzzy matching + RDF reasoning on all contacts
   */
  private async findIntelligentMatches(
    searchTerm: string,
    allContacts: any[],
    rdfSuggestions: string[]
  ): Promise<ContactMatch[]> {
    console.log(`[SmartContactResolver] 🧠 Finding intelligent matches using fuzzy + RDF reasoning`);
    
    const allMatches: ContactMatch[] = [];
    const searchTerms = [searchTerm, ...rdfSuggestions];
    
    // Try fuzzy matching with original search term
    const fuzzyMatches = this.findFuzzyMatches(searchTerm, allContacts);
    allMatches.push(...fuzzyMatches);
    
    // Try fuzzy matching with each RDF suggestion
    for (const suggestion of rdfSuggestions) {
      if (suggestion !== searchTerm) {
        const suggestionMatches = this.findFuzzyMatches(suggestion, allContacts);
        // Boost confidence for RDF-suggested matches
        const boostedMatches = suggestionMatches.map(match => ({
          ...match,
          confidence: Math.min(match.confidence + 0.1, 1.0), // Small boost for RDF suggestions
          reasoning: `${match.reasoning} + RDF context boost`
        }));
        allMatches.push(...boostedMatches);
      }
    }
    
    // Use RDF to analyze the best fuzzy matches if available
    let rdfMatches: ContactMatch[] = [];
    if (this.rdfService && allMatches.length > 0) {
      rdfMatches = await this.findRDFMatches(searchTerm, allMatches.slice(0, 5)); // Top 5 for RDF analysis
    }
    
    // Combine, deduplicate, and rank all results
    const combinedMatches = this.combineAndRankMatches(allMatches, rdfMatches);
    
    console.log(`[SmartContactResolver] 🎯 Found ${combinedMatches.length} intelligent matches`);
    return combinedMatches;
  }



  /**
   * Try flexible search with multiple strategies
   */
  private async tryExactSearch(
    searchTerm: string,
    context: ExecutionContextType,
    userId?: string
  ): Promise<SmartContactResult> {
    // Strategy 1: Direct exact search
    const exactResult = await this.trySearchVariant(searchTerm, context, userId, "exact");
    if (exactResult.success) return exactResult;

    // Strategy 2: Case-insensitive partial search
    const partialResult = await this.trySearchVariant(searchTerm, context, userId, "partial");
    if (partialResult.success) return partialResult;

    // Strategy 3: Search with wildcards/broader query
    const broadResult = await this.trySearchVariant(searchTerm, context, userId, "broad");
    if (broadResult.success) return broadResult;

    return {
      success: false,
      searchTerm,
      message: "No matches found in flexible search"
    };
  }

  /**
   * Try different search variants
   */
  private async trySearchVariant(
    searchTerm: string,
    context: ExecutionContextType,
    userId?: string,
    variant: "exact" | "partial" | "broad"
  ): Promise<SmartContactResult> {
    try {
      let searchQuery: string;
      
      switch (variant) {
        case "exact":
          searchQuery = `Find contact: ${searchTerm}`;
          break;
        case "partial":
          // Search for contacts containing the term (case-insensitive)
          searchQuery = `Search contacts containing: ${searchTerm}`;
          break;
        case "broad":
          // Broader search that matches partial names, nicknames, etc.
          searchQuery = `Search all contacts for name like: ${searchTerm}`;
          break;
      }

      console.log(`[SmartContactResolver] 🔍 Trying ${variant} search: "${searchQuery}"`);

      // Check if userId is valid before making API calls
      if (!userId || userId.trim() === "") {
        console.warn(`[SmartContactResolver] No valid userId provided for ${variant} search`);
        return {
          success: false,
          searchTerm,
          message: `${variant} search failed: No user authentication available`
        };
      }

      const result = await unifiedGoogleManager.processMessage(
        searchQuery,
        userId,
        "America/Los_Angeles",
        undefined,
        context
      );

      if (result.success && this.hasValidContactData(result)) {
        const contactData = this.extractContactFromResult(result, searchTerm);
        if (contactData) {
          console.log(`[SmartContactResolver] ✅ ${variant} search found: ${contactData.name}`);
          return {
            success: true,
            exactMatch: {
              ...contactData,
              confidence: variant === "exact" ? 1.0 : variant === "partial" ? 0.9 : 0.8,
              reasoning: `${variant.charAt(0).toUpperCase() + variant.slice(1)} search match`
            },
            searchTerm,
            message: `Found contact via ${variant} search: ${contactData.name}`
          };
        }
      }
    } catch (error) {
      console.warn(`[SmartContactResolver] ${variant} search failed:`, error);
    }

    return {
      success: false,
      searchTerm,
      message: `${variant} search found no matches`
    };
  }

  /**
   * Check if result has valid contact data
   */
  private hasValidContactData(result: any): boolean {
    const data = result.rawData?.data || result.rawData;
    if (!data) return false;

    // Check multiple possible data structures from Google Contacts API
    const possibleArrays = [
      data.results,
      data.response_data?.results,
      data.connections,
      data.contacts,
      data.people_data
    ];

    return possibleArrays.some(arr => Array.isArray(arr) && arr.length > 0);
  }

  /**
   * Extract contact data from API result
   */
  private extractContactFromResult(result: any, searchTerm: string): ContactMatch | null {
    const data = result.rawData?.data || result.rawData;
    if (!data) return null;

    // Try different possible data structures
    const possibleArrays = [
      { path: 'results', data: data.results },
      { path: 'response_data.results', data: data.response_data?.results },
      { path: 'connections', data: data.connections },
      { path: 'contacts', data: data.contacts },
      { path: 'people_data', data: data.people_data }
    ];

    for (const { path, data: contactArray } of possibleArrays) {
      if (Array.isArray(contactArray) && contactArray.length > 0) {
        console.log(`[SmartContactResolver] 📍 Found contacts in ${path}: ${contactArray.length} contacts`);
        
        // Look for the best match in the results
        for (const contact of contactArray) {
          const extracted = this.extractSingleContact(contact, searchTerm);
          if (extracted) {
            return extracted;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract data from a single contact object
   */
  private extractSingleContact(contact: any, searchTerm: string): ContactMatch | null {
    // Handle different contact structures
    const person = contact.person || contact;
    if (!person) return null;

    const names = person.names || [];
    const emails = person.emailAddresses || [];
    const phones = person.phoneNumbers || [];

    // Get the best name match
    let bestName = '';
    let nameConfidence = 0;

    for (const name of names) {
      const displayName = name.displayName || '';
      const givenName = name.givenName || '';
      const familyName = name.familyName || '';
      
      const namesToCheck = [displayName, givenName, familyName, `${givenName} ${familyName}`.trim()]
        .filter(n => n.length > 0);

      for (const nameToCheck of namesToCheck) {
        const confidence = this.calculateNameSimilarity(searchTerm.toLowerCase(), nameToCheck.toLowerCase());
        if (confidence > nameConfidence) {
          nameConfidence = confidence;
          bestName = displayName || nameToCheck;
        }
      }
    }

    if (nameConfidence > 0.3) { // Found a reasonable match
      return {
        name: bestName,
        email: emails[0]?.value,
        phone: phones[0]?.value,
        confidence: nameConfidence,
        reasoning: `Contact match: "${searchTerm}" found "${bestName}"`
      };
    }

    return null;
  }

  /**
   * Get all contacts with caching
   */
  private async getAllContacts(context: ExecutionContextType, userId?: string): Promise<any[]> {
    const cacheKey = `contacts:${userId || 'default'}`;
    const cached = this.contactsCache.get(cacheKey);
    
    if (cached) {
      console.log(`[SmartContactResolver] 📋 Using cached contacts (${cached.length} contacts)`);
      return cached;
    }

    try {
      // Check if userId is valid before making API calls
      if (!userId || userId.trim() === "") {
        console.warn(`[SmartContactResolver] No valid userId provided for getAllContacts`);
        return [];
      }

      console.log(`[SmartContactResolver] 📋 Fetching all contacts...`);
      const result = await unifiedGoogleManager.processMessage(
        `List all contacts`,
        userId,
        "America/Los_Angeles",
        undefined,
        context
      );

      if (result.success && result.rawData) {
        const data = result.rawData.data || result.rawData;
        // Check multiple possible contact data structures
        const contacts = data.contacts || data.response_data?.results || data.results || [];
        
        console.log(`[SmartContactResolver] 📋 Raw data structure:`, Object.keys(data));
        console.log(`[SmartContactResolver] 📋 Contacts found: ${contacts.length}`);
        
        // Cache for 5 minutes
        this.contactsCache.set(cacheKey, contacts);
        setTimeout(() => this.contactsCache.delete(cacheKey), this.cacheExpiry);
        
        console.log(`[SmartContactResolver] 📋 Fetched ${contacts.length} contacts`);
        return contacts;
      }
    } catch (error) {
      console.error(`[SmartContactResolver] Failed to fetch all contacts:`, error);
    }

    return [];
  }

  /**
   * Find fuzzy matches using string similarity
   */
  private findFuzzyMatches(searchTerm: string, contacts: any[]): ContactMatch[] {
    const matches: ContactMatch[] = [];
    const searchLower = searchTerm.toLowerCase().trim();

    console.log(`[SmartContactResolver] 🔍 Fuzzy matching "${searchTerm}" against ${contacts.length} contacts`);

    for (const contact of contacts) {
      // Handle both Google People API format (contact.person) and simplified format (direct contact)
      const person = contact.person || contact;
      
      // Extract name information from different possible formats
      let namesToCheck: string[] = [];
      let email = '';
      let phone = '';
      
      if (person.names) {
        // Google People API format
        for (const name of person.names) {
          const displayName = name.displayName || '';
          const givenName = name.givenName || '';
          const familyName = name.familyName || '';
          
          namesToCheck.push(
            displayName,
            givenName,
            familyName,
            `${givenName} ${familyName}`.trim()
          );
        }
        email = person.emailAddresses?.[0]?.value || '';
        phone = person.phoneNumbers?.[0]?.value || '';
      } else {
        // Simplified format (like from ContactsPlugin)
        const fullName = person.name || '';
        const firstName = person.firstName || '';
        const lastName = person.lastName || '';
        
        namesToCheck.push(
          fullName,
          firstName,
          lastName,
          `${firstName} ${lastName}`.trim()
        );
        email = person.emails?.[0]?.address || '';
        phone = person.phones?.[0]?.number || '';
      }

      // Filter out empty names and check for matches
      namesToCheck = namesToCheck.filter(n => n && n.length > 0);
      
      for (const nameToCheck of namesToCheck) {
        const confidence = this.calculateNameSimilarity(searchLower, nameToCheck.toLowerCase());
        
        if (confidence > 0.3) { // Threshold for fuzzy matching
          console.log(`[SmartContactResolver] 🎯 Found fuzzy match: "${searchTerm}" → "${nameToCheck}" (${Math.round(confidence * 100)}% confidence)`);
          
          matches.push({
            name: namesToCheck[0] || nameToCheck, // Use full name if available
            email,
            phone,
            confidence,
            reasoning: `Fuzzy match: "${searchTerm}" → "${nameToCheck}" (${Math.round(confidence * 100)}% similar)`
          });
          break; // Only add one match per contact
        }
      }
    }

    console.log(`[SmartContactResolver] 📊 Found ${matches.length} fuzzy matches`);
    
    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate name similarity using multiple methods
   */
  private calculateNameSimilarity(search: string, name: string): number {
    // Exact match (case-insensitive)
    if (search === name) return 1.0;
    
    // Exact match ignoring case
    if (search.toLowerCase() === name.toLowerCase()) return 1.0;
    
    // Partial match (search term is contained in name)
    if (name.includes(search)) {
      return 0.9 + (search.length / name.length) * 0.1;
    }
    
    // Check if search matches the start of any word in the name
    const nameWords = name.split(' ');
    for (const word of nameWords) {
      if (word.startsWith(search)) {
        return 0.8 + (search.length / word.length) * 0.2;
      }
      
      // Also check case-insensitive word matching
      if (word.toLowerCase().startsWith(search.toLowerCase())) {
        return 0.8 + (search.length / word.length) * 0.2;
      }
      
      // Check if the search term matches the word exactly (case-insensitive)
      if (word.toLowerCase() === search.toLowerCase()) {
        return 0.9;
      }
    }
    
    // Check if any word in name starts with search (case-insensitive)
    for (const word of nameWords) {
      if (word.toLowerCase().includes(search.toLowerCase())) {
        return 0.7 + (search.length / word.length) * 0.2;
      }
    }
    
    // Levenshtein distance for typos
    const distance = this.levenshteinDistance(search, name);
    const maxLength = Math.max(search.length, name.length);
    const similarity = 1 - (distance / maxLength);
    
    // More lenient threshold for fuzzy matches
    return Math.max(0, similarity - 0.1);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
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
   * Use RDF to find semantic matches
   */
  private async findRDFMatches(searchTerm: string, fuzzyMatches: ContactMatch[]): Promise<ContactMatch[]> {
    if (!this.rdfService || fuzzyMatches.length === 0) {
      return [];
    }

    try {
      const contactNames = fuzzyMatches.slice(0, 5).map(m => m.name); // Top 5 for RDF analysis
      const rdfPrompt = `Analyze name similarity: User searched for "${searchTerm}" and we found these contacts: ${contactNames.join(', ')}. Which names are most likely to be the same person?`;
      
      console.log(`[SmartContactResolver] 🧠 RDF analyzing: ${rdfPrompt}`);
      
      const rdfResult = await this.rdfService.processHumanInputToOmniiMCP(rdfPrompt);
      
      if (rdfResult?.success && rdfResult.data?.structured?.ai_reasoning?.extracted_concepts) {
        const concepts = rdfResult.data.structured.ai_reasoning.extracted_concepts;
        
        // Enhance fuzzy matches with RDF insights
        return fuzzyMatches.map(match => {
          const relevantConcept = concepts.find(c => 
            match.name.toLowerCase().includes(c.concept_name.toLowerCase()) ||
            c.concept_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          if (relevantConcept) {
            return {
              ...match,
              confidence: Math.min(match.confidence + (relevantConcept.confidence * 0.3), 1.0),
              reasoning: `${match.reasoning} + RDF semantic analysis (${Math.round(relevantConcept.confidence * 100)}% relevance)`
            };
          }
          
          return match;
        });
      }
    } catch (error) {
      console.warn(`[SmartContactResolver] RDF analysis failed:`, error);
    }

    return fuzzyMatches;
  }

  /**
   * Combine and rank all matches
   */
  private combineAndRankMatches(fuzzyMatches: ContactMatch[], rdfMatches: ContactMatch[]): ContactMatch[] {
    // If we have RDF matches, use those (they're enhanced versions of fuzzy matches)
    const matches = rdfMatches.length > 0 ? rdfMatches : fuzzyMatches;
    
    // Remove duplicates and sort by confidence
    const uniqueMatches = new Map<string, ContactMatch>();
    
    for (const match of matches) {
      const key = match.email || match.name;
      if (!uniqueMatches.has(key) || uniqueMatches.get(key)!.confidence < match.confidence) {
        uniqueMatches.set(key, match);
      }
    }
    
    return Array.from(uniqueMatches.values())
              .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5); // Top 5 matches
  }
} 