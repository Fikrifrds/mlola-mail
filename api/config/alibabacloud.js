import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Get Alibaba Cloud SMTP configuration from environment variables
 */
function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Alibaba Cloud SMTP credentials are required (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

/**
 * Create and return a nodemailer transporter for Alibaba Cloud Direct Mail
 */
export function getEmailTransporter() {
  const config = getSmtpConfig();
  return nodemailer.createTransport(config);
}

/**
 * Create transporter for a specific sender with their own credentials
 */
export function getEmailTransporterForSender(senderData) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '80', 10);
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host) {
    throw new Error('SMTP_HOST is required');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: senderData.email,
      pass: senderData.smtp_password,
    },
  });
}

/**
 * Get the sender email address with optional display name
 */
export function getSenderEmail() {
  const sender = process.env.SENDER_EMAIL;
  const name = process.env.SENDER_NAME;

  if (!sender) {
    throw new Error('SENDER_EMAIL is required');
  }

  // Return formatted email with name if provided
  // Format: "Display Name <email@domain.com>"
  if (name) {
    return `${name} <${sender}>`;
  }

  return sender;
}
