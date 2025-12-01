# Tax System Integration Guide

## ✅ What's Complete

### 1. Database Schema (Migration Applied)
- Tax configuration on `organizations` table
- Tax tracking on `orders` table
- Tax presets table with 20+ jurisdictions

### 2. Tax Calculator Service
- `src/lib/taxCalculator.ts` - Handles all tax calculations
- Supports tax-inclusive (NZ, AU, UK, EU)
- Supports tax-exclusive (US, Canada)
- Calculates tax on: tickets, add-ons, donations, booking fees

### 3. Tax Settings UI
- Added to Organization Settings → Tax tab
- Quick preset selector
- Configure: name, rate, inclusive/exclusive, registration number
- Live preview calculations

### 4. Tax Calculation Hook
- `src/hooks/useTaxCalculation.ts`
- Loads organization tax settings
- Calculates tax breakdown
- Ready to use in checkout

---

## 🚧 Integration Steps (To Complete)

### Step 1: Add Tax to OrderSummary Component

**File:** `src/components/checkout/OrderSummary.tsx`

Add at top:
```typescript
import { useTaxCalculation } from '@/hooks/useTaxCalculation';
```

Add after existing calculations (around line 90):
```typescript
// Calculate tax
const { taxBreakdown, taxEnabled, taxName, taxInclusive } = useTaxCalculation({
  eventId: eventData.id,
  ticketAmount: calculateTicketSubtotal(),
  addonAmount: calculateMerchandiseSubtotal(),
  donationAmount: customerInfo?.donationAmount || 0,
  bookingFeePercent: bookingFeesEnabled ? 1.0 : 0,
  enabled: true,
});

// Use tax-aware total
const finalTotal = taxBreakdown?.grandTotal || (subtotal - discount + bookingFee);
```

Add tax display in the price breakdown section:
```typescript
{/* After subtotal and discount */}
{taxEnabled && taxBreakdown && (
  <>
    {taxInclusive && (
      <div className="flex justify-between text-sm text-gray-600">
        <span>Subtotal (excl. {taxName}):</span>
        <span>${taxBreakdown.subtotal.toFixed(2)}</span>
      </div>
    )}
    <div className="flex justify-between text-sm">
      <span>{taxName} ({taxBreakdown.taxRate}%):</span>
      <span>${taxBreakdown.totalTax.toFixed(2)}</span>
    </div>
  </>
)}

{/* Booking fee */}
{bookingFee > 0 && (
  <>
    <div className="flex justify-between text-sm">
      <span>Booking Fee:</span>
      <span>${taxBreakdown?.bookingFee.toFixed(2) || bookingFee.toFixed(2)}</span>
    </div>
    {taxBreakdown?.bookingFeeTax > 0 && (
      <div className="flex justify-between text-sm text-gray-600">
        <span>{taxName} on fee:</span>
        <span>${taxBreakdown.bookingFeeTax.toFixed(2)}</span>
      </div>
    )}
  </>
)}

{/* Grand Total */}
<Separator />
<div className="flex justify-between text-lg font-bold">
  <span>Total:</span>
  <span>${finalTotal.toFixed(2)}</span>
</div>
```

---

### Step 2: Update MultiStepCheckout

**File:** `src/components/checkout/MultiStepCheckout.tsx`

Import and use the hook:
```typescript
import { useTaxCalculation, formatTaxForOrder } from '@/hooks/useTaxCalculation';

// Inside component, add tax calculation
const ticketSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const addonSubtotal = merchandiseCart.reduce((sum, item) => sum + (item.merchandise.price * item.quantity), 0);

const { taxBreakdown, taxCalculator } = useTaxCalculation({
  eventId: eventData.id,
  ticketAmount: ticketSubtotal,
  addonAmount: addonSubtotal,
  donationAmount: customerInfo?.donationAmount || 0,
  bookingFeePercent: bookingFeesEnabled ? 1.0 : 0,
});
```

Pass `taxBreakdown` to OrderSummary as a prop.

---

