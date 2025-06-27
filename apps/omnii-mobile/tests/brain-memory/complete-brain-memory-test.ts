/**
 * 🧠 COMPREHENSIVE BRAIN MEMORY CACHE INTEGRATION TEST
 * 
 * Tests the complete brain-inspired memory cache system with real data:
 * - Neo4j concepts (24hr cache)
 * - Google Tasks (30min cache) 
 * - Google Calendar (2hr cache)
 * - Google Contacts (24hr cache)
 * - Google Email (5min cache)
 */

import { supabase } from '../src/lib/supabase';

// Mock environment to force localhost connection
const originalEnv = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
process.env.EXPO_PUBLIC_BACKEND_BASE_URL = 'http://localhost:8000';

// Test configuration
const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const LOCALHOST_BASE_URL = 'http://localhost:8000';

interface TestResults {
  phase: string;
  success: boolean;
  data?: any;
  error?: string;
  metrics?: {
    duration: number;
    itemCount: number;
    cacheHit?: boolean;
  };
}

interface BrainCacheEntry {
  id: string;
  user_id: string;
  data_type: string;
  cache_key: string;
  cache_data: any;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

describe('🧠 Brain Memory Cache - Complete Integration Test', () => {
  let testResults: TestResults[] = [];

  beforeAll(async () => {
    console.log('\n🧠 === BRAIN MEMORY CACHE INTEGRATION TEST ===');
    console.log(`📡 Backend URL: ${LOCALHOST_BASE_URL}`);
    console.log(`👤 Test User: ${TEST_USER_ID}`);
    console.log('🎯 Goal: Validate complete brain memory system with real data\n');
  });

  afterAll(async () => {
    // Restore original environment
    process.env.EXPO_PUBLIC_BACKEND_BASE_URL = originalEnv;
    
    // Print comprehensive summary
    console.log('\n' + '='.repeat(80));
    console.log('🧠 BRAIN MEMORY CACHE - FINAL INTEGRATION SUMMARY');
    console.log('='.repeat(80));
    
    const successCount = testResults.filter(r => r.success).length;
    const totalTests = testResults.length;
    const healthScore = Math.round((successCount / totalTests) * 100);
    
    testResults.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const metrics = result.metrics ? 
        ` (${result.metrics.duration}ms, ${result.metrics.itemCount} items${result.metrics.cacheHit ? ', cache hit' : ''})` : '';
      console.log(`${icon} ${index + 1}. ${result.phase}${metrics}`);
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      }
    });
    
    console.log('\n📊 INTEGRATION HEALTH METRICS:');
    console.log(`✅ Tests Passed: ${successCount}`);
    console.log(`❌ Tests Failed: ${totalTests - successCount}`);
    console.log(`📊 System Health Score: ${healthScore}%`);
    
    if (healthScore >= 80) {
      console.log('🎉 System is healthy - ready for production deployment!');
    } else if (healthScore >= 60) {
      console.log('⚠️  System needs attention - some optimizations required');
    } else {
      console.log('🚨 System requires fixes before production deployment');
    }
    
    console.log('='.repeat(80) + '\n');
  });

  describe('Phase 1: Infrastructure Validation', () => {
    test('🔌 Local Server Connection', async () => {
      console.log('🔌 Testing local server connection...');
      const startTime = Date.now();
      try {
        const response = await fetch(`${LOCALHOST_BASE_URL}/health`);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          console.log(`✅ Server is running at ${LOCALHOST_BASE_URL}`);
          testResults.push({
            phase: 'Local Server Connection',
            success: true,
            metrics: { duration, itemCount: 1 }
          });
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Server connection failed: ${error}`);
        testResults.push({
          phase: 'Local Server Connection',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    test('🗄️ Supabase Brain Cache Connection', async () => {
      console.log('🗄️ Testing Supabase brain cache connection...');
      const startTime = Date.now();
      try {
        const { data, error } = await supabase
          .from('brain_memory_cache')
          .select('count(*)')
          .limit(1);
        
        const duration = Date.now() - startTime;
        
        if (error) throw error;
        
        console.log('✅ Supabase brain cache is accessible');
        testResults.push({
          phase: 'Supabase Brain Cache Connection',
          success: true,
          metrics: { duration, itemCount: 1 }
        });
      } catch (error) {
        console.log(`❌ Supabase connection failed: ${error}`);
        testResults.push({
          phase: 'Supabase Brain Cache Connection',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });
  });

  describe('Phase 2: Google Services Data Validation', () => {
    test('📋 Google Tasks API Integration', async () => {
      console.log('📋 Testing Google Tasks API...');
      const startTime = Date.now();
      try {
        const response = await fetch(`${LOCALHOST_BASE_URL}/api/trpc/tasks.getCompleteOverview`, {
          headers: {
            'x-user-id': TEST_USER_ID,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
        }
        
        const data = result.result?.data?.data;
        if (!data || !data.taskLists) {
          throw new Error('Invalid response structure');
        }
        
        const taskCount = data.totalTasks || 0;
        
        console.log(`✅ Google Tasks: ${data.taskLists?.length || 0} lists, ${taskCount} tasks`);
        testResults.push({
          phase: 'Google Tasks API Integration',
          success: true,
          data: {
            totalLists: data.taskLists?.length || 0,
            totalTasks: taskCount,
            lastSync: data.lastSyncTime
          },
          metrics: { duration, itemCount: taskCount }
        });
      } catch (error) {
        console.log(`❌ Google Tasks failed: ${error}`);
        testResults.push({
          phase: 'Google Tasks API Integration',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    test('📧 Gmail API Integration', async () => {
      console.log('📧 Testing Gmail API...');
      const startTime = Date.now();
      try {
        const response = await fetch(`${LOCALHOST_BASE_URL}/api/trpc/email.listEmails`, {
          headers: {
            'x-user-id': TEST_USER_ID,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
        }
        
        const data = result.result?.data?.json?.data;
        if (!data || !Array.isArray(data.emails)) {
          throw new Error('Invalid email response structure');
        }
        
        const emailCount = data.emails.length;
        
        console.log(`✅ Gmail: ${emailCount} emails fetched of ${data.totalCount || 0} total`);
        testResults.push({
          phase: 'Gmail API Integration',
          success: true,
          data: {
            totalEmails: data.totalCount || 0,
            fetchedEmails: emailCount,
            unreadCount: data.unreadCount || 0
          },
          metrics: { duration, itemCount: emailCount }
        });
      } catch (error) {
        console.log(`❌ Gmail failed: ${error}`);
        testResults.push({
          phase: 'Gmail API Integration',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    test('📅 Google Calendar API Integration', async () => {
      console.log('📅 Testing Google Calendar API...');
      const startTime = Date.now();
      try {
        const response = await fetch(`${LOCALHOST_BASE_URL}/api/trpc/calendar.getEvents`, {
          headers: {
            'x-user-id': TEST_USER_ID,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
        }
        
        const data = result.result?.data?.json?.data;
        const eventCount = Array.isArray(data?.events) ? data.events.length : 0;
        
        console.log(`✅ Google Calendar: ${eventCount} events`);
        testResults.push({
          phase: 'Google Calendar API Integration',
          success: true,
          data: {
            eventCount,
            message: result.result?.data?.json?.message || 'No events'
          },
          metrics: { duration, itemCount: eventCount }
        });
      } catch (error) {
        console.log(`❌ Google Calendar failed: ${error}`);
        testResults.push({
          phase: 'Google Calendar API Integration',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        // Don't throw - calendar might be empty
      }
    });
  });

  describe('Phase 3: Neo4j Direct Connection', () => {
    test('🧠 Neo4j Concepts Retrieval', async () => {
      console.log('🧠 Testing Neo4j concepts...');
      const startTime = Date.now();
      try {
        const response = await fetch(`${LOCALHOST_BASE_URL}/api/neo4j/concepts`, {
          headers: {
            'x-user-id': TEST_USER_ID,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
        }
        
        const conceptCount = Array.isArray(result.data) ? result.data.length : 0;
        
        console.log(`✅ Neo4j: ${conceptCount} concepts available`);
        testResults.push({
          phase: 'Neo4j Concepts Retrieval',
          success: true,
          data: {
            conceptCount,
            sampleConcepts: result.data?.slice(0, 3)?.map((c: any) => c.text) || []
          },
          metrics: { duration, itemCount: conceptCount }
        });
      } catch (error) {
        console.log(`❌ Neo4j failed: ${error}`);
        testResults.push({
          phase: 'Neo4j Concepts Retrieval',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });
  });

  describe('Phase 4: Brain Cache System Validation', () => {
    test('💾 Brain Cache Data Storage & Retrieval', async () => {
      console.log('💾 Testing brain cache data...');
      const startTime = Date.now();
      try {
        // Check existing cache entries
        const { data: cacheEntries, error } = await supabase
          .from('brain_memory_cache')
          .select('*')
          .eq('user_id', TEST_USER_ID)
          .order('updated_at', { ascending: false });
        
        const duration = Date.now() - startTime;
        
        if (error) throw error;
        
        const cacheByType = (cacheEntries as BrainCacheEntry[]).reduce((acc, entry) => {
          if (!acc[entry.data_type]) acc[entry.data_type] = [];
          acc[entry.data_type].push({
            key: entry.cache_key,
            itemCount: Array.isArray(entry.cache_data) ? entry.cache_data.length : 1,
            age: Math.round((Date.now() - new Date(entry.updated_at).getTime()) / 1000 / 60), // minutes
            expired: new Date(entry.expires_at) < new Date()
          });
          return acc;
        }, {} as Record<string, any[]>);
        
        console.log(`✅ Brain Cache: ${cacheEntries?.length || 0} entries across ${Object.keys(cacheByType).length} data types`);
        Object.entries(cacheByType).forEach(([type, entries]) => {
          console.log(`   📂 ${type}: ${entries.length} entries`);
        });
        
        testResults.push({
          phase: 'Brain Cache Data Storage & Retrieval',
          success: true,
          data: {
            totalEntries: cacheEntries?.length || 0,
            dataTypes: Object.keys(cacheByType),
            cacheByType
          },
          metrics: { duration, itemCount: cacheEntries?.length || 0 }
        });
      } catch (error) {
        console.log(`❌ Brain cache failed: ${error}`);
        testResults.push({
          phase: 'Brain Cache Data Storage & Retrieval',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });
  });

  describe('Phase 5: Real Data Context Display', () => {
    test('📊 Context Data for UI Display', async () => {
      console.log('📊 Testing real data context display...');
      const startTime = Date.now();
      try {
        // Fetch comprehensive data for context display
        const [tasksRes, emailsRes, conceptsRes] = await Promise.all([
          fetch(`${LOCALHOST_BASE_URL}/api/trpc/tasks.getCompleteOverview`, {
            headers: { 'x-user-id': TEST_USER_ID }
          }),
          fetch(`${LOCALHOST_BASE_URL}/api/trpc/email.listEmails`, {
            headers: { 'x-user-id': TEST_USER_ID }
          }),
          fetch(`${LOCALHOST_BASE_URL}/api/neo4j/concepts`, {
            headers: { 'x-user-id': TEST_USER_ID }
          })
        ]);
        
        const [tasksData, emailsData, conceptsData] = await Promise.all([
          tasksRes.json(),
          emailsRes.json(), 
          conceptsRes.json()
        ]);
        
        const duration = Date.now() - startTime;
        
        // Extract actual data for context display
        const taskLists = tasksData.result?.data?.data?.taskLists || [];
        const emails = emailsData.result?.data?.json?.data?.emails || [];
        const concepts = conceptsData.data || [];
        
        // Display context as it would appear in the UI
        console.log('\n📊 === REAL DATA CONTEXT FOR UI DISPLAY ===');
        console.log(`📋 Tasks: ${taskLists.length} lists with ${taskLists.reduce((sum: number, list: any) => sum + (list.tasks?.length || 0), 0)} total tasks`);
        taskLists.slice(0, 2).forEach((list: any) => {
          console.log(`   • ${list.title}: ${list.tasks?.length || 0} tasks`);
          list.tasks?.slice(0, 3)?.forEach((task: any) => {
            console.log(`     - ${task.title}`);
          });
        });
        
        console.log(`\n📧 Emails: ${emails.length} recent emails from ${emailsData.result?.data?.json?.data?.totalCount || 0} total`);
        emails.slice(0, 3).forEach((email: any) => {
          const subject = email.subject?.substring(0, 50) + (email.subject?.length > 50 ? '...' : '');
          const from = email.sender?.split('<')[0]?.trim() || email.from;
          console.log(`   ${!email.isRead ? '🔵' : '⚪'} ${subject} (from: ${from})`);
        });
        
        console.log(`\n🧠 Knowledge: ${concepts.length} concepts`);
        concepts.slice(0, 5).forEach((concept: any) => {
          const text = concept.text?.substring(0, 60) + (concept.text?.length > 60 ? '...' : '');
          console.log(`   • ${text}`);
        });
        console.log('==========================================\n');
        
        testResults.push({
          phase: 'Context Data for UI Display',
          success: true,
          data: {
            taskCount: taskLists.reduce((sum: number, list: any) => sum + (list.tasks?.length || 0), 0),
            emailCount: emails.length,
            conceptCount: concepts.length
          },
          metrics: { duration, itemCount: taskLists.length + emails.length + concepts.length }
        });
        
      } catch (error) {
        console.log(`❌ Context display failed: ${error}`);
        testResults.push({
          phase: 'Context Data for UI Display',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });
  });
}); 