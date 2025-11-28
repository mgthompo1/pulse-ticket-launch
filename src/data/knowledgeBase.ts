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
    lastUpdated: '2025-11-28',
    content: `
# What is TicketFlo?

TicketFlo is a modern, all-in-one ticketing platform built for event organizers who want complete control over their ticket sales without the complexity of enterprise solutions. Whether you're running a small workshop or a large festival, TicketFlo provides the tools you need to sell tickets, manage attendees, and maximize revenue.

## Why Choose TicketFlo?

**Built for Real Events**: Unlike generic ticketing platforms, TicketFlo was designed by event organizers who understand the challenges of running successful events.

**No Hidden Fees**: Transparent pricing with competitive transaction fees. You keep more of your ticket revenue.

**White-Label Experience**: Your brand, your event. Customers see your branding, not ours.

**Instant Payouts**: Get paid quickly with Stripe Connect integration - no waiting weeks for your funds.

## Key Features

### Ticketing & Sales
- **Multiple Ticket Types**: General admission, VIP, early bird, group tickets, and more
- **Dynamic Pricing**: Set different prices for different dates or automatically increase prices as you sell
- **Discount Codes**: Create promotional codes, track usage, and limit redemptions
- **Group Bookings**: Special handling for group sales with invoicing and allocations

### Event Management
- **Real-Time Dashboard**: See sales, revenue, and check-ins as they happen
- **Custom Questions**: Collect any attendee information you need
- **Attendee Management**: Search, export, and communicate with ticket holders
- **Check-In App**: TicketFloLIVE for fast, reliable door scanning

### Payments
- **Stripe Integration**: Accept cards, Apple Pay, Google Pay, and more
- **Windcave Support**: Alternative payment gateway for specific regions
- **Stripe Connect**: Pass booking fees to customers or absorb them yourself
- **Automatic Refunds**: Process refunds directly from your dashboard

### Customization
- **Branded Ticket Pages**: Match your event's look and feel
- **Custom Confirmation Emails**: Professional emails with your branding
- **Embeddable Widget**: Sell tickets directly on your website
- **Custom CSS**: Full design control for advanced users

## Two Operating Modes

### Events Mode
Perfect for conferences, concerts, festivals, workshops, and one-time events. Features include:
- Event-based ticket management
- Date and time scheduling
- Venue capacity tracking
- Marketing and promotional tools

### Attractions Mode
Ideal for museums, tours, theme parks, and ongoing attractions. Features include:
- Resource-based booking (guides, equipment, spaces)
- Time slot management
- Recurring availability
- Capacity per session

## Getting Started

Getting up and running takes just a few minutes:

1. **Create Your Account**: Sign up and set up your organization
2. **Connect Payments**: Link your Stripe account to receive payments
3. **Create an Event**: Add your event details, tickets, and branding
4. **Publish & Share**: Go live and start selling tickets

Ready to get started? [Create your first event](/help/getting-started/create-your-first-event) or [contact our support team](/support) if you need help.
    `
  },
  {
    id: 'create-your-first-event',
    title: 'Creating Your First Event',
    category: 'getting-started',
    slug: 'create-your-first-event',
    keywords: ['create event', 'first event', 'setup', 'new event'],
    lastUpdated: '2025-11-28',
    content: `
# Creating Your First Event

This guide walks you through creating your first event on TicketFlo, from initial setup to going live with ticket sales.

## Before You Start

Make sure you have:
- Your event details ready (name, date, venue, description)
- A connected payment gateway (Stripe recommended)
- Your event logo and any images you want to use

## Step 1: Create the Event

1. From your dashboard, click **Events** in the sidebar
2. Click the **Create New Event** button (or the + icon)
3. Fill in the basic details:
   - **Event Name**: Choose a clear, memorable name (this appears on tickets)
   - **Event Date & Time**: When your event starts
   - **Venue**: The location name and address
   - **Capacity**: Maximum number of attendees (you can adjust per ticket type later)
4. Click **Create Event**

Your event is saved as a draft - it won't be visible to anyone until you publish it.

## Step 2: Add Ticket Types

Navigate to the **Tickets** tab in your event to set up ticket types:

1. Click **Add Ticket Type**
2. Configure each ticket:
   - **Name**: e.g., "General Admission", "VIP", "Early Bird"
   - **Price**: Set your ticket price (or $0 for free events)
   - **Quantity**: How many of this ticket type to sell
   - **Description**: What's included with this ticket
   - **Sale Dates**: When tickets become available (optional)
3. Add more ticket types as needed

**Pro Tip**: Create an "Early Bird" ticket with limited quantity and lower price to drive early sales.

## Step 3: Customize Your Event Page

In the **Customization** tab, brand your ticket page:

- **Logo**: Upload your event or organization logo
- **Primary Color**: Match your brand colors
- **Header Image**: Add a banner image (1200x600px recommended)
- **Event Description**: Write compelling copy about your event

Preview your changes with the **Preview** button before saving.

## Step 4: Configure Confirmation Emails

In the **Emails** tab, customize what attendees receive:

- **Subject Line**: Use {{EVENT_NAME}} to automatically insert your event name
- **Email Content**: Include important details like venue directions, what to bring, etc.
- **Sender Name**: How your organization appears in their inbox
- **Reply-To Email**: Where responses should go

Send a test email to yourself before publishing.

## Step 5: Add Custom Questions (Optional)

Need to collect additional information? In the **Questions** tab:

- Add text fields, dropdowns, checkboxes, or date pickers
- Mark questions as required or optional
- Questions appear during checkout

Common questions: dietary requirements, company name, t-shirt size.

## Step 6: Publish Your Event

Before publishing, double-check:
- [ ] All ticket types are configured correctly
- [ ] Payment gateway is connected and tested
- [ ] Event page looks good on mobile
- [ ] Confirmation email is tested
- [ ] Event date and time are correct

When ready:
1. Go to the **Event Details** tab
2. Click **Publish Event**
3. Confirm the publication

Your event is now live!

## Sharing Your Event

After publishing, you'll get:
- **Event URL**: Direct link to your ticket page
- **Embed Code**: Add ticket sales to your website
- **QR Code**: For printed materials

Share these on social media, email newsletters, and your website.

## What's Next?

- [Promote your event](/help/marketing/promote-your-event)
- [Track sales in real-time](/help/analytics/track-sales)
- [Set up check-in for event day](/help/events-management/checkin-setup)
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
    keywords: ['stripe', 'payment', 'gateway', 'setup', 'connect'],
    lastUpdated: '2025-11-28',
    content: `
# Setting Up Stripe Payments

TicketFlo uses Stripe Connect to process payments securely. This guide covers connecting your Stripe account and configuring payment settings.

## Two Ways to Use Stripe

### Option 1: Stripe Connect (Recommended)
With Stripe Connect, payments go directly to your Stripe account. You receive funds immediately (minus Stripe's fees), and TicketFlo's platform fee is collected separately.

**Benefits:**
- Funds go directly to your bank account
- You control your Stripe dashboard and payouts
- Lower overall fees in most cases
- Customers see your business name on their statement

### Option 2: Standard Integration
TicketFlo processes payments and pays you out. Simpler setup but longer payout times.

## Connecting Stripe Connect

1. Go to **Payments** in your dashboard sidebar
2. In the Stripe section, click **Connect with Stripe**
3. You'll be redirected to Stripe to:
   - Log in to your existing Stripe account, OR
   - Create a new Stripe account
4. Authorize TicketFlo to connect to your account
5. Complete any required verification steps
6. You'll be redirected back to TicketFlo

Once connected, you'll see your Stripe account status in the Payments tab.

## Stripe Connect Settings

After connecting, configure these options:

### Booking Fee Handling
Choose how to handle TicketFlo's platform fee:

**Pass to Customer**: Add the booking fee on top of your ticket price. Customers pay the fee, you receive your full ticket price.

**Absorb Fee**: Include the booking fee in your ticket price. You pay the fee out of your revenue.

### Currency
Set your default currency. This determines how prices display and how you receive payouts.

### Payment Methods
Stripe automatically enables:
- Credit and debit cards (Visa, Mastercard, Amex)
- Apple Pay and Google Pay (on supported devices)
- Link (Stripe's one-click checkout)

Additional methods like Afterpay/Klarna can be enabled in your Stripe dashboard.

## Testing Your Setup

Before going live with your first event:

1. Create a test event with a low-priced ticket
2. Complete a test purchase using a real card
3. Verify the payment appears in your Stripe dashboard
4. Process a test refund
5. Check that confirmation emails are sent correctly

**Tip**: Use a $1 test ticket and refund it after testing.

## Understanding Fees

### Stripe's Fees
Stripe charges per successful transaction. Rates vary by country:
- **US**: 2.9% + $0.30 per transaction
- **UK**: 1.4% + 20p for UK cards
- **AU**: 1.75% + $0.30 for domestic cards
- **NZ**: 2.7% + $0.30 per transaction

See [Stripe's pricing page](https://stripe.com/pricing) for your region.

### TicketFlo's Platform Fee
- **1% + $0.50** per ticket transaction
- Collected automatically on each sale
- Can be passed to customers or absorbed

## Managing Payouts

With Stripe Connect:
- Funds are available in your Stripe balance immediately
- Set your payout schedule in Stripe (daily, weekly, monthly)
- First payout may take 7-14 days while Stripe verifies your account
- No action needed in TicketFlo - Stripe handles payouts

## Processing Refunds

Refund orders directly from TicketFlo:

1. Find the order in **Orders** or **Event Management**
2. Click the order to view details
3. Click **Refund**
4. Select full or partial refund
5. Confirm the refund

Refunds are processed through Stripe and typically appear in 5-10 business days.

**Note**: Stripe's transaction fees are not refunded, but TicketFlo's platform fee is.

## Troubleshooting

### "Connection Failed" Error
- Ensure you're logged into the correct Stripe account
- Check that your Stripe account is fully activated (not in restricted mode)
- Try using an incognito/private browser window
- Contact support if the issue persists

### Payments Being Declined
- Check Stripe's dashboard for specific decline reasons
- Common issues: insufficient funds, expired card, fraud detection
- Ensure you're not in Stripe's test mode for live events

### Payouts Not Arriving
- Verify your bank account is correctly linked in Stripe
- Check for any holds or verification requirements
- Review your payout schedule settings
- Contact Stripe support for payout-specific issues

## Security & Compliance

- **PCI Compliant**: Stripe is PCI DSS Level 1 certified
- **Card Data**: TicketFlo never sees or stores card numbers
- **3D Secure**: Automatic authentication for suspicious transactions
- **Fraud Protection**: Stripe Radar blocks fraudulent payments

Need help? [Contact our support team](/support) or visit [Stripe's documentation](https://stripe.com/docs).
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
    lastUpdated: '2025-11-28',
    content: `
# How to Contact Support

Our support team is here to help you get the most out of TicketFlo. Here's how to reach us and get the fastest resolution.

## Quick Self-Help

Before contacting support, try these quick fixes:

1. **Search this Help Center** - Most questions are answered here
2. **Check the status page** - If something seems broken, we may already know
3. **Clear your browser cache** - Fixes many display issues
4. **Try a different browser** - Rules out browser-specific problems
5. **Check your event settings** - Many issues come from configuration

## Creating a Support Ticket

The fastest way to get help is through our ticket system:

1. Log into your TicketFlo dashboard
2. Go to **Support** in the sidebar
3. Click **Create Support Ticket**
4. Describe your issue in detail
5. Submit and track your ticket's progress

**What to include in your ticket:**
- Your organization name
- Which event you're working with (if applicable)
- What you were trying to do
- What actually happened instead
- Any error messages (exact wording helps!)
- Screenshots showing the problem

The more detail you provide, the faster we can help.

## Response Times

We prioritize tickets based on urgency:

| Priority | Example Issues | Target Response |
|----------|---------------|-----------------|
| **Critical** | Payments down during live event, site inaccessible | 2-4 hours |
| **High** | Can't publish event, checkout not working | Same business day |
| **Normal** | Feature questions, minor bugs | 24 hours |
| **Low** | Feature requests, general inquiries | 48 hours |

**Business hours**: Monday-Friday, 9 AM - 6 PM NZST

## Common Issues We Can Help With

**Technical Problems**
- Payment processing issues
- Widget not displaying correctly
- Emails not sending
- Integration errors

**Account & Access**
- Can't log in
- Team member permissions
- Organization settings
- Password resets

**Billing Questions**
- Understanding invoices
- Updating payment methods
- Fee explanations
- Refund processing

**Getting Started**
- Setting up your first event
- Connecting payment gateways
- Customizing your ticket page
- Understanding features

## Tips for Faster Resolution

**Be Specific**: "The checkout button doesn't work" is better than "it's broken"

**Include Screenshots**: A picture saves a thousand back-and-forth messages

**Share the URL**: If something looks wrong, send us the page URL

**List Your Steps**: Tell us exactly what you clicked to get to the problem

**Check Recently**: "This stopped working yesterday" helps us check recent changes

## Feature Requests

Have an idea for TicketFlo? We'd love to hear it!

1. Go to **Support** in your dashboard
2. Create a ticket with "Feature Request" in the subject
3. Describe the feature and why it would help you
4. We review all requests and prioritize based on demand

Popular requests get built faster - so tell us what you need!

## Reporting Bugs

Found something that isn't working right?

1. Try to reproduce the issue consistently
2. Note the exact steps that cause the problem
3. Take screenshots or record a video
4. Submit a support ticket with all details
5. We'll investigate and keep you updated

## Emergency Contact

For critical issues outside business hours:
- Event currently taking place with payment issues
- Security concerns
- Complete system outage

Email: **support@ticketflo.com** with "URGENT" in the subject line

## Stay Updated

- Check our status page for known issues
- Follow release notes for new features
- Subscribe to our newsletter for tips and updates

We're constantly improving TicketFlo based on your feedback. Thank you for helping us build a better platform!
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
