import React from 'react';
import { Button } from '@/components/ui/button';
import MerchandiseSelector from '@/components/MerchandiseSelector';
import { MerchandiseCartItem } from '@/types/widget';
import { Theme } from '@/types/theme';

interface AddOnsSelectionProps {
  eventId: string;
  merchandiseCart: MerchandiseCartItem[];
  onMerchandiseCartUpdate: (items: MerchandiseCartItem[]) => void;
  onNext: () => void;
  onBack: () => void;
  theme: Theme;
}

export const AddOnsSelection: React.FC<AddOnsSelectionProps> = ({
  eventId,
  onMerchandiseCartUpdate,
  onNext,
  onBack,
  theme
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: theme.headerTextColor }}>Add-ons & Merchandise</h2>
        <p style={{ color: theme.bodyTextColor }}>Enhance your experience with additional items</p>
      </div>

      <MerchandiseSelector 
        eventId={eventId}
        onCartUpdate={onMerchandiseCartUpdate}
        theme={theme}
      />

      {/* Navigation Buttons Below Content */}
      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onBack} 
          size="lg"
          style={{ 
            borderColor: theme.primaryColor,
            color: theme.primaryColor
          }}
        >
          Back to Tickets
        </Button>
        <Button 
          onClick={onNext} 
          size="lg" 
          className="border-0"
          style={{ 
            backgroundColor: theme.primaryColor,
                                color: theme.buttonTextColor
          }}
        >
          Continue to Details
        </Button>
      </div>
    </div>
  );
};