# Stripe Separate Charges & Transfers Implementation Proposal

## Overview
Instead of billing platform fees monthly to organizations, implement a booking fee system where fees are collected directly from customers at purchase time and automatically transferred to your account.

## Current vs Proposed Architecture

### Current (Complex)
```
1. Customer pays $100 for ticket
2. Organizer receives $100
3. System records $1.50 platform fee (1% + $0.50)
4. Monthly billing charges organizer $1.50
5. Risk: Organizer's card fails, you lose revenue
```

### Proposed (Simple)
```
1. Customer pays $101.50 ($100 ticket + $1.50 booking fee)
2. Organizer receives $100
3. Your account receives $1.50 immediately
4. No monthly billing needed
```

## Implementation Steps

### 1. Update Payment Flow
Instead of charging organizers monthly, add booking fees to customer transactions:

```javascript
// In ticket purchase flow
const bookingFeeRate = 0.01; // 1%
const bookingFeeFixed = 0.50; // $0.50
const ticketPrice = 100.00;
const bookingFee = (ticketPrice * bookingFeeRate) + bookingFeeFixed;
const totalCharge = ticketPrice + bookingFee;

// Create payment intent with application fee
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(totalCharge * 100), // $101.50
  currency: 'nzd',
  application_fee_amount: Math.round(bookingFee * 100), // $1.50 goes to your account
  transfer_data: {
    destination: organizerStripeAccountId, // $100 goes to organizer
  },
});
```

### 2. Stripe Connect Setup
You'll need to use Stripe Connect to manage organizer accounts:

```javascript
// Create connected account for each organization
const account = await stripe.accounts.create({
  type: 'express',
  country: 'NZ',
  email: organizer.email,
  capabilities: {
    transfers: { requested: true },
  },
});
```

### 3. Database Changes
Replace complex billing system with simple fee tracking:

```sql
-- Replace billing_customers, usage_records, billing_invoices with:
CREATE TABLE platform_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  order_id UUID REFERENCES orders(id),
  ticket_price DECIMAL(10,2),
  booking_fee DECIMAL(10,2),
  stripe_payment_intent_id TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. UI Changes
Update checkout to show booking fee transparently:

```
Ticket: General Admission × 1     $100.00
Booking Fee                       $  1.50
────────────────────────────────────────
Total                            $101.50
```

## Benefits Analysis

### Financial Benefits
- **Immediate Cash Flow**: Get paid when transactions happen
- **Zero Bad Debt**: No failed monthly charges
- **Reduced Processing Costs**: One transaction instead of two
- **Simplified Accounting**: Direct revenue recognition

### Technical Benefits
- **Simpler Architecture**: Remove entire billing customer system
- **Fewer Edge Functions**: No monthly billing processing
- **Better Reliability**: Fewer points of failure
- **Easier Testing**: No complex billing cycles

### Business Benefits
- **Lower Friction**: Organizers can go live without billing setup
- **Industry Standard**: Matches customer expectations from other platforms
- **Scalable**: No monthly processing limits
- **Global Ready**: Works with international customers

## Migration Plan

### Phase 1: Implement New System
1. Set up Stripe Connect
2. Create new payment flow with booking fees
3. Update UI to show booking fees
4. Add platform fee tracking

### Phase 2: Migrate Existing Organizations
1. Create Stripe Connect accounts for existing orgs
2. Update their payment flows
3. Communicate changes to customers

### Phase 3: Remove Old System (After 30 days)
1. Deprecate billing customer system
2. Remove monthly billing functions
3. Clean up database tables

## Customer Communication

### For Event Organizers
"Great news! We're simplifying our billing. Instead of monthly invoices, booking fees are now collected directly from customers at checkout. This means you can focus on your events while we handle the payments seamlessly."

### For Ticket Buyers
"A small booking fee helps us maintain the platform and support event organizers. This fee is clearly shown at checkout before payment."

## Risk Assessment

### Low Risk
- **Technical Implementation**: Standard Stripe Connect pattern
- **Customer Acceptance**: Industry standard approach
- **Financial Impact**: Positive cash flow improvement

### Mitigation Strategies
- **Gradual Rollout**: Start with new organizations
- **Clear Communication**: Transparent fee disclosure
- **Support Preparation**: Train team on new system

## Estimated Timeline
- **Week 1-2**: Stripe Connect setup and testing
- **Week 3**: UI updates and payment flow changes
- **Week 4**: Migration tools and testing
- **Week 5**: Gradual rollout
- **Week 6**: Full migration and old system deprecation

## Conclusion
The separate charges approach is superior in every way:
- Simpler for customers and organizers
- Better cash flow for the platform
- More reliable and scalable
- Industry standard approach

**Recommendation: Implement immediately for all new organizations, migrate existing ones over 4-6 weeks.**