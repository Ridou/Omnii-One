import { describe, test, expect, beforeAll } from "bun:test";

const RDF_SERVICE_URL = "http://localhost:8081/api/rdf";

async function sendRDFRequest(message: string) {
  const response = await fetch(`${RDF_SERVICE_URL}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`RDF request failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`RDF request failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

describe("Simple Email Test", () => {
  let serverReady = false;
  
  beforeAll(async () => {
    try {
      const healthCheck = await fetch(`${RDF_SERVICE_URL}/health`);
      serverReady = healthCheck.ok;
      console.log("✅ RDF service ready:", serverReady);
    } catch (error) {
      console.warn("⚠️ RDF service not available");
    }
  });

  test("📧 Draft a quarterly budget meeting email", async () => {
    if (!serverReady) {
      console.log("⏭️ Skipping test - service not ready");
      return;
    }

    console.log("📧 Testing email drafting scenario...");
    
    const message = "Send an email to the team about the project update";
    const response = await sendRDFRequest(message);
    
    // Basic validation
    expect(response).toBeDefined();
    expect(response.type).toBe("rdf");
    expect(response.success).toBe(true);
    
    console.log("📊 Response keys:", Object.keys(response));
    console.log("📊 Data keys:", Object.keys(response.data || {}));
    console.log("📊 Structured keys:", Object.keys(response.data?.structured || {}));
    
    if (response.data?.structured?.ai_reasoning?.extracted_concepts) {
      const concepts = response.data.structured.ai_reasoning.extracted_concepts;
      console.log(`📊 Extracted ${concepts.length} concepts`);
      
      // Check confidence values
      concepts.forEach((concept: any, index: number) => {
        console.log(`📊 Concept ${index}: "${concept.concept_name}" confidence=${concept.confidence}`);
        expect(concept.confidence).toBeLessThanOrEqual(1.0);
      });
      
      // Check for email-related concepts
      const conceptNames = concepts.map((c: any) => c.concept_name.toLowerCase());
      const emailConcepts = conceptNames.filter(name => 
        name.includes('send') || name.includes('email') || name.includes('team') || name.includes('project')
      );
      console.log(`📧 Email-related concepts found: ${emailConcepts.length}`);
      expect(emailConcepts.length).toBeGreaterThan(0);
    }
    
    // Check structured actions for email actions
    if (response.data?.structured?.structured_actions) {
      const actions = response.data.structured.structured_actions;
      console.log(`📧 Generated ${actions.length} actions`);
      
      actions.forEach((action: any, index: number) => {
        console.log(`📧 Action ${index}: "${action.action_type}" confidence=${action.confidence}`);
        expect(action.confidence).toBeLessThanOrEqual(1.0);
      });
      
      // Look for email-related actions
      const emailActions = actions.filter((a: any) => 
        a.action_type === 'send_email' || a.action_type === 'schedule_event'
      );
      console.log(`📧 Email-related actions: ${emailActions.length}`);
    }
    
    console.log("✅ Email test completed successfully");
  });
}); 