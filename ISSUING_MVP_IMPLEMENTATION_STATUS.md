# Stripe Issuing MVP - Implementation Status

## 🎯 Project Goal
Build virtual card issuing system integrated with Groups module where:
- Churches can issue cards to coordinators with spending controls
- Churches can send top-up links to parents to load cards
- Organizations track interchange revenue from card spend
- Issuing toggle only enabled for orgs with Stripe Connect

## ✅ Completed (Phase 1)

### 1. Database Schema ✅
**File:** `supabase/migrations/20251111000000_create_issuing_system.sql`

**Tables Created:**
- ✅ `issuing_cards` - Stores virtual card metadata, balances, spending controls
- ✅ `issuing_transactions` - Transaction history synced from Stripe webhooks
- ✅ `issuing_card_loads` - Funding events (org loads, parent top-ups)
- ✅ `issuing_interchange_payouts` - Payout tracking for interchange revenue
- ✅ `issuing_activity_log` - Audit log for all issuing activities

**Views Created:**
- ✅ `issuing_interchange_balances` - Real-time view of interchange earnings per org

**Functions/Triggers:**
- ✅ `update_card_balance_on_transaction()` - Auto-updates card balances
- ✅ `update_card_balance_on_load()` - Updates balance when funds added
- ✅ Auto-timestamp triggers

**RLS Policies:**
- ✅ Organizations can manage their own cards
- ✅ Public can use top-up tokens (for parent top-ups)
- ✅ Activity log access restricted to org owners

**Key Features:**
- 🎯 All amounts stored in cents for precision
- 🎯 Top-up token system for parent loads
- 🎯 Interchange tracking at 80/20 split (org/platform)
- 🎯 Spending controls: limits, categories, countries
- 🎯 Card lifecycle: active, inactive, cancelled, suspended, expired

### 2. Settings Toggle ✅
**File:** `src/components/OrganizationSettings.tsx`

**Changes:**
- ✅ Added `issuing_enabled` and `stripe_account_id` to interface
- ✅ Created new "Virtual Card Issuing" card in System Configuration tab
- ✅ Conditional enable: Only if `stripe_account_id` is not null
- ✅ Warning message if Stripe Connect not connected
- ✅ Info box explaining Issuing features when enabled
- ✅ Revenue opportunity messaging (80/20 interchange split)
- ✅ Save logic updated to persist `issuing_enabled`

**UI Flow:**
1. If no Stripe Connect: Shows amber alert "Stripe Connect Required"
2. If Stripe Connect exists: Shows toggle switch
3. When enabled: Shows feature list and navigation hint

### 3. Sidebar Navigation ✅
**File:** `src/components/AppSidebar.tsx`

**Changes:**
- ✅ Added `issuingEnabled` state
- ✅ Updated `getSidebarItems()` to accept `issuingEnabled` parameter
- ✅ Added conditional "Issuing" menu item with DollarSign icon
- ✅ Database queries updated to fetch `issuing_enabled`
- ✅ Both owner and membership queries include `issuing_enabled`

**Result:**
- Issuing menu item appears between Groups and Support
- Only visible when `issuing_enabled = true`

## 🚧 Remaining Work (To Complete MVP)

### 4. Issuing Page UI ⏳ Next
**File:** `src/pages/IssuingPage.tsx` (to create)

**Components Needed:**
- InterchangeBalanceCard - Shows available balance, pending payouts
- IssuedCardsTable - List of all issued cards with status, balance
- IssueCardDialog - Form to issue new card to coordinator
- CardDetailsDialog - View card details, transactions, generate top-up link
- TransactionsTable - Card transaction history
- RequestPayoutDialog - Request payout of interchange balance

**Features:**
- Stats cards: Total cards, active cards, total spent, interchange earned
- Filter/search cards by status, cardholder, group
- Issue new card button (opens dialog)
- View card details (opens dialog with transactions)
- Generate top-up link button
- Request payout button (when balance > $10)

### 5. Issue Card Edge Function ⏳
**File:** `supabase/functions/issue-card/index.ts`

**Purpose:** Create Stripe cardholder and card, save to database

**Request:**
```typescript
{
  organizationId: string;
  groupId?: string;
  cardholderName: string;
  cardholderEmail: string;
  cardholderPhone?: string;
  cardholderDob?: string; // YYYY-MM-DD
  cardType: 'coordinator' | 'leader' | 'camper' | 'general';
  purpose?: string;
  initialBalance: number; // in cents
  spendingLimitAmount?: number;
  spendingLimitInterval?: string;
  allowedCategories?: string[];
  blockedCategories?: string[];
}
```

**Stripe API Calls:**
1. Create cardholder
2. Create virtual card
3. Fund card (via Treasury or transfer)

**Database:**
- Insert into `issuing_cards`
- Insert into `issuing_card_loads` (initial balance)
- Log in `issuing_activity_log`

### 6. Generate Top-Up Link Edge Function ⏳
**File:** `supabase/functions/generate-topup-link/index.ts`

**Purpose:** Generate secure token for parents to top up cards

