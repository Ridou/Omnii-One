# n8n Memory Bridge Testing Guide

This guide covers testing the n8n Memory Bridge API implementation with Bun testing framework.

## 🚀 Quick Start

### Prerequisites
- Bun runtime installed
- MCP server running (local or production)
- Neo4j database configured
- Valid Supabase user ID for testing

### Environment Setup

The tests support dynamic environment switching:

```bash
# Test against localhost (default)
bun run test:n8n

# Test against production
OMNII_TEST_ENV=PROD bun run test:n8n

# Manual testing script
bun run test:n8n-manual
```

## 🧪 Available Test Scripts

### Core n8n Memory Tests
```bash
# Run basic n8n memory API tests
bun run test:n8n

# Run workflow integration tests
bun run test:n8n-workflow

# Run all n8n tests
bun run test:n8n-all
```

### Manual Testing
```bash
# Interactive manual testing
bun run test:n8n-manual

# With production environment
OMNII_TEST_ENV=PROD bun run test:n8n-manual
```

### Individual Test Files
```bash
# Basic API functionality
bun test tests/n8n-memory.test.js

# Workflow integration scenarios
bun test tests/n8n-workflow.test.js

# Manual endpoint testing
bun tests/manual-n8n-test.js
```

## 📋 Test Coverage

### 1. Basic Memory Operations (`n8n-memory.test.js`)

**API Endpoints Tested:**
- `POST /api/n8n-memory/store-memory` - Store workflow execution memories
- `GET /api/n8n-memory/retrieve-memory` - Retrieve stored memories
- `POST /api/n8n-memory/store-concept` - Store workflow-discovered concepts
- `GET /api/n8n-memory/search-concepts` - Search existing concepts
- `POST /api/n8n-memory/create-relationship` - Create concept relationships
- `GET /api/n8n-memory/get-context` - Get context for workflows
- `GET /api/n8n-memory/workflow-stats` - Get workflow statistics

**Validation Tests:**
- ✅ User ID format validation (Supabase UUID)
- ✅ Required field validation
- ✅ Error handling and status codes
- ✅ Data persistence verification

### 2. Workflow Integration (`n8n-workflow.test.js`)

**Workflow Scenarios:**
- ✅ Complete workflow execution simulation
- ✅ Multi-execution learning progression
- ✅ Memory retrieval and context building
- ✅ Cross-workflow concept relationships

**Customer Support Simulation:**
- Billing inquiries
- Technical support issues
- General service questions
- Learning improvement tracking

### 3. Manual Testing (`manual-n8n-test.js`)

**Interactive Testing:**
- ✅ Health check validation
- ✅ All endpoint testing with detailed output
- ✅ Error scenario validation
- ✅ Performance timing measurement
- ✅ Environment information display

## 🔧 Environment Configuration

### Local Development
```bash
# Default - tests against localhost:3000
bun run test:n8n
```

### Production Testing
```bash
# Tests against https://omniimcp-production.up.railway.app
OMNII_TEST_ENV=PROD bun run test:n8n
```

### Environment Variables
```bash
# Test environment selection
OMNII_TEST_ENV=LOCAL    # Default: localhost:3000
OMNII_TEST_ENV=PROD     # Production: Railway app

# Neo4j configuration (from your .env)
NEO4J_URI=neo4j+s://d066c29d.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=_o0JebFPkSb51lSjC7BUqdsvDhD4e5bYGFV1uoVv3QE
NEO4J_DATABASE=neo4j
```

## 📊 Test Data

### Test User
```javascript
USER_ID: "cd9bdc60-35af-4bb6-b87e-1932e96fb354"
```

### Test Workflows
- `customer_support_test` - Main testing workflow
- `billing_automation` - Billing-specific workflows
- `tech_support_workflow` - Technical support automation
- `general_inquiry_handler` - General inquiry processing

