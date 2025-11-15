import React, { useState } from 'react';
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
  hasCartItems?: boolean;
}

export const AddOnsSelection: React.FC<AddOnsSelectionProps> = ({
  eventId,
  onMerchandiseCartUpdate,
  onNext,
  onBack,
  theme,
  hasCartItems = true
}) => {
  const [hasMerchandise, setHasMerchandise] = useState(false);

  // If no merchandise available, return null to hide entire section
  if (!hasMerchandise) {
    return null;
  }

  return (
    <div className="border-t pt-8 space-y-6" style={{ borderColor: theme.primaryColor ? (theme.borderEnabled ? theme.borderColor : '#e5e7eb') : '#e5e7eb' }}>
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: theme.headerTextColor }}>Add-ons & Merchandise</h2>
        <p style={{ color: theme.bodyTextColor }}>Enhance your experience with additional items</p>
      </div>

      <MerchandiseSelector
        eventId={eventId}
        onCartUpdate={onMerchandiseCartUpdate}
        theme={theme}
        onHasMerchandise={setHasMerchandise}
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
          disabled={!hasCartItems}
          title={!hasCartItems ? "Please add at least one ticket to your cart" : ""}
          style={{
            backgroundColor: theme.primaryColor,
                                color: theme.buttonTextColor,
            opacity: !hasCartItems ? 0.5 : 1
          }}
        >
          Continue to Details
        </Button>
      </div>
    </div>
  );
};