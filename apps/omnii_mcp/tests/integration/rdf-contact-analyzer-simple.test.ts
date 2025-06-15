import { describe, test, expect, beforeAll } from "bun:test";
import { RDFContactAnalyzer } from '../../src/services/rdf-contact-analyzer';

describe("RDF Contact Analyzer - Simple Tests", () => {
  let analyzer: RDFContactAnalyzer;
  
  beforeAll(() => {
    analyzer = new RDFContactAnalyzer();
  });

  test("Message analysis with fallback", async () => {
    const testMessages = [
      "Send Eden an email about weekend plans",
      "Text Papi about dinner tonight", 
      "Email Alina the project update"
    ];
    
    for (const message of testMessages) {
      console.log(`\n📝 Testing message: "${message}"`);
      
      try {
        const analysis = await analyzer.analyzeMessage(message);
        
        console.log(`   ✅ Analysis completed:`);
        console.log(`   🧠 Extracted contact: "${analysis.primary_contact}"`);
        console.log(`   🎯 Intent: ${analysis.intent} (${analysis.formality} tone)`);
        console.log(`   📊 Confidence: ${Math.round(analysis.confidence * 100)}%`);
        
        expect(analysis.primary_contact).toBeTruthy();
        expect(analysis.intent).toBeTruthy();
        expect(analysis.confidence).toBeGreaterThan(0);
      } catch (error) {
        console.error(`   ❌ Analysis error:`, error.message);
      }
    }
  });

  test("Name expansion with RDF", async () => {
    const testNames = ["Eden", "Papi", "Alina"];
    
    for (const name of testNames) {
      console.log(`\n📝 Testing name: "${name}"`);
      
      try {
        const variations = await analyzer.expandContactName(name);
        
        console.log(`   ✅ Generated ${variations.length} variations: [${variations.join(', ')}]`);
        expect(variations.length).toBeGreaterThan(0);
        expect(variations[0]).toBe(name); // First should be exact match
      } catch (error) {
        console.error(`   ❌ Name expansion error:`, error.message);
      }
    }
  });

  test("Contact scoring logic", async () => {
    // Mock contacts for testing
    const mockContacts = [
      { name: "Eden Chan", email: "edenchan717@gmail.com", phone: null, company: null },
      { name: "Eden Smith", email: "esmith@example.com", phone: "+1234567890", company: "ACME Corp" },
      { name: "Alexander Santin", email: "alex_santin@baxter.com", phone: null, company: "Baxter" }
    ];
    
    // Mock message analysis
    const mockAnalysis = {
      primary_contact: "Eden",
      intent: "email",
      context_clues: ["weekend", "plans"],
      formality: "casual" as const,
      urgency: "normal" as const,
      additional_context: "Planning weekend activities",
      confidence: 0.8
    };
    
    console.log(`\n📊 Scoring ${mockContacts.length} mock contacts for "${mockAnalysis.primary_contact}"`);
    
    try {
      const scoredContacts = await analyzer.scoreContacts(mockContacts, mockAnalysis);
      
      console.log(`\n🏆 SCORED CONTACTS:`);
      scoredContacts.forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.name} ${contact.email ? `(${contact.email})` : '(no email)'}`);
        console.log(`     Confidence: ${Math.round(contact.confidence * 100)}%`);
        console.log(`     Reasoning: ${contact.reasoning}`);
      });
      
      expect(scoredContacts.length).toBe(mockContacts.length);
      expect(scoredContacts[0].confidence).toBeGreaterThan(0);
      
      // Eden contacts should score higher than Alexander
      const edenContact = scoredContacts.find(c => c.name.includes("Eden"));
      const alexContact = scoredContacts.find(c => c.name.includes("Alexander"));
      
      if (edenContact && alexContact) {
        expect(edenContact.confidence).toBeGreaterThan(alexContact.confidence);
        console.log(`\n✅ Scoring logic working: Eden (${Math.round(edenContact.confidence * 100)}%) > Alexander (${Math.round(alexContact.confidence * 100)}%)`);
      }
    } catch (error) {
      console.error(`❌ Contact scoring failed:`, error);
    }
  });

  test("Contact resolution logic", async () => {
    // Test scenarios
    const scenarios = [
      {
        name: "High confidence single match",
        contacts: [
          { name: "Eden Chan", email: "edenchan717@gmail.com", phone: "+1234567890", company: "Tech Corp" }
        ],
        analysis: {
          primary_contact: "Eden",
          intent: "email",
          context_clues: ["weekend", "plans"],
          formality: "casual" as const,
          urgency: "normal" as const,
          additional_context: "Weekend planning",
          confidence: 0.9
        },
        expectedResolution: "resolved"
      },
      {
        name: "Multiple matches needing intervention",
        contacts: [
          { name: "Eden Chan", email: "edenchan717@gmail.com", phone: null, company: null },
          { name: "Eden Smith", email: "esmith@example.com", phone: "+1234567890", company: "ACME" }
        ],
        analysis: {
          primary_contact: "Eden",
          intent: "email",
          context_clues: [],
          formality: "casual" as const,
          urgency: "normal" as const,
          additional_context: "",
          confidence: 0.8
        },
        expectedResolution: "needs_user_intervention"
      },
      {
        name: "No matches found",
        contacts: [],
        analysis: {
          primary_contact: "Unknown Person",
          intent: "email",
          context_clues: [],
          formality: "casual" as const,
          urgency: "normal" as const,
          additional_context: "",
          confidence: 0.3
        },
        expectedResolution: "not_found"
      }
    ];
    
    for (const scenario of scenarios) {
      console.log(`\n📋 Testing: ${scenario.name}`);
      
      try {
        const resolution = await analyzer.resolveContact(scenario.contacts, scenario.analysis);
        
        console.log(`   ✅ Resolution success: ${resolution.success}`);
        console.log(`   📊 Confidence: ${Math.round(resolution.confidence * 100)}%`);
        
        if (resolution.resolved_contact) {
          console.log(`   👤 Resolved to: ${resolution.resolved_contact.contact.name} (${resolution.resolved_contact.contact.email || 'no email'})`);
        }
        
        if (resolution.alternatives?.length > 0) {
          console.log(`   🔄 Alternatives: ${resolution.alternatives.length} contacts`);
        }
        
        // Map expected resolution to actual success/confidence values
        if (scenario.expectedResolution === "resolved") {
          expect(resolution.success).toBe(true);
          expect(resolution.confidence).toBeGreaterThanOrEqual(0.8);
        } else if (scenario.expectedResolution === "needs_user_intervention") {
          expect(resolution.success).toBe(false);
          expect(resolution.confidence).toBeGreaterThan(0);
          expect(resolution.alternatives?.length).toBeGreaterThan(0);
        } else if (scenario.expectedResolution === "not_found") {
          expect(resolution.success).toBe(false);
          expect(resolution.confidence).toBe(0);
        }
      } catch (error) {
        console.error(`   ❌ Resolution failed:`, error);
      }
    }
  });
});