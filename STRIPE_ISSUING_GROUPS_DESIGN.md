# Stripe Issuing Integration for Groups - Design Document

## 🎯 Project Overview

Integrate Stripe Issuing to enable churches/organizations to issue virtual prepaid cards through the groups module for various use cases:
1. **Camper Cards**: Parents load funds onto virtual cards for campers to spend at camp
2. **Leader Cards**: Churches allocate funds to youth group leaders with spending controls
3. **Event Cards**: General-purpose cards for group events with tracking

## 💡 Use Cases

### Use Case 1: Parent-Funded Camper Cards
**Scenario**: Parent buys camp ticket for their child and wants to provide spending money.

**Flow**:
1. Parent purchases camp ticket via group portal
2. During checkout, option to "Load Virtual Card for Camper" appears
3. Parent enters amount ($50, $100, $200, etc.)
4. Parent provides camper details (name, DOB)
5. System creates virtual card tied to that ticket/camper
6. Camper receives card details via email/app
7. Camper uses card at camp merchants
8. Parents can view spending in real-time
9. Card expires after event end date

**Benefits**:
- Parents control exactly how much camper can spend
- No cash needed at camp
- Real-time spending visibility
- Automatic expiration prevents misuse

### Use Case 2: Church-Funded Leader Cards
**Scenario**: Church allocates $500 to youth leader for group expenses.

**Flow**:
1. Organization creates group and allocates tickets
2. In Groups module, add "Issue Card to Coordinator" option
3. Church admin enters allocation amount and spending controls
4. System creates virtual card for the coordinator
5. Coordinator receives card details
6. Coordinator uses card for approved purchases (gas, food, supplies)
7. Church views all transactions in dashboard
8. Automatic spending limits and category restrictions

**Benefits**:
- Better expense tracking than reimbursements
- Spending controls (max per transaction, merchant categories)
- Real-time visibility
- No personal credit cards required

### Use Case 3: Group Fundraiser Cards
**Scenario**: Youth group raises money, church loads it onto cards for mission trip.

**Flow**:
1. Group raises $5,000 for mission trip
2. Church loads funds onto multiple leader cards
3. Cards have spending limits by category (food, lodging, gas)
4. Leaders use cards during trip
5. All spending tracked in real-time
6. Funds automatically reconciled after trip

## 🏗️ Technical Architecture

### Database Schema Extensions

```sql
-- ============================================================================
-- Virtual Cards Table
-- ============================================================================
CREATE TABLE group_virtual_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  allocation_id UUID REFERENCES group_ticket_allocations(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL, -- For camper cards
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Card type
  card_type TEXT NOT NULL CHECK (card_type IN ('camper', 'coordinator', 'leader', 'general')),

  -- Stripe Issuing IDs
  stripe_cardholder_id TEXT NOT NULL,
  stripe_card_id TEXT NOT NULL,
  stripe_financial_account_id TEXT, -- If using Treasury

  -- Cardholder details
  cardholder_name TEXT NOT NULL,
  cardholder_email TEXT,
  cardholder_phone TEXT,
  cardholder_dob DATE, -- Required for individual cardholders

  -- Card details (encrypted/sensitive)
  card_number_last4 TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  card_status TEXT NOT NULL DEFAULT 'active' CHECK (card_status IN ('active', 'inactive', 'cancelled', 'expired')),

  -- Financial tracking
  initial_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Spending controls
  spending_limit_amount DECIMAL(10,2),
  spending_limit_interval TEXT CHECK (spending_limit_interval IN ('per_authorization', 'daily', 'weekly', 'monthly')),
  allowed_merchant_categories TEXT[], -- e.g., ['gas_stations', 'restaurants']
  blocked_merchant_categories TEXT[],
  allowed_countries TEXT[] DEFAULT ARRAY['US'],

  -- Lifecycle
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  issued_by UUID REFERENCES users(id),

  -- Metadata
  purpose TEXT, -- "Summer Camp 2025", "Mission Trip Expenses", etc.
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_virtual_cards_group ON group_virtual_cards(group_id);
CREATE INDEX idx_virtual_cards_ticket ON group_virtual_cards(ticket_id);
CREATE INDEX idx_virtual_cards_stripe_card ON group_virtual_cards(stripe_card_id);
CREATE INDEX idx_virtual_cards_status ON group_virtual_cards(card_status);
CREATE INDEX idx_virtual_cards_cardholder ON group_virtual_cards(stripe_cardholder_id);

COMMENT ON TABLE group_virtual_cards IS
'Virtual prepaid cards issued to group members and coordinators via Stripe Issuing';

-- ============================================================================
-- Card Transactions Table (synced from Stripe)
-- ============================================================================
CREATE TABLE group_card_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES group_virtual_cards(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- Stripe data
  stripe_authorization_id TEXT,
  stripe_transaction_id TEXT,

  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  merchant_name TEXT,
  merchant_category TEXT,
  merchant_city TEXT,
  merchant_country TEXT,

  -- Status
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('authorization', 'capture', 'refund', 'decline')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'reversed')),
  decline_reason TEXT,

  -- Timestamps
  authorized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_card_transactions_card ON group_card_transactions(card_id);
CREATE INDEX idx_card_transactions_group ON group_card_transactions(group_id);
CREATE INDEX idx_card_transactions_stripe_auth ON group_card_transactions(stripe_authorization_id);
CREATE INDEX idx_card_transactions_created_at ON group_card_transactions(created_at DESC);

COMMENT ON TABLE group_card_transactions IS
'Transaction history for virtual cards, synced from Stripe Issuing webhooks';

-- ============================================================================
-- Card Load History (funding events)
-- ============================================================================
CREATE TABLE group_card_loads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES group_virtual_cards(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  loaded_by UUID REFERENCES users(id),
  payment_intent_id TEXT, -- Stripe PaymentIntent if parent funded
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_card_loads_card ON group_card_loads(card_id);
CREATE INDEX idx_card_loads_group ON group_card_loads(group_id);

COMMENT ON TABLE group_card_loads IS
'History of funds loaded onto virtual cards';
```

