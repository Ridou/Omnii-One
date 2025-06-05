/**
 * Composio Google Tasks Service Tests
 * 
 * Test the Google Tasks integration via Composio SDK
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/composio/tasks';
const TEST_ENTITY_ID = 'test-user@example.com';

// Helper to print test results
function printResult(testName, success, data = null, error = null) {
  console.log('\n' + '='.repeat(50));
  console.log(`Test: ${testName}`);
  console.log(`Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
  if (data) {
    console.log('Response:', JSON.stringify(data, null, 2));
  }
  if (error) {
    console.log('Error:', error.response?.data || error.message);
  }
  console.log('='.repeat(50));
}

// Test functions
async function testConnectionStatus() {
  try {
    const response = await axios.get(`${BASE_URL}/status/${TEST_ENTITY_ID}`);
    printResult('Connection Status', true, response.data);
    return response.data;
  } catch (error) {
    printResult('Connection Status', false, null, error);
    throw error;
  }
}

async function testInitiateConnection() {
  try {
    const response = await axios.post(`${BASE_URL}/connect/${TEST_ENTITY_ID}`, {
      redirectUrl: 'http://localhost:3000/callback/success'
    });
    printResult('Initiate Connection', true, response.data);
    return response.data;
  } catch (error) {
    printResult('Initiate Connection', false, null, error);
    throw error;
  }
}

async function testListTaskLists() {
  try {
    const response = await axios.get(`${BASE_URL}/${TEST_ENTITY_ID}/tasklists`);
    printResult('List Task Lists', true, response.data);
    return response.data;
  } catch (error) {
    printResult('List Task Lists', false, null, error);
    throw error;
  }
}

async function testCreateTaskList() {
  try {
    const response = await axios.post(`${BASE_URL}/${TEST_ENTITY_ID}/tasklists`, {
      title: 'Test Task List ' + new Date().toISOString()
    });
    printResult('Create Task List', true, response.data);
    return response.data;
  } catch (error) {
    printResult('Create Task List', false, null, error);
    throw error;
  }
}

async function testListTasks(taskListId = '@default') {
  try {
    const response = await axios.get(
      `${BASE_URL}/${TEST_ENTITY_ID}/tasklists/${taskListId}/tasks`
    );
    printResult('List Tasks', true, response.data);
    return response.data;
  } catch (error) {
    printResult('List Tasks', false, null, error);
    throw error;
  }
}

async function testCreateTask(taskListId = '@default') {
  try {
    const response = await axios.post(
      `${BASE_URL}/${TEST_ENTITY_ID}/tasklists/${taskListId}/tasks`,
      {
        title: 'Test Task ' + new Date().toISOString(),
        notes: 'This is a test task created via API',
        due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      }
    );
    printResult('Create Task', true, response.data);
    return response.data;
  } catch (error) {
    printResult('Create Task', false, null, error);
    throw error;
  }
}

async function testUpdateTask(taskListId, taskId) {
  try {
    const response = await axios.put(
      `${BASE_URL}/${TEST_ENTITY_ID}/tasklists/${taskListId}/tasks/${taskId}`,
      {
        title: 'Updated Task ' + new Date().toISOString(),
        status: 'completed',
        completed: new Date().toISOString()
      }
    );
    printResult('Update Task', true, response.data);
    return response.data;
  } catch (error) {
    printResult('Update Task', false, null, error);
    throw error;
  }
}

async function testDeleteTask(taskListId, taskId) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/${TEST_ENTITY_ID}/tasklists/${taskListId}/tasks/${taskId}`
    );
    printResult('Delete Task', true, response.data);
    return response.data;
  } catch (error) {
    printResult('Delete Task', false, null, error);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n🧪 Starting Composio Google Tasks Tests...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Entity: ${TEST_ENTITY_ID}`);
  
  let createdTaskListId = null;
  let createdTaskId = null;
  
  try {
    // Test 1: Check connection status
    console.log('\n📌 Test 1: Connection Status');
    const statusResult = await testConnectionStatus();
    
    // If no connection, initiate one
    if (!statusResult.data?.hasConnection) {
      console.log('\n📌 Initiating Connection...');
      const connectionResult = await testInitiateConnection();
      console.log('\n⚠️  Please complete OAuth flow at:', connectionResult.data?.redirectUrl);
      console.log('Waiting for connection to be established...');
      // In a real test, you would wait for the connection to be active
    }
    
    // Test 2: List task lists
    console.log('\n📌 Test 2: List Task Lists');
    try {
      await testListTaskLists();
    } catch (error) {
      console.log('Note: This may fail if connection is not active');
    }
    
    // Test 3: Create task list
    console.log('\n📌 Test 3: Create Task List');
    try {
      const createListResult = await testCreateTaskList();
      createdTaskListId = createListResult.data?.id;
    } catch (error) {
      console.log('Note: This may fail if connection is not active');
    }
    
    // Test 4: List tasks (default list)
    console.log('\n📌 Test 4: List Tasks');
    try {
      await testListTasks();
    } catch (error) {
      console.log('Note: This may fail if connection is not active');
    }
    
    // Test 5: Create task
    console.log('\n📌 Test 5: Create Task');
    try {
      const createTaskResult = await testCreateTask();
      createdTaskId = createTaskResult.data?.id;
    } catch (error) {
      console.log('Note: This may fail if connection is not active');
    }
    
    // Test 6: Update task (if created)
    if (createdTaskId) {
      console.log('\n📌 Test 6: Update Task');
      try {
        await testUpdateTask('@default', createdTaskId);
      } catch (error) {
        console.log('Note: Task update failed');
      }
    }
    
    // Test 7: Delete task (if created)
    if (createdTaskId) {
      console.log('\n📌 Test 7: Delete Task');
      try {
        await testDeleteTask('@default', createdTaskId);
      } catch (error) {
        console.log('Note: Task deletion failed');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
  
  console.log('\n✅ Test suite completed!\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testConnectionStatus,
  testInitiateConnection,
  testListTaskLists,
  testCreateTaskList,
  testListTasks,
  testCreateTask,
  testUpdateTask,
  testDeleteTask,
  runAllTests
};