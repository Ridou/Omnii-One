import { describe, test, expect, beforeAll } from "bun:test";

// Mock contact data (simulating what might be in Google Contacts)
const MOCK_CONTACTS = [
  { person: { names: [{ displayName: "Eden Chen", givenName: "Eden", familyName: "Chen" }], emailAddresses: [{ value: "edenchan717@gmail.com" }], phoneNumbers: [{ value: "+1234567890" }] }},
  { person: { names: [{ displayName: "Eden Martinez", givenName: "Eden", familyName: "Martinez" }], emailAddresses: [{ value: "eden.martinez@company.com" }], phoneNumbers: [{ value: "+1234567891" }] }},
  { person: { names: [{ displayName: "Ethan Williams", givenName: "Ethan", familyName: "Williams" }], emailAddresses: [{ value: "ethan.w@gmail.com" }], phoneNumbers: [{ value: "+1234567892" }] }},
  { person: { names: [{ displayName: "Aiden Johnson", givenName: "Aiden", familyName: "Johnson" }], emailAddresses: [{ value: "aiden.j@outlook.com" }], phoneNumbers: [{ value: "+1234567893" }] }},
  { person: { names: [{ displayName: "Papa John", givenName: "Papa", familyName: "John" }], emailAddresses: [{ value: "papa.john@pizza.com" }], phoneNumbers: [{ value: "+1234567894" }] }},
  { person: { names: [{ displayName: "Papito Rodriguez", givenName: "Papito", familyName: "Rodriguez" }], emailAddresses: [{ value: "papito.r@gmail.com" }], phoneNumbers: [{ value: "+1234567895" }] }},
  { person: { names: [{ displayName: "Alberto Papa", givenName: "Alberto", familyName: "Papa" }], emailAddresses: [{ value: "alberto.papa@email.com" }], phoneNumbers: [{ value: "+1234567896" }] }},
  { person: { names: [{ displayName: "Alina Smith", givenName: "Alina", familyName: "Smith" }], emailAddresses: [{ value: "alina.smith@gmail.com" }], phoneNumbers: [{ value: "+1234567897" }] }},
  { person: { names: [{ displayName: "Elena Rodriguez", givenName: "Elena", familyName: "Rodriguez" }], emailAddresses: [{ value: "elena.r@company.com" }], phoneNumbers: [{ value: "+1234567898" }] }},
  { person: { names: [{ displayName: "Alicia Johnson", givenName: "Alicia", familyName: "Johnson" }], emailAddresses: [{ value: "alicia.j@outlook.com" }], phoneNumbers: [{ value: "+1234567899" }] }},
  { person: { names: [{ displayName: "Richard Santin", givenName: "Richard", familyName: "Santin" }], emailAddresses: [{ value: "richard.santin@company.com" }], phoneNumbers: [{ value: "+1234567800" }] }},
  { person: { names: [{ displayName: "Rick Johnson", givenName: "Rick", familyName: "Johnson" }], emailAddresses: [{ value: "rick.j@gmail.com" }], phoneNumbers: [{ value: "+1234567801" }] }},
  { person: { names: [{ displayName: "Dick Smith", givenName: "Dick", familyName: "Smith" }], emailAddresses: [{ value: "dick.smith@email.com" }], phoneNumbers: [{ value: "+1234567802" }] }},
];

class ContactSearchTester {
  
  // Simulate AI name variations (what the real system would generate)
  async generateAIVariations(name: string): Promise<string[]> {
    const variations: { [key: string]: string[] } = {
      'Eden': ['Edan', 'Aiden', 'Ethan', 'Aden', 'Eaton'],
      'Papi': ['Papa', 'Papito', 'Pop', 'Daddy', 'Father'],
      'Alina': ['Elena', 'Alicia', 'Alice', 'Aline', 'Alena', 'Lina']
    };
    
    return variations[name] || [name];
  }

  // Simulate the intelligent name matching confidence calculation
  calculateNameMatchConfidence(searchTerm: string, contactName: string): number {
    const searchLower = searchTerm.toLowerCase().trim();
    const contactLower = contactName.toLowerCase();
    
    // Exact match
    if (contactLower === searchLower) return 1.0;
    
    // Extract first and last names
    const contactParts = contactLower.split(/\s+/);
    const contactFirst = contactParts[0] || '';
    const contactLast = contactParts[contactParts.length - 1] || '';
    
    // First name exact match
    if (contactFirst === searchLower) return 0.9;
    
    // Last name exact match  
    if (contactLast === searchLower) return 0.8;
    
    // Contains search term
    if (contactLower.includes(searchLower)) return 0.7;
    
    // First name starts with search term
    if (contactFirst.startsWith(searchLower)) return 0.6;
    
    // Last name starts with search term
    if (contactLast.startsWith(searchLower)) return 0.6;
    
    // Search term starts with first name (nickname potential)
    if (searchLower.startsWith(contactFirst) && contactFirst.length >= 3) return 0.5;
    
    return 0;
  }

