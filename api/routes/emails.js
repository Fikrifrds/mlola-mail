import { Router } from 'express';
import { emailService } from '../services/emailService.js';
import { db } from '../config/database.js';
import { validateRequest } from '../middleware/validation.js';
import { sendEmailSchema } from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// Send email
router.post('/send',
  authenticateToken,
  validateRequest(sendEmailSchema),
  asyncHandler(async (req, res) => {
    const { recipients, templateId, variables, scheduledAt, subject, htmlContent, textContent, senderAddressId } = req.body;
    const userId = req.user.userId;
    // If template provided, fetch it
    let template = null;
    let brand = null;
    if (templateId) {
      const { data: tpl } = await db
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', userId)
        .single()
        .execute();

      if (!tpl) {
        return res.status(404).json({ error: 'Template not found' });
      }
      template = tpl;

      // If template has a brand, fetch brand data
      if (template && template.brand_id) {
        const { data: brandData } = await db
          .from('brands')
          .select('*')
          .eq('id', template.brand_id)
          .single()
          .execute();
        brand = brandData;
      }
    }

    // Helper function to inject brand variables
    const injectBrandVariables = (content, brandData) => {
      if (!brandData || !content) return content;
      let injected = content;
      // Official brand variables
      injected = injected.replace(/\{\{brand_name\}\}/g, brandData.name || '');
      injected = injected.replace(/\{\{brand_logo\}\}/g, brandData.logo_url || '');
      injected = injected.replace(/\{\{brand_website\}\}/g, brandData.website || '');
      // Common aliases
      injected = injected.replace(/\{\{company\}\}/g, brandData.name || '');
      injected = injected.replace(/\{\{company_name\}\}/g, brandData.name || '');
      injected = injected.replace(/\{\{company_logo\}\}/g, brandData.logo_url || '');
      injected = injected.replace(/\{\{company_website\}\}/g, brandData.website || '');
      return injected;
    };

    // Prepare email content with brand variables injected
    let finalSubject = template ? template.subject : subject;
    let finalHtmlContent = template ? template.html_content : htmlContent;
    let finalTextContent = template ? template.text_content : textContent;

    // Inject brand variables if brand exists
    if (brand) {
      finalSubject = injectBrandVariables(finalSubject, brand);
      finalHtmlContent = injectBrandVariables(finalHtmlContent, brand);
      finalTextContent = injectBrandVariables(finalTextContent, brand);
    }

    // Create email record
    const { data: email, error: emailError } = await db
      .from('emails')
      .insert([{
        user_id: userId,
        template_id: templateId || null,
        recipients: JSON.stringify(recipients),
        variables: JSON.stringify(variables || {}),
        status: 'pending',
        scheduled_at: scheduledAt || null,
        created_at: new Date().toISOString(),
      }])
      .single()
      .execute();

    if (emailError) {
      throw new Error(`Failed to create email record: ${emailError.message}`);
    }

    // Helper function to inject recipient variables
    const injectRecipientVariables = (content, recipient, globalVariables) => {
      if (!content) return content;
      let injected = content;

      // 1. Replace global variables first
      if (globalVariables) {
        Object.keys(globalVariables).forEach(key => {
          // Escape special regex characters in key
          const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\{\\{${safeKey}\\}\\}`, 'g');
          injected = injected.replace(regex, globalVariables[key] || '');
        });
      }

      // 2. Replace recipient specific variables
      injected = injected.replace(/\{\{name\}\}/g, recipient.name || '');
      injected = injected.replace(/\{\{email\}\}/g, recipient.email || '');

      return injected;
    };

    try {
      // Bulk send: iterate recipients
      const results = [];
      for (const recipient of recipients) {
        try {
          // Inject variables for this specific recipient
          const recipientSubject = injectRecipientVariables(finalSubject, recipient, variables);
          const recipientHtml = injectRecipientVariables(finalHtmlContent, recipient, variables);
          const recipientText = injectRecipientVariables(finalTextContent, recipient, variables);

          const emailRecord = await emailService.sendEmail(
            userId,
            recipient,
            recipientSubject,
            recipientHtml,
            recipientText,
            templateId || undefined,
            email.id,
            senderAddressId || undefined
          );
          results.push({ recipient: recipient.email, messageId: emailRecord.messageId });
        } catch (e) {
          results.push({ recipient: recipient.email, error: e instanceof Error ? e.message : 'Failed' });
        }
      }

      // Update email status based on results
      const allSucceeded = results.every(r => !!r.messageId);
      await db
        .from('emails')
        .update({
          status: allSucceeded ? 'sent' : (results.some(r => r.messageId) ? 'sent' : 'failed'),
          sent_at: new Date().toISOString(),
        })
        .eq('id', email.id)
        .execute();

      // Record sent events per successful recipient
      for (const r of results) {
        if (r.messageId) {
          await emailService.recordEmailEvent(email.id, 'sent', { messageId: r.messageId, recipient: r.recipient });
        }
      }

      res.json({
        success: true,
        emailId: email.id,
        results,
      });
    } catch (error) {
      await db
        .from('emails')
        .update({ status: 'failed' })
        .eq('id', email.id)
        .execute();
      throw error;
    }
  })
);

// Get email status
router.get('/status/:emailId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { emailId } = req.params;
    const userId = req.user.userId;

    // Get email
    const { data: email } = await db
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Get related events
    const { data: events } = await db
      .from('email_events')
      .select('*')
      .eq('email_id', emailId)
      .order('occurred_at', { ascending: true })
      .execute();

    res.json({
      success: true,
      email: {
        id: email.id,
        status: email.status,
        recipients: email.recipients,
        variables: email.variables,
        scheduled_at: email.scheduled_at,
        sent_at: email.sent_at,
        created_at: email.created_at,
        events: events || [],
      },
    });
  })
);

// Get user's email history
router.get('/history',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;

    // Use raw SQL query to get all data with joins
    let query = `
      SELECT 
        e.*,
        t.id as template__id,
        t.name as template__name,
        t.subject as template__subject,
        c.id as campaign__id,
        c.name as campaign__name,
        g.id as group__id,
        g.name as group__name
      FROM emails e
      LEFT JOIN templates t ON e.template_id = t.id
      LEFT JOIN campaigns c ON e.campaign_id = c.id
      LEFT JOIN groups g ON c.group_id = g.id
      WHERE e.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY e.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const { rows: emails } = await db.query(query, params);

    // Transform flattened data into nested structure
    const enriched = emails.map(e => {
      const email = { ...e };

      // Template
      if (email.template__id) {
        email.template = {
          id: email.template__id,
          name: email.template__name,
          subject: email.template__subject,
        };
      }
      delete email.template__id;
      delete email.template__name;
      delete email.template__subject;

      // Campaign
      if (email.campaign__id) {
        email.campaign = {
          id: email.campaign__id,
          name: email.campaign__name,
        };
      }
      delete email.campaign__id;
      delete email.campaign__name;

      // Group
      if (email.group__id) {
        email.group = {
          id: email.group__id,
          name: email.group__name,
        };
      }
      delete email.group__id;
      delete email.group__name;

      return email;
    });

    res.json({
      success: true,
      emails: enriched,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: enriched.length,
        pages: Math.ceil(enriched.length / Number(limit)),
      },
    });
  })
);

// Get single email details
router.get('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Fetch email with all related data
    const { rows: [email] } = await db.query(`
      SELECT 
        e.*,
        t.id as template__id,
        t.name as template__name,
        t.subject as template__subject,
        t.html_content as template__html,
        t.text_content as template__text,
        c.id as campaign__id,
        c.name as campaign__name,
        c.subject as campaign__subject,
        c.html_content as campaign__html,
        c.text_content as campaign__text,
        g.id as group__id,
        g.name as group__name
      FROM emails e
      LEFT JOIN templates t ON e.template_id = t.id
      LEFT JOIN campaigns c ON e.campaign_id = c.id
      LEFT JOIN groups g ON c.group_id = g.id
      WHERE e.id = $1 AND e.user_id = $2
    `, [id, userId]);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Get email events
    const { rows: events } = await db.query(`
      SELECT * FROM email_events 
      WHERE email_id = $1 
      ORDER BY occurred_at DESC
    `, [id]);

    // Transform data
    const result = { ...email, events };

    if (email.template__id) {
      result.template = {
        id: email.template__id,
        name: email.template__name,
        subject: email.template__subject,
        html_content: email.template__html,
        text_content: email.template__text,
      };
    }

    if (email.campaign__id) {
      result.campaign = {
        id: email.campaign__id,
        name: email.campaign__name,
        subject: email.campaign__subject,
        html_content: email.campaign__html,
        text_content: email.campaign__text,
      };
    }

    if (email.group__id) {
      result.group = {
        id: email.group__id,
        name: email.group__name,
      };
    }

    // Clean up flattened fields
    delete result.template__id;
    delete result.template__name;
    delete result.template__subject;
    delete result.template__html;
    delete result.template__text;
    delete result.campaign__id;
    delete result.campaign__name;
    delete result.campaign__subject;
    delete result.campaign__html;
    delete result.campaign__text;
    delete result.group__id;
    delete result.group__name;

    res.json({ success: true, email: result });
  })
);

export default router;