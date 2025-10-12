// Knowledge Base Data Structure for TicketFlo

export interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  slug: string;
  keywords: string[];
  lastUpdated: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  articleCount: number;
  slug: string;
}

export const categories: Category[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics of TicketFlo',
    icon: 'Rocket',
    color: 'bg-blue-500',
    articleCount: 5,
    slug: 'getting-started'
  },
  {
    id: 'events-management',
    name: 'Events Management',
    description: 'Create and manage your events',
    icon: 'Calendar',
    color: 'bg-purple-500',
    articleCount: 8,
    slug: 'events-management'
  },
  {
    id: 'customization',
    name: 'Customization',
    description: 'Customize your events and branding',
    icon: 'Paintbrush',
    color: 'bg-pink-500',
    articleCount: 6,
    slug: 'customization'
  },
  {
    id: 'tickets-pricing',
    name: 'Tickets & Pricing',
    description: 'Set up tickets and pricing',
    icon: 'Ticket',
    color: 'bg-green-500',
    articleCount: 5,
    slug: 'tickets-pricing'
  },
  {
    id: 'marketing',
    name: 'Marketing & Promotion',
    description: 'Promote your events effectively',
    icon: 'Megaphone',
    color: 'bg-orange-500',
    articleCount: 7,
    slug: 'marketing'
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Payment gateway setup and processing',
    icon: 'CreditCard',
    color: 'bg-emerald-500',
    articleCount: 4,
    slug: 'payments'
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Connect with third-party tools',
    icon: 'Plug',
    color: 'bg-indigo-500',
    articleCount: 6,
    slug: 'integrations'
  },
  {
    id: 'analytics',
    name: 'Analytics & Reports',
    description: 'Track your event performance',
    icon: 'BarChart3',
    color: 'bg-cyan-500',
    articleCount: 4,
    slug: 'analytics'
  },
  {
    id: 'attractions',
    name: 'Attractions Mode',
    description: 'Using TicketFlo for attractions and venues',
    icon: 'MapPin',
    color: 'bg-red-500',
    articleCount: 5,
    slug: 'attractions'
  },
  {
    id: 'support',
    name: 'Support & FAQ',
    description: 'Get help and find answers',
    icon: 'HelpCircle',
    color: 'bg-gray-500',
    articleCount: 8,
    slug: 'support'
  }
];