### Sample Test Data
```javascript
{
  workflow_id: "customer_support_test",
  execution_id: "exec_1704649200000_1",
  key: "test_interaction_1704649200000",
  value: {
    message: "Hello from n8n test!",
    customer_data: {
      satisfaction: 9,
      resolved: true,
      duration: 120
    },
    ai_context: {
      concepts_used: ["customer_service", "billing_support"],
      confidence: 0.95
    }
  }
}
```

## 🎯 Testing Scenarios

### Basic Workflow Memory
1. **Store Memory** - Store workflow execution data
2. **Retrieve All** - Get all memories for a workflow
3. **Retrieve Specific** - Get memory by specific key
4. **Validate Data** - Ensure data integrity

### Concept Learning
1. **Store Concept** - Save workflow-discovered concepts
2. **Search Concepts** - Find relevant concepts by query
3. **Create Relationships** - Link related concepts
4. **Context Building** - Aggregate context for workflows

### Integration Testing
1. **Multi-Execution** - Simulate multiple workflow runs
2. **Learning Progress** - Track improvement over time
3. **Cross-Workflow** - Test concept sharing between workflows
4. **Performance** - Measure response times and efficiency

## 🐛 Debugging Tests

### Verbose Output
```bash
# Enable detailed logging
DEBUG=1 bun run test:n8n

# Check specific test
bun test tests/n8n-memory.test.js --verbose
```

### Test Isolation
```bash
# Run single test scenario
bun test tests/n8n-memory.test.js -t "Store workflow memory"

# Run without API dependency
API_MOCK=true bun run test:n8n
```

### Common Issues

**API Connection Issues:**
```bash
# Check if server is running
curl http://localhost:3000/health

# Test basic connectivity
bun tests/manual-n8n-test.js
```

**Neo4j Connection Issues:**
```bash
# Verify Neo4j credentials in .env
# Check network connectivity to Neo4j Aura
# Review test logs for connection errors
```

**User ID Issues:**
```bash
# Ensure USER_ID is valid Supabase UUID
# Check user exists in Neo4j database
# Verify user permissions
```

## 📈 Test Results Analysis

### Success Metrics
- ✅ All API endpoints respond with 200 status
- ✅ Data persistence works correctly
- ✅ User isolation is maintained
- ✅ Error handling works properly
- ✅ Performance meets expectations

### Learning Metrics
- Workflow execution count increases
- Memory storage grows over time
- Concept relationships develop
- Context quality improves
- Customer satisfaction trends upward

### Sample Output
```
🧠 Starting n8n Memory Bridge API Tests
🔗 Using API: http://localhost:3000/api/n8n-memory
👤 Test User ID: cd9bdc60-35af-4bb6-b87e-1932e96fb354

✅ API health and connectivity check
✅ Store workflow memory
✅ Retrieve workflow memory - all memories
✅ Store concept from workflow
✅ Search concepts
✅ Get workflow statistics

📊 Test Summary:
   - API Available: Yes
   - Stored Memory ID: 4:12345:abcd
   - Test Workflow ID: customer_support_test
```

## 🔄 Continuous Testing

### Pre-Implementation Testing
```bash
# Run before implementing routes
bun run test:n8n-manual  # Should fail initially
```

### Development Testing
```bash
# Run during implementation
bun run test:n8n  # Test individual endpoints
```

### Integration Testing
```bash
# Run after route implementation
bun run test:n8n-all  # Full test suite
```

### Production Validation
```bash
# Test against production
OMNII_TEST_ENV=PROD bun run test:n8n-all
```

## 📝 Next Steps

1. **Run Initial Tests** - Verify current setup
2. **Implement Routes** - Create the n8n memory bridge
3. **Validate Implementation** - Run full test suite
4. **Performance Testing** - Measure and optimize
5. **Production Deploy** - Test against live environment

This testing framework ensures your n8n Memory Bridge implementation is robust, reliable, and ready for production use! 🚀 