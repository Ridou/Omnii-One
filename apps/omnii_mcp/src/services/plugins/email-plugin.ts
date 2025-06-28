import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import {
  GoogleServicePlugin,
  GoogleServiceType,
  IOAuthTokenManager
} from "../integrations/google-service-plugin";
import { ExecutionContextType } from "../../types/action-planning.types";
import { GmailAction } from "../../types/composio-enums";
import {
  UnifiedToolResponse,
  UnifiedResponseBuilder,
  EmailData,
  UnifiedAction,
  EmailListData,
} from "@omnii/validators";
import {
  ServiceType,
} from "@omnii/validators";
import * as path from 'path';

/**
 * Email Action Keywords for message detection
 */
export enum EmailActionKeyword {
  SEND = "send",
  DRAFT = "draft",
  CREATE = "create",
  FETCH = "fetch",
  INBOX = "inbox",
  SHOW = "show",
  LABEL = "label",
  DELETE = "delete",
  REPLY = "reply",
  ATTACHMENT = "attachment",
  THREAD = "thread",
  EMAIL = "email",
}

/**
 * Entity Placeholder Regex Pattern
 */
export enum EntityPlaceholder {
  PATTERN = "\\{\\{ENTITY:([a-z0-9\\-]+)\\}\\}",
  PREFIX = "{{ENTITY:",
  SUFFIX = "}}",
}

/**
 * Email Response Formatting Patterns
 */
export enum EmailResponsePattern {
  SUCCESS_SENT = "✅ Email sent",
  SUCCESS_DRAFT = "📝 Draft created",
  SUCCESS_FETCH = "📥 Latest emails:",
  SUCCESS_LABEL = "🏷️ Label",
  SUCCESS_DELETE = "🗑️",
  SUCCESS_REPLY = "💬 Replied",
  SUCCESS_ATTACHMENT = "📎 Attachment",
  NO_RESULTS = "No emails found",
}

export class EmailPlugin implements GoogleServicePlugin {
  serviceType = GoogleServiceType.EMAIL;
  private manager?: IOAuthTokenManager; // Manager reference for OAuth token access

  /**
   * Set the manager reference for OAuth token access
   */
  setManager(manager: IOAuthTokenManager): void {
    this.manager = manager;
  }

  /**
   * Detect email-related messages (conservative - only used as AI fallback)
   */
  isServiceMessage(message: string): boolean {
    const msg = message.toLowerCase();

    // Exclude contact-related messages - these should go to ContactsPlugin
    if (
      msg.includes("find contact") ||
      msg.includes("search contact") ||
      msg.includes("create contact") ||
      msg.includes("add contact")
    ) {
      return false;
    }

    // Very specific email operations only
    return (
      msg.startsWith("send email") ||
      msg.startsWith("create draft") ||
      msg.startsWith("draft email") ||
      msg.startsWith("read email") ||
      msg.startsWith("fetch email") ||
      msg.startsWith("gmail") ||
      msg === "inbox" ||
      msg === "check email" ||
      msg === "check emails" ||
      msg.includes("@") // Contains email address
    );
  }