### API Endpoints (Edge Functions)

#### 1. `issue-virtual-card`
Creates a new virtual card for a group member or coordinator.

**Request**:
```typescript
{
  groupId: string;
  cardType: 'camper' | 'coordinator' | 'leader' | 'general';

  // Cardholder details
  cardholderName: string;
  cardholderEmail: string;
  cardholderPhone?: string;
  cardholderDob?: string; // YYYY-MM-DD, required for camper cards

  // Financial
  initialBalance: number; // Amount to load (in cents)

  // Spending controls
  spendingLimitAmount?: number;
  spendingLimitInterval?: 'per_authorization' | 'daily' | 'weekly' | 'monthly';
  allowedCategories?: string[]; // e.g., ['restaurants', 'gas_stations']
  blockedCategories?: string[];

  // Context
  ticketId?: string; // For camper cards
  orderId?: string;
  allocationId?: string;
  purpose?: string;
  expiresAt?: string; // ISO date

  // Payment source for initial load
  paymentMethodId?: string; // If parent is funding via Stripe
}
```

**Response**:
```typescript
{
  success: true;
  card: {
    id: string;
    cardNumberLast4: string;
    expiryMonth: number;
    expiryYear: number;
    initialBalance: number;
    cardStatus: 'active';
  };
  cardholderEmail: string; // Confirmation email sent
}
```

**Stripe API Calls**:
```typescript
// 1. Create Cardholder
const cardholder = await stripe.issuing.cardholders.create({
  name: cardholderName,
  email: cardholderEmail,
  phone_number: cardholderPhone,
  type: 'individual',
  individual: {
    first_name: firstName,
    last_name: lastName,
    dob: {
      day: dobDay,
      month: dobMonth,
      year: dobYear
    }
  },
  billing: {
    address: {
      line1: groupAddress, // From group record
      city: groupCity,
      state: groupState,
      postal_code: groupZip,
      country: 'US'
    }
  },
  metadata: {
    group_id: groupId,
    organization_id: organizationId,
    card_type: cardType
  }
});

// 2. Create Virtual Card
const card = await stripe.issuing.cards.create({
  cardholder: cardholder.id,
  currency: 'usd',
  type: 'virtual',
  status: 'active',
  spending_controls: {
    spending_limits: [{
      amount: spendingLimitAmount,
      interval: spendingLimitInterval
    }],
    allowed_categories: allowedCategories,
    blocked_categories: blockedCategories
  },
  metadata: {
    group_id: groupId,
    card_type: cardType,
    ticket_id: ticketId,
    purpose: purpose
  }
});

// 3. Fund the Card (if using Treasury/Financial Accounts)
// Load initial balance via transfer or payment intent
const transfer = await stripe.transfers.create({
  amount: initialBalance,
  currency: 'usd',
  destination: financialAccountId,
  transfer_group: `group_${groupId}`
});
```

