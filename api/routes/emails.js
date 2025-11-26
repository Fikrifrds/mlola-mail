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
    let template = null;
    if (templateId) {
      const { data: tmpl } = await db
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', userId)
        .single()
        .execute();
      if (!tmpl) {
        return res.status(404).json({ error: 'Template not found' });
      }
      template = tmpl;
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

    try {
      // Bulk send: iterate recipients
      const results = [];
      for (const recipient of recipients) {
        try {
          const emailRecord = await emailService.sendEmail(
            userId,
            recipient,
            template ? template.subject : subject,
            template ? template.html_content : htmlContent,
            template ? template.text_content : textContent,
            templateId || undefined,
            email.id,
            senderAddressId || undefined  // Pass sender address ID
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

    // Base query
    let qb = db
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (status) {
      qb = qb.eq('status', String(status));
    }

    const { data: emails, error } = await qb.execute();
    if (error) {
      throw new Error(`Failed to fetch email history: ${error.message}`);
    }

    const list = emails || [];
    const templateIds = Array.from(new Set(list.map(e => e.template_id).filter(Boolean)));
    let templateMap = {};
    if (templateIds.length) {
      const { data: templates } = await db
        .from('templates')
        .select('id, name, subject')
        .execute();
      (templates || []).forEach((t) => { templateMap[t.id] = { name: t.name, subject: t.subject }; });
    }

    const enriched = list.map(e => ({
      ...e,
      template: e.template_id ? templateMap[e.template_id] || null : null,
    }));

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

export default router;