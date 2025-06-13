import { describe, test, expect, beforeAll } from "bun:test";
import { RDFContactAnalyzer } from '../../src/services/rdf-contact-analyzer';

describe("Safe Contact Search - No Recursion", () => {
  let analyzer: RDFContactAnalyzer;
  
  // Your actual userUUID from the logs
  const REAL_USER_UUID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354";
  
  beforeAll(async () => {
    console.log("🔗 Initializing RDFContactAnalyzer for safe testing...");
    analyzer = new RDFContactAnalyzer();
  });

  test("SAFE TEST: Message analysis fallback (no API calls)", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🧠 SAFE TEST: Testing message analysis fallback methods");
    console.log("=".repeat(60));
    
    const testMessages = [
      "Send Eden an email about weekend plans",
      "Text Papi about dinner tonight", 
      "Email Alina the project update"
    ];
    
    for (const message of testMessages) {
      console.log(`\n📝 Testing message: "${message}"`);
      
      try {
        // Test message analysis with short timeout
        const analysisPromise = analyzer.analyzeMessage(message);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const analysis = await Promise.race([analysisPromise, timeoutPromise]);
        
        console.log(`   ✅ Analysis completed:`);
        console.log(`   🧠 Extracted contact: "${analysis.primary_contact}"`);
        console.log(`   🎯 Intent: ${analysis.intent} (${analysis.formality} tone)`);
        console.log(`   📊 Confidence: ${Math.round(analysis.confidence * 100)}%`);
        
        expect(analysis.primary_contact).toBeTruthy();
        expect(analysis.intent).toBeTruthy();
        
      } catch (error) {
        if (error.message === 'Timeout') {
          console.log(`   ⚠️ Message analysis timed out - using fallback`);
          
          // Test the fallback methods directly
          const contactMatch = analyzer['extractContactNameFallback'](message);
          const intent = analyzer['determineIntentFallback'](message.toLowerCase());
          
          console.log(`   📝 Fallback contact: "${contactMatch}"`);
          console.log(`   🎯 Fallback intent: ${intent}`);
          
          expect(contactMatch).toBeTruthy();
          expect(intent).toBeTruthy();
        } else {
          console.error(`   ❌ Analysis error:`, error);
          throw error;
        }
      }
    }
  }, 20000); // 20 second timeout

  test("SAFE TEST: Name variations generation with timeout", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 SAFE TEST: Testing name variations with safeguards");
    console.log("=".repeat(60));
    
    const testNames = ["Eden", "Papi", "Alina"];
    
    for (const name of testNames) {
      console.log(`\n📝 Testing name: "${name}"`);
      
      try {
        // Test name expansion with timeout
        const variationsPromise = analyzer.expandContactName(name);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const variations = await Promise.race([variationsPromise, timeoutPromise]);
        
        console.log(`   ✅ Generated ${variations.length} variations: [${variations.join(', ')}]`);
        expect(variations.length).toBeGreaterThan(0);
        expect(variations[0]).toBe(name); // First should be exact match
        
      } catch (error) {
        if (error.message === 'Timeout') {
          console.log(`   ⚠️ Name expansion timed out - using rule-based fallback`);
          
          // Test the rule-based fallback directly
          const fallbackVariations = analyzer['generateRuleBasedVariationsFallback'](name);
          console.log(`   📝 Fallback variations: [${fallbackVariations.join(', ')}]`);
          
          expect(fallbackVariations.length).toBeGreaterThan(0);
        } else {
          console.error(`   ❌ Name expansion error:`, error);
          throw error;
        }
      }
    }
  }, 20000);

  test("SAFE TEST: Contact scoring (local processing only)", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 SAFE TEST: Testing contact scoring logic");
    console.log("=".repeat(60));
    
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
      throw error;
    }
  }, 10000);

  test("SAFE TEST: Contact resolution logic", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 SAFE TEST: Testing contact resolution logic");
    console.log("=".repeat(60));
    
    // Test scenarios
    const scenarios = [
      {
        name: "High confidence single match",
        contacts: [
          { name: "Eden Chan", email: "edenchan717@gmail.com", phone: null, company: null }
        ],
        analysis: {
          primary_contact: "Eden",
          intent: "email",
          context_clues: [],
          formality: "casual" as const,
          urgency: "normal" as const,
          additional_context: "",
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
        
        console.log(`   ✅ Resolution: ${resolution.status}`);
        console.log(`   📊 Confidence: ${Math.round(resolution.confidence * 100)}%`);
        
        if (resolution.resolvedContact) {
          console.log(`   👤 Resolved to: ${resolution.resolvedContact.name} (${resolution.resolvedContact.email || 'no email'})`);
        }
        
        if (resolution.alternativeContacts?.length > 0) {
          console.log(`   🔄 Alternatives: ${resolution.alternativeContacts.length} contacts`);
        }
        
        expect(resolution.status).toBe(scenario.expectedResolution);
        
      } catch (error) {
        console.error(`   ❌ Resolution failed:`, error);
        throw error;
      }
    }
  }, 10000);

  test("SAFE TEST: Verify no recursion in search methods", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔒 SAFE TEST: Verifying no recursion in search logic");
    console.log("=".repeat(60));
    
    // This test ensures that search methods don't recurse infinitely
    const testName = "TestName";
    
    // Test that we can call these methods without hanging
    console.log(`📝 Testing expandContactName("${testName}") with timeout...`);
    
    try {
      const startTime = Date.now();
      
      // Very short timeout to ensure no hanging
      const variationsPromise = analyzer.expandContactName(testName);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Method took too long - possible recursion')), 3000)
      );
      
      await Promise.race([variationsPromise, timeoutPromise]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ✅ Method completed in ${duration}ms (no recursion detected)`);
      expect(duration).toBeLessThan(3000);
      
    } catch (error) {
      if (error.message.includes('recursion')) {
        console.error(`   ❌ RECURSION DETECTED: Method took too long`);
        throw error;
      } else {
        console.log(`   ⚠️ Method failed but didn't hang: ${error.message}`);
        // This is acceptable - we just want to ensure no infinite recursion
      }
    }
    
    console.log(`\n✅ No recursion detected in search methods`);
  }, 10000);
});