#### 2. `load-virtual-card`
Adds funds to an existing card.

**Request**:
```typescript
{
  cardId: string;
  amount: number; // In cents
  paymentMethodId?: string; // If parent is adding funds
  notes?: string;
}
```

#### 3. `update-card-controls`
Updates spending controls on a card.

**Request**:
```typescript
{
  cardId: string;
  spendingLimitAmount?: number;
  spendingLimitInterval?: string;
  allowedCategories?: string[];
  blockedCategories?: string[];
}
```

#### 4. `cancel-virtual-card`
Cancels a card and returns remaining balance.

**Request**:
```typescript
{
  cardId: string;
  reason: string;
  refundBalanceTo?: string; // Email or payment method
}
```

#### 5. `stripe-issuing-webhook`
Handles Stripe Issuing webhooks for transaction sync.

**Events to Handle**:
- `issuing_authorization.created` - Real-time authorization attempt
- `issuing_authorization.updated` - Authorization approved/declined
- `issuing_transaction.created` - Transaction posted
- `issuing_transaction.updated` - Transaction updated

### Frontend Components

#### 1. `IssueVirtualCardDialog.tsx`
Modal for issuing new cards with form for cardholder details and spending controls.

```typescript
<IssueVirtualCardDialog
  groupId={groupId}
  cardType="camper" // or 'coordinator', 'leader'
  context={{
    ticketId?: string;
    orderId?: string;
  }}
  onSuccess={(card) => {
    toast.success(`Card issued! Last 4 digits: ${card.last4}`);
    refreshCards();
  }}
/>
```

#### 2. `VirtualCardsManagement.tsx`
Table view of all issued cards with balance, status, and actions.

Features:
- Filter by card type, status, group
- Search by cardholder name
- View transaction history per card
- Load funds, update controls, cancel card
- Export transaction data

#### 3. `CardTransactionHistory.tsx`
Detailed transaction view for a specific card.

Features:
- Merchant name, amount, date, status
- Decline reasons if applicable
- Real-time updates via polling or websockets
- Export to CSV

#### 4. Checkout Integration
Add "Load Virtual Card" option during ticket purchase flow.

```typescript
// In TicketWidget.tsx after ticket selection
{isGroupPurchase && ticketType.includes('camper') && (
  <div className="mt-4 p-4 border rounded-lg bg-blue-50">
    <h3 className="font-semibold">Add Spending Money for Camper</h3>
    <p className="text-sm text-gray-600">
      Load a virtual card your camper can use at camp
    </p>
    <div className="mt-3 space-y-3">
      <Label>Amount to Load</Label>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setCardAmount(50)}>$50</Button>
        <Button variant="outline" onClick={() => setCardAmount(100)}>$100</Button>
        <Button variant="outline" onClick={() => setCardAmount(150)}>$150</Button>
        <Input
          type="number"
          placeholder="Custom amount"
          value={customCardAmount}
          onChange={(e) => setCustomCardAmount(e.target.value)}
        />
      </div>
      <Label>Cardholder Information</Label>
      <Input placeholder="Camper Full Name" />
      <Input type="date" placeholder="Date of Birth" />
      <Checkbox>
        Send card details to camper's email
      </Checkbox>
    </div>
  </div>
)}
```

## 💰 Cost Analysis

