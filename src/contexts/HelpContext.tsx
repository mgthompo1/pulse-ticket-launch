import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HelpTip {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

interface HelpContextType {
  tips: HelpTip[];
  addTip: (tip: HelpTip) => void;
  removeTip: (tipId: string) => void;
  getTipsByCategory: (category: string) => HelpTip[];
  showContextualHelp: (elementId: string) => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};

interface HelpProviderProps {
  children: ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
  const [tips] = useState<HelpTip[]>([
    // Overview Dashboard Tips
    {
      id: 'overview-events',
      title: 'Managing Events',
      content: 'Click on any event in the Recent Events section to manage it. You can edit details, view analytics, and monitor ticket sales.',
      category: 'overview',
      priority: 'medium'
    },
    {
      id: 'overview-analytics',
      title: 'Understanding Analytics',
      content: 'Hover over the analytics charts to see detailed information. Use the filters to analyze specific time periods.',
      category: 'overview',
      priority: 'medium'
    },
    
    // Events Management Tips
    {
      id: 'events-creation',
      title: 'Creating Events',
      content: 'Fill in all required fields marked with *. Set realistic capacity based on your venue limitations.',
      category: 'events',
      priority: 'high'
    },
    {
      id: 'events-status',
      title: 'Event Status',
      content: 'Draft events can be edited freely. Published events can sell tickets. Completed events show final results.',
      category: 'events',
      priority: 'medium'
    },
    
    // Event Details Tips
    {
      id: 'event-customization',
      title: 'Event Branding',
      content: 'Upload high-quality logos and images for better branding. Use consistent colors and fonts across your event materials.',
      category: 'event-details',
      priority: 'medium'
    },
    {
      id: 'ticket-pricing',
      title: 'Ticket Pricing Strategy',
      content: 'Consider early bird pricing to boost early sales. Set quantity limits for VIP tickets to create exclusivity.',
      category: 'event-details',
      priority: 'high'
    },
    
    // Analytics Tips
    {
      id: 'analytics-insights',
      title: 'Data Insights',
      content: 'Identify peak selling periods and compare performance across different events. Use insights to optimize pricing strategies.',
      category: 'analytics',
      priority: 'medium'
    },
    
    // Payments Tips
    {
      id: 'payment-setup',
      title: 'Payment Configuration',
      content: 'Test payments in sandbox mode first. Ensure PCI compliance and set up webhooks for real-time updates.',
      category: 'payments',
      priority: 'high'
    },
    
    // Marketing Tips
    {
      id: 'email-marketing',
      title: 'Email Campaigns',
      content: 'Segment your email list for better engagement. Use automation for welcome and reminder emails.',
      category: 'marketing',
      priority: 'medium'
    },
    
    // Billing Tips
    {
      id: 'billing-monitoring',
      title: 'Usage Monitoring',
      content: 'Monitor usage to avoid unexpected charges. Set up alerts for usage thresholds.',
      category: 'billing',
      priority: 'medium'
    },
    
    // Security Tips
    {
      id: 'security-2fa',
      title: 'Two-Factor Authentication',
      content: 'Enable 2FA using authenticator apps instead of SMS. Keep backup codes in a safe place.',
      category: 'security',
      priority: 'high'
    },
    
    // Settings Tips
    {
      id: 'settings-localization',
      title: 'Localization',
      content: 'Use local currency for better customer experience. Set timezone to match your event location.',
      category: 'settings',
      priority: 'low'
    }
  ]);

  const addTip = (tip: HelpTip) => {
    // In a real app, you might want to persist this to a database
    console.log('Adding help tip:', tip);
  };

  const removeTip = (tipId: string) => {
    // In a real app, you might want to persist this to a database
    console.log('Removing help tip:', tipId);
  };

  const getTipsByCategory = (category: string) => {
    return tips.filter(tip => tip.category === category);
  };

  const showContextualHelp = (elementId: string) => {
    // This could trigger a tooltip or help modal for specific elements
    console.log('Showing contextual help for:', elementId);
  };

  const value: HelpContextType = {
    tips,
    addTip,
    removeTip,
    getTipsByCategory,
    showContextualHelp
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
};