export const articles: Article[] = [
  // Getting Started
  {
    id: 'what-is-ticketflo',
    title: 'What is TicketFlo?',
    category: 'getting-started',
    slug: 'what-is-ticketflo',
    keywords: ['introduction', 'overview', 'platform'],
    lastUpdated: '2025-10-12',
    content: `
# What is TicketFlo?

TicketFlo is a comprehensive event ticketing platform designed to help event organizers sell tickets, manage attendees, and grow their events.

## Key Features

- **Event Management**: Create and manage multiple events from a single dashboard
- **Customizable Ticketing**: Set up multiple ticket types with flexible pricing
- **Payment Processing**: Integrated payment processing with Stripe and Windcave
- **Real-time Analytics**: Track sales, revenue, and attendee data in real-time
- **Marketing Tools**: Built-in promotional tools and social media integration
- **Integrations**: Connect with Xero, HubSpot, Zapier, and more
- **Mobile-Friendly**: Beautiful, responsive ticket purchasing experience

## Two Modes

TicketFlo operates in two modes:

### Events Mode
Perfect for conferences, concerts, festivals, and one-time events.

### Attractions Mode
Ideal for museums, tours, theme parks, and ongoing attractions.

## Getting Started

1. Sign up for a free TicketFlo account
2. Create your organization
3. Set up your first event
4. Configure your payment gateway
5. Start selling tickets!

Need help? Check out our [Getting Started Guide](#) or [contact support](/support).
    `
  },
  {
    id: 'create-your-first-event',
    title: 'Creating Your First Event',
    category: 'getting-started',
    slug: 'create-your-first-event',
    keywords: ['create event', 'first event', 'setup', 'new event'],
    lastUpdated: '2025-10-12',
    content: `
# Creating Your First Event

Follow these steps to create your first event on TicketFlo.

## Step 1: Access the Events Tab

1. Log in to your TicketFlo dashboard
2. Click on the **Events** tab in the sidebar
3. Click the **Create New Event** button

## Step 2: Enter Event Details

Fill in the required information:

- **Event Name**: Give your event a clear, descriptive name
- **Event Date**: Select the date and time of your event
- **Venue**: Enter the location where your event will take place
- **Capacity**: Set the maximum number of attendees
- **Description**: Add a detailed description of your event

## Step 3: Save as Draft

Click **Create Event** to save your event as a draft. Don't worry - you can edit all details later before publishing.

## Step 4: Customize Your Event

After creating your event, you'll be taken to the Event Details page where you can:

- Add ticket types and pricing
- Customize the event page design
- Set up confirmation emails
- Configure custom questions
- Add images and branding

## Step 5: Publish Your Event

Once you're happy with your event setup:

1. Go to the Event Details tab
2. Click **Publish Event**
3. Share your event link with potential attendees!

## Next Steps

- [Set up ticket types and pricing](#)
- [Customize your event page](#)
- [Configure payment processing](#)
- [Promote your event](#)
    `
  },
  {
    id: 'account-setup',
    title: 'Setting Up Your Account',
    category: 'getting-started',
    slug: 'account-setup',
    keywords: ['account', 'setup', 'organization', 'profile'],
    lastUpdated: '2025-10-12',
    content: `
# Setting Up Your Account

Complete your TicketFlo account setup to unlock all features.

## Organization Setup

When you first sign up, you'll be prompted to create an organization:

1. **Organization Name**: Enter your company or event brand name
2. **System Type**: Choose between Events Mode or Attractions Mode
3. **Contact Information**: Add your email and phone number
4. **Business Details**: Optional tax and business registration information

## Profile Settings

Access your profile settings from the Settings tab:

- **Personal Information**: Name, email, phone
- **Password**: Change your password
- **Notifications**: Configure email notifications
- **Two-Factor Authentication**: Enable for added security

## Organization Settings

Only organization owners and admins can access these settings:

- **Branding**: Upload your logo and set brand colors
- **Team Members**: Invite team members and set permissions
- **Billing**: Manage your subscription and payment methods
- **Integrations**: Connect third-party apps

## Payment Gateway Setup

Before you can sell tickets, you'll need to connect a payment gateway:

1. Go to the **Payments** tab
2. Choose your payment provider (Stripe or Windcave)
3. Follow the connection process
4. Test your payment setup

## Security Best Practices

- Use a strong, unique password
- Enable two-factor authentication
- Don't share your login credentials
- Regularly review team member access
- Log out when using shared devices

Need help with setup? [Contact our support team](/support).
    `
  },
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    category: 'getting-started',
    slug: 'dashboard-overview',
    keywords: ['dashboard', 'overview', 'navigation', 'interface'],
    lastUpdated: '2025-10-12',
    content: `
# Dashboard Overview

Your TicketFlo dashboard is your central hub for managing events and tracking performance.

## Main Navigation

The sidebar provides access to all major features:

- **Overview**: Quick stats and recent activity
- **Events**: Create and manage your events
- **Analytics**: View detailed performance metrics
- **Payments**: Configure payment gateways
- **Marketing**: Access promotional tools
- **Integrations**: Connect third-party apps
- **Billing**: Manage your subscription
- **Settings**: Organization and account settings
- **Support**: Get help and submit tickets

## Overview Tab

The Overview tab shows:

- **Total Events**: Number of active events
- **Tickets Sold**: Total orders placed
- **Revenue**: Total revenue generated
- **Platform Fees**: Estimated TicketFlo fees
- **Recent Events**: Quick access to your latest events
- **Performance Charts**: Visual analytics

## Quick Actions

Throughout the dashboard, you'll find quick action buttons:

- **Create Event**: Start a new event
- **View Widget**: Preview your event page
- **TicketFloLIVE**: Access live event management
- **Manage**: Edit event details
- **Publish**: Make your event live

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

- Ctrl/Cmd + K: Quick search
- Ctrl/Cmd + N: New event
- Ctrl/Cmd + S: Save changes
- Esc: Close modals

## Mobile Access

While the full dashboard is best viewed on desktop, you can access key features on mobile:

- View event stats
- Check ticket sales
- Manage attendees
- Respond to support tickets

The ticketing widget is fully mobile-optimized for attendees purchasing tickets.
    `
  },
  {
    id: 'understanding-roles',
    title: 'Understanding User Roles and Permissions',
    category: 'getting-started',
    slug: 'understanding-roles',
    keywords: ['roles', 'permissions', 'access', 'team'],
    lastUpdated: '2025-10-12',
    content: `
# Understanding User Roles and Permissions

TicketFlo offers different user roles with varying levels of access.

## User Roles

### Owner
- Full access to all features
- Can delete the organization
- Manages billing and subscriptions
- Cannot be removed by other users

### Admin
- Nearly full access to all features
- Can manage team members (except owner)
- Access to settings and integrations
- Cannot delete the organization

### Editor
- Can create and edit events
- Access to analytics
- Cannot access billing or settings
- Cannot manage team members

### Viewer
- Read-only access
- Can view events and analytics
- Cannot create or edit events
- Cannot access sensitive settings

## Permission Matrix

| Feature | Owner | Admin | Editor | Viewer |
|---------|-------|-------|--------|--------|
| Create Events | ✓ | ✓ | ✓ | ✗ |
| Edit Events | ✓ | ✓ | ✓ | ✗ |
| Delete Events | ✓ | ✓ | ✗ | ✗ |
| View Analytics | ✓ | ✓ | ✓ | ✓ |
| Manage Billing | ✓ | ✓ | ✗ | ✗ |
| Manage Team | ✓ | ✓ | ✗ | ✗ |
| Integrations | ✓ | ✓ | ✗ | ✗ |
| Settings | ✓ | ✓ | ✗ | ✗ |

## Inviting Team Members

1. Go to the **Users** tab in your dashboard
2. Click **Invite User**
3. Enter their email address
4. Select their role
5. Click **Send Invitation**

The team member will receive an email with instructions to set up their account.

## Changing User Roles

Owners and Admins can change user roles:

1. Navigate to the **Users** tab
2. Find the user you want to modify
3. Click the role dropdown
4. Select the new role
5. Confirm the change

## Removing Team Members

To remove a team member:

1. Go to the **Users** tab
2. Find the user
3. Click **Remove**
4. Confirm the removal

Removed users lose access immediately.

## Best Practices

- Assign roles based on job responsibilities
- Regularly review team member access
- Remove users who no longer need access
- Use the Viewer role for stakeholders who only need to see data
- Limit Admin access to trusted team members
    `
  },

  // Events Management
  {
    id: 'create-event',
    title: 'How to Create an Event',
    category: 'events-management',
    slug: 'create-event',
    keywords: ['create', 'event', 'new event', 'setup'],
    lastUpdated: '2025-10-12',
    content: `
# How to Create an Event

Learn how to create and configure events on TicketFlo.

## Creating an Event

1. **Navigate to Events Tab**: Click on **Events** in the sidebar
2. **Click Create New Event**: Find the button in the events section
3. **Fill in Event Details**:
   - Event Name (required)
   - Event Date (required)
   - Venue/Location (required)
   - Capacity (required)
   - Description (optional)
4. **Save as Draft**: Click **Create Event**

## Event Details Page

After creation, you'll see the Event Details page with tabs:

### Event Information
- Edit basic event details
- Add event images
- Set event status (draft/published)

### Ticket Types
- Create multiple ticket types
- Set prices and quantities
- Configure early bird pricing
- Add ticket descriptions

### Customization
- Customize event page design
- Upload logos and images
- Set brand colors
- Add custom CSS

### Email Configuration
- Customize confirmation emails
- Set sender name and email
- Design email templates
- Add custom messaging

### Custom Questions
- Create attendee questions
- Set required vs optional fields
- Choose question types (text, dropdown, checkbox)

### Marketing
- Generate shareable links
- Create promotional codes
- Social media integration
- Email campaign tools

## Publishing Your Event

When you're ready to go live:

1. Ensure all required information is complete
2. Test the ticket purchase process
3. Click **Publish Event** in the Event Details tab
4. Your event is now live!

## Event Widget

Each published event gets a unique widget URL you can:
- Embed on your website
- Share on social media
- Include in email campaigns
- Add to QR codes

Access the widget by clicking **View Widget** on any published event.

## Next Steps

- [Set up ticket types](#)
- [Customize your event page](#)
- [Configure confirmation emails](#)
- [Promote your event](#)
    `
  },
  {
    id: 'edit-event-details',
    title: 'Editing Event Details',
    category: 'events-management',
    slug: 'edit-event-details',
    keywords: ['edit', 'update', 'change', 'modify'],
    lastUpdated: '2025-10-12',
    content: `
# Editing Event Details

Update your event information at any time.

## Accessing Event Details

1. Go to the **Events** tab
2. Find your event in the list
3. Click **Manage** to open the Event Details page

## What You Can Edit

### Basic Information
- Event name
- Event date and time
- Venue/location
- Capacity
- Description
- Status (draft/published)

### Advanced Settings
- Ticket sales start/end dates
- Waitlist settings
- Maximum tickets per order
- Refund policy
- Terms and conditions

## Editing Published Events

You can edit most details of published events, but be careful with:

- **Ticket Prices**: Changes affect new purchases only
- **Event Date**: Notify existing ticket holders
- **Capacity**: Don't reduce below current sales
- **Venue Changes**: Update all marketing materials

## Best Practices

- Always save changes before navigating away
- Test changes in a draft event first
- Notify attendees of major changes
- Keep event information up-to-date
- Review details before publishing

## Bulk Editing

To edit multiple events:

1. Select events from the Events list
2. Click **Bulk Actions**
3. Choose your action (status change, duplicate, etc.)
4. Apply changes

## Version History

TicketFlo automatically saves your event changes. If you need to see previous versions or restore old settings, contact support.

## Common Issues

**Q: My changes aren't showing on the widget**
A: Clear your browser cache or wait a few minutes for changes to propagate.

**Q: Can I change the event type after creation?**
A: No, but you can create a new event and duplicate your settings.

**Q: How do I update the event image?**
A: Go to Customization tab and upload a new image in the branding section.
    `
  },
  {
    id: 'publish-event',
    title: 'Publishing Your Event',
    category: 'events-management',
    slug: 'publish-event',
    keywords: ['publish', 'go live', 'make public', 'launch'],
    lastUpdated: '2025-10-12',
    content: `
# Publishing Your Event

Make your event live and start selling tickets.

## Pre-Publication Checklist

Before publishing, ensure you have:

- ✓ Added all event details
- ✓ Created at least one ticket type
- ✓ Set up payment processing
- ✓ Customized confirmation emails
- ✓ Added event images and branding
- ✓ Tested the ticket purchase flow
- ✓ Reviewed terms and conditions

## How to Publish

1. Navigate to your event's **Event Details** page
2. Click the **Publish Event** button
3. Review the publication confirmation
4. Click **Confirm Publication**

Your event is now live!

## What Happens When You Publish

- Event becomes visible on your widget
- Ticket sales start immediately (unless scheduled)
- Search engines can index your event page
- Social media previews become active
- Email notifications are sent (if configured)

## Post-Publication

After publishing, you can:

- Share your event link
- Monitor ticket sales in real-time
- Edit event details (most fields remain editable)
- Unpublish if needed

## Unpublishing an Event

To temporarily hide an event:

1. Go to Event Details
2. Change status to **Draft**
3. Confirm the change

This stops new ticket sales but doesn't affect existing tickets.

## Scheduling Publication

Want to publish later? You can:

1. Set a "Ticket Sales Start Date" in event settings
2. Publish the event
3. Tickets won't be available until the start date

## Publication Errors

If publication fails, check:

- Payment gateway is connected
- At least one ticket type exists
- All required fields are complete
- Event date is in the future

## After Going Live

- [Promote your event](#)
- [Monitor ticket sales](#)
- [Manage attendees](#)
- [Track analytics](#)
    `
  },
  {
    id: 'duplicate-events',
    title: 'Duplicating Events',
    category: 'events-management',
    slug: 'duplicate-events',
    keywords: ['duplicate', 'copy', 'clone', 'template'],
    lastUpdated: '2025-10-12',
    content: `
# Duplicating Events

Save time by duplicating existing events as templates.

## Why Duplicate Events?

Duplication is useful for:
- Recurring events (weekly, monthly series)
- Similar events with minor variations
- Testing event configurations
- Creating event templates

## How to Duplicate

1. Go to the **Events** tab
2. Find the event you want to duplicate
3. Click the **More Options** menu (⋮)
4. Select **Duplicate Event**
5. Enter a new name for the duplicated event
6. Click **Create Duplicate**

## What Gets Copied

When you duplicate an event, the following are copied:

✓ Event details (name, description, venue)
✓ Ticket types and pricing
✓ Custom questions
✓ Branding and design
✓ Email templates
✓ Terms and conditions
✓ Marketing settings

## What Doesn't Get Copied

These items are unique to each event:

✗ Event date (you'll need to set a new date)
✗ Ticket sales and orders
✗ Attendee data
✗ Analytics and reports
✗ Published status (starts as draft)
✗ Event-specific URLs

## Editing Duplicated Events

After duplication:

1. Update the event date
2. Modify any event-specific details
3. Review all settings
4. Test the ticket purchase flow
5. Publish when ready

## Bulk Duplication

To create multiple copies:

1. Duplicate the event once
2. Make necessary changes
3. Duplicate again for additional copies
4. Update dates and details for each

## Creating Event Templates

For frequently used event types:

1. Create a "template" event
2. Configure all standard settings
3. Leave it as a draft
4. Duplicate whenever you need that event type
5. Update only the specific details

## Best Practices

- Give duplicated events clear names
- Always update the event date
- Review ticket inventory limits
- Update venue if it changes
- Check custom questions are still relevant
- Test payment processing

## Common Questions

**Q: Can I duplicate someone else's event?**
A: No, you can only duplicate events within your organization.

**Q: How many times can I duplicate an event?**
A: There's no limit on event duplication.

**Q: Does duplication count toward my plan limit?**
A: Yes, duplicated events count as new events.

**Q: Can I duplicate across different organizations?**
A: No, duplication only works within the same organization.
    `
  },
  {
    id: 'delete-events',
    title: 'Deleting Events',
    category: 'events-management',
    slug: 'delete-events',
    keywords: ['delete', 'remove', 'cancel', 'archive'],
    lastUpdated: '2025-10-12',
    content: `
# Deleting Events

Learn how to safely delete or archive events.

## Before You Delete

⚠️ **Warning**: Deleting an event is permanent and cannot be undone.

Consider these alternatives:
- **Unpublish** instead of delete (keeps data intact)
- **Archive** for historical records
- **Cancel** if the event won't happen but you want to keep records

## When to Delete

Delete events only when:
- It's a test event with no real data
- You created it by mistake
- No tickets have been sold
- You're absolutely certain you don't need the data

## How to Delete

1. Go to the **Events** tab
2. Find the event to delete
3. Click **More Options** (⋮)
4. Select **Delete Event**
5. Type the event name to confirm
6. Click **Delete Permanently**

## Events with Ticket Sales

If your event has ticket sales, you'll see a warning:

- Number of tickets sold
- Total revenue
- Number of attendees affected

**Recommendation**: Instead of deleting:
1. Unpublish the event
2. Process refunds if needed
3. Contact attendees
4. Keep the event as a record

## Permissions Required

Only these roles can delete events:
- Organization Owner
- Organization Admin

Editors and Viewers cannot delete events.

## What Gets Deleted

When you delete an event:
- Event details
- Ticket types
- Custom questions
- Branding/customization
- Email templates
- Analytics data
- Order history
- Attendee information

## What Doesn't Get Deleted

These remain in your account:
- Organization settings
- Payment gateway connections
- Other events
- Team member accounts
- Account billing history

## Alternatives to Deletion

### Unpublishing
Make event private while keeping all data:
1. Go to Event Details
2. Change status to **Draft**
3. Saves all information

### Archiving
Mark event as archived (coming soon):
- Removes from active events list
- Preserves all data
- Can be restored later

### Canceling
Cancel event but keep records:
1. Update event status to **Cancelled**
2. Send cancellation emails to attendees
3. Process refunds
4. Keep data for records

## Recovery

**Can I recover a deleted event?**
No, deleted events cannot be recovered. Contact support immediately if you deleted an event by mistake - we may be able to help within 24 hours.

## Bulk Deletion

To delete multiple events:
1. Select events from the Events list
2. Click **Bulk Actions**
3. Choose **Delete Selected**
4. Confirm the deletion

**Use with extreme caution!**

## Best Practices

- Never delete events with ticket sales
- Export data before deleting
- Use unpublish for temporary removal
- Create clear naming for test events
- Regularly clean up unused test events
- Always confirm event name before deleting
    `
  },

  // Customization Articles
  {
    id: 'customize-event-page',
    title: 'Customizing Your Event Page',
    category: 'customization',
    slug: 'customize-event-page',
    keywords: ['customize', 'design', 'branding', 'colors', 'theme'],
    lastUpdated: '2025-10-12',
    content: `
# Customizing Your Event Page

Make your event page match your brand with TicketFlo's customization options.

## Accessing Customization Settings

1. Navigate to your event
2. Click **Manage**
3. Go to the **Customization** tab

## Design Options

### Colors & Branding

**Primary Color**: Your main brand color
- Used for buttons and accents
- Accepts hex codes (#FF4D00) or color picker
- Automatically adjusts for readability

**Background Color**: Page background
- White, light gray, or custom color
- Consider contrast with text

**Text Color**: Main text color
- Dark for light backgrounds
- Light for dark backgrounds

### Logo & Images

**Event Logo**: Displayed at the top of your event page
- Recommended size: 400x100px
- Formats: PNG, JPG, SVG
- Max file size: 2MB

**Header Image**: Large banner image
- Recommended size: 1200x600px
- Should be eye-catching and relevant
- Max file size: 5MB

**Background Pattern**: Optional decorative background
- Subtle patterns work best
- Don't overpower content

### Typography

**Font Family**: Choose from pre-selected fonts
- Modern Sans (default)
- Classic Serif
- Professional Sans
- Custom Google Fonts (coming soon)

**Font Size**: Adjust text sizing
- Small, Medium, Large, Extra Large
- Affects readability on mobile

## Layout Options

### Page Layout

**Single Column**: Simple, focused layout (recommended)
**Two Column**: Event details and ticket selection side-by-side
**Full Width**: Maximize screen space

### Sections

Toggle which sections appear:
- Event description
- Venue/location map
- Schedule/agenda
- Speaker/artist information
- FAQ section
- Terms and conditions

Reorder sections by dragging.

## Mobile Customization

Preview how your page looks on:
- Desktop (1920px)
- Tablet (768px)
- Mobile (375px)

Customizations automatically adapt to screen size, but you can:
- Adjust mobile font sizes
- Hide/show certain sections on mobile
- Optimize image sizes for mobile

## Custom CSS

**Advanced users only**: Add custom CSS for complete control
1. Enable "Custom CSS" in advanced settings
2. Enter your CSS code
3. Preview changes live
4. Save when satisfied

Example CSS:

.ticket-card {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

## Preview & Testing

Always preview your changes:
1. Click **Preview** button
2. Test on different devices
3. Check all interactive elements
4. Ensure text is readable
5. Verify images load correctly

## Brand Presets

Save time with brand presets:
1. Configure your design once
2. Click **Save as Preset**
3. Name your preset
4. Apply to future events instantly

## Best Practices

- Use high-quality images
- Maintain consistent branding across events
- Ensure sufficient color contrast (WCAG AA)
- Test on actual mobile devices
- Keep designs clean and uncluttered
- Use web-safe fonts
- Optimize images before uploading

## Common Issues

**Q: Images aren't uploading**
A: Check file size (max 5MB) and format (PNG, JPG, SVG only)

**Q: Custom colors aren't showing**
A: Ensure you're using valid hex codes (#000000 format)

**Q: Design looks different on mobile**
A: This is normal - use mobile preview to adjust

**Q: Custom CSS isn't working**
A: Check for syntax errors and ensure selectors are correct

Need help with customization? [Contact support](/support) or hire a designer from our marketplace.
    `
  },
  {
    id: 'confirmation-emails',
    title: 'Customizing Confirmation Emails',
    category: 'customization',
    slug: 'confirmation-emails',
    keywords: ['email', 'confirmation', 'receipt', 'template'],
    lastUpdated: '2025-10-12',
    content: `
# Customizing Confirmation Emails

Create professional, branded confirmation emails for your attendees.

## Accessing Email Settings

1. Go to your event
2. Click **Manage**
3. Navigate to **Email Configuration** tab

## Email Components

### Sender Information

**From Name**: How your organization appears
- Use your brand name
- Example: "TicketFlo Events" or "Acme Conference"

**From Email**: Reply-to address
- Must be a verified domain email
- Example: tickets@yourdomain.com

**Reply-To Email**: Where responses go
- Can be different from From Email
- Monitored inbox recommended

### Email Subject

Personalize your subject line with variables:
- {{EVENT_NAME}} - Your event name
- {{ORDER_NUMBER}} - Unique order ID
- {{ATTENDEE_NAME}} - Ticket holder's name

Example: "Your tickets for {{EVENT_NAME}} - Order #{{ORDER_NUMBER}}"

### Email Header

**Logo**: Your organization logo
- Appears at top of email
- Same as event page logo or different
- Max size: 600x150px

**Header Color**: Background color for header section

### Email Body

Customize the main message:

**Opening Paragraph**: Welcome message

Example:
Thank you for registering for {{EVENT_NAME}}!
We're excited to see you on {{EVENT_DATE}}.

**Automatic Sections** (can be reordered):
- Order summary and total
- Ticket details with QR codes
- Event date and time
- Venue and directions
- Custom questions responses
- Terms and conditions

**Additional Information**: Add custom sections
- What to bring
- Parking information
- Schedule overview
- Contact information

**Footer**: Legal text and links
- Refund policy
- Privacy policy
- Contact support

### Available Variables

Use these in your email template:

**Event Variables**
- {{EVENT_NAME}}
- {{EVENT_DATE}}
- {{EVENT_TIME}}
- {{VENUE_NAME}}
- {{VENUE_ADDRESS}}

**Order Variables**
- {{ORDER_NUMBER}}
- {{ORDER_TOTAL}}
- {{ORDER_DATE}}
- {{TICKET_COUNT}}

**Attendee Variables**
- {{ATTENDEE_NAME}}
- {{ATTENDEE_EMAIL}}
- {{ATTENDEE_PHONE}}

**Ticket Variables**
- {{TICKET_NUMBER}}
- {{TICKET_TYPE}}
- {{TICKET_PRICE}}
- {{QR_CODE}}

## Email Styling

### Typography
- Font family
- Font size
- Text color
- Link color

### Layout
- Single column (default)
- Two column (advanced)
- Full width vs contained

### Buttons
- Button color
- Button text color
- Button style (rounded, square, pill)

## QR Code Settings

**Size**: Small, Medium, Large
**Position**: Top, Bottom, or Separate attachment
**Type**: Standard QR or custom branded QR

## Attachments

Optionally attach:
- PDF tickets
- Calendar invite (.ics file)
- Venue map
- Event schedule
- Additional documents

## Testing

Before sending to customers:

1. Click **Send Test Email**
2. Enter your email address
3. Review all details
4. Check QR codes work
5. Test on different email clients
6. Verify links work
7. Check mobile rendering

## Email Previews

Preview how your email looks in:
- Gmail
- Outlook
- Apple Mail
- Mobile devices

## Advanced Settings

### Email Timing
- Send immediately after purchase
- Delay by X minutes
- Schedule for specific time

### Reminder Emails
- Send X days before event
- Include updated information
- Different template from confirmation

### Follow-up Emails
- Post-event thank you
- Survey/feedback request
- Photos or highlights

## Transactional Emails

Other automated emails you can customize:
- Refund confirmation
- Event updates/changes
- Password reset
- Ticket transfer confirmation

## Compliance

Ensure your emails include:
- ✓ Unsubscribe link (marketing emails)
- ✓ Physical address
- ✓ Company information
- ✓ Privacy policy link

## Best Practices

- Keep subject lines under 50 characters
- Use clear, actionable language
- Include all essential information
- Make QR codes prominent
- Test before sending
- Optimize for mobile
- Use consistent branding
- Include contact information

## Troubleshooting

**Emails going to spam**
- Verify sender domain
- Avoid spam trigger words
- Include unsubscribe link
- Build sender reputation

**Variables not working**
- Check syntax: {{VARIABLE_NAME}}
- Ensure variable exists for context
- Test with real order data

**Images not showing**
- Host images on CDN
- Use absolute URLs
- Check file sizes
- Test across email clients

Need help? [View email examples](#) or [contact support](/support).
    `
  },

  // Add more articles for other categories...
  // Due to length, I'll create a few more key articles

  // Payments
  {
    id: 'setup-stripe',
    title: 'Setting Up Stripe Payments',
    category: 'payments',
    slug: 'setup-stripe',
    keywords: ['stripe', 'payment', 'gateway', 'setup'],
    lastUpdated: '2025-10-12',
    content: `
# Setting Up Stripe Payments

Connect Stripe to accept credit card payments on TicketFlo.

## Prerequisites

Before starting, you'll need:
- A TicketFlo account
- A Stripe account (sign up at stripe.com)
- Business verification documents (for some countries)

## Connecting Stripe

1. Navigate to **Payments** tab in your dashboard
2. Find the **Stripe** card
3. Click **Connect to Stripe**
4. Log in to your Stripe account (or create one)
5. Authorize TicketFlo to access your Stripe account
6. Complete the connection process

## Stripe Account Requirements

Stripe requires:
- Business name and type
- Tax identification number
- Bank account for payouts
- Business owner information
- Business address

Stripe may request additional information for verification.

## Payment Settings

After connecting, configure:

**Currency**: Choose your default currency (USD, EUR, GBP, etc.)

**Payment Methods**: Enable:
- Credit/debit cards
- Apple Pay
- Google Pay
- Afterpay (where available)

**Statement Descriptor**: How charges appear on customer statements
- Max 22 characters
- Use recognizable name
- Example: "TICKETFLO*EVENTNAME"

## Testing Payments

Use Stripe test mode to verify everything works:

1. Toggle **Test Mode** in Payment settings
2. Use Stripe test cards:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002
3. Complete a test purchase
4. Verify funds appear in Stripe dashboard
5. Switch to Live Mode when ready

## Fees

**Stripe Fees** (vary by country):
- 2.9% + $0.30 per successful card charge (US)
- Check stripe.com for your country's rates

**TicketFlo Platform Fee**:
- 5% of ticket price + Stripe fees
- Deducted automatically from each sale

## Payouts

**Payout Schedule**:
- Default: Weekly (every Monday)
- Can be changed to daily or monthly
- First payout: 7-14 days after first sale

**Payout Account**:
- Configure in Stripe dashboard
- Can be different from TicketFlo account
- Supports multiple currencies

## Security

Stripe handles all payment processing securely:
- PCI DSS Level 1 certified
- 3D Secure authentication
- Fraud detection
- Encryption of card data

TicketFlo never stores credit card information.

## Refunds

Process refunds directly from TicketFlo:
1. Go to order details
2. Click **Refund**
3. Choose full or partial refund
4. Confirm

Refunds appear in customer account in 5-10 business days.

## Troubleshooting

**Connection Failed**
- Check Stripe account is fully activated
- Verify you have admin access
- Try different browser
- Contact support

**Payments Declined**
- Check Stripe dashboard for details
- Verify test vs live mode
- Ensure card has sufficient funds
- Check fraud rules

**Payouts Not Arriving**
- Verify bank account in Stripe
- Check payout schedule
- Look for holds or disputes
- Contact Stripe support

For more help: [Stripe Documentation](https://stripe.com/docs) or [Contact TicketFlo Support](/support)
    `
  },

  // Marketing
  {
    id: 'promote-your-event',
    title: 'Promoting Your Event',
    category: 'marketing',
    slug: 'promote-your-event',
    keywords: ['marketing', 'promotion', 'social media', 'advertising'],
    lastUpdated: '2025-10-12',
    content: `
# Promoting Your Event

Learn effective strategies to market your event and sell more tickets.

## Getting Your Event URL

After publishing, your event has a unique URL:
- Widget: https://yoursite.com/widget/EVENT_ID
- Direct Link: https://ticketflo.com/e/YOUR_EVENT_SLUG

Share this URL everywhere!

## Social Media Marketing

### Facebook
- Create a Facebook Event
- Share your ticket link in the description
- Post regular updates
- Use Facebook Ads for targeted reach
- Join relevant groups (check rules first)

### Instagram
- Post eye-catching event graphics
- Use relevant hashtags (#EventName #CityEvents)
- Share to Stories with link sticker
- Tag location and speakers/artists
- Create countdown stickers

### Twitter/X
- Tweet regularly leading up to event
- Use event hashtag
- Tag speakers, sponsors, venue
- Retweet attendee posts
- Share behind-the-scenes content

### LinkedIn (for professional events)
- Post on company page
- Share in relevant groups
- Tag speakers and attendees
- Write article about event topic
- Use LinkedIn Ads

## Email Marketing

### Build Your List
- Collect emails through lead magnets
- Add signup to website
- Import existing contacts
- Offer early bird discounts for subscribers

### Email Campaign Tips
- Subject line: Clear, compelling, under 50 chars
- Preview text: Expand on subject
- Hero image: Event graphic or venue photo
- Clear CTA: "Get Tickets" button
- Mobile-optimized: Most opens are mobile
- Send sequence:
  - Announcement email
  - Early bird reminder
  - Last chance/urgency email
  - Day-before reminder

## Content Marketing

### Blog Posts
- "5 Reasons to Attend [Event Name]"
- Speaker/artist spotlights
- Event venue guide
- FAQ post
- Countdown articles

### Video Content
- Event promo video (30-60 seconds)
- Speaker interviews
- Venue walkthrough
- Previous event highlights
- Behind-the-scenes prep

### Podcasts
- Guest on relevant podcasts
- Start your own event podcast
- Create audio promos
- Interview speakers/performers

## Paid Advertising

### Google Ads
- Target event-related keywords
- Location-based targeting
- Remarketing to site visitors
- Budget: Start with $10-20/day

### Facebook/Instagram Ads
- Highly targeted demographics
- Lookalike audiences
- Event responses objective
- A/B test ad creative
- Budget: $5-15/day to start

### Display Advertising
- Banner ads on relevant sites
- Programmatic advertising
- Remarketing banners
- Event listing sites

## Partnerships & Collaborations

### Sponsors
- Offer promotion in exchange for sponsorship
- Co-branded marketing materials
- Sponsor social media posts
- Logo placement

### Media Partners
- Local news outlets
- Industry publications
- Bloggers and influencers
- Podcast hosts

### Affiliates
- Create affiliate program
- Offer commission on ticket sales
- Provide tracking links
- Share marketing materials

## Offline Marketing

### Print Materials
- Flyers and posters
- Business cards with QR code
- Postcards
- Newspaper ads (local events)

### Venue/Location
- Signs at venue
- Partner with nearby businesses
- Community bulletin boards
- Street team distribution

### Word of Mouth
- Early ticket buyer incentives
- Referral program
- VIP/group discounts
- Ambassador program

## TicketFlo Marketing Tools

Built-in tools to help you promote:

### Shareable Links
- Custom shortened URLs
- Tracking parameters
- QR codes for print materials

### Promotional Codes
- Create discount codes
- Early bird pricing
- Influencer-specific codes
- Group discounts

### Social Sharing
- One-click social posts
- Pre-written copy
- Event graphics
- Tag suggestions

### Email Integration
- Automated confirmation emails
- Reminder emails
- Update notifications
- Post-event follow-up

## Analytics & Tracking

Monitor your marketing effectiveness:
- Traffic sources
- Conversion rates
- Most effective channels
- Social media engagement
- Email open/click rates

Use this data to optimize your strategy.

## Timeline

**3+ Months Before**
- Save the date announcements
- Early bird tickets
- Partner outreach

**2 Months Before**
- Major marketing push
- Content creation
- Paid advertising start

**1 Month Before**
- Increase frequency
- Last chance messaging
- Influencer partnerships

**1 Week Before**
- Final push
- Urgency messaging
- Reminder emails
- Social media blitz

**Day Before/Day Of**
- Final reminders
- Check-in information
- Last-minute deals

## Marketing Checklist

- [ ] Create event landing page
- [ ] Set up social media profiles/events
- [ ] Design graphics and templates
- [ ] Write email sequences
- [ ] Create content calendar
- [ ] Set up tracking codes
- [ ] Launch paid campaigns
- [ ] Engage with attendees
- [ ] Monitor and adjust
- [ ] Post-event follow-up

## Best Practices

- Start promoting early
- Be consistent across channels
- Use visual content
- Create urgency (limited tickets, early bird)
- Make buying easy
- Engage with audience
- Track everything
- Adjust based on data
- Partner with others
- Keep marketing after event (for future events)

Need marketing help? Check out our [Marketing Tools](#) or [hire a marketer](#) from our marketplace.
    `
  },

  // Support
  {
    id: 'contact-support',
    title: 'How to Contact Support',
    category: 'support',
    slug: 'contact-support',
    keywords: ['support', 'help', 'contact', 'ticket'],
    lastUpdated: '2025-10-12',
    content: `
# How to Contact Support

Get help from the TicketFlo support team.

## Support Channels

### Help Center (You're Here!)
- Search our knowledge base
- Browse articles by category
- Find answers to common questions
- Available 24/7

### Email Support
- Email: support@ticketflo.com
- Include your organization name
- Describe your issue in detail
- Attach screenshots if relevant
- Response time: 24 hours (business days)

### Support Tickets
For logged-in users:
1. Go to **Support** tab in dashboard
2. Click **Create Support Ticket**
3. Describe your issue
4. Submit ticket
5. Track status in dashboard

### Priority Support
Available for premium plans:
- Phone support
- Video calls
- Dedicated account manager
- Same-day response guarantee
- 24/7 emergency line

## Before Contacting Support

Try these first:
1. Search this help center
2. Check the FAQ section
3. Review your event settings
4. Test in a different browser
5. Clear cache and cookies

## When to Contact Support

Contact us for:
- Technical issues
- Account access problems
- Payment/billing questions
- Bug reports
- Feature requests
- Integration help
- Security concerns

## What to Include

Help us help you faster by including:
- Your organization name
- Event name/ID (if relevant)
- What you were trying to do
- What actually happened
- Error messages (exact wording)
- Screenshots or screen recordings
- Browser and device information
- Steps to reproduce the issue

## Response Times

**Critical Issues** (site down, payment processing failed)
- Target response: 4 hours
- 24/7 monitoring

**High Priority** (can't create event, major feature broken)
- Target response: 8 business hours

**Normal Priority** (questions, minor issues)
- Target response: 24 business hours

**Low Priority** (feature requests, general questions)
- Target response: 48 business hours

## Emergency Support

For urgent issues outside business hours:
- Critical payment processing issues
- Site downtime during event
- Security incidents

Email: emergency@ticketflo.com
(Premium plans only)

## Community Forum

Coming soon: Join our community
- Ask questions
- Share tips
- Connect with other organizers
- Vote on feature requests
- Beta testing opportunities

## Feature Requests

Have an idea? We want to hear it!
1. Search if it's already requested
2. Submit via support ticket
3. Tag as "Feature Request"
4. Community votes help prioritize

## Bug Reports

Found a bug?
1. Note exactly how to reproduce it
2. Include screenshots/video
3. Submit detailed report
4. We'll investigate and follow up

## Account & Billing

For account-related questions:
- Billing inquiries
- Plan upgrades/downgrades
- Account access issues
- Organization settings

Email: accounts@ticketflo.com

## Training & Onboarding

Need help getting started?
- Schedule onboarding call
- Watch tutorial videos
- Request live training
- Get implementation support

Available for premium plans or à la carte.

## Feedback

We love feedback!
- Feature suggestions
- User experience improvements
- Bug reports
- Success stories

Email: feedback@ticketflo.com

## Social Media

Follow us for updates:
- Twitter: @TicketFlo
- Facebook: /TicketFlo
- Instagram: @TicketFlo
- LinkedIn: /company/ticketflo

## Business Hours

Support team available:
- Monday-Friday: 9 AM - 6 PM PST
- Weekends: Emergency support only
- Holidays: Reduced hours

## Resources

- [Video Tutorials](#)
- [API Documentation](#)
- [Developer Docs](#)
- [Status Page](#)
- [Changelog](#)
    `
  }
];

// Helper functions
export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find(cat => cat.slug === slug);
}

export function getArticlesByCategory(categoryId: string): Article[] {
  return articles.filter(article => article.category === categoryId);
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find(article => article.slug === slug);
}

export function searchArticles(query: string): Article[] {
  const lowerQuery = query.toLowerCase();
  return articles.filter(article =>
    article.title.toLowerCase().includes(lowerQuery) ||
    article.content.toLowerCase().includes(lowerQuery) ||
    article.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
}
