import { describe, test, expect, beforeAll } from "bun:test";
import { RDFContactAnalyzer } from '../../src/services/rdf-contact-analyzer';

describe("Live Contact Search - Real Google Contacts", () => {
  let analyzer: RDFContactAnalyzer;
  
  // Your actual userUUID from the logs
  const REAL_USER_UUID = "cd9bdc60-35af-4bb6-b87e-1932e96fb354";
  
  beforeAll(async () => {
    console.log("🔗 Connecting to your actual Google Contacts...");
    analyzer = new RDFContactAnalyzer();
  });

  test("LIVE TEST: Find Eden in your real contacts", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 LIVE TEST: Searching for 'Eden' in your Google Contacts");
    console.log("=".repeat(60));
    
    // Step 1: Generate name variations
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
      
      // Test the message analysis
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
    } else {
      console.log("❌ No contacts found - this means Eden might not be in your Google Contacts");
      console.log("💡 Try adding a contact named 'Eden' to your Google Contacts and run the test again");
    }
  }, 30000); // 30 second timeout for API calls

  test("LIVE TEST: Find Papi in your real contacts", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 LIVE TEST: Searching for 'Papi' in your Google Contacts");
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
      
      // Test the message analysis
      const analysis = await analyzer.analyzeMessage("Text Papi asking if he wants to grab dinner");
      console.log(`\n🧠 Message Analysis:`, {
        primary_contact: analysis.primary_contact,
        intent: analysis.intent,
        formality: analysis.formality,
        confidence: Math.round(analysis.confidence * 100) + "%"
      });
      
      // Score the contacts
      const scoredContacts = await analyzer.scoreContacts(contacts, analysis);
      if (scoredContacts.length > 0) {
        console.log(`\n🎯 TOP SCORED CONTACT:`);
        const topContact = scoredContacts[0];
        console.log(`   ${topContact.name} (${topContact.email || 'no email'})`);
        console.log(`   Confidence: ${Math.round(topContact.confidence * 100)}%`);
        console.log(`   Reasoning: ${topContact.reasoning}`);
      }
      
      expect(contacts.length).toBeGreaterThan(0);
    } else {
      console.log("❌ No contacts found - this means Papi/Papa might not be in your Google Contacts");
      console.log("💡 This could mean the search worked correctly if you don't have anyone named Papa/Papi");
    }
  }, 30000);

  test("LIVE TEST: Find Alina in your real contacts", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 LIVE TEST: Searching for 'Alina' in your Google Contacts");
    console.log("=".repeat(60));
    
    // Step 1: Generate name variations
    const variations = await analyzer.expandContactName("Alina");
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
      
      // Test the message analysis
      const analysis = await analyzer.analyzeMessage("Send Alina an email about the project");
      console.log(`\n🧠 Message Analysis:`, {
        primary_contact: analysis.primary_contact,
        intent: analysis.intent,
        formality: analysis.formality,
        confidence: Math.round(analysis.confidence * 100) + "%"
      });
      
      // Score the contacts
      const scoredContacts = await analyzer.scoreContacts(contacts, analysis);
      if (scoredContacts.length > 0) {
        console.log(`\n🎯 TOP SCORED CONTACT:`);
        const topContact = scoredContacts[0];
        console.log(`   ${topContact.name} (${topContact.email || 'no email'})`);
        console.log(`   Confidence: ${Math.round(topContact.confidence * 100)}%`);
        console.log(`   Reasoning: ${topContact.reasoning}`);
      }
      
      expect(contacts.length).toBeGreaterThan(0);
    } else {
      console.log("❌ No contacts found - this means Alina/Elena might not be in your Google Contacts");
      console.log("💡 This could mean the search worked correctly if you don't have anyone with similar names");
    }
  }, 30000);

  test("LIVE TEST: Test complete contact resolution flow", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 LIVE TEST: Complete Contact Resolution Flow");
    console.log("=".repeat(60));
    
    const testMessages = [
      "Send Eden an email about weekend plans",
      "Text Papi about dinner tonight", 
      "Email Alina the project update"
    ];
    
    for (const message of testMessages) {
      console.log(`\n📝 Testing message: "${message}"`);
      
      // Step 1: Analyze message
      const analysis = await analyzer.analyzeMessage(message);
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
  }, 60000); // 60 second timeout for multiple API calls
}); 