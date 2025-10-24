# OAuth Setup Guide - Google & Apple Sign-In

## Overview

This guide explains how to configure Google and Apple OAuth providers in Supabase for TicketFlo authentication.

---

## ✅ Code Changes Complete

The following files have been updated to support OAuth:

1. **New Component**: `src/components/auth/OAuthButtons.tsx`
   - Reusable OAuth button component
   - Supports Google and Apple sign-in
   - Handles loading states and errors

2. **Updated**: `src/pages/Auth.tsx`
   - Added OAuth buttons to sign-in tab
   - Added OAuth buttons to sign-up tab
   - Better visual separation between auth methods

---

## 🔧 Supabase Configuration Required

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `pulse-ticket-launch` (yoxsewbpoqxscsutqlcb)
3. Navigate to **Authentication** → **Providers**

---

## 🔵 Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if prompted:
   - User Type: **External**
   - App name: **TicketFlo**
   - User support email: your email
   - Developer contact: your email
   - Scopes: email, profile, openid
   - Test users: Add your email for testing

6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **TicketFlo Production**
   - Authorized JavaScript origins:
     ```
     https://ticketflo.com
     https://www.ticketflo.com
     http://localhost:3000 (for development)
     ```
   - Authorized redirect URIs:
     ```
     https://yoxsewbpoqxscsutqlcb.supabase.co/auth/v1/callback
     http://localhost:54321/auth/v1/callback (for local development)
     ```

7. Copy the **Client ID** and **Client Secret**

### 2. Configure in Supabase

1. In Supabase Dashboard → Authentication → Providers
2. Find **Google** in the provider list
3. Toggle **Enable Sign in with Google**
4. Paste your **Client ID** and **Client Secret**
5. Under **Authorized Client IDs**, add your Client ID
6. Click **Save**

### 3. Test Google Sign-In

1. Go to your app: https://ticketflo.com/auth
2. Click "Continue with Google"
3. You should be redirected to Google login
4. After successful auth, you should land on `/dashboard`

---

## 🍎 Apple Sign-In Setup

### 1. Create Apple Developer Account

- You need an Apple Developer Account ($99/year)
- Go to https://developer.apple.com/

### 2. Create App ID

1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+** to create new identifier
3. Select **App IDs** → **Continue**
4. Select **App** → **Continue**
5. Configure:
   - Description: **TicketFlo**
   - Bundle ID: **com.ticketflo.app** (or your domain reversed)
   - Capabilities: Check **Sign In with Apple**
6. Click **Continue** → **Register**

### 3. Create Service ID

1. Go back to Identifiers page
2. Click **+** to create new identifier
3. Select **Services IDs** → **Continue**
4. Configure:
   - Description: **TicketFlo Web Auth**
   - Identifier: **com.ticketflo.auth** (must be unique)
   - Check **Sign In with Apple**
5. Click **Continue** → **Register**
6. Click on the newly created Service ID
7. Click **Configure** next to Sign In with Apple
8. Configure Web Authentication:
   - Primary App ID: Select your App ID from Step 2
   - Domains and Subdomains:
     ```
     ticketflo.com
     yoxsewbpoqxscsutqlcb.supabase.co
     ```
   - Return URLs:
     ```
     https://yoxsewbpoqxscsutqlcb.supabase.co/auth/v1/callback
     ```
9. Click **Save** → **Continue** → **Register**

### 4. Create Private Key

1. Go to **Keys** in left sidebar
2. Click **+** to create new key
3. Configure:
   - Key Name: **TicketFlo Sign In with Apple Key**
   - Check **Sign In with Apple**
   - Click **Configure** next to Sign In with Apple
   - Select your Primary App ID
   - Click **Save**
4. Click **Continue** → **Register**
5. **Download the .p8 file** (you can only download once!)
6. Note the **Key ID** displayed

### 5. Get Team ID

1. Go to https://developer.apple.com/account
2. Your **Team ID** is shown in the top right
3. Copy it for next step

### 6. Configure in Supabase

1. In Supabase Dashboard → Authentication → Providers
2. Find **Apple** in the provider list
3. Toggle **Enable Sign in with Apple**
4. Fill in the fields:
   - **Services ID**: `com.ticketflo.auth` (from Step 3)
   - **Team ID**: Your Apple Team ID (from Step 5)
   - **Key ID**: From Step 4 when you created the key
   - **Private Key**: Open the .p8 file and paste the entire contents (including headers)
     ```
     -----BEGIN PRIVATE KEY-----
     ... your key content ...
     -----END PRIVATE KEY-----
     ```
5. Click **Save**

### 7. Test Apple Sign-In

1. Go to your app: https://ticketflo.com/auth
2. Click "Continue with Apple"
3. You should be redirected to Apple sign-in
4. First time: Approve the app and choose what info to share
5. After successful auth, you should land on `/dashboard`

---

## 🧪 Testing Checklist

### Google OAuth Testing

