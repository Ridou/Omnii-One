import { Elysia, t } from 'elysia';
import twilioService from '../services/twilio-service';
import { SimpleSMSAI } from '../services/sms-ai-simple';

// Initialize simple AI service
const simpleSMSAI = new SimpleSMSAI();

// Define schemas
const WebhookBody = t.Object({
  From: t.String(),
  To: t.String(),
  Body: t.String(),
  MessageSid: t.Optional(t.String()),
  localDatetime: t.Optional(t.String()),
  // Add other Twilio parameters as needed
  NumMedia: t.Optional(t.String()),
  SmsMessageSid: t.Optional(t.String()),
  SmsSid: t.Optional(t.String()),
  SmsStatus: t.Optional(t.String())
});

const SendMessageBody = t.Object({
  to: t.String(),
  body: t.String(),
  from: t.Optional(t.String())
});

const ErrorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String())
});

// Create a custom error class for HTTP errors
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

// Create routes
export default (app: Elysia) =>
  app.group('/sms', (app) =>
    app
      // Webhook endpoint for incoming messages
      .post(
        '/webhook',
        async ({ body, request }) => {
          // In production, you should validate the Twilio webhook signature
          if (process.env.NODE_ENV !== 'development') {
            const signature = request.headers.get('x-twilio-signature');
            const url = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}${new URL(request.url).pathname}`;
            const params = Object.fromEntries(new URLSearchParams(await request.text()));
            
            if (!signature || !twilioService.validateRequest(
              process.env.TWILIO_AUTH_TOKEN!,
              signature,
              url,
              params
            )) {
              throw new HttpError(401, 'Invalid Twilio webhook signature');
            }
          }

          const { From: from, To: to, Body: bodyText, MessageSid: messageSid } = body as typeof WebhookBody.static;
          
          console.log('Incoming message:', { from, to, body: bodyText, messageSid });
          
          try {
            // Process the message with AI
            const response = await simpleSMSAI.processMessage(
              bodyText,
              from,
              'localDatetime' in body ? (body as any).localDatetime : undefined
            );
            
            return response;
          } catch (error) {
            console.error('Error processing message:', error);
            throw new HttpError(500, 'Failed to process message');
          }
        },
        {
          body: WebhookBody,
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String()
            }),
            401: ErrorResponse,
            500: ErrorResponse
          },
          detail: {
            summary: 'Handle incoming SMS',
            description: 'Webhook endpoint for processing incoming SMS messages',
            tags: ['SMS']
          },
          // Parse the form data from Twilio
          parse: async ({ request }) => {
            const formData = await request.formData();
            return Object.fromEntries(formData.entries());
          }
        }
      )
      
      // Send message endpoint
      .post(
        '/send',
        async ({ body }) => {
          try {
            const result = await twilioService.sendMessage({
              to: body.to,
              body: body.body,
              from: body.from
            });
            
            if (!result.success || !result.messageSid) {
              throw new Error(result.error || 'Failed to send message');
            }
            
            return { 
              success: true, 
              message: 'Message sent successfully',
              messageSid: result.messageSid
            } as const;
          } catch (error) {
            console.error('Error sending message:', error);
            throw new HttpError(500, error instanceof Error ? error.message : 'Failed to send message');
          }
        },
        {
          body: SendMessageBody,
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              messageSid: t.String()
            }),
            400: ErrorResponse,
            500: ErrorResponse
          },
          detail: {
            summary: 'Send SMS',
            description: 'Send an SMS message',
            tags: ['SMS']
          }
        }
      )
  );
