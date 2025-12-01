# Critical Reliability Implementation Plan

This document outlines the implementation plan for the three critical reliability features:
1. Ticket Reservation Timeout System
2. Payment Idempotency Keys
3. Error Monitoring & Logging

## 1. Ticket Reservation Timeout System

### Current State
- ✅ Frontend hook exists (`useTicketReservation.ts`)
- ✅ 15-minute timeout implemented in React
- ❌ No automatic database-level cleanup
- ❌ No scheduled job to release expired reservations
- ❌ Potential for "zombie" reservations if user closes browser

### What Needs to Be Built

#### A. Database Migration for Automatic Cleanup
Create a PostgreSQL function that runs periodically to clean up expired reservations:

```sql
-- Function to clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $$
BEGIN
  -- Delete reservations that are older than 15 minutes and not completed
  DELETE FROM ticket_reservations
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '15 minutes';

  -- Log the cleanup
  RAISE NOTICE 'Cleaned up expired ticket reservations';
END;
$$ LANGUAGE plpgsql;

-- Schedule it to run every 5 minutes using pg_cron
SELECT cron.schedule(
  'cleanup-expired-reservations',
  '*/5 * * * *', -- Every 5 minutes
  'SELECT cleanup_expired_reservations();'
);
```

#### B. Add Reservation Status Tracking
Enhance the reservations table:

```sql
ALTER TABLE ticket_reservations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Create index for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_reservations_expires
ON ticket_reservations(expires_at, status)
WHERE status = 'pending';
```

#### C. Update Frontend to Show Clear Warnings
- Add visual timer countdown in cart
- Show warning when < 2 minutes remaining
- Auto-refresh reservations if user returns before expiry
- Clear messaging when reservations expire

#### D. Add Reservation Extension Option
Allow users to extend their reservation once if needed:

```typescript
const extendReservation = async (reservationId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('extend_reservation', {
    p_reservation_id: reservationId,
    p_additional_minutes: 10
  });
  return !error && data === true;
};
```

### Implementation Steps
1. Create database migration with cleanup function
2. Enable pg_cron extension in Supabase
3. Test cleanup function manually
4. Add visual timer to checkout UI
5. Add reservation extension capability
6. Test full flow with expired reservations

---

## 2. Payment Idempotency Keys

### Current State
- ❌ No idempotency keys in payment intent creation
- ❌ Risk of double-charging if user clicks "Pay" multiple times
- ❌ No deduplication for webhook events
- ❌ Network retry could create duplicate orders

### What Needs to Be Built

#### A. Generate Idempotency Keys
Add to payment flow:

```typescript
// In checkout components
const [idempotencyKey] = useState(() => `${orderId}_${Date.now()}_${Math.random()}`);

// Or use a more structured approach
const generateIdempotencyKey = (orderId: string, attempt: number = 1) => {
  return `order_${orderId}_attempt_${attempt}_${Date.now()}`;
};
```

#### B. Update Stripe Payment Intent Creation
Modify `create-payment-intent` edge function:

```typescript
// In supabase/functions/create-payment-intent/index.ts
const idempotencyKey = req.headers.get('idempotency-key') ||
                       `fallback_${orderId}_${Date.now()}`;

const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(total * 100),
  currency: currency || 'usd',
  // ... other params
}, {
  idempotencyKey: idempotencyKey // Stripe's built-in deduplication
});
```

#### C. Database-Level Idempotency
Store processed payment intents to prevent duplicates:

```sql
CREATE TABLE IF NOT EXISTS payment_intents_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  payment_intent_id VARCHAR(255),
  status VARCHAR(50),
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_idempotency_key ON payment_intents_log(idempotency_key);
```

