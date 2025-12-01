# Quick Setup Steps for Stripe Connect

## Step 1: Add Client ID to Supabase ⚡

1. Open: https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb/settings/functions

2. Click "Add new secret"

3. Enter:
   - **Name:** `STRIPE_CONNECT_CLIENT_ID`
   - **Value:** `ca_T0ZxkGovJFA3vSH6RJmFg05f3DZ4iqOf`

4. Click "Save"

5. Wait 1-2 minutes for changes to propagate

## Step 2: Configure OAuth Redirect URIs in Stripe 🔗

1. Open: https://dashboard.stripe.com/settings/applications

2. Navigate to **Connect > OAuth settings**

3. In the "Redirect URIs" section, add these URLs:

   **For Development:**
   ```
   http://localhost:5173/dashboard?tab=payments
   http://localhost:3000/dashboard?tab=payments
   ```

   **For Production (add when ready):**
   ```
   https://your-production-domain.com/dashboard?tab=payments
   ```

4. Click "Save changes"

## Step 3: Verify Webhook Configuration 🔔

### For Development (Stripe CLI):
Keep the Stripe CLI running:
```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Current webhook secret is already configured:
```
whsec_e95350da30dd33490d4c77bc79eda52aa3340822f68154bb5c03f5daaaca241a
```

### For Production:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL:
   ```
   https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

## Step 4: Test the Integration ✅

### Test "Sign Up for Stripe" Flow:
1. Start dev server: `npm run dev`
2. Go to: http://localhost:5173/dashboard
3. Navigate to "Payments" tab
4. Click the blue **"Sign Up for Stripe"** button
5. Complete Stripe's test onboarding
6. You should be redirected back with account connected

### Test "Connect Existing Account" Flow:
1. Go to: http://localhost:5173/dashboard
2. Navigate to "Payments" tab
3. Click the purple **"Connect Existing Stripe Account"** button
4. Login with your Stripe credentials
5. Authorize the connection
6. You should be redirected back with account connected

## Checklist ✓

- [ ] Added `STRIPE_CONNECT_CLIENT_ID` to Supabase secrets
- [ ] Configured OAuth redirect URIs in Stripe Dashboard
- [ ] Verified webhook endpoint is configured
- [ ] Tested "Sign Up for Stripe" button
- [ ] Tested "Connect Existing Account" button
- [ ] Verified booking fee toggle works when connected
- [ ] Checked that "pass booking fee to customer" requires Stripe Connect

## Troubleshooting 🔧

### "STRIPE_CONNECT_CLIENT_ID not configured"
- Make sure secret is added to Supabase
- Wait 1-2 minutes after adding
- Check spelling is exactly: `STRIPE_CONNECT_CLIENT_ID`

### Redirect URI Mismatch Error
- Verify URIs in Stripe Dashboard match exactly
- Check for trailing slashes (should NOT have them)
- Ensure protocol matches (http vs https)

### Account Not Connecting
- Check browser console for errors
- Verify Supabase edge function logs
- Ensure organization ID is being passed correctly

### Booking Fee Toggle Disabled
- This is normal - toggle only works when Stripe Connect is set up
- Connect an account first, then the toggle will enable

## What Changed? 📝

### Before:
- Single button: "Connect Stripe Account"
- Only OAuth flow supported
- Confusing for users without Stripe accounts

### After:
- **Two buttons with clear distinction:**
  1. 🆕 "Sign Up for Stripe" - For new users (creates Express account)
  2. 🔗 "Connect Existing Stripe Account" - For existing users (OAuth)
- Better UX with visual cards showing what each option does
- Proper handling of both flows
- Clear requirements for booking fee pass-through

## Next Steps After Setup

Once both flows are working:

1. Test a complete ticket purchase with booking fees enabled
2. Verify funds flow correctly (platform fee vs ticket revenue)
3. Test disconnecting and reconnecting
4. Configure production webhook endpoint
5. Update OAuth redirect URIs for production domain
6. Deploy to production

## Need Help?

Check the detailed documentation:
- `STRIPE_CONNECT_SETUP.md` - Full setup guide
- `CRITICAL_RELIABILITY_IMPLEMENTATION.md` - System reliability features
- Edge function logs in Supabase dashboard
