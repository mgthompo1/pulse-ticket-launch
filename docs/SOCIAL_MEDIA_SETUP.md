# Social Media Integration Setup Guide

This guide will help you set up LinkedIn and Facebook OAuth integrations for your event management platform.

## Prerequisites

- Supabase project with Edge Functions enabled
- LinkedIn Developer Account
- Facebook Developer Account
- Domain with HTTPS (required for OAuth)

## LinkedIn Setup

### 1. Create LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click "Create App"
3. Fill in the app details:
   - App name: Your app name
   - LinkedIn Page: Your company page
   - App Logo: Your app logo
4. Submit for review

### 2. Configure OAuth Settings

1. In your LinkedIn app, go to "Auth" tab
2. Add OAuth 2.0 redirect URLs:
   ```
   https://yourdomain.com/auth/linkedin/callback
   ```
3. Request these scopes:
   - `r_liteprofile` - Read basic profile
   - `w_member_social` - Write posts as member
   - `r_organization_social` - Read organization posts
   - `w_organization_social` - Write organization posts

### 3. Get Credentials

1. Copy your **Client ID** and **Client Secret**
2. Add them to your Supabase environment variables

## Facebook Setup

### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App"
3. Choose "Business" as the app type
4. Fill in app details and submit

### 2. Configure OAuth Settings

1. In your Facebook app, go to "Facebook Login" > "Settings"
2. Add OAuth redirect URIs:
   ```
   https://yourdomain.com/auth/facebook/callback
   ```
3. Request these permissions:
   - `pages_manage_posts` - Manage page posts
   - `pages_read_engagement` - Read page insights
   - `pages_show_list` - Access page list

### 3. Submit for Review

Facebook requires app review for production use. For development:
1. Add yourself as a test user
2. Test the integration thoroughly
3. Submit for review when ready for production

### 4. Get Credentials

1. Copy your **App ID** and **App Secret**
2. Add them to your Supabase environment variables

## Environment Variables

Add these to your Supabase project:

```bash
# LinkedIn
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Facebook
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

## Database Setup

Run the migration file to create the necessary tables:

```bash
supabase db push
```

This will create:
- `social_connections` - Stores OAuth tokens and account info
- `scheduled_posts` - Manages post scheduling
- `social_post_analytics` - Tracks post performance

## Edge Functions

Deploy the Edge Functions:

```bash
supabase functions deploy linkedin-token
supabase functions deploy facebook-token
supabase functions deploy social-media-post
```

## Frontend Routes

Add these routes to your React app:

```tsx
// In your router configuration
<Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
<Route path="/auth/facebook/callback" element={<FacebookCallback />} />
```

## Testing the Integration

### 1. Test Connection Flow

1. Go to Marketing tab > Social Media
2. Click "Connect LinkedIn" or "Connect Facebook"
3. Complete OAuth flow
4. Verify connection status shows "Connected"

### 2. Test Post Scheduling

1. Select an event
2. Go to "Schedule Posts" tab
3. Write content and schedule a post
4. Verify it appears in "Scheduled" tab

### 3. Test Analytics

1. Go to "Analytics" tab
2. Verify metrics are displayed
3. Check platform performance data

## Security Considerations

### 1. Token Storage

- Access tokens are encrypted in the database
- Refresh tokens are stored for automatic renewal
- Tokens expire and require re-authentication

### 2. Rate Limiting

- LinkedIn: 100 requests per day per user
- Facebook: 200 requests per hour per user
- Implement proper error handling for rate limits

### 3. Data Privacy

- Only request necessary permissions
- Store minimal user data
- Implement proper data deletion procedures

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check OAuth redirect URLs in developer consoles
   - Ensure exact match with callback URLs

2. **"Insufficient permissions"**
   - Verify requested scopes are approved
   - Check app review status

3. **"Token expired"**
   - Implement token refresh logic
   - Prompt user to reconnect account

4. **"API rate limit exceeded"**
   - Implement exponential backoff
   - Queue requests for later processing

### Debug Mode

Enable debug logging in Edge Functions:

```typescript
// Add to Edge Functions
console.log('Debug info:', { platform, userId, timestamp })
```

## Production Checklist

- [ ] OAuth apps approved and configured
- [ ] Environment variables set
- [ ] Database tables created
- [ ] Edge Functions deployed
- [ ] Frontend routes configured
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] Analytics tracking enabled
- [ ] Security policies reviewed
- [ ] User documentation created

## Support

For technical support:
1. Check Supabase logs for errors
2. Verify OAuth app configurations
3. Test with minimal permissions first
4. Review platform-specific API documentation

## Additional Features

Consider implementing:
- **Post Templates** - Pre-written post templates for events
- **Bulk Scheduling** - Schedule multiple posts at once
- **Content Calendar** - Visual calendar for post planning
- **Performance Tracking** - Detailed engagement analytics
- **A/B Testing** - Test different post formats
- **Automated Responses** - Reply to comments automatically
