# Groups Email Notifications - Already Configured! ✅

The Groups feature is already integrated with your existing Resend email infrastructure.

## Overview

The Groups feature sends automatic email notifications for:
- **Ticket Purchases** - Notifies group coordinator when a member buys a ticket
- **Low Inventory** - Alerts coordinator when allocation drops to 10% or less
- **Invoice Generated** - Notifies billing contact when a new invoice is created
- **Invoice Due** - Reminds billing contact of upcoming payment (requires scheduled job)
- **Invoice Overdue** - Alerts billing contact of overdue payment (requires scheduled job)

## Already Set Up ✅

Your system already has Resend configured and working for other email functions like:
- `send-verification-email`
- `send-ticket-email-v2`
- `send-receipt-email`
- `send-booking-email`
- `send-organiser-notification`

The Groups notification function uses the **same configuration**, so no additional setup is needed!

## Configuration Used

**Environment Variables (Already Set):**
- ✅ `RESEND_API_KEY` - Your existing Resend API key
- ✅ `RESEND_FROM_EMAIL` - Optional override (defaults to `TicketFlo <hello@ticketflo.org>`)

**From Address:**
- Default: `TicketFlo <hello@ticketflo.org>` (matches your other emails)
- Can override with `RESEND_FROM_EMAIL` environment variable if you want a different sender for group notifications

## Edge Function Deployed ✅

The `send-group-notification` function is already deployed and ready to use!

## Testing Email Delivery

### Option 1: Complete a Test Purchase (Recommended)

1. Create a test group with an allocation
2. Visit the group portal: `http://localhost:8081/group/your-slug`
3. Click "Buy Tickets" and complete a purchase
4. Check your email (group coordinator's email)
5. Check Supabase logs for confirmation

## Monitoring Email Delivery

### Check Supabase Logs

1. Go to **Edge Functions** → **send-group-notification** → **Logs**
2. Look for:
   - ✅ `Email sent successfully` - Emails are working
   - ⚠️ `RESEND_API_KEY not configured` - Need to set secrets
   - ❌ `Resend API error` - Check API key and domain verification

### Check Resend Dashboard

1. Go to **Emails** in Resend dashboard
2. You'll see all sent emails with status:
   - **Delivered** - Email successfully delivered
   - **Bounced** - Invalid email address
   - **Complained** - Marked as spam

### Check Activity Log

All notifications are logged in the `group_activity_log` table:

```sql
SELECT *
FROM group_activity_log
WHERE action LIKE 'notification_sent_%'
ORDER BY created_at DESC
LIMIT 10;
```

## Customizing Email Templates

Email templates are defined in `supabase/functions/send-group-notification/index.ts`.

To customize a template:

1. Find the notification type in the `switch` statement
2. Modify the `htmlBody` variable
3. Deploy the updated function

Example:
```typescript
case "ticket_purchased":
  htmlBody = `
    <div style="font-family: Arial, sans-serif;">
      <h2 style="color: #4CAF50;">New Ticket Purchase! 🎉</h2>
      <p>Great news! A member just purchased tickets.</p>
      <!-- Add your custom HTML here -->
    </div>
  `;
  break;
```

## Troubleshooting

### Emails Not Sending

**Check 1: API Key Set?**
```bash
npx supabase secrets list
# Should show RESEND_API_KEY
```

**Check 2: Domain Verified?**
- Production requires verified domain
- Development can use `onboarding@resend.dev`

**Check 3: Supabase Logs**
```bash
npx supabase functions logs send-group-notification
```

### Emails Going to Spam

1. Verify your domain with SPF, DKIM, and DMARC records
2. Use a professional "From" name and email
3. Keep email content relevant and not overly promotional
4. Test with [Mail Tester](https://www.mail-tester.com/)

### Rate Limits

Resend free tier limits:
- 3,000 emails/month
- 10 emails/second

For higher volume, upgrade your Resend plan.

## Production Checklist

- [x] Resend account created (already done)
- [x] Domain verified in Resend (already done for ticketflo.org)
- [x] `RESEND_API_KEY` secret set in Supabase (already done)
- [x] Edge function deployed (`send-group-notification`)
- [ ] Test group notification email sent and received
- [ ] Email delivery monitored in Resend dashboard
- [ ] SPF/DKIM/DMARC records verified (should already be configured)
- [ ] Optional: Add unsubscribe functionality for group notifications (if required by regulations)

## Next Steps

### Optional: Add Scheduled Invoice Reminders

Currently, `invoice_due` and `invoice_overdue` notifications require manual triggering or a scheduled job.

To automate:

1. Create a Supabase Edge Function cron job
2. Query invoices where `due_date` is approaching or past
3. Call `send-group-notification` for each invoice

See [Supabase Cron Jobs](https://supabase.com/docs/guides/functions/schedule-functions) for details.

### Optional: Add Unsubscribe Links

For compliance with email regulations (CAN-SPAM, GDPR):

1. Add an `email_preferences` table
2. Add unsubscribe links to email templates
3. Check preferences before sending notifications

## Support

- **Resend Docs:** https://resend.com/docs
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Email Deliverability Guide:** https://resend.com/docs/knowledge-base/deliverability

---

**Last Updated:** Phase 4d Complete
**Status:** Production-ready with Resend integration
