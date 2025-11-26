import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { contactSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/error.js';
import {
    getUserContacts,
    searchContacts,
    getContactById,
    createContact,
    updateContact,
    deleteContact,
    bulkCreateContacts,
    bulkDeleteContacts,
} from '../services/contactService.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all contacts for current user
router.get('/',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { tags } = req.query;

        const filters = {};
        if (tags) {
            filters.tags = Array.isArray(tags) ? tags : [tags];
        }

        const contacts = await getUserContacts(userId, filters);

        // Sanitize response
        const sanitized = contacts.map(c => ({
            id: c.id,
            email: c.email,
            name: c.name,
            notes: c.notes,
            tags: c.tags || [],
            isActive: c.is_active,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
        }));

        res.json({
            success: true,
            contacts: sanitized,
        });
    })
);

// Search contacts
router.get('/search',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { q } = req.query;

        if (!q) {
            return res.json({ success: true, contacts: [] });
        }

        const contacts = await searchContacts(userId, q);

        const sanitized = contacts.map(c => ({
            id: c.id,
            email: c.email,
            name: c.name,
            notes: c.notes,
            tags: c.tags || [],
        }));

        res.json({
            success: true,
            contacts: sanitized,
        });
    })
);

// Create new contact
router.post('/',
    validateRequest(contactSchema),
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const contact = await createContact(userId, req.body);

        res.status(201).json({
            success: true,
            contact: {
                id: contact.id,
                email: contact.email,
                name: contact.name,
                notes: contact.notes,
                tags: contact.tags || [],
                createdAt: contact.created_at,
            },
        });
    })
);

// Update contact
router.put('/:id',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { id } = req.params;

        const contact = await updateContact(id, userId, req.body);

        res.json({
            success: true,
            contact: {
                id: contact.id,
                email: contact.email,
                name: contact.name,
                notes: contact.notes,
                tags: contact.tags || [],
                updatedAt: contact.updated_at,
            },
        });
    })
);

// Delete contact
router.delete('/:id',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { id } = req.params;

        await deleteContact(id, userId);

        res.json({
            success: true,
            message: 'Contact deleted successfully',
        });
    })
);

// Bulk create contacts
router.post('/bulk',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { contacts } = req.body;

        if (!Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Contacts array is required',
            });
        }

        const created = await bulkCreateContacts(userId, contacts);

        res.status(201).json({
            success: true,
            count: created.length,
            contacts: created.map(c => ({
                id: c.id,
                email: c.email,
                name: c.name,
            })),
        });
    })
);

// Bulk delete contacts
router.delete('/bulk',
    asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { contactIds } = req.body;

        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Contact IDs array is required',
            });
        }

        await bulkDeleteContacts(userId, contactIds);

        res.json({
            success: true,
            message: `${contactIds.length} contacts deleted successfully`,
        });
    })
);

export default router;
