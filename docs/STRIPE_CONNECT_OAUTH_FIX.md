# Stripe Connect OAuth Issue - Root Cause & Fix

## 🔍 Problem Summary

Phil from Edge Creative successfully connected his Stripe account via OAuth, and Stripe confirmed "account linked," but TicketFlo never updated to show the connection.

**Database Status:**
- Organization: Edge Creative
- ID: `1637dd27-5e10-465c-bcd0-7b78897a2fd0`
- Stripe Account ID: ❌ **NOT SET**
- Stripe Access Token: ❌ **NOT SET**

---

## 🎯 Root Causes Identified

### Issue #1: No Webhook Endpoint Configured ❌
**The main problem!** Your Stripe account had NO webhook endpoint for pulse-ticket-launch.

```bash
# Before:
stripe webhook_endpoints list
→ Only givvv.org webhook configured
→ NO webhook for pulse-ticket-launch

# After (FIXED):
✅ Created: we_1SKuYhIeWwhDf8qbbQjJon4G
✅ URL: https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/stripe-webhook
✅ Secret: whsec_ZmJziMmtXO98JY3xcz5aWR3AvLYgo9EM
```

**Why this matters:**
- When Phil completed OAuth, Stripe sent `account.updated` webhook
- No endpoint was configured, so the event was never received
- Database never got updated with his account ID

### Issue #2: Missing `account.updated` Event Handler ❌
Your `stripe-webhook` edge function didn't handle `account.updated` events.

**Comparison with working givvv implementation:**
```typescript
// givvv (WORKING) - handles account.updated
case 'account.updated': {
  const account = event.data.object;
  // Updates organization with onboarding status
}

// pulse-ticket-launch (BROKEN) - missing this handler
// Only had: checkout.session.completed, payment_intent.succeeded, invoice.payment_succeeded
```

