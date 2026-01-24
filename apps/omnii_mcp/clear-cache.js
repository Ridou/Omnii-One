/**
 * Clear Cache Script
 * Clears Redis cache and optionally restarts services
 */

const axios = require('axios');
const redis = require('redis');

const port = 8000; // MCP server port
const redisUrl = process.env.REDIS_URL || 'redis://default:udnAmLnQiUKdYkNFYIlrOpJmKzTtYlpm@redis-production-7aec.up.railway.app:6379';

async function clearCache() {
  console.log('🧹 Starting cache clearing process...');
  
  try {
    // Connect to Redis
    console.log('📡 Connecting to Redis...');
    const client = redis.createClient({ url: redisUrl });
    await client.connect();
    
    // Clear all cache
    console.log('🗑️  Clearing Redis cache...');
    await client.flushAll();
    console.log('✅ Redis cache cleared successfully');
    
    // Close Redis connection
    await client.quit();
    
    // Test server health
    console.log('🏥 Testing server health...');
    try {
      const response = await axios.get(`http://localhost:${port}/health`, { timeout: 5000 });
      if (response.data.status === 'ok') {
        console.log('✅ Server is healthy');
      } else {
        console.log('⚠️  Server responded but status is not ok');
      }
    } catch (healthError) {
      console.log('❌ Server health check failed');
      console.log('💡 Make sure the server is running on port 8000');
    }
    
    console.log('🎉 Cache clearing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  clearCache();
}

module.exports = { clearCache }; 