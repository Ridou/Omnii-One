# Composio Auth Refactor Implementation Plan

## 🎯 Objective
Refactor all Google service plugins to use custom OAuth tokens from Supabase instead of Composio connection logic, while maintaining integration IDs for tool definitions.

## 📋 Current State Analysis

### ✅ Already Implemented
- `TasksPlugin`: Uses custom OAuth via `this.manager.getGoogleOAuthToken(userId)`
- `UnifiedGoogleManager`: Has OAuth refresh logic and `useCustomAuthOnly` flag for TASKS
- Supabase OAuth token storage with automatic refresh

### ❌ Needs Migration
- `CalendarPlugin`: Still uses `composio.handleToolCall()`
- `EmailPlugin`: Still uses `composio.handleToolCall()`
- `ContactsPlugin`: Still uses `composio.handleToolCall()` (but has some custom actions)

## 🚀 Implementation Strategy

### Phase 1: Centralize Tool Execution Logic

#### 1.1 Create Unified Tool Executor in UnifiedGoogleManager
```typescript
// Add to unified-google-manager.ts
async executeToolCallWithCustomAuth(
  userId: string,
  serviceType: GoogleServiceType,
  toolCall: any,
  appName: string,
  baseUrl?: string
): Promise<any> {
  // Get fresh OAuth token (auto-refresh included)
  const oauthToken = await this.getGoogleOAuthToken(userId);
  
  // Execute with custom auth
  const result = await this.composio.client.actions.execute({
    actionName: toolCall.function.name,
    requestBody: {
      input: JSON.parse(toolCall.function.arguments),
      appName,
      authConfig: {
        base_url: baseUrl,
        parameters: [{
          name: "Authorization",
          value: `Bearer ${oauthToken.access_token}`,
          in: "header"
        }]
      }
    }
  });
  
  return result;
}
```

#### 1.2 Update Integration Config
```typescript
// Update all services to use custom auth
private integrations: Record<GoogleServiceType, GoogleIntegrationConfig> = {
  [GoogleServiceType.CALENDAR]: {
    integrationId: "6bdc82b8-303c-4142-a0a0-2d09c9d50d8c",
    appName: "googlecalendar",
    serviceName: "Google Calendar",
    useCustomAuthOnly: true, // NEW
  },
  [GoogleServiceType.CONTACTS]: {
    integrationId: "6a21e913-779a-4217-99f5-33605a18ba78",
    appName: "googlesuper", 
    serviceName: "Google Contacts",
    useCustomAuthOnly: true, // NEW
  },
  [GoogleServiceType.TASKS]: {
    integrationId: "0e31d0bb-cf27-49d9-9ff1-83bab06829df",
    appName: "googletasks",
    serviceName: "Google Tasks",
    useCustomAuthOnly: true, // EXISTING
  },
  [GoogleServiceType.EMAIL]: {
    integrationId: "40d7ffa0-2bd9-4c34-87f2-64f932a09aa4",
    appName: "gmail",
    serviceName: "Gmail", 
    useCustomAuthOnly: true, // NEW
  },
};
```

### Phase 2: Plugin Interface Enhancement

#### 2.1 Add Helper Method to GoogleServicePlugin Interface
```typescript
// Add to google-service-plugin.ts
export interface GoogleServicePlugin {
  // ... existing methods ...
  
  // NEW: Helper to execute tool calls with custom auth
  executeToolCall?(
    toolCall: any,
    userId: string,
    composio: OpenAIToolSet
  ): Promise<any>;
}
```

#### 2.2 Add Base Tool Execution Method to Plugins
```typescript
// Add to each plugin class
protected async executeToolCall(
  toolCall: any,
  userId: string,
  composio: OpenAIToolSet
): Promise<any> {
  if (!this.manager) {
    console.warn(`[${this.serviceType}Plugin] No manager available, falling back to standard auth`);
    return await composio.handleToolCall({ choices: [{ message: { tool_calls: [toolCall] } }] }, userId);
  }

  const config = this.getServiceConfig();
  return await this.manager.executeToolCallWithCustomAuth(
    userId,
    this.serviceType,
    toolCall,
    config.appName,
    config.baseUrl
  );
}
```

### Phase 3: Plugin-Specific Migrations

#### 3.1 CalendarPlugin Refactor
```typescript
// Replace in calendar-plugin.ts processMessage()
// OLD:
const toolResponse = await composio.handleToolCall(response, userId);

// NEW:  
const toolCalls = response.choices[0].message.tool_calls;
const toolResponses = [];
for (const toolCall of toolCalls) {
  const result = await this.executeToolCall(toolCall, userId, composio);
  toolResponses.push(result);
}
const toolResponse = toolResponses[0]; // or combine multiple
```

