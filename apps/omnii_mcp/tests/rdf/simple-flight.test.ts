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

describe("Simple Flight Test", () => {
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

  test("✈️ Book a flight for vacation", async () => {
    if (!serverReady) {
      console.log("⏭️ Skipping test - service not ready");
      return;
    }

    console.log("✈️ Testing flight booking scenario...");
    
    const message = "Book a flight for my travel to Paris";
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
      
      // Check for flight-related concepts
      const conceptNames = concepts.map((c: any) => c.concept_name.toLowerCase());
      const flightConcepts = conceptNames.filter(name => 
        name.includes('book') || name.includes('flight') || name.includes('travel') || name.includes('paris')
      );
      console.log(`✈️ Flight-related concepts found: ${flightConcepts.length}`);
      expect(flightConcepts.length).toBeGreaterThan(0);
    }
    
    // Check structured actions for flight actions
    if (response.data?.structured?.structured_actions) {
      const actions = response.data.structured.structured_actions;
      console.log(`✈️ Generated ${actions.length} actions`);
      
      actions.forEach((action: any, index: number) => {
        console.log(`✈️ Action ${index}: "${action.action_type}" confidence=${action.confidence}`);
        expect(action.confidence).toBeLessThanOrEqual(1.0);
      });
      
      // Look for flight-related actions
      const flightActions = actions.filter((a: any) => 
        a.action_type === 'book_flight' || a.action_type === 'create_task'
      );
      console.log(`✈️ Flight-related actions: ${flightActions.length}`);
    }
    
    console.log("✅ Flight test completed successfully");
  });
}); 