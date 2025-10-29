# Organization Billing Controls - Admin Feature

## Overview

Enhanced the Master Admin portal with comprehensive billing control and organization management features. This gives you the power to suspend billing, set trial periods, and view detailed organization statistics.

## 🎯 Features

### 1. Organization Detail Modal
When you click "View Details" on any organization, you get a comprehensive view showing:

**Organization Information:**
- Email address
- Creation date
- Current billing status (Active, Trial, or Suspended)
- Trial period status and days remaining

**Statistics:**
- **Events**: Total events and active events count
- **Tickets Sold**: Total tickets sold and number of orders
- **Revenue**: Total revenue and platform fees collected

**Billing Information:**
- Current billing status (active, setup_required, past_due, etc.)
- Next billing date
- Number of pending invoices
- Total platform fees accumulated

### 2. Billing Controls

**Suspend Billing:**
- Pause monthly/fortnightly billing for an organization
- Provide a reason for suspension (trial, special arrangement, etc.)
- Automatic timestamp and admin tracking
- Updates both organization and billing_customers tables

**Resume Billing:**
- One-click resume of suspended billing
- Clears suspension reason and timestamps

**Set Trial Period:**
- Set custom trial period in days (1-365 days)
- Automatically suspends billing during trial
- Tracks trial start and end dates
- Shows remaining trial days in the UI

### 3. Enhanced Organization Table

The organizations table now displays:
- Organization name
- Email
- **Billing Status Badge**:
  - 🔴 **Suspended** - Billing is paused
  - 🟡 **Trial** - In trial period
  - 🟢 **Active** - Normal billing active
- Creation date
- **View Details button** for each organization

## 📊 Database Changes

### New Columns in `organizations` table:
```sql
billing_suspended: BOOLEAN - Whether billing is suspended
billing_suspended_reason: TEXT - Reason for suspension
billing_suspended_at: TIMESTAMP - When billing was suspended
billing_suspended_by: TEXT - Admin who suspended billing
trial_ends_at: TIMESTAMP - When trial period ends
trial_started_at: TIMESTAMP - When trial period started
```

### New Columns in `billing_customers` table:
```sql
billing_suspended: BOOLEAN - Sync with organization suspension
billing_interval_days: INTEGER - Billing cycle (14 days default)
next_billing_at: TIMESTAMP - Next billing date
```

### New Function: `get_organization_stats()`
Returns comprehensive statistics for an organization:
- Total and active events
- Total orders
- Tickets sold
- Total revenue
- Platform fees collected
- Pending invoices count
- Next billing date
- Billing status
- Trial status and days remaining

## 🚀 Usage

### Access the Feature
1. Go to the admin portal: `https://www.ticketflo.org/secure-admin-auth`
2. Log in with admin credentials
3. Navigate to the "Organizations" tab
4. Click "View Details" on any organization

### Suspend Billing for Trial Period
1. Click "View Details" on the organization
2. Scroll to "Billing Controls"
3. Enter days for trial period (e.g., 30)
4. Click "Set 30 Day Trial"
5. Billing is automatically suspended with trial reason

### Manually Suspend Billing
1. Click "View Details" on the organization
2. Enter suspension reason in the text area
3. Click "Suspend Billing"
4. Organization receives no invoices until resumed

### Resume Billing
1. Click "View Details" on suspended organization
2. Click "Resume Billing"
3. Normal billing cycle resumes

## 📁 Files Created/Modified

### New Files:
- `supabase/migrations/20251029000004_add_billing_controls.sql` - Database migration
- `src/components/OrganizationDetailModal.tsx` - Modal component
- `ORGANIZATION_BILLING_CONTROLS.md` - This documentation

### Modified Files:
- `src/pages/MasterAdmin.tsx` - Added modal integration and updated org table

### Edge Function (unchanged):
- `supabase/functions/admin-data/index.ts` - Already returns all org fields

## 🔒 Security

- All billing controls require admin authentication
- Changes are logged with admin email and timestamp
- RLS policies restrict access to organization data
- Billing suspension affects both organization and billing_customers tables

## ⚡ Installation

### Step 1: Run the SQL Migration

Go to your Supabase SQL Editor and run this:

```sql
-- Add billing control fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS billing_suspended BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS billing_suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS billing_suspended_by TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

-- Add billing control fields to billing_customers table
ALTER TABLE public.billing_customers
ADD COLUMN IF NOT EXISTS billing_suspended BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_interval_days INTEGER NOT NULL DEFAULT 14,
ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_billing_suspended
ON public.organizations(billing_suspended)
WHERE billing_suspended = true;

CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at
ON public.organizations(trial_ends_at)
WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_customers_next_billing
ON public.billing_customers(next_billing_at)
WHERE next_billing_at IS NOT NULL;

-- Create function to get organization statistics
CREATE OR REPLACE FUNCTION get_organization_stats(p_organization_id UUID)
RETURNS TABLE(
  total_events BIGINT,
  active_events BIGINT,
  total_orders BIGINT,
  total_tickets_sold BIGINT,
  total_revenue NUMERIC,
  total_platform_fees NUMERIC,
  pending_invoices BIGINT,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  billing_status TEXT,
  is_trial BOOLEAN,
  trial_days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Events
    (SELECT COUNT(*) FROM public.events WHERE organization_id = p_organization_id)::BIGINT as total_events,
    (SELECT COUNT(*) FROM public.events WHERE organization_id = p_organization_id AND status = 'published')::BIGINT as active_events,

    -- Orders
    (SELECT COUNT(*) FROM public.orders o
     JOIN public.events e ON o.event_id = e.id
     WHERE e.organization_id = p_organization_id)::BIGINT as total_orders,

    -- Tickets
    (SELECT COALESCE(SUM(oi.quantity), 0) FROM public.order_items oi
     JOIN public.orders o ON oi.order_id = o.id
     JOIN public.events e ON o.event_id = e.id
     WHERE e.organization_id = p_organization_id AND oi.item_type = 'ticket')::BIGINT as total_tickets_sold,

    -- Revenue
    (SELECT COALESCE(SUM(o.total_amount), 0) FROM public.orders o
     JOIN public.events e ON o.event_id = e.id
     WHERE e.organization_id = p_organization_id AND o.status = 'paid')::NUMERIC as total_revenue,

    -- Platform Fees
    (SELECT COALESCE(SUM(total_platform_fee), 0) FROM public.usage_records
     WHERE organization_id = p_organization_id)::NUMERIC as total_platform_fees,

    -- Pending Invoices
    (SELECT COUNT(*) FROM public.billing_invoices
     WHERE organization_id = p_organization_id AND status = 'pending')::BIGINT as pending_invoices,

    -- Billing Info
    (SELECT bc.next_billing_at FROM public.billing_customers bc
     WHERE bc.organization_id = p_organization_id
     LIMIT 1) as next_billing_date,

    (SELECT bc.billing_status FROM public.billing_customers bc
     WHERE bc.organization_id = p_organization_id
     LIMIT 1) as billing_status,

    -- Trial Info
    (SELECT o.trial_ends_at IS NOT NULL AND o.trial_ends_at > NOW()
     FROM public.organizations o
     WHERE o.id = p_organization_id) as is_trial,

    (SELECT CASE
       WHEN o.trial_ends_at IS NOT NULL AND o.trial_ends_at > NOW()
       THEN EXTRACT(DAY FROM o.trial_ends_at - NOW())::INTEGER
       ELSE 0
     END
     FROM public.organizations o
     WHERE o.id = p_organization_id) as trial_days_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_organization_stats(UUID) TO authenticated, service_role;

-- Add comments
COMMENT ON COLUMN public.organizations.billing_suspended IS 'Whether billing is suspended for this organization';
COMMENT ON COLUMN public.organizations.billing_suspended_reason IS 'Reason for billing suspension (e.g., trial period, special arrangement)';
COMMENT ON FUNCTION get_organization_stats IS 'Get comprehensive statistics for an organization including events, tickets, revenue, and billing info';
```

### Step 2: Deploy Changes

The frontend changes are already in place. Just commit and push:

```bash
git add .
git commit -m "Add organization billing controls to admin portal"
git push
```

### Step 3: Test the Feature

1. Log into admin portal
2. Go to Organizations tab
3. Click "View Details" on any organization
4. Test the billing controls

## 📝 Example Use Cases

### Case 1: New Customer Trial
```
Organization: "Test Events Co"
Action: Set 30-day trial
Result:
- Billing suspended automatically
- Trial badge shows in org list
- Shows "28 days remaining" after 2 days
- Billing resumes automatically after 30 days (requires cron job*)
```

### Case 2: Special Arrangement
```
Organization: "Charity Events"
Action: Suspend with reason "Non-profit partnership"
Result:
- Billing suspended indefinitely
- Suspended badge shows in org list
- No invoices generated
- Resume billing when partnership ends
```

### Case 3: Temporary Suspension
```
Organization: "Summer Festivals"
Action: Suspend with reason "Off-season - no events"
Result:
- Billing paused
- No charges during suspension
- Resume when events start again
```

## ⚠️ Important Notes

1. **Billing Suspension**: When you suspend billing, the organization will NOT receive any invoices until you manually resume it.

2. **Trial Periods**: Setting a trial period automatically suspends billing. You must manually resume billing after the trial ends (or implement automatic resumption).

3. **Existing Invoices**: Suspending billing does NOT void existing pending invoices. It only prevents new invoices from being created.

4. **Automatic Trial Expiry**: Currently requires manual resumption. Consider adding a cron job to auto-resume billing when trials expire.

## 🔮 Future Enhancements

- [ ] Automatic trial expiry and billing resumption (cron job)
- [ ] Email notifications when trial is about to expire
- [ ] Bulk operations (suspend multiple orgs at once)
- [ ] Billing suspension history/audit log
- [ ] Custom billing intervals per organization
- [ ] Grace period after trial expiry before auto-suspend

## 📞 Support

For questions or issues:
- Check the code comments in the files
- Review this documentation
- Test in development first before production use

---

**Last Updated**: October 29, 2025
**Version**: 1.0.0
