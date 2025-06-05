import { formatMemoryForPrompt, formatGraphForPrompt } from '../utils/format';

/**
 * Build a context-rich prompt for the AI
 * 
 * @param memory - Supabase memory data
 * @param graphContext - Neo4j graph data
 * @param userInput - Current user input to process
 * @param screen - Current screen for context
 * @param enhancedContext - Additional context based on query analysis
 * @returns Formatted prompt with context
 */
export function buildContext(
  memory: any,
  graphContext: any,
  userInput: string,
  screen?: string,
  enhancedContext?: any
): string {
  // Base system message
  let systemMessage = `You are Omnii, an AI assistant designed to help users manage their knowledge, goals, and personal development.

## ABOUT YOU
- You are helpful, insightful, and focused on providing value to the user.
- You incorporate the user's past conversations, journal entries, and knowledge graph when relevant to your responses.
- You should remember what the user has shared across different contexts.
- You do not mention that you are powered by any specific AI model.

## CURRENT CONTEXT
- Current screen: ${screen || 'unknown'}
- Current user query: "${userInput}"
`;

  // Add enhanced context from query analysis if available
  if (enhancedContext && enhancedContext.intentDetected) {
    systemMessage += `\n## DETECTED INTENT\n`;
    
    // Handle latest email intent
    if (enhancedContext.intent === 'get_latest_email' && enhancedContext.latestEmail) {
      const email = enhancedContext.latestEmail;
      systemMessage += `The user is asking about their latest email. Here are the details:

Latest Email:
- Subject: ${email.properties.subject || 'No subject'}
- From: ${email.properties.from || 'Unknown sender'}
- Date: ${formatDate(email.properties.date) || 'Unknown date'}
- Snippet: ${email.properties.snippet || 'No preview available'}

When responding, summarize the email content and provide key details like sender and subject.
`;
    } 
    // Handle email search intent
    else if (enhancedContext.intent === 'search_emails' && enhancedContext.emails) {
      systemMessage += `The user is searching for emails matching "${enhancedContext.searchQuery}". Found ${enhancedContext.emails.length} results:

${enhancedContext.emails.map((email: any, index: number) => `
Email ${index + 1}:
- Subject: ${email.properties.subject || 'No subject'}
- From: ${email.properties.from || 'Unknown sender'}
- Date: ${formatDate(email.properties.date) || 'Unknown date'}
- Snippet: ${email.properties.snippet || 'No preview available'}
`).join('\n')}

When responding, summarize these email results.
`;
    }
    // Handle entities found
    else if (enhancedContext.entities) {
      systemMessage += `Detected ${enhancedContext.entityType} entities related to the user's query:

${enhancedContext.entities.map((entity: any, index: number) => {
  if (enhancedContext.entityType === 'Email') {
    return `${index + 1}. ${entity.properties.subject || 'No subject'} (from: ${entity.properties.from || 'Unknown'})`;
  } else if (enhancedContext.entityType === 'Event') {
    return `${index + 1}. ${entity.properties.title || 'Untitled event'} (${formatDate(entity.properties.start_time) || 'No date'})`;
  } else if (enhancedContext.entityType === 'Concept') {
    return `${index + 1}. ${entity.properties.name || 'Unnamed concept'}: ${entity.properties.description || 'No description'}`;
  } else {
    return `${index + 1}. ${JSON.stringify(entity.properties)}`;
  }
}).join('\n')}

When responding, incorporate information from these ${enhancedContext.entityType.toLowerCase()} entities.
`;
    }
  }

  // Add memory context if available
  if (memory && memory.length > 0) {
    const memoryContext = formatMemoryForPrompt(memory, screen);
    systemMessage += `\n## RELEVANT USER MEMORY\n${memoryContext}\n`;
  }

  // Add graph context if available
  if (graphContext && graphContext.nodes && graphContext.nodes.length > 0) {
    const graphContextStr = formatGraphForPrompt(graphContext);
    systemMessage += `\n## KNOWLEDGE GRAPH CONNECTIONS\n${graphContextStr}\n`;
  }

  // Add specific instructions based on the screen
  systemMessage += `\n## HOW TO RESPOND\n`;
  
  if (screen === 'chat') {
    systemMessage += `- Respond conversationally and helpfully to the user's query.
- If the query relates to past conversations or entries, reference them specifically.
- Keep responses clear, concise, and focused on the user's immediate needs.`;
  } else if (screen === 'journal') {
    systemMessage += `- The user is in their journal. Help them reflect on their thoughts and experiences.
- Encourage deeper exploration of ideas and feelings.
- Connect new journal entries with past themes and topics when relevant.
- Suggest meaningful follow-up questions or prompts to deepen their reflection.`;
  } else if (screen === 'graph') {
    systemMessage += `- The user is in the knowledge graph view. Help them understand connections between their ideas and concepts.
- Suggest potential new connections between concepts that might be valuable.
- Focus on relationships between entities and how they form a coherent network of knowledge.
- If appropriate, suggest new nodes that might enrich their knowledge graph.`;
  } else if (screen === 'goals') {
    systemMessage += `- Help the user track progress on existing goals and set new ones.
- Relate current activities to their stated goals.
- Encourage accountability and offer suggestions for making progress.
- Celebrate achievements and provide motivation for challenging goals.`;
  } else {
    systemMessage += `- Respond conversationally based on the available context.
- Focus on being helpful and providing value to the user.`;
  }

  return systemMessage;
}

/**
 * Format a date string for readability
 */
function formatDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleString();
  } catch (e) {
    return dateStr;
  }
} 