### Step 3: Update BetaCheckout

**File:** `src/components/checkout/BetaCheckout.tsx`

Same approach as MultiStepCheckout - add the hook and pass tax data through.

---

### Step 4: Update Order Creation (Edge Function)

**File:** `supabase/functions/create-payment-intent/index.ts`

When creating the order, include tax fields:
```typescript
const orderData = {
  event_id: eventId,
  customer_name: customerInfo?.name || "Unknown",
  customer_email: customerInfo?.email || "unknown@example.com",

  // Tax fields (calculate on backend or pass from frontend)
  subtotal: taxBreakdown.subtotal,
  tax_rate: taxRate,
  tax_amount: taxBreakdown.totalTax,
  tax_name: taxName,
  tax_inclusive: taxInclusive,
  tax_on_tickets: taxBreakdown.taxOnTickets,
  tax_on_addons: taxBreakdown.taxOnAddons,
  tax_on_donations: taxBreakdown.taxOnDonations,
  tax_on_fees: taxBreakdown.taxOnFees,
  booking_fee: taxBreakdown.bookingFee,
  booking_fee_tax: taxBreakdown.bookingFeeTax,

  total_amount: taxBreakdown.grandTotal,
  // ... other fields
};
```

---

## 📋 Testing Checklist

### Test Scenario 1: NZ GST (Tax-Inclusive)
1. Go to Organization Settings → Tax tab
2. Select "New Zealand - GST (15%)" preset
3. Ensure "Prices include tax" is checked
4. Save settings
5. Add $100 ticket to cart
6. Verify breakdown shows:
   - Display: $100.00 (inc. GST)
   - Subtotal: $86.96
   - GST (15%): $13.04
   - Total: $100.00

### Test Scenario 2: US Sales Tax (Tax-Exclusive)
1. Configure: Sales Tax 8.5%, tax-exclusive
2. Add $100 ticket to cart
3. Verify breakdown shows:
   - Ticket: $100.00
   - Sales Tax (8.5%): $8.50
   - Total: $108.50

### Test Scenario 3: With Booking Fee
1. Configure: GST 15%, tax-inclusive
2. Add $100 ticket
3. Enable booking fees (1%)
4. Verify:
   - Ticket: $100.00 (inc. GST)
   - Booking Fee: $0.87 (inc. GST $0.13)
   - Total: $100.87

### Test Scenario 4: With Add-ons and Donations
1. Add $100 ticket + $20 add-on + $10 donation
2. Verify all three have tax calculated
3. Check order record has tax breakdown

---

## 🎯 Quick Start

### To Test Right Now:

1. **Configure Tax:**
   ```
   Dashboard → Settings → Tax tab
   → Select "New Zealand - GST (15%)" preset
   → Click Save
   ```

2. **View in Checkout:** (After integration steps above)
   ```
   → Add tickets to cart
   → See tax breakdown in order summary
   → Complete purchase
   → Check database orders table for tax fields
   ```

---

## 📊 Example Tax Calculations

### NZ: $100 ticket + $1 booking fee (15% GST inclusive)
```
Ticket: $100.00 (inc. GST $13.04)
Booking Fee: $0.87 (inc. GST $0.13)
---
Subtotal: $87.83
GST (15%): $13.17
Total: $101.00
```

### US: $100 ticket + $1 booking fee (8.5% Sales Tax exclusive)
```
Ticket: $100.00
Booking Fee: $1.00
Subtotal: $101.00
Sales Tax (8.5%): $8.59
Total: $109.59
```

---

## 🔧 Next Steps

1. ✅ Database migration - DONE
2. ✅ Tax calculator - DONE
3. ✅ Settings UI - DONE
4. ✅ Calculation hook - DONE
5. ⏳ Integrate into OrderSummary
6. ⏳ Integrate into MultiStepCheckout
7. ⏳ Integrate into BetaCheckout
8. ⏳ Update edge functions
9. ⏳ Test end-to-end

Would you like me to complete steps 5-8 now?
