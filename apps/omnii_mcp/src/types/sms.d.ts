import { Request } from 'express';

export interface TwilioWebhookPayload {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  ConversationSid?: string;
  NumMedia?: string;
  [key: string]: any; // For any additional Twilio fields
}

export interface SendMessageParams {
  to: string;
  body: string;
  from?: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export interface ProcessMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface TwilioWebhookRequest extends Request {
  body: TwilioWebhookPayload;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}
