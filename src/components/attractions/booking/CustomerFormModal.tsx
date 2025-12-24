import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Loader2 } from 'lucide-react';
import {
  AttractionData,
  BookingSlot,
  BookingFormData,
  BookingStep,
  PaymentProvider,
  formatDate,
  formatTime,
  calculateTotalPrice
} from '@/types/attraction';
import { Theme } from '@/types/theme';
import { AttractionStripePayment } from '@/components/payment/AttractionStripePayment';

interface CustomerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attraction: AttractionData;
  selectedSlot: BookingSlot | null;
  bookingForm: BookingFormData;
  bookingStep: BookingStep;
  pendingBookingId: string | null;
  paymentProvider: PaymentProvider;
  windcaveSessionData: any;
  isProcessing: boolean;
  theme: Theme;
  onFormChange: (updates: Partial<BookingFormData>) => void;
  onCreateBooking: () => void;
  onPaymentSuccess: () => void;
  onPaymentError: (error: Error) => void;
  onBackToTimes: () => void;
  onBackToDetails: () => void;
  getResourceLabel: () => string;
  getResourceName: (resourceId: string | null) => string;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  open,
  onOpenChange,
  attraction,
  selectedSlot,
  bookingForm,
  bookingStep,
  pendingBookingId,
  paymentProvider,
  windcaveSessionData,
  isProcessing,
  theme,
  onFormChange,
  onCreateBooking,
  onPaymentSuccess,
  onPaymentError,
  onBackToTimes,
  onBackToDetails,
  getResourceLabel,
  getResourceName
}) => {
  const { primaryColor, buttonTextColor } = theme;
  const totalPrice = calculateTotalPrice(selectedSlot, attraction.base_price, bookingForm.partySize);

  const isFormValid = bookingForm.customerName && bookingForm.customerEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {bookingStep === 'payment' ? 'Complete Payment' : 'Complete Your Booking'}
          </DialogTitle>
          <DialogDescription>
            {bookingStep === 'payment'
              ? 'Enter your payment details to confirm'
              : 'Just a few details and you\'re all set'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Details Form */}
          {bookingStep === 'booking' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Full Name *</Label>
                <Input
                  id="customer-name"
                  value={bookingForm.customerName}
                  onChange={(e) => onFormChange({ customerName: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email Address *</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={bookingForm.customerEmail}
                  onChange={(e) => onFormChange({ customerEmail: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone Number</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  value={bookingForm.customerPhone}
                  onChange={(e) => onFormChange({ customerPhone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="special-requests">Special Requests (Optional)</Label>
                <Input
                  id="special-requests"
                  value={bookingForm.specialRequests}
                  onChange={(e) => onFormChange({ specialRequests: e.target.value })}
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>
          )}

          {/* Payment Section */}
          {bookingStep === 'payment' && pendingBookingId && (
            <div className="space-y-4">
              {/* Booking Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Attraction:</span>
                    <span className="font-medium">{attraction.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>
                      {formatDate(bookingForm.selectedDate)} at{' '}
                      {selectedSlot && formatTime(selectedSlot.start_time)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Party Size:</span>
                    <span>
                      {bookingForm.partySize}{' '}
                      {bookingForm.partySize === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                  {selectedSlot?.resource_id && (
                    <div className="flex justify-between">
                      <span>{getResourceLabel()}:</span>
                      <span>{getResourceName(selectedSlot.resource_id)}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total:</span>
                    <span style={{ color: primaryColor }}>
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              {paymentProvider === 'stripe' ? (
                <AttractionStripePayment
                  amount={totalPrice}
                  currency={attraction.organizations?.currency || 'USD'}
                  description={`Booking for ${attraction.name}`}
                  customerEmail={bookingForm.customerEmail}
                  customerName={bookingForm.customerName}
                  onSuccess={onPaymentSuccess}
                  onError={(error) => onPaymentError(new Error(error.message || 'Payment failed'))}
                  metadata={{
                    booking_id: pendingBookingId,
                    booking_slot_id: bookingForm.selectedSlotId || '',
                    attraction_id: attraction.id,
                    booking_type: 'attraction',
                    organization_id: attraction.organization_id,
                    party_size: bookingForm.partySize.toString(),
                    special_requests: bookingForm.specialRequests || ''
                  }}
                  theme={{
                    primary: primaryColor,
                    secondary: primaryColor
                  }}
                />
              ) : paymentProvider === 'windcave' ? (
                <div className="space-y-4">
                  {windcaveSessionData ? (
                    <div>
                      <div id="windcave-drop-in" className="min-h-[400px]" />
                      <p className="text-sm text-gray-600 mt-2">
                        Complete your payment using the secure Windcave payment form above.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Setting up secure payment...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-red-600">Unsupported payment provider: {paymentProvider}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={bookingStep === 'payment' ? onBackToDetails : onBackToTimes}
              className="sm:w-auto"
            >
              ← {bookingStep === 'payment' ? 'Back to Details' : 'Back to Times'}
            </Button>

            {bookingStep === 'booking' && (
              <Button
                onClick={onCreateBooking}
                disabled={!isFormValid || isProcessing}
                className="flex-1 font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ backgroundColor: primaryColor, color: buttonTextColor }}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating Booking...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Secure Checkout - ${totalPrice.toFixed(2)}
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
