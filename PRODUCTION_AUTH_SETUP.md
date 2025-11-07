# Production Authentication Setup Guide

## Overview

Your PerceiveGrade application now includes a robust email-based authentication system ready for production deployment. This guide covers the setup required to enable real email verification and password reset functionality.

## Current Status

✅ **Backend Authentication System**: Complete  
✅ **Frontend UI Components**: Complete  
✅ **Database Schema**: Updated with email verification fields  
✅ **Security Features**: Implemented  
✅ **Development Mode**: Ready (auto-verifies emails)  
⚙️ **Email Service**: Requires configuration for production  

## Features Implemented

### 🔐 **Authentication Features**
- **Email Registration**: Real email validation with proper regex checking
- **Password Security**: Minimum 8 characters, bcrypt hashing
- **Login Options**: Username OR email login support
- **JWT Tokens**: 7-day expiration with secure secret
- **Role-based Access**: Teacher/Student role validation

### 📧 **Email Verification System**
- **Account Verification**: Email verification required before login
- **Beautiful Email Templates**: Professional HTML emails with company branding
- **Token Security**: 24-hour expiration for verification tokens
- **Resend Functionality**: Users can request new verification emails
- **Development Fallback**: Auto-verification when email service unavailable

### 🔑 **Password Reset System**
- **Secure Reset Flow**: Token-based password reset
- **Email Templates**: Professional reset email with security warnings
- **Token Expiration**: 1-hour expiration for reset tokens
- **Frontend Pages**: Complete UI for forgot/reset password flows

### 🛡️ **Security Features**
- **Input Validation**: Email format, password strength validation
- **HTTPS Ready**: All security headers and practices
- **Token Security**: Cryptographically secure random tokens
- **Rate Limiting Ready**: Prepared for production rate limiting
- **Privacy Protection**: No user enumeration attacks

## Production Setup

### 1. Email Service Configuration

Choose one of these email service options:

#### Option A: Gmail (Recommended for small-medium scale)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate app password for "Mail"
3. **Update .env file**:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-business-email@gmail.com
   EMAIL_PASS=your-16-digit-app-password
   FROM_EMAIL=noreply@perceivegrade.com
   ```

#### Option B: Custom SMTP (Recommended for enterprise)

For services like SendGrid, Mailgun, AWS SES, etc.:

```env
EMAIL_SERVICE=
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@your-domain.com
```

#### Option C: Development Mode

Leave email credentials empty for development (auto-verifies all accounts):

```env
EMAIL_USER=
EMAIL_PASS=
```

### 2. Security Configuration

Update these critical security settings:

```env
# Generate a strong JWT secret (32+ characters)
JWT_SECRET=your-super-secure-random-string-min-32-chars

# Set your production domain
FRONTEND_URL=https://your-domain.com
```

### 3. Database Migration

Run the database migration to add email verification columns:

```bash
npm run db:push
```

**Note**: If migration fails, manually add these columns to your `users` table:
- `email_verified` (boolean, default false)
- `email_verification_token` (text, nullable)
- `email_verification_expires` (timestamp, nullable)
- `password_reset_token` (text, nullable)
- `password_reset_expires` (timestamp, nullable)

### 4. Frontend Routes

The following routes are now available:

- `/auth` - Login/Registration
- `/verify-email?token=xxx` - Email verification
- `/forgot-password` - Request password reset
- `/reset-password?token=xxx` - Reset password

## Testing the System

### Development Testing

1. **Start the server**: `npm run dev`
2. **Register a new account** - it will auto-verify in development
3. **Test login with username or email**
4. **Access forgot password flow**

### Production Testing

1. **Configure email service** (see above)
2. **Register with real email**
3. **Check email for verification link**
4. **Test complete verification flow**
5. **Test password reset flow**

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create new account |
| POST | `/api/login` | Login with username/email |
| GET | `/api/verify-email?token=xxx` | Verify email address |
| POST | `/api/resend-verification` | Resend verification email |
| POST | `/api/forgot-password` | Request password reset |
| POST | `/api/reset-password` | Reset password with token |
| GET | `/api/user` | Get current user (protected) |
| POST | `/api/logout` | Logout (client-side) |

### Request/Response Examples

#### Registration Request
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

#### Login Request
```json
{
  "username": "johndoe",  // or email
  "password": "securepassword123",
  "role": "student"
}
```

## Email Templates

The system includes professional email templates with:

- **Company branding** (Perceive AI)
- **Responsive design** for all devices
- **Security warnings** for password resets
- **Clear call-to-action buttons**
- **Fallback text links**

## Deployment Checklist

### Pre-deployment
- [ ] Email service configured and tested
- [ ] JWT_SECRET set to strong random value
- [ ] FRONTEND_URL set to production domain
- [ ] Database migration completed
- [ ] SSL certificate installed

### Post-deployment
- [ ] Test user registration flow
- [ ] Verify email delivery
- [ ] Test password reset flow
- [ ] Monitor email service logs
- [ ] Set up monitoring for failed authentications

## Security Considerations

### Implemented Security Features
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Input validation and sanitization
- ✅ Email verification requirement
- ✅ Secure password reset tokens
- ✅ Token expiration
- ✅ No user enumeration

### Recommended Additional Security
- 🔄 Rate limiting on auth endpoints
- 🔄 CAPTCHA on registration
- 🔄 IP-based blocking for failed attempts
- 🔄 Email notification for logins
- 🔄 Session management
- 🔄 Two-factor authentication

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check email credentials
   - Verify SMTP settings
   - Check spam folder
   - Review server logs

2. **Database migration fails**
   - Run manual SQL to add columns
   - Check database connection
   - Verify Drizzle configuration

3. **Token verification fails**
   - Check token expiration
   - Verify URL encoding
   - Check database token storage

### Support

For technical support or questions about the authentication system, refer to:
- Server logs for detailed error messages
- Database logs for connection issues
- Email service provider documentation
- Frontend browser console for client-side issues

## Production-Ready Features

Your authentication system is now production-ready with:

🎯 **Enterprise-grade security**  
📧 **Professional email system**  
🔐 **Complete authentication flow**  
🛡️ **Security best practices**  
📱 **Responsive email templates**  
⚡ **Performance optimized**  
🔧 **Easy configuration**  
📊 **Monitoring ready**

The system automatically adapts between development and production modes based on email configuration, making it perfect for both testing and live deployment.