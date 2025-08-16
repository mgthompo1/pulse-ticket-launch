import React, { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { TicketSelection } from './TicketSelection';
import { AddOnsSelection } from './AddOnsSelection';
import { CustomerDetails } from './CustomerDetails';
import { Payment } from './Payment';
import { OrderSummary } from './OrderSummary';
import { TicketType, CartItem, MerchandiseCartItem, CustomerInfo, EventData, CustomQuestion } from '@/types/widget';

interface MultiStepCheckoutProps {
  eventData: EventData;
  ticketTypes: TicketType[];
  customQuestions: CustomQuestion[];
  onClose?: () => void;
}

type CheckoutStep = 'tickets' | 'addons' | 'details' | 'payment';

export const MultiStepCheckout: React.FC<MultiStepCheckoutProps> = ({
  eventData,
  ticketTypes,
  customQuestions,
}) => {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('tickets');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [merchandiseCart, setMerchandiseCart] = useState<MerchandiseCartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const steps = [
    { key: 'tickets', label: 'Tickets', progress: 25 },
    { key: 'addons', label: 'Add-ons', progress: 50 },
    { key: 'details', label: 'Details', progress: 75 },
    { key: 'payment', label: 'Payment', progress: 100 }
  ];

  const currentStepData = steps.find(step => step.key === currentStep);

  const addToCart = (ticketType: TicketType) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === ticketType.id);
      
      if (existingItem) {
        return prev.map(item =>
          item.id === ticketType.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      return [...prev, {
        ...ticketType,
        quantity: 1,
        type: 'ticket' as const,
        selectedSeats: []
      }];
    });
  };

  const updateTicketQuantity = (ticketTypeId: string, quantity: number) => {
    setCartItems(prev => {
      if (quantity === 0) {
        return prev.filter(item => item.id !== ticketTypeId);
      }
      
      return prev.map(item =>
        item.id === ticketTypeId ? { ...item, quantity } : item
      );
    });
  };

  const nextStep = () => {
    const stepOrder: CheckoutStep[] = ['tickets', 'addons', 'details', 'payment'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const stepOrder: CheckoutStep[] = ['tickets', 'addons', 'details', 'payment'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleCustomerDetails = (info: CustomerInfo) => {
    setCustomerInfo(info);
    nextStep();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Event Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{eventData.name}</h1>
              {eventData.venue && (
                <p className="text-muted-foreground mt-2">{eventData.venue}</p>
              )}
            </div>
            {eventData.logo_url && (
              <img 
                src={eventData.logo_url} 
                alt={`${eventData.name} logo`}
                className="h-16 w-auto"
              />
            )}
          </div>
        </div>

        {/* Progress Bar - Full Width */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step) => (
              <div
                key={step.key}
                className={`text-sm font-medium ${
                  currentStep === step.key 
                    ? 'text-neutral-900' 
                    : steps.findIndex(s => s.key === currentStep) > steps.findIndex(s => s.key === step.key)
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/50'
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
          <Progress value={currentStepData?.progress || 0} className="h-2 [&>div]:bg-neutral-900" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step Content */}
            {currentStep === 'tickets' && (
              <TicketSelection
                ticketTypes={ticketTypes}
                cartItems={cartItems}
                onAddToCart={addToCart}
                onNext={nextStep}
              />
            )}

            {currentStep === 'addons' && (
              <AddOnsSelection
                eventId={eventData.id}
                merchandiseCart={merchandiseCart}
                onMerchandiseCartUpdate={setMerchandiseCart}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {currentStep === 'details' && (
              <CustomerDetails
                customQuestions={customQuestions}
                onNext={handleCustomerDetails}
                onBack={prevStep}
              />
            )}

            {currentStep === 'payment' && customerInfo && (
              <Payment
                eventData={eventData}
                cartItems={cartItems}
                merchandiseCart={merchandiseCart}
                customerInfo={customerInfo}
              />
            )}
          </div>

          {/* Order Summary Sidebar - Better alignment approach */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Use CSS Grid to align with the main content */}
              <div className={currentStep === 'tickets' ? 'mt-14' : ''}>
                <OrderSummary
                  eventData={eventData}
                  cartItems={cartItems}
                  merchandiseCart={merchandiseCart}
                  currentStep={currentStep}
                  customerInfo={customerInfo}
                  onUpdateTicketQuantity={updateTicketQuantity}
                  onBack={prevStep}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};