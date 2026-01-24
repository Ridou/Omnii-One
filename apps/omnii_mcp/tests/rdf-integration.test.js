import { test, describe, expect, beforeAll } from "bun:test";
import { API_BASE_URL, USER_ID, log, logEnvironmentInfo } from './constants.js';

// RDF endpoints
const RDF_BASE_URL = `${API_BASE_URL}/api/rdf`;

describe("RDF Integration Tests", () => {
  beforeAll(() => {
    logEnvironmentInfo();
    log('info', '🧪 Starting RDF Integration Tests');
  });

  test("RDF Health Check", async () => {
    log('info', '🏥 Testing RDF Health Check...');
    
    const response = await fetch(`${RDF_BASE_URL}/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.pythonService).toBeDefined();
    expect(data.pythonService.status).toBeDefined();
    
    log('success', `✅ Health check: ${data.pythonService.status}`);
    if (data.service_info?.name) {
      log('info', `   Service: ${data.service_info.name}`);
    }
  });

  test("RDF Status Check", async () => {
    log('info', '📊 Testing RDF Status...');
    
    const response = await fetch(`${RDF_BASE_URL}/status`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBeDefined();
    expect(data.integration).toBe('python_service_client');
    
    log('success', `✅ Status: ${data.status}`);
    log('info', `   Integration: ${data.integration}`);
  });

  test("RDF Concept Extraction", async () => {
    log('info', '🔍 Testing Concept Extraction...');
    
    const response = await fetch(`${RDF_BASE_URL}/extract-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: "I need to book a flight to Italy next month for my vacation"
      })
    });
    
    const data = await response.json();

    console.log('RDF Concept Extraction Response:', data);
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.concepts).toBeDefined();
    expect(Array.isArray(data.concepts)).toBe(true);
    
    log('success', `✅ Concepts extracted: ${data.concepts?.length || 0}`);
    log('info', `   Intent: ${data.intent}`);
    log('info', `   Sentiment: ${data.sentiment?.polarity || 'N/A'}`);
  });

  test("RDF Analysis", async () => {
    log('info', '🔍 Testing RDF Analysis...');
    
    const response = await fetch(`${RDF_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_message: "Remind me to schedule a meeting with the team tomorrow",
        user_id: USER_ID,
        channel: "chat"
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.analysis).toBeDefined();
    
    log('success', `✅ Analysis completed: ${data.success}`);
    if (data.analysis?.concepts) {
      log('info', `   Concepts found: ${data.analysis.concepts.length || 0}`);
    }
  });

  test("RDF Full Processing Pipeline", async () => {
    log('info', '🚀 Testing Full RDF Processing Pipeline...');
    
    const response = await fetch(`${RDF_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_message: "I'm excited about my trip to Paris next week! Can you help me find a good restaurant?",
        user_id: USER_ID,
        channel: "sms",
        metadata: {
          source_identifier: "+1234567890",
          is_incoming: true
        }
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    
    log('success', `✅ Full pipeline completed: ${data.success || 'processed'}`);
    if (data.service_type) {
      log('info', `   Service type: ${data.service_type}`);
    }
    if (data.data?.structured_actions) {
      log('info', `   Actions generated: ${data.data.structured_actions.length || 0}`);
    }
  });

  test("RDF String Input Processing", async () => {
    log('info', '📝 Testing Simple String Input...');
    
    const response = await fetch(`${RDF_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_message: "Book me a flight to Tokyo please",
        user_id: USER_ID,
        channel: "chat"
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    
    log('success', `✅ String input processed: ${data.success || 'processed'}`);
    if (data.message) {
      log('info', `   Message: ${data.message}`);
    }
  });

  test("RDF Test Endpoint", async () => {
    log('info', '🧪 Testing RDF Test Endpoint...');
    
    const response = await fetch(`${RDF_BASE_URL}/test`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.endpoints).toBeDefined();
    expect(Array.isArray(data.endpoints)).toBe(true);
    expect(data.endpoints.length).toBeGreaterThan(0);
    
    log('success', '✅ Test endpoint accessible');
    log('info', `   Available endpoints: ${data.endpoints?.length || 0}`);
    log('info', `   Service: ${data.service || 'N/A'}`);
  });
});