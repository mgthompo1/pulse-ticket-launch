# ✅ Sentry Setup Complete!

Sentry error monitoring is now fully configured and working for TicketFlo.

## What's Configured

- **Sentry Project**: Active and receiving events
- **DSN**: Configured in `.env`
- **Environment**: Production-only (disabled in development)
- **Error Boundary**: Catches React crashes
- **Session Replay**: 100% on errors, 10% normal sessions
- **Performance Monitoring**: 10% of transactions tracked

## Test Results

✅ Successfully captured test error
✅ UI interactions tracked
✅ Console breadcrumbs logged
✅ Error appears in Sentry dashboard

## Next Steps in Sentry Dashboard

### 1. Set Up Critical Alerts (5 minutes)

Go to: **Settings** → **Alerts** → **Create Alert**

#### Alert #1: Payment Errors
```
Name: Critical Payment Errors
When: An event is captured
Conditions:
  - event.level equals "error" OR "critical"
  - event.tags.category contains "payment"
Then: Send notification via Email
Action Interval: Every time
```

#### Alert #2: High Error Rate
```
Name: High Error Rate Alert
When: An event is captured
Conditions:
  - More than 10 errors in 5 minutes
Then: Send notification via Email
Action Interval: Every 30 minutes
```

#### Alert #3: Error Boundary Crashes
```
Name: React App Crashes
When: An event is captured
Conditions:
  - event.exception.type contains "Error"
  - User count affected > 5 in last hour
Then: Send notification via Email
Action Interval: Every time
```

### 2. Configure Slack Integration (Optional - 3 minutes)

1. Go to **Settings** → **Integrations**
2. Find **Slack** → Click **"Install"**
3. Authorize Sentry in your Slack workspace
4. Choose channel: `#alerts` or `#engineering`
5. Configure which alerts go to Slack:
   - Critical errors → Slack
   - Payment failures → Slack
   - High error rates → Slack

### 3. Set Up Issue Ownership (Optional - 2 minutes)

Go to: **Settings** → **Ownership Rules**

Add rules to route errors to the right people:
```
# Payment errors
*payment* backend-team@ticketflo.org

# Frontend errors
*react* frontend-team@ticketflo.org

# Webhook errors
*webhook* platform-team@ticketflo.org
```

### 4. Create Saved Searches (2 minutes)

Go to: **Issues** → **Custom Search** → Save

#### Search 1: Unresolved Payment Errors
```
is:unresolved level:error event.tags.category:payment
```

#### Search 2: Critical Errors (Last 24h)
```
is:unresolved level:critical age:-24h
```

#### Search 3: High Frequency Errors
```
is:unresolved timesSeen:>10
```

### 5. Configure Performance Monitoring (Optional)

Go to: **Performance** → **Settings**

- Transaction Sample Rate: 0.1 (10%) ✅ Already set
- Profile Sample Rate: 0.1 (10%)
- Enable distributed tracing: Yes

This will help you identify:
- Slow API calls
- Database query performance
- Page load times
- Payment processing bottlenecks

## How Errors Are Captured

### Frontend Errors

Errors are automatically captured when:
1. **React crashes** → Error boundary catches and reports
2. **Manual error capture** → Using `captureError()` helper
3. **Unhandled promise rejections** → Sentry catches automatically
4. **Console errors** → Tracked as breadcrumbs

### Backend Errors (Edge Functions)

To capture errors from edge functions, use the `log-error` function:

```typescript
// In any edge function
try {
  // Your code
} catch (error) {
  // Log to database for analysis
  await fetch('https://your-project.supabase.co/functions/v1/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: {
        message: error.message,
        stack: error.stack,
        severity: 'error'
      },
      context: {
        function_name: 'create-payment-intent',
        user_id: userId,
        organization_id: orgId
      }
    })
  });
}
```

## Using Sentry in Your Code

### Basic Error Capture
```typescript
import * as Sentry from '@sentry/react';

try {
  // risky operation
} catch (error) {
  Sentry.captureException(error);
}
```

### Error with Context
```typescript
import { captureError, addBreadcrumb } from '@/lib/sentry';

// Track user action
addBreadcrumb('payment', 'User clicked Pay Now', {
  orderId: '123',
  amount: 99.99
});

// Capture error with tags and context
try {
  await processPayment();
} catch (error) {
  captureError(error, {
    tags: {
      category: 'payment',
      payment_type: 'stripe',
      organization_id: orgId
    },
    extra: {
      orderId: orderId,
      amount: totalAmount,
      currency: 'USD'
    },
    level: 'critical'
  });
}
```

### Set User Context
```typescript
import { setUserContext, clearUserContext } from '@/lib/sentry';

// On login
setUserContext(user.id, user.organizationId);

// On logout
clearUserContext();
```

## Monitoring Your Errors

### Daily Checks (2 minutes)
1. Go to https://sentry.io
2. Check **Issues** → look for new critical errors
3. Review **Performance** → check for slow transactions
4. Look at **Releases** → see error rates by version

### Weekly Reviews (10 minutes)
1. Review top 10 most frequent errors
2. Mark resolved errors as "Resolved"
3. Create tasks for recurring issues
4. Check error trends (going up or down?)
5. Review alerts configuration

### Monthly Reviews (30 minutes)
1. Analyze error patterns by:
   - Organization
   - Event type
   - Payment method
   - User agent/browser
2. Identify root causes
3. Plan fixes for top issues
4. Update alert thresholds if needed

## Production Deployment

When you deploy to production, Sentry will automatically:
- ✅ Start capturing errors (enabled in production mode)
- ✅ Track performance metrics
- ✅ Record session replays on errors
- ✅ Send alerts based on your configuration

Make sure `.env.production` includes:
```bash
VITE_SENTRY_DSN="https://8b6444605dd118830501da5bc91a6760@o4510213626134528.ingest.us.sentry.io/4510213641273344"
VITE_APP_VERSION="1.0.0"
```

## Common Issues and Solutions

### Issue: Not seeing errors in Sentry
**Solution**:
- Check `import.meta.env.MODE` - must be 'production'
- Verify DSN is correct in `.env`
- Check browser console for Sentry initialization message

### Issue: Too many errors
**Solution**:
- Adjust sample rates in `src/lib/sentry.ts`
- Add filters in Sentry dashboard to ignore known issues
- Use `beforeSend()` to filter out non-critical errors

### Issue: Sensitive data in errors
**Solution**:
- Our `beforeSend()` already filters email and IP
- Add more filters if needed
- Use Sentry's "Data Scrubbing" settings

## Support Resources

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/react/
- **React Integration**: https://docs.sentry.io/platforms/javascript/guides/react/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/
- **Session Replay**: https://docs.sentry.io/product/session-replay/

## Current Configuration Summary

| Setting | Value | Status |
|---------|-------|--------|
| Sentry DSN | Configured | ✅ |
| Error Boundary | Active | ✅ |
| Production Only | Yes | ✅ |
| Traces Sample Rate | 10% | ✅ |
| Replays (Normal) | 10% | ✅ |
| Replays (Errors) | 100% | ✅ |
| Sensitive Data Filtering | Enabled | ✅ |
| Release Tracking | Enabled | ✅ |

---

**Setup Date**: October 19, 2025
**Status**: ✅ Production Ready
**Next Action**: Set up alerts in Sentry dashboard (5 minutes)
