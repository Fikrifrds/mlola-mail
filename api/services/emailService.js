import { db } from '../config/database.js';
import { emailTrackingService } from './emailTrackingService.js';
import { webhookService } from './webhookService.js';
import { getEmailTransporter, getEmailTransporterForSender, getSenderEmail } from '../config/alibabacloud.js';
import { getSenderById, getDefaultSender } from './senderAddressService.js';

export class EmailService {

  constructor() {
    // Default transporter (fallback to env)
    this.defaultTransporter = getEmailTransporter();
    this.defaultSenderEmail = getSenderEmail();
  }

  async sendEmail(
    userId,
    to,
    subject,
    htmlContent,
    textContent,
    templateId,
    bulkEmailId,
    senderAddressId = null // Optional: specify which sender to use
  ) {
    try {
      // Determine which sender to use
      let transporter = this.defaultTransporter;
      let senderEmail = this.defaultSenderEmail;

      if (senderAddressId) {
        // Use specific sender from database
        const sender = await getSenderById(senderAddressId, userId);
        console.log('📧 Selected sender from database:', {
          id: sender?.id,
          email: sender?.email,
          name: sender?.name,
          hasPassword: !!sender?.smtp_password,
          passwordLength: sender?.smtp_password?.length || 0
        });
        if (!sender || !sender.is_active) {
          throw new Error('Sender address not found or inactive');
        }
        transporter = getEmailTransporterForSender(sender);
        senderEmail = sender.name ? `${sender.name} <${sender.email}>` : sender.email;
      } else {
        // Try to use default sender from database
        const defaultSender = await getDefaultSender(userId);
        console.log('📧 Default sender from database:', {
          id: defaultSender?.id,
          email: defaultSender?.email,
          name: defaultSender?.name,
          hasPassword: !!defaultSender?.smtp_password,
          passwordLength: defaultSender?.smtp_password?.length || 0
        });
        if (defaultSender && defaultSender.is_active) {
          transporter = getEmailTransporterForSender(defaultSender);
          senderEmail = defaultSender.name ? `${defaultSender.name} <${defaultSender.email}>` : defaultSender.email;
        }
        // Otherwise falls back to env variables (already set)
      }

      // Prepare email content with tracking using bulk email id
      const trackingPixel = emailTrackingService.getTrackingPixel(bulkEmailId);
      const trackedHtml = emailTrackingService.addTrackingToHtml(htmlContent, bulkEmailId);
      const finalHtml = trackedHtml + trackingPixel;

      // Send email via Alibaba Cloud Direct Mail (SMTP)
      const mailOptions = {
        from: senderEmail,
        to: to.email,
        subject: subject,
        html: finalHtml,
        text: textContent || undefined,
        headers: {
          'X-Email-Service': 'mlola-email',
          'X-User-Id': userId,
        },
      };

      const info = await transporter.sendMail(mailOptions);

      // Webhook notification for send event (bulk email id)
      await webhookService.broadcastWebhook(userId, {
        event: 'email.sent',
        email_id: bulkEmailId,
        timestamp: new Date().toISOString(),
        data: {
          messageId: info.messageId,
          to: to.email,
          subject,
        },
      });

      // Return the message id; route handles DB updates/events
      return { messageId: info.messageId };

    } catch (error) {
      console.error('Failed to send email:', error);

      throw error;
    }
  }

  async sendTemplatedEmail(
    userId,
    to,
    templateName,
    variables
  ) {
    try {
      // Get template
      const { data: template, error: templateError } = await db
        .from('templates')
        .select('*')
        .eq('user_id', userId)
        .eq('name', templateName)
        .eq('is_active', true)
        .single()
        .execute();

      if (templateError || !template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      // Render template with variables
      const subject = this.renderTemplate(template.subject, variables);
      const htmlContent = this.renderTemplate(template.html_content, variables);
      const textContent = template.text_content ? this.renderTemplate(template.text_content, variables) : undefined;

      // Send email using regular send method
      return await this.sendEmail(
        userId,
        to,
        subject,
        htmlContent,
        textContent,
        template.id
      );

    } catch (error) {
      console.error('Failed to send templated email:', error);
      throw error;
    }
  }

  async createTemplate(userId, template) {
    try {
      // Create template in database only
      // Alibaba Cloud Direct Mail templates are managed separately in their console
      // We'll handle template rendering in-application
      const { data: dbTemplate, error: dbError } = await db
        .from('templates')
        .insert({
          user_id: userId,
          name: template.name,
          subject: template.subject,
          html_content: template.html,
          text_content: template.text,
          is_active: true,
        })
        .single()
        .execute();

      if (dbError || !dbTemplate) {
        throw new Error(`Failed to create template in database: ${dbError?.message}`);
      }

      return dbTemplate;

    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  }

  async updateTemplate(userId, templateName, updates) {
    try {
      // Update template in database only
      const { data: dbTemplate, error: dbError } = await db
        .from('templates')
        .update({
          subject: updates.subject,
          html_content: updates.html,
          text_content: updates.text,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('name', templateName)
        .single()
        .execute();

      if (dbError || !dbTemplate) {
        throw new Error(`Failed to update template in database: ${dbError?.message}`);
      }

      return dbTemplate;

    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  }

  async deleteTemplate(userId, templateName) {
    try {
      // Delete template from database only
      const { error: dbError } = await db
        .from('templates')
        .delete()
        .eq('user_id', userId)
        .eq('name', templateName)
        .execute();

      if (dbError) {
        throw new Error(`Failed to delete template from database: ${dbError.message}`);
      }

    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  async testTemplate(userId, templateName, variables) {
    try {
      // Get template
      const { data: template, error: templateError } = await db
        .from('templates')
        .select('*')
        .eq('user_id', userId)
        .eq('name', templateName)
        .single()
        .execute();

      if (templateError || !template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      // Render template with variables
      const subject = this.renderTemplate(template.subject, variables);
      const htmlContent = this.renderTemplate(template.html_content, variables);
      const textContent = template.text_content ? this.renderTemplate(template.text_content, variables) : undefined;

      return {
        subject,
        html: htmlContent,
        text: textContent,
      };

    } catch (error) {
      console.error('Failed to test template:', error);
      throw error;
    }
  }

  renderTemplate(template, variables) {
    let rendered = template;

    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = String(variables[key]);
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    });

    return rendered;
  }

  async recordEmailEvent(
    emailId,
    eventType,
    details
  ) {
    try {
      await db
        .from('email_events')
        .insert({
          email_id: emailId,
          event_type: eventType,
          recipient: details?.recipient,
          occurred_at: new Date().toISOString(),
          details: details || {},
        })
        .execute();
    } catch (error) {
      console.error('Failed to record email event:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();