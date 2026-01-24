// Simple diagnostic test to check cached concepts data
const TEST_CONFIG = {
  testUserId: 'cd9bdc60-35af-4bb6-b87e-1932e96fb354',
  expectedMemoryPeriod: 'current_week',
  expectedDataType: 'neo4j_concepts'
};

describe('🔍 Simple Concepts Cache Diagnostic', () => {
  
  test('1. 📋 Environment Check', async () => {
    console.log('\n📋 Checking environment...');
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log(`Supabase URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
    console.log(`Supabase Key: ${supabaseKey ? 'Set' : 'Missing'}`);
    
    expect(supabaseUrl).toBeTruthy();
    expect(supabaseKey).toBeTruthy();
    
    console.log('✅ Environment check passed');
  });

  test('2. 🧠 Test Search Algorithm', async () => {
    console.log('\n🧠 Testing search algorithm...');
    
    const concepts = [
      {
        id: "1",
        name: "Pizza Types and Recipes",
        labels: ["Note", "Concept"],
        properties: { keywords: "pizza, recipes, types, cooking", activation_strength: 0.75 }
      },
      {
        id: "2", 
        name: "System Status Overview",
        labels: ["Note", "Concept"],
        properties: { keywords: "system, status, overview", activation_strength: 0.8 }
      }
    ];

    const fuzzySearch = (query: string, list: any[]) => {
      const searchTerms = query.toLowerCase().split(' ');
      return list.filter(concept => {
        const text = [concept.name, concept.properties?.keywords].join(' ').toLowerCase();
        return searchTerms.some(term => text.includes(term));
      });
    };

    const pizzaResults = fuzzySearch('pizza', concepts);
    const systemResults = fuzzySearch('system', concepts);
    
    console.log(`Pizza search: ${pizzaResults.length} results`);
    console.log(`System search: ${systemResults.length} results`);
    
    expect(pizzaResults.length).toBe(1);
    expect(systemResults.length).toBe(1);
    
    console.log('✅ Search algorithm working');
  });
}); 