### Stripe Issuing Pricing (US)
- **Virtual Card Creation**: $0.10 per card
- **Authorization**: $0.02 per authorization attempt
- **Monthly Active Card**: No fee if card is used
- **Interchange**: Stripe earns interchange (church doesn't pay extra)

### Example Costs

**Scenario 1: 100 Camper Cards**
- 100 cards × $0.10 = **$10.00** (one-time)
- Avg 10 transactions per camper = 1,000 authorizations
- 1,000 × $0.02 = **$20.00**
- **Total**: $30.00 for 100 campers

**Scenario 2: 10 Leader Cards (ongoing)**
- 10 cards × $0.10 = **$1.00** (one-time)
- Avg 50 transactions per leader/month = 500 authorizations
- 500 × $0.02 = **$10.00/month**
- **Total**: $11.00 first month, $10/month ongoing

**Revenue Opportunity**:
- Charge $5 "convenience fee" for card issuance
- 100 campers × $5 = $500 revenue
- Cost: $30
- **Profit**: $470

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic card issuance for coordinators

- [ ] Set up Stripe Issuing account (requires application)
- [ ] Create database tables (virtual_cards, transactions, loads)
- [ ] Build `issue-virtual-card` edge function
- [ ] Create `IssueVirtualCardDialog` component
- [ ] Add "Issue Card" button to GroupAllocations
- [ ] Test card creation and basic spending

**Deliverables**:
- Admin can issue virtual card to coordinator
- Card displays in dashboard with last 4 digits
- Basic transaction sync working

### Phase 2: Transaction Tracking (Week 3)
**Goal**: Real-time transaction monitoring

- [ ] Build webhook handler for Stripe Issuing events
- [ ] Create `CardTransactionHistory` component
- [ ] Implement real-time balance updates
- [ ] Add transaction filtering and search
- [ ] Build export functionality

**Deliverables**:
- Transaction history visible in UI
- Real-time balance updates
- CSV export working

### Phase 3: Checkout Integration (Week 4)
**Goal**: Parents can load cards during ticket purchase

- [ ] Add "Load Virtual Card" option to TicketWidget
- [ ] Integrate card issuance into payment flow
- [ ] Handle payment for initial card load
- [ ] Send card details via email to camper
- [ ] Link card to ticket record

**Deliverables**:
- Parent can add card during checkout
- Card funded from same payment
- Camper receives card details

### Phase 4: Spending Controls (Week 5)
**Goal**: Advanced controls and limits

- [ ] Build spending controls UI
- [ ] Implement category restrictions
- [ ] Add per-transaction limits
- [ ] Create spending alerts
- [ ] Build reload functionality

**Deliverables**:
- Admin can set merchant category restrictions
- Daily/weekly spending limits enforced
- Parents can reload cards

### Phase 5: Reporting & Analytics (Week 6)
**Goal**: Comprehensive reporting

- [ ] Build card spending dashboard
- [ ] Create group spending reports
- [ ] Add budget vs actual tracking
- [ ] Implement spending alerts
- [ ] Create reconciliation tools

**Deliverables**:
- Visual spending analytics
- Budget tracking
- Automated reports

## 🚀 Getting Started (MVP)

### Minimum Viable Product (Week 1)
Focus on simplest use case: Issue coordinator cards manually.

**Scope**:
1. Database tables (virtual_cards only)
2. `issue-virtual-card` edge function (basic version)
3. Simple card list in GroupAllocations
4. Manual card issuance by admin
5. View card details (last 4, balance, status)

**What to Skip**:
- Checkout integration (do manual loads first)
- Complex spending controls (use defaults)
- Real-time transaction sync (query Stripe API on-demand)
- Parent-facing features

**Timeline**: 2-3 days for working prototype

## 🔒 Security & Compliance

### PCI-DSS Compliance
- **Low risk**: Virtual cards only (not handling physical cards)
- Card details stored/transmitted by Stripe (not your servers)
- You're only storing: `last4`, `exp_month`, `exp_year`, Stripe IDs
- Full card numbers only shown via Stripe Elements (iframe)

### Data Protection
- Never log full card numbers
- Use Stripe's card retrieval API (time-limited tokens)
- Encrypt sensitive fields in database
- Implement role-based access (only org admins see cards)

### Regulatory Requirements
- Cardholder acceptance of terms (required by banking partners)
- Record IP address and timestamp of acceptance
- Store in metadata: `terms_accepted_at`, `terms_accepted_ip`

## 📖 User Documentation

### For Church Admins
**Issuing Leader Cards**:
1. Go to Groups → Select Group → Virtual Cards tab
2. Click "Issue New Card"
3. Select "Leader Card"
4. Enter coordinator name and email
5. Set spending limit (e.g., $500/month)
6. Optional: Restrict to specific categories (gas, restaurants)
7. Click "Issue Card"
8. Coordinator receives email with card details

### For Parents
**Loading Camper Cards**:
1. Purchase camp ticket as normal
2. On checkout page, check "Add Spending Money"
3. Select amount ($50, $100, $150, or custom)
4. Enter camper's name and date of birth
5. Complete payment (ticket + card load combined)
6. Camper receives card details via email

**Viewing Camper Spending**:
1. Login to parent portal
2. Navigate to My Tickets → View Details
3. Click "View Card Transactions"
4. See real-time spending history

### For Coordinators/Leaders
**Using Leader Cards**:
1. Receive email with card details
2. Add to Apple Pay / Google Pay (if supported)
3. Use at approved merchants
4. Check balance anytime in coordinator portal

## ❓ FAQs

**Q: Do we need a separate bank account for Stripe Issuing?**
A: No, it uses your existing Stripe balance. However, Stripe Treasury (optional) provides dedicated financial accounts for better fund isolation.

**Q: Can cards be used internationally?**
A: Yes, but you control which countries via spending controls. For camps, restrict to US only.

**Q: What happens to unused funds after an event?**
A: Set expiration date on cards. After expiration, funds return to your Stripe balance. Can also offer refunds to parents.

**Q: Can we charge a fee for card issuance?**
A: Yes! Many orgs charge $3-5 convenience fee, which covers Stripe costs and provides revenue.

**Q: Are there minimum transaction amounts?**
A: Stripe Issuing has no minimums. Can load as little as $5.

**Q: Can campers use cards for cash withdrawals?**
A: By default, yes. You can disable ATM access in spending controls.

## 🎯 Success Metrics

### Key Performance Indicators
- **Card Issuance Rate**: % of ticket purchases that add cards
- **Average Card Load**: Typical amount parents load
- **Transaction Volume**: Total spending through cards
- **Cost Recovery**: Fees collected vs Stripe costs
- **Parent Satisfaction**: Survey ratings on convenience

### Target Goals (Year 1)
- Issue 500+ camper cards
- $50,000+ in card-funded spending
- 90%+ parent satisfaction
- 50%+ attach rate (parents adding cards to purchases)

## 🚧 Technical Challenges

### Challenge 1: Fund Isolation
**Problem**: How to separate church funds from parent-loaded funds?

**Solutions**:
- Option A: Stripe Treasury - dedicated financial accounts per group
- Option B: Database tracking - store source of funds in metadata
- Option C: Separate Stripe accounts per organization (complex)

**Recommendation**: Start with Option B (simple), migrate to A if needed.

### Challenge 2: Refunds
**Problem**: Parent wants refund after loading card.

**Solutions**:
- Policy: No refunds after 24 hours
- Technical: Cancel card, issue Stripe refund to original payment method
- Track: Log all refunds in group_card_loads table

### Challenge 3: Disputes
**Problem**: Parent disputes card charge.

**Solutions**:
- Clear terms during checkout (parent authorizes charge)
- Transaction history as evidence
- Stripe Issuing handles chargeback process
- Insurance: Stripe covers fraudulent transactions

## 🔄 Alternative Approaches

### Option 1: Pre-loaded Bracelets/RFID (Non-Stripe)
Use physical RFID bracelets with value stored locally.

**Pros**: Works offline, no transaction fees
**Cons**: Requires hardware, custom POS system, no online use

### Option 2: Mobile Wallet App (Custom)
Build app with QR codes for payments.

**Pros**: Full control, lower fees
**Cons**: High development cost, merchant adoption required

### Option 3: Gift Cards (Existing)
Use Stripe gift cards or existing gift card providers.

**Pros**: Simple integration
**Cons**: Limited tracking, no spending controls, higher fees

**Recommendation**: Stripe Issuing is best balance of features, cost, and development time.

## 📚 Resources

- [Stripe Issuing Documentation](https://stripe.com/docs/issuing)
- [Stripe Issuing API Reference](https://stripe.com/docs/api/issuing)
- [Spending Controls Guide](https://stripe.com/docs/issuing/controls/spending-controls)
- [Treasury + Issuing Guide](https://stripe.com/docs/treasury/account-management/issuing-cards)
- [Issuing Webhooks](https://stripe.com/docs/issuing/webhooks)

---

**Next Steps**:
1. Review this document with stakeholders
2. Apply for Stripe Issuing (1-2 week approval process)
3. Build Phase 1 MVP (2-3 days)
4. Test with pilot group
5. Iterate based on feedback
