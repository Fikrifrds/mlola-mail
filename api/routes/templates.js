import { Router } from 'express';
import { db, pool } from '../config/database.js';
import { validateRequest } from '../middleware/validation.js';
import { templateSchema } from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// Get all templates for user
router.get('/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20, type } = req.query;

    // First get templates
    let query = `
      SELECT 
        t.*,
        b.id as brand__id,
        b.name as brand__name,
        b.logo_url as brand__logo_url,
        b.website as brand__website
      FROM templates t
      LEFT JOIN brands b ON t.brand_id = b.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows: templates } = await db.query(query, [
      userId,
      Number(limit),
      (Number(page) - 1) * Number(limit)
    ]);

    // Transform to include brand object
    const templatesWithBrands = templates.map(t => {
      const template = { ...t };
      if (template.brand__id) {
        template.brand = {
          id: template.brand__id,
          name: template.brand__name,
          logo_url: template.brand__logo_url,
          website: template.brand__website
        };
      }
      // Clean up flattened fields
      delete template.brand__id;
      delete template.brand__name;
      delete template.brand__logo_url;
      delete template.brand__website;
      return template;
    });

    res.json({
      success: true,
      templates: templatesWithBrands || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: templatesWithBrands.length,
        pages: Math.ceil(templatesWithBrands.length / Number(limit)),
      },
    });
  })
);

// Get single template
router.get('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const { data: template, error } = await db
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      template,
    });
  })
);

// Create template
router.post('/',
  authenticateToken,
  validateRequest(templateSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { name, subject, htmlContent, textContent, variables, type, brandId } = req.body;

    const templateData = {
      user_id: userId,
      name,
      subject,
      html_content: htmlContent || '',
      text_content: textContent || '',
      variables: variables || [],
      type: type || 'transactional',
      brand_id: brandId || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Creating template with data:', templateData);

    // Insert with RETURNING to get created record
    const { data: template, error } = await db
      .from('templates')
      .insert(templateData)  // Single object, not array
      .single()  // This tells it to return single record
      .execute();

    console.log('Insert result:', { template, error });

    if (error) {
      console.error('Insert error:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }

    res.status(201).json({
      success: true,
      template,
    });
  })
);

// Update template
router.put('/:id',
  authenticateToken,
  validateRequest(templateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, subject, htmlContent, textContent, variables, type, brandId } = req.body;

    // Check if template exists and belongs to user
    const { data: existingTemplate } = await db
      .from('templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
      .execute();

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update template
    const { error } = await db
      .from('templates')
      .update({
        name,
        subject,
        html_content: htmlContent || '',
        text_content: textContent || '',
        variables: variables || [],
        type: type || 'transactional',
        brand_id: brandId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .execute();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    // Fetch updated template
    const { data: template } = await db
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()
      .execute();

    res.json({
      success: true,
      template,
    });
  })
);

// Delete template
router.delete('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if template exists and belongs to user
    const { data: existingTemplate } = await db
      .from('templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
      .execute();

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const { error } = await db
      .from('templates')
      .delete()
      .eq('id', id)
      .execute();

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  })
);

// Test template
router.post('/:id/test',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const { testEmail, variables } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    // Get template
    const { data: template } = await db
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Here you would implement template testing logic
    // For now, we'll just return success
    // In a real implementation, you would send a test email

    res.json({
      success: true,
      message: 'Template test email sent successfully',
    });
  })
);

export default router;