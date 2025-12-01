# Custom Verification Email Setup with Resend

This guide explains how to configure TicketFlo to use custom branded verification emails via Resend instead of Supabase's default auth emails.

## What We've Created

A new edge function `send-verification-email` that:
- Sends beautifully formatted, branded verification emails using Resend
- Includes a prominent "Verify Email Address" button
- Lists what users can do after verification
- Matches the visual style of other TicketFlo emails

## Setup Instructions

### 1. Deploy the Edge Function

First, deploy the new verification email function to Supabase:

```bash
supabase functions deploy send-verification-email
```

### 2. Set Up Supabase Auth Hook

You need to configure a Supabase Auth Hook to trigger the custom email function. Here's how:

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb

2. Navigate to **Authentication** → **Hooks** in the left sidebar

3. Click **"Add Hook"** or **"Create Hook"**

4. Configure the hook with these settings:
   - **Hook Name**: `send-verification-email`
   - **Hook Type**: Select **"Send Email"**
   - **Events**: Check **"Signup"** (this triggers on user registration)
   - **Function**: Select `send-verification-email` from the dropdown
   - **Enabled**: Toggle ON

5. Click **"Create Hook"** to save

#### Option B: Via Supabase CLI

Alternatively, you can set up the hook via SQL:

```sql
-- Create the auth hook
CREATE OR REPLACE FUNCTION public.send_custom_verification_email()
RETURNS TRIGGER AS $$
DECLARE
  verification_url TEXT;
BEGIN
  -- Call the edge function
  PERFORM
    net.http_post(
      url := current_setting('app.settings.api_url') || '/functions/v1/send-verification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'token_hash', NEW.confirmation_token,
        'type', 'signup',
        'redirect_to', current_setting('app.settings.site_url') || '/dashboard'
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.confirmation_token IS NOT NULL)
  EXECUTE FUNCTION public.send_custom_verification_email();
```

### 3. Disable Supabase's Default Verification Email

To prevent duplicate emails, disable Supabase's built-in verification emails:

1. Go to **Authentication** → **Email Templates** in the Supabase dashboard

2. Find the **"Confirm signup"** template

3. Either:
   - **Delete the template** (removes all content), OR
   - **Disable auto-sending** by unchecking "Enable email confirmations" in **Authentication** → **Settings**

### 4. Test the Setup

1. Sign up for a new account at `/auth` or your signup page

2. Check the email inbox for the new user

3. You should receive a beautifully formatted email with:
   - TicketFlo branding
   - A purple gradient header
   - A prominent "Verify Email Address" button
   - Information about what's next after verification

### 5. Verify Environment Variables

Make sure these environment variables are set in your Supabase project:

- `RESEND_API_KEY` - Your Resend API key
- `SITE_URL` - Your production URL (e.g., https://ticketflo.org)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

You can check/set these in:
- **Supabase Dashboard**: Settings → API → Service Role Key
- **Edge Functions**: Settings → Edge Functions → Manage Secrets

## Troubleshooting

### Emails Not Sending

1. **Check Edge Function Logs**:
   ```bash
   supabase functions logs send-verification-email
   ```

2. **Verify Resend API Key**:
   - Go to Resend dashboard: https://resend.com/api-keys
   - Make sure the API key has "Sending access" permission
   - Verify it's set in Supabase Edge Functions secrets

3. **Check Auth Hook**:
   - Ensure the hook is **Enabled** in Authentication → Hooks
   - Verify it's attached to the "Signup" event

### Users Not Receiving Emails

1. **Check spam folder** - Custom emails may be filtered

2. **Verify sender domain**:
   - The email is sent from `hello@ticketflo.org`
   - Make sure this domain is verified in Resend

3. **Check Resend logs**:
   - Go to Resend dashboard → Emails
   - Look for delivery status

### Hook Not Triggering

1. **Verify trigger syntax** if using SQL method

2. **Check database permissions**:
   ```sql
   GRANT USAGE ON SCHEMA net TO postgres;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres;
   ```

3. **Test the edge function directly**:
   ```bash
   curl -X POST https://yoxsewbpoqxscsutqlcb.supabase.co/functions/v1/send-verification-email \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","token_hash":"test123","type":"signup"}'
   ```

## Customization

### Change Email Styling

Edit `/supabase/functions/send-verification-email/index.ts`:

- Update the gradient colors in the header
- Modify button styling
- Change the text content
- Add your logo

### Change Sender Address

Update the `from` field in the Resend API call:

```typescript
from: 'Your Name <noreply@yourdomain.com>',
```

Make sure the domain is verified in Resend.

### Add More Information

You can add more details to the email template, such as:
- User's name (pass it in the hook)
- Organization details
- Custom welcome message
- Links to documentation

## Benefits of Custom Verification Emails

✅ **Branded Experience** - Matches your app's design
✅ **Better Deliverability** - Resend's infrastructure
✅ **Tracking** - See open rates and clicks in Resend
✅ **Customization** - Full control over content and styling
✅ **Consistency** - Matches other transactional emails

## Next Steps

- Monitor email delivery in Resend dashboard
- Test with different email providers (Gmail, Outlook, etc.)
- Consider adding email analytics/tracking
- Set up similar custom emails for password reset and other auth flows
