import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Mail } from 'lucide-react';
import {
  AttractionData,
  BookingSlot,
  formatDate,
  formatTime,
  calculateTotalPrice
} from '@/types/attraction';

interface BookingConfirmationProps {
  attraction: AttractionData;
  selectedSlot: BookingSlot | null;
  selectedDate: string;
  partySize: number;
  customerEmail: string;
  compact?: boolean;
  getResourceLabel: () => string;
  getResourceName: (resourceId: string | null) => string;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  attraction,
  selectedSlot,
  selectedDate,
  partySize,
  customerEmail,
  compact = false,
  getResourceLabel,
  getResourceName
}) => {
  const totalPrice = calculateTotalPrice(selectedSlot, attraction.base_price, partySize);

  return (
    <div className={compact ? '' : 'px-4'}>
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <CheckCircle className="h-20 w-20 mx-auto text-green-500" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold mb-3 text-green-700">
            Booking Confirmed!
          </h2>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 mb-6">
            Your booking for <strong>{attraction.name}</strong> has been confirmed.
          </p>

          {/* Booking Details Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm border max-w-lg mx-auto">
            <h3 className="font-semibold mb-4 text-gray-900">Your Booking Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </div>

              {selectedSlot && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium">
                    {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Party Size</span>
                <span className="font-medium">
                  {partySize} {partySize === 1 ? 'person' : 'people'}
                </span>
              </div>

              {selectedSlot?.resource_id && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">{getResourceLabel()}</span>
                  <span className="font-medium">
                    {getResourceName(selectedSlot.resource_id)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-3 bg-green-50 px-4 rounded-lg">
                <span className="font-semibold text-green-700">Total Paid</span>
                <span className="font-bold text-lg text-green-700">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Email Confirmation Notice */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 text-center flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              A confirmation email has been sent to <strong>{customerEmail}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
