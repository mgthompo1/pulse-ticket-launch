# Dashboard Help System Guide

## Overview

The Dashboard Help System provides comprehensive assistance to logged-in users, helping them understand and effectively use each section of the platform. The system includes multiple layers of help:

1. **Main Help Center** - Comprehensive modal with detailed explanations
2. **Contextual Help Icons** - Inline help for specific elements
3. **Hover Tooltips** - Quick explanations for dashboard metrics
4. **Help Context Provider** - Centralized help data management

## Components

### 1. DashboardHelp Component

The main help modal that provides detailed explanations for each dashboard section.

**Location**: `src/components/DashboardHelp.tsx`

**Features**:
- Tabbed interface covering all dashboard sections
- Detailed explanations for each element
- Pro tips and best practices
- Quick action buttons
- Responsive design

**Usage**:
```tsx
<DashboardHelp 
  isOpen={showHelp} 
  onClose={() => setShowHelp(false)} 
/>
```

### 2. HelpTooltip Component

A reusable tooltip component for providing contextual help.

**Location**: `src/components/HelpTooltip.tsx`

**Features**:
- Hover-triggered tooltips
- Multiple positioning options (top, bottom, left, right)
- Customizable styling
- Arrow indicators

**Usage**:
```tsx
<HelpTooltip 
  title="Help Title" 
  content="Help content here"
  position="top"
>
  <Button>Click me</Button>
</HelpTooltip>
```

### 3. HelpIcon Component

A standalone help icon that shows tooltips on hover.

**Usage**:
```tsx
<HelpIcon 
  title="Creating Events"
  content="Fill in all required fields marked with *"
  size="md"
/>
```

### 4. HelpContext Provider

Centralized context for managing help data and tips.

**Location**: `src/contexts/HelpContext.tsx`

**Features**:
- Pre-defined help tips for each category
- Functions for adding/removing tips
- Category-based tip filtering
- Priority-based tip organization

**Usage**:
```tsx
import { useHelp } from '@/contexts/HelpContext';

const { tips, getTipsByCategory } = useHelp();
const overviewTips = getTipsByCategory('overview');
```

## Dashboard Sections Covered

### 1. Overview Dashboard
- **Total Events**: Count of all events (draft + published)
- **Tickets Sold**: Total tickets sold across all events
- **Revenue**: Total revenue generated from ticket sales
- **Platform Fees**: Estimated platform transaction fees
- **Analytics Charts**: Visual data representation
- **Recent Events**: List of latest events with management tools

### 2. Events Management
- **Events List**: View and manage existing events
- **Create New Event**: Form for creating new events
- **Event Status**: Track draft, published, and completed states

### 3. Event Details & Customization
- **Event Customization**: Branding, images, and appearance
- **Ticket Management**: Pricing, types, and availability
- **Seat Map Designer**: Custom seating arrangements

### 4. Analytics & Reporting
- **Sales Analytics**: Sales trends and conversion rates
- **Event Performance**: Individual event metrics
- **Customer Insights**: Audience demographics and behavior

### 5. Payment Configuration
- **Payment Providers**: Stripe, Windcave, and other gateways
- **Payment Methods**: Credit cards, digital wallets, bank transfers
- **Invoice Management**: Generate and manage invoices

### 6. Marketing Tools
- **Email Campaigns**: Targeted email marketing
- **Social Media Integration**: Social platform sharing
- **Promotional Codes**: Discount codes and special offers

### 7. Billing & Usage
- **Usage Dashboard**: Monthly usage tracking
- **Invoices**: Platform fee breakdown and monthly billing statements
- **Billing History**: Invoices and payment statements
- **Payment Methods**: Platform fee payment management

### 8. Apps & Integrations
- **Xero Integration**: Accounting software sync
- **Mailchimp Sync**: Email marketing list integration
- **API Access**: Custom system integration

### 9. Support & Help
- **Help Documentation**: Comprehensive guides and tutorials
- **Contact Support**: Technical assistance access
- **Community Forum**: Peer-to-peer support

### 10. Security & Privacy
- **Two-Factor Authentication**: Enhanced account security
- **Password Management**: Secure password practices
- **Session Management**: Active session monitoring

### 11. Organization Settings
- **Profile Information**: Organization details and branding
- **Notification Preferences**: Alert and reminder settings
- **Currency & Localization**: International event support

## Adding Help to New Components

### 1. Add Help Icon to Component Header

```tsx
import { HelpIcon } from "@/components/HelpTooltip";

<CardHeader>
  <div className="flex items-center justify-between">
    <div>
      <CardTitle>Component Title</CardTitle>
      <CardDescription>Description</CardDescription>
    </div>
    <HelpIcon 
      title="Help Title"
      content="Help content here"
      size="md"
    />
  </div>
</CardHeader>
```

### 2. Add Hover Tooltips to Metrics

```tsx
<Card className="group relative">
  {/* Card content */}
  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
    <div className="bg-background p-3 rounded-lg shadow-lg border max-w-xs text-sm">
      <p className="font-medium mb-1">Metric Name</p>
      <p className="text-muted-foreground">Explanation here</p>
    </div>
  </div>
</Card>
```

### 3. Add New Help Tips

Update the `HelpContext.tsx` file to add new tips:

```tsx
{
  id: 'new-component-tip',
  title: 'Tip Title',
  content: 'Tip content here',
  category: 'component-category',
  priority: 'medium'
}
```

## Best Practices

### 1. Content Guidelines
- Keep explanations concise but informative
- Use action-oriented language
- Include practical tips and best practices
- Provide examples when helpful

### 2. Placement Guidelines
- Place help icons in component headers
- Use hover tooltips for metrics and data
- Position help elements to avoid interfering with functionality
- Ensure help is accessible on all screen sizes

### 3. Performance Considerations
- Help content is loaded once and cached
- Tooltips are rendered on-demand
- Use lazy loading for large help content
- Optimize images and media in help content

## Accessibility Features

- **Keyboard Navigation**: Help modals can be navigated with keyboard
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **High Contrast**: Help content uses accessible color schemes
- **Focus Management**: Proper focus handling in modals

## Future Enhancements

### 1. Interactive Tutorials
- Step-by-step guided tours
- Interactive walkthroughs
- Progress tracking for new users

### 2. Video Help
- Embedded video tutorials
- Screen recordings for complex processes
- Multi-language video support

### 3. AI-Powered Help
- Context-aware help suggestions
- Smart search and filtering
- Personalized help recommendations

### 4. Help Analytics
- Track which help content is most viewed
- Identify areas where users need more help
- A/B testing for help content effectiveness

## Troubleshooting

### Common Issues

1. **Help Modal Not Opening**
   - Check if `showHelp` state is properly managed
   - Ensure `DashboardHelp` component is imported
   - Verify click handlers are properly connected

2. **Tooltips Not Showing**
   - Check z-index values for proper layering
   - Ensure parent container has `relative` positioning
   - Verify hover events are properly bound

3. **Help Context Not Available**
   - Ensure component is wrapped in `HelpProvider`
   - Check if `useHelp` hook is used correctly
   - Verify context provider hierarchy

### Debug Mode

Enable debug logging by setting:

```tsx
// In HelpContext.tsx
const DEBUG = true;

if (DEBUG) {
  console.log('Help context operation:', operation);
}
```

## Support

For questions about the help system or to request new features:

1. Check existing documentation
2. Review component examples
3. Contact the development team
4. Submit feature requests through the support system

---

*This help system is designed to evolve with user feedback and platform updates. Regular reviews and updates ensure it remains relevant and helpful for all users.*
