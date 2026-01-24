import { test, describe, expect, beforeAll } from "bun:test";
import { API_BASE_URL, USER_ID, log, logEnvironmentInfo } from './constants.js';

// RDF endpoints
const RDF_BASE_URL = `${API_BASE_URL}/api/rdf`;

describe("RDF Real Data Integration Tests", () => {
  beforeAll(() => {
    logEnvironmentInfo();
    log('info', '🧪 Starting RDF Real Data Integration Tests');
  });

  test("RDF Process with Contact Communication", async () => {
    log('info', '👤 Testing RDF with contact communication message...');
    
    const testMessage = {
      raw_message: "Please send an email to John Smith about the meeting tomorrow at 3pm",
      user_id: USER_ID,
      channel: "chat",
      metadata: {
        source_identifier: "test-chat-123",
        is_incoming: true
      }
    };
    
    const response = await fetch(`${RDF_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });
    
    const data = await response.json();
    console.log('Contact Communication Response:', JSON.stringify(data, null, 2));

    expect(response.status).toBe(200);
    
    // Log what we actually got
    log('info', `   Response type: ${data.response_type || 'unknown'}`);
    log('info', `   Has concepts: ${data.concepts ? 'yes' : 'no'}`);
    log('info', `   Has analysis: ${data.analysis ? 'yes' : 'no'}`);
    log('info', `   Has contact_extraction: ${data.contact_extraction ? 'yes' : 'no'}`);
  });

  test("RDF Extract Concepts with Rich Text", async () => {
    log('info', '🧠 Testing concept extraction with rich text...');
    
    const richText = {
      text: `I'm planning a trip to Paris next month for a conference about artificial intelligence. 
             I need to book flights, arrange accommodation near the Eiffel Tower, and prepare my presentation 
             on machine learning applications in healthcare. Also need to email Sarah Johnson about the schedule.`
    };
    
    const response = await fetch(`${RDF_BASE_URL}/extract-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(richText)
    });
    
    const data = await response.json();
    console.log('Concept Extraction Response:', JSON.stringify(data, null, 2));
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    log('success', `✅ Concepts found: ${data.concepts?.length || 0}`);
    if (data.concepts && data.concepts.length > 0) {
      log('info', '   Extracted concepts:');
      data.concepts.forEach(concept => {
        log('info', `   - ${JSON.stringify(concept)}`);
      });
    }
  });

  test("RDF Analyze Message with Context", async () => {
    log('info', '🔍 Testing RDF analysis with context...');
    
    const analysisRequest = {
      raw_message: "Remind me to call Mike Davis tomorrow at 2pm about the project deadline",
      user_id: USER_ID,
      channel: "sms",
      metadata: {
        source_identifier: "+1234567890",
        is_incoming: true
      },
      context: {
        previous_messages: [
          "Mike mentioned the project needs to be done by Friday",
          "We discussed the budget constraints yesterday"
        ]
      }
    };
    
    const response = await fetch(`${RDF_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysisRequest)
    });
    
    const data = await response.json();
    console.log('Analysis Response:', JSON.stringify(data, null, 2));
    
    expect(response.status).toBe(200);
    
    log('info', `   Analysis success: ${data.success}`);
    log('info', `   Has metadata: ${data.metadata ? 'yes' : 'no'}`);
  });

  test("RDF Contact Extraction via Process Endpoint", async () => {
    log('info', '📧 Testing contact extraction through process endpoint...');
    
    // This mimics what rdf-contact-analyzer.ts sends
    const contactRequest = {
      text: "Tell Jennifer Anderson that I'll be late to the meeting",
      domain: 'contact_communication',
      task: 'message_analysis',
      extractors: ['contact_names', 'communication_intent', 'context_clues', 'formality_level', 'urgency_indicators']
    };
    
    const response = await fetch(`${RDF_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactRequest)
    });
    
    const data = await response.json();
    console.log('Contact Extraction Response:', JSON.stringify(data, null, 2));
    
    expect(response.status).toBe(200);
    
    // Check what the RDF service actually returns
    log('info', '   Response structure:');
    log('info', `   - contact_extraction: ${data.contact_extraction ? 'present' : 'missing'}`);
    log('info', `   - intent_analysis: ${data.intent_analysis ? 'present' : 'missing'}`);
    log('info', `   - context_analysis: ${data.context_analysis ? 'present' : 'missing'}`);
    
    if (data.contact_extraction?.primary_contact) {
      log('success', `   ✅ Primary contact: ${data.contact_extraction.primary_contact}`);
    }
    if (data.intent_analysis?.communication_action) {
      log('success', `   ✅ Intent: ${data.intent_analysis.communication_action}`);
    }
  });

  test("Direct Python RDF Service Health Check", async () => {
    log('info', '🐍 Testing direct Python RDF service...');
    
    // Try direct Python service if available
    const pythonUrl = 'http://localhost:5174';
    try {
      const response = await fetch(`${pythonUrl}/health`);
      const data = await response.json();
      
      log('success', '✅ Python RDF service is running');
      log('info', `   Status: ${data.status}`);
      log('info', `   Graph size: ${data.graph_size} triples`);
      log('info', `   Brain integration: ${data.brain_integration}`);
    } catch (error) {
      log('warning', '⚠️  Python RDF service not accessible directly');
      log('info', '   This is OK if running through the MCP proxy');
    }
  });

  test("RDF Process with Multiple Concepts", async () => {
    log('info', '🌟 Testing RDF with multiple concepts...');
    
    const multiConceptMessage = {
      raw_message: `Schedule a meeting with Alice Chen and Bob Wilson next Tuesday at the downtown office. 
                    We'll discuss the AI project, budget allocation, and timeline for Q2 deliverables.`,
      user_id: USER_ID,
      channel: "chat",
      metadata: {
        timestamp: new Date().toISOString(),
        priority: "high"
      }
    };
    
    const response = await fetch(`${RDF_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(multiConceptMessage)
    });
    
    const data = await response.json();
    console.log('Multi-concept Response:', JSON.stringify(data, null, 2));
    
    expect(response.status).toBe(200);
    
    // Analyze what concepts were extracted
    if (data.concepts && Array.isArray(data.concepts)) {
      log('success', `✅ Found ${data.concepts.length} concepts`);
      data.concepts.forEach((concept, idx) => {
        log('info', `   ${idx + 1}. ${concept.name || concept.value || JSON.stringify(concept)}`);
      });
    }
    
    // Check for entities
    if (data.entities) {
      log('info', '   Entities found:');
      Object.entries(data.entities).forEach(([type, entities]) => {
        log('info', `   - ${type}: ${JSON.stringify(entities)}`);
      });
    }
  });
});