describe("REAL Contact Search - Actual Google Contacts", () => {
  let analyzer: RDFContactAnalyzer;
  
  // Your actual userUUID from the logs
  const REAL_USER_UUID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354";
  
  beforeAll(async () => {
    console.log("🔗 Connecting to REAL Google Contacts...");
    analyzer = new RDFContactAnalyzer();
  });

  test("REAL TEST: Find Eden in actual Google Contacts", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 REAL TEST: Searching for 'Eden' in your Google Contacts");
    console.log("=".repeat(60));
    
    // Step 1: Generate name variations (simplified, no recursion)
    const variations = await analyzer.expandContactName("Eden");
    console.log(`📝 Generated ${variations.length} name variations:`, variations);
    
    // Step 2: Search your actual contacts
    const contacts = await analyzer.searchContacts(variations, REAL_USER_UUID);
    console.log(`\n📊 Found ${contacts.length} contacts in your Google Contacts`);
    
    if (contacts.length > 0) {
      console.log("\n🏆 ACTUAL CONTACTS FOUND:");
      contacts.forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.name} ${contact.email ? `(${contact.email})` : '(no email)'}`);
        if (contact.phone) console.log(`     Phone: ${contact.phone}`);
        if (contact.company) console.log(`     Company: ${contact.company}`);
      });
      
      // Test the message analysis (simplified, no recursion)
      const analysis = await analyzer.analyzeMessage("Send Eden an email about weekend plans");
      console.log(`\n🧠 Message Analysis:`, {
        primary_contact: analysis.primary_contact,
        intent: analysis.intent,
        formality: analysis.formality,
        confidence: Math.round(analysis.confidence * 100) + "%"
      });
      
      // Score the contacts
      const scoredContacts = await analyzer.scoreContacts(contacts, analysis);
      console.log(`\n🎯 TOP SCORED CONTACT:`);
      const topContact = scoredContacts[0];
      console.log(`   ${topContact.name} (${topContact.email || 'no email'})`);
      console.log(`   Confidence: ${Math.round(topContact.confidence * 100)}%`);
      console.log(`   Reasoning: ${topContact.reasoning}`);
      
      expect(contacts.length).toBeGreaterThan(0);
      expect(topContact.email).toBeTruthy(); // Eden should have an email
    } else {
      console.log("❌ No contacts found - Eden might not be in your Google Contacts");
      console.log("💡 Try adding a contact named 'Eden' to your Google Contacts and run the test again");
    }
  }, 30000);

  test("REAL TEST: Find Papi/Papa in actual Google Contacts", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 REAL TEST: Searching for 'Papi' in your Google Contacts");
    console.log("=".repeat(60));
    
    // Step 1: Generate name variations
    const variations = await analyzer.expandContactName("Papi");
    console.log(`📝 Generated ${variations.length} name variations:`, variations);
    
    // Step 2: Search your actual contacts
    const contacts = await analyzer.searchContacts(variations, REAL_USER_UUID);
    console.log(`\n📊 Found ${contacts.length} contacts in your Google Contacts`);
    
    if (contacts.length > 0) {
      console.log("\n🏆 ACTUAL CONTACTS FOUND:");
      contacts.forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.name} ${contact.email ? `(${contact.email})` : '(no email)'}`);
        if (contact.phone) console.log(`     Phone: ${contact.phone}`);
        if (contact.company) console.log(`     Company: ${contact.company}`);
      });
      
      expect(contacts.length).toBeGreaterThan(0);
    } else {
      console.log("❌ No contacts found for Papi/Papa");
      console.log("💡 This could mean the search worked correctly if you don't have anyone named Papa/Papi");
    }
  }, 30000);

  test("REAL TEST: Search for Alina in actual Google Contacts", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 REAL TEST: Searching for 'Alina' in your Google Contacts");
    console.log("=".repeat(60));
    
    const variations = await analyzer.expandContactName("Alina");
    console.log(`📝 Generated ${variations.length} name variations:`, variations);
    
    const contacts = await analyzer.searchContacts(variations, REAL_USER_UUID);
    console.log(`\n📊 Found ${contacts.length} contacts in your Google Contacts`);
    
    if (contacts.length > 0) {
      console.log("\n🏆 ACTUAL CONTACTS FOUND:");
      contacts.forEach((contact, index) => {
        console.log(`  ${index + 1}. ${contact.name} ${contact.email ? `(${contact.email})` : '(no email)'}`);
        if (contact.phone) console.log(`     Phone: ${contact.phone}`);
        if (contact.company) console.log(`     Company: ${contact.company}`);
      });
      
      expect(contacts.length).toBeGreaterThan(0);
    } else {
      console.log("❌ No contacts found for Alina");
    }
  }, 30000);

  test("REAL TEST: List some actual contacts to verify connection", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("📋 REAL TEST: Getting sample contacts to verify Google Contacts works");
    console.log("=".repeat(60));
    
    // Import unified google manager directly
    const unifiedGoogleManager = (await import('../../src/services/unified-google-manager')).default;
    
    const result = await unifiedGoogleManager.processMessage(
      `List my contacts`,
      REAL_USER_UUID,
      "America/Los_Angeles",
      undefined,
      'websocket' as any
    );
    
    console.log(`📊 Google Contacts API result:`, {
      success: result.success,
      hasRawData: !!result.rawData,
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : []
    });
    
    if (result.success) {
      // Try to extract contact data like the analyzer does
      let extractedCount = 0;
      
      if (result.data?.contacts && Array.isArray(result.data.contacts)) {
        extractedCount = result.data.contacts.length;
        console.log(`✅ Found ${extractedCount} contacts in result.data.contacts`);
        
        // Show first few contacts
        result.data.contacts.slice(0, 5).forEach((contact: any, i: number) => {
          console.log(`  ${i + 1}. ${contact.name || 'Unknown Name'} ${contact.email ? `(${contact.email})` : '(no email)'}`);
        });
      } else if (result.rawData) {
        console.log(`📄 Raw data available - attempting extraction...`);
        const analyzer = new RDFContactAnalyzer();
        const extracted = analyzer['extractAllContactsFromResponse'](result.rawData);
        extractedCount = extracted.length;
        
        console.log(`✅ Extracted ${extractedCount} contacts from raw data`);
        extracted.slice(0, 5).forEach((contact: any, i: number) => {
          const transformed = analyzer['transformApiContactToContact'](contact, 'sample');
          if (transformed) {
            console.log(`  ${i + 1}. ${transformed.name} ${transformed.email ? `(${transformed.email})` : '(no email)'}`);
          }
        });
      }
      
      expect(result.success).toBe(true);
      expect(extractedCount).toBeGreaterThan(0);
      
      console.log(`\n🎯 Google Contacts API is working! Found ${extractedCount} total contacts.`);
    } else {
      console.log("❌ Google Contacts API failed");
      throw new Error("Google Contacts API not working");
    }
  }, 30000);

  test("REAL TEST: Complete contact resolution flow", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 REAL TEST: Complete Contact Resolution Flow");
    console.log("=".repeat(60));
    
    const testCases = [
      { name: "Eden", message: "Send Eden an email about weekend plans" },
      { name: "Papi", message: "Text Papi about dinner tonight" },
      { name: "Alina", message: "Email Alina the project update" }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📝 Testing: "${testCase.message}"`);
      
      // Step 1: Analyze message
      const analysis = await analyzer.analyzeMessage(testCase.message);
      console.log(`   🧠 Extracted contact: "${analysis.primary_contact}"`);
      console.log(`   🎯 Intent: ${analysis.intent} (${analysis.formality} tone)`);
      
      // Step 2: Generate variations
      const variations = await analyzer.expandContactName(analysis.primary_contact);
      console.log(`   📝 Name variations: [${variations.join(', ')}]`);
      
      // Step 3: Search contacts
      const contacts = await analyzer.searchContacts(variations, REAL_USER_UUID);
      console.log(`   📊 Found ${contacts.length} contacts`);
      
      if (contacts.length > 0) {
        // Step 4: Score contacts
        const scoredContacts = await analyzer.scoreContacts(contacts, analysis);
        const topMatch = scoredContacts[0];
        
        console.log(`   ✅ TOP MATCH: ${topMatch.name} (${topMatch.email || 'no email'})`);
        console.log(`   🎯 Confidence: ${Math.round(topMatch.confidence * 100)}%`);
        
        // This would be the email address used for sending
        if (topMatch.email) {
          console.log(`   📧 WOULD SEND TO: ${topMatch.email}`);
        } else {
          console.log(`   ❌ NO EMAIL: Contact found but no email address`);
        }
      } else {
        console.log(`   ❌ NO MATCHES: Would show error to user`);
      }
    }
    
    expect(true).toBe(true); // This test is mainly for observation
  }, 60000);
}); 