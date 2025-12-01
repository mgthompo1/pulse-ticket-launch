# Payouts & Fees Tracking Feature

## Overview

The Payouts & Fees feature tracks all deposits from payment processors (Stripe, Windcave) to organization bank accounts, including detailed fee breakdowns. This gives organizations complete visibility into their cash flow and fee structure.

## ✅ Requirements

**Stripe Connect Required**: Organizations must connect their Stripe account via Stripe Connect for this feature to work. Without Connect, you cannot programmatically access their payout data.

**Why Stripe Connect?**
- Direct Charges: Each client's Stripe account is independent - you can't see their payouts
- Stripe Connect: You can fetch payout data using the connected account's `stripe_account_id`

## 🏗️ Architecture

### Database Schema

**Main Tables:**

1. **`payouts`** - Main payout/deposit records
   - Tracks each payout from Stripe to the organization's bank
   - Stores status, amounts, fees, and dates
   - Links to organization via `organization_id`

2. **`payout_line_items`** - Individual transactions in each payout
   - Links charges, refunds, adjustments to specific payouts
   - Can be linked to `orders` table via `order_id`

3. **`payout_fees_breakdown`** - Detailed fee breakdown
   - Stripe fees, platform fees, chargeback fees
   - Per-transaction fee details

### Edge Functions

1. **`sync-stripe-payouts`** - Manual/scheduled sync
   - Fetches payouts from Stripe API
   - Fetches balance transactions for fee details
   - Creates/updates payout records

2. **`stripe-webhook`** (updated) - Automatic sync
   - Handles `payout.created`, `payout.updated`, `payout.paid`, `payout.failed` events
   - Automatically syncs payouts as they happen in Stripe

### Frontend Component

**`PayoutsAndFees.tsx`** - React component
- Summary cards showing totals, fees, and pending amounts
- Filterable table of all payouts
- Expandable rows for detailed breakdown
- Manual sync button
- Ready for Windcave integration

## 📊 Data Flow

```
1. Customer Makes Purchase
   ↓
2. Stripe Processes Payment
   ↓
3. Stripe Creates Payout (daily/weekly)
   ↓
4. Webhook Received → Auto-sync payout
   OR
   User Clicks "Sync Payouts" → Manual sync
   ↓
5. Payout Data Stored in Database
   ↓
6. UI Displays Payout Details
   ↓
7. Funds Arrive in Bank Account
   ↓
8. Webhook Updates Status to "paid"
```

## 🚀 Integration Steps

### Step 1: Deploy Database Migration

```bash
npx supabase db push
```

This creates:
- `payouts` table
- `payout_line_items` table
- `payout_fees_breakdown` table
- RLS policies
- Helper function `get_payout_summary()`

### Step 2: Deploy Edge Functions

```bash
cd supabase/functions

# Deploy sync function
npx supabase functions deploy sync-stripe-payouts

# Deploy updated webhook (already includes payout handlers)
npx supabase functions deploy stripe-webhook
```

### Step 3: Configure Stripe Webhooks

In your Stripe Dashboard (for each connected account or platform account):

1. Go to **Developers → Webhooks**
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. **Add these events:**
   - `payout.created`
   - `payout.updated`
   - `payout.paid`
   - `payout.failed`
4. Copy webhook signing secret to your environment variables

### Step 4: Add UI Component to Dashboard

In your organization dashboard page:

```tsx
import { PayoutsAndFees } from '@/components/PayoutsAndFees';

// Inside your dashboard component
<PayoutsAndFees organizationId={organizationId} />
```

Or add as a new tab:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="events">Events</TabsTrigger>
    <TabsTrigger value="payouts">Payouts/Fees</TabsTrigger>
  </TabsList>

  <TabsContent value="payouts">
    <PayoutsAndFees organizationId={organizationId} />
  </TabsContent>
</Tabs>
```

## 💡 Features

### Summary Cards
- **Total Deposited**: Sum of all paid payouts
- **Total Fees**: Combined processor + platform fees
- **Pending**: Amount in transit or pending

### Payouts Table
- **Date**: Payout creation and expected arrival date
- **Status**: Badge showing current status (paid, pending, in_transit, failed)
- **Processor**: Stripe (Windcave coming soon)
- **Gross**: Total before fees
- **Fees**: All fees deducted
- **Net**: Final amount deposited
- **Bank**: Last 4 digits of bank account

### Expandable Details
Click any row to see:
- Full payout ID
- Detailed fee breakdown (processor vs platform)
- Description
- Additional metadata

### Filters & Actions
- **Status Filter**: Show all, paid, pending, in_transit, or failed
- **Sync Button**: Manually fetch latest payouts from Stripe
- **Auto-sync**: Webhooks keep data up-to-date automatically

## 🔒 Security

**Row Level Security (RLS) Enabled:**
- Organizations can only see their own payouts
- Service role can insert/update (for webhooks)
- No public access

**Policies:**
- `payouts_select_org_members` - Only org members can SELECT
- `payouts_insert_system` - System can INSERT
- `payouts_update_system` - System can UPDATE

## 📈 Usage Examples

### Manual Sync via API

```typescript
const { data, error } = await supabase.functions.invoke('sync-stripe-payouts', {
  body: {
    organizationId: 'org-uuid',
    // Optional: sync specific payout
    payoutId: 'po_xxx'
  }
});

