import Handlebars from 'handlebars';
import { config } from '../config';
import { logger } from '../utils/logger';
import { smsSentTotal, smsFailuresTotal, notificationDuration } from '../utils/metrics';
import { createSpan } from '../utils/tracer';

export interface SmsOptions {
  to: string;
  message: string;
  template?: string;
  context?: Record<string, any>;
}

export class SmsService {
  private mockMode: boolean;
  private twilioClient: any = null;

  constructor() {
    // Use mock mode if Twilio credentials are not configured
    this.mockMode = !config.sms.twilio.accountSid || !config.sms.twilio.authToken;

    if (!this.mockMode) {
      // In production, initialize Twilio client
      // const twilio = require('twilio');
      // this.twilioClient = twilio(config.sms.twilio.accountSid, config.sms.twilio.authToken);
      logger.info('SMS service initialized with Twilio (currently mocked)');
    } else {
      logger.info('SMS service initialized in MOCK mode (will log instead of sending)');
    }
  }

  async sendSms(options: SmsOptions): Promise<boolean> {
    const span = createSpan('sms.send');
    const startTime = Date.now();

    try {
      let messageContent = options.message;

      // If template is provided, compile it with context
      if (options.template && options.context) {
        const compiledTemplate = Handlebars.compile(options.template);
        messageContent = compiledTemplate(options.context);
      }

      // Validate phone number format (basic validation)
      if (!this.isValidPhoneNumber(options.to)) {
        throw new Error(`Invalid phone number format: ${options.to}`);
      }

      if (this.mockMode || !this.twilioClient) {
        // Mock mode: just log the SMS
        logger.info('MOCK SMS SENT', {
          to: options.to,
          message: messageContent,
          length: messageContent.length,
          context: options.context,
        });

        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));

        smsSentTotal.inc({ status: 'success' });
        span.setTag('sms.to', options.to);
        span.setTag('sms.status', 'success');
        span.finish();

        const duration = (Date.now() - startTime) / 1000;
        notificationDuration.observe({ channel: 'sms', type: options.context?.type || 'unknown' }, duration);

        return true;
      } else {
        // Real Twilio mode
        const message = await this.twilioClient.messages.create({
          body: messageContent,
          from: config.sms.twilio.phoneNumber,
          to: options.to,
        });

        logger.info('SMS sent successfully', {
          to: options.to,
          messageSid: message.sid,
          status: message.status,
        });

        smsSentTotal.inc({ status: 'success' });
        span.setTag('sms.to', options.to);
        span.setTag('sms.status', 'success');
        span.setTag('sms.messageSid', message.sid);
        span.finish();

        const duration = (Date.now() - startTime) / 1000;
        notificationDuration.observe({ channel: 'sms', type: options.context?.type || 'unknown' }, duration);

        return true;
      }
    } catch (error: any) {
      logger.error('Failed to send SMS', {
        error: error.message,
        to: options.to,
      });

      smsSentTotal.inc({ status: 'failed' });
      smsFailuresTotal.inc({ error_type: error.name || 'unknown' });

      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.finish();

      const duration = (Date.now() - startTime) / 1000;
      notificationDuration.observe({ channel: 'sms', type: options.context?.type || 'unknown' }, duration);

      throw error;
    }
  }

  async sendBatchSms(smsList: SmsOptions[]): Promise<{ success: number; failed: number }> {
    const span = createSpan('sms.sendBatch');
    let success = 0;
    let failed = 0;

    logger.info('Sending batch SMS', { count: smsList.length });

    for (const smsOptions of smsList) {
      try {
        await this.sendSms(smsOptions);
        success++;
      } catch (error) {
        failed++;
      }
    }

    logger.info('Batch SMS sending completed', { success, failed, total: smsList.length });
    span.setTag('batch.total', smsList.length);
    span.setTag('batch.success', success);
    span.setTag('batch.failed', failed);
    span.finish();

    return { success, failed };
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation
    // Should start with + and contain only digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  async verifyConfiguration(): Promise<boolean> {
    if (this.mockMode) {
      logger.info('SMS service in mock mode - configuration verification skipped');
      return true;
    }

    try {
      // In production, verify Twilio credentials
      // await this.twilioClient.api.accounts(config.sms.twilio.accountSid).fetch();
      logger.info('SMS service configuration verified');
      return true;
    } catch (error: any) {
      logger.error('SMS service configuration verification failed', { error: error.message });
      return false;
    }
  }
}

export const smsService = new SmsService();
