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

describe("Simple Note Test", () => {
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

  test("📝 Write a note about the meeting", async () => {
    if (!serverReady) {
      console.log("⏭️ Skipping test - service not ready");
      return;
    }

    console.log("📝 Testing note creation scenario...");
    
    const message = "Write a note about project requirements";
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
      
      // Check for note-related concepts
      const conceptNames = concepts.map((c: any) => c.concept_name.toLowerCase());
      const noteConcepts = conceptNames.filter(name => 
        name.includes('write') || name.includes('note') || name.includes('project') || name.includes('requirements')
      );
      console.log(`📝 Note-related concepts found: ${noteConcepts.length}`);
      expect(noteConcepts.length).toBeGreaterThan(0);
    }
    
    // Check structured actions for note actions
    if (response.data?.structured?.structured_actions) {
      const actions = response.data.structured.structured_actions;
      console.log(`📝 Generated ${actions.length} actions`);
      
      actions.forEach((action: any, index: number) => {
        console.log(`📝 Action ${index}: "${action.action_type}" confidence=${action.confidence}`);
        expect(action.confidence).toBeLessThanOrEqual(1.0);
      });
      
      // Look for note-related actions
      const noteActions = actions.filter((a: any) => 
        a.action_type === 'create_note' || a.action_type === 'create_task'
      );
      console.log(`📝 Note-related actions: ${noteActions.length}`);
    }
    
    console.log("✅ Note test completed successfully");
  });
}); 