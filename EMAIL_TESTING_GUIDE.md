# 🧪 Email Testing & Troubleshooting Guide

## 🚨 **Current Issue: Resend Email Not Working**

The Resend email functionality is failing because the `RESEND_API_KEY` environment variable is not configured in your Supabase project.

## 🔧 **Step-by-Step Fix**

### **Step 1: Get Resend API Key**

1. **Sign up at [resend.com](https://resend.com)**
2. **Create an API key** in your dashboard
3. **Copy the API key** (it starts with `re_`)

### **Step 2: Configure Supabase Environment Variable**

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb)**
2. **Navigate to Settings > Environment Variables**
3. **Add new variable**:
   - **Key**: `RESEND_API_KEY`
   - **Value**: `re_your_actual_api_key_here`
4. **Click Save**

### **Step 3: Test Basic Email Functionality**

Run the test script to verify the setup:

```bash
# Edit the test script with your email
node test-email-debug.js
```

**Before running**: Edit `test-email-debug.js` and replace `'your-email@example.com'` with your actual email address.

### **Step 4: Test Ticket Purchase Email Flow**

1. **Make a test ticket purchase** through the widget
2. **Check browser console** for any errors
3. **Check Supabase function logs** for detailed error messages

## 🧪 **Testing Methods**

### **Method 1: Direct Function Test**

```javascript
// Test the email function directly
const { data, error } = await supabase.functions.invoke('test-resend-email', {
  body: {
    to: 'your-email@example.com',
    subject: 'Test Email'
  }
});

console.log('Result:', { data, error });
```

### **Method 2: UI Test Component**

The `ResendTestEmail` component in your app can be used to test emails from the UI:

1. **Go to Organization Settings**
2. **Find the "Resend API Test" section**
3. **Enter your email address**
4. **Click "Send Test Email"**

### **Method 3: Check Function Logs**

To see detailed error logs:

1. **Go to Supabase Dashboard**
2. **Functions > test-resend-email**
3. **Click on the function**
4. **Check the logs tab**

## 🔍 **Common Issues & Solutions**

### **Issue 1: "RESEND_API_KEY not configured"**

**Solution**: Set the environment variable in Supabase dashboard

### **Issue 2: "Invalid sender domain"**

**Solution**: 
- Add your domain to Resend dashboard
- Update sender addresses in the function

### **Issue 3: "Function returns 500 error"**

**Solution**: Check the function logs for specific error messages

### **Issue 4: "Emails not received"**

**Solution**:
- Check spam folder
- Verify email address
- Test with different email providers

## 📋 **Testing Checklist**

- [ ] RESEND_API_KEY environment variable set
- [ ] Resend API key is valid and active
- [ ] Domain configured in Resend (if using custom domain)
- [ ] Basic test email function working
- [ ] Ticket purchase flow working
- [ ] Email received after ticket purchase
- [ ] Email content is correct
- [ ] Email customization working

## 🛠️ **Quick Fixes**

### **Fix 1: Update Sender Addresses**

If you're getting domain errors, update the sender addresses in `test-resend-email/index.ts`:

```typescript
const senderOptions = [
  "Ticket2 Platform <onboarding@resend.dev>",  // Default Resend domain
  "noreply@yourdomain.com",                    // Your custom domain
  "support@yourdomain.com"                     // Your custom domain
];
```

### **Fix 2: Add Better Error Handling**

The functions already have comprehensive error handling, but you can add more logging if needed.

### **Fix 3: Test with Different Email Providers**

Try testing with:
- Gmail
- Outlook
- Yahoo
- Your company email

## 🚀 **Production Setup**

Once testing is successful:

1. **Add your domain to Resend**
2. **Configure DNS records** (SPF, DKIM)
3. **Update sender addresses** to use your domain
4. **Test with real users**
5. **Monitor email delivery rates**

## 📞 **Support**

If issues persist:

1. **Check Supabase function logs**
2. **Verify Resend API key permissions**
3. **Test with Resend's official examples**
4. **Contact Resend support** if API issues persist

## 🔗 **Useful Links**

- [Resend Dashboard](https://resend.com/dashboard)
- [Resend API Documentation](https://resend.com/docs)
- [Supabase Dashboard](https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb)
- [Email Setup Guide](EMAIL_SETUP_GUIDE.md)