  // Transform API contact to our format
  transformContact(mockContact: any) {
    const person = mockContact.person;
    const name = person.names[0].displayName;
    const email = person.emailAddresses?.[0]?.value;
    const phone = person.phoneNumbers?.[0]?.value;
    
    return { name, email, phone };
  }

  // Simulate the intelligent fuzzy matching
  async performIntelligentSearch(searchName: string) {
    console.log(`\n🔍 TESTING: "${searchName}"`);
    
    // Step 1: Generate variations
    const variations = await this.generateAIVariations(searchName);
    const allVariations = [searchName, ...variations];
    console.log(`📝 Search variations: [${allVariations.join(', ')}]`);
    
    // Step 2: Test against all contacts
    const matches: Array<{ name: string; email: string; confidence: number; reason: string }> = [];
    
    for (const mockContact of MOCK_CONTACTS) {
      const contact = this.transformContact(mockContact);
      
      let bestConfidence = 0;
      let bestReason = '';
      
      for (const searchTerm of allVariations) {
        const confidence = this.calculateNameMatchConfidence(searchTerm, contact.name);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestReason = `Matched "${searchTerm}" to "${contact.name}"`;
        }
      }
      
      if (bestConfidence > 0.3) {  // Threshold for inclusion
        matches.push({
          name: contact.name,
          email: contact.email!,
          confidence: bestConfidence,
          reason: bestReason
        });
      }
    }
    
    // Step 3: Sort by confidence
    const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`🏆 Results (${sortedMatches.length} matches):`);
    sortedMatches.forEach((match, index) => {
      console.log(`  ${index + 1}. ${match.name} (${match.email}) - ${Math.round(match.confidence * 100)}%`);
      console.log(`     ${match.reason}`);
    });
    
    if (sortedMatches.length > 0) {
      const topMatch = sortedMatches[0];
      console.log(`🎯 TOP CHOICE: ${topMatch.name} (${topMatch.email}) - ${Math.round(topMatch.confidence * 100)}%`);
    } else {
      console.log(`❌ No matches found`);
    }
    
    return sortedMatches;
  }
}

describe("Intelligent Contact Search Tests", () => {
  let tester: ContactSearchTester;

  beforeAll(() => {
    tester = new ContactSearchTester();
  });

  test("should find Eden contacts with high confidence", async () => {
    const results = await tester.performIntelligentSearch("Eden");
    
    expect(results.length).toBeGreaterThan(0);
    
    // Should find Eden Chen as top match
    const topMatch = results[0];
    expect(topMatch.name).toContain("Eden");
    expect(topMatch.confidence).toBeGreaterThan(0.8);
    
    // Should also find related names like Ethan, Aiden
    const allNames = results.map(r => r.name);
    expect(allNames.some(name => name.includes("Eden") || name.includes("Ethan") || name.includes("Aiden"))).toBe(true);
  });

  test("should find Papi/Papa-related contacts", async () => {
    const results = await tester.performIntelligentSearch("Papi");
    
    expect(results.length).toBeGreaterThan(0);
    
    // Should find Papa John, Papito, etc.
    const allNames = results.map(r => r.name);
    expect(allNames.some(name => name.includes("Papa") || name.includes("Papito"))).toBe(true);
    
    // Top match should be high confidence
    expect(results[0].confidence).toBeGreaterThan(0.5);
  });

  test("should find Alina and similar names", async () => {
    const results = await tester.performIntelligentSearch("Alina");
    
    expect(results.length).toBeGreaterThan(0);
    
    // Should find exact match first
    const exactMatch = results.find(r => r.name === "Alina Smith");
    expect(exactMatch).toBeDefined();
    expect(exactMatch!.confidence).toBeGreaterThan(0.8);
    
    // Should also find similar names like Elena, Alicia
    const allNames = results.map(r => r.name);
    expect(allNames.some(name => name.includes("Elena") || name.includes("Alicia"))).toBe(true);
  });

  test("should rank contacts by confidence correctly", async () => {
    const results = await tester.performIntelligentSearch("Eden");
    
    // Results should be sorted by confidence (highest first)
    for (let i = 1; i < results.length; i++) {
      expect(results[i-1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
    
    // Exact name match should have highest confidence
    const exactMatch = results.find(r => r.name.toLowerCase().includes("eden"));
    expect(exactMatch?.confidence).toBeGreaterThan(0.8);
  });
}); 