/**
 * Query analyzer utility
 * Detects intents and entities in user queries to help route to the correct Neo4j queries
 */

interface QueryAnalysis {
  intent: string;
  entities: string[];
  parameters: Record<string, any>;
}

/**
 * Analyze a user query to determine intent and extract entities
 * 
 * @param query The user's query text
 * @returns Analysis object with intent and entities
 */
export function analyzeQuery(query: string): QueryAnalysis {
  // Convert to lowercase for easier matching
  const lowerQuery = query.toLowerCase();
  
  // Default response
  const result: QueryAnalysis = {
    intent: 'general_query',
    entities: [],
    parameters: {}
  };
  
  // Check for email related queries
  if (lowerQuery.includes('email') || lowerQuery.includes('mail') || lowerQuery.includes('message')) {
    result.entities.push('email');
    
    // Check for "latest" or "recent" modifier
    if (lowerQuery.includes('latest') || lowerQuery.includes('recent') || lowerQuery.includes('newest')) {
      result.intent = 'get_latest_email';
      result.parameters.limit = 1;
    } 
    // Check for search intent
    else if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('about')) {
      result.intent = 'search_emails';
      
      // Extract potential search terms - simple approach
      const searchTerms = extractSearchTerms(lowerQuery);
      if (searchTerms.length > 0) {
        result.parameters.searchQuery = searchTerms.join(' ');
      }
    }
    // Default to listing emails
    else {
      result.intent = 'list_emails';
      
      // Try to determine if a specific count was requested
      const countMatch = lowerQuery.match(/(\d+)\s+(email|mail|message)/);
      if (countMatch) {
        result.parameters.limit = parseInt(countMatch[1], 10);
      } else {
        result.parameters.limit = 5; // Default to 5 emails
      }
    }
  }
  
  // Check for event/calendar related queries
  else if (lowerQuery.includes('event') || lowerQuery.includes('calendar') || lowerQuery.includes('appointment')) {
    result.entities.push('event');
    
    // Check for "upcoming" events
    if (lowerQuery.includes('upcoming') || lowerQuery.includes('next') || lowerQuery.includes('future')) {
      result.intent = 'get_upcoming_events';
    } 
    // Default to listing events
    else {
      result.intent = 'list_events';
    }
  }
  
  // Check for concept/knowledge related queries
  else if (lowerQuery.includes('concept') || lowerQuery.includes('knowledge') || lowerQuery.includes('note')) {
    result.entities.push('concept');
    
    // Check for search intent
    if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('about')) {
      result.intent = 'search_concepts';
      
      // Extract potential search terms
      const searchTerms = extractSearchTerms(lowerQuery);
      if (searchTerms.length > 0) {
        result.parameters.searchQuery = searchTerms.join(' ');
      }
    }
    // Default to listing concepts
    else {
      result.intent = 'list_concepts';
    }
  }
  
  return result;
}

/**
 * Extract search terms from a query after removing common stop words
 * 
 * @param query The user query
 * @returns Array of potential search terms
 */
function extractSearchTerms(query: string): string[] {
  // List of stop words to filter out
  const stopWords = [
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'did', 'do', 'does', 'doing', 'don', 'down', 'during',
    'each', 'email', 'emails', 'few', 'find', 'for', 'from', 'further',
    'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
    'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
    'just', 'latest', 'mail', 'me', 'more', 'most', 'my', 'myself',
    'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'search', 'searching', 'she', 'should', 'so', 'some', 'such',
    'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up', 'very',
    'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would',
    'you', 'your', 'yours', 'yourself', 'yourselves'
  ];
  
  // Remove common punctuation and split into words
  const words = query.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .split(/\s+/);
  
  // Filter out stop words
  return words.filter(word => 
    word.length > 2 && !stopWords.includes(word)
  );
} 