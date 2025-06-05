import twilio from 'twilio';
import { validateRequest as validateTwilioRequest } from 'twilio/lib/webhooks/webhooks';
import { TwilioConfig, SendMessageParams, SendMessageResponse, ProcessMessageResponse, TwilioWebhookPayload } from '../types/sms';

export class TwilioService {
  private client: twilio.Twilio;
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }

  /**
   * Validate a Twilio webhook request
   */
  validateRequest(
    authToken: string,
    signature: string,
    url: string,
    params: Record<string, string | string[]>
  ): boolean {
    try {
      return validateTwilioRequest(authToken, signature, url, params);
    } catch (error) {
      console.error('Error validating Twilio request:', error);
      return false;
    }
  }

  /**
   * Send an SMS message
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      const { to, body, from = this.config.phoneNumber } = params;
      
      if (!to || !body) {
        throw new Error('Missing required parameters: to and body are required');
      }

      const message = await this.client.messages.create({
        body,
        from,
        to,
      });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Process an incoming SMS message
   */
  async processIncomingMessage(payload: any): Promise<ProcessMessageResponse> {
    try {
      // Here you can add your business logic for processing incoming messages
      // For now, we'll just log the message and return success
      console.log('Processing incoming message:', {
        from: payload.From,
        to: payload.To,
        body: payload.Body,
      });

      return {
        success: true,
        message: 'Message processed successfully',
      };
    } catch (error) {
      console.error('Error processing incoming message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process message',
      };
    }
  }

  /**
   * Validate Twilio webhook signature
   */
  validateWebhook(req: { 
    headers: { [key: string]: string | string[] | undefined }; 
    protocol: string; 
    get(header: string): string | undefined; 
    originalUrl: string;
    body: any; 
  }): boolean {
    // Skip validation in development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    const authToken = this.config.authToken;
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body as Record<string, any>;

    return twilio.validateRequest(
      authToken,
      signature as string,
      url,
      params
    );
  }
}

// Create and export a singleton instance
const twilioService = new TwilioService({
  accountSid: process.env.TWILIO_ACCOUNT_SID!,
  authToken: process.env.TWILIO_AUTH_TOKEN!,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
});

export default twilioService;
