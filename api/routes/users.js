import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { db } from '../config/database.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/profile',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;

        const { data: user, error } = await db
            .from('users')
            .select('id, email, name, company, timezone, created_at, updated_at')
            .eq('id', userId)
            .single()
            .execute();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.json({
            success: true,
            user,
        });
    })
);

// Update user profile
router.put('/profile',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { name, company, timezone } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (company !== undefined) updateData.company = company;
        if (timezone !== undefined) updateData.timezone = timezone;
        updateData.updated_at = new Date().toISOString();

        const { error } = await db
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .execute();

        if (error) {
            console.error('Failed to update user profile:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile',
            });
        }

        // Fetch updated user
        const { data: user, error: fetchError } = await db
            .from('users')
            .select('id, email, name, company, timezone, created_at, updated_at')
            .eq('id', userId)
            .single()
            .execute();

        if (fetchError || !user) {
            return res.status(500).json({
                success: false,
                message: 'Profile updated but failed to fetch updated data',
            });
        }

        res.json({
            success: true,
            user,
        });
    })
);

export default router;
