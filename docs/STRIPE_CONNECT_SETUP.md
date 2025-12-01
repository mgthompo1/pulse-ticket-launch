# Stripe Connect Setup Guide

## Overview
The payment dashboard now supports **two separate flows** for Stripe Connect:

1. **Sign Up for Stripe** - Creates a new Stripe Express account for users who don't have one
2. **Connect Existing Stripe Account** - Connects an existing Stripe account via OAuth

## Required Environment Variables

### Supabase Edge Functions
Set these in your Supabase project settings (Project Settings > Edge Functions > Secrets):

```bash
# Required for both flows
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_xxx or sk_live_xxx

# Required ONLY for "Connect Existing Account" OAuth flow
STRIPE_CONNECT_CLIENT_ID=ca_xxx
```

### How to Get STRIPE_CONNECT_CLIENT_ID

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/settings/applications)
2. Navigate to **Settings > Connect > Settings**
3. Under "OAuth settings", you'll find your **Client ID** (starts with `ca_`)
4. Add this to your Supabase Edge Function secrets

## Webhook Configuration

### Stripe Webhook Endpoint
Your webhook endpoint for production should be:
```
https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/stripe-webhook
```

### During Development (Stripe CLI)
The Stripe CLI is currently active and forwarding webhooks. Keep it running:
```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Current webhook secret from CLI:
```
whsec_e95350da30dd33490d4c77bc79eda52aa3340822f68154bb5c03f5daaaca241a
```

Set this in your Supabase Edge Function secrets as:
```
STRIPE_WEBHOOK_SECRET=whsec_e95350da30dd33490d4c77bc79eda52aa3340822f68154bb5c03f5daaaca241a
```

### Webhook Events to Subscribe To
In your Stripe Dashboard webhook settings, subscribe to:
- `checkout.session.completed` - For payment completion
- `payment_intent.succeeded` - For successful payments
- `invoice.payment_succeeded` - For invoice payments
- `account.updated` - For Connect account updates (optional)

## OAuth Redirect URIs

### For "Connect Existing Account" Flow
Add these redirect URIs in your Stripe Connect settings:

**Development:**
```
http://localhost:5173/dashboard?tab=payments
http://localhost:3000/dashboard?tab=payments
```

**Production:**
```
https://your-production-domain.com/dashboard?tab=payments
```

### For "Sign Up for Stripe" Flow
The Account Links API automatically handles redirects to:

**Success URL:**
```
{origin}/dashboard?tab=payments&connected=true
```

**Refresh URL:** (if user needs to complete more info)
```
{origin}/dashboard?tab=payments&refresh=true
```

These are dynamically set based on the request origin.

## UI Changes

### Before
- Single button: "Connect Stripe Account"
- Only supported connecting existing accounts

### After
The dashboard now shows two distinct options:

#### Option 1: New to Stripe? (Blue Card)
- Button: "Sign Up for Stripe"
- Creates a new Stripe Express account
- Automatically connects to TicketFlo after onboarding
- Uses Stripe Account Links API

#### Option 2: Already have a Stripe account? (Purple Card)
- Button: "Connect Existing Stripe Account"
- Uses OAuth to connect existing account
- No API keys needed
- Secure OAuth flow

## Testing the Setup

### Test "Sign Up for Stripe" Flow
1. Go to Dashboard > Payments tab
2. Click "Sign Up for Stripe" button
3. You should be redirected to Stripe's onboarding
4. Complete the test onboarding
5. You'll be redirected back with `?connected=true`
6. Account should show as connected

### Test "Connect Existing Account" Flow
1. Go to Dashboard > Payments tab
2. Click "Connect Existing Stripe Account" button
3. You should be redirected to Stripe OAuth
4. Login with your Stripe credentials
5. Authorize the connection
6. You'll be redirected back with OAuth code
7. Account should show as connected

## Troubleshooting

### "STRIPE_CONNECT_CLIENT_ID not configured" Error
- Make sure you've added the Client ID to Supabase Edge Function secrets
- Verify the secret name is exactly `STRIPE_CONNECT_CLIENT_ID`

### Redirect URI Mismatch
- Check that your redirect URIs in Stripe Connect settings match exactly
- Include both `http://localhost:5173` and `http://localhost:3000` for local dev
- Protocol must match (http vs https)

### Account Not Showing as Connected
- Check browser console for errors
- Verify the `stripe_account_id` is saved to the `organizations` table
- Check Supabase logs for edge function errors

### Webhook Failures
- Ensure Stripe CLI is running during development
- Check that `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify endpoint URL is accessible
- Check Supabase edge function logs

## Database Schema Requirements

Ensure your `organizations` table has these columns:
```sql
- stripe_account_id (text)
- stripe_access_token (text)
- stripe_refresh_token (text)
- stripe_scope (text)
- stripe_onboarding_complete (boolean)
- stripe_booking_fee_enabled (boolean)
```

## Security Notes

1. **Never commit secrets to git** - All sensitive keys should be in Supabase secrets
2. **OAuth is more secure than API keys** - The Connect flow uses OAuth, never exposing API keys
3. **Webhook signature verification** - The webhook handler verifies all incoming webhooks
4. **Idempotency** - Webhook events are logged to prevent duplicate processing

## Next Steps

1. ✅ Set environment variables in Supabase
2. ✅ Configure OAuth redirect URIs in Stripe
3. ✅ Set up webhook endpoint in Stripe
4. ✅ Test both flows in development
5. ✅ Test booking fee pass-through functionality
6. ✅ Deploy to production and update redirect URIs

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Ensure Stripe CLI is running (development only)
5. Check that redirect URIs match exactly
