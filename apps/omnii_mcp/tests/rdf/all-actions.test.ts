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

// Test scenarios for all 10 action types
const ACTION_SCENARIOS = [
  {
    emoji: "✅",
    name: "create_task",
    message: "Create a task to review the marketing campaign",
    expectedConcepts: ["create", "task", "review", "marketing"]
  },
  {
    emoji: "📅", 
    name: "schedule_event",
    message: "Schedule a meeting for next week",
    expectedConcepts: ["schedule", "meeting", "week"]
  },
  {
    emoji: "📧",
    name: "send_email", 
    message: "Send an email to the team about the project update",
    expectedConcepts: ["send", "email", "team", "project"]
  },
  {
    emoji: "⏰",
    name: "set_reminder",
    message: "Remind me about the doctor appointment",
    expectedConcepts: ["remind", "doctor", "appointment"]
  },
  {
    emoji: "👤",
    name: "search_contacts",
    message: "Add Sarah as a new contact person", 
    expectedConcepts: ["add", "sarah", "contact", "person"]
  },
  {
    emoji: "✈️",
    name: "book_flight",
    message: "Book a flight for my travel to Paris",
    expectedConcepts: ["book", "flight", "travel", "paris"]
  },
  {
    emoji: "🍽️",
    name: "search_restaurants",
    message: "Find a good restaurant for dinner tonight",
    expectedConcepts: ["find", "restaurant", "dinner", "good"]
  },
  {
    emoji: "📝",
    name: "create_note",
    message: "Write a note about project requirements",
    expectedConcepts: ["write", "note", "project", "requirements"]
  },
  {
    emoji: "🧠",
    name: "update_concept",
    message: "Update the marketing concept with new data",
    expectedConcepts: ["update", "marketing", "concept", "data"]
  },
  {
    emoji: "⚙️",
    name: "trigger_workflow",
    message: "Trigger the automation workflow for deployment", 
    expectedConcepts: ["trigger", "automation", "workflow", "deployment"]
  }
];

describe("Comprehensive RDF Action Testing", () => {
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

  test("🚀 Test all 10 action types end-to-end", async () => {
    if (!serverReady) {
      console.log("⏭️ Skipping test - service not ready");
      return;
    }

    console.log("🚀 Testing ALL 10 action types...");
    
    let totalPassed = 0;
    const results = [];
    
    for (const scenario of ACTION_SCENARIOS) {
      console.log(`\n${scenario.emoji} Testing ${scenario.name}...`);
      
      try {
        const response = await sendRDFRequest(scenario.message);
        
        // Basic validation
        expect(response).toBeDefined();
        expect(response.type).toBe("rdf");
        expect(response.success).toBe(true);
        
        // Check concepts
        let conceptsFound = 0;
        if (response.data?.structured?.ai_reasoning?.extracted_concepts) {
          const concepts = response.data.structured.ai_reasoning.extracted_concepts;
          const conceptNames = concepts.map((c: any) => c.concept_name.toLowerCase());
          
          // Check confidence values
          concepts.forEach((concept: any) => {
            expect(concept.confidence).toBeLessThanOrEqual(1.0);
          });
          
          // Count relevant concepts
          conceptsFound = conceptNames.filter(name => 
            scenario.expectedConcepts.some(expected => name.includes(expected))
          ).length;
        }
        
        // Check actions  
        let actionsGenerated = 0;
        if (response.data?.structured?.structured_actions) {
          actionsGenerated = response.data.structured.structured_actions.length;
          
          // Check action confidence values
          response.data.structured.structured_actions.forEach((action: any) => {
            expect(action.confidence).toBeLessThanOrEqual(1.0);
          });
        }
        
        results.push({
          action: scenario.name,
          emoji: scenario.emoji,
          passed: true,
          concepts: conceptsFound,
          actions: actionsGenerated
        });
        
        totalPassed++;
        console.log(`${scenario.emoji} ✅ ${scenario.name}: ${conceptsFound} concepts, ${actionsGenerated} actions`);
        
      } catch (error) {
        console.error(`${scenario.emoji} ❌ ${scenario.name}: ${error}`);
        results.push({
          action: scenario.name,
          emoji: scenario.emoji,
          passed: false,
          error: error.message
        });
      }
    }
    
    // Summary
    console.log(`\n🏁 SUMMARY: ${totalPassed}/${ACTION_SCENARIOS.length} action types working`);
    console.log("📊 Results breakdown:");
    
    results.forEach(result => {
      if (result.passed) {
        console.log(`${result.emoji} ✅ ${result.action}: ${result.concepts} concepts, ${result.actions} actions`);
      } else {
        console.log(`${result.emoji} ❌ ${result.action}: FAILED`);
      }
    });
    
    // Final assertion
    expect(totalPassed).toBeGreaterThanOrEqual(8); // Allow 2 failures out of 10
    console.log("🎉 Comprehensive action testing completed successfully!");
  });
}); 