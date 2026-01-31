# CMS Backend - Environment Setup Guide

## Required Environment Variables

### 1. Application Settings
```bash
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 2. MongoDB
```bash
MONGODB_URI=mongodb://localhost:27017/cms
```
Or use MongoDB Atlas for cloud hosting.

### 3. JWT Secrets
Generate strong secrets using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
JWT_SECRET=generated-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another-generated-secret-here
JWT_REFRESH_EXPIRES_IN=7d
```

### 4. Google OAuth Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a New Project** or select existing
3. **Enable Google+ API**:
   - APIs & Services → Library
   - Search "Google+ API" and enable it
4. **Create OAuth Credentials**:
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://localhost:4000/api/users/auth/google/callback`
     - Production: `https://your-api-domain.com/api/users/auth/google/callback`
5. **Copy credentials**:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/users/auth/google/callback
```

### 5. Email Configuration (SMTP)

#### Option A: Gmail (Recommended for Development)
1. Enable 2-Factor Authentication on your Google account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Configure:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="CMS" <noreply@yourdomain.com>
```

#### Option B: SendGrid
1. Sign up at https://sendgrid.com/
2. Create API Key
3. Configure:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM="CMS" <noreply@yourdomain.com>
```

#### Option C: AWS SES
1. Set up AWS SES account
2. Verify domain and email addresses
3. Create SMTP credentials
4. Configure:
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM="CMS" <noreply@yourdomain.com>
```

### 6. Cloudflare R2 Storage
```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

## Setup Instructions

1. **Copy example file**:
```bash
cp .env.example .env
```

2. **Install dependencies**:
```bash
npm install
```

3. **Update .env with your values**

4. **Start development server**:
```bash
npm run start:dev
```

## Production Deployment

### Environment Variables Checklist:
- ✅ Change JWT secrets to strong random values
- ✅ Set NODE_ENV=production
- ✅ Update FRONTEND_URL to production domain
- ✅ Use production MongoDB URI
- ✅ Update Google OAuth callback URL
- ✅ Configure production email service
- ✅ Set secure R2 credentials

### Security Best Practices:
1. Never commit .env files to git
2. Use different credentials for development/production
3. Rotate secrets regularly
4. Use environment-specific OAuth credentials
5. Enable CORS only for your frontend domain
