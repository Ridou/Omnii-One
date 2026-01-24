#!/usr/bin/env bun

/**
 * 🔍 Check Supabase Cache Directly
 * 
 * This script directly queries the Supabase brain_memory_cache table
 * to see what data is actually stored there.
 */

import { createClient } from '@supabase/supabase-js';

async function checkSupabaseCache() {
  console.log('🔍 Checking Supabase brain_memory_cache table directly\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const testUserId = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';

  try {
    console.log('📊 === SUPABASE BRAIN_MEMORY_CACHE TABLE ===\n');

    // Get all cache entries for our test user
    const { data: allEntries, error } = await supabase
      .from('brain_memory_cache')
      .select('*')
      .eq('user_id', testUserId)
      .order('last_synced_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying Supabase:', error);
      return;
    }

    console.log(`✅ Found ${allEntries?.length || 0} cache entries:\n`);

    for (const entry of allEntries || []) {
      console.log(`🔍 === ${entry.data_type.toUpperCase()} ===`);
      console.log(`   - Memory Period: ${entry.memory_period}`);
      console.log(`   - Last Synced: ${entry.last_synced_at}`);
      console.log(`   - Expires At: ${entry.expires_at}`);
      console.log(`   - Cache Version: ${entry.cache_version}`);
      
      // Check if expired
      const expiresAt = new Date(entry.expires_at);
      const isExpired = expiresAt < new Date();
      console.log(`   - Is Expired: ${isExpired ? '❌ YES' : '✅ NO'}`);

      // Analyze cache_data structure
      const cacheData = entry.cache_data;
      if (cacheData) {
        console.log(`   - Cache Data Type: ${typeof cacheData}`);
        
        switch (entry.data_type) {
          case 'google_emails':
            console.log(`   - Has emails array: ${!!cacheData.emails}`);
            console.log(`   - Emails count: ${cacheData.emails?.length || 0}`);
            console.log(`   - Total count: ${cacheData.totalCount || 'undefined'}`);
            console.log(`   - Unread count: ${cacheData.unreadCount || 'undefined'}`);
            
            if (cacheData.emails?.length > 0) {
              console.log(`   - Sample emails:`);
              cacheData.emails.slice(0, 3).forEach((email: any, i: number) => {
                console.log(`     ${i + 1}. "${email.subject || 'No Subject'}" from ${email.from || email.sender || 'Unknown'}`);
              });
            } else {
              console.log(`   - ⚠️ NO REAL EMAIL DATA FOUND`);
            }
            break;

          case 'neo4j_concepts':
            console.log(`   - Has concepts array: ${!!cacheData.concepts}`);
            console.log(`   - Concepts count: ${cacheData.concepts?.length || 0}`);
            console.log(`   - Total concepts: ${cacheData.totalConcepts || 'undefined'}`);
            
            if (cacheData.concepts?.length > 0) {
              console.log(`   - Sample concepts:`);
              cacheData.concepts.slice(0, 3).forEach((concept: any, i: number) => {
                console.log(`     ${i + 1}. "${concept.name || concept.title || 'Unnamed'}"`);
              });
            }
            break;

          case 'google_tasks':
            console.log(`   - Has taskLists array: ${!!cacheData.taskLists}`);
            console.log(`   - Task lists count: ${cacheData.taskLists?.length || 0}`);
            console.log(`   - Total tasks: ${cacheData.totalTasks || 'undefined'}`);
            break;

          case 'google_contacts':
            console.log(`   - Has contacts array: ${!!cacheData.contacts}`);
            console.log(`   - Contacts count: ${cacheData.contacts?.length || 0}`);
            console.log(`   - Total count: ${cacheData.totalCount || 'undefined'}`);
            break;

          case 'google_calendar':
            console.log(`   - Has events array: ${!!cacheData.events}`);
            console.log(`   - Events count: ${cacheData.events?.length || 0}`);
            console.log(`   - Total count: ${cacheData.totalCount || 'undefined'}`);
            break;
        }
      } else {
        console.log(`   - ❌ NO CACHE DATA FOUND`);
      }
      console.log('');
    }

    // Check specifically for gmail data
    console.log('📧 === GMAIL DATA ANALYSIS ===\n');
    const emailEntry = allEntries?.find(entry => entry.data_type === 'google_emails');
    
    if (emailEntry) {
      console.log('✅ Gmail cache entry exists');
      const emailData = emailEntry.cache_data;
      
      if (emailData?.emails?.length > 0) {
        console.log(`🎯 Found ${emailData.emails.length} real Gmail emails!`);
        console.log('📋 Recent emails:');
        
        emailData.emails.slice(0, 5).forEach((email: any, i: number) => {
          console.log(`   ${i + 1}. Subject: "${email.subject || 'No Subject'}"`);
          console.log(`      From: ${email.from || email.sender || 'Unknown'}`);
          console.log(`      Date: ${email.date || email.messageTimestamp || 'Unknown'}`);
          console.log(`      Read: ${email.isRead ? 'Yes' : 'No'}`);
          console.log('');
        });
      } else {
        console.log('❌ Gmail cache exists but contains NO EMAIL DATA');
        console.log('🔧 This means the Gmail API call failed or returned empty results');
      }
    } else {
      console.log('❌ No Gmail cache entry found');
      console.log('🔧 This means no Gmail data has been cached yet');
    }

    console.log('\n🎯 === RECOMMENDATIONS ===');
    console.log('1. If emails array is empty → Gmail API authentication issue');
    console.log('2. If no gmail entry → Need to trigger Gmail API call');
    console.log('3. If expired → Need to refresh cache');
    console.log('4. Check Gmail OAuth tokens and permissions');

  } catch (error) {
    console.error('❌ Failed to check Supabase cache:', error);
  }
}

// Run check if this file is executed directly
if (import.meta.main) {
  void checkSupabaseCache();
}

export { checkSupabaseCache }; 