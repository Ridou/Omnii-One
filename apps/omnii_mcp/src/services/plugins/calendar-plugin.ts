import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import {
  GoogleServicePlugin,
  GoogleServiceType,
  IOAuthTokenManager
} from "../integrations/google-service-plugin";
import { ExecutionContextType } from "../../types/action-planning.types";
import {
  UnifiedToolResponse,
  UnifiedResponseBuilder,
  CalendarData,
  CalendarListData,
  UnifiedAction,
  ServiceType
} from "@omnii/validators";

export class CalendarPlugin implements GoogleServicePlugin {
  serviceType = GoogleServiceType.CALENDAR;
  private manager?: IOAuthTokenManager; // Manager reference for OAuth token access

  /**
   * Set the manager reference for OAuth token access
   */
  setManager(manager: IOAuthTokenManager): void {
    this.manager = manager;
  }

  /**
   * Detect calendar-related messages (conservative - only used as AI fallback)
   */
  isServiceMessage(message: string): boolean {
    const msg = message.toLowerCase();

    // Exclude intervention and system messages
    if (
      msg.includes("resolve user intervention") ||
      msg.includes("user intervention") ||
      msg.includes("intervention_") ||
      msg.includes("session_") ||
      msg.startsWith("system:")
    ) {
      return false;
    }

    // ✅ Enhanced calendar message detection
    return (
      // Calendar keyword starters
      msg.startsWith("calendar") ||
      msg.startsWith("show") ||
      msg.startsWith("list") ||
      msg.startsWith("what") ||
      msg.startsWith("my") ||
      
      // Event operations  
      msg.startsWith("list events") ||
      msg.startsWith("show events") ||
      msg.startsWith("create event") ||
      msg.startsWith("schedule meeting") ||
      msg.startsWith("book appointment") ||
      msg.startsWith("find event") ||
      msg.startsWith("search event") ||
      
      // Free time operations
      msg.startsWith("find free") ||
      msg.startsWith("when am i free") ||
      msg.startsWith("available time") ||
      msg.startsWith("free slots") ||
      
      // Calendar content indicators
      (msg.includes("calendar") && (
        msg.includes("show") || 
        msg.includes("list") || 
        msg.includes("what") ||
        msg.includes("my")
      )) ||
      
      (msg.includes("event") && (
        msg.includes("list") ||
        msg.includes("show") ||
        msg.includes("create") ||
        msg.includes("schedule") ||
        msg.includes("find") ||
        msg.includes("search")
      )) ||
      
      (msg.includes("meeting") && (
        msg.includes("schedule") ||
        msg.includes("book") ||
        msg.includes("create") ||
        msg.includes("find")
      )) ||
      
      // Shorthand patterns
      msg === "my calendar" ||
      msg === "my events" ||
      msg === "upcoming events" ||
      msg === "today's events" ||
      msg === "what's on my calendar" ||
      msg === "show my schedule" ||
      msg === "calendar today" ||
      msg === "calendar this week"
    );
  }

  /**
   * Process calendar-specific messages
   */
  async processMessage(
    message: string,
    userId: string,
    context: ExecutionContextType,
    activeConnection: any,
    composio: OpenAIToolSet,
    openai: OpenAI
  ): Promise<UnifiedToolResponse> {
    const builder = new UnifiedResponseBuilder(ServiceType.CALENDAR, userId);

    try {
      console.log(`[CalendarPlugin] Processing message: "${message}"`);
      console.log(`[CalendarPlugin] Using connection: ${activeConnection?.id}`);

      // Use OpenAI to decide which tool to use and parameters
      const tools = await composio.getTools({
        actions: Object.keys(this.getServiceActions()),
      });

      console.log(`[CalendarPlugin] Available tools:`, tools.length);
      console.log(`[CalendarPlugin] 🔧 DETAILED TOOL ANALYSIS:`);
      tools.forEach((tool, index) => {
        console.log(`[CalendarPlugin] Tool ${index + 1}:`, {
          type: tool.type,
          function: {
            name: tool.function?.name,
            description: tool.function?.description?.substring(0, 100) + '...',
            hasParameters: !!tool.function?.parameters,
            parameterKeys: tool.function?.parameters ? Object.keys(tool.function.parameters) : [],
          }
        });
      });
      
      console.log(`[CalendarPlugin] Requested actions:`, this.getServiceActions());
      console.log(`[CalendarPlugin] Tool function names:`, tools.map(t => t.function?.name));

      const systemPrompt = this.buildSystemPrompt(userId);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        tools: tools,
        tool_choice: "required", // ✅ Force tool usage
      });

