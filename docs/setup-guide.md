# Email Service - Complete Setup Guide (A-Z)

This comprehensive guide walks you through setting up and using the Email Service project from scratch.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [AWS SES Configuration](#aws-ses-configuration)
- [Development Server Setup](#development-server-setup)
- [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [Frontend Usage](#frontend-usage)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [Maintenance & Monitoring](#maintenance--monitoring)

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0 or higher
- **PostgreSQL**: Version 12.0 or higher
- **Redis**: Version 6.0 or higher (optional, for caching)
- **AWS Account**: With SES access
- **Git**: For version control

### Required Knowledge
- Basic JavaScript/Node.js
- PostgreSQL fundamentals
- AWS SES basics
- React fundamentals (for frontend)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mlola_email
```

### 2. Install Dependencies
```bash
# Install all dependencies
npm install

# Verify installation
npm list
```

### 3. Verify Node.js Version
```bash
node --version  # Should be >= 18.0.0
npm --version
```

## Environment Configuration

### 1. Create Environment File
```bash
cp .env.example .env
```

### 2. Configure Required Variables

#### Database Configuration
```bash
# PostgreSQL Database
DATABASE_URL=postgresql://fikrifirdaus@localhost:5432/email_service_db
```

#### AWS SES Configuration
```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
SES_SENDER_EMAIL=noreply@yourdomain.com
```

#### JWT Configuration
```bash
# JWT Settings
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

#### Redis Configuration (Optional)
```bash
# Redis Cache
REDIS_URL=redis://localhost:6379
```

#### Application Settings
```bash
# App Configuration
NODE_ENV=development
PORT=3002
CLIENT_URL=http://localhost:5173
```

#### Email Tracking
```bash
# Email Tracking Domain
EMAIL_TRACKING_DOMAIN=http://localhost:3002
WEBHOOK_SECRET=your_webhook_secret_here
```

#### Rate Limiting
```bash
# Rate Limit Settings
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Environment File Example
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/email_service

# AWS SES
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
SES_SENDER_EMAIL=noreply@yourdomain.com

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
PORT=3002
CLIENT_URL=http://localhost:5173

# Email Tracking
EMAIL_TRACKING_DOMAIN=http://localhost:3002
WEBHOOK_SECRET=your-webhook-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Database Setup

### 1. PostgreSQL Installation

#### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Windows
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE email_service;

# Create user (optional)
CREATE USER email_service_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE email_service TO email_service_user;

# Exit
\q
```

### 3. Run Database Migrations
```bash
# Run all migrations
npm run db:migrate

# Check migration status
npm run db:status

# Rollback if needed (be careful!)
npm run db:rollback
```

### 4. Verify Database Schema
```bash
# Connect to database
psql -U postgres -d email_service

# Check tables
\dt

# Check specific table structure
\d emails
\d templates
\d users
```

## AWS SES Configuration

### 1. AWS Account Setup
- Sign up for AWS account at [aws.amazon.com](https://aws.amazon.com)
- Complete identity verification
- Set up billing information

### 2. IAM User Creation
1. Go to AWS IAM Console
2. Create new user: `email-service-user`
3. Attach policies:
   - `AmazonSESFullAccess`
   - `AmazonSNSFullAccess` (for webhooks)
4. Generate access keys
5. Save credentials securely

### 3. SES Setup
1. Go to AWS SES Console
2. Verify your domain:
   - Add domain: `yourdomain.com`
   - Add DNS records for verification
   - Wait for verification (can take up to 72 hours)
3. Verify sender email address:
   - Add email: `noreply@yourdomain.com`
   - Check inbox and click verification link
4. Request production access (if needed):
   - Fill out SES production access form
   - Wait for approval

### 4. SNS Setup (for webhooks)
1. Go to AWS SNS Console
2. Create topic: `email-service-webhooks`
3. Configure HTTPS subscription to your webhook endpoint
4. Note the topic ARN for configuration

### 5. Test SES Configuration
```bash
# Test email sending
aws ses verify-email-identity --email-address test@yourdomain.com --region us-east-1
```

## Development Server Setup

### 1. Start Backend Server
```bash
# Start API server
npm run server:dev

# Server will run on http://localhost:3002
# Check health: curl http://localhost:3002/health
```

### 2. Start Frontend Development Server
```bash
# Start React development server
npm run client:dev

# Frontend will run on http://localhost:5173
```

### 3. Start Both Servers (Recommended)
```bash
# Start both servers concurrently
npm run dev
```

### 4. Verify Setup
- Backend API: http://localhost:3002/health
- Frontend: http://localhost:5173
- Database: Check connection in logs
- Redis: Check connection in logs (if configured)

## Production Deployment

### 1. Environment Variables for Production
```bash
# Update .env file
NODE_ENV=production
PORT=3002
CLIENT_URL=https://yourdomain.com
EMAIL_TRACKING_DOMAIN=https://api.yourdomain.com
```

### 2. Database Production Setup
```bash
# Use managed PostgreSQL (recommended)
# AWS RDS, Google Cloud SQL, or Heroku Postgres
# Update DATABASE_URL with production credentials
```

### 3. Build Frontend
```bash
# Build production bundle
npm run build

# Serve static files from dist/
```

### 4. Deploy Backend
```bash
# Option 1: PM2 (recommended)
npm install -g pm2
pm2 start api/server.js --name "email-service"
pm2 save
pm2 startup

# Option 2: Docker
docker build -t email-service .
docker run -p 3002:3002 --env-file .env email-service

# Option 3: Heroku
git push heroku main
```

### 5. Configure Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Email Endpoints

#### Send Email
```http
POST /api/emails/send
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "to": ["recipient@example.com"],
  "subject": "Test Email",
  "html": "<h1>Hello World</h1>",
  "text": "Hello World"
}
```

#### Send Templated Email
```http
POST /api/emails/send
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "to": ["recipient@example.com"],
  "templateId": "template-uuid",
  "variables": {
    "name": "John Doe",
    "product": "Email Service"
  }
}
```

#### Get Email Status
```http
GET /api/emails/status/:emailId
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Email History
```http
GET /api/emails/history?page=1&limit=20
Authorization: Bearer YOUR_JWT_TOKEN
```

### Template Endpoints

#### Create Template
```http
POST /api/templates
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "name": "Welcome Email",
  "subject": "Welcome {{name}}!",
  "html": "<h1>Welcome {{name}}!</h1><p>Thanks for joining {{product}}.</p>",
  "text": "Welcome {{name}}! Thanks for joining {{product}}."
}
```

#### List Templates
```http
GET /api/templates
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update Template
```http
PUT /api/templates/:templateId
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "name": "Updated Template Name",
  "subject": "Updated Subject {{name}}"
}
```

#### Delete Template
```http
DELETE /api/templates/:templateId
Authorization: Bearer YOUR_JWT_TOKEN
```

### Analytics Endpoints

#### Get Email Statistics
```http
GET /api/analytics/stats?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Template Performance
```http
GET /api/analytics/templates
Authorization: Bearer YOUR_JWT_TOKEN
```

### Tracking Endpoints (Public)

#### Email Open Tracking
```http
GET /track/pixel/:trackingId
```

#### Email Click Tracking
```http
GET /track/click/:trackingId?url=https://example.com
```

### Webhook Endpoints

#### SES Webhook (Incoming)
```http
POST /api/webhooks/ses
Content-Type: application/json
X-Webhook-Secret: your_webhook_secret

{
  "Type": "Notification",
  "Message": "{...}"
}
```

#### Register Webhook URL
```http
POST /api/webhooks
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "url": "https://yourapp.com/webhook",
  "events": ["email.sent", "email.delivered", "email.bounced"]
}
```

## Frontend Usage

### 1. Access the Dashboard
- Navigate to http://localhost:5173
- Register a new account or login
- Access the main dashboard

### 2. Send Your First Email
1. Click "Send Email" in the navigation
2. Fill in the form:
   - Recipients (comma-separated emails)
   - Subject line
   - Email content (HTML or text)
3. Click "Send Email"
4. Monitor delivery status

### 3. Create Email Templates
1. Navigate to "Templates" section
2. Click "Create Template"
3. Add template details:
   - Template name
   - Subject line with variables (e.g., "Hello {{name}}")
   - HTML content with variables
   - Plain text content
4. Save template for reuse

### 4. View Analytics
1. Go to "Analytics" section
2. View email statistics:
   - Total emails sent
   - Delivery rates
   - Open rates
   - Click rates
3. Filter by date range
4. Export reports

### 5. Manage Settings
1. Access "Settings" section
2. Configure:
   - API keys
   - Webhook endpoints
   - Email preferences
   - Account details

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
**Problem**: Cannot connect to PostgreSQL
**Solution**:
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Check connection string
psql $DATABASE_URL

# Verify database exists
psql -l | grep email_service
```

#### 2. AWS SES Authentication Error
**Problem**: Invalid AWS credentials
**Solution**:
```bash
# Verify AWS credentials
aws configure list

# Test SES access
aws ses get-send-quota --region $AWS_REGION

# Check IAM permissions
aws iam get-user
```

#### 3. Email Not Sending
**Problem**: Emails stuck in "pending" status
**Solution**:
- Check AWS SES sending limits
- Verify sender email is verified
- Check webhook configuration
- Review application logs

#### 4. Frontend Build Error
**Problem**: Build fails with errors
**Solution**:
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check for syntax errors
npm run lint

# Build with verbose output
npm run build --verbose
```

#### 5. Port Already in Use
**Problem**: Port 3002 or 5173 already in use
**Solution**:
```bash
# Find process using port
lsof -i :3002

# Kill process
kill -9 <PID>

# Or use different port
PORT=3003 npm run server:dev
```

### Log Files
```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Database logs
tail -f /var/log/postgresql/postgresql.log
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=email-service:* npm run server:dev

# Database query logging
DEBUG=knex:* npm run server:dev
```

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files to version control
- Use different secrets for each environment
- Rotate secrets regularly
- Use strong passwords and keys

### 2. Database Security
- Use connection pooling with limits
- Enable SSL connections
- Restrict database access by IP
- Regular backups
- Use read replicas for analytics

### 3. AWS Security
- Use IAM roles instead of access keys when possible
- Enable MFA on AWS account
- Use least privilege principle
- Monitor AWS CloudTrail logs
- Set up billing alerts

### 4. Application Security
- Enable HTTPS in production
- Use rate limiting
- Validate all inputs
- Sanitize HTML content
- Implement proper error handling

### 5. Email Security
- Validate email addresses
- Implement unsubscribe mechanisms
- Follow CAN-SPAM compliance
- Use SPF, DKIM, DMARC records
- Monitor bounce rates

### 6. API Security
- Use JWT tokens with short expiration
- Implement refresh token rotation
- Rate limit API endpoints
- Log all API access
- Use CORS properly

## Maintenance & Monitoring

### 1. Regular Maintenance Tasks

#### Daily
- Monitor email delivery rates
- Check for failed emails
- Review bounce/complaint rates
- Monitor server resources

#### Weekly
- Review analytics reports
- Check database performance
- Update dependencies
- Review security logs

#### Monthly
- Backup database
- Rotate AWS access keys
- Review and clean old emails
- Update documentation

### 2. Performance Monitoring

#### Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Application Performance
```bash
# Monitor server resources
htop

# Check application logs
tail -f logs/app.log | grep -i error

# Monitor email queue
redis-cli llen email_queue
```

### 3. Backup Strategy

#### Database Backup
```bash
# Daily backup
crontab -e
# Add: 0 2 * * * pg_dump $DATABASE_URL > backups/email_service_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/email_service"
FILE="email_service_${DATE}.sql"

mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > "$BACKUP_DIR/$FILE"
gzip "$BACKUP_DIR/$FILE"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

#### Application Backup
```bash
# Backup templates and settings
tar -czf email_service_backup_$(date +%Y%m%d).tar.gz \
  .env \
  db/migrations/ \
  api/services/ \
  logs/
```

### 4. Health Checks

#### API Health Check
```bash
# Create health check script
curl -f http://localhost:3002/health || echo "API DOWN"
```

#### Database Health Check
```bash
# Check database connection
pg_isready -h localhost -p 5432 -d email_service
```

#### Email Service Health Check
```bash
# Test email sending
curl -X POST http://localhost:3002/api/emails/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"to":["test@example.com"],"subject":"Health Check","text":"OK"}'
```

### 5. Scaling Considerations

#### Horizontal Scaling
- Use load balancer
- Implement session management
- Use managed database
- Implement caching layer

#### Performance Optimization
- Add database indexes
- Implement connection pooling
- Use CDN for static assets
- Optimize email templates

### 6. Compliance & Legal

#### GDPR Compliance
- Implement data deletion requests
- Provide data export functionality
- Maintain audit logs
- Get proper consent

#### Email Regulations
- Follow CAN-SPAM Act
- Include unsubscribe links
- Honor opt-out requests
- Monitor complaint rates

## 🎉 Congratulations!

You now have a fully functional email service running! This guide covered everything from initial setup to production deployment and ongoing maintenance.

### Next Steps
1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure backups
4. Review security settings
5. Plan for scaling

### Support
- Check the logs for any issues
- Review the troubleshooting section
- Monitor application performance
- Keep dependencies updated

Happy emailing! 📧