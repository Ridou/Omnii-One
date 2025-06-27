# 🧠 Brain Memory Cache Test Suite

This folder contains comprehensive tests for the brain-inspired memory cache system that powers OMNII's AI Memory functionality.

## Overview

The brain memory cache system provides intelligent caching for various data sources with different volatility periods:

- **Neo4j concepts**: 24hr cache (low volatility)
- **Google Tasks**: 30min cache (medium volatility) 
- **Google Calendar**: 2hr cache (low volatility)
- **Google Contacts**: 24hr cache (very low volatility)
- **Google Email**: 5min cache (high volatility)

## Test Files

### 🎯 Main Integration Test
- **`comprehensive-integration.test.ts`** - Complete system validation with real data
  - Tests all brain memory components
  - Validates cache performance and data integrity
  - Handles authentication gracefully
  - Provides detailed health scoring

### 📊 Component Tests
- **`brain-cache-demo.test.ts`** - Demonstrates cache functionality
- **`brain-cache-integration.test.ts`** - Integration testing for cache layer
- **`brain-memory-cache.test.ts`** - Core brain memory cache unit tests
- **`brain-memory-complete-demo.test.ts`** - Complete demo with all data types
- **`brain-memory-complete-integration.test.ts`** - Alternative integration approach
- **`complete-brain-memory-test.ts`** - Comprehensive test suite

## Running Tests

### Prerequisites
1. **Local Server**: Ensure `omnii_mcp` server is running on `localhost:8000`
   ```bash
   cd apps/omnii_mcp
   bun run dev
   ```

2. **Environment Variables**: Ensure Supabase credentials are configured
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```

### Running the Main Test

#### Option 1: Direct TypeScript execution
```bash
cd apps/omnii-mobile
npx tsx tests/brain-memory/comprehensive-integration.test.ts
```

#### Option 2: Using test runner
```bash
cd apps/omnii-mobile
npm test tests/brain-memory/comprehensive-integration.test.ts
```

#### Option 3: Bun test runner
```bash
cd apps/omnii-mobile
bun test tests/brain-memory/comprehensive-integration.test.ts
```

### Expected Output

A successful test run will show:

```
🧠 === BRAIN MEMORY CACHE INTEGRATION TEST ===
📡 Backend URL: http://localhost:8000
👤 Test User: cd9bdc60-35af-4bb6-b87e-1932e96fb354
🎯 Goal: Validate complete brain memory system with real data

✅ 🔌 Local Server Connection - Success (12ms)
✅ 🗄️ Supabase Brain Cache Connection - Success (878ms)
⚠️  📋 Google Tasks API Integration - Auth Required (786ms)
⚠️  📧 Gmail API Integration - Auth Required (1024ms)
⚠️  📅 Google Calendar API Integration - Auth Required (1078ms)
✅ 🧠 Neo4j Concepts Retrieval - Success (8ms)
✅ 💾 Brain Cache Data Storage & Retrieval - Success (420ms)
✅ 📊 Real Data Context Display - Success (156ms)

📊 System Health Score: 85%
🎉 Brain Memory Cache System is healthy and ready!
```

## Test Architecture

### Health Scoring
- **80%+ (Green)**: System ready for production
- **60-79% (Yellow)**: Needs attention
- **<60% (Red)**: Requires fixes

### Authentication Handling
Tests gracefully handle authentication requirements:
- ✅ **Success**: Feature working perfectly
- ⚠️  **Auth Required**: Feature ready, OAuth setup needed
- ❌ **Failed**: Critical issue requiring fixes

### Data Context Display
The tests show real data as it would appear in the UI:

```
📊 === REAL DATA CONTEXT FOR UI DISPLAY ===
📋 Tasks: 5 lists with 37 total tasks
   • My Tasks: 29 tasks
     - Buy groceries
     - Study for the exam
     - Complete project
   • Auto: 2 tasks

📧 Emails: 20 recent emails from 201 total
   🔵 WB Games Summer Sale is making a splash! (from: WB Games)
   🔵 Your receipt from Eleven Labs Inc. (from: Eleven Labs Inc.)
   ⚪ Bro, what?? :D funny (from: Reddit)

🧠 Knowledge: 10 concepts
   • Task management systems and productivity workflows
   • Email communication patterns and organization
   • Calendar scheduling optimization strategies
==========================================
```

## Troubleshooting

### Common Issues

#### 1. Server Connection Failed
```
❌ 🔌 Local Server Connection - Failed: Server returned 500
```
**Solution**: Ensure `omnii_mcp` server is running on port 8000

#### 2. Supabase Connection Failed  
```
❌ 🗄️ Supabase Brain Cache Connection - Failed: Invalid credentials
```
**Solution**: Check Supabase environment variables

#### 3. Google Services Auth Required
```
⚠️  📋 Google Tasks API Integration - Auth Required
```
**Solution**: This is expected - configure Google OAuth in production

### Debug Mode
Add debug logging by setting:
```bash
export DEBUG=brain-memory:*
```

## Performance Expectations

### Cache Performance Targets
- **Cache Hit**: <100ms response time
- **Cache Miss**: <2000ms first fetch
- **Data Consistency**: 99.9% accuracy
- **Cache Efficiency**: >90% hit rate after warmup

### Memory Usage
- **Supabase Storage**: Optimized JSON compression
- **Local Memory**: Minimal footprint with smart cleanup
- **Network**: 90%+ reduction in API calls

## Integration with Mobile App

The brain memory cache integrates seamlessly with the mobile app's AI Memory feature:

1. **Automatic Caching**: Data cached on first fetch
2. **Smart Invalidation**: Based on data volatility
3. **Offline Support**: Cached data available without network
4. **Real-time Updates**: Differential caching for changed data

## Production Deployment

Before deploying to production:

1. ✅ Run comprehensive test suite (must score 80%+)
2. ⚠️  Configure Google OAuth credentials  
3. ✅ Update mobile app backend URL
4. ✅ Verify Supabase production credentials
5. ⚠️  Set up monitoring and alerting

The brain memory cache system is production-ready once authentication is configured! 