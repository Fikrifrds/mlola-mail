import { Router } from 'express';
import { db } from '../config/database.js';
import { validateRequest } from '../middleware/validation.js';
import { campaignSchema } from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { emailService } from '../services/emailService.js';

const router = Router();

// Get all campaigns
router.get('/',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { page = 1, limit = 20 } = req.query;

        const { rows: campaigns } = await db.query(`
      SELECT 
        c.*,
        g.name as group_name,
        t.name as template_name
      FROM campaigns c
      LEFT JOIN groups g ON c.group_id = g.id
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, (page - 1) * limit]);

        const { rows: [{ count }] } = await db.query(
            'SELECT COUNT(*) FROM campaigns WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            campaigns: campaigns || [],
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: Number(count),
                pages: Math.ceil(Number(count) / Number(limit)),
            },
        });
    })
);

// Create campaign
router.post('/',
    authenticateToken,
    validateRequest(campaignSchema),
    asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { name, subject, templateId, groupId, htmlContent, textContent, scheduledAt } = req.body;

        const { data: campaign, error } = await db
            .from('campaigns')
            .insert({
                user_id: userId,
                name,
                subject,
                template_id: templateId || null,
                group_id: groupId || null,
                html_content: htmlContent,
                text_content: textContent,
                scheduled_at: scheduledAt || null,
                status: scheduledAt ? 'scheduled' : 'draft',
            })
            .single()
            .execute();

        if (error) throw error;

        res.status(201).json({ success: true, campaign });
    })
);

// Get single campaign
router.get('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        const { rows: [campaign] } = await db.query(`
      SELECT 
        c.*,
        g.name as group_name,
        t.name as template_name
      FROM campaigns c
      LEFT JOIN groups g ON c.group_id = g.id
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.id = $1 AND c.user_id = $2
    `, [id, userId]);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({ success: true, campaign });
    })
);

// Update campaign
router.put('/:id',
    authenticateToken,
    validateRequest(campaignSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        const { name, subject, templateId, groupId, htmlContent, textContent, scheduledAt, status } = req.body;

        const { data: campaign, error } = await db
            .from('campaigns')
            .update({
                name,
                subject,
                template_id: templateId || null,
                group_id: groupId || null,
                html_content: htmlContent,
                text_content: textContent,
                scheduled_at: scheduledAt || null,
                status: status || undefined,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .execute();

        if (error) throw error;
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        res.json({ success: true, campaign });
    })
);

// Send campaign
router.post('/:id/send',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        // Fetch campaign details
        const { rows: [campaign] } = await db.query(`
      SELECT c.*, t.html_content as tpl_html, t.text_content as tpl_text, t.subject as tpl_subject, t.brand_id
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.id = $1 AND c.user_id = $2
    `, [id, userId]);

        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (!campaign.group_id) return res.status(400).json({ error: 'Campaign has no target group' });

        // Fetch recipients
        const { rows: recipients } = await db.query(`
      SELECT c.email, c.name, c.unsubscribe_token
      FROM contacts c
      JOIN group_members gm ON c.id = gm.contact_id
      WHERE gm.group_id = $1 AND c.is_active = true AND c.unsubscribed_at IS NULL
    `, [campaign.group_id]);

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'Target group has no active contacts' });
        }

        // Fetch brand if exists
        let brand = null;
        if (campaign.brand_id) {
            const { rows: [brandData] } = await db.query('SELECT * FROM brands WHERE id = $1', [campaign.brand_id]);
            brand = brandData;
        }

        // Update status to sending
        await db.from('campaigns').update({ status: 'sending' }).eq('id', id).execute();

        // Start sending process (async)
        // In a real production app, this should be offloaded to a queue (e.g., BullMQ)
        (async () => {
            let successCount = 0;
            let failureCount = 0;

            const subject = campaign.subject || campaign.tpl_subject;
            const htmlContent = campaign.html_content || campaign.tpl_html;
            const textContent = campaign.text_content || campaign.tpl_text;
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

            // Helper to inject brand variables
            const injectBrandVariables = (content, brandData) => {
                if (!brandData || !content) return content;
                let injected = content;
                injected = injected.replace(/\{\{brand_name\}\}/g, brandData.name || '');
                injected = injected.replace(/\{\{brand_logo\}\}/g, brandData.logo_url || '');
                injected = injected.replace(/\{\{brand_website\}\}/g, brandData.website || '');
                injected = injected.replace(/\{\{company\}\}/g, brandData.name || '');
                injected = injected.replace(/\{\{company_name\}\}/g, brandData.name || '');
                injected = injected.replace(/\{\{company_logo\}\}/g, brandData.logo_url || '');
                injected = injected.replace(/\{\{company_website\}\}/g, brandData.website || '');
                return injected;
            };

            // Helper to inject recipient variables
            const injectRecipientVariables = (content, recipient) => {
                if (!content) return content;
                let injected = content;
                injected = injected.replace(/\{\{name\}\}/g, recipient.name || '');
                injected = injected.replace(/\{\{email\}\}/g, recipient.email || '');

                const unsubscribeUrl = `${clientUrl}/unsubscribe?token=${recipient.unsubscribe_token}`;
                injected = injected.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

                return injected;
            };

            // Pre-inject brand variables (same for all)
            let finalSubject = subject;
            let finalHtml = htmlContent;
            let finalText = textContent;

            if (brand) {
                finalSubject = injectBrandVariables(finalSubject, brand);
                finalHtml = injectBrandVariables(finalHtml, brand);
                finalText = injectBrandVariables(finalText, brand);
            }

            for (const recipient of recipients) {
                try {
                    const recipientSubject = injectRecipientVariables(finalSubject, recipient);
                    const recipientHtml = injectRecipientVariables(finalHtml, recipient);
                    const recipientText = injectRecipientVariables(finalText, recipient);

                    // Create email record with campaign link
                    const { data: emailRecord, error: emailError } = await db
                        .from('emails')
                        .insert({
                            user_id: userId,
                            template_id: campaign.template_id || null,
                            campaign_id: id,
                            recipients: JSON.stringify([{ email: recipient.email, name: recipient.name }]),
                            status: 'pending',
                            created_at: new Date().toISOString(),
                        })
                        .single()
                        .execute();

                    if (emailError) {
                        console.error('Failed to create email record:', emailError);
                        failureCount++;
                        continue;
                    }

                    await emailService.sendEmail(
                        userId,
                        recipient,
                        recipientSubject,
                        recipientHtml,
                        recipientText,
                        campaign.template_id || undefined,
                        emailRecord.id, // Pass email record ID
                        undefined
                    );

                    // Update email status to sent
                    await db.from('emails').update({
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    }).eq('id', emailRecord.id).execute();

                    successCount++;
                } catch (error) {
                    console.error(`Failed to send campaign email to ${recipient.email}:`, error);
                    failureCount++;
                }
            }

            // Update campaign stats
            await db.from('campaigns').update({
                status: 'completed',
                sent_at: new Date().toISOString(),
                total_recipients: recipients.length,
                successful_sends: successCount,
                failed_sends: failureCount,
            }).eq('id', id).execute();
        })();

        res.json({ success: true, message: 'Campaign sending started', recipientCount: recipients.length });
    })
);

// Send test email for campaign
router.post('/:id/test',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { id } = req.params;
        const { testEmail } = req.body;

        if (!testEmail) {
            return res.status(400).json({ error: 'Test email address is required' });
        }

        // Fetch campaign
        const { rows: [campaign] } = await db.query(`
            SELECT 
                c.*,
                g.name as group_name,
                t.name as template_name,
                t.subject as tpl_subject,
                t.html_content as tpl_html,
                t.text_content as tpl_text
            FROM campaigns c
            LEFT JOIN groups g ON c.group_id = g.id
            LEFT JOIN templates t ON c.template_id = t.id
            WHERE c.id = $1 AND c.user_id = $2
        `, [id, userId]);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Fetch brand if exists
        let brand = null;
        if (campaign.brand_id) {
            const { rows: [brandData] } = await db.query('SELECT * FROM brands WHERE id = $1', [campaign.brand_id]);
            brand = brandData;
        }

        const subject = campaign.subject || campaign.tpl_subject;
        let htmlContent = campaign.html_content || campaign.tpl_html;
        let textContent = campaign.text_content || campaign.tpl_text;
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

        // Apply brand variables
        if (brand) {
            htmlContent = htmlContent.replace(/\{\{brand_name\}\}/g, brand.name || '');
            htmlContent = htmlContent.replace(/\{\{brand_logo\}\}/g, brand.logo_url || '');
            htmlContent = htmlContent.replace(/\{\{brand_website\}\}/g, brand.website || '');
            textContent = textContent?.replace(/\{\{brand_name\}\}/g, brand.name || '');
        }

        // Apply recipient variables with test data
        htmlContent = htmlContent.replace(/\{\{name\}\}/g, 'Test User');
        htmlContent = htmlContent.replace(/\{\{email\}\}/g, testEmail);
        htmlContent = htmlContent.replace(/\{\{unsubscribe_url\}\}/g, `${clientUrl}/unsubscribe?token=TEST_TOKEN`);

        textContent = textContent?.replace(/\{\{name\}\}/g, 'Test User');
        textContent = textContent?.replace(/\{\{email\}\}/g, testEmail);
        textContent = textContent?.replace(/\{\{unsubscribe_url\}\}/g, `${clientUrl}/unsubscribe?token=TEST_TOKEN`);

        // Create test email record
        const { rows: [emailRecord] } = await db.query(`
            INSERT INTO emails (user_id, template_id, recipients, status, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *
        `, [
            userId,
            campaign.template_id || null,
            JSON.stringify([{ email: testEmail, name: 'Test User' }]),
            'pending'
        ]);

        // Send test email
        await emailService.sendEmail(
            userId,
            { email: testEmail, name: 'Test User' },
            `[TEST] ${subject}`,
            htmlContent,
            textContent,
            campaign.template_id || undefined,
            emailRecord.id,
            undefined
        );

        // Update email status
        await db.query(`
            UPDATE emails 
            SET status = 'sent', sent_at = NOW() 
            WHERE id = $1
        `, [emailRecord.id]);

        res.json({ success: true, message: 'Test email sent successfully' });
    })
);

export default router;