**Request:**
```typescript
{
  cardId: string;
  parentEmail: string;
  expiresInHours?: number; // default 24
}
```

**Response:**
```typescript
{
  topupUrl: string; // e.g., /topup/abc123xyz
  expiresAt: string;
}
```

**Logic:**
- Generate secure token (UUID or crypto random)
- Insert into `issuing_card_loads` with pending status
- Set expiration (24 hours default)
- Send email to parent with link
- Log activity

### 7. Parent Top-Up Page ⏳
**File:** `src/pages/TopUpPage.tsx`

**URL:** `/topup/:token`

**Flow:**
1. Load token from URL
2. Validate token (not expired, not used)
3. Show card details (last4, cardholder name, current balance)
4. Amount selection ($25, $50, $100, $150, custom)
5. Stripe payment form
6. On success: Update card balance, mark token as used

**Components:**
- TopUpHeader - Shows card info, camper name
- AmountSelector - Quick buttons + custom input
- StripePaymentForm - Card payment
- SuccessMessage - Confirmation with new balance

### 8. Stripe Issuing Webhook Handler ⏳
**File:** `supabase/functions/stripe-issuing-webhook/index.ts`

**Events to Handle:**
- `issuing_authorization.created` - Real-time auth attempt
- `issuing_authorization.updated` - Auth approved/declined
- `issuing_transaction.created` - Transaction posted
- `issuing_transaction.updated` - Transaction updated

**Actions:**
- Insert/update `issuing_transactions`
- Calculate interchange (1.5%-2.5% of transaction amount)
- Update card balances (trigger handles this)
- Log activity
- Send notifications (coordinator email on large purchases)

### 9. Request Payout Functionality ⏳
**File:** `supabase/functions/request-interchange-payout/index.ts`

**Purpose:** Organizations request payout of accumulated interchange

**Request:**
```typescript
{
  organizationId: string;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
}
```

**Logic:**
- Query `issuing_interchange_balances` view
- Verify balance > minimum ($10)
- Create record in `issuing_interchange_payouts`
- Calculate organization share (80%)
- Trigger Stripe payout to Connect account
- Send confirmation email
- Log activity

## 📊 Database Overview

### Key Relationships
```
organizations (1) ─── (∞) issuing_cards
groups (1) ─── (∞) issuing_cards
issuing_cards (1) ─── (∞) issuing_transactions
issuing_cards (1) ─── (∞) issuing_card_loads
organizations (1) ─── (∞) issuing_interchange_payouts
```

### Balance Tracking
- `issuing_cards.current_balance` - Real-time available balance
- `issuing_cards.total_authorized` - Sum of pending authorizations
- `issuing_cards.total_spent` - Sum of captured transactions
- Triggers auto-update balances on transaction events

### Interchange Calculation
- Stored in `issuing_transactions.interchange_amount` (cents)
- Typical rate: 1.5%-2.5% of transaction amount
- 80% goes to organization, 20% to platform
- View `issuing_interchange_balances` aggregates totals

## 🎨 UI/UX Design

### Issuing Page Layout
```
┌─────────────────────────────────────────────────────┐
│ Stats Row                                            │
│ [Total Cards] [Active] [Total Spent] [Interchange]  │
├─────────────────────────────────────────────────────┤
│ Actions Bar                                          │
│ [Issue New Card] [Request Payout] [Export]          │
├─────────────────────────────────────────────────────┤
│ Tabs                                                 │
│ [Cards] [Transactions] [Payouts] [Settings]         │
├─────────────────────────────────────────────────────┤
│ Cards Table                                          │
│ | Cardholder | Type | Balance | Status | Actions |  │
│ | John Doe   | Lead | $450.00 | Active | [...] |   │
│ | Jane Smith | Coord| $120.50 | Active | [...] |   │
└─────────────────────────────────────────────────────┘
```

### Issue Card Dialog
```
┌─────────────────────────────────────────────────┐
│ Issue New Virtual Card                          │
├─────────────────────────────────────────────────┤
│ Card Type: [Coordinator ▼]                      │
│ Group: [Youth Group ▼] (optional)               │
│                                                  │
│ Cardholder Name: [_________________________]    │
│ Email: [____________________________________]    │
│ Phone: [____________________________________]    │
│ Date of Birth: [__/__/____] (if individual)     │
│                                                  │
│ Initial Balance: $[________]                    │
│                                                  │
│ Spending Controls:                               │
│ ├─ Daily Limit: $[_______]                      │
│ ├─ Categories: [Select...▼]                     │
│ └─ Countries: [US ▼]                            │
│                                                  │
│ Purpose: [Summer Camp Leader Card]              │
│                                                  │
│ [Cancel] [Issue Card ($0.10 fee)]               │
└─────────────────────────────────────────────────┘
```

