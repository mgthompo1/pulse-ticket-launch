import React from 'react';
import { Button } from '@/components/ui/button';
import MerchandiseSelector from '@/components/MerchandiseSelector';
import { MerchandiseCartItem } from '@/types/widget';

interface AddOnsSelectionProps {
  eventId: string;
  merchandiseCart: MerchandiseCartItem[];
  onMerchandiseCartUpdate: (items: MerchandiseCartItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const AddOnsSelection: React.FC<AddOnsSelectionProps> = ({
  eventId,
  
  onMerchandiseCartUpdate,
  onNext,
  onBack
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Add-ons & Merchandise</h2>
        <p className="text-muted-foreground">Enhance your experience with additional items</p>
      </div>

      <MerchandiseSelector 
        eventId={eventId}
        onCartUpdate={onMerchandiseCartUpdate}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} size="lg">
          Back to Tickets
        </Button>
        <Button onClick={onNext} size="lg" className="bg-neutral-900 hover:bg-neutral-800 text-white border-0">
          Continue to Details
        </Button>
      </div>
    </div>
  );
};