import cron from 'node-cron';
import { db } from '../config/database.js';
import { emailService } from '../services/emailService.js';

let schedulerRunning = false;

/**
 * Check for scheduled campaigns and send them
 */
async function processScheduledCampaigns() {
    if (schedulerRunning) {
        console.log('⏭️  Scheduler already running, skipping...');
        return;
    }

    schedulerRunning = true;
    try {
        // Find campaigns that are scheduled and ready to send
        const { rows: campaigns } = await db.query(`
            SELECT c.*, 
                   g.name as group_name,
                   t.name as template_name,
                   t.subject as tpl_subject,
                   t.html_content as tpl_html,
                   t.text_content as tpl_text
            FROM campaigns c
            LEFT JOIN groups g ON c.group_id = g.id
            LEFT JOIN templates t ON c.template_id = t.id
            WHERE c.status = 'scheduled' 
              AND c.scheduled_at <= NOW()
            ORDER BY c.scheduled_at ASC
            LIMIT 10
        `);

        if (campaigns.length === 0) {
            console.log('📭 No scheduled campaigns to process');
            return;
        }

        console.log(`📬 Found ${campaigns.length} scheduled campaign(s) to process`);

        for (const campaign of campaigns) {
            try {
                await sendCampaign(campaign);
            } catch (error) {
                console.error(`❌ Failed to send campaign ${campaign.id}:`, error);

                // Mark campaign as failed
                await db.query(`
                    UPDATE campaigns 
                    SET status = 'failed', 
                        sent_at = NOW()
                    WHERE id = $1
                `, [campaign.id]);
            }
        }
    } catch (error) {
        console.error('❌ Scheduler error:', error);
    } finally {
        schedulerRunning = false;
    }
}

/**
 * Send a campaign
 */
async function sendCampaign(campaign) {
    console.log(`📤 Sending campaign: ${campaign.name} (ID: ${campaign.id})`);

    if (!campaign.group_id) {
        throw new Error('Campaign has no target group');
    }

    // Fetch recipients
    const { rows: recipients } = await db.query(`
        SELECT c.email, c.name, c.unsubscribe_token
        FROM contacts c
        JOIN group_members gm ON c.id = gm.contact_id
        WHERE gm.group_id = $1 AND c.is_active = true AND c.unsubscribed_at IS NULL
    `, [campaign.group_id]);

    if (recipients.length === 0) {
        throw new Error('Target group has no active contacts');
    }

    // Fetch brand if exists
    let brand = null;
    if (campaign.brand_id) {
        const { rows: [brandData] } = await db.query('SELECT * FROM brands WHERE id = $1', [campaign.brand_id]);
        brand = brandData;
    }

    // Update status to sending
    await db.query(`UPDATE campaigns SET status = 'sending', sent_at = NOW() WHERE id = $1`, [campaign.id]);

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
            const { rows: [emailRecord] } = await db.query(`
                INSERT INTO emails (user_id, template_id, campaign_id, recipients, status, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING *
            `, [
                campaign.user_id,
                campaign.template_id || null,
                campaign.id,
                JSON.stringify([{ email: recipient.email, name: recipient.name }]),
                'pending'
            ]);

            await emailService.sendEmail(
                campaign.user_id,
                recipient,
                recipientSubject,
                recipientHtml,
                recipientText,
                campaign.template_id || undefined,
                emailRecord.id,
                undefined
            );

            // Update email status to sent
            await db.query(`
                UPDATE emails 
                SET status = 'sent', sent_at = NOW() 
                WHERE id = $1
            `, [emailRecord.id]);

            successCount++;
        } catch (error) {
            console.error(`Failed to send to ${recipient.email}:`, error);
            failureCount++;
        }
    }

    // Update campaign stats
    await db.query(`
        UPDATE campaigns 
        SET status = 'completed',
            total_recipients = $1,
            successful_sends = $2,
            failed_sends = $3
        WHERE id = $4
    `, [recipients.length, successCount, failureCount, campaign.id]);

    console.log(`✅ Campaign ${campaign.id} completed: ${successCount} sent, ${failureCount} failed`);
}

/**
 * Start the scheduler
 */
export function startScheduler() {
    console.log('⏰ Starting campaign scheduler...');

    // Run every minute
    cron.schedule('* * * * *', async () => {
        await processScheduledCampaigns();
    });

    console.log('✅ Campaign scheduler started (runs every minute)');
}
