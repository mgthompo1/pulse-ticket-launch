import React, { useEffect, useMemo, useRef } from "react";
import { Calendar, MapPin, Ticket, Minus, Plus, CreditCard, HelpCircle, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCheckoutEngine } from "@/hooks/useCheckoutEngine";
import { PromoCodeInput } from "@/components/checkout/PromoCodeInput";
import { MerchandiseCartItem, TicketType, CustomerInfo, EventData, CustomQuestion } from "@/types/widget";
import { StripePaymentForm } from "@/components/payment/StripePaymentForm";
import { Theme } from "@/types/theme";

interface SinglePageCheckoutProps {
  eventData: EventData;
  ticketTypes: TicketType[];
  customQuestions: CustomQuestion[];
  isDonationsEnabled: boolean;
  donationSuggestedAmounts: number[];
  donationTitle: string;
  donationDescription?: string | null;
  paymentProvider: string;
  stripePublishableKey: string;
  onCreateWindcaveSession?: () => Promise<void>;
  windcaveDropInContainer?: React.RefObject<HTMLDivElement>;
  windcaveReady?: boolean;
}

export const SinglePageCheckout: React.FC<SinglePageCheckoutProps> = ({
  eventData,
  ticketTypes,
  customQuestions,
  isDonationsEnabled,
  donationSuggestedAmounts,
  donationTitle,
  donationDescription,
  paymentProvider,
  stripePublishableKey,
  onCreateWindcaveSession,
  windcaveDropInContainer,
  windcaveReady,
}) => {
  const {
    cartItems,
    addToCart,
    updateQuantity,
    customerInfo,
    setCustomerInfo,
    selectedDonationAmount,
    setSelectedDonationAmount,
    customDonationAmount,
    setCustomDonationAmount,
    theme,
    cartTotals,
    promoHooks,
    taxBreakdown,
    merchandiseCart,
    setMerchandiseCart,
  } = useCheckoutEngine({
    eventData,
    ticketTypes,
  });

  const isStripePayment = paymentProvider === "stripe";
  const eventTheme: Theme = useMemo(() => theme, [theme]);

  const handleAddToCart = (ticketType: TicketType) => {
    addToCart(ticketType);
  };

  const applyDonation = (amount: number | null) => {
    setSelectedDonationAmount(amount);
    if (amount === null) {
      setCustomDonationAmount("");
    }
  };

  // Basic render of tax breakdown (if present)
  const taxRows = taxBreakdown?.breakdown || [];

  // Placeholder: Keep existing windcave trigger
  useEffect(() => {
    if (paymentProvider === "windcave" && onCreateWindcaveSession && windcaveReady) {
      onCreateWindcaveSession();
    }
  }, [paymentProvider, onCreateWindcaveSession, windcaveReady]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 px-4 pb-8">
      <div className="xl:col-span-2 space-y-6">
        {/* Ticket Selection */}
        <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold" style={{ color: eventTheme.headerTextColor }}>
              <Ticket className="h-6 w-6" />
              Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticketTypes.map((ticketType) => {
              const cartItem = cartItems.find((item) => item.id === ticketType.id);
              const remainingQuantity = (ticketType.quantity_available - ticketType.quantity_sold);

              return (
                <div key={ticketType.id} className="flex items-start justify-between p-4 rounded-lg border" style={{ borderColor: eventTheme.borderColor, backgroundColor: eventTheme.cardBackgroundColor }}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold" style={{ color: eventTheme.headerTextColor }}>{ticketType.name}</h3>
                      {remainingQuantity <= 5 && remainingQuantity > 0 && (
                        <Badge variant="destructive">Only {remainingQuantity} left</Badge>
                      )}
                      {remainingQuantity <= 0 && (
                        <Badge variant="destructive">Sold Out</Badge>
                      )}
                    </div>
                    {ticketType.description && (
                      <p className="text-sm" style={{ color: eventTheme.bodyTextColor }}>{ticketType.description}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold" style={{ color: eventTheme.headerTextColor }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: eventData.organizations?.currency || 'USD' }).format(ticketType.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cartItem ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0 rounded-lg"
                          onClick={() => updateQuantity(ticketType.id, Math.max(cartItem.quantity - 1, 0))}
                          disabled={cartItem.quantity <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm" style={{ color: eventTheme.headerTextColor }}>
                          {cartItem.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0 rounded-lg"
                          onClick={() => updateQuantity(ticketType.id, cartItem.quantity + 1)}
                          disabled={remainingQuantity <= cartItem.quantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleAddToCart(ticketType)}
                        size="sm"
                        className="px-4 font-semibold"
                        style={{
                          backgroundColor: eventTheme.primaryColor,
                          color: eventTheme.buttonTextColor,
                        }}
                        disabled={remainingQuantity <= 0}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold" style={{ color: eventTheme.headerTextColor }}>
              <Ticket className="h-6 w-6" />
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" style={{ color: eventTheme.bodyTextColor }}>Full Name *</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="mt-1"
                  style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                />
              </div>
              <div>
                <Label htmlFor="email" style={{ color: eventTheme.bodyTextColor }}>Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  className="mt-1"
                  style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                />
              </div>
              <div>
                <Label htmlFor="phone" style={{ color: eventTheme.bodyTextColor }}>Phone Number</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone || ''}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(123) 456-7890"
                  className="mt-1"
                  style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donations */}
        {isDonationsEnabled && (
          <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2" style={{ color: eventTheme.headerTextColor }}>
                <Heart className="h-5 w-5" />
                {donationTitle}
              </CardTitle>
              {donationDescription && (
                <p className="text-sm" style={{ color: eventTheme.bodyTextColor }}>
                  {donationDescription}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {donationSuggestedAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => applyDonation(amount)}
                    className={`font-semibold ${selectedDonationAmount === amount && !customDonationAmount ? 'ring-2' : ''}`}
                    style={{
                      borderColor: selectedDonationAmount === amount && !customDonationAmount ? eventTheme.primaryColor : eventTheme.borderColor,
                      color: selectedDonationAmount === amount && !customDonationAmount ? eventTheme.primaryColor : eventTheme.bodyTextColor,
                      backgroundColor: selectedDonationAmount === amount && !customDonationAmount ? `${eventTheme.primaryColor}10` : eventTheme.cardBackgroundColor,
                    }}
                  >
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: eventData.organizations?.currency || 'USD' }).format(amount)}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-sm" style={{ color: eventTheme.bodyTextColor }}>Custom Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={customDonationAmount}
                  onChange={(e) => {
                    setCustomDonationAmount(e.target.value);
                    const parsed = parseFloat(e.target.value);
                    applyDonation(!isNaN(parsed) && parsed > 0 ? parsed : null);
                  }}
                  className="max-w-xs"
                  style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Questions */}
        {customQuestions.length > 0 && (
          <Card className="animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
            <CardHeader>
              <CardTitle className="text-2xl font-bold" style={{ color: eventTheme.headerTextColor }}>
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label style={{ color: eventTheme.bodyTextColor }}>
                    {question.label || question.question}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {question.type === 'text' || question.type === 'email' || question.type === 'phone' ? (
                    <Input
                      type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'}
                      value={(customerInfo.customAnswers?.[question.id]) || ''}
                      onChange={(e) => setCustomerInfo(prev => ({
                        ...prev,
                        customAnswers: {
                          ...prev.customAnswers,
                          [question.id]: e.target.value,
                        },
                      }))}
                      className="mt-1"
                      style={{ backgroundColor: eventTheme.inputBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}
                    />
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Summary / Payment */}
      <div className="xl:col-span-1 space-y-4">
        <Card className="sticky top-6 animate-in fade-in-0" style={{ backgroundColor: eventTheme.cardBackgroundColor, border: eventTheme.borderEnabled ? `1px solid ${eventTheme.borderColor}` : undefined }}>
          <CardHeader>
            <CardTitle className="text-xl font-bold" style={{ color: eventTheme.headerTextColor }}>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: eventTheme.bodyTextColor }}>Subtotal</span>
                <span style={{ color: eventTheme.headerTextColor }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: cartTotals.currency }).format(cartTotals.subtotal)}
                </span>
              </div>
              {promoHooks?.promoDiscount ? (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: cartTotals.currency }).format(promoHooks.promoDiscount)}</span>
                </div>
              ) : null}
              {taxRows.length > 0 && (
                <div className="space-y-1">
                  {taxRows.map((row: any) => (
                    <div key={row.name} className="flex justify-between" style={{ color: eventTheme.bodyTextColor }}>
                      <span>{row.name}</span>
                      <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: cartTotals.currency }).format(row.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ color: eventTheme.headerTextColor, borderColor: eventTheme.borderColor }}>
                <span>Total</span>
                <span>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: cartTotals.currency }).format(cartTotals.total)}
                </span>
              </div>
            </div>

            <PromoCodeInput
              promoCode={promoHooks?.promoCode || ''}
              setPromoCode={promoHooks?.setPromoCode || (() => {})}
              applyPromoCode={promoHooks?.applyPromoCode || (() => {})}
              clearPromoCode={promoHooks?.clearPromoCode || (() => {})}
              promoError={promoHooks?.promoError || null}
              isValidating={promoHooks?.isValidating || false}
              promoDiscount={promoHooks?.promoDiscount || 0}
              buttonTextColor={eventTheme.buttonTextColor}
              primaryColor={eventTheme.primaryColor}
              borderColor={eventTheme.borderColor}
            />

            {/* Windcave payment */}
            {paymentProvider === "windcave" && (
              <div className="space-y-3">
                <Button
                  className="w-full h-12 text-lg font-semibold"
                  style={{ backgroundColor: eventTheme.primaryColor, color: eventTheme.buttonTextColor }}
                  onClick={onCreateWindcaveSession}
                  disabled={!windcaveReady}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay with Windcave
                </Button>
                <div className="rounded-md border p-3" ref={windcaveDropInContainer} />
              </div>
            )}

            {/* Stripe payment */}
            {paymentProvider === "stripe" && (
              <StripePaymentForm
                eventId={eventData.id}
                eventName={eventData.name}
                ticketTypes={ticketTypes}
                cartItems={cartItems}
                merchandiseCart={merchandiseCart as MerchandiseCartItem[]}
                customerInfo={customerInfo as CustomerInfo}
                theme={eventTheme}
                stripePublishableKey={stripePublishableKey}
                promoCodeId={promoHooks?.promoCodeId || null}
                promoDiscount={promoHooks?.getTotalDiscount() || 0}
                taxBreakdown={taxBreakdown}
                currency={cartTotals.currency}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
