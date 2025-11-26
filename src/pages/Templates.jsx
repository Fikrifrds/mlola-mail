import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Edit, Trash2, Eye, FileText, Code, Sparkles, Copy, X, Search, Check, Building2 } from 'lucide-react';
import { toast } from 'sonner';

// Starter Templates Library
const STARTER_TEMPLATES = [
  {
    name: 'Welcome Email',
    subject: 'Welcome to {{company}}!',
    html_content: `<!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .logo { max-height: 50px; margin-bottom: 20px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="{{company_logo}}" alt="{{company}}" class="logo" />
          <h1>Welcome!</h1>
        </div>
        <div class="content">
          <h2>Hi {{name}},</h2>
          <p>We're excited to have you on board! Get started by exploring our platform.</p>
          <a href="{{getting_started_url}}" class="button">Get Started</a>
          <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 {{company}}. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>`,
    text_content: 'Hi {{name}},\n\nWelcome to {{company}}! We\'re excited to have you on board.\n\nGet started: {{getting_started_url}}\n\nBest regards,\nThe {{company}} Team'
  },
  {
    name: 'Newsletter',
    subject: '{{month}} Newsletter - {{company}}',
    html_content: `<!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: Georgia, serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #2c3e50; color: white; padding: 30px; text-align: center; }
        .article { padding: 30px; border-bottom: 1px solid #eee; }
        .article h2 { color: #2c3e50; }
        .read-more { color: #3498db; text-decoration: none; font-weight: bold; }
        .footer { background: #ecf0f1; padding: 20px; text-align: center; font-size: 12px; color: #7f8c8d; }
        .logo { max-height: 60px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="{{company_logo}}" alt="{{company}}" class="logo" />
          <h1>{{company}} Newsletter</h1>
          <p>{{month}} {{year}}</p>
        </div>
        <div class="article">
          <h2>{{article_title}}</h2>
          <p>{{article_excerpt}}</p>
          <a href="{{article_url}}" class="read-more">Read More →</a>
        </div>
        <div class="footer">
          <p>You're receiving this because you subscribed to {{company}}.</p>
          <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
        </div>
      </div>
    </body>
  </html>`,
    text_content: '{{company}} Newsletter - {{month}} {{year}}\n\n{{article_title}}\n\n{{article_excerpt}}\n\nRead more: {{article_url}}\n\nUnsubscribe: {{unsubscribe_url}}'
  },
  {
    name: 'Order Confirmation',
    subject: 'Order Confirmation #{{order_number}}',
    html_content: `<!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px; }
        .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .total { font-size: 20px; font-weight: bold; padding-top: 20px; }
        .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .logo { max-height: 50px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="{{company_logo}}" alt="{{company}}" class="logo" />
          <h1>Order Confirmed!</h1>
          <p>Order #{{order_number}}</p>
        </div>
        <div class="order-details">
          <h2>Order Summary</h2>
          <div class="item">
            <span>{{item_name}}</span>
            <span>{{item_price}}</span>
          </div>
          <div class="total">
            Total: {{total_amount}}
          </div>
        </div>
        <p>Your order will be delivered to:</p>
        <p><strong>{{shipping_address}}</strong></p>
        <a href="{{tracking_url}}" class="button">Track Order</a>
      </div>
    </body>
  </html>`,
    text_content: 'Order Confirmed!\n\nOrder #{{order_number}}\n\nTotal: {{total_amount}}\n\nShipping to: {{shipping_address}}\n\nTrack your order: {{tracking_url}}'
  },
  {
    name: 'Password Reset',
    subject: 'Reset Your Password',
    html_content: `<!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .content { background: #fff; padding: 30px; border: 1px solid #eee; border-radius: 8px; text-align: center; }
        .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { color: #666; font-size: 12px; margin-top: 20px; }
        .logo { max-height: 50px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <img src="{{company_logo}}" alt="{{company}}" class="logo" />
          <h2>Reset Password</h2>
          <p>We received a request to reset your password. Click the button below to choose a new one.</p>
          <a href="{{reset_url}}" class="button">Reset Password</a>
          <p class="warning">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
  </html>`,
    text_content: 'Password Reset Request\n\nHi {{name}},\n\nWe received a request to reset your password.\n\nReset your password: {{reset_url}}\n\nThis link expires in {{expiry_hours}} hours.\n\nIf you didn\'t request this, ignore this email.'
  }
];

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStarterModal, setShowStarterModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
    brand_id: ''
  });

  useEffect(() => {
    fetchTemplates();
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await api.get('/brands');
      setBrands(response.data?.brands || []);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/templates');
      setTemplates(response.data?.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        subject: formData.subject,
        htmlContent: formData.html_content || '',
        textContent: formData.text_content || '',
        type: 'transactional',
        brandId: formData.brand_id || null
      };

      console.log('Sending template payload:', payload);

      if (editingTemplate) {
        const response = await api.put(`/templates/${editingTemplate.id}`, payload);
        console.log('Update response:', response.data);
        toast.success('Template updated successfully');
      } else {
        const response = await api.post('/templates', payload);
        console.log('Create response:', response.data);
        toast.success('Template created successfully');
      }

      setShowModal(false);
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', html_content: '', text_content: '', brand_id: '' });
      fetchTemplates();
    } catch (error) {
      console.error('Template error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to save template');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content,
      brand_id: template.brand_id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await api.delete(`/ templates / ${templateId} `);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const useStarterTemplate = (starter) => {
    setFormData({
      name: starter.name,
      subject: starter.subject,
      html_content: starter.html_content,
      text_content: starter.text_content
    });
    setShowStarterModal(false);
    setShowModal(true);
    toast.success('Starter template loaded!');
  };

  const openModal = () => {
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', html_content: '', text_content: '', brand_id: '' });
    setPreviewMode(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', html_content: '', text_content: '', brand_id: '' });
    setPreviewMode(false);
  };

  // Helper function to inject brand variables into template content
  const injectBrandVariables = (content) => {
    if (!formData.brand_id || !content) return content;

    const selectedBrand = brands.find(b => b.id === formData.brand_id);
    if (!selectedBrand) return content;

    let injected = content;
    // Replace official brand variables
    injected = injected.replace(/\{\{brand_name\}\}/g, selectedBrand.name || '');
    injected = injected.replace(/\{\{brand_logo\}\}/g, selectedBrand.logo_url || '');
    injected = injected.replace(/\{\{brand_website\}\}/g, selectedBrand.website || '');

    // Replace common aliases
    injected = injected.replace(/\{\{company\}\}/g, selectedBrand.name || '');
    injected = injected.replace(/\{\{company_name\}\}/g, selectedBrand.name || '');
    injected = injected.replace(/\{\{company_logo\}\}/g, selectedBrand.logo_url || '');
    injected = injected.replace(/\{\{company_website\}\}/g, selectedBrand.website || '');

    return injected;
  };

  if (loading) {
    return (
      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Email Templates
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create and manage beautiful email templates for consistent messaging
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={openModal}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Template
        </button>
        <button
          onClick={() => setShowStarterModal(true)}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 font-medium"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Use Starter Template
        </button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No templates yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first email template or use a starter template
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={openModal}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Template
            </button>
            <button
              onClick={() => setShowStarterModal(true)}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Browse Starters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {template.subject}
                    </p>
                    {/* Brand Badge */}
                    {template.brand && (
                      <div className="mt-2 flex items-center gap-2">
                        {template.brand.logo_url ? (
                          <img
                            src={template.brand.logo_url}
                            alt={template.brand.name}
                            className="w-5 h-5 rounded object-contain"
                          />
                        ) : (
                          <Building2 className="w-4 h-4 text-purple-500" />
                        )}
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          {template.brand.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>Updated {new Date(template.updated_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit Template"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items - center px - 4 py - 2 rounded - lg transition - colors ${previewMode
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    } `}
                >
                  {previewMode ? <Code className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {previewMode ? 'Editor' : 'Preview'}
                </button>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Template Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="e.g., Welcome Email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject Line *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      placeholder="Use {{variables}} for personalization"
                    />
                  </div>
                </div>

                {/* Brand Selection */}
                {brands.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Brand (Optional)
                    </label>
                    <select
                      value={formData.brand_id}
                      onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">No brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                    {formData.brand_id && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        💡 Available: {'{'}brand_name{'}'}, {'{'}brand_logo{'}'}, {'{'}brand_website{'}'}, {'{'}company{'}'} (alias)
                      </p>
                    )}
                  </div>
                )}

                {/* Brand Info Display */}
                {formData.brand_id && brands.find(b => b.id === formData.brand_id) && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {brands.find(b => b.id === formData.brand_id).logo_url ? (
                        <img
                          src={brands.find(b => b.id === formData.brand_id).logo_url}
                          alt="Brand logo"
                          className="w-10 h-10 rounded object-contain"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-purple-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Connected Brand: {brands.find(b => b.id === formData.brand_id).name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Brand variables will be auto-replaced in preview
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Split View or Preview */}
                {previewMode ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Code Editor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        HTML Code
                      </label>
                      <textarea
                        value={formData.html_content}
                        onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                        rows={20}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-900 text-green-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="<html>...</html>"
                      />
                    </div>

                    {/* Live Preview */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Live Preview
                      </label>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white p-4 overflow-auto" style={{ height: '500px' }}>
                        <iframe
                          srcDoc={injectBrandVariables(formData.html_content)}
                          className="w-full h-full border-0"
                          title="Email Preview"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        HTML Content
                      </label>
                      <textarea
                        value={formData.html_content}
                        onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                        rows={12}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-900 text-green-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="<html><body>...</body></html>"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Plain Text Content (Fallback)
                      </label>
                      <textarea
                        value={formData.text_content}
                        onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="Plain text version of your email..."
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Starter Templates Modal */}
      {showStarterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Starter Templates</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose a template to get started quickly</p>
              </div>
              <button onClick={() => setShowStarterModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STARTER_TEMPLATES.map((starter, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">{starter.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{starter.subject}</p>
                      </div>
                      <Sparkles className="w-5 h-5 text-green-500" />
                    </div>
                    <button
                      onClick={() => useStarterTemplate(starter)}
                      className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium group-hover:scale-105"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Use This Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;