  /**
   * Process email-specific messages
   */
  async processMessage(
    message: string,
    userId: string,
    context: ExecutionContextType,
    activeConnection: any,
    composio: OpenAIToolSet,
    openai: OpenAI
  ): Promise<UnifiedToolResponse> {
    const builder = new UnifiedResponseBuilder(ServiceType.EMAIL, userId);

    try {
      console.log(`[EmailPlugin] Processing message: "${message}"`);
      console.log(`[EmailPlugin] Using connection: ${activeConnection?.id}`);

      // Get Gmail profile for context
      await this.getGmailProfile(composio, openai, userId, builder);

      // Use OpenAI to decide which Gmail tool to use
      const tools = await composio.getTools({
        actions: Object.keys(this.getServiceActions()),
      });

      const systemPrompt = this.buildSystemPrompt();

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Process this Gmail request: "${message}"` },
        ],
        tools: tools,
        tool_choice: "auto",
      });

      if (response.choices[0].message.tool_calls) {
        try {
          if (this.manager) {
            console.log(`[EmailPlugin] 🔐 Using custom OAuth tokens from Supabase for user: ${userId}`);
            
            // Get OAuth token from Supabase via the manager
            const oauthToken = await this.manager.getGoogleOAuthToken(userId);
            console.log(`[EmailPlugin] ✅ OAuth token retrieved successfully`);

            // Execute tool calls with custom bearer token
            const toolResponses = [];  
            for (const toolCall of response.choices[0].message.tool_calls) {  
              try {
                console.log(`[EmailPlugin] 🔧 Executing ${toolCall.function.name} with custom auth`);
                
                const result = await composio.client.actions.execute({  
                  actionName: toolCall.function.name,  
                  requestBody: {  
                    input: JSON.parse(toolCall.function.arguments),  
                    appName: "gmail",
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
                console.error(`[EmailPlugin] ❌ Error executing tool call ${toolCall.function.name}:`, error);  
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

            // ✅ NEW: Enhanced Gmail API response debugging
            console.log(`[EmailPlugin] 🔍 GMAIL API RESPONSE DEBUG:`);
            console.log(`[EmailPlugin] - Tool response type:`, typeof toolResponse);
            console.log(`[EmailPlugin] - Tool response is array:`, Array.isArray(toolResponse));
            console.log(`[EmailPlugin] - Parsed keys:`, parsed ? Object.keys(parsed) : 'no parsed data');
            
            if (parsed) {
              console.log(`[EmailPlugin] - Parsed.successful:`, parsed.successful);
              console.log(`[EmailPlugin] - Parsed.response_data:`, !!parsed.response_data);
              console.log(`[EmailPlugin] - Parsed.data:`, !!parsed.data);
              
              if (parsed.response_data) {
                console.log(`[EmailPlugin] - response_data keys:`, Object.keys(parsed.response_data));
                console.log(`[EmailPlugin] - response_data.id:`, parsed.response_data.id);
                console.log(`[EmailPlugin] - response_data.message:`, parsed.response_data.message);
              }
              
              if (parsed.data) {
                console.log(`[EmailPlugin] - data keys:`, Object.keys(parsed.data));
              }
              
              // Log a sample of the actual structure (first 500 chars)
              const sampleStructure = JSON.stringify(parsed, null, 2).substring(0, 500);
              console.log(`[EmailPlugin] - Structure sample:`, sampleStructure + '...');
            }

            // Log the structure outline of the raw Gmail API response
            console.log(`[EmailPlugin] 📋 RAW GMAIL API RESPONSE STRUCTURE:`);
            const structureOutline = this.getObjectStructure(parsed);

            // ✅ COMPREHENSIVE GMAIL API ERROR DETECTION
            // This catches 429 rate limit errors and other Gmail API failures
            console.log(`[EmailPlugin] 🔍 GMAIL API ERROR DETECTION:`);
            console.log(`[EmailPlugin] - Parsed.error:`, parsed?.error);
            console.log(`[EmailPlugin] - Parsed.successful:`, parsed?.successful);
            console.log(`[EmailPlugin] - Parsed.response_data:`, parsed?.response_data ? 'present' : 'missing');
            
            // Check for rate limit errors (429)
            if (parsed?.error?.code === 429 || parsed?.error?.reason === 'rateLimitExceeded') {
              console.log(`[EmailPlugin] 🚦 Gmail API rate limit exceeded`);
              return builder
                .setSuccess(false)
                .setTitle("⏸️ Rate Limited")
                .setContent("Gmail API rate limit reached. Please wait a few minutes and try again.")
                .setMessage("Too many concurrent requests to Gmail API")
                .build();
            }
            
            // Check for quota exceeded errors
            if (parsed?.error?.reason === 'quotaExceeded' || parsed?.error?.message?.includes('quota')) {
              console.log(`[EmailPlugin] 📊 Gmail API quota exceeded`);
              return builder
                .setSuccess(false)
                .setTitle("📊 Quota Exceeded")
                .setContent("Gmail API quota exceeded. Please try again later.")
                .setMessage("Daily or per-user quota exceeded")
                .build();
            }
            
            // Check for authentication errors
            if (parsed?.error?.code === 401 || parsed?.error?.message?.includes('unauthorized')) {
              console.log(`[EmailPlugin] 🔐 Gmail API authentication failed`);
              return builder
                .setSuccess(false)
                .setTitle("🔐 Authentication Required")
                .setContent("Gmail authentication failed. Please reconnect your Google account.")
                .setMessage("Invalid or expired Gmail credentials")
                .build();
            }
            
            // Check for general API failures
            if (parsed?.error && !parsed?.successful && !parsed?.response_data) {
              console.log(`[EmailPlugin] ❌ Gmail API general error:`, parsed.error);
              return builder
                .setSuccess(false)
                .setTitle("❌ Email Failed")
                .setContent(`Gmail API error: ${parsed.error.message || 'Unknown error'}`)
                .setMessage(JSON.stringify(parsed.error))
                .build();
            }
            
            // Check for missing response data (silent failures)
            if (!parsed?.response_data && !parsed?.data && parsed?.successful !== true) {
              console.log(`[EmailPlugin] 🤷 Gmail API returned no data - treating as failure`);
              return builder
                .setSuccess(false)
                .setTitle("📭 No Response")
                .setContent("Gmail API returned no data. The request may have failed silently.")
                .setMessage("Empty response from Gmail API")
                .build();
            }

            // Server-side parsing and formatting
            const formattedResponse = this.formatEmailResponse(message, parsed, builder);
            
            // Log the structure of our formatted UnifiedToolResponse
            console.log(`[EmailPlugin] 📋 FORMATTED UNIFIED RESPONSE STRUCTURE:`);
            const formattedStructure = this.getObjectStructure(formattedResponse);

            // Write formatted response structure to log file
            try {
              const logDir = path.join(process.cwd(), 'logs');
              
              // Create logs directory using Bun
              // await Bun.write(path.join(logDir, '.gitkeep'), ''); // This will create the directory
              
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const logFile = path.join(logDir, `formatted-email-response-${timestamp}.log`);
              
              const logContent = `Formatted Email UnifiedToolResponse Structure - ${new Date().toISOString()}\n` +
                               `Message: "${message}"\n` +
                               `User: ${userId}\n` +
                               `Action: ${this.detectActionFromMessage(message)}\n` +
                               `\nFormatted Response Structure:\n${formattedStructure}\n` +
                               `\nSample Structured Data:\n${formattedResponse.data?.structured ? JSON.stringify(formattedResponse.data.structured, null, 2).substring(0, 1500) : 'No structured data'}...\n`;
              
              // await Bun.write(logFile, logContent);
              console.log(`[EmailPlugin] 📝 Formatted response structure logged to: ${logFile}`);
            } catch (fileError) {
              console.error(`[EmailPlugin] Failed to write formatted response log:`, fileError);
            }

            return formattedResponse;
          }
        } catch (error) {
          console.error(`[EmailPlugin] ❌ Error in custom OAuth flow:`, error);
          throw error;
        }
      }

      return builder
        .setSuccess(false)
        .setTitle("Email Request Failed")
        .setContent("Sorry, I couldn't process your email request.")
        .setMessage("No tool calls in response")
        .build();

    } catch (error) {
      console.error(`[EmailPlugin] Error processing email:`, error);
      return builder
        .setSuccess(false)
        .setTitle("Email Error")
        .setContent("Sorry, I had trouble with that email request.")
        .setMessage(error instanceof Error ? error.message : "Unknown error")
        .build();
    }
  }

  private async getGmailProfile(
    composio: OpenAIToolSet, 
    openai: OpenAI, 
    userId: string, 
    builder: UnifiedResponseBuilder
  ): Promise<void> {
      try {
        const profileTools = await composio.getTools({
          actions: [GmailAction.GET_PROFILE],
        });

        const profileResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
          { role: "system", content: "Get the Gmail profile to see which Google account is connected." },
          { role: "user", content: "Get Gmail profile" },
          ],
          tools: profileTools,
          tool_choice: "auto",
        });

        if (profileResponse.choices[0].message.tool_calls) {
          if (this.manager) {
            console.log(`[EmailPlugin] 🔐 Using custom OAuth tokens from Supabase for profile fetch: ${userId}`);
            
            // Get OAuth token from Supabase via the manager
            const oauthToken = await this.manager.getGoogleOAuthToken(userId);
            console.log(`[EmailPlugin] ✅ OAuth token retrieved successfully for profile`);

            // Execute profile tool call with custom bearer token
            const result = await composio.client.actions.execute({  
              actionName: GmailAction.GET_PROFILE,  
              requestBody: {  
                input: {},  
                appName: "gmail",
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

            const profileParsed = typeof result === 'string' ? JSON.parse(result) : result;
            const emailAddress = profileParsed?.data?.emailAddress || 
                profileParsed?.data?.response_data?.emailAddress;
            
            if (emailAddress) {
              builder.setMetadata({ source: emailAddress });
              console.log(`[EmailPlugin] ✅ Connected to Gmail account: ${emailAddress}`);
            }
          }
        }
      } catch (profileError) {
        console.log(`[EmailPlugin] ⚠️ Could not get Gmail profile:`, profileError);
      }
    }

  private formatEmailResponse(
    originalMessage: string, 
    parsed: any, 
    builder: UnifiedResponseBuilder
  ): UnifiedToolResponse {
    const action = this.detectActionFromMessage(originalMessage);
    
    console.log(`[EmailPlugin] 🎯 FORMAT EMAIL RESPONSE`);
    console.log(`[EmailPlugin] - Original message: "${originalMessage}"`);
    console.log(`[EmailPlugin] - Detected action: "${action}"`);
    console.log(`[EmailPlugin] - Parsed data keys:`, parsed ? Object.keys(parsed) : 'no parsed data');
    
    let result: UnifiedToolResponse;
    
    switch (action) {
      case "send_email":
        console.log(`[EmailPlugin] 📤 Calling formatSentEmail()`);
        result = this.formatSentEmail(parsed, builder);
        break;
      case "create_draft":
        console.log(`[EmailPlugin] 📝 Calling formatDraftEmail()`);
        result = this.formatDraftEmail(parsed, builder);
        break;
      case "fetch_emails":
        console.log(`[EmailPlugin] 📥 Calling formatFetchedEmails()`);
        result = this.formatFetchedEmails(parsed, builder);
        break;
      default:
        console.log(`[EmailPlugin] ❓ Calling formatGenericEmail() for action: ${action}`);
        result = this.formatGenericEmail(parsed, builder, action);
        break;
    }
    
    console.log(`[EmailPlugin] 🔑 FINAL RESPONSE STRUCTURE:`);
    console.log(`[EmailPlugin] - Type:`, result.type);
    console.log(`[EmailPlugin] - Success:`, result.success);
    console.log(`[EmailPlugin] - Has data:`, !!result.data);
    console.log(`[EmailPlugin] - Has data.ui:`, !!result.data?.ui);
    console.log(`[EmailPlugin] - Has data.structured:`, !!result.data?.structured);
    console.log(`[EmailPlugin] - Message:`, result.message);
    console.log(`[EmailPlugin] - Has id:`, !!result.id);
    console.log(`[EmailPlugin] - Has userId:`, !!result.userId);
    console.log(`[EmailPlugin] - Has timestamp:`, !!result.timestamp);
    
    if (result.data?.structured && 'emails' in result.data.structured) {
      const emailList = result.data.structured as EmailListData;
      console.log(`[EmailPlugin] 📧 STRUCTURED EMAIL LIST:`);
      console.log(`[EmailPlugin] - Total emails:`, emailList.totalCount);
      console.log(`[EmailPlugin] - Unread emails:`, emailList.unreadCount);
      console.log(`[EmailPlugin] - Emails array length:`, emailList.emails.length);
      console.log(`[EmailPlugin] - First email subject:`, emailList.emails[0]?.subject);
    }
    
    return result;
  }

  private formatSentEmail(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    const to = parsed?.data?.to || parsed?.data?.recipient_email;
    const subject = parsed?.data?.subject;

    const structuredData: EmailData = {
      subject: subject || "No Subject",
      from: "You",
      to: Array.isArray(to) ? to : [to].filter(Boolean),
      body: parsed?.data?.body || "",
      isDraft: false,
      isRead: true,
    };

    const actions: UnifiedAction[] = [
      {
        id: "view_sent",
        label: "View in Gmail",
        type: "secondary",
        icon: "🔗"
      }
    ];

    return builder
      .setSuccess(true)
      .setTitle("✅ Email Sent")
      .setSubtitle(to ? `to ${to}` : "")
      .setContent(subject ? `"${subject}"` : "Email sent successfully")
      .setMessage(`${EmailResponsePattern.SUCCESS_SENT}${to ? ` to ${to}` : ""}${subject ? ` with subject: "${subject}"` : ""}`)
      .setStructuredData(structuredData)
      .setRawData(parsed)
      .addAction(actions[0])
      .build();
  }

  private formatDraftEmail(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    // ✅ NEW: Enhanced draft email parsing with debugging
    console.log(`[EmailPlugin] 🔍 FORMAT DRAFT EMAIL DEBUG:`);
    console.log(`[EmailPlugin] - Parsed structure:`, parsed ? Object.keys(parsed) : 'no parsed data');
    
    // Try multiple possible paths for email data
    const to = parsed?.data?.to || 
               parsed?.data?.recipient_email || 
               parsed?.response_data?.to ||
               parsed?.response_data?.recipient_email ||
               parsed?.to ||
               parsed?.recipient_email;
               
    const subject = parsed?.data?.subject || 
                    parsed?.response_data?.subject ||
                    parsed?.subject;
                    
    const body = parsed?.data?.body || 
                 parsed?.response_data?.body ||
                 parsed?.body;
                 
    const draftId = parsed?.data?.response_data?.id || 
                    parsed?.data?.id ||
                    parsed?.response_data?.id ||
                    parsed?.id;

    console.log(`[EmailPlugin] - Extracted to:`, to);
    console.log(`[EmailPlugin] - Extracted subject:`, subject);
    console.log(`[EmailPlugin] - Extracted body:`, body);
    console.log(`[EmailPlugin] - Extracted draftId:`, draftId);
    console.log(`[EmailPlugin] - Parsed.successful:`, parsed?.successful);
    console.log(`[EmailPlugin] - Parsed.error:`, parsed?.error);

    const structuredData: EmailData = {
      subject: subject || "No Subject",
      from: "You",
      to: Array.isArray(to) ? to : [to].filter(Boolean),
      body: parsed?.data?.body || "",
      isDraft: true,
      isRead: false,
    };

    const actions: UnifiedAction[] = [
      {
        id: "send_draft",
        label: "Send Draft",
        type: "primary",
        icon: "📤",
        command: `send draft ${draftId || 'unknown'}`
      },
      {
        id: "edit_draft", 
        label: "Edit Draft",
        type: "secondary",
        icon: "✏️",
        command: `edit draft ${draftId || 'unknown'}`
      }
    ];

    return builder
      .setSuccess(true)
      .setTitle("📝 Draft Created")
      .setSubtitle(to ? `for ${to}` : "")
      .setContent(subject ? `"${subject}"` : "Draft created successfully")
      .setMessage(`${EmailResponsePattern.SUCCESS_DRAFT}${to ? ` for ${to}` : ""}${subject ? ` with subject: "${subject}"` : ""}${draftId ? ` (ID: ${draftId})` : ""}`)
      .setStructuredData(structuredData)
      .setRawData(parsed)
      .addAction(actions[0])
      .addAction(actions[1])
      .build();
  }

  private formatFetchedEmails(parsed: any, builder: UnifiedResponseBuilder): UnifiedToolResponse {
    const emails = parsed?.data?.emails ||
                  parsed?.data?.messages ||
                  parsed?.data?.response_data?.messages ||
                  [];

    if (!Array.isArray(emails) || emails.length === 0) {
      return builder
        .setSuccess(true)
        .setTitle("📥 Inbox")
        .setContent("No emails found")
        .setMessage(`📥 ${EmailResponsePattern.NO_RESULTS}`)
        .build();
    }

    console.log(`[EmailPlugin] 🔍 PROCESSING ${emails.length} EMAILS`);
    console.log(`[EmailPlugin] - First email structure:`, emails[0] ? Object.keys(emails[0]) : 'no first email');
    
    // NEW: Enhanced email extraction using rich raw data fields
    const emailListData: EmailListData = {
      emails: emails.map((email: any) => {
        // Check what fields are available in this email
        const availableFields = Object.keys(email);
        console.log(`[EmailPlugin] 📧 Processing email with fields:`, availableFields);
        
        // NEW: Extract rich data directly from parsed structure
        const extractedEmail = {
          id: email.id || email.messageId || this.generateId(),
          subject: email.subject || this.extractSubject(email),
          from: email.from || this.extractFrom(email),
          to: [email.to || this.extractTo(email)],
          body: email.body || this.extractBody(email), // Keep for backward compatibility
          // NEW: Rich fields from raw Gmail data
          messageText: email.messageText || email.body || this.extractBody(email), // Full message content
          preview: this.extractPreview(email), // Enhanced preview extraction
          sender: email.sender || email.from || this.extractFrom(email), // Detailed sender info
          date: email.date || email.messageTimestamp || this.extractDate(email),
          threadId: email.threadId,
          messageId: email.messageId || email.id,
          messageTimestamp: email.messageTimestamp || email.date,
          labelIds: email.labelIds || [],
          isRead: this.isEmailRead(email),
          isDraft: false,
          attachments: this.extractAttachments(email)
        };
        
        // Log what we extracted for debugging
        console.log(`[EmailPlugin] 📧 Extracted email data:`, {
          id: extractedEmail.id,
          subject: extractedEmail.subject,
          hasMessageText: !!extractedEmail.messageText,
          hasPreview: !!extractedEmail.preview,
          messageTextLength: extractedEmail.messageText?.length || 0,
          previewLength: extractedEmail.preview?.length || 0,
          sender: extractedEmail.sender,
          labelIds: extractedEmail.labelIds
        });
        
        return extractedEmail;
      }),
      totalCount: emails.length,
      unreadCount: emails.filter((email: any) => !this.isEmailRead(email)).length,
      hasMore: emails.length >= 20
    };

    // Enhanced actions for email list
    const actions: UnifiedAction[] = [
      {
        id: "open_first_email",
        label: "Open First Email",
        type: "primary",
        icon: "📖"
      },
      {
        id: "reply_first_email",
        label: "Reply to First",
        type: "secondary", 
        icon: "💬"
      }
    ];

    // Add "Load More" action if there are many emails
    if (emailListData.hasMore) {
      actions.push({
        id: "load_more_emails",
        label: "Load More Emails",
        type: "secondary",
        icon: "⬇️",
        command: "fetch more emails"
      });
    }

    // Compact content for UI (not the full email list)
    const content = `Found ${emails.length} email${emails.length === 1 ? '' : 's'}${emailListData.unreadCount > 0 ? ` (${emailListData.unreadCount} unread)` : ''}`;

    const result = builder
      .setSuccess(true)
      .setTitle("📥 Latest Emails")
      .setSubtitle(`${emails.length} email${emails.length === 1 ? '' : 's'}`)
      .setContent(content) // Compact summary instead of full list
      .setMessage(`${EmailResponsePattern.SUCCESS_FETCH}\n${content}`)
      .setStructuredData(emailListData) // Rich data for component rendering
      .setRawData(parsed)
      .setMetadata({ 
        confidence: 95, 
        source: 'Gmail'
      });

    // Add all actions to the builder
    actions.forEach(action => result.addAction(action));
    
    const finalResponse = result.build();
    
    // NEW: Enhanced logging to show rich data extraction
    console.log(`[EmailPlugin] 🔑 RICH DATA EXTRACTION SUMMARY:`);
    console.log(`[EmailPlugin] - Total emails processed:`, emailListData.emails.length);
    console.log(`[EmailPlugin] - Emails with messageText:`, emailListData.emails.filter(e => e.messageText).length);
    console.log(`[EmailPlugin] - Emails with preview:`, emailListData.emails.filter(e => e.preview).length);
    console.log(`[EmailPlugin] - First email messageText length:`, emailListData.emails[0]?.messageText?.length || 0);
    
    // Safe preview logging with type checking
    const firstEmailPreview = emailListData.emails[0]?.preview;
    const previewSample = firstEmailPreview && typeof firstEmailPreview === 'string' 
      ? firstEmailPreview.substring(0, 100) 
      : firstEmailPreview || 'none';
    console.log(`[EmailPlugin] - First email preview:`, previewSample);
    
    return finalResponse;
  }

  // NEW: Helper method to extract attachments
  private extractAttachments(email: any): Array<{ name: string; type: string; size: number; downloadUrl?: string; }> {
    const attachments = email.attachments || email.payload?.parts?.filter((part: any) => part.filename) || [];
    return attachments.map((attachment: any) => ({
      name: attachment.filename || attachment.name || 'Attachment',
      type: attachment.mimeType || attachment.type || 'application/octet-stream',
      size: attachment.body?.size || attachment.size || 0,
      downloadUrl: attachment.body?.attachmentId ? `attachment:${attachment.body.attachmentId}` : undefined
    }));
  }

  // Helper method to generate IDs
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // Helper method to extract date
  private extractDate(email: any): string {
    const date = email.date ||
                email.internalDate ||
                email.payload?.headers?.find((h: any) => h.name === "Date")?.value;
    
    if (date) {
      try {
        return new Date(date).toLocaleDateString();
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  // Helper method to check if email is read
  private isEmailRead(email: any): boolean {
    // Check various indicators that an email has been read
    const labelIds = email.labelIds || [];
    return !labelIds.includes('UNREAD') && !labelIds.includes('INBOX');
  }

  private formatGenericEmail(parsed: any, builder: UnifiedResponseBuilder, action: string): UnifiedToolResponse {
    return builder
      .setSuccess(true)
      .setTitle("📧 Email Operation")
      .setContent(`${action} completed successfully`)
      .setMessage(JSON.stringify(parsed, null, 2))
      .setRawData(parsed)
      .build();
  }

  // Helper methods for extracting email data
  private extractSubject(email: any): string {
    return email.subject ||
           email.snippet ||
           email.payload?.headers?.find((h: any) => h.name === "Subject")?.value ||
           "(No subject)";
  }

  private extractFrom(email: any): string {
    return email.from ||
           email.payload?.headers?.find((h: any) => h.name === "From")?.value ||
           "(Unknown sender)";
  }

  private extractTo(email: any): string {
    return email.to ||
           email.payload?.headers?.find((h: any) => h.name === "To")?.value ||
           "You";
  }

  private extractBody(email: any): string {
    // Check different possible body locations
    const rawBody = email.body ||
                   email.snippet ||
                   email.payload?.body?.data ||
                   "";

    // If we have payload.body.data, it's likely base64url encoded
    if (email.payload?.body?.data && typeof email.payload.body.data === 'string') {
      try {
        // NEW: Decode base64url encoded email body
        const decodedBody = this.decodeBase64Url(email.payload.body.data);
        return decodedBody || email.snippet || "(No content)";
      } catch (error) {
        console.log(`[EmailPlugin] Failed to decode base64url body:`, error);
        // Fallback to snippet if decoding fails
        return email.snippet || "(Could not decode email content)";
      }
    }

    // For plain text or already decoded content
    return rawBody || "(No content)";
  }

  // NEW: Enhanced preview extraction with type safety
  private extractPreview(email: any): string {
    console.log(`[EmailPlugin] 🔍 EXTRACTING PREVIEW for email:`, {
      id: email.id || email.messageId,
      hasPreview: 'preview' in email,
      previewType: typeof email.preview,
      previewValue: email.preview,
      hasSnippet: 'snippet' in email,
      snippetType: typeof email.snippet,
      snippetValue: email.snippet
    });

    // Try different preview sources in order of preference
    let preview = '';
    
    // 1. Try email.preview field (Gmail API structure)
    if (email.preview) {
      if (typeof email.preview === 'string') {
        preview = email.preview;
      } else if (typeof email.preview === 'object' && email.preview.body) {
        // Gmail API returns preview as {body: "text", subject: "subject"}
        preview = email.preview.body;
        console.log(`[EmailPlugin] 🎯 Extracted preview from object.body:`, preview.substring(0, 100) + '...');
      } else if (typeof email.preview === 'object' && email.preview.text) {
        preview = email.preview.text;
      } else {
        // Convert to string if it's some other type
        preview = String(email.preview);
      }
    }
    
    // 2. Fall back to snippet
    if (!preview && email.snippet) {
      preview = typeof email.snippet === 'string' ? email.snippet : String(email.snippet);
    }
    
    // 3. Fall back to messageText truncated
    if (!preview && email.messageText) {
      const messageText = typeof email.messageText === 'string' ? email.messageText : String(email.messageText);
      preview = messageText.substring(0, 150) + '...';
    }
    
    // 4. Final fallback
    if (!preview) {
      preview = '';
    }

    // 5. Decode HTML entities
    preview = this.decodeHtmlEntities(preview);

    console.log(`[EmailPlugin] 🔍 PREVIEW RESULT:`, {
      extractedLength: preview.length,
      extractedPreview: preview.substring(0, 100) + (preview.length > 100 ? '...' : ''),
      isString: typeof preview === 'string'
    });

    return preview;
  }

  // NEW: Helper method to decode HTML entities
  private decodeHtmlEntities(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    // Common HTML entity mappings
    const entityMap: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x27;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&#160;': ' '
    };
    
    // Replace HTML entities
    let decoded = text;
    for (const [entity, replacement] of Object.entries(entityMap)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
    }
    
    // Handle numeric entities (&#123;)
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    });
    
    // Handle hex entities (&#x1A;)
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    return decoded;
  }

  // NEW: Helper method to decode base64url (Gmail API format)
  private decodeBase64Url(base64UrlString: string): string {
    try {
      // Convert base64url to standard base64
      // Replace URL-safe characters and add padding if needed
      let base64 = base64UrlString
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '=';
      }

      // Decode using Bun's built-in atob (base64 decoder)
      const decodedBytes = atob(base64);
      
      // Convert to UTF-8 string
      // Create Uint8Array from the decoded string
      const bytes = new Uint8Array(decodedBytes.length);
      for (let i = 0; i < decodedBytes.length; i++) {
        bytes[i] = decodedBytes.charCodeAt(i);
      }
      
      // Decode as UTF-8
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(bytes);
    } catch (error) {
      console.error(`[EmailPlugin] Base64url decode error:`, error);
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    return `You are a Gmail assistant. Use these Gmail actions:

SEND EMAIL: ${GmailAction.SEND_EMAIL} - Send emails immediately
CREATE DRAFT: ${GmailAction.CREATE_DRAFT} - Create email drafts (PREFERRED for drafting)
FETCH EMAILS: ${GmailAction.FETCH_EMAILS} - Get inbox emails
MANAGE LABELS: ${GmailAction.ADD_LABEL}, ${GmailAction.CREATE_LABEL}, ${GmailAction.REMOVE_LABEL}
MANAGE DRAFTS: ${GmailAction.LIST_DRAFTS}, ${GmailAction.DELETE_DRAFT}
MANAGE MESSAGES: ${GmailAction.DELETE_MESSAGE}, ${GmailAction.MOVE_TO_TRASH}
THREAD OPERATIONS: ${GmailAction.REPLY_TO_THREAD}, ${GmailAction.FETCH_MESSAGE_BY_THREAD}
ATTACHMENTS: ${GmailAction.GET_ATTACHMENT}
PROFILE: ${GmailAction.GET_PROFILE}

IMPORTANT RULES:
1. For "${EmailActionKeyword.DRAFT}" or "${EmailActionKeyword.CREATE} ${EmailActionKeyword.DRAFT}" → Use ${GmailAction.CREATE_DRAFT}
2. For "${EmailActionKeyword.SEND} ${EmailActionKeyword.EMAIL}" → Use ${GmailAction.SEND_EMAIL}  
3. For "${EmailActionKeyword.FETCH}/${EmailActionKeyword.INBOX}/${EmailActionKeyword.SHOW}" → Use ${GmailAction.FETCH_EMAILS}
4. When creating drafts, ensure all required parameters: recipient_email, subject, body
5. Default to creating drafts unless explicitly asked to send

FETCH EMAILS PARAMETERS:
- ALWAYS set max_results to 10 or more (default is only 1!)
- Use max_results: 20 for "latest emails", "check email", "inbox"
- Use max_results: 50 for "all emails" or "show all"
- Include query parameter for specific searches (e.g., "from:john", "subject:meeting")
- Set include_payload: true to get full email content

Examples:
- "check my emails" → max_results: 20
- "latest emails" → max_results: 20  
- "show all emails" → max_results: 50
- "emails from john" → query: "from:john", max_results: 20

Extract the correct parameters and call the appropriate Gmail action.`;
  }

  private detectActionFromMessage(message: string): string {
    const msg = message.toLowerCase();

    console.log(`[EmailPlugin] 🔍 ACTION DETECTION for: "${message}"`);
    console.log(`[EmailPlugin] - Lowercase message: "${msg}"`);
    console.log(`[EmailPlugin] - Contains FETCH (${EmailActionKeyword.FETCH}):`, msg.includes(EmailActionKeyword.FETCH));
    console.log(`[EmailPlugin] - Contains INBOX (${EmailActionKeyword.INBOX}):`, msg.includes(EmailActionKeyword.INBOX));
    console.log(`[EmailPlugin] - Contains SHOW (${EmailActionKeyword.SHOW}):`, msg.includes(EmailActionKeyword.SHOW));
    console.log(`[EmailPlugin] - Contains SEND + EMAIL:`, msg.includes(EmailActionKeyword.SEND) && msg.includes(EmailActionKeyword.EMAIL));
    console.log(`[EmailPlugin] - Contains DRAFT:`, msg.includes(EmailActionKeyword.DRAFT));

    if (msg.includes(EmailActionKeyword.SEND) && msg.includes(EmailActionKeyword.EMAIL)) {
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: send_email`);
      return "send_email";
    }
    if (msg.includes(EmailActionKeyword.DRAFT)) {
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: create_draft`);
      return "create_draft";
    }
    if (msg.includes(EmailActionKeyword.FETCH) ||
      msg.includes(EmailActionKeyword.INBOX) ||
        msg.includes(EmailActionKeyword.SHOW)) {
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: fetch_emails`);
      return "fetch_emails";
    }
    if (msg.includes(EmailActionKeyword.LABEL)) {
      if (msg.includes(EmailActionKeyword.CREATE)) {
        console.log(`[EmailPlugin] 🎯 DETECTED ACTION: create_label`);
        return "create_label";
      }
      if (msg.includes("add")) {
        console.log(`[EmailPlugin] 🎯 DETECTED ACTION: add_label`);
        return "add_label";
      }
      if (msg.includes("remove")) {
        console.log(`[EmailPlugin] 🎯 DETECTED ACTION: remove_label`);
        return "remove_label";
      }
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: list_labels`);
      return "list_labels";
    }
    if (msg.includes(EmailActionKeyword.DELETE) && msg.includes(EmailActionKeyword.DRAFT)) {
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: delete_draft`);
      return "delete_draft";
    }
    if (msg.includes(EmailActionKeyword.DELETE) && msg.includes(EmailActionKeyword.EMAIL)) {
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: delete_message`);
      return "delete_message";
    }
    if (msg.includes(EmailActionKeyword.REPLY)) {
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: reply_to_thread`);
      return "reply_to_thread";
    }
    if (msg.includes(EmailActionKeyword.ATTACHMENT)) {
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: get_attachment`);
      return "get_attachment";
    }
    if (msg.includes(EmailActionKeyword.THREAD)) {
      console.log(`[EmailPlugin] 🎯 DETECTED ACTION: list_threads`);
      return "list_threads";
    }

    console.log(`[EmailPlugin] ❌ DETECTED ACTION: unknown`);
    return "unknown";
  }

  /**
   * Get Gmail actions with LLM-friendly descriptions  
   */
  getServiceActions(): Record<string, string> {
    return {
      [GmailAction.SEND_EMAIL]: "Send an email immediately. Requires recipient_email, subject, and body. Include userId for authentication.",
      [GmailAction.CREATE_DRAFT]: "Create an email draft (preferred for drafting). Requires recipient_email, subject, and body. Include userId for authentication.",
      [GmailAction.FETCH_EMAILS]: "Get inbox emails. Set max_results to 10+ (default is only 1!). Use max_results: 20 for latest emails, 50 for all emails. Set include_payload: true for full content. Include userId for authentication.",
      [GmailAction.ADD_LABEL]: "Add a label to an email. Requires message_id and label_name. Include userId for authentication.",
      [GmailAction.CREATE_LABEL]: "Create a new email label. Requires label_name. Include userId for authentication.",
      [GmailAction.REMOVE_LABEL]: "Remove a label from an email. Requires message_id and label_name. Include userId for authentication.",
      [GmailAction.LIST_DRAFTS]: "List all email drafts. Include userId for authentication.",
      [GmailAction.DELETE_DRAFT]: "Delete a specific draft. Requires draft_id. Include userId for authentication.",
      [GmailAction.DELETE_MESSAGE]: "Delete an email message. Requires message_id. Include userId for authentication.",
      [GmailAction.MOVE_TO_TRASH]: "Move an email to trash. Requires message_id. Include userId for authentication.",
      [GmailAction.REPLY_TO_THREAD]: "Reply to an email thread. Requires thread_id, subject, and body. Include userId for authentication.",
      [GmailAction.FETCH_MESSAGE_BY_THREAD]: "Get messages in a specific thread. Requires thread_id. Include userId for authentication.",
      [GmailAction.GET_ATTACHMENT]: "Download an email attachment. Requires message_id and attachment_id. Include userId for authentication.",
      [GmailAction.GET_PROFILE]: "Get Gmail profile information to see connected account. Include userId for authentication."
    };
  }

  // NEW: Helper to get object structure outline (keys only, no values)
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
