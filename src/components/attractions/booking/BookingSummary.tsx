import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin } from 'lucide-react';
import { AttractionData, BookingSlot, formatTime, formatShortDate, calculateTotalPrice } from '@/types/attraction';
import { Theme } from '@/types/theme';

interface BookingSummaryProps {
  attraction: AttractionData;
  selectedSlot: BookingSlot | null;
  selectedDate: string;
  partySize: number;
  theme: Theme;
  onContinue: () => void;
  getResourceLabel: () => string;
  getResourceName: (resourceId: string | null) => string;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  attraction,
  selectedSlot,
  selectedDate,
  partySize,
  theme,
  onContinue,
  getResourceLabel,
  getResourceName
}) => {
  const { primaryColor, buttonTextColor } = theme;
  const totalPrice = calculateTotalPrice(selectedSlot, attraction.base_price, partySize);

  return (
    <Card className="lg:col-span-1 h-fit sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attraction Info */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900">{attraction.name}</h4>
          {attraction.description && (
            <p
              className="text-sm text-gray-600 line-clamp-2"
              dangerouslySetInnerHTML={{
                __html: attraction.description.replace(/<[^>]*>/g, '').substring(0, 100)
              }}
            />
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {attraction.duration_minutes}min
            </span>
            {attraction.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {attraction.venue}
              </span>
            )}
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Selection Summary */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Date:</span>
            <span className="text-sm font-medium">
              {formatShortDate(selectedDate)}
            </span>
          </div>

          {selectedSlot && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Time:</span>
              <span className="text-sm font-medium">
                {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Party Size:</span>
            <span className="text-sm font-medium">
              {partySize} {partySize === 1 ? 'person' : 'people'}
            </span>
          </div>

          {selectedSlot?.resource_id && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{getResourceLabel()}:</span>
              <span className="text-sm font-medium">
                {getResourceName(selectedSlot.resource_id)}
              </span>
            </div>
          )}
        </div>

        <hr className="border-gray-200" />

        {/* Price */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              ${selectedSlot?.price_override ?? attraction.base_price} × {partySize}
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: primaryColor }}
            >
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Continue Button */}
        {selectedSlot && (
          <Button
            className="w-full mt-4"
            style={{ backgroundColor: primaryColor, color: buttonTextColor }}
            onClick={onContinue}
          >
            Continue to Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
