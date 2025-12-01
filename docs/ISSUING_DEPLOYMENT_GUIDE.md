# Stripe Issuing - Phase 3 Deployment Guide

## ✅ Phase 3 Complete!

All edge functions have been built and frontend has been integrated. Ready for deployment.

## 🚀 Quick Deployment Steps

### 1. Deploy Edge Functions

Make sure you're logged in to Supabase CLI:
```bash
supabase login
```

Link your project:
```bash
supabase link --project-ref your-project-ref
```

Deploy the three edge functions:
```bash
# Deploy issue-card function
supabase functions deploy issue-card

# Deploy generate-topup-link function
supabase functions deploy generate-topup-link

# Deploy stripe-issuing-webhook handler
supabase functions deploy stripe-issuing-webhook
```

### 2. Configure Environment Variables

In your Supabase Dashboard → Edge Functions → Settings, add these secrets:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_ISSUING_WEBHOOK_SECRET=whsec_...
```

Note: The `STRIPE_ISSUING_WEBHOOK_SECRET` will be provided by Stripe after you configure the webhook endpoint (next step).

### 3. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-issuing-webhook
   ```
4. Select these events to listen for:
   - `issuing_authorization.created`
   - `issuing_authorization.updated`
   - `issuing_transaction.created`
   - `issuing_transaction.updated`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add it to Supabase as `STRIPE_ISSUING_WEBHOOK_SECRET`

### 4. Test the Integration

#### Enable Issuing in Your Organization

1. Make sure your organization has Stripe Connect enabled
2. Go to Organization Settings → System Configuration
3. Toggle on "Virtual Card Issuing"
4. Navigate to "Issuing" from the sidebar

#### Issue a Test Card

1. Click "Issue New Card" button
2. Fill out the form:
   - Card Type: Coordinator
   - Cardholder Name: Test User
   - Email: test@example.com
   - Initial Balance: $100.00
   - Daily Limit: $500.00
3. Submit the form
4. Check browser console for success/error logs

#### Generate a Top-Up Link

1. Click on a card in the table to open details
2. Click "Generate Top-Up Link"
3. Link should be copied to clipboard
4. You can share this link with parents (Phase 4 will handle the payment page)

### 5. Monitor Edge Function Logs

View logs in Supabase Dashboard → Edge Functions → Select function → Logs

Or use the CLI:
```bash
# Watch issue-card logs
supabase functions logs issue-card --follow

# Watch webhook logs
supabase functions logs stripe-issuing-webhook --follow
```

## 🔍 Troubleshooting

### "Function not found" error
- Make sure functions are deployed: `supabase functions list`
- Check project is linked: `supabase projects list`

### "Authorization required" error
- Verify user is logged in
- Check organization ownership in database
- Ensure RLS policies are correct

### "Stripe account not found" error
- Verify organization has `stripe_account_id` set
- Check Stripe Connect is properly configured
- Test with Stripe test mode keys first

### Webhook not receiving events
- Verify webhook URL is correct
- Check webhook secret is set in environment variables
- Test webhook signature verification
- Check Stripe webhook logs in Stripe Dashboard

## 📊 What's Working Now

✅ **Database:**
- All 5 tables created with triggers
- RLS policies enforced
- Interchange balance view working

✅ **UI:**
- Issuing page with stats cards
- Card table with search/filter
- Issue card dialog
- Card details dialog
- Generate top-up link (ready for Phase 4 page)

✅ **Edge Functions:**
- issue-card: Creates Stripe cardholder and card, saves to database
- generate-topup-link: Generates secure token for parent top-ups
- stripe-issuing-webhook: Syncs transactions from Stripe in real-time

✅ **Integration:**
- Frontend calls real edge functions
- No more mock data creation
- Real Stripe API integration

## 🚧 What's Next (Phase 4)

1. **Parent Top-Up Page** (`/topup/:token`)
   - Token validation
   - Card details display
   - Amount selection
   - Stripe payment form
   - Balance update on success

2. **Payout System**
   - Request payout edge function
   - Payout UI in Issuing page
   - Stripe Connect payout integration

3. **Testing & Polish**
   - End-to-end flow testing
   - Error handling improvements
   - Email notifications

## 🎯 Success Checklist

After deployment, verify these work:

- [ ] Can enable Issuing toggle in settings (requires Stripe Connect)
- [ ] Issuing menu item appears in sidebar
- [ ] Issuing page loads with empty state
- [ ] Can click "Issue New Card" and see dialog
- [ ] Can submit issue card form (check edge function logs)
- [ ] Card appears in table after creation
- [ ] Can click card to see details
- [ ] Can generate top-up link (copies to clipboard)
- [ ] Webhook receives test events from Stripe

## 💡 Tips

- Start with Stripe test mode to avoid real charges
- Use Stripe CLI to test webhooks locally: `stripe listen --forward-to localhost:54321/functions/v1/stripe-issuing-webhook`
- Check Supabase logs regularly during testing
- Monitor Stripe Dashboard for API errors
- Test with small amounts first ($1-$5)

---

**Deployment Status:** Ready ✅
**Phase:** 3 of 5 Complete
**Next:** Build Parent Top-Up Page (Phase 4)
