import crypto from 'crypto';
import { db } from '../config/database.js';

export class WebhookService {
  static instance;

  constructor() {}

  static getInstance() {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  async sendWebhook(endpointId, payload) {
    try {
      // Get webhook endpoint
      const { data: endpoint, error } = await db
        .from('webhook_endpoints')
        .select('*')
        .eq('id', endpointId)
        .eq('is_active', true)
        .single();

      if (error || !endpoint) {
        console.error('Webhook endpoint not found or inactive:', endpointId);
        return false;
      }

      // Check if endpoint wants this event type
      if (endpoint.events && !endpoint.events.includes(payload.event)) {
        console.log(`Endpoint ${endpointId} does not subscribe to event ${payload.event}`);
        return false;
      }

      // Create signature
      const signature = this.createSignature(payload, endpoint.secret);

      // Send webhook
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        body: JSON.stringify(payload),
      });

      // Record delivery
      await this.recordDelivery(endpointId, payload, response.status, response.statusText);

      return response.ok;
    } catch (error) {
      console.error('Failed to send webhook:', error);
      
      // Record failed delivery
      await this.recordDelivery(endpointId, payload, 0, error instanceof Error ? error.message : 'Unknown error');
      
      return false;
    }
  }

  async broadcastWebhook(userId, payload) {
    try {
      // Get all active webhook endpoints for user
      const { data: endpoints, error } = await db
        .from('webhook_endpoints')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error || !endpoints || endpoints.length === 0) {
        return;
      }

      // Send webhooks to all endpoints in parallel
      const promises = endpoints.map(endpoint => 
        this.sendWebhook(endpoint.id, payload)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to broadcast webhook:', error);
    }
  }

  createSignature(payload, secret) {
    const timestamp = payload.timestamp;
    const payloadString = JSON.stringify(payload);
    const signatureString = `${timestamp}.${payloadString}`;
    
    return crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex');
  }

  async recordDelivery(
    endpointId,
    payload,
    statusCode,
    response
  ) {
    try {
      await db
        .from('webhook_deliveries')
        .insert({
          webhook_endpoint_id: endpointId,
          event_type: payload.event,
          payload: payload,
          status_code: statusCode,
          response_body: response,
          delivered_at: statusCode >= 200 && statusCode < 300 ? new Date().toISOString() : null,
        });
    } catch (error) {
      console.error('Failed to record webhook delivery:', error);
    }
  }

  // Handle AWS SES webhook events
  async handleSESEvent(event) {
    try {
      console.log('Processing SES event:', JSON.stringify(event, null, 2));

      // Extract message from SNS event
      let message;
      if (event.Type === 'Notification' && event.Message) {
        message = JSON.parse(event.Message);
      } else {
        message = event;
      }

      if (!message.mail || !message.mail.messageId) {
        console.log('No message ID found in SES event');
        return;
      }

      const messageId = message.mail.messageId;

      // Find email by message ID
      const { data: email, error } = await db
        .from('emails')
        .select('id, user_id, status')
        .eq('message_id', messageId)
        .single();

      if (error || !email) {
        console.log(`Email not found for message ID: ${messageId}`);
        return;
      }

      // Process different event types
      if (message.eventType === 'delivery') {
        await this.handleDeliveryEvent(email, message);
      } else if (message.eventType === 'bounce') {
        await this.handleBounceEvent(email, message);
      } else if (message.eventType === 'complaint') {
        await this.handleComplaintEvent(email, message);
      } else if (message.eventType === 'click') {
        await this.handleClickEvent(email, message);
      } else if (message.eventType === 'open') {
        await this.handleOpenEvent(email, message);
      }

    } catch (error) {
      console.error('Failed to handle SES event:', error);
    }
  }

  async handleDeliveryEvent(email, message) {
    // Update email status
    await db
      .from('emails')
      .update({ status: 'delivered' })
      .eq('id', email.id);

    // Record email event
    await db
      .from('email_events')
      .insert({
        email_id: email.id,
        event_type: 'delivered',
        occurred_at: new Date().toISOString(),
        details: {
          timestamp: message.delivery?.timestamp,
          recipients: message.delivery?.recipients,
        },
      });

    // Send webhook
    await this.broadcastWebhook(email.user_id, {
      event: 'email.delivered',
      email_id: email.id,
      timestamp: new Date().toISOString(),
      data: {
        timestamp: message.delivery?.timestamp,
        recipients: message.delivery?.recipients,
      },
    });
  }

  async handleBounceEvent(email, message) {
    const bounceType = message.bounce?.bounceType;
    const status = bounceType === 'Permanent' ? 'bounced' : 'soft_bounced';

    // Update email status
    await db
      .from('emails')
      .update({ status })
      .eq('id', email.id);

    // Record email event
    await db
      .from('email_events')
      .insert({
        email_id: email.id,
        event_type: 'bounced',
        occurred_at: new Date().toISOString(),
        details: {
          bounceType,
          bounceSubType: message.bounce?.bounceSubType,
          bouncedRecipients: message.bounce?.bouncedRecipients,
        },
      });

    // Send webhook
    await this.broadcastWebhook(email.user_id, {
      event: 'email.bounced',
      email_id: email.id,
      timestamp: new Date().toISOString(),
      data: {
        bounceType,
        bounceSubType: message.bounce?.bounceSubType,
        bouncedRecipients: message.bounce?.bouncedRecipients,
      },
    });
  }

  async handleComplaintEvent(email, message) {
    // Update email status
    await db
      .from('emails')
      .update({ status: 'complained' })
      .eq('id', email.id);

    // Record email event
    await db
      .from('email_events')
      .insert({
        email_id: email.id,
        event_type: 'complained',
        occurred_at: new Date().toISOString(),
        details: {
          complaintFeedbackType: message.complaint?.complaintFeedbackType,
          complainedRecipients: message.complaint?.complainedRecipients,
        },
      });

    // Send webhook
    await this.broadcastWebhook(email.user_id, {
      event: 'email.complained',
      email_id: email.id,
      timestamp: new Date().toISOString(),
      data: {
        complaintFeedbackType: message.complaint?.complaintFeedbackType,
        complainedRecipients: message.complaint?.complainedRecipients,
      },
    });
  }

  async handleClickEvent(email, message) {
    // Record email event
    await db
      .from('email_events')
      .insert({
        email_id: email.id,
        event_type: 'clicked',
        occurred_at: new Date().toISOString(),
        details: {
          clickTimestamp: message.click?.timestamp,
          clickUrl: message.click?.link,
          clickTags: message.click?.tags,
        },
      });

    // Send webhook
    await this.broadcastWebhook(email.user_id, {
      event: 'email.clicked',
      email_id: email.id,
      timestamp: new Date().toISOString(),
      data: {
        clickTimestamp: message.click?.timestamp,
        clickUrl: message.click?.link,
        clickTags: message.click?.tags,
      },
    });
  }

  async handleOpenEvent(email, message) {
    // Record email event
    await db
      .from('email_events')
      .insert({
        email_id: email.id,
        event_type: 'opened',
        occurred_at: new Date().toISOString(),
        details: {
          openTimestamp: message.open?.timestamp,
          userAgent: message.open?.userAgent,
        },
      });

    // Send webhook
    await this.broadcastWebhook(email.user_id, {
      event: 'email.opened',
      email_id: email.id,
      timestamp: new Date().toISOString(),
      data: {
        openTimestamp: message.open?.timestamp,
        userAgent: message.open?.userAgent,
      },
    });
  }
}

export const webhookService = WebhookService.getInstance();