### Card Details Dialog
```
┌─────────────────────────────────────────────────┐
│ Card Details - John Doe                         │
├─────────────────────────────────────────────────┤
│ Card: •••• 4242  Exp: 12/27  Status: Active     │
│ Balance: $450.00  Spent: $50.00                 │
│                                                  │
│ [Load Funds] [Generate Top-Up Link] [Cancel]   │
│                                                  │
│ Recent Transactions:                             │
│ ├─ Gas Station - $35.00 (Approved)              │
│ ├─ Restaurant - $15.00 (Approved)               │
│ └─ Store - $25.00 (Declined - Limit)            │
│                                                  │
│ Spending Controls:                               │
│ ├─ Daily Limit: $100                            │
│ ├─ Categories: Gas, Food, Supplies              │
│ └─ Countries: US only                           │
└─────────────────────────────────────────────────┘
```

### Parent Top-Up Page
```
┌─────────────────────────────────────────────────┐
│ Load Funds for Sarah Johnson                    │
├─────────────────────────────────────────────────┤
│ Card: •••• 4242  Current Balance: $12.50        │
│ Camp: Summer Youth Camp 2025                    │
│                                                  │
│ Select Amount:                                   │
│ [$25] [$50] [$100] [$150] [Custom: $_____]     │
│                                                  │
│ Payment Method:                                  │
│ [Stripe Card Input Element]                     │
│                                                  │
│ [Cancel] [Load $50.00]                          │
└─────────────────────────────────────────────────┘
```

## 🔐 Security Considerations

### PCI Compliance
- ✅ Never store full card numbers (only last4)
- ✅ Use Stripe Elements for card display
- ✅ All sensitive data encrypted by Stripe

### Authentication
- ✅ RLS policies restrict data access
- ✅ Top-up tokens expire after 24 hours
- ✅ Tokens single-use only

### Authorization
- ✅ Only org owners can issue cards
- ✅ Only org owners can see interchange balance
- ✅ Parents need valid token to top up

## 💰 Cost Analysis

### Stripe Issuing Fees
- Card creation: $0.10 per card
- Authorization: $0.02 per attempt
- No monthly fees for active cards

### Example: 50 Coordinators
- 50 cards × $0.10 = $5.00
- 1,000 transactions × $0.02 = $20.00
- **Total cost:** $25.00/month

### Revenue: Interchange
- $50,000 transaction volume
- 2% average interchange = $1,000
- 80% org share = **$800 revenue**
- **Net profit:** $775/month

## 🚀 Deployment Checklist

### Database
- [ ] Run migration: `20251111000000_create_issuing_system.sql`
- [ ] Verify RLS policies work correctly
- [ ] Test triggers (balance updates)
- [ ] Seed test data (optional)

### Edge Functions
- [ ] Deploy `issue-card`
- [ ] Deploy `generate-topup-link`
- [ ] Deploy `stripe-issuing-webhook`
- [ ] Deploy `request-interchange-payout`
- [ ] Configure webhook endpoint in Stripe Dashboard

### Frontend
- [ ] Build IssuingPage component
- [ ] Build IssueCardDialog component
- [ ] Build CardDetailsDialog component
- [ ] Build TopUpPage component
- [ ] Update routing in App.tsx
- [ ] Test end-to-end flow

### Stripe Configuration
- [ ] Apply for Stripe Issuing (1-2 week approval)
- [ ] Configure issuing webhooks
- [ ] Set up test cards in test mode
- [ ] Verify interchange tracking

### Testing
- [ ] Issue test card
- [ ] Make test transaction
- [ ] Verify balance updates
- [ ] Test top-up link generation
- [ ] Test parent top-up flow
- [ ] Verify interchange calculation
- [ ] Test payout request

## 📝 Next Steps

1. **Complete Issuing Page UI** (2-3 hours)
   - Build IssuingPage.tsx with cards table
   - Create IssueCardDialog component
   - Add interchange balance display

2. **Build Issue Card Function** (1-2 hours)
   - Create edge function
   - Integrate Stripe Issuing API
   - Test card creation

3. **Build Top-Up System** (2-3 hours)
   - Generate top-up link function
   - Parent top-up page
   - Payment integration

4. **Webhook Handler** (1 hour)
   - Transaction sync
   - Interchange calculation
   - Balance updates

5. **Testing & Polish** (2 hours)
   - End-to-end testing
   - Error handling
   - UI refinements

**Total remaining time:** ~8-11 hours

## 🎯 MVP Success Criteria

- [✅] Database schema deployed
- [✅] Settings toggle works (conditional on Stripe Connect)
- [✅] Navigation shows Issuing page when enabled
- [ ] Admin can issue card to coordinator
- [ ] Coordinator receives card details via email
- [ ] Admin can generate top-up link
- [ ] Parent can load card via link
- [ ] Transactions sync from Stripe
- [ ] Interchange balance displays correctly
- [ ] Admin can request payout

## 📚 Documentation Links

- [Stripe Issuing Docs](https://stripe.com/docs/issuing)
- [Stripe Issuing API](https://stripe.com/docs/api/issuing)
- [Spending Controls](https://stripe.com/docs/issuing/controls/spending-controls)
- [Webhooks](https://stripe.com/docs/issuing/webhooks)

---

**Last Updated:** 2025-11-11
**Phase:** 1 of 5 Complete (Database + Settings + Navigation)
**Next:** Build Issuing Page UI