#### D. Check Before Creating Payment Intent
```typescript
// Check if this idempotency key was already processed
const { data: existing } = await supabase
  .from('payment_intents_log')
  .select('*')
  .eq('idempotency_key', idempotencyKey)
  .single();

if (existing) {
  // Return the existing payment intent instead of creating new one
  return new Response(
    JSON.stringify({
      client_secret: existing.client_secret,
      orderId: existing.order_id,
      cached: true
    }),
    { headers: corsHeaders }
  );
}
```

#### E. Webhook Idempotency
Prevent duplicate webhook processing:

```typescript
// In stripe-webhook function
const eventId = event.id; // Stripe event ID is unique

const { data: processed } = await supabase
  .from('webhook_events_log')
  .select('id')
  .eq('event_id', eventId)
  .single();

if (processed) {
  console.log('Webhook already processed:', eventId);
  return new Response(JSON.stringify({ received: true, cached: true }), {
    status: 200
  });
}

// Mark as processed BEFORE processing
await supabase.from('webhook_events_log').insert({
  event_id: eventId,
  event_type: event.type,
  processed_at: new Date().toISOString()
});
```

### Implementation Steps
1. Create `payment_intents_log` and `webhook_events_log` tables
2. Update `create-payment-intent` to accept and use idempotency keys
3. Update frontend to generate and send idempotency keys
4. Add idempotency check to webhook handler
5. Test with duplicate payment attempts
6. Add monitoring for idempotency key reuse

---

## 3. Error Monitoring & Logging

### Current State
- ✅ Console.log statements exist
- ❌ No centralized error tracking
- ❌ No alerting for critical errors
- ❌ No error aggregation or analysis
- ❌ Difficult to debug production issues

### What Needs to Be Built

#### A. Choose Error Monitoring Service
Options:
1. **Sentry** (Recommended - free tier, great React/TypeScript support)
2. **LogRocket** (Session replay + errors)
3. **Rollbar** (Simple, effective)
4. **Custom solution** (Supabase + edge functions)

**Recommendation: Start with Sentry (free tier)**

#### B. Install and Configure Sentry

```bash
npm install @sentry/react @sentry/tracing
```

```typescript
// src/lib/sentry.ts
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

export const initSentry = () => {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Environment
    environment: import.meta.env.MODE,

    // Release tracking
    release: `ticketflo@${import.meta.env.VITE_APP_VERSION || 'dev'}`,

    // Don't send in development
    enabled: import.meta.env.MODE === 'production',

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive user data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
};
```

```typescript
// src/main.tsx
import { initSentry } from './lib/sentry';

initSentry();

// Wrap app with Sentry error boundary
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
```

#### C. Add Custom Error Context

```typescript
// Track important user actions
Sentry.addBreadcrumb({
  category: 'payment',
  message: 'User initiated payment',
  level: 'info',
  data: {
    orderId,
    amount: total,
  },
});

// Tag errors with important context
Sentry.setTag('event_id', eventId);
Sentry.setTag('organization_id', organizationId);
Sentry.setUser({ id: user.id });
```

#### D. Edge Function Error Logging

