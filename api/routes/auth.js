import { Router } from 'express';
import { createUser, authenticateUser, updateUserEmailConfig, getUserById } from '../services/userService.js';
import { validateRequest } from '../middleware/validation.js';
import { registerSchema, loginSchema, emailConfigSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/error.js';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../config/database.js';
import { getSenderEmail } from '../config/alibabacloud.js';

const router = Router();

// User registration
router.post('/register',
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    const { user, token } = await createUser({ email, password, name });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
      },
    });
  })
);

// User login
router.post('/login',
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { user, token } = await authenticateUser(email, password);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
      },
    });
  })
);

// Get current authenticated user
router.get('/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const { data: user, error } = await db
      .from('users')
      .select('id, email, name, role, created_at, email_config')
      .eq('id', userId)
      .single()
      .execute();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        emailConfig: user.email_config || null,
      },
    });
  })
);

// Export router at the end after all routes are defined

// Update email config for current user
router.put('/email-config',
  authenticateToken,
  validateRequest(emailConfigSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const emailConfig = req.body;

    const user = await updateUserEmailConfig(userId, emailConfig);

    res.json({
      success: true,
      emailConfig: user.email_config,
    });
  })
);

// Get email config for current user (falls back to env)
router.get('/email-config',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const user = await getUserById(userId);

    const envFallback = {
      smtpHost: process.env.SMTP_HOST || null,
      smtpPort: process.env.SMTP_PORT || null,
      smtpUser: process.env.SMTP_USER || null,
      senderEmail: (() => { try { return getSenderEmail(); } catch { return null; } })(),
    };

    res.json({
      success: true,
      emailConfig: user?.email_config || envFallback,
      source: user?.email_config ? 'user' : 'env',
    });
  })
);

export default router
