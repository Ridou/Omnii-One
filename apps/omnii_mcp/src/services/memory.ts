import { createClient } from '@supabase/supabase-js';
import neo4j, { Record } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

// Supabase setup with validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase: any = null;

// Neo4j setup with validation
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USER;
const neo4jPassword = process.env.NEO4J_PASSWORD;
const neo4jDatabase = process.env.NEO4J_DATABASE || 'neo4j';
let driver: any = null;

// Initialize clients with proper error handling
try {
  // Initialize Supabase only if environment variables are present
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connection initialized successfully');
  } else {
    console.warn('⚠️  Supabase not initialized - missing environment variables:');
    if (!supabaseUrl) console.warn('   - SUPABASE_URL is required');
    if (!supabaseKey) console.warn('   - SUPABASE_ANON_KEY is required');
  }
  
  // Initialize Neo4j only if environment variables are present
  if (neo4jUri && neo4jUser && neo4jPassword) {
    driver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUser, neo4jPassword)
    );
    console.log('✅ Neo4j connection initialized successfully');
  } else {
    console.warn('⚠️  Neo4j not initialized - missing environment variables:');
    if (!neo4jUri) console.warn('   - NEO4J_URI is required');
    if (!neo4jUser) console.warn('   - NEO4J_USER is required');
    if (!neo4jPassword) console.warn('   - NEO4J_PASSWORD is required');
  }
  
  if (supabase && driver) {
    console.log('✅ All database connections initialized successfully');
  }
} catch (error) {
  console.error('❌ Error initializing database connections:', error);
}

/**
 * Fetch user's memory data from Supabase
 * @param userId - The user's ID
 * @param screen - The current screen context (chat, journal, graph, etc.)
 * @returns User memory context
 */
export async function fetchUserMemory(userId: string, screen?: string): Promise<any> {
  if (!supabase) {
    console.error('❌ No Supabase connection available - check environment variables');
    return [];
  }
  
  try {
    // Determine which table to query based on the screen
    let table = 'messages'; // Default to messages
    
    if (screen === 'journal') {
      table = 'journal_entries';
    } else if (screen === 'goals') {
      table = 'goals';
    }
    
    // Fetch the most recent entries (limit to 20 for context window management)
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching user memory:', error);
    return [];
  }
}

/**
 * Fetch graph relationships from Neo4j
 * @param userId - The user's ID
 * @returns Graph relationships context
 */
export async function fetchGraphRelations(userId: string): Promise<any> {
  if (!driver) {
    console.error('❌ No Neo4j connection available - check environment variables');
    return { nodes: [], relationships: [] };
  }
  
  const session = driver.session({
    database: neo4jDatabase
  });
  
  try {
    // Query to get relevant nodes and relationships for the user
    const result = await session.run(
      `
      MATCH (n)-[r]-(m)
      WHERE n.userId = $userId OR m.userId = $userId
      RETURN n, r, m
      LIMIT 50
      `,
      { userId }
    );
    
    // Process the results into a more usable format
    const nodes = new Map();
    const relationships: any[] = [];
    
    result.records.forEach((record: Record) => {
      const start = record.get('n').properties;
      const rel = record.get('r').properties;
      const end = record.get('m').properties;
      
      // Add nodes to our map (to avoid duplicates)
      nodes.set(start.id, start);
      nodes.set(end.id, end);
      
      // Add relationship
      relationships.push({
        from: start.id,
        to: end.id,
        type: record.get('r').type,
        properties: rel
      });
    });
    
    return {
      nodes: Array.from(nodes.values()),
      relationships
    };
  } catch (error) {
    console.error('❌ Error fetching graph relations:', error);
    return { nodes: [], relationships: [] };
  } finally {
    await session.close();
  }
} 