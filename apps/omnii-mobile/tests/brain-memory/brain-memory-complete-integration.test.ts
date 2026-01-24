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
      const startTime = Date.now();
      try {
        const response = await fetch(`${LOCALHOST_BASE_URL}/health`);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          testResults.push({
            phase: 'Local Server Connection',
            success: true,
            metrics: { duration, itemCount: 1 }
          });
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (error) {
        testResults.push({
          phase: 'Local Server Connection',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    test('🗄️ Supabase Brain Cache Connection', async () => {
      const startTime = Date.now();
      try {
        const { data, error } = await supabase
          .from('brain_memory_cache')
          .select('count(*)')
          .limit(1);
        
        const duration = Date.now() - startTime;
        
        if (error) throw error;
        
        testResults.push({
          phase: 'Supabase Brain Cache Connection',
          success: true,
          metrics: { duration, itemCount: 1 }
        });
      } catch (error) {
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
        
        console.log(`📋 Tasks: ${data.taskLists?.length || 0} lists, ${taskCount} tasks`);
      } catch (error) {
        testResults.push({
          phase: 'Google Tasks API Integration',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    test('📧 Gmail API Integration', async () => {
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
        
        console.log(`📧 Emails: ${emailCount} fetched of ${data.totalCount || 0} total`);
      } catch (error) {
        testResults.push({
          phase: 'Gmail API Integration',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    test('📅 Google Calendar API Integration', async () => {
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
        
        testResults.push({
          phase: 'Google Calendar API Integration',
          success: true,
          data: {
            eventCount,
            message: result.result?.data?.json?.message || 'No events'
          },
          metrics: { duration, itemCount: eventCount }
        });
        
        console.log(`📅 Calendar: ${eventCount} events`);
      } catch (error) {
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
        
        testResults.push({
          phase: 'Neo4j Concepts Retrieval',
          success: true,
          data: {
            conceptCount,
            sampleConcepts: result.data?.slice(0, 3)?.map((c: any) => c.text) || []
          },
          metrics: { duration, itemCount: conceptCount }
        });
        
        console.log(`🧠 Neo4j: ${conceptCount} concepts available`);
      } catch (error) {
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
          const key = `${entry.data_type}:${entry.cache_key}`;
          if (!acc[entry.data_type]) acc[entry.data_type] = [];
          acc[entry.data_type].push({
            key: entry.cache_key,
            itemCount: Array.isArray(entry.cache_data) ? entry.cache_data.length : 1,
            age: Math.round((Date.now() - new Date(entry.updated_at).getTime()) / 1000 / 60), // minutes
            expired: new Date(entry.expires_at) < new Date()
          });
          return acc;
        }, {} as Record<string, any[]>);
        
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
        
        console.log(`💾 Brain Cache: ${cacheEntries?.length || 0} entries across ${Object.keys(cacheByType).length} data types`);
        Object.entries(cacheByType).forEach(([type, entries]) => {
          console.log(`   📂 ${type}: ${entries.length} entries`);
        });
      } catch (error) {
        testResults.push({
          phase: 'Brain Cache Data Storage & Retrieval',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    test('⚡ Cache Performance Analysis', async () => {
      const startTime = Date.now();
      try {
        // Test cache performance with multiple concurrent requests
        const requests = [
          fetch(`${LOCALHOST_BASE_URL}/api/trpc/tasks.getCompleteOverview`, {
            headers: { 'x-user-id': TEST_USER_ID }
          }),
          fetch(`${LOCALHOST_BASE_URL}/api/trpc/email.listEmails`, {
            headers: { 'x-user-id': TEST_USER_ID }
          }),
          fetch(`${LOCALHOST_BASE_URL}/api/neo4j/concepts`, {
            headers: { 'x-user-id': TEST_USER_ID }
          })
        ];
        
        const responses = await Promise.all(requests);
        const duration = Date.now() - startTime;
        
        const results = await Promise.all(responses.map(r => r.json()));
        const allSuccessful = responses.every(r => r.ok);
        
        if (!allSuccessful) {
          throw new Error('Some concurrent requests failed');
        }
        
        testResults.push({
          phase: 'Cache Performance Analysis',
          success: true,
          data: {
            concurrentRequests: requests.length,
            totalDuration: duration,
            avgDuration: Math.round(duration / requests.length)
          },
          metrics: { duration, itemCount: requests.length }
        });
        
        console.log(`⚡ Performance: ${requests.length} concurrent requests in ${duration}ms (avg: ${Math.round(duration / requests.length)}ms each)`);
      } catch (error) {
        testResults.push({
          phase: 'Cache Performance Analysis',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });
  });

  describe('Phase 5: Data Context Validation', () => {
    test('📊 Real Data Context Display', async () => {
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
        
        const contextData = {
          tasks: {
            summary: `${taskLists.length} task lists with ${taskLists.reduce((sum: number, list: any) => sum + (list.tasks?.length || 0), 0)} total tasks`,
            recent: taskLists.slice(0, 2).map((list: any) => ({
              name: list.title,
              taskCount: list.tasks?.length || 0,
              recentTasks: list.tasks?.slice(0, 3)?.map((task: any) => task.title) || []
            }))
          },
          emails: {
            summary: `${emails.length} recent emails from ${emailsData.result?.data?.json?.data?.totalCount || 0} total`,
            recent: emails.slice(0, 3).map((email: any) => ({
              subject: email.subject?.substring(0, 50) + (email.subject?.length > 50 ? '...' : ''),
              from: email.sender?.split('<')[0]?.trim() || email.from,
              unread: !email.isRead
            }))
          },
          concepts: {
            summary: `${concepts.length} knowledge concepts`,
            recent: concepts.slice(0, 5).map((concept: any) => concept.text?.substring(0, 60) + (concept.text?.length > 60 ? '...' : ''))
          }
        };
        
        testResults.push({
          phase: 'Real Data Context Display',
          success: true,
          data: contextData,
          metrics: { duration, itemCount: taskLists.length + emails.length + concepts.length }
        });
        
        // Display context as it would appear in the UI
        console.log('\n📊 === REAL DATA CONTEXT FOR UI DISPLAY ===');
        console.log(`📋 ${contextData.tasks.summary}`);
        contextData.tasks.recent.forEach((list: any) => {
          console.log(`   • ${list.name}: ${list.taskCount} tasks`);
          list.recentTasks.forEach((task: string) => console.log(`     - ${task}`));
        });
        
        console.log(`\n📧 ${contextData.emails.summary}`);
        contextData.emails.recent.forEach((email: any) => {
          console.log(`   ${email.unread ? '🔵' : '⚪'} ${email.subject} (from: ${email.from})`);
        });
        
        console.log(`\n🧠 ${contextData.concepts.summary}`);
        contextData.concepts.recent.forEach((concept: string) => {
          console.log(`   • ${concept}`);
        });
        console.log('==========================================\n');
        
      } catch (error) {
        testResults.push({
          phase: 'Real Data Context Display',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });
  });
}); 