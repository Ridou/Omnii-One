-- 🔍 Debug Table Structure
-- Run these first to see what columns actually exist

-- 1. Check oauth_tokens table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'oauth_tokens'
ORDER BY ordinal_position;

-- 2. Check brain_memory_cache table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'brain_memory_cache'
ORDER BY ordinal_position;

-- 3. Simple check for our test user in oauth_tokens (without assuming column names)
SELECT *
FROM oauth_tokens 
WHERE user_id = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'::uuid
LIMIT 1;

-- 4. Simple check for any brain_memory_cache entries for our user
SELECT *
FROM brain_memory_cache 
WHERE user_id = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354'::uuid
LIMIT 5; 