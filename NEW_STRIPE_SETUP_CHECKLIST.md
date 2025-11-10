# New Stripe Account Setup Checklist

## ✅ Completed Steps

- ✅ Logged into new Stripe account via CLI
- ✅ Updated local .env with new publishable key
- ✅ Added STRIPE_SECRET_KEY to Supabase Secrets
- ✅ Started webhook listener
- ✅ Retrieved Client ID

## 🔐 Credentials to Add to Supabase

Go to: https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb/settings/functions

Click "Add secret" and add these THREE secrets:

### 1. Stripe Connect Client ID
```
Name: STRIPE_CONNECT_CLIENT_ID
Value: ca_TOVQh1Y44gKrJuaVmi63afOLgN3t7Tag
```

### 2. Webhook Signing Secret
```
Name: STRIPE_WEBHOOK_SECRET
Value: whsec_a7eed921ea804dc9063a44f60083901dd8633ddcde0b8d6c500ad63c4c939d45
```

### 3. Verify Secret Key is Updated
Make sure you've already updated:
```
Name: STRIPE_SECRET_KEY
Value: sk_live_... (your new secret key)
```

## 🔗 OAuth Redirect URIs (Stripe Dashboard)

Go to: https://dashboard.stripe.com/settings/applications

Navigate to: **Connect > Settings > OAuth settings**

Add these redirect URIs:

```
http://localhost:8081/dashboard?tab=payments
http://localhost:5173/dashboard?tab=payments
```

**For production** (add later):
```
https://your-production-domain.com/dashboard?tab=payments
```

## 📡 Webhook Status

✅ Webhook listener is running in the background
- Forwarding to: `https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/stripe-webhook`
- This is for local testing - events will be forwarded to your Supabase function

## 🧪 Testing the Setup

Once you've added all secrets to Supabase, test the integration:

1. Go to: http://localhost:8081/dashboard?tab=payments
2. Click "Connect Existing Stripe Account"
3. You should be redirected to Stripe OAuth
4. Authorize the connection
5. You should return to your dashboard with account connected

## 📝 Summary

**Account Details:**
- Account ID: `acct_1SNLHGITYZxSg7NS`
- Display Name: Ticketflo
- Publishable Key: `pk_live_51SNLHGITYZxSg7NSLBB2WC5lLz7Q04MyJPBf8x68W4Dd4KFNJfk10b0cFRiqXFvBPQB2UDnHRyWdLHHs0j5TBoHD00WGo4zhBC`

**Next Steps:**
1. ⏳ Add the 2-3 secrets to Supabase (listed above)
2. ⏳ Add OAuth redirect URIs in Stripe Dashboard
3. ⏳ Test the OAuth connection flow
4. ⏳ Test a payment to verify webhooks are working

## ⚠️ Important Notes

- The webhook listener is running in the background via Stripe CLI
- This is for DEVELOPMENT/TESTING only
- For PRODUCTION, you'll need to create a webhook endpoint in Stripe Dashboard
- Keep this file secure - it contains sensitive IDs (though not secret keys)
