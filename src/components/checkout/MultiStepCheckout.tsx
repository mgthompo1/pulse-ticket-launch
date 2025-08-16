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

  const updateTicketQuantity = (ticketTypeId: string, quantity: number) => {
    const ticketType = ticketTypes.find(t => t.id === ticketTypeId);
    if (!ticketType) return;

    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === ticketTypeId);
      
      if (quantity === 0) {
        return prev.filter(item => item.id !== ticketTypeId);
      }
      
      if (existingItem) {
        return prev.map(item =>
          item.id === ticketTypeId ? { ...item, quantity } : item
        );
      }
      
      return [...prev, {
        ...ticketType,
        quantity,
        type: 'ticket' as const,
        selectedSeats: []
      }];
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
        <div className="mb-8 text-center">
          {eventData.logo_url && (
            <img 
              src={eventData.logo_url} 
              alt={`${eventData.name} logo`}
              className="h-16 w-auto mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-foreground">{eventData.name}</h1>
          {eventData.venue && (
            <p className="text-muted-foreground mt-2">{eventData.venue}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                {steps.map((step) => (
                  <div
                    key={step.key}
                    className={`text-sm font-medium ${
                      currentStep === step.key 
                        ? 'text-primary' 
                        : steps.findIndex(s => s.key === currentStep) > steps.findIndex(s => s.key === step.key)
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/50'
                    }`}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
              <Progress value={currentStepData?.progress || 0} className="h-2" />
            </div>

            {/* Step Content */}
            {currentStep === 'tickets' && (
              <TicketSelection
                ticketTypes={ticketTypes}
                cartItems={cartItems}
                onUpdateQuantity={updateTicketQuantity}
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
                onBack={prevStep}
              />
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <OrderSummary
                eventData={eventData}
                cartItems={cartItems}
                merchandiseCart={merchandiseCart}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};