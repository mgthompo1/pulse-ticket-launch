import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar } from 'lucide-react';
import { BookingSlot } from '@/types/attraction';
import { Theme } from '@/types/theme';
import { formatTime } from '@/types/attraction';

interface TimeSlotGridProps {
  slots: BookingSlot[];
  selectedSlotId: string | null;
  selectedDate: string;
  basePrice: number;
  loading: boolean;
  theme: Theme;
  onSlotSelect: (slotId: string) => void;
  onTryTomorrow: () => void;
  getResourceName: (resourceId: string | null) => string;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  selectedSlotId,
  selectedDate,
  basePrice,
  loading,
  theme,
  onSlotSelect,
  onTryTomorrow,
  getResourceName
}) => {
  const { primaryColor } = theme;

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Available Times for {formattedDate}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2" />
            <p className="text-gray-600">Loading available times...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium mb-2">No available slots for this date</p>
            <p className="text-sm text-gray-500 mb-4">
              Try selecting a different date or check back later
            </p>
            <Button variant="outline" onClick={onTryTomorrow}>
              Try Tomorrow
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Session Times Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                const spotsLeft = slot.max_capacity - slot.current_bookings;
                const price = slot.price_override ?? basePrice;

                return (
                  <button
                    key={slot.id}
                    onClick={() => onSlotSelect(slot.id)}
                    className={`group relative p-4 border-2 rounded-lg text-center transition-all duration-200 hover:scale-102 ${
                      isSelected
                        ? 'text-white shadow-lg'
                        : 'border-gray-200 bg-white hover:shadow-md'
                    }`}
                    style={{
                      borderColor: isSelected ? '#6B7280' : undefined,
                      backgroundColor: isSelected ? '#6B7280' : undefined
                    }}
                  >
                    <div className="space-y-2">
                      {/* Time */}
                      <div
                        className={`text-lg font-bold ${
                          isSelected ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {formatTime(slot.start_time)}
                      </div>

                      {/* Price */}
                      <div
                        className={`text-sm font-medium ${
                          isSelected ? 'text-white/90' : 'text-gray-600'
                        }`}
                      >
                        ${price}
                      </div>

                      {/* Availability */}
                      <div
                        className={`text-xs ${
                          isSelected ? 'text-white/80' : 'text-gray-500'
                        }`}
                      >
                        {spotsLeft} left
                      </div>

                      {/* Resource Info */}
                      {slot.resource_id && (
                        <div
                          className={`text-xs px-2 py-1 rounded ${
                            isSelected
                              ? 'bg-white/20 text-white/90'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getResourceName(slot.resource_id)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selection Hint */}
            {!selectedSlotId && slots.length > 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  Select a time slot to continue with your booking
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