      console.log(`[CalendarPlugin] OpenAI response:`, {
        hasToolCalls: !!response.choices[0].message.tool_calls,
        toolCallsCount: response.choices[0].message.tool_calls?.length || 0
      });

      if (response.choices[0].message.tool_calls) {
        console.log(`[CalendarPlugin] Making tool call...`);
        try {
          if (this.manager) {
            console.log(`[CalendarPlugin] 🔐 Using custom OAuth tokens from Supabase for user: ${userId}`);
            
            // Get OAuth token from Supabase via the manager
            const oauthToken = await this.manager.getGoogleOAuthToken(userId);
            console.log(`[CalendarPlugin] ✅ OAuth token retrieved successfully`);

            // Execute tool calls with custom bearer token
            const toolResponses = [];  
            for (const toolCall of response.choices[0].message.tool_calls) {  
              try {
                console.log(`[CalendarPlugin] 🔧 Executing ${toolCall.function.name} with custom auth`);
                
                const result = await composio.client.actions.execute({  
                  actionName: toolCall.function.name,  
                  requestBody: {  
                    input: JSON.parse(toolCall.function.arguments),  
                    appName: "googlecalendar",
                    authConfig: {  
                      parameters: [  
                        {  
                          name: "Authorization",  
                          value: `Bearer ${oauthToken.access_token}`,  
                          in: "header"  
                        }  
                      ]  
                    }  
                  }  
                });  
                toolResponses.push(JSON.stringify(result));  
              } catch (error) {  
                console.error(`[CalendarPlugin] ❌ Error executing tool call ${toolCall.function.name}:`, error);  
                toolResponses.push(JSON.stringify({ 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                }));  
              }  
            }
            
            // Use the first response or combine them
            const toolResponse = toolResponses.length > 0 ? toolResponses[0] : null;

            let parsed;
            try {
              if (!toolResponse) {
                throw new Error('No tool response received');
              }
              parsed = Array.isArray(toolResponse)
                ? JSON.parse(toolResponse[0])
                : JSON.parse(toolResponse);
            } catch (e) {
              parsed = toolResponse;
            }

            console.log(`[CalendarPlugin] Parsed result:`, {
              successful: parsed.successful,
              hasData: !!parsed.data,
              action: parsed.action,
              resultKeys: Object.keys(parsed),
              dataKeys: parsed.data ? Object.keys(parsed.data) : 'no data'
            });

            // Log the structure outline of the raw Calendar API response
            console.log(`[CalendarPlugin] 📋 RAW CALENDAR API RESPONSE STRUCTURE:`);
            const structureOutline = this.getObjectStructure(parsed);
            console.log(structureOutline);

            // Server-side parsing and formatting
            return this.formatCalendarResponse(message, parsed, builder);
          }
        } catch (error) {
          console.error(`[CalendarPlugin] ❌ Error in custom OAuth flow:`, error);
          throw error;
        }
      }

      // ✅ This should never happen with tool_choice: "required"
      return builder
        .setSuccess(false)
        .setTitle("❌ Calendar Request Failed")
        .setSubtitle("Tool selection error")
        .setContent("I couldn't determine which calendar action to take. Please be more specific.")
        .setMessage("No tool calls in response despite required tool choice")
        .addAction({
          id: "try_create_event",
          label: "Try Create Event",
          type: "primary",
          icon: "➕"
        })
        .addAction({
          id: "list_events",
          label: "List Events",
          type: "secondary",
          icon: "📅"
        })
        .setMetadata({
          category: 'calendar',
          confidence: 0,
          timestamp: new Date().toISOString(),
          source: 'Google Calendar'
        })
        .build();

    } catch (error) {
      console.error(`[CalendarPlugin] Error processing calendar:`, error);
      return builder
        .setSuccess(false)
        .setTitle("❌ Calendar Error")
        .setSubtitle("Processing failed")
        .setContent("Sorry, I had trouble with that calendar request.")
        .setMessage(error instanceof Error ? error.message : "Unknown error")
        .addAction({
          id: "retry_request",
          label: "Retry Request",
          type: "primary",
          icon: "🔄"
        })
        .setMetadata({
          category: 'calendar',
          confidence: 0,
          timestamp: new Date().toISOString(),
          source: 'Google Calendar'
        })
        .build();
    }
  }

  private formatCalendarResponse(
    originalMessage: string, 
    parsed: any, 
    builder: UnifiedResponseBuilder
  ): UnifiedToolResponse {
    // Check if the operation failed
    if (!parsed.successful && parsed.data?.error) {
      return builder
        .setSuccess(false)
        .setTitle("❌ Calendar Operation Failed")
        .setSubtitle("Google Calendar Error")
        .setContent(`Error: ${parsed.data.error}`)
        .setMessage(`Calendar operation failed: ${parsed.data.error}`)
        .addAction({
          id: "retry_request",
          label: "Try Again",
          type: "primary",
          icon: "🔄"
        })
        .setMetadata({
          category: 'calendar',
          confidence: 0,
          timestamp: new Date().toISOString(),
          source: 'Google Calendar'
        })
        .build();
    }

    const action = this.detectActionFromMessage(originalMessage);
    
    switch (action) {
      case "list_events":
        return this.formatEventsList(parsed, builder);
      case "create_event":
        return this.formatCreatedEvent(parsed, builder);
      case "find_free_slots":
        return this.formatFreeSlots(parsed, builder);
      case "find_event":
        return this.formatFoundEvents(parsed, builder);
      default:
        return this.formatGenericCalendar(parsed, builder, action);
    }
  }

  private formatEventsList(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    console.log(`[CalendarPlugin] 📋 FORMATTING EVENTS LIST:`, {
      successful: parsed.successful,
      hasData: !!parsed.data,
      dataKeys: parsed.data ? Object.keys(parsed.data) : [],
      structureOutline: this.getObjectStructure(parsed)
    });

    // ✅ Enhanced event extraction for multiple API response formats
    const events = parsed?.data?.event_data?.event_data ||     // Nested event_data
                  parsed?.data?.response_data?.items ||        // Google Calendar API items
                  parsed?.data?.response_data?.events ||       // Alternative events field
                  parsed?.data?.items ||                       // Direct items
                  parsed?.data?.events ||                      // Direct events
                  parsed?.data ||                              // Data is events array
                  [];

    console.log(`[CalendarPlugin] 📅 EXTRACTED EVENTS:`, {
      eventsType: typeof events,
      isArray: Array.isArray(events),
      eventsLength: Array.isArray(events) ? events.length : 'not array',
      firstEventKeys: Array.isArray(events) && events.length > 0 ? Object.keys(events[0]) : []
    });

    if (!Array.isArray(events) || events.length === 0) {
      return builder
        .setSuccess(true)
        .setTitle("📅 Calendar Events")
        .setSubtitle("No events found")
        .setContent("No upcoming events found in the specified time range")
        .setMessage("📅 No upcoming events found")
        .addAction({
          id: "create_event",
          label: "Create Event",
          type: "primary",
          icon: "➕"
        })
        .addAction({
          id: "expand_range",
          label: "Expand Time Range",
          type: "secondary",
          icon: "📅"
        })
        .setMetadata({
          category: 'calendar',
          confidence: 90,
          timestamp: new Date().toISOString(),
          source: 'Google Calendar'
        })
        .build();
    }

    // ✅ Enhanced CalendarListData creation with better field mapping
    const calendarListData: CalendarListData = {
      events: events.map((event: any) => ({
        title: event.summary || event.title || "(No title)",
        start: this.parseDateTime(event.start),
        end: this.parseDateTime(event.end),
        attendees: this.extractAttendees(event),
        location: event.location || undefined,
        description: event.description || undefined,
        meetingLink: event.hangoutLink || 
                    event.conferenceData?.entryPoints?.[0]?.uri || 
                    event.htmlLink || 
                    undefined,
        eventId: event.id || event.eventId
      })),
      totalCount: events.length,
      hasMore: events.length >= 10, // Assuming 10+ might indicate more events
      timeRange: events.length > 0 ? {
        start: this.parseDateTime(events[0]?.start),
        end: this.parseDateTime(events[events.length - 1]?.end)
      } : undefined
    };

    console.log(`[CalendarPlugin] 🎯 CALENDAR LIST DATA CREATED:`, {
      eventsCount: calendarListData.events.length,
      totalCount: calendarListData.totalCount,
      hasTimeRange: !!calendarListData.timeRange,
      firstEventTitle: calendarListData.events[0]?.title,
      firstEventStart: calendarListData.events[0]?.start
    });

    // Enhanced actions for calendar list
    const actions: UnifiedAction[] = [
      {
        id: "create_new_event",
        label: "Create New Event",
        type: "primary",
        icon: "➕",
        command: "create event"
      },
      {
        id: "refresh_events",
        label: "Refresh Events",
        type: "secondary",
        icon: "🔄"
      }
    ];

    // Add context-specific actions
    if (events.length > 0) {
      actions.push({
        id: "open_first_event",
        label: "Open First Event",
        type: "secondary",
        icon: "📖"
      });
    }

    actions.push({
      id: "view_in_calendar",
      label: "View in Google Calendar",
      type: "secondary",
      icon: "🗓️"
    });

    // Compact content for UI
    const content = `Found ${events.length} event${events.length === 1 ? '' : 's'}`;

    const result = builder
      .setSuccess(true)
      .setTitle("📅 Upcoming Events")
      .setSubtitle(`${events.length} event${events.length === 1 ? '' : 's'}`)
      .setContent(content)
      .setMessage(`📅 Upcoming Events:\n${content}`)
      .setStructuredData(calendarListData)
      .setRawData(parsed)
      .setMetadata({ 
        category: 'calendar',
        confidence: 95, 
        source: 'Google Calendar',
        timestamp: new Date().toISOString()
      });

    // Add all actions to the builder
    actions.forEach(action => result.addAction(action));
    
    return result.build();
  }

  private formatCreatedEvent(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    // Check if event creation was successful
    if (!parsed.successful) {
      return builder
        .setSuccess(false)
        .setTitle("❌ Event Creation Failed")
        .setSubtitle("Could not create event")
        .setContent(parsed.data?.error || "Unknown error occurred while creating the event")
        .setMessage(`Event creation failed: ${parsed.data?.error || "Unknown error"}`)
        .addAction({
          id: "retry_create",
          label: "Try Again",
          type: "primary",
          icon: "🔄"
        })
        .setMetadata({
          category: 'calendar',
          confidence: 0,
          timestamp: new Date().toISOString(),
          source: 'Google Calendar'
        })
        .build();
    }

    // Extract event data from various possible response formats
    const eventData = parsed?.data?.event_data || 
                     parsed?.data?.response_data ||
                     parsed?.data ||
                     {};
    
    const title = eventData?.summary || 
                  eventData?.title || 
                  eventData?.subject ||
                  "New Event";

    // Only create structured data if we have valid event data
    let structuredData: CalendarData | undefined;
    
    if (eventData && (eventData.summary || eventData.title)) {
      structuredData = {
        title: title,
        start: this.parseDateTime(eventData?.start),
        end: this.parseDateTime(eventData?.end),
        attendees: this.extractAttendees(eventData),
        location: eventData?.location || undefined,
        description: eventData?.description || undefined,
        meetingLink: eventData?.hangoutLink || eventData?.conferenceData?.entryPoints?.[0]?.uri || undefined,
        eventId: eventData?.id || eventData?.eventId
      };
    }

    const actions: UnifiedAction[] = [
      {
        id: "view_event",
        label: "View Event",
        type: "primary",
        icon: "👁️"
      },
      {
        id: "edit_event",
        label: "Edit Event", 
        type: "secondary",
        icon: "✏️"
      },
      {
        id: "create_another",
        label: "Create Another",
        type: "secondary",
        icon: "➕"
      }
    ];

    const result = builder
      .setSuccess(true)
      .setTitle("✅ Event Created")
      .setSubtitle(title)
      .setContent(`Successfully created "${title}"`)
      .setMessage(`✅ Event created: ${title}`)
      .setRawData(parsed)
      .setMetadata({
        category: 'calendar',
        confidence: 95,
        timestamp: new Date().toISOString(),
        source: 'Google Calendar'
      });

    // Add structured data if available
    if (structuredData) {
      result.setStructuredData(structuredData);
    }

    // Add all actions
    actions.forEach(action => result.addAction(action));
    
    return result.build();
  }

  private formatFreeSlots(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    // Implementation for finding free slots
    return builder
      .setSuccess(true)
      .setTitle("📅 Free Slots")
      .setContent("Free slots found successfully")
      .setMessage(JSON.stringify(parsed, null, 2))
      .setRawData(parsed)
      .build();
  }

  private formatFoundEvents(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    // Implementation for finding events
    return builder
      .setSuccess(true)
      .setTitle("📅 Found Events")
      .setContent("Events found successfully")
      .setMessage(JSON.stringify(parsed, null, 2))
      .setRawData(parsed)
      .build();
  }

  private formatGenericCalendar(parsed: any, builder: UnifiedResponseBuilder, action: string): UnifiedToolResponse {
    return builder
      .setSuccess(true)
      .setTitle("📅 Calendar Operation")
      .setContent(`${action} completed successfully`)
      .setMessage(JSON.stringify(parsed, null, 2))
      .setRawData(parsed)
      .build();
  }

  // Helper methods for extracting calendar data
  private parseDateTime(dateTimeObj: any): string {
    if (!dateTimeObj) return '';
    
    const dateTime = dateTimeObj.dateTime || dateTimeObj.date;
    if (!dateTime) return '';
    
    try {
      return new Date(dateTime).toISOString();
    } catch (e) {
      return dateTime;
    }
  }

  private extractAttendees(event: any): Array<{ email: string; name?: string; status?: 'accepted' | 'declined' | 'pending' }> {
    const attendees = event?.attendees || [];
    return attendees.map((attendee: any) => ({
      email: attendee.email,
      name: attendee.displayName || undefined,
      status: this.mapResponseStatus(attendee.responseStatus)
    }));
  }

  private mapResponseStatus(status: string): 'accepted' | 'declined' | 'pending' {
    switch (status) {
      case 'accepted': return 'accepted';
      case 'declined': return 'declined';
      default: return 'pending';
    }
  }

  private buildSystemPrompt(userId: string): string {
    // ✅ Calculate current time and default ranges
    const now = new Date();
    const currentTime = now.toISOString();
    
    // Calculate last week start (7 days ago, start of day)
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);
    lastWeekStart.setHours(0, 0, 0, 0);
    
    // Calculate this week end (7 days from now, end of day) 
    const thisWeekEnd = new Date(now);
    thisWeekEnd.setDate(now.getDate() + 7);
    thisWeekEnd.setHours(23, 59, 59, 999);
    
    const defaultTimeMin = lastWeekStart.toISOString();
    const defaultTimeMax = thisWeekEnd.toISOString();

    return `You are a Google Calendar assistant. You MUST use one of these Calendar actions for every request:

AVAILABLE ACTIONS:
- GOOGLECALENDAR_LIST_EVENTS: List calendar events (use for "show", "list", "what" + events)
- GOOGLECALENDAR_CREATE_EVENT: Create new calendar events  
- GOOGLECALENDAR_UPDATE_EVENT: Update existing events
- GOOGLECALENDAR_DELETE_EVENT: Delete events
- GOOGLECALENDAR_FIND_EVENT: Find specific events
- GOOGLECALENDAR_FIND_FREE_SLOTS: Find free time slots
- GOOGLECALENDAR_SYNC_EVENTS: Sync calendar events
- GOOGLECALENDAR_LIST_CALENDARS: List available calendars
- GOOGLECALENDAR_GET_CURRENT_DATE_TIME: Get current time

CURRENT TIME CONTEXT:
- Current time: ${currentTime}
- Current date: ${now.toLocaleDateString()}
- Current day: ${now.toLocaleDateString('en-US', { weekday: 'long' })}

MANDATORY RULES:
1. You MUST call a tool for every user request - never respond without using a tool
2. For "list", "show", "what" + "events/calendar" → Use GOOGLECALENDAR_LIST_EVENTS
3. For "create", "add", "schedule" + "event/meeting" → Use GOOGLECALENDAR_CREATE_EVENT
4. For "update", "change", "modify" + event → Use GOOGLECALENDAR_UPDATE_EVENT  
5. For "delete", "remove", "cancel" + event → Use GOOGLECALENDAR_DELETE_EVENT
6. For "find", "search" + specific event → Use GOOGLECALENDAR_FIND_EVENT
7. For "free time", "available" + time → Use GOOGLECALENDAR_FIND_FREE_SLOTS
8. For "list", "show" + "calendar" → Use GOOGLECALENDAR_LIST_CALENDARS
9. For "sync" requests → Use GOOGLECALENDAR_SYNC_EVENTS

REQUIRED PARAMETERS & TIME RANGES:
- Always include userId: "${userId}" in all tool calls
- For LIST_EVENTS: Include time_min and time_max for relevant results
  * Default range: time_min="${defaultTimeMin}", time_max="${defaultTimeMax}" (last week + this week)
  * For "today": use today's start/end times
  * For "this week": use current week start/end
  * For "next week": use next week start/end
- CREATE_EVENT: Always include summary (title), start_datetime, event_duration_minutes
  * If no time specified, use reasonable defaults (1 hour duration, today or tomorrow)
  * Use ISO format: "2024-01-15T14:00:00Z"
  * Default timezone: "UTC"
- FIND_FREE_SLOTS: Include time_min, time_max, and timezone

EXAMPLES:
"Show my events" → GOOGLECALENDAR_LIST_EVENTS with default time range
"What's on my calendar today" → GOOGLECALENDAR_LIST_EVENTS with today's range
"Create event: Kyoto Nightlife" → GOOGLECALENDAR_CREATE_EVENT with summary="Kyoto Nightlife"
"Schedule meeting tomorrow at 2pm" → GOOGLECALENDAR_CREATE_EVENT with appropriate datetime
"Find my dentist appointment" → GOOGLECALENDAR_FIND_EVENT with query
"When am I free tomorrow?" → GOOGLECALENDAR_FIND_FREE_SLOTS with tomorrow's range

You MUST choose and call the most appropriate action. Never respond without using a tool.`;
  }

  /**
   * Detect action type from message
   */
  private detectActionFromMessage(message: string): string {
    const msg = message.toLowerCase();
    
    // ✅ Enhanced action detection with LIST_EVENTS priority
    if (this.isListEventsMessage(message)) {
      return "list_events";
    } else if (this.isFindFreeTimeMessage(message)) {
      return "find_free_slots";
    } else if (
      msg.includes("create") ||
      msg.includes("add") ||
      msg.includes("schedule") ||
      msg.includes("book")
    ) {
      return "create_event";
    } else if (
      msg.includes("update") ||
      msg.includes("change") ||
      msg.includes("modify") ||
      msg.includes("edit")
    ) {
      return "update_event";
    } else if (
      msg.includes("delete") ||
      msg.includes("remove") ||
      msg.includes("cancel")
    ) {
      return "delete_event";
    } else if (
      msg.includes("find") ||
      msg.includes("search") ||
      msg.includes("look for")
    ) {
      return "find_event";
    } else {
      return "general";
    }
  }

  /**
   * Check if requesting to list events
   */
  private isListEventsMessage(message: string): boolean {
    const msg = message.toLowerCase();
    return (
      (msg.includes("list") || msg.includes("show") || msg.includes("what") || msg.includes("my")) &&
      (msg.includes("event") ||
        msg.includes("meeting") ||
        msg.includes("calendar") ||
        msg.includes("schedule"))
    );
  }

  /**
   * Check if requesting free time
   */
  private isFindFreeTimeMessage(message: string): boolean {
    const msg = message.toLowerCase();
    return (
      (msg.includes("free") || msg.includes("available") || msg.includes("open")) &&
      (msg.includes("time") || msg.includes("slot") || msg.includes("when"))
    );
  }

  /**
   * Get available calendar actions with LLM-friendly descriptions
   */
  getServiceActions(): Record<string, string> {
    return {
      "GOOGLECALENDAR_LIST_EVENTS": "List calendar events within a time range. Use time_min and time_max parameters. Default to showing last week + this week. Include userId for authentication.",
      "GOOGLECALENDAR_CREATE_EVENT": "Create a new calendar event. Requires summary (title), start_datetime, and event_duration_minutes. Use ISO format dates like '2024-01-15T14:00:00Z'. Include userId for authentication.",
      "GOOGLECALENDAR_UPDATE_EVENT": "Update an existing calendar event. Requires event_id and the fields to update (summary, start_datetime, etc). Include userId for authentication.",
      "GOOGLECALENDAR_DELETE_EVENT": "Delete a calendar event. Requires event_id parameter. Include userId for authentication.",
      "GOOGLECALENDAR_FIND_EVENT": "Search for specific calendar events by keyword, attendee, or other criteria. Use query parameter. Include userId for authentication.",
      "GOOGLECALENDAR_FIND_FREE_SLOTS": "Find available time slots in the calendar. Requires time_min, time_max, and timezone parameters. Useful for scheduling. Include userId for authentication.",
      "GOOGLECALENDAR_SYNC_EVENTS": "Synchronize calendar events with external sources. Include userId for authentication.",
      "GOOGLECALENDAR_LIST_CALENDARS": "List all available calendars (personal, shared, etc). Include userId for authentication.",
      "GOOGLECALENDAR_GET_CURRENT_DATE_TIME": "Get the current date and time for context-aware calendar operations. Useful for relative time calculations."
    };
  }

  // NEW: Helper to get object structure outline
  private getObjectStructure(obj: any, depth: number = 0, maxDepth: number = 4): string {
    if (depth > maxDepth) return '[max depth reached]';
    
    const indent = '  '.repeat(depth);
    
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return `[\n${indent}  ${this.getObjectStructure(obj[0], depth + 1, maxDepth)}\n${indent}] (${obj.length} items)`;
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      
      const keyStructures = keys.map(key => {
        const value = obj[key];
        const valueStructure = this.getObjectStructure(value, depth + 1, maxDepth);
        return `${indent}  ${key}: ${valueStructure}`;
      });
      
      return `{\n${keyStructures.join(',\n')}\n${indent}}`;
    }
    
    return typeof obj;
  }
}
