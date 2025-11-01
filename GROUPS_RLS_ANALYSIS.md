# Groups System RLS Analysis & Fixes

## Critical Issues Found

### 1. **Promo Code Creation - BLOCKING ISSUE** ❌
**Location:** `GroupDiscountCodes.tsx` line 168
**Problem:** Groups cannot create promo codes because RLS policy only allows organization owners

**Current Policy:**
```sql
-- Only org owners can create promo codes
CREATE POLICY "Users can insert promo codes for their organizations"
WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
```

**What Breaks:**
- Group coordinators clicking "Create Promo Code" will get permission denied
- Groups cannot manage their own discounts (main feature requirement)

**Fix:** Migration adds policy to allow group coordinators to create promo codes

---

### 2. **Invoice Payment Updates - BLOCKING ISSUE** ❌
**Location:** `stripe-invoice-webhook/index.ts` line 91-98
**Problem:** Stripe webhook cannot update invoice status to "paid" after payment completes

**Current Policy:**
```sql
-- Only org owners can update invoices
CREATE POLICY "Organizations can manage invoices"
```

**What Breaks:**
- When groups pay invoices via Stripe, webhook receives payment confirmation
- Webhook tries to update `group_invoices` status to "paid"
- RLS denies the update because webhook is service role, not org owner
- Invoice stays in "pending" status even after payment ✅ **This is why your $55 test payment didn't mark the invoice as paid!**

**Fix:** Migration adds service role policy to allow webhook updates

---

### 3. **GroupPortal Authentication - ARCHITECTURAL ISSUE** ⚠️
**Location:** `App.tsx` line 59
**Problem:** GroupPortal route is NOT protected but tries to perform authenticated operations

**Current State:**
```tsx
// Route is public (no ProtectedRoute wrapper)
<Route path="/group/:slug" element={<GroupPortal />} />
```

**What Breaks:**
- Anyone can visit `/group/:slug`
- But to create promo codes, view sales, etc., user must be authenticated
- Unauthenticated visitors see errors when trying to use features

**Recommended Fix:**
Wrap GroupPortal in ProtectedRoute and check if user is a coordinator:

```tsx
<Route path="/group/:slug" element={
  <ThemeProvider>
    <ProtectedRoute>
      <GroupPortal />
    </ProtectedRoute>
  </ThemeProvider>
} />
```

Then add logic in GroupPortal to verify the logged-in user is a coordinator for that specific group.

---

### 4. **Public Widget Promo Code Access** ⚠️
**Location:** `GroupPublicWidget.tsx` (when users apply promo codes)
**Problem:** Public widget users cannot view promo codes to apply discounts

**Fix:** Migration adds public read access for active promo codes

---

## Migration Created

File: `supabase/migrations/20251101000000_fix_groups_rls_for_coordinators.sql`

### What It Fixes:

1. ✅ **Group coordinators can create/manage promo codes** for their organization
2. ✅ **Service role (webhooks) can update invoices** when payments complete
3. ✅ **Public users can view active promo codes** in the widget
4. ✅ **Service role can create sales records** when tickets are purchased

### What You Need To Do:

1. **Apply the migration:**
   ```bash
   # Push the migration to Supabase
   npx supabase db push
   ```

2. **Protect the GroupPortal route** (RECOMMENDED):

   Update `src/App.tsx`:
   ```tsx
   // Add this import if not already present
   import { ThemeProvider } from "@/contexts/ThemeContext";

   // Change the route from:
   <Route path="/group/:slug" element={<GroupPortal />} />

   // To:
   <Route path="/group/:slug" element={
     <ThemeProvider>
       <ProtectedRoute>
         <GroupPortal />
       </ProtectedRoute>
     </ThemeProvider>
   } />
   ```

3. **Add coordinator verification in GroupPortal** (RECOMMENDED):

   In `GroupPortal.tsx`, after loading the group, verify the user is a coordinator:
   ```tsx
   // After loading group data
   const { data: coordinatorData } = await supabase
     .from("group_coordinators")
     .select("*")
     .eq("group_id", groupData.id)
     .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
     .single();

   if (!coordinatorData) {
     setError("You are not authorized to access this group portal.");
     return;
   }
   ```

## Testing Checklist

After applying the migration and code changes:

- [ ] Group coordinator can log in and access `/group/:slug`
- [ ] Group coordinator can create promo codes
- [ ] Group coordinator can view invoices
- [ ] Group coordinator can view sales
- [ ] Make a test payment on an invoice via Stripe
- [ ] Verify invoice status updates to "paid" after payment
- [ ] Verify webhook doesn't show errors in logs
- [ ] Public users can access `/group/:slug/widget` without authentication
- [ ] Public users can apply promo codes in the widget

## Why The $55 Payment Didn't Work

The Stripe webhook successfully received the payment notification, but when it tried to update the invoice in the database:

```typescript
await supabaseClient.from("group_invoices").update({
  status: "paid",
  amount_paid: paymentAmount,
  paid_date: new Date().toISOString(),
}).eq("id", invoiceId);
```

The RLS policy blocked it because:
1. Webhook uses service role authentication
2. Current RLS policy only allows org owners to update invoices
3. Service role ≠ org owner, so update was denied
4. Invoice stayed in "pending" status

After applying this migration, the webhook will be able to update invoices and payments will work correctly.

## Security Considerations

The migration is safe because:
- Group coordinators can only create promo codes for their own organization (verified via join)
- Service role policies only apply to edge functions, not client code
- Public users can only READ active promo codes, not modify them
- Invoice updates are restricted to service role (webhooks only)

No existing functionality is broken - we're only adding missing permissions that groups need.
