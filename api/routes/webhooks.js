import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/error.js';
import { webhookSchema } from '../validation/schemas.js';
import crypto from 'crypto';
// TS types removed

const router = Router();

// Get all webhook endpoints
router.get('/endpoints',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const { data: endpoints, error } = await db
      .from('webhook_endpoints')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch webhook endpoints: ${error.message}`);
    }

    res.json({
      success: true,
      endpoints: endpoints || [],
    });
  })
);

// Create webhook endpoint
router.post('/endpoints',
  authenticateToken,
  validateRequest(webhookSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { url, events, description } = req.body;

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex');

    const { data: endpoint, error } = await db
      .from('webhook_endpoints')
      .insert({
        user_id: userId,
        url,
        events,
        description,
        secret,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create webhook endpoint: ${error.message}`);
    }

    res.json({
      success: true,
      endpoint: {
        ...endpoint,
        secret, // Include secret in response for initial setup
      },
    });
  })
);

// Update webhook endpoint
router.put('/endpoints/:id',
  authenticateToken,
  validateRequest(webhookSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { url, events, description, active } = req.body;

    // Verify ownership
    const { data: existing } = await db
      .from('webhook_endpoints')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Webhook endpoint not found',
      });
    }

    const { data: endpoint, error } = await db
      .from('webhook_endpoints')
      .update({
        url,
        events,
        description,
        is_active: active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update webhook endpoint: ${error.message}`);
    }

    res.json({
      success: true,
      endpoint,
    });
  })
);

// Delete webhook endpoint
router.delete('/endpoints/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await db
      .from('webhook_endpoints')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Webhook endpoint not found',
      });
    }

    const { error } = await db
      .from('webhook_endpoints')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete webhook endpoint: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Webhook endpoint deleted successfully',
    });
  })
);

// Regenerate webhook secret
router.post('/endpoints/:id/regenerate-secret',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await db
      .from('webhook_endpoints')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Webhook endpoint not found',
      });
    }

    const newSecret = crypto.randomBytes(32).toString('hex');

    const { data: endpoint, error } = await db
      .from('webhook_endpoints')
      .update({
        secret: newSecret,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to regenerate webhook secret: ${error.message}`);
    }

    res.json({
      success: true,
      endpoint: {
        ...endpoint,
        secret: newSecret,
      },
    });
  })
);

// Get webhook delivery history
router.get('/deliveries',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { endpointId, limit = 50, offset = 0 } = req.query;

    let query = db
      .from('webhook_deliveries')
      .select(`
        *,
        webhook_endpoints (url, description)
      `)
      .eq('webhook_endpoint_id.user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (endpointId) {
      query = query.eq('webhook_endpoint_id', endpointId);
    }

    const { data: deliveries, error } = await query.execute();

    if (error) {
      throw new Error(`Failed to fetch webhook deliveries: ${error.message}`);
    }

    res.json({
      success: true,
      deliveries: deliveries || [],
      total: (deliveries || []).length,
    });
  })
);

export default router;