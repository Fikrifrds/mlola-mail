import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// Get analytics overview
router.get('/overview',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { startDate, endDate, templateId } = req.query;

    let baseQuery = db
      .from('emails')
      .select('*')
      .eq('user_id', userId);

    if (startDate) {
      baseQuery = baseQuery.gte('created_at', startDate);
    }

    if (endDate) {
      baseQuery = baseQuery.lte('created_at', endDate);
    }

    if (templateId) {
      baseQuery = baseQuery.eq('template_id', templateId);
    }

    const { data: emails, error } = await baseQuery.execute();

    if (error) {
      throw new Error(`Failed to fetch analytics data: ${error.message}`);
    }

    const totalSent = emails?.length || 0;
    const totalDelivered = emails?.filter(e => e.status === 'delivered').length || 0;
    const totalBounced = emails?.filter(e => e.status === 'bounced').length || 0;
    const totalComplained = emails?.filter(e => e.status === 'complained').length || 0;

    // Get open and click events
    const emailIds = emails?.map(e => e.id) || [];
    
    let eventsQuery = db
      .from('email_events')
      .select('*')
      .in('email_id', emailIds);

    if (startDate) {
      eventsQuery = eventsQuery.gte('occurred_at', startDate);
    }

    if (endDate) {
      eventsQuery = eventsQuery.lte('occurred_at', endDate);
    }

    const { data: events } = await eventsQuery.execute();

    const totalOpened = new Set(events?.filter(e => e.event_type === 'opened').map(e => e.email_id)).size || 0;
    const totalClicked = new Set(events?.filter(e => e.event_type === 'clicked').map(e => e.email_id)).size || 0;

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    res.json({
      success: true,
      analytics: {
        totalSent,
        totalDelivered,
        totalBounced,
        totalComplained,
        totalOpened,
        totalClicked,
        openRate: Number(openRate.toFixed(2)),
        clickRate: Number(clickRate.toFixed(2)),
        bounceRate: Number(bounceRate.toFixed(2)),
      },
    });
  })
);

// Get time-series data for charts
router.get('/time-series',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let query = db
      .from('emails')
      .select(`
        *,
        email_events (*)
      `)
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: emails, error } = await query.execute();

    if (error) {
      throw new Error(`Failed to fetch time-series data: ${error.message}`);
    }

    // Process data for time-series chart
    const timeSeriesData = processTimeSeriesData(emails || [], String(groupBy));

    res.json({
      success: true,
      timeSeries: timeSeriesData,
    });
  })
);

// Get template performance
router.get('/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    let query = db
      .from('emails')
      .select(`
        *,
        templates (name, subject),
        email_events (*)
      `)
      .eq('user_id', userId)
      .not('template_id', 'is', null);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: emails, error } = await query.execute();

    if (error) {
      throw new Error(`Failed to fetch template analytics: ${error.message}`);
    }

    // Process template performance data
    const templatePerformance = processTemplatePerformance(emails || []);

    res.json({
      success: true,
      templates: templatePerformance,
    });
  })
);

// Helper functions
function processTimeSeriesData(emails, groupBy) {
  const data = {};

  emails.forEach(email => {
    const date = new Date(email.created_at);
    let key;

    switch (groupBy) {
      case 'hour':
        key = date.toISOString().slice(0, 13) + ':00:00';
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
        break;
      case 'month':
        key = date.toISOString().slice(0, 7) + '-01';
        break;
      default: // day
        key = date.toISOString().slice(0, 10);
    }

    if (!data[key]) {
      data[key] = {
        date: key,
        sent: 0,
        delivered: 0,
        bounced: 0,
        opened: 0,
        clicked: 0,
      };
    }

    data[key].sent++;
    if (email.status === 'delivered') data[key].delivered++;
    if (email.status === 'bounced') data[key].bounced++;

    // Count unique opens and clicks
    const opened = new Set(email.email_events?.filter(e => e.event_type === 'opened').map(e => e.email_id)).size;
    const clicked = new Set(email.email_events?.filter(e => e.event_type === 'clicked').map(e => e.email_id)).size;
    
    if (opened > 0) data[key].opened += opened;
    if (clicked > 0) data[key].clicked += clicked;
  });

  return Object.values(data).sort((a, b) => a.date.localeCompare(b.date));
}

function processTemplatePerformance(emails) {
  const templateStats = {};

  emails.forEach(email => {
    if (!email.templates) return;

    const templateId = email.template_id;
    const templateName = email.templates.name;

    if (!templateStats[templateId]) {
      templateStats[templateId] = {
        templateId,
        templateName,
        sent: 0,
        delivered: 0,
        bounced: 0,
        opened: 0,
        clicked: 0,
      };
    }

    templateStats[templateId].sent++;
    if (email.status === 'delivered') templateStats[templateId].delivered++;
    if (email.status === 'bounced') templateStats[templateId].bounced++;

    // Count unique opens and clicks
    const opened = new Set(email.email_events?.filter(e => e.event_type === 'opened').map(e => e.email_id)).size;
    const clicked = new Set(email.email_events?.filter(e => e.event_type === 'clicked').map(e => e.email_id)).size;
    
    if (opened > 0) templateStats[templateId].opened += opened;
    if (clicked > 0) templateStats[templateId].clicked += clicked;
  });

  return Object.values(templateStats).map(template => ({
    ...template,
    openRate: template.sent > 0 ? (template.opened / template.sent) * 100 : 0,
    clickRate: template.opened > 0 ? (template.clicked / template.opened) * 100 : 0,
    bounceRate: template.sent > 0 ? (template.bounced / template.sent) * 100 : 0,
  }));
}

export default router;