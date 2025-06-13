import { describe, it, expect, beforeAll } from "bun:test";
import { RDFContactAnalyzer } from "../../src/services/rdf-contact-analyzer";

describe("Eden Contact Resolution Test", () => {
  let analyzer: RDFContactAnalyzer;

  beforeAll(async () => {
    console.log("🧪 Testing Eden contact resolution");
    analyzer = new RDFContactAnalyzer();
  });

  it("should analyze Eden email request correctly", async () => {
    // Test the exact message from the user's issue
    const userMessage = "Yooo toss an email to Eden asking what his plans are for the weekend.";
    
    const analysis = await analyzer.analyzeMessage(userMessage);
    
    console.log("📊 Analysis result:", {
      contact: analysis.primary_contact,
      intent: analysis.intent,
      formality: analysis.formality,
      confidence: analysis.confidence
    });
    
    expect(analysis.primary_contact).toBe("Eden");
    expect(analysis.intent).toBe("send_email");
    expect(analysis.confidence).toBeGreaterThan(0.5);
  });

  it("should expand Eden name variations", async () => {
    const variations = await analyzer.expandContactName("Eden");
    
    console.log("📝 Name variations:", variations);
    
    expect(variations).toContain("Eden");
    expect(variations.length).toBeGreaterThan(1);
  });

  it("should score Eden Chen contact highly for casual context", async () => {
    const analysis = await analyzer.analyzeMessage("Email Eden about weekend plans");
    
    const mockContacts = [
      { name: "Eden Chen", email: "edenchan717@gmail.com" },
      { name: "Eden Smith", email: "eden.smith@company.com" }
    ];
    
    const scoredContacts = await analyzer.scoreContacts(mockContacts, analysis);
    
    console.log("🎯 Scored contacts:", scoredContacts.map(c => ({
      name: c.name,
      email: c.email,
      confidence: Math.round(c.confidence * 100) + "%"
    })));
    
    expect(scoredContacts).toHaveLength(2);
    expect(scoredContacts[0].confidence).toBeGreaterThan(0.4);
    expect(scoredContacts[0].name).toContain("Eden");
  });
}); 