// Response:
// {
//   success: true,
//   synced: 5,
//   skipped: 2,
//   errors: 0,
//   total: 7
// }
```

### Get Payout Summary via RPC

```typescript
const { data, error } = await supabase.rpc('get_payout_summary', {
  p_organization_id: 'org-uuid',
  p_start_date: '2025-01-01',
  p_end_date: '2025-12-31'
});

// Returns:
// {
//   total_payouts: 52,
//   total_gross: 125000.00,
//   total_fees: 3750.00,
//   total_net: 121250.00,
//   pending_amount: 5000.00,
//   paid_amount: 116250.00
// }
```

### Query Payouts

```typescript
const { data, error } = await supabase
  .from('payouts')
  .select('*')
  .eq('organization_id', orgId)
  .eq('status', 'paid')
  .order('payout_date', { ascending: false })
  .limit(10);
```

## 🔄 Windcave Integration (Future)

The schema is designed to support multiple payment processors. When adding Windcave:

1. **Add processor**: Set `payment_processor = 'windcave'`
2. **Create sync function**: `sync-windcave-settlements`
3. **Map fields**:
   - `processor_payout_id` → Windcave settlement ID
   - `processor_account_id` → Windcave merchant ID
4. **Use Windcave Settlements API** to fetch data
5. **Update UI**: Component already supports multiple processors

**Windcave Fields to Map:**
- Settlement ID → `processor_payout_id`
- Settlement Date → `payout_date`
- Net Amount → `net_amount`
- Transaction Fees → `processor_fees`
- Bank Account → `bank_account_last4`

## ⚙️ Configuration

### Environment Variables

```bash
# Already configured
STRIPE_SECRET_KEY=sk_live_xxx  # Platform Stripe key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyxxx

# For Windcave (future)
WINDCAVE_API_KEY=xxx
WINDCAVE_API_URL=https://xxx
```

### Automatic Sync Schedule (Optional)

Set up a cron job to sync payouts daily:

```sql
-- In Supabase, create a pg_cron job
SELECT cron.schedule(
  'sync-stripe-payouts-daily',
  '0 2 * * *', -- 2 AM daily
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/sync-stripe-payouts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body:='{"organizationId": "all"}'::jsonb
  );
  $$
);
```

## 📝 Database Indexes

Already created for performance:
- `idx_payouts_org_id` - Fast org lookups
- `idx_payouts_processor` - Filter by Stripe/Windcave
- `idx_payouts_status` - Status filtering
- `idx_payouts_payout_date` - Date sorting
- `idx_payouts_processor_payout_id` - Payout ID lookups

## 🐛 Troubleshooting

### Payouts Not Appearing

1. **Check Stripe Connect**: Organization must have `stripe_account_id` set
2. **Check Webhook**: Ensure payout events are configured
3. **Manual Sync**: Click "Sync Payouts" button
4. **Check Logs**: View Supabase edge function logs for errors

### Incorrect Fee Amounts

- Fees are calculated from balance transactions
- If `processor_fees = 0`, sync may not have fetched balance transactions
- Re-run sync to fetch detailed breakdown

### Webhook Not Working

1. Verify webhook secret matches environment variable
2. Check webhook event list includes `payout.*` events
3. Test webhook in Stripe dashboard
4. View webhook logs in Stripe dashboard

## 📚 API Reference

### RPC Function: `get_payout_summary`

**Parameters:**
- `p_organization_id` (UUID, required)
- `p_start_date` (TIMESTAMP, optional)
- `p_end_date` (TIMESTAMP, optional)

**Returns:**
```typescript
{
  total_payouts: number;
  total_gross: number;
  total_fees: number;
  total_net: number;
  pending_amount: number;
  paid_amount: number;
}
```

### Edge Function: `sync-stripe-payouts`

**Request Body:**
```json
{
  "organizationId": "uuid",
  "payoutId": "po_xxx" // optional
}
```

**Response:**
```json
{
  "success": true,
  "synced": 5,
  "skipped": 2,
  "errors": 0,
  "total": 7
}
```

## ✨ Future Enhancements

- [ ] Export to CSV
- [ ] Payout notifications (email/webhook)
- [ ] Windcave settlements integration
- [ ] Fee analysis charts
- [ ] Reconciliation reports
- [ ] Multi-currency support improvements
- [ ] Automated payout scheduling
- [ ] Fee optimization suggestions

## 📄 License

Part of the Pulse Ticket Launch platform.
