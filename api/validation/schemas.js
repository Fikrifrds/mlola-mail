import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const sendEmailSchema = Joi.object({
  recipients: Joi.array().items(
    Joi.object({
      email: Joi.string().email().required(),
      name: Joi.string().allow('').optional(),
    })
  ).min(1).required(),
  templateId: Joi.string().uuid().optional(),
  subject: Joi.string().when('templateId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  htmlContent: Joi.string().when('templateId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  textContent: Joi.string().allow('').optional(),
  variables: Joi.object().optional(),
  senderAddressId: Joi.string().uuid().optional(), // Allow sender selection
  scheduledAt: Joi.date().iso().optional(),
})
  // Accept common aliases from clients
  .rename('template_id', 'templateId', { ignoreUndefined: true, override: true })
  .rename('html', 'htmlContent', { ignoreUndefined: true, override: true })
  .rename('text', 'textContent', { ignoreUndefined: true, override: true })
  .custom((value, helpers) => {
    if (value.templateId) return value;
    if (value.subject && value.htmlContent) return value;
    return helpers.error('any.custom', {
      message: 'Provide either templateId or subject + htmlContent when sending email',
    });
  });

export const templateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  subject: Joi.string().min(1).max(500).required(),
  htmlContent: Joi.string().required(),
  textContent: Joi.string().optional(),
  variables: Joi.array().items(Joi.string()).optional(),
  // Make type optional with sensible default
  type: Joi.string().valid('transactional', 'marketing').optional().default('transactional'),
})
  // Accept snake_case payloads
  .rename('html_content', 'htmlContent', { ignoreUndefined: true, override: true })
  .rename('text_content', 'textContent', { ignoreUndefined: true, override: true });

export const webhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  secret: Joi.string().optional(),
  events: Joi.array().items(
    Joi.string().valid('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')
  ).min(1).required(),
});

export const apiKeySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  permissions: Joi.object().optional(),
});

// Email configuration schema for per-user settings (optional, currently unused)
// This is kept for future extensibility if per-user SMTP configs are needed
export const emailConfigSchema = Joi.object({
  smtpHost: Joi.string().optional(),
  smtpPort: Joi.number().port().optional(),
  smtpUser: Joi.string().email().optional(),
  smtpPass: Joi.string().optional(),
  senderEmail: Joi.string().email().optional(),
})
  .rename('SMTP_HOST', 'smtpHost', { ignoreUndefined: true, override: true })
  .rename('SMTP_PORT', 'smtpPort', { ignoreUndefined: true, override: true })
  .rename('SMTP_USER', 'smtpUser', { ignoreUndefined: true, override: true })
  .rename('SMTP_PASS', 'smtpPass', { ignoreUndefined: true, override: true })
  .rename('SENDER_EMAIL', 'senderEmail', { ignoreUndefined: true, override: true });

// Sender address schema for managing multiple senders
export const senderAddressSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(255).required(),
  smtpPassword: Joi.string().min(1).required(),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
})
  .rename('smtp_password', 'smtpPassword', { ignoreUndefined: true, override: true })
  .rename('is_default', 'isDefault', { ignoreUndefined: true, override: true })
  .rename('is_active', 'isActive', { ignoreUndefined: true, override: true });

// Contact schema for managing recipients
export const contactSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(255).required(),
  notes: Joi.string().allow('').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
})
  .rename('is_active', 'isActive', { ignoreUndefined: true, override: true });