```typescript
// Create error logging edge function
// supabase/functions/log-error/index.ts
Deno.serve(async (req) => {
  const { error, context, timestamp } = await req.json();

  // Log to Supabase table
  await supabase.from('error_logs').insert({
    error_message: error.message,
    error_stack: error.stack,
    context: context,
    timestamp: timestamp,
    severity: error.severity || 'error',
    function_name: context.function_name,
  });

  // Also send to Sentry for aggregation
  await fetch('https://sentry.io/api/...', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SENTRY_AUTH_TOKEN}` },
    body: JSON.stringify({
      message: error.message,
      level: error.severity,
      extra: context,
    }),
  });

  return new Response(JSON.stringify({ logged: true }), { status: 200 });
});
```

#### E. Create Error Logs Table

```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,
  severity VARCHAR(20) DEFAULT 'error',
  function_name VARCHAR(100),
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Indexes for querying
CREATE INDEX idx_error_logs_severity ON error_logs(severity, timestamp DESC);
CREATE INDEX idx_error_logs_function ON error_logs(function_name, timestamp DESC);
CREATE INDEX idx_error_logs_unresolved ON error_logs(resolved) WHERE resolved = FALSE;
```

#### F. Critical Error Alerts

Set up alerts in Sentry for:
- Payment failures
- Email delivery failures
- Database connection errors
- Authentication errors
- Webhook processing errors

Configure notifications to Slack/Email for critical errors.

#### G. Custom Error Dashboard

Create a simple dashboard in your org dashboard to view errors:

```typescript
// ErrorMonitoringDashboard component
const ErrorMonitoringDashboard = () => {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const loadErrors = async () => {
      const { data } = await supabase
        .from('error_logs')
        .select('*')
        .eq('resolved', false)
        .order('timestamp', { ascending: false })
        .limit(50);
      setErrors(data);
    };
    loadErrors();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Errors</CardTitle>
      </CardHeader>
      <CardContent>
        {errors.map(error => (
          <div key={error.id} className="border-b pb-2 mb-2">
            <div className="flex justify-between">
              <span className="font-medium">{error.error_message}</span>
              <Badge variant={error.severity === 'critical' ? 'destructive' : 'default'}>
                {error.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {error.function_name} - {new Date(error.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
```

### Implementation Steps
1. Sign up for Sentry (free tier)
2. Install Sentry packages
3. Configure Sentry in frontend
4. Add error boundary components
5. Create error_logs table in database
6. Add error logging to critical edge functions
7. Set up Sentry alerts for critical errors
8. Create simple error dashboard in org portal
9. Test error capture and reporting

---

## Priority & Timeline

### Week 1: Error Monitoring (Foundation)
**Day 1-2**: Set up Sentry
- Install and configure Sentry
- Add error boundaries
- Test error capture

**Day 3-4**: Database Error Logging
- Create error_logs table
- Add logging to edge functions
- Set up basic alerts

**Day 5**: Testing & Monitoring
- Generate test errors
- Verify Sentry capture
- Configure alert thresholds

### Week 2: Payment Idempotency (Critical for Revenue)
**Day 1-2**: Database Schema
- Create payment_intents_log table
- Create webhook_events_log table
- Add indexes

**Day 3-4**: Implementation
- Update create-payment-intent function
- Update stripe-webhook function
- Update frontend to send idempotency keys

**Day 5**: Testing
- Test duplicate payment attempts
- Test webhook deduplication
- Monitor logs for idempotency key reuse

### Week 3: Reservation Timeout (User Experience)
**Day 1-2**: Database Automation
- Create cleanup function
- Enable pg_cron
- Test automatic cleanup

**Day 3-4**: Frontend Enhancements
- Add visual timer to cart
- Add extension capability
- Improve expiry messaging

**Day 5**: Testing & Polish
- Test full reservation lifecycle
- Test edge cases (network failures, etc.)
- Monitor cleanup job execution

---

## Success Metrics

### Ticket Reservation Timeout
- ✅ Zero "zombie" reservations after 20 minutes
- ✅ Cleanup job runs successfully every 5 minutes
- ✅ Users can see clear timer countdown
- ✅ < 1% of reservations expire before payment

### Payment Idempotency
- ✅ Zero duplicate charges
- ✅ 100% of payment intents logged
- ✅ All webhook events deduplicated
- ✅ Idempotency keys reused < 0.1% of time

### Error Monitoring
- ✅ 100% of errors captured in Sentry
- ✅ Critical errors alerted within 1 minute
- ✅ Error resolution time < 4 hours
- ✅ Monthly error rate trending down

---

## Next Steps

**Immediate (Today):**
1. Set up Sentry account
2. Create database tables for error logs
3. Install Sentry packages

**This Week:**
4. Implement error monitoring fully
5. Begin payment idempotency implementation

**Next Week:**
6. Complete payment idempotency
7. Begin reservation timeout automation

Would you like me to start with any specific part of this plan?