#### 3.2 EmailPlugin Refactor  
```typescript
// Replace in email-plugin.ts processMessage()
// OLD:
const toolResponse = await composio.handleToolCall(response, userId);

// NEW:
const toolCalls = response.choices[0].message.tool_calls;
const toolResponses = [];
for (const toolCall of toolCalls) {
  const result = await this.executeToolCall(toolCall, userId, composio);
  toolResponses.push(result);
}
const toolResponse = toolResponses[0];
```

#### 3.3 ContactsPlugin Migration
```typescript
// Update contacts-plugin.ts to use unified approach
// Keep custom actions but use executeToolCall for standard ones
// OLD:
const toolResponse = await composio.handleToolCall(response, userId);

// NEW:
const toolCalls = response.choices[0].message.tool_calls;
const result = await this.executeToolCall(toolCalls[0], userId, composio);
```

#### 3.4 TasksPlugin Cleanup
```typescript
// Simplify tasks-plugin.ts by removing duplicated auth logic
// Replace custom auth blocks with:
const result = await this.executeToolCall(toolCall, userId, composio);
```

### Phase 4: Service-Specific Configurations

#### 4.1 Add Service Configs to Each Plugin
```typescript
// Add to each plugin
private getServiceConfig() {
  const configs = {
    [GoogleServiceType.CALENDAR]: {
      appName: "googlecalendar",
      baseUrl: "https://www.googleapis.com/calendar/v3"
    },
    [GoogleServiceType.TASKS]: {
      appName: "googletasks", 
      baseUrl: "https://tasks.googleapis.com/tasks/v1"
    },
    [GoogleServiceType.EMAIL]: {
      appName: "gmail",
      baseUrl: "https://gmail.googleapis.com/gmail/v1"
    },
    [GoogleServiceType.CONTACTS]: {
      appName: "googlesuper",
      baseUrl: "https://people.googleapis.com/v1"
    }
  };
  return configs[this.serviceType];
}
```

## 📝 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Add `executeToolCallWithCustomAuth()` to UnifiedGoogleManager
- [ ] Set `useCustomAuthOnly: true` for all services in integration config
- [ ] Test OAuth token refresh flow works for all services

### Phase 2: Plugin Interface  
- [ ] Add `executeToolCall()` helper method to plugin interface
- [ ] Add base implementation to each plugin class
- [ ] Add service-specific configurations

### Phase 3: Plugin Migrations
- [ ] Refactor CalendarPlugin to use custom auth
- [ ] Refactor EmailPlugin to use custom auth  
- [ ] Update ContactsPlugin to use unified approach
- [ ] Simplify TasksPlugin by removing duplicated auth logic

### Phase 4: Testing & Validation
- [ ] Test each plugin with custom OAuth tokens
- [ ] Verify token refresh works before API calls
- [ ] Ensure error handling for auth failures
- [ ] Test fallback to standard auth if needed

### Phase 5: Cleanup
- [ ] Remove unused Composio connection logic
- [ ] Update documentation
- [ ] Add logging for auth method used
- [ ] Performance testing with new auth flow

## 🚨 Potential Blockers & Solutions

### Issue 1: Different API Base URLs
**Solution**: Add `baseUrl` to service configs and pass to auth config

### Issue 2: Service-Specific Auth Requirements  
**Solution**: Allow per-service auth config overrides in `executeToolCallWithCustomAuth()`

### Issue 3: Custom Actions in ContactsPlugin
**Solution**: Keep custom actions but ensure they use the same OAuth token retrieval pattern

### Issue 4: Error Handling Consistency
**Solution**: Standardize error handling in `executeToolCallWithCustomAuth()` with fallback options

## 🎯 Success Criteria

- [ ] All plugins use custom OAuth tokens from Supabase
- [ ] No Composio connection dependency (except for tool definitions)  
- [ ] Automatic token refresh before each API call
- [ ] Consistent auth logic across all plugins
- [ ] Improved error handling and logging
- [ ] Performance equivalent or better than current implementation

## 📊 Impact Assessment

### Benefits
- ✅ Unified auth logic across all Google services
- ✅ Direct control over OAuth token lifecycle  
- ✅ Reduced dependency on Composio connection management
- ✅ Better error handling and debugging
- ✅ More reliable token refresh

### Risks  
- ⚠️ Breaking changes during migration
- ⚠️ Need thorough testing of all service combinations
- ⚠️ Potential auth config differences between services

### Mitigation
- 🛡️ Implement fallback to standard Composio auth
- 🛡️ Comprehensive testing plan for each service
- 🛡️ Gradual rollout with feature flags
- 🛡️ Detailed logging for debugging auth issues 