# Payment Log Fixes - Stripe Integration Issues

## 🔍 **Issues Identified**

### **Issue 1: Invoice Payments Show "Unknown" Provider** ❌
- **Root Cause**: Invoices table doesn't have `stripe_session_id` field
- **Current Logic**: Only checks `windcave_session_id`, defaults to "unknown"
- **Missing**: Stripe session tracking for invoice payments

### **Issue 2: Widget Payments Not Showing** ❌
- **Root Cause**: Payment log query is too restrictive
- **Current Filter**: Only shows orders with specific status combinations
- **Missing**: Widget payments might have different status patterns

## 🛠️ **Fixes Implemented**

### **1. Database Migration** ✅
**File**: `supabase/migrations/20250720000001_add_stripe_to_invoices.sql`
```sql
-- Add stripe_session_id to invoices table for proper payment tracking
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session ON public.invoices(stripe_session_id);
```

### **2. Updated Stripe Invoice Payment Function** ✅
**File**: `supabase/functions/stripe-invoice-payment/index.ts`
- **Added**: `stripe_session_id: session.id` to invoice update
- **Purpose**: Track Stripe session IDs for invoice payments

### **3. Created Stripe Webhook Function** ✅
**File**: `supabase/functions/stripe-webhook/index.ts`
- **Handles**: `checkout.session.completed`, `payment_intent.succeeded`, `invoice.payment_succeeded`
- **Updates**: Invoice and order status when payments complete
- **Tracks**: Payment session IDs for proper provider detection

### **4. Updated Payment Log Component** ✅
**File**: `src/components/PaymentLog.tsx`
- **Fixed**: Payment provider detection logic for invoices
- **Added**: Support for `stripe_session_id` field
- **Improved**: Query to include more payment types

## 🚀 **Deployment Steps**

### **Step 1: Run Database Migration**
```bash
# Option A: Using Supabase CLI (if configured)
npx supabase db push

# Option B: Manual SQL execution in Supabase Dashboard
# Go to SQL Editor and run:
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session ON public.invoices(stripe_session_id);
```

### **Step 2: Deploy Edge Functions**
```bash
# Deploy the new webhook function
npx supabase functions deploy stripe-webhook

# Deploy the updated invoice payment function
npx supabase functions deploy stripe-invoice-payment
```

### **Step 3: Configure Stripe Webhook**
1. **Go to Stripe Dashboard** → Webhooks
2. **Add endpoint**: `https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/stripe-webhook`
3. **Select events**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
4. **Copy webhook secret** and add to Supabase environment variables:
   - `STRIPE_WEBHOOK_SECRET`

### **Step 4: Update Environment Variables**
Add to Supabase project settings:
```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 🔧 **Manual Database Update (If CLI Issues)**

If Supabase CLI has configuration issues, manually update the database:

### **1. Add Column to Invoices Table**
```sql
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session 
ON public.invoices(stripe_session_id);
```

### **2. Update Existing Invoice Records**
```sql
-- Update existing paid invoices to have a default provider
-- This will help identify which payments were made via Stripe
UPDATE public.invoices 
SET stripe_session_id = 'legacy_payment'
WHERE status = 'paid' AND windcave_session_id IS NULL;
```

## 📊 **Expected Results After Fixes**

### **Before Fixes** ❌
- Invoice payments: "Unknown" provider
- Widget payments: Missing from log
- No Stripe session tracking

### **After Fixes** ✅
- Invoice payments: "Stripe" or "Windcave" provider
- Widget payments: Visible in payment log
- Complete payment session tracking
- Proper webhook handling for payment completion

## 🧪 **Testing the Fixes**

### **1. Test Invoice Payment**
1. Create a new invoice
2. Send payment link via Stripe
3. Complete payment
4. Check payment log shows "Stripe" provider

### **2. Test Widget Payment**
1. Create an event with tickets
2. Purchase tickets via widget
3. Complete Stripe payment
4. Verify payment appears in log

### **3. Test Webhook**
1. Check Supabase function logs
2. Verify webhook events are received
3. Confirm database updates occur

## 🔍 **Troubleshooting**

### **If Payments Still Show "Unknown"**
1. Check if `stripe_session_id` column exists
2. Verify webhook is configured correctly
3. Check function logs for errors
4. Ensure Stripe session IDs are being stored

### **If Widget Payments Missing**
1. Check order status values
2. Verify payment completion webhooks
3. Review query filters in PaymentLog component
4. Check for any status mismatches

### **If Webhook Not Working**
1. Verify webhook endpoint URL
2. Check webhook secret configuration
3. Review function logs
4. Test webhook signature verification

## 📝 **Additional Notes**

- **Backward Compatibility**: Existing payments will show "Unknown" until manually updated
- **Performance**: Added indexes for better query performance
- **Security**: Webhook signature verification ensures data integrity
- **Monitoring**: Function logs provide visibility into payment processing

## 🎯 **Next Steps**

1. **Deploy migration** to add `stripe_session_id` column
2. **Deploy webhook function** for payment completion handling
3. **Configure Stripe webhook** in dashboard
4. **Test payment flows** to verify fixes work
5. **Monitor logs** for any issues
6. **Update existing records** if needed for historical data 