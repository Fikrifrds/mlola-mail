import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { senderAddressSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/error.js';
import {
    getUserSenders,
    getDefaultSender,
    getSenderById,
    createSender,
    updateSender,
    deleteSender,
    setDefaultSender,
} from '../services/senderAddressService.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all sender addresses for current user
router.get('/',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const senders = await getUserSenders(userId);

        // Remove smtp_password from response
        const sanitized = senders.map(s => ({
            id: s.id,
            email: s.email,
            name: s.name,
            isDefault: s.is_default,
            isActive: s.is_active,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
        }));

        res.json({
            success: true,
            senders: sanitized,
        });
    })
);

// Get default sender
router.get('/default',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const sender = await getDefaultSender(userId);

        if (!sender) {
            return res.json({
                success: true,
                sender: null,
            });
        }

        res.json({
            success: true,
            sender: {
                id: sender.id,
                email: sender.email,
                name: sender.name,
                isDefault: sender.is_default,
                isActive: sender.is_active,
            },
        });
    })
);

// Create new sender address
router.post('/',
    validateRequest(senderAddressSchema),
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const sender = await createSender(userId, req.body);

        res.status(201).json({
            success: true,
            sender: {
                id: sender.id,
                email: sender.email,
                name: sender.name,
                isDefault: sender.is_default,
                isActive: sender.is_active,
                createdAt: sender.created_at,
            },
        });
    })
);

// Update sender address
router.put('/:id',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { id } = req.params;

        const sender = await updateSender(id, userId, req.body);

        if (!sender) {
            return res.status(404).json({
                success: false,
                error: 'Sender not found',
            });
        }

        res.json({
            success: true,
            sender: {
                id: sender.id,
                email: sender.email,
                name: sender.name,
                isDefault: sender.is_default,
                updatedAt: sender.updated_at,
            },
        });
    })
);

// Set sender as default
router.put('/:id/set-default',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { id } = req.params;

        const sender = await setDefaultSender(id, userId);

        res.json({
            success: true,
            sender: {
                id: sender.id,
                email: sender.email,
                name: sender.name,
                isDefault: sender.is_default,
            },
        });
    })
);

// Delete sender address
router.delete('/:id',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { id } = req.params;

        await deleteSender(id, userId);

        res.json({
            success: true,
            message: 'Sender address deleted successfully',
        });
    })
);

export default router;
