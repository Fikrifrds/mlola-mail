import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/error.js';
import crypto from 'crypto';

const router = Router();

// Get all API keys for the authenticated user
router.get('/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const { data: apiKeys, error } = await db
      .from('api_keys')
      .select('id, name, key_preview, active, created_at, last_used_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch API keys: ${error.message}`);
    }

    res.json({
      success: true,
      apiKeys: apiKeys || [],
    });
  })
);

// Create new API key
router.post('/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { name, expiresInDays = 365 } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'API key name is required',
      });
    }

    // Generate API key
    const apiKey = `mlola_${crypto.randomBytes(32).toString('hex')}`;
    const keyPreview = apiKey.slice(-8);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data: createdKey, error } = await db
      .from('api_keys')
      .insert({
        user_id: userId,
        name: name.trim(),
        key_preview: keyPreview,
        key_hash: crypto.createHash('sha256').update(apiKey).digest('hex'),
        active: true,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, name, key_preview, active, created_at, expires_at')
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    res.json({
      success: true,
      apiKey: {
        ...createdKey,
        api_key: apiKey, // Only show the full key once
      },
      message: 'API key created successfully. Store this key securely as it won\'t be shown again.',
    });
  })
);

// Update API key (name or active status)
router.put('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, active } = req.body;

    // Verify ownership
    const { data: existing } = await db
      .from('api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (active !== undefined) updateData.active = active;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedKey, error } = await db
      .from('api_keys')
      .update(updateData)
      .eq('id', id)
      .select('id, name, key_preview, active, created_at, last_used_at, expires_at')
      .single();

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    res.json({
      success: true,
      apiKey: updatedKey,
    });
  })
);

// Delete API key
router.delete('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await db
      .from('api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
      });
    }

    const { error } = await db
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  })
);

// Validate API key middleware
export const validateApiKey = asyncHandler(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required',
    });
  }

  // Hash the provided key
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Find the API key
  const { data: apiKeyRecord, error } = await db
    .from('api_keys')
    .select('id, user_id, active, expires_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !apiKeyRecord) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
    });
  }

  // Check if key is active
  if (!apiKeyRecord.active) {
    return res.status(401).json({
      success: false,
      message: 'API key is inactive',
    });
  }

  // Check if key has expired
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return res.status(401).json({
      success: false,
      message: 'API key has expired',
    });
  }

  // Update last used timestamp
  await db
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyRecord.id);

  // Add user info to request
  req.user = {
    userId: apiKeyRecord.user_id,
    email: '', // API key requests don't have email
    role: 'user',
  };

  next();
});

export default router;