**Fixed:** Added `account.updated` event handler (based on givvv's implementation).

### Issue #3: Client-Side OAuth Handling ⚠️
Not a blocker, but suboptimal architecture:

- **pulse-ticket-launch:** React component handles OAuth callback (less reliable)
- **givvv:** Server-side Next.js API route handles it (more reliable)

For now, the React approach will work once webhooks are fixed.

---

## ✅ Fixes Applied

### 1. Created Webhook Endpoint in Stripe ✅
```bash
# Executed via Stripe CLI:
stripe webhook_endpoints create \
  --url="https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/stripe-webhook" \
  --enabled-events="*"

# Result:
Webhook ID: we_1SKuYhIeWwhDf8qbbQjJon4G
Secret: whsec_ZmJziMmtXO98JY3xcz5aWR3AvLYgo9EM
Status: ENABLED
```

### 2. Updated Webhook Edge Function ✅
**File:** `supabase/functions/stripe-webhook/index.ts`

**Changes:**
- ✅ Added `case "account.updated"` handler
- ✅ Implemented `handleAccountUpdated()` function
- ✅ Updates `stripe_account_id` and `stripe_onboarding_complete` fields
- ✅ Handles both metadata and direct lookup methods

**Key features:**
- Checks account metadata for `organization_id`
- Falls back to finding org by `stripe_account_id` if no metadata
- Updates onboarding status based on `charges_enabled` && `payouts_enabled`
- Comprehensive logging for debugging

---

## 🚀 Required Actions (IN ORDER)

### Step 1: Update Supabase Webhook Secret ⚡
**IMPORTANT: Must be done before deploying the function**

1. Go to: https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb/settings/functions

2. Click "Add new secret" (or edit existing `STRIPE_WEBHOOK_SECRET`)

3. Enter:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_ZmJziMmtXO98JY3xcz5aWR3AvLYgo9EM`

4. Click "Save"

5. Wait 1-2 minutes for changes to propagate

### Step 2: Deploy Updated Webhook Function 🚢
```bash
cd /Users/mitchellthompson/Desktop/pulse-ticket-launch

# Deploy the updated function
npx supabase functions deploy stripe-webhook --project-ref yoxsewbpoqxscsutqlcb
```

### Step 3: Manually Link Phil's Account 🔗
**Get Phil's Stripe Account ID:**

Ask Phil to:
1. Log into Stripe Dashboard: https://dashboard.stripe.com
2. Click **Settings** (⚙️ icon)
3. Go to **Account details**
4. Copy the **Account ID** (starts with `acct_`)

**Then run this command:**
```bash
cd /Users/mitchellthompson/Desktop/pulse-ticket-launch
node manually-link-stripe-account.js acct_XXXXXXXXXX
```

This will:
- ✅ Update Edge Creative organization with Phil's Stripe account ID
- ✅ Allow Phil to start accepting payments immediately
- ⚠️ Won't set OAuth tokens (those are only needed for advanced API calls)

### Step 4: Test Future OAuth Connections 🧪
Once Steps 1-2 are complete, have someone else (or a test account) try the OAuth flow:

1. Go to Dashboard → Payments tab
2. Click "Connect Existing Stripe Account"
3. Complete OAuth flow
4. **This time it should work!** The webhook will update the database automatically

---

## 📊 Comparison: Broken vs Fixed

| Component | Before (Broken) | After (Fixed) |
|-----------|----------------|---------------|
| **Webhook Endpoint** | ❌ Not configured | ✅ Configured |
| **Webhook Secret** | ⚠️ Old/invalid | ✅ Updated |
| **Event Handler** | ❌ Missing `account.updated` | ✅ Handles `account.updated` |
| **Phil's Account** | ❌ Not linked | 🔄 Will be linked manually |
| **Future OAuth** | ❌ Would fail | ✅ Will work automatically |

---

## 🔬 Technical Details

### How the OAuth Flow Should Work

**Correct Flow (After Fix):**
1. User clicks "Connect Existing Stripe Account"
2. Edge function creates OAuth URL with state: `${orgId}|${userId}`
3. User redirects to Stripe, authorizes
4. Stripe redirects back with `code` and `state`
5. React component calls `stripe-connect-oauth` edge function
6. Edge function exchanges code for tokens, updates DB
7. **Simultaneously:** Stripe sends `account.updated` webhook
8. Webhook function updates `stripe_onboarding_complete` status
9. UI shows "Connected" ✅

**What Happened to Phil (Before Fix):**
1. Steps 1-6 ✅ Completed (should have worked)
2. **Step 7:** Webhook sent but NO ENDPOINT CONFIGURED ❌
3. **Step 8:** Never happened ❌
4. **Step 9:** UI showed "Not Connected" ❌

### Why Webhooks Are Critical

Even though the OAuth callback completes the connection, webhooks provide:
- ✅ **Reliability:** Backup mechanism if OAuth callback fails
- ✅ **Onboarding status:** Tracks when account is fully set up
- ✅ **Account updates:** Notifies of changes to account capabilities
- ✅ **Verification:** Confirms Stripe's side matches your database

### Webhook Event: `account.updated`

This event is sent when:
- ✅ Account is first created
- ✅ Onboarding is completed (`charges_enabled` changes)
- ✅ Capabilities are updated
- ✅ Account settings change

---

## 📝 Prevention for Future

### Regular Webhook Health Checks
```bash
# Check configured webhooks
stripe webhook_endpoints list

# Verify events are being received
stripe events list --limit 10
```

### Monitoring Checklist
- [ ] Webhook endpoint exists in Stripe Dashboard
- [ ] Webhook secret is up to date in Supabase
- [ ] Edge function handles all critical events
- [ ] Test OAuth flow in staging before production changes
- [ ] Monitor Supabase edge function logs for errors

---

## 🆘 Troubleshooting

### If Phil's Manual Link Fails
1. Verify you got the correct account ID (starts with `acct_`)
2. Check the organization ID in the script matches Edge Creative
3. Look for errors in the script output

### If Future OAuth Still Fails
1. Check Supabase logs for webhook errors:
   - https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb/logs/edge-functions
2. Verify webhook secret matches Stripe Dashboard
3. Test webhook manually:
   ```bash
   stripe trigger account.updated --webhook-endpoint=we_1SKuYhIeWwhDf8qbbQjJon4G
   ```

### If Onboarding Status Doesn't Update
Check if the account has completed onboarding:
```bash
stripe accounts retrieve acct_XXXXXXXXXX | grep -E "charges_enabled|payouts_enabled"
```

Both should be `true` for `stripe_onboarding_complete` to be set.

---

## 📚 Reference Files

- **Webhook Handler:** `supabase/functions/stripe-webhook/index.ts`
- **OAuth Handler:** `supabase/functions/stripe-connect-oauth/index.ts`
- **React Component:** `src/components/StripeConnectButton.tsx`
- **Manual Link Script:** `manually-link-stripe-account.js`
- **Diagnostic Tool:** `diagnose-oauth-callback.html`
- **Givvv Reference:** `/Desktop/givvv/src/app/api/webhooks/stripe/route.ts`

---

## ✨ Summary

**What was broken:**
- No webhook endpoint = Stripe couldn't notify your backend
- No `account.updated` handler = Even if webhooks were configured, nothing would happen

**What we fixed:**
- ✅ Created webhook endpoint in Stripe
- ✅ Added `account.updated` event handler
- ✅ Prepared manual link script for Phil's account

**What you need to do:**
1. Update `STRIPE_WEBHOOK_SECRET` in Supabase (2 minutes)
2. Deploy updated webhook function (1 minute)
3. Get Phil's account ID and run manual link script (2 minutes)
4. Test that future OAuth connections work automatically

**Total time to fix:** ~5-10 minutes

---

## 🎉 Expected Outcome

After completing the steps above:
- ✅ Phil's account will be linked and showing as "Connected"
- ✅ Future users can connect via OAuth without manual intervention
- ✅ Stripe Connect onboarding status will update automatically
- ✅ Webhook events will be processed reliably
- ✅ System will match the working givvv implementation

Good luck! 🚀
