import { Router } from 'express';
import { db } from '../config/database.js';
import { validateRequest } from '../middleware/validation.js';
import { groupSchema, groupMemberSchema } from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// Get all groups
router.get('/',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { page = 1, limit = 20 } = req.query;

        const { rows: groups } = await db.query(`
      SELECT g.*, COUNT(gm.contact_id)::int as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.user_id = $1
      GROUP BY g.id
      ORDER BY g.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, (page - 1) * limit]);

        // Get total count for pagination
        const { rows: [{ count }] } = await db.query(
            'SELECT COUNT(*) FROM groups WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            groups: groups || [],
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: Number(count),
                pages: Math.ceil(Number(count) / Number(limit)),
            },
        });
    })
);

// Create group
router.post('/',
    authenticateToken,
    validateRequest(groupSchema),
    asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { name, description } = req.body;

        const { data: group, error } = await db
            .from('groups')
            .insert({
                user_id: userId,
                name,
                description,
            })
            .single()
            .execute();

        if (error) throw error;

        res.status(201).json({
            success: true,
            group: { ...group, member_count: 0 },
        });
    })
);

// Get single group
router.get('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        const { rows: [group] } = await db.query(`
      SELECT g.*, COUNT(gm.contact_id)::int as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id = $1 AND g.user_id = $2
      GROUP BY g.id
    `, [id, userId]);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.json({ success: true, group });
    })
);

// Update group
router.put('/:id',
    authenticateToken,
    validateRequest(groupSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        const { name, description } = req.body;

        const { data: group, error } = await db
            .from('groups')
            .update({
                name,
                description,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .execute();

        if (error) throw error;
        if (!group) return res.status(404).json({ error: 'Group not found' });

        res.json({ success: true, group });
    })
);

// Delete group
router.delete('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        const { error } = await db
            .from('groups')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)
            .execute();

        if (error) throw error;

        res.json({ success: true, message: 'Group deleted successfully' });
    })
);

// Get group members
router.get('/:id/members',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        // Verify group ownership
        const { data: group } = await db
            .from('groups')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .execute();

        if (!group) return res.status(404).json({ error: 'Group not found' });

        const { rows: members } = await db.query(`
      SELECT c.*, gm.joined_at
      FROM contacts c
      JOIN group_members gm ON c.id = gm.contact_id
      WHERE gm.group_id = $1
      ORDER BY c.name ASC
    `, [id]);

        res.json({ success: true, members });
    })
);

// Add members to group
router.post('/:id/members',
    authenticateToken,
    validateRequest(groupMemberSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        const { contactIds } = req.body;

        // Verify group ownership
        const { data: group } = await db
            .from('groups')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .execute();

        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Insert members ignoring duplicates
        const values = contactIds.map(contactId => `('${id}', '${contactId}')`).join(',');

        await db.query(`
      INSERT INTO group_members (group_id, contact_id)
      VALUES ${values}
      ON CONFLICT (group_id, contact_id) DO NOTHING
    `);

        res.json({ success: true, message: 'Members added successfully' });
    })
);

// Remove member from group
router.delete('/:id/members/:contactId',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id, contactId } = req.params;
        const userId = req.user.userId;

        // Verify group ownership
        const { data: group } = await db
            .from('groups')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .execute();

        if (!group) return res.status(404).json({ error: 'Group not found' });

        await db.query(`
      DELETE FROM group_members
      WHERE group_id = $1 AND contact_id = $2
    `, [id, contactId]);

        res.json({ success: true, message: 'Member removed successfully' });
    })
);

export default router;
