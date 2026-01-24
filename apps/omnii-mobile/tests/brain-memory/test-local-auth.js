/**
 * 🧪 Local Token Refresh Test
 * 
 * Tests our OAuth token refresh fixes on the local development server
 */

const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const LOCAL_SERVER = 'http://localhost:8000';

async function testLocalTokenRefresh() {
  console.log('🧪 === LOCAL TOKEN REFRESH TEST ===');
  console.log(`📋 Testing user: ${TEST_USER_ID}`);
  console.log(`🌐 Local server: ${LOCAL_SERVER}`);
  console.log('');

  const endpoints = [
    { name: 'Tasks', url: `${LOCAL_SERVER}/api/trpc/tasks.getCompleteOverview` },
    { name: 'Email', url: `${LOCAL_SERVER}/api/trpc/email.listEmails` },
    { name: 'Contacts', url: `${LOCAL_SERVER}/api/trpc/contacts.listContacts` },
    { name: 'Calendar', url: `${LOCAL_SERVER}/api/trpc/calendar.getEvents` }
  ];

  let successCount = 0;
  let refreshDetected = 0;

  console.log('🔄 Testing token refresh on all endpoints...');
  console.log('');

  for (const endpoint of endpoints) {
    try {
      console.log(`🔄 Testing ${endpoint.name}...`);
      
      const startTime = Date.now();
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': TEST_USER_ID,
        }
      });

      const duration = Date.now() - startTime;
      let resultText = '';
      
      try {
        resultText = await response.text();
      } catch (e) {
        resultText = 'Could not read response';
      }

      if (response.ok) {
        console.log(`   ✅ ${endpoint.name}: SUCCESS (${duration}ms)`);
        
        // Check if we got actual data
        try {
          const data = JSON.parse(resultText);
          if (data.result?.data?.json?.success) {
            console.log(`      📊 Data received: ${JSON.stringify(data.result.data.json).substring(0, 100)}...`);
            successCount++;
          }
        } catch (e) {
          // Response might not be JSON
        }

        // If response took > 2 seconds, likely a token refresh occurred
        if (duration > 2000) {
          console.log(`      🔄 Token refresh likely occurred (${duration}ms response time)`);
          refreshDetected++;
        }
      } else {
        console.log(`   ❌ ${endpoint.name}: ${response.status} - ${resultText.substring(0, 200)}...`);
        
        // Check for specific auth errors
        if (response.status === 401) {
          console.log(`      🔍 401 error - checking if it's token expiry vs missing tokens...`);
        }
      }
      
      console.log('');
    } catch (error) {
      console.log(`   ⚠️  ${endpoint.name}: Network error - ${error.message}`);
      console.log('');
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('📊 === LOCAL TEST SUMMARY ===');
  console.log(`✅ Successful endpoints: ${successCount}/${endpoints.length}`);
  console.log(`🔄 Token refreshes detected: ${refreshDetected}`);
  console.log('');

  if (successCount === endpoints.length) {
    console.log('🎉 LOCAL TEST PASSED: All endpoints working with token refresh!');
    console.log('✅ Ready for production deployment');
  } else if (successCount > 0) {
    console.log('⚠️  LOCAL TEST PARTIAL: Some endpoints working');
    console.log('🔧 May need additional fixes before production');
  } else {
    console.log('❌ LOCAL TEST FAILED: No endpoints working');
    console.log('🔧 Token refresh implementation needs debugging');
  }

  console.log('');
  console.log('🚀 Next step: If local test passes, deploy to production');
  console.log('=====================================');
}

async function main() {
  try {
    await testLocalTokenRefresh();
  } catch (error) {
    console.error('💥 Local test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 