import { Router } from 'express';
import { db } from '../config/database.js';
import { validateRequest } from '../middleware/validation.js';
import { brandSchema } from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// Get all brands for user
router.get('/',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const userId = req.user.userId;

        const { data: brands, error } = await db
            .from('brands')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .execute();

        if (error) {
            throw new Error(`Failed to fetch brands: ${error.message}`);
        }

        res.json({
            success: true,
            brands: brands || [],
        });
    })
);

// Get single brand
router.get('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        const { data: brand, error } = await db
            .from('brands')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .execute();

        if (error || !brand) {
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }

        res.json({
            success: true,
            brand,
        });
    })
);

// Create brand
router.post('/',
    authenticateToken,
    validateRequest(brandSchema),
    asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { name, logoUrl, website, isDefault } = req.body;

        // If this is set as default, unset other defaults
        if (isDefault) {
            await db
                .from('brands')
                .update({ is_default: false })
                .eq('user_id', userId)
                .execute();
        }

        const brandData = {
            user_id: userId,
            name,
            logo_url: logoUrl || '',
            website: website || '',
            is_default: isDefault || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data: brand, error } = await db
            .from('brands')
            .insert(brandData)
            .single()
            .execute();

        if (error) {
            throw new Error(`Failed to create brand: ${error.message}`);
        }

        res.status(201).json({
            success: true,
            brand,
        });
    })
);

// Update brand
router.put('/:id',
    authenticateToken,
    validateRequest(brandSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        const { name, logoUrl, website, isDefault } = req.body;

        // Check if brand exists and belongs to user
        const { data: existingBrand } = await db
            .from('brands')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .execute();

        if (!existingBrand) {
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }

        // If this is set as default, unset other defaults
        if (isDefault) {
            await db
                .from('brands')
                .update({ is_default: false })
                .eq('user_id', userId)
                .execute();
        }

        const { error } = await db
            .from('brands')
            .update({
                name,
                logo_url: logoUrl || '',
                website: website || '',
                is_default: isDefault || false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .execute();

        if (error) {
            throw new Error(`Failed to update brand: ${error.message}`);
        }

        // Fetch updated brand
        const { data: brand } = await db
            .from('brands')
            .select('*')
            .eq('id', id)
            .single()
            .execute();

        res.json({
            success: true,
            brand,
        });
    })
);

// Delete brand
router.delete('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        // Check if brand exists and belongs to user
        const { data: existingBrand } = await db
            .from('brands')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
            .execute();

        if (!existingBrand) {
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }

        const { error } = await db
            .from('brands')
            .delete()
            .eq('id', id)
            .execute();

        if (error) {
            throw new Error(`Failed to delete brand: ${error.message}`);
        }

        res.json({
            success: true,
            message: 'Brand deleted successfully',
        });
    })
);

export default router;
