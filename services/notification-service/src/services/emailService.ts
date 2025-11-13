import nodemailer, { Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import { config } from '../config';
import { logger } from '../utils/logger';
import { emailsSentTotal, emailFailuresTotal, notificationDuration } from '../utils/metrics';
import { createSpan } from '../utils/tracer';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  context?: Record<string, any>;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private mockMode: boolean;

  constructor() {
    // Use mock mode if SMTP credentials are not configured
    this.mockMode = !config.email.smtp.auth.user || !config.email.smtp.auth.pass;

    if (!this.mockMode) {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.auth.user,
          pass: config.email.smtp.auth.pass,
        },
      });

      logger.info('Email service initialized with SMTP transport');
    } else {
      logger.info('Email service initialized in MOCK mode (will log instead of sending)');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const span = createSpan('email.send');
    const startTime = Date.now();

    try {
      let htmlContent = options.html || '';
      let textContent = options.text || '';

      // If template is provided, compile it with context
      if (options.template && options.context) {
        const compiledTemplate = Handlebars.compile(options.template);
        htmlContent = compiledTemplate(options.context);
      }

      const mailOptions = {
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        html: htmlContent,
        text: textContent,
      };

      if (this.mockMode) {
        // Mock mode: just log the email
        logger.info('MOCK EMAIL SENT', {
          to: options.to,
          subject: options.subject,
          contentLength: htmlContent.length,
          context: options.context,
        });

        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));

        emailsSentTotal.inc({ status: 'success' });
        span.setTag('email.to', options.to);
        span.setTag('email.status', 'success');
        span.finish();

        const duration = (Date.now() - startTime) / 1000;
        notificationDuration.observe({ channel: 'email', type: options.context?.type || 'unknown' }, duration);

        return true;
      } else {
        // Real SMTP mode
        const info = await this.transporter!.sendMail(mailOptions);

        logger.info('Email sent successfully', {
          to: options.to,
          subject: options.subject,
          messageId: info.messageId,
        });

        emailsSentTotal.inc({ status: 'success' });
        span.setTag('email.to', options.to);
        span.setTag('email.status', 'success');
        span.setTag('email.messageId', info.messageId);
        span.finish();

        const duration = (Date.now() - startTime) / 1000;
        notificationDuration.observe({ channel: 'email', type: options.context?.type || 'unknown' }, duration);

        return true;
      }
    } catch (error: any) {
      logger.error('Failed to send email', {
        error: error.message,
        to: options.to,
        subject: options.subject,
      });

      emailsSentTotal.inc({ status: 'failed' });
      emailFailuresTotal.inc({ error_type: error.name || 'unknown' });

      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.finish();

      const duration = (Date.now() - startTime) / 1000;
      notificationDuration.observe({ channel: 'email', type: options.context?.type || 'unknown' }, duration);

      throw error;
    }
  }

  async sendBatchEmails(emailList: EmailOptions[]): Promise<{ success: number; failed: number }> {
    const span = createSpan('email.sendBatch');
    let success = 0;
    let failed = 0;

    logger.info('Sending batch emails', { count: emailList.length });

    for (const emailOptions of emailList) {
      try {
        await this.sendEmail(emailOptions);
        success++;
      } catch (error) {
        failed++;
      }
    }

    logger.info('Batch email sending completed', { success, failed, total: emailList.length });
    span.setTag('batch.total', emailList.length);
    span.setTag('batch.success', success);
    span.setTag('batch.failed', failed);
    span.finish();

    return { success, failed };
  }

  async verifyConnection(): Promise<boolean> {
    if (this.mockMode) {
      logger.info('Email service in mock mode - connection verification skipped');
      return true;
    }

    try {
      await this.transporter!.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error: any) {
      logger.error('Email service connection verification failed', { error: error.message });
      return false;
    }
  }
}

export const emailService = new EmailService();