- [ ] Sign up with Google (new account)
- [ ] Sign in with Google (existing account)
- [ ] Verify user lands on dashboard after auth
- [ ] Check user profile has Google email
- [ ] Sign out and sign in again works
- [ ] Test on mobile device
- [ ] Test in incognito/private mode

### Apple OAuth Testing

- [ ] Sign up with Apple (new account)
- [ ] Sign in with Apple (existing account)
- [ ] Verify user lands on dashboard after auth
- [ ] Check user profile has Apple email
- [ ] Test "Hide My Email" feature works
- [ ] Sign out and sign in again works
- [ ] Test on Safari (Mac/iPhone)
- [ ] Test on other browsers

### Edge Cases

- [ ] User tries to sign up with Google but email already exists (with password)
- [ ] User tries to sign up with Apple but email already exists (with Google)
- [ ] User cancels OAuth flow (should return to auth page gracefully)
- [ ] OAuth provider is down (should show error message)
- [ ] User denies permissions (should show error message)

---

## 🔒 Security Considerations

### Production Checklist

- [ ] Use HTTPS only for production URLs
- [ ] Verify redirect URIs match exactly (no wildcards in production)
- [ ] Enable rate limiting in Supabase settings
- [ ] Monitor failed authentication attempts
- [ ] Set up email notifications for suspicious activity
- [ ] Review OAuth scopes - only request what's needed
- [ ] Document which user data is collected via OAuth

### Privacy Policy Updates

When adding OAuth, update your privacy policy to mention:

> **Third-Party Authentication**
>
> We offer authentication through Google and Apple. When you sign in with these services, we receive:
> - Your email address
> - Your name (if you choose to share it)
> - Your profile picture (if you choose to share it)
>
> We do not have access to your Google or Apple password. You can revoke TicketFlo's access at any time through your Google or Apple account settings.

---

## 🐛 Troubleshooting

### Google OAuth Issues

**Error: "redirect_uri_mismatch"**
- Verify redirect URI in Google Console exactly matches:
  `https://yoxsewbpoqxscsutqlcb.supabase.co/auth/v1/callback`
- Check for trailing slashes (should not have one)
- Ensure protocol is HTTPS for production

**Error: "Access blocked: This app's request is invalid"**
- Complete OAuth consent screen configuration
- Add your email to test users
- Verify all required scopes are configured

**Users see "This app isn't verified"**
- Expected during development
- Click "Advanced" → "Go to TicketFlo (unsafe)" to proceed
- For production: Submit app for Google verification (takes 4-6 weeks)

### Apple OAuth Issues

**Error: "invalid_client"**
- Verify Service ID matches exactly
- Check Team ID is correct
- Ensure Private Key is pasted correctly (including header/footer)

**Error: "Invalid redirect URI"**
- Verify return URL in Apple Console matches Supabase callback exactly
- Check domain is added to allowed domains

**Users see "Unable to Verify App"**
- Ensure bundle ID and service ID are properly configured
- Verify Sign In with Apple capability is enabled on App ID
- Check domain verification is complete

### General OAuth Issues

**OAuth popup blocked**
- Browser may be blocking popups
- Supabase uses redirects (not popups) so this shouldn't happen
- If it does, user needs to allow popups from your domain

**Session not persisting after OAuth**
- Check cookie settings in Supabase
- Verify site URL is configured correctly in Supabase settings
- Check browser isn't blocking third-party cookies

**Email already registered**
- If user signs up with password then tries OAuth with same email:
  - Supabase will link the accounts automatically
  - User can use either method to sign in
  - Both will access the same account

---

## 📊 Analytics to Track

Once OAuth is live, monitor these metrics:

- **OAuth adoption rate**: % of users choosing OAuth vs email/password
- **Provider preference**: Google vs Apple usage
- **Completion rate**: % who start OAuth flow and complete it
- **Time to auth**: Average time from landing on /auth to dashboard
- **Failed attempts**: Track which step users fail at

---

## 🚀 Deployment Steps

### Development Environment

1. Configure Google OAuth with localhost redirect URIs
2. Apple OAuth requires HTTPS (use ngrok or similar for local testing)
3. Test thoroughly in development

### Production Deployment

1. Update redirect URIs to production URLs in both Google and Apple
2. Deploy code changes to production
3. Test OAuth flows in production
4. Monitor error logs for first 48 hours
5. Gradually roll out to users (consider feature flag)

---

## 📝 Future Enhancements

Consider adding later:

- **GitHub OAuth** (for developer audience)
- **Microsoft OAuth** (for enterprise customers)
- **LinkedIn OAuth** (for professional users)
- **Link multiple providers** to same account
- **One-tap sign-in** (Google's streamlined flow)
- **Remember provider choice** (if user signed in with Google before, show Google first)

---

## 🔗 Useful Links

- [Supabase OAuth Docs](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Apple Developer Portal](https://developer.apple.com/)
- [Test OAuth flows](https://oauth.tools/)

---

**Created**: January 2025
**Last Updated**: January 2025
**Status**: ✅ Code ready, awaiting Supabase configuration
