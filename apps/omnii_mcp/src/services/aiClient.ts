import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Default model selection
const DEFAULT_OPENAI_MODEL = 'gpt-4-turbo-preview';

/**
 * Send a prompt to an AI model and get a response
 * 
 * @param prompt - The full prompt with context
 * @returns AI response text
 */
export async function askAI(prompt: string): Promise<string> {
  try {
    return await askOpenAI(prompt);
  } catch (error) {
    console.error(`Error with OpenAI API:`, error);
    throw new Error('AI provider failed to respond');
  }
}

/**
 * Send a prompt to OpenAI
 */
async function askOpenAI(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  return response.choices[0]?.message?.content || 'No response from OpenAI';
} 