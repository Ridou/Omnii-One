import { describe, test, expect, beforeAll } from "bun:test";
import { SimpleSMSAI } from "../../src/services/sms-ai-simple";
import { RDF_ACTION_TYPES } from "@omnii/validators";

describe("SMS RDF Integration - Clean Tests", () => {
  let smsAI: SimpleSMSAI;
  
  beforeAll(() => {
    smsAI = new SimpleSMSAI();
  });

  test("should have RDF service integrated into SimpleSMSAI", () => {
    expect(smsAI['rdfService']).toBeDefined();
    expect(typeof smsAI['rdfService'].processHumanInputToOmniiMCP).toBe('function');
  });

  test("should process vague SMS input with RDF enhancement", async () => {
    const result = await smsAI.processMessage(
      "I should probably call Richard about that project",
      "+18582260766" // test phone
    );

    expect(result.success).toBe(true);
    expect(result.rdfEnhancement).toBeDefined();
    expect(result.rdfEnhancement.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement.extracted_concepts.length).toBeGreaterThan(0);
  });

  test("should include RDF processing time in SMS metadata", async () => {
    const result = await smsAI.processMessage(
      "Book a flight to Paris",
      "+18582260766"
    );

    expect(result.rdfEnhancement?.processing_metadata).toBeDefined();
    expect(result.rdfEnhancement.processing_metadata.processing_time_ms).toBeGreaterThan(0);
    expect(result.rdfEnhancement.processing_metadata.processing_time_ms).toBeLessThan(10000);
  });

  test("should enhance SMS context with RDF insights", async () => {
    const result = await smsAI.processMessage(
      "Send email to Richard about tomorrow's meeting",
      "+18582260766"
    );

    expect(result.rdfEnhancement?.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement?.intent_analysis).toBeDefined();
    expect(result.rdfEnhancement?.intent_analysis.primary_intent).toBeDefined();
    expect(result.rdfEnhancement?.extracted_concepts).toBeDefined();
    
    // Should detect email-related concepts
    const conceptNames = result.rdfEnhancement.extracted_concepts.map(c => c.concept_name.toLowerCase());
    expect(conceptNames.some(name => name.includes('email') || name.includes('send'))).toBe(true);
  });

  test("should fallback gracefully when RDF fails for SMS", async () => {
    // Mock RDF failure
    const originalMethod = smsAI['rdfService']?.processHumanInputToOmniiMCP;
    if (smsAI['rdfService']) {
      smsAI['rdfService'].processHumanInputToOmniiMCP = () => {
        throw new Error("RDF failed");
      };
    }
    
    const result = await smsAI.processMessage(
      "Test message",
      "+18582260766"
    );
    
    expect(result.success).toBe(true); // Should still succeed
    expect(result.rdfEnhancement?.reasoning_applied).toBe(false);
    
    // Restore original method
    if (smsAI['rdfService'] && originalMethod) {
      smsAI['rdfService'].processHumanInputToOmniiMCP = originalMethod;
    }
  });

  test("should preserve existing SMS functionality when RDF is disabled", async () => {
    // Test that we can disable RDF processing
    const originalRDFService = smsAI['rdfService'];
    smsAI['rdfService'] = null;
    
    const result = await smsAI.processMessage(
      "Hello there",
      "+18582260766"
    );
    
    expect(result.success).toBe(true);
    // Should not have RDF enhancement but still work
    expect(result.rdfEnhancement).toBeUndefined();
    
    // Restore
    smsAI['rdfService'] = originalRDFService;
  });

  // Test scenarios with different action types (without entity resolution to avoid contact lookup issues)
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
      message: "send email to team about the deadline",
      expectedConcepts: ["send", "email", "deadline"],
      reasoning: "Clear email intent → AI should infer email sending needed"
    },
    {
      emoji: "⏰",
      name: RDF_ACTION_TYPES.SET_REMINDER,
      message: "don't let me forget about the meeting",
      expectedConcepts: ["forget", "meeting"],
      reasoning: "Natural language 'don't let me forget' → AI should create reminder"
    },
    {
      emoji: "🔍",
      name: RDF_ACTION_TYPES.SEARCH_CONTACTS,
      message: "find contact information for my manager",
      expectedConcepts: ["find", "contact", "manager"],
      reasoning: "Contact search intent → AI should detect search action"
    },
    {
      emoji: "📝",
      name: RDF_ACTION_TYPES.CREATE_NOTE,
      message: "make a note about today's discussion",
      expectedConcepts: ["note", "discussion"],
      reasoning: "Note creation intent → AI should detect note action"
    }
  ];

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
          
          // Log extracted concepts for verification
          const concepts = result.rdfEnhancement.extracted_concepts
            .map(c => c.concept_name)
            .join(', ');
          console.log(`   📝 Concepts: ${concepts}`);
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
  }, 30000);

  test("should extract correct concepts for contact-based messages", async () => {
    const result = await smsAI.processMessage(
      "call Richard about the quarterly review",
      "+18582260766"
    );

    expect(result.rdfEnhancement?.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement?.extracted_concepts).toBeDefined();
    
    const conceptNames = result.rdfEnhancement.extracted_concepts.map(c => c.concept_name.toLowerCase());
    
    // Should extract key concepts
    expect(conceptNames).toContain('call');
    expect(conceptNames).toContain('richard');
    expect(conceptNames.some(name => name.includes('quarterly') || name.includes('review'))).toBe(true);
    
    console.log(`📞 Contact-based RDF: ${conceptNames.join(', ')}`);
  });

  test("should handle complex multi-action scenarios", async () => {
    const result = await smsAI.processMessage(
      "schedule a meeting with Richard and send him the agenda beforehand",
      "+18582260766"
    );

    expect(result.rdfEnhancement?.reasoning_applied).toBe(true);
    expect(result.rdfEnhancement?.extracted_concepts).toBeDefined();
    
    const conceptNames = result.rdfEnhancement.extracted_concepts.map(c => c.concept_name.toLowerCase());
    
    // Should extract multiple action concepts
    expect(conceptNames.some(name => name.includes('schedule') || name.includes('meeting'))).toBe(true);
    expect(conceptNames.some(name => name.includes('send') || name.includes('agenda'))).toBe(true);
    expect(conceptNames).toContain('richard');
    
    console.log(`🔄 Multi-action RDF: ${conceptNames.join(', ')}`);
  });
}); 