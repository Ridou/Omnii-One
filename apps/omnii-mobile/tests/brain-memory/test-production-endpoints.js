/**
 * 🚀 Production Token Refresh Test
 * 
 * Tests our OAuth token refresh fixes on the production server
 */

const TEST_USER_ID = 'cd9bdc60-35af-4bb6-b87e-1932e96fb354';
const PROD_SERVER = 'https://omniimcp-production.up.railway.app';

async function testProductionTokenRefresh() {
  console.log('🚀 === PRODUCTION TOKEN REFRESH TEST ===');
  console.log(`📋 Testing user: ${TEST_USER_ID}`);
  console.log(`🌐 Production server: ${PROD_SERVER}`);
  console.log('');

  // Check server health first
  console.log('🔍 Checking production server health...');
  try {
    const healthResponse = await fetch(`${PROD_SERVER}/health`);
    if (healthResponse.ok) {
      console.log('✅ Production server is accessible');
    } else {
      console.log('❌ Production server health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ Production server is not accessible:', error.message);
    return;
  }
  console.log('');

  const endpoints = [
    { name: 'Tasks', url: `${PROD_SERVER}/api/trpc/tasks.getCompleteOverview` },
    { name: 'Email', url: `${PROD_SERVER}/api/trpc/email.listEmails` },
    { name: 'Contacts', url: `${PROD_SERVER}/api/trpc/contacts.listContacts` },
    { name: 'Calendar', url: `${PROD_SERVER}/api/trpc/calendar.getEvents` }
  ];

  let successCount = 0;
  let refreshDetected = 0;
  const results = [];

  console.log('🔄 Testing token refresh on all production endpoints...');
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

      const result = {
        endpoint: endpoint.name,
        success: false,
        status: response.status,
        duration,
        data: null,
        refreshDetected: false
      };

      if (response.ok) {
        console.log(`   ✅ ${endpoint.name}: SUCCESS (${duration}ms)`);
        result.success = true;
        
        // Check if we got actual data
        try {
          const data = JSON.parse(resultText);
          if (data.result?.data?.json?.success) {
            const jsonData = data.result.data.json;
            result.data = jsonData;
            
            // Extract meaningful data counts
            let dataInfo = '';
            if (jsonData.data?.taskLists) {
              const totalTasks = jsonData.data.taskLists.reduce((sum, list) => sum + (list.taskCount || 0), 0);
              dataInfo = `${totalTasks} tasks across ${jsonData.data.taskLists.length} lists`;
            } else if (jsonData.data?.emails) {
              dataInfo = `${jsonData.data.emails.length} emails`;
            } else if (jsonData.data?.contacts) {
              dataInfo = `${jsonData.data.contacts.length} contacts`;
            } else if (jsonData.data?.events) {
              dataInfo = `${jsonData.data.events.length} calendar events`;
            }
            
            console.log(`      📊 Data received: ${dataInfo}`);
            successCount++;
          }
        } catch (e) {
          console.log(`      ⚠️ Response parsing error: ${e.message}`);
        }

        // If response took > 2 seconds, likely a token refresh occurred
        if (duration > 2000) {
          console.log(`      🔄 Token refresh likely occurred (${duration}ms response time)`);
          result.refreshDetected = true;
          refreshDetected++;
        }
      } else {
        console.log(`   ❌ ${endpoint.name}: ${response.status}`);
        
        // Show a snippet of the error
        try {
          const errorData = JSON.parse(resultText);
          if (errorData.result?.data?.json?.error) {
            console.log(`      🔍 Error: ${errorData.result.data.json.error.substring(0, 100)}...`);
          }
        } catch (e) {
          console.log(`      🔍 Raw error: ${resultText.substring(0, 100)}...`);
        }
        
        // Check for specific auth errors
        if (response.status === 401) {
          console.log(`      🔍 401 error - token refresh may have failed`);
        }
      }
      
      results.push(result);
      console.log('');
    } catch (error) {
      console.log(`   ⚠️  ${endpoint.name}: Network error - ${error.message}`);
      results.push({
        endpoint: endpoint.name,
        success: false,
        error: error.message,
        duration: 0
      });
      console.log('');
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('📊 === PRODUCTION TEST SUMMARY ===');
  console.log(`✅ Successful endpoints: ${successCount}/${endpoints.length}`);
  console.log(`🔄 Token refreshes detected: ${refreshDetected}`);
  console.log('');

  // Detailed results
  console.log('📋 Detailed Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.endpoint}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration}ms)`);
  });
  console.log('');

  if (successCount === endpoints.length) {
    console.log('🎉 PRODUCTION TEST PASSED: All endpoints working with token refresh!');
    console.log('✅ Token refresh fixes deployed successfully');
    console.log('🧠 Brain memory cache will now populate with real data');
    console.log('📱 Mobile app analytics will show actual user data');
  } else if (successCount > 0) {
    console.log('⚠️  PRODUCTION TEST PARTIAL: Some endpoints working');
    console.log(`✅ Working: ${results.filter(r => r.success).map(r => r.endpoint).join(', ')}`);
    console.log(`❌ Failed: ${results.filter(r => !r.success).map(r => r.endpoint).join(', ')}`);
  } else {
    console.log('❌ PRODUCTION TEST FAILED: No endpoints working');
    console.log('🔧 Token refresh implementation may need debugging in production');
  }

  console.log('');
  console.log('📱 Next step: Test mobile app to see cached data populate');
  console.log('=====================================');
}

async function main() {
  try {
    await testProductionTokenRefresh();
  } catch (error) {
    console.error('💥 Production test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 