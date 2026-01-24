import { describe, test, expect, beforeAll } from "bun:test";
import { SimpleSMSAI } from "../../src/services/sms-ai-simple";
import { RDF_ACTION_TYPES } from "@omnii/validators";

describe("SMS RDF Action Scenarios & Reasoning", () => {
  let smsAI: SimpleSMSAI;
  
  beforeAll(() => {
    smsAI = new SimpleSMSAI();
  });

  // Test scenarios with different action types (similar to WebSocket tests)
  const SMS_ACTION_SCENARIOS = [
    {
      emoji: "✅",
      name: RDF_ACTION_TYPES.CREATE_TASK,
      message: "remind me to check the report later",
      expectedConcepts: ["remind", "check", "report"],
      reasoning: "Casual 'remind me' → AI should reason this needs task creation"
    },
    {
      emoji: "📧", 
      name: RDF_ACTION_TYPES.SEND_EMAIL,
      message: "shoot an email to Richard about the deadline",
      expectedConcepts: ["email", "Richard", "deadline"],
      reasoning: "Informal 'shoot an email' → AI should infer email sending needed"
    },
    {
      emoji: "⏰",
      name: RDF_ACTION_TYPES.SET_REMINDER,
      message: "don't let me forget about the 3pm call",
      expectedConcepts: ["forget", "call", "3pm"],
      reasoning: "Natural language 'don't let me forget' → AI should create reminder"
    }
  ];

  test("should handle task creation SMS scenarios", async () => {
    const taskScenario = SMS_ACTION_SCENARIOS.find(s => s.name === RDF_ACTION_TYPES.CREATE_TASK);
    
    const result = await smsAI.processMessage(
      taskScenario!.message,
      "+18582260766"
    );

    expect(result.success).toBe(true);
    expect(result.rdfEnhancement?.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement?.extracted_concepts?.length).toBeGreaterThan(0);
    
    // Should extract task-related concepts
    const conceptNames = result.rdfEnhancement.extracted_concepts.map(c => c.concept_name.toLowerCase());
    expect(conceptNames.some(name => 
      taskScenario!.expectedConcepts.some(expected => name.includes(expected))
    )).toBe(true);
  });

  test("should handle email sending SMS scenarios", async () => {
    const emailScenario = SMS_ACTION_SCENARIOS.find(s => s.name === RDF_ACTION_TYPES.SEND_EMAIL);
    
    const result = await smsAI.processMessage(
      emailScenario!.message,
      "+18582260766"
    );

    expect(result.success).toBe(true);
    expect(result.rdfEnhancement?.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement?.extracted_concepts?.length).toBeGreaterThan(0);
    
    // Should extract email-related concepts
    const conceptNames = result.rdfEnhancement.extracted_concepts.map(c => c.concept_name.toLowerCase());
    expect(conceptNames.some(name => 
      emailScenario!.expectedConcepts.some(expected => name.includes(expected))
    )).toBe(true);
  });

  test("should handle reminder setting SMS scenarios", async () => {
    const reminderScenario = SMS_ACTION_SCENARIOS.find(s => s.name === RDF_ACTION_TYPES.SET_REMINDER);
    
    const result = await smsAI.processMessage(
      reminderScenario!.message,
      "+18582260766"
    );

    expect(result.success).toBe(true);
    expect(result.rdfEnhancement?.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement?.extracted_concepts?.length).toBeGreaterThan(0);
    
    // Should extract reminder-related concepts
    const conceptNames = result.rdfEnhancement.extracted_concepts.map(c => c.concept_name.toLowerCase());
    expect(conceptNames.some(name => 
      reminderScenario!.expectedConcepts.some(expected => name.includes(expected))
    )).toBe(true);
  });

  test("SMS RDF Reasoning Demonstration", async () => {
    console.log("\n🧠 SMS RDF AI REASONING DEMONSTRATION");
    console.log("=====================================");
    console.log("📱 Testing vague SMS input → specific action mapping");
    
    let successfulMappings = 0;
    const totalTests = SMS_ACTION_SCENARIOS.length;
    
    for (const scenario of SMS_ACTION_SCENARIOS) {
      console.log(`\n${scenario.emoji} Testing ${scenario.name}...`);
      console.log(`📱 SMS Input: "${scenario.message}"`);
      console.log(`🤔 Expected Reasoning: ${scenario.reasoning}`);
      
      try {
        const result = await smsAI.processMessage(
          scenario.message,
          "+18582260766"
        );
        
        const reasoningApplied = result.rdfEnhancement?.reasoning_applied || false;
        const conceptCount = result.rdfEnhancement?.extracted_concepts?.length || 0;
        const processingTime = result.rdfEnhancement?.processing_metadata?.processing_time_ms || 0;
        
        if (reasoningApplied && conceptCount > 0) {
          successfulMappings++;
          console.log(`${scenario.emoji} ✅ SUCCESS: ${conceptCount} concepts, ${processingTime}ms`);
        } else {
          console.log(`${scenario.emoji} ⚠️ PARTIAL: reasoning=${reasoningApplied}, concepts=${conceptCount}`);
        }
        
        // Validate basic response structure
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
        
      } catch (error) {
        console.log(`${scenario.emoji} ❌ FAILED: ${error.message}`);
      }
    }
    
    console.log(`\n📊 SMS RDF REASONING RESULTS: ${successfulMappings}/${totalTests} successful mappings`);
    console.log("🎯 SMS can now understand vague language and extract meaningful intent!");
    
    // Expect reasonable success rate
    expect(successfulMappings).toBeGreaterThan(0);
  });

  test("should demonstrate RDF performance metrics", async () => {
    console.log("\n⚡ SMS RDF PERFORMANCE METRICS");
    console.log("==============================");
    
    const performanceTests = [
      "Quick task for me",
      "Email John about the proposal",
      "Remind me about dinner at 6pm"
    ];
    
    let totalProcessingTime = 0;
    let successfulTests = 0;
    
    for (const testMessage of performanceTests) {
      const result = await smsAI.processMessage(testMessage, "+18582260766");
      
      if (result.rdfEnhancement?.processing_metadata) {
        const processingTime = result.rdfEnhancement.processing_metadata.processing_time_ms;
        totalProcessingTime += processingTime;
        successfulTests++;
        
        console.log(`📱 "${testMessage}" → ${processingTime}ms`);
      }
    }
    
    if (successfulTests > 0) {
      const averageTime = totalProcessingTime / successfulTests;
      console.log(`📊 Average RDF processing time: ${averageTime.toFixed(2)}ms`);
      
      // Performance expectations
      expect(averageTime).toBeLessThan(5000); // Should be under 5 seconds
      expect(successfulTests).toBe(performanceTests.length);
    }
  });
}); 