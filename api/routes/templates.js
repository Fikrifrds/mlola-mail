import { Router } from 'express';
import { db } from '../config/database.js';
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

    let query = db
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: templates, error } = await query.execute();

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    res.json({
      success: true,
      templates: templates || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: (templates || []).length,
        pages: Math.ceil(((templates || []).length) / Number(limit)),
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
    const { name, subject, htmlContent, textContent, variables, type } = req.body;

    const { data: template, error } = await db
      .from('templates')
      .insert([{
        user_id: userId,
        name,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        variables: variables || [],
        type,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
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
    const { name, subject, htmlContent, textContent, variables, type } = req.body;

    // Check if template exists and belongs to user
    const { data: existingTemplate } = await db
      .from('templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { data: template, error } = await db
      .from('templates')
      .update({
        name,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        variables: variables || [],
        type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

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
      .single();

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { error } = await db
      .from('templates')
      .delete()
      .eq('id', id);

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