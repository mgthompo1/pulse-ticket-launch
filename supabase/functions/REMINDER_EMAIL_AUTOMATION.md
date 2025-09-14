# Reminder Email Automation System

This document describes the automated reminder email campaign system for the Pulse Ticket Launch platform.

## Overview

The reminder email system consists of two main Edge Functions that work together to automatically send customized reminder emails to event attendees:

1. **`reminder-campaign-scheduler`** - Schedules campaigns and triggers sending
2. **`process-reminder-campaigns`** - Processes and sends the actual emails

## Architecture

### Database Tables

- `reminder_email_campaigns` - Campaign definitions and settings
- `reminder_email_recipients` - Individual email delivery tracking
- `reminder_email_jobs` - Scheduled job tracking
- `reminder_email_analytics` - Performance metrics

### Edge Functions

#### reminder-campaign-scheduler
- **Purpose**: Runs periodically to schedule new campaigns and trigger ready campaigns
- **Trigger**: Cron job or manual invocation
- **Frequency**: Recommended every 15 minutes
- **Actions**:
  - Finds draft campaigns that need scheduling
  - Calculates send times based on campaign settings
  - Updates campaigns to "scheduled" status
  - Triggers processor for campaigns ready to send

#### process-reminder-campaigns
- **Purpose**: Processes scheduled campaigns and sends emails
- **Trigger**: Called by scheduler or manual invocation
- **Actions**:
  - Finds campaigns ready to send
  - Generates recipient lists from order data
  - Renders personalized email templates
  - Sends emails via Resend
  - Tracks delivery status and analytics

## Campaign Types

### Timing Options
- **Days Before**: Send X days before event (e.g., "7 days before")
- **Hours Before**: Send X hours before event (e.g., "24 hours before")
- **Specific DateTime**: Send at exact date/time

### Recipient Types
- **All Attendees**: Everyone with completed orders
- **Ticket Holders Only**: Only orders with actual tickets (excludes merchandise-only)
- **Custom Segment**: Apply custom filters (future enhancement)

## Email Template System

### Personalization Variables
The system supports numerous personalization variables:
- `@FirstName`, `@LastName`, `@FullName`
- `@EventName`, `@EventDate`, `@EventTime`, `@EventVenue`
- `@DaysUntilEvent`, `@HoursUntilEvent`, `@EventCountdown`
- `@OrderNumber`, `@TotalAmount`, `@TicketCount`
- `@OrganizerName`, `@ContactEmail`
- And many more...

### Block Types
Reminder emails support specialized blocks:
- **Event Countdown**: Dynamic countdown with urgency styling
- **Attendance Info**: Ticket counts and types
- **Venue Directions**: Address, map links, parking info
- **Check-in Information**: Process steps and instructions
- **Weather Info**: Weather forecasts and recommendations
- **Recommended Items**: Categorized what to bring/wear/avoid
- **Important Updates**: Dynamic updates list

## Setup & Deployment

### Environment Variables
```bash
RESEND_API_KEY=your_resend_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Cron Job Setup
To fully automate the system, set up a cron job to call the scheduler:

```bash
# Run every 15 minutes
*/15 * * * * curl -X POST "https://your-project.supabase.co/functions/v1/reminder-campaign-scheduler" -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Manual Triggers
You can also trigger the functions manually:

```bash
# Schedule campaigns
curl -X POST "https://your-project.supabase.co/functions/v1/reminder-campaign-scheduler" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Process campaigns
curl -X POST "https://your-project.supabase.co/functions/v1/process-reminder-campaigns" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Monitoring & Analytics

### Campaign Status Flow
1. **Draft** → **Scheduled** → **Sending** → **Sent**
2. Alternative paths: **Paused**, **Cancelled**, **Failed**

### Analytics Tracking
- Email delivery rates
- Open rates (when available)
- Click rates (when available)
- Bounce tracking
- Unsubscribe handling

### Logging
Both functions provide detailed logging for monitoring:
- Campaign processing steps
- Email send attempts
- Error handling and recovery
- Performance metrics

## Error Handling

The system includes comprehensive error handling:
- **Retry Logic**: Failed emails can be retried
- **Graceful Degradation**: System continues if individual emails fail
- **Status Tracking**: All failures are logged with reasons
- **Recovery**: Manual intervention possible for stuck campaigns

## Security

- **RLS Policies**: Row-level security ensures organizations only access their campaigns
- **Input Validation**: All inputs are validated and sanitized
- **Email Limits**: Rate limiting to prevent abuse
- **Audit Trail**: All actions are logged for accountability

## Usage

1. **Create Campaign**: Use the UI to design campaign with template builder
2. **Set Schedule**: Configure timing (days/hours before or specific time)
3. **Save as Draft**: Campaign enters "draft" status
4. **Automatic Scheduling**: Scheduler moves to "scheduled" when ready
5. **Automatic Sending**: Processor sends emails at scheduled time
6. **Monitor Results**: View analytics in the UI

The system is fully automated once campaigns are created - no manual intervention required for sending.