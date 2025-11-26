import crypto from 'crypto';

export class EmailTrackingService {
  static instance;
  baseUrl;

  constructor() {
    this.baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  }

  static getInstance() {
    if (!EmailTrackingService.instance) {
      EmailTrackingService.instance = new EmailTrackingService();
    }
    return EmailTrackingService.instance;
  }

  getTrackingPixel(emailId) {
    const trackingId = this.generateTrackingId(emailId);
    const pixelUrl = `${this.baseUrl}/api/track/pixel/${trackingId}`;
    
    return `<img src="${pixelUrl}" width="1" height="1" border="0" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  }

  getTrackingUrl(emailId, originalUrl) {
    const trackingId = this.generateTrackingId(emailId, originalUrl);
    return `${this.baseUrl}/api/track/click/${trackingId}?url=${encodeURIComponent(originalUrl)}`;
  }

  addTrackingToHtml(htmlContent, emailId) {
    // Add click tracking to all links
    return htmlContent.replace(
      /<a\s+([^>]*?)href="([^"]*)"([^>]*?)>/gi,
      (match, beforeHref, href, afterHref) => {
        if (href.startsWith('mailto:') || href.startsWith('tel:')) {
          return match; // Don't track email and phone links
        }
        
        const trackingUrl = this.getTrackingUrl(emailId, href);
        return `<a ${beforeHref}href="${trackingUrl}"${afterHref}>`;
      }
    );
  }

  generateTrackingId(emailId, additionalData) {
    const data = `${emailId}:${additionalData || 'open'}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  decodeTrackingId(trackingId) {
    try {
      // This is a simplified implementation
      // In a real implementation, you'd store tracking data in Redis/database
      return {
        emailId: 'decoded_email_id', // This would come from your storage
        type: 'open',
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to decode tracking ID:', error);
      return null;
    }
  }

  async recordOpen(emailId, userAgent, ipAddress) {
    try {
      // Record open event in database
      const { db } = await import('../config/database.js');
      
      await db
        .from('email_events')
        .insert({
          email_id: emailId,
          event_type: 'opened',
          occurred_at: new Date().toISOString(),
          details: {
            userAgent,
            ipAddress,
          },
        });

      // Update email status if needed
      await db
        .from('emails')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', emailId);

      console.log(`Email opened: ${emailId}`);
    } catch (error) {
      console.error('Failed to record email open:', error);
    }
  }

  async recordClick(emailId, url, userAgent, ipAddress) {
    try {
      // Record click event in database
      const { db } = await import('../config/database.js');
      
      await db
        .from('email_events')
        .insert({
          email_id: emailId,
          event_type: 'clicked',
          occurred_at: new Date().toISOString(),
          details: {
            url,
            userAgent,
            ipAddress,
          },
        });

      // Update email click count
      await db
        .from('emails')
        .update({ 
          clicked_at: new Date().toISOString(),
          click_count: db.rpc('increment', { column: 'click_count' })
        })
        .eq('id', emailId);

      console.log(`Email link clicked: ${emailId} -> ${url}`);
    } catch (error) {
      console.error('Failed to record email click:', error);
    }
  }

  async getEmailStats(emailId) {
    try {
      const { db } = await import('../config/database.js');
      
      const { data: events, error } = await db
        .from('email_events')
        .select('event_type, occurred_at')
        .eq('email_id', emailId);

      if (error) {
        throw error;
      }

      const opens = events?.filter(e => e.event_type === 'opened') || [];
      const clicks = events?.filter(e => e.event_type === 'clicked') || [];

      return {
        opens: opens.length,
        clicks: clicks.length,
        uniqueOpens: opens.length, // Simplified - in real implementation, track unique sessions
        uniqueClicks: clicks.length,
        lastOpened: opens.length > 0 ? opens[opens.length - 1].occurred_at : undefined,
        lastClicked: clicks.length > 0 ? clicks[clicks.length - 1].occurred_at : undefined,
      };
    } catch (error) {
      console.error('Failed to get email stats:', error);
      return { opens: 0, clicks: 0, uniqueOpens: 0, uniqueClicks: 0 };
    }
  }
}

export const emailTrackingService = EmailTrackingService.getInstance();