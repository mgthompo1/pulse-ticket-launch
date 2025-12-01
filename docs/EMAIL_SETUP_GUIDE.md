# Email Setup & Troubleshooting Guide

## 🚨 Current Issue: Email Verification Not Working

**Problem**: Users like `phil.thompson@edgecreative.net` are not receiving verification emails after sign-up.

## 🔧 Required Configuration

### 1. Resend API Key Setup

The application uses Resend for email delivery. You need to:

1. **Get a Resend API Key**:
   - Sign up at [resend.com](https://resend.com)
   - Create an API key in your dashboard
   - Copy the API key

2. **Set Environment Variable**:
   ```bash
   # In your Supabase project dashboard:
   # Go to Settings > Environment Variables
   # Add: RESEND_API_KEY = your_api_key_here
   ```

### 2. Domain Configuration

For production use, you need to:

1. **Add Your Domain to Resend**:
   - In Resend dashboard, go to Domains
   - Add your domain (e.g., `ticket2.com`)
   - Follow DNS setup instructions

2. **Update Sender Addresses**:
   - Replace `onboarding@resend.dev` with your domain
   - Use: `noreply@yourdomain.com` or `support@yourdomain.com`

### 3. Supabase Auth Email Settings

In your Supabase project:

1. **Go to Authentication > Settings**
2. **Configure Email Templates**:
   - Confirm signup template
   - Magic link template
   - Change email address template

3. **Set Site URL**:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/dashboard`

## 🧪 Testing Email Functionality

### 1. Test Resend API

Use the built-in test function:

1. **Deploy the function**:
   ```bash
   npx supabase functions deploy test-resend-email
   ```

2. **Test via UI**:
   - Go to Organization Settings
   - Find "Resend API Test" section
   - Enter test email address
   - Click "Send Test Email"

3. **Check logs**:
   ```bash
   npx supabase functions logs test-resend-email
   ```

### 2. Test Sign-up Flow

1. **Clear browser data** for the test
2. **Sign up with test email**
3. **Check browser console** for logs
4. **Check Supabase logs** for auth events

## 🔍 Troubleshooting Steps

### Step 1: Check Environment Variables

```bash
# Verify RESEND_API_KEY is set
echo $RESEND_API_KEY

# Check Supabase project settings
# Go to Settings > Environment Variables
```

### Step 2: Test Email Function

```javascript
// Test the function directly
const { data, error } = await supabase.functions.invoke('test-resend-email', {
  body: {
    to: 'test@example.com',
    subject: 'Test Email'
  }
});

console.log('Test result:', { data, error });
```

### Step 3: Check Supabase Auth Logs

1. **Go to Supabase Dashboard**
2. **Authentication > Logs**
3. **Look for sign-up events**
4. **Check for email sending errors**

### Step 4: Verify Email Configuration

1. **Check spam folder**
2. **Verify email address is correct**
3. **Check domain reputation**
4. **Test with different email providers**

## 🛠️ Quick Fixes

### Fix 1: Update Sender Domain

```typescript
// In supabase/functions/test-resend-email/index.ts
const senderOptions = [
  "noreply@yourdomain.com",  // Replace with your domain
  "support@yourdomain.com",  // Replace with your domain
  "Ticket2 Platform <onboarding@resend.dev>"  // Fallback
];
```

### Fix 2: Add Better Error Handling

```typescript
// Enhanced sign-up error handling
const handleSignUp = async (e: React.FormEvent) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      console.error('Sign-up error:', error);
      // Show specific error message
      if (error.message.includes('email')) {
        setError('Email configuration issue. Please contact support.');
      } else {
        setError(error.message);
      }
      return;
    }

    // Success handling
    toast({
      title: "Account Created!",
      description: "Please check your email (and spam folder) for verification link.",
    });
  } catch (error) {
    console.error('Sign-up failed:', error);
    setError('Sign-up failed. Please try again.');
  }
};
```

### Fix 3: Add Email Status Check

```typescript
// Add this to check if emails are being sent
const checkEmailStatus = async (email: string) => {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: email
  });
  
  console.log('Email resend result:', { data, error });
};
```

## 📋 Checklist for Email Setup

- [ ] Resend API key configured
- [ ] Domain added to Resend
- [ ] DNS records configured
- [ ] Supabase auth settings updated
- [ ] Email templates configured
- [ ] Test emails working
- [ ] Sign-up flow tested
- [ ] Error handling implemented

## 🆘 Common Issues & Solutions

### Issue 1: "RESEND_API_KEY not configured"
**Solution**: Set the environment variable in Supabase project settings

### Issue 2: "Invalid sender domain"
**Solution**: Add your domain to Resend and update sender addresses

### Issue 3: "Emails going to spam"
**Solution**: 
- Configure SPF/DKIM records
- Use a reputable domain
- Warm up the domain gradually

### Issue 4: "No emails received"
**Solution**:
- Check Supabase auth logs
- Verify email address
- Test with different email providers
- Check function logs

## 📞 Support

If issues persist:

1. **Check Supabase function logs**
2. **Verify Resend dashboard**
3. **Test with different email addresses**
4. **Contact support with logs**

## 🔄 Next Steps

1. **Set up RESEND_API_KEY** in Supabase environment variables
2. **Test email functionality** using the test function
3. **Verify sign-up flow** with a test account
4. **Monitor logs** for any errors
5. **Update sender domains** for production use 