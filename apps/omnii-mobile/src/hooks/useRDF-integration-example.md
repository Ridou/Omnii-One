# RDF Hook Integration Example

## Adding RDF to MemoryContent

To integrate the RDF semantic analysis into your MemoryContent component, follow these steps:

### 1. Import the RDF Memory Card

```tsx
// In MemoryContent.tsx
import { RDFMemoryCard } from './RDFMemoryCard';
```

### 2. Add to the Memory Content

```tsx
export function MemoryContent() {
  // ... existing code ...

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* Personal Context Card */}
      <PersonalContextCard />

      {/* Neo4j Brain Memory Card */}
      {/* ... existing Neo4j card ... */}

      {/* RDF Semantic Analysis Card - ADD THIS */}
      <RDFMemoryCard />

      {/* Other memory cards */}
      <CalendarMemoryCard />
      <EmailMemoryCard />
      <TasksMemoryCard />
      <ContactsMemoryCard />
    </ScrollView>
  );
}
```

## Using RDF Hooks in Other Components

### Basic Concept Extraction

```tsx
import { useRDF } from '~/hooks/useRDF';

function MyComponent() {
  const { concepts, sentiment, intent, isLoading } = useRDF();
  
  if (isLoading) return <ActivityIndicator />;
  
  return (
    <View>
      {concepts.map(concept => (
        <Text key={concept.name}>
          {concept.name} - {concept.type}
        </Text>
      ))}
    </View>
  );
}
```

### Message Analysis for Contact Resolution

```tsx
import { useContactResolution } from '~/hooks/useRDF';

function MessageAnalyzer() {
  const [message, setMessage] = useState('');
  const resolution = useContactResolution(message);
  
  return (
    <View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message..."
      />
      
      {resolution.analysis && (
        <View>
          <Text>Contact: {resolution.primaryContact}</Text>
          <Text>Intent: {resolution.intent}</Text>
          <Text>Confidence: {resolution.confidence * 100}%</Text>
          <Text>Variations: {resolution.variations.join(', ')}</Text>
        </View>
      )}
    </View>
  );
}
```

### Custom RDF Queries

```tsx
import { useRDFAnalysis } from '~/hooks/useRDF';

function CustomAnalysis() {
  const { analyzeMessage, extractConcepts, expandContactName } = useRDFAnalysis();
  
  // Analyze a specific message
  const messageAnalysis = analyzeMessage('Email John about the meeting');
  
  // Extract concepts from text
  const conceptExtraction = extractConcepts('Machine learning and AI technologies');
  
  // Expand contact names
  const nameVariations = expandContactName('Alex');
  
  return (
    <View>
      {/* Use the results */}
    </View>
  );
}
```

### RDF Service Health Check

```tsx
import { useRDFStatus } from '~/hooks/useRDF';

function ServiceStatus() {
  const { isHealthy, isAvailable, serviceVersion } = useRDFStatus();
  
  return (
    <View>
      <Text>RDF Service: {isHealthy ? '✅' : '❌'}</Text>
      <Text>Available: {isAvailable ? 'Yes' : 'No'}</Text>
      <Text>Version: {serviceVersion}</Text>
    </View>
  );
}
```

## Testing the Integration

1. Start the MCP service on port 8000
2. Start the Python RDF service on port 8001
3. Run your React Native app
4. The RDF Memory Card should appear in the Memory tab
5. Test message analysis and concept extraction

## Available Hooks

- `useRDF()` - Basic concept extraction with default query
- `useRDFAnalysis()` - Advanced analysis functions
- `useContactResolution(message)` - Complete contact resolution workflow
- `useRDFStatus()` - Service health and status checks

## Type Safety

All hooks are fully typed through tRPC, so you get:
- Autocomplete for all data properties
- Type-safe error handling
- Proper response types from the API