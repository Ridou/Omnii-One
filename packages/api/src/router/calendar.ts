import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import type { CalendarListData } from "@omnii/validators";
import { CalendarListDataSchema } from "@omnii/validators";

import { protectedProcedure, publicProcedure } from "../trpc";
import { TasksOAuthManager } from "./tasks";

class CalendarService {
  private oauthManager: TasksOAuthManager;

  constructor() {
    this.oauthManager = new TasksOAuthManager();
  }

  async fetchCalendarEvents(
    userId: string,
    params?: {
      timeMin?: string;
      timeMax?: string;
    },
  ): Promise<CalendarListData> {
    console.log(
      `[CalendarService] 🚀 Fetching calendar events for user: ${userId}`,
    );

    try {
      const oauthToken = await this.oauthManager.getGoogleOAuthToken(userId);
      console.log(`[CalendarService] ✅ OAuth token retrieved successfully`);

      const now = new Date();
      const defaultTimeMin =
        params?.timeMin ??
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const defaultTimeMax =
        params?.timeMax ??
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(defaultTimeMin)}&timeMax=${encodeURIComponent(defaultTimeMax)}&singleEvents=true&orderBy=startTime`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${oauthToken.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Google Calendar API call failed: ${response.status} ${errorText}`,
        );
      }

      const data: unknown = await response.json();

      const isValidResponse = (
        response: unknown,
      ): response is { items?: unknown[] } => {
        return (
          typeof response === "object" &&
          response !== null &&
          "items" in response
        );
      };

      if (!isValidResponse(data)) {
        throw new Error("Invalid response format from Google Calendar API");
      }

      const events = data.items ?? [];

      const calendarListData: CalendarListData = {
        events: events.map((event: unknown) => this.parseEvent(event)),
        totalCount: events.length,
        hasMore: events.length >= 250,
        timeRange:
          events.length > 0
            ? {
                start: defaultTimeMin,
                end: defaultTimeMax,
              }
            : undefined,
      };

      const validationResult =
        CalendarListDataSchema.safeParse(calendarListData);
      if (!validationResult.success) {
        throw new Error(
          `Calendar data validation failed: ${validationResult.error.message}`,
        );
      }

      console.log(
        `[CalendarService] 🎉 Successfully fetched ${events.length} calendar events`,
      );
      return validationResult.data;
    } catch (error) {
      console.error(
        `[CalendarService] 💥 Failed to fetch calendar events:`,
        error,
      );
      throw error;
    }
  }

  private parseEvent(event: unknown): {
    title: string;
    start: string;
    end: string;
    attendees: {
      email: string;
      name?: string;
      status?: "accepted" | "declined" | "pending";
    }[];
    location?: string;
    description?: string;
    meetingLink?: string;
    eventId?: string;
  } {
    const isValidEvent = (e: unknown): e is Record<string, unknown> => {
      return typeof e === "object" && e !== null;
    };

    if (!isValidEvent(event)) {
      return {
        title: "(Invalid event)",
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        attendees: [],
      };
    }

    return {
      title: typeof event.summary === "string" ? event.summary : "(No title)",
      start: this.parseDateTime(event.start),
      end: this.parseDateTime(event.end),
      attendees: this.extractAttendees(event),
      location: typeof event.location === "string" ? event.location : undefined,
      description:
        typeof event.description === "string" ? event.description : undefined,
      meetingLink: this.parseMeetingLink(event),
      eventId: typeof event.id === "string" ? event.id : undefined,
    };
  }

  private parseDateTime(dateTimeObj: unknown): string {
    if (!dateTimeObj || typeof dateTimeObj !== "object") return "";

    const obj = dateTimeObj as Record<string, unknown>;
    const dateTime = obj.dateTime ?? obj.date;

    if (typeof dateTime !== "string") return "";

    try {
      return new Date(dateTime).toISOString();
    } catch {
      return dateTime;
    }
  }

  private parseMeetingLink(event: Record<string, unknown>): string | undefined {
    if (typeof event.hangoutLink === "string") return event.hangoutLink;

    if (
      typeof event.conferenceData === "object" &&
      event.conferenceData !== null
    ) {
      const conferenceData = event.conferenceData as Record<string, unknown>;
      if (
        Array.isArray(conferenceData.entryPoints) &&
        conferenceData.entryPoints.length > 0
      ) {
        const firstEntry: unknown = conferenceData.entryPoints[0];
        if (typeof firstEntry === "object" && firstEntry !== null) {
          const entry = firstEntry as Record<string, unknown>;
          if (typeof entry.uri === "string") return entry.uri;
        }
      }
    }

    if (typeof event.htmlLink === "string") return event.htmlLink;

    return undefined;
  }

  private extractAttendees(event: Record<string, unknown>): {
    email: string;
    name?: string;
    status?: "accepted" | "declined" | "pending";
  }[] {
    if (!Array.isArray(event.attendees)) return [];

    return event.attendees.map((attendee: unknown) => {
      if (typeof attendee !== "object" || attendee === null) {
        return { email: "unknown" };
      }

      const att = attendee as Record<string, unknown>;
      return {
        email: typeof att.email === "string" ? att.email : "unknown",
        name: typeof att.displayName === "string" ? att.displayName : undefined,
        status: this.mapResponseStatus(att.responseStatus),
      };
    });
  }

  private mapResponseStatus(
    status: unknown,
  ): "accepted" | "declined" | "pending" {
    if (typeof status !== "string") return "pending";

    switch (status) {
      case "accepted":
        return "accepted";
      case "declined":
        return "declined";
      default:
        return "pending";
    }
  }
}

const calendarService = new CalendarService();

export const calendarRouter = {
  getEvents: publicProcedure
    .query(async ({ ctx }): Promise<CalendarResponse<EventsListResponse>> => {
      try {
        // Get user ID from headers (mobile app compatibility)
        const authHeader = ctx.authApi?.headers?.get?.('authorization') || '';
        const userIdHeader = ctx.authApi?.headers?.get?.('x-user-id') || '';
        
        // Try session first, fallback to headers, then test user
        const userId = ctx.session?.user?.id || 
                      userIdHeader || 
                      'cd9bdc60-35af-4bb6-b87e-1932e96fb354'; // Test user fallback
        
        console.log(`[CalendarRouter] Getting events for user: ${userId} (source: ${
          ctx.session?.user?.id ? 'session' : userIdHeader ? 'header' : 'fallback'
        })`);

        // Use default parameters
        const defaultParams = {
          maxResults: 20,
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          singleEvents: true,
          orderBy: 'startTime',
        };

        const result = await calendarService.fetchCalendarEvents(userId, defaultParams);

        return {
          success: true,
          data: result,
          message: `Found ${result.events.length} events`,
        };
      } catch (error) {
        console.error(`[CalendarRouter] Error getting events:`, error);

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: "Failed to get events",
        };
      }
    }),
} satisfies TRPCRouterRecord;
