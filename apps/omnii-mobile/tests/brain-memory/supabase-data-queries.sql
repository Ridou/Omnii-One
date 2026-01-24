-- 🔍 Supabase Data Investigation Queries
-- Run these in Supabase SQL Editor to diagnose the data flow issue

-- 1. Check if our test user exists and has Google OAuth tokens
SELECT 
  user_id,
  provider,
  access_token IS NOT NULL as has_access_token,
  refresh_token IS NOT NULL as has_refresh_token,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 'No expiry set'
    WHEN expires_at::timestamp > NOW() THEN 'Valid (not expired)'
    ELSE 'Expired'
  END as token_status,
  scope,
  token_type,
  created_at,
  updated_at
FROM oauth_tokens 
WHERE user_id = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'::uuid 
  AND provider = 'google';

-- 2. Check brain_memory_cache for our test user
SELECT 
  memory_period,
  data_type,
  user_id,
  cache_data IS NOT NULL as has_cache_data,
  concepts_data IS NOT NULL as has_concepts_data,
  CASE 
    WHEN cache_data IS NOT NULL THEN length(cache_data::text)
    WHEN concepts_data IS NOT NULL THEN length(concepts_data::text)
    ELSE 0 
  END as data_size_bytes,
  total_concepts,
  cache_version,
  last_synced_at,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 'No expiry set'
    WHEN expires_at::timestamp > NOW() THEN 'Valid (not expired)'
    ELSE 'Expired'
  END as cache_status,
  created_at,
  updated_at
FROM brain_memory_cache 
WHERE user_id = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'::uuid
ORDER BY updated_at DESC;

-- 3. Check if there are any other users in oauth_tokens (to see if table structure is correct)
SELECT 
  COUNT(*) as total_oauth_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT provider) as unique_providers,
  array_agg(DISTINCT provider) as providers
FROM oauth_tokens;

-- 4. Check if there are any brain memory cache entries for any users
SELECT 
  COUNT(*) as total_cache_records,
  COUNT(DISTINCT user_id) as unique_cached_users,
  COUNT(DISTINCT data_type) as unique_data_types,
  array_agg(DISTINCT data_type) as data_types,
  array_agg(DISTINCT memory_period) as memory_periods
FROM brain_memory_cache;

-- 5. Check the actual token details (for debugging expiry issues)
SELECT 
  user_id,
  provider,
  substr(access_token, 1, 20) || '...' as access_token_preview,
  refresh_token IS NOT NULL as has_refresh_token,
  expires_at,
  expires_at::timestamp as expires_timestamp,
  NOW() as current_time,
  CASE 
    WHEN expires_at IS NULL THEN 0
    ELSE EXTRACT(EPOCH FROM (expires_at::timestamp - NOW())) / 60
  END as minutes_until_expiry,
  scope,
  token_type,
  created_at,
  updated_at
FROM oauth_tokens 
WHERE user_id = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'::uuid 
  AND provider = 'google';

-- 6. Check auth.users table to see if our test user exists in authentication
SELECT 
  id,
  email,
  provider,
  created_at,
  updated_at,
  email_confirmed_at,
  app_metadata,
  user_metadata
FROM auth.users 
WHERE id = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'::uuid;

-- 7. Look for any recent brain_memory_cache updates to see if data is being stored
SELECT 
  memory_period,
  data_type,
  user_id,
  CASE 
    WHEN cache_data IS NOT NULL THEN substr(cache_data::text, 1, 100) || '...'
    WHEN concepts_data IS NOT NULL THEN substr(concepts_data::text, 1, 100) || '...'
    ELSE 'No data'
  END as data_preview,
  total_concepts,
  last_synced_at,
  expires_at,
  created_at,
  updated_at
FROM brain_memory_cache 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 10;

-- 8. Check if mobile app is making any recent cache attempts
-- Look for SPECIFIC Google data types that mobile app should cache
SELECT 
  data_type,
  memory_period,
  COUNT(*) as cache_entries,
  MAX(updated_at) as latest_update,
  SUM(CASE WHEN cache_data IS NOT NULL THEN 1 ELSE 0 END) as entries_with_data
FROM brain_memory_cache 
WHERE user_id = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'::uuid
  AND data_type IN ('google_tasks', 'google_calendar', 'google_contacts', 'google_emails')
GROUP BY data_type, memory_period
ORDER BY latest_update DESC;

-- ====================
-- EXPECTED RESULTS:
-- ====================
-- Query 1: Should show 1 record with valid Google tokens
-- Query 2: Should show cache entries for tasks, emails, contacts, calendar
-- Query 5: Should show token expires in the future (positive minutes)
-- Query 6: Should show the user exists in auth.users
-- Query 7: Should show recent cache updates if mobile app is calling APIs 