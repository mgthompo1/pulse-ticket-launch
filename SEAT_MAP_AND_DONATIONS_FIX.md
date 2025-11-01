# Seat Map & Donations Fix Guide

## Issues Identified

### 1. Donations Not Showing in Single Page Checkout (BetaCheckout)
**Location:** `src/components/checkout/BetaCheckout.tsx:455`

**Problem:** Donations are hardcoded to `0`:
```typescript
donationAmount: 0, // BetaCheckout doesn't seem to have donations yet
```

**Solution:** Add donation prompt similar to regular checkout

### 2. Seat Maps Not Linked to Ticket Types
**Problem:** When you enable a seat map for an event, ALL tickets show "this event doesn't have assigned seating" because there's no link between ticket types and the seat map.

**Current Architecture:**
- `seat_maps` table is linked to `event_id`
- `ticket_types` table has NO field to indicate which types should use assigned seating
- Result: Even with a seat map enabled, the system doesn't know which ticket types should use it

## Fixes Applied

### Fix 1: Database Migration - Add `use_assigned_seating` to Ticket Types

**File:** `supabase/migrations/20251101000002_add_assigned_seating_to_ticket_types.sql`

```sql
ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS use_assigned_seating BOOLEAN NOT NULL DEFAULT false;
```

This allows you to specify per-ticket-type whether it should use assigned seating.

### Fix 2: How to Use Assigned Seating

After running the migration, you need to:

1. **Go to OrgDashboard → Events → Edit Event → Ticket Types**
2. **Edit the ticket type** you want to use assigned seating
3. **Enable "Use Assigned Seating" checkbox** (needs to be added to UI)
4. **Save the ticket type**

Now when customers select that ticket type in the widget, they'll be prompted to choose seats from the seat map.

##Steps Required

### Step 1: Apply Migration

Run the migration in Supabase SQL Editor:
```sql
ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS use_assigned_seating BOOLEAN NOT NULL DEFAULT false;
```

### Step 2: Update TypeScript Types

Add `use_assigned_seating?: boolean` to the `TicketType` interface in:
- `src/types/widget.ts`
- `src/integrations/supabase/types.ts` (or regenerate types)

### Step 3: Add UI Control for Ticket Type Management

Find where ticket types are created/edited (likely in `src/components/EventCustomization.tsx` or similar) and add:

```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="use_assigned_seating"
    checked={ticketType.use_assigned_seating || false}
    onCheckedChange={(checked) =>
      setTicketType({ ...ticketType, use_assigned_seating: checked })
    }
  />
  <Label htmlFor="use_assigned_seating">
    Require seat selection (uses event seat map)
  </Label>
</div>
```

### Step 4: Update Checkout Logic

In the checkout flow, check the ticket type's `use_assigned_seating` field before showing seat selection:

```typescript
// In TicketWidget.tsx or wherever seat selection is triggered
const shouldShowSeatSelection = (ticketType: TicketType) => {
  return ticketType.use_assigned_seating === true && hasSeatMap;
};
```

### Step 5: Add Donations to BetaCheckout

In `src/components/checkout/BetaCheckout.tsx`:

1. Add donation state:
```typescript
const [donationAmount, setDonationAmount] = useState(0);
```

2. Add donation input in the UI (similar to regular checkout)

3. Update line 455 to use the state:
```typescript
donationAmount: donationAmount,  // Instead of hardcoded 0
```

4. Include donation in total calculation (already handled by tax hook on line 451-458)

## Testing

1. **Create a seat map** for your event in OrgDashboard
2. **Create/edit a ticket type** and enable "Use Assigned Seating"
3. **Go to the ticket widget** and select that ticket type
4. **You should see the seat selection modal** appear
5. **Test with another ticket type** that doesn't have assigned seating enabled - it should skip seat selection

## Why This Design?

This allows flexibility:
- **General Admission tickets** → `use_assigned_seating = false` → No seat selection
- **Reserved Seating tickets** → `use_assigned_seating = true` → Must select seats
- **Mixed events** → Some ticket types use seats, others don't (e.g., VIP gets reserved seats, GA doesn't)

## Database Schema

```
ticket_types
├── id
├── event_id
├── name
├── price
├── use_assigned_seating (NEW!)  ← Links to seat_maps via event_id
└── ...

seat_maps
├── id
├── event_id  ← Multiple ticket types can reference this
├── layout_data
└── ...
```
