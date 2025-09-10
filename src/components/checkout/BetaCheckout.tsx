// @ts-nocheck
import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Info,
  ShoppingCart,
  CreditCard,
  Ticket,
  Star,
  Plus,
  Minus,
  X,
  // ArrowRight,
  // Lock,
} from 'lucide-react';

// Mock data for development
const mockEvent = {
  id: '123',
  name: 'Summer Music Festival 2024',
  description: 'Join us for an amazing day of music, food, and fun!',
  venue: 'Central Park Amphitheater',
  event_date: '2024-08-15T18:00:00Z',
  featured_image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
  capacity: 500,
  organizations: {
    name: 'Music Events Co',
    logo_url: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=200'
  }
};

const mockTicketTypes = [
  {
    id: '1',
    name: 'General Admission',
    description: 'Access to main event area',
    price: 75.00,
    available_quantity: 100,
    max_per_order: 8
  },
  {
    id: '2',
    name: 'VIP Package',
    description: 'Premium seating, complimentary drinks, and meet & greet',
    price: 150.00,
    available_quantity: 25,
    max_per_order: 4
  },
  {
    id: '3',
    name: 'Student Discount',
    description: 'Valid student ID required at entry',
    price: 50.00,
    available_quantity: 50,
    max_per_order: 2
  }
];

const mockAddOns = [
  {
    id: '1',
    name: 'Festival T-Shirt',
    description: 'Official event merchandise',
    price: 25.00,
    max_quantity: 5
  },
  {
    id: '2',
    name: 'Parking Pass',
    description: 'Guaranteed parking spot',
    price: 15.00,
    max_quantity: 1
  }
];

interface TicketQuantity {
  ticketTypeId: string;
  quantity: number;
}

interface AddOnQuantity {
  addOnId: string;
  quantity: number;
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export const BetaCheckout: React.FC = () => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const isEmbedded = searchParams.get('embedded') === 'true';

  // Form state
  const [selectedTickets, setSelectedTickets] = useState<TicketQuantity[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnQuantity[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [showEventInfo, setShowEventInfo] = useState(false);

  // Mock query for now - replace with actual data fetching
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockEvent;
    },
    enabled: !!eventId
  });

  const { data: ticketTypes, isLoading: ticketTypesLoading } = useQuery({
    queryKey: ['ticketTypes', eventId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockTicketTypes;
    },
    enabled: !!eventId
  });

  const { data: addOns, isLoading: addOnsLoading } = useQuery({
    queryKey: ['addOns', eventId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockAddOns;
    },
    enabled: !!eventId
  });

  const steps = [
    { number: 1, title: 'Select Tickets', description: 'Choose your ticket types' },
    { number: 2, title: 'Add-ons', description: 'Optional extras' },
    { number: 3, title: 'Your Details', description: 'Contact information' },
    { number: 4, title: 'Payment', description: 'Complete your order' }
  ];

  const updateTicketQuantity = (ticketTypeId: string, quantity: number) => {
    setSelectedTickets(prev => {
      const existing = prev.find(t => t.ticketTypeId === ticketTypeId);
      if (existing) {
        if (quantity === 0) {
          return prev.filter(t => t.ticketTypeId !== ticketTypeId);
        }
        return prev.map(t => 
          t.ticketTypeId === ticketTypeId ? { ...t, quantity } : t
        );
      }
      if (quantity > 0) {
        return [...prev, { ticketTypeId, quantity }];
      }
      return prev;
    });
  };

  const updateAddOnQuantity = (addOnId: string, quantity: number) => {
    setSelectedAddOns(prev => {
      const existing = prev.find(a => a.addOnId === addOnId);
      if (existing) {
        if (quantity === 0) {
          return prev.filter(a => a.addOnId !== addOnId);
        }
        return prev.map(a => 
          a.addOnId === addOnId ? { ...a, quantity } : a
        );
      }
      if (quantity > 0) {
        return [...prev, { addOnId, quantity }];
      }
      return prev;
    });
  };

  const getTicketQuantity = (ticketTypeId: string) => {
    return selectedTickets.find(t => t.ticketTypeId === ticketTypeId)?.quantity || 0;
  };

  const getAddOnQuantity = (addOnId: string) => {
    return selectedAddOns.find(a => a.addOnId === addOnId)?.quantity || 0;
  };

  const calculateSubtotal = () => {
    const ticketTotal = selectedTickets.reduce((total, ticket) => {
      const ticketType = ticketTypes?.find(tt => tt.id === ticket.ticketTypeId);
      return total + (ticketType?.price || 0) * ticket.quantity;
    }, 0);

    const addOnTotal = selectedAddOns.reduce((total, addOn) => {
      const addOnItem = addOns?.find(ao => ao.id === addOn.addOnId);
      return total + (addOnItem?.price || 0) * addOn.quantity;
    }, 0);

    return ticketTotal + addOnTotal;
  };

  const calculateProcessingFee = () => {
    const subtotal = calculateSubtotal();
    return subtotal * 0.029; // 2.9% processing fee
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateProcessingFee();
  };

  const getTotalTickets = () => {
    return selectedTickets.reduce((total, ticket) => total + ticket.quantity, 0);
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedTickets.length > 0;
      case 2:
        return true; // Add-ons are optional
      case 3:
        return customerInfo.firstName && customerInfo.lastName && customerInfo.email;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (canProceedToNextStep() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Loading state
  if (eventLoading || ticketTypesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading event details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-600">Event not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Price display component
  // const PriceDisplay = ({ price, currency = 'USD' }: { price: number; currency?: string }) => (
  //   <span className="font-semibold text-lg">
  //     ${price.toFixed(2)} {currency.toUpperCase()}
  //   </span>
  // );

  const EventInfoModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => setShowEventInfo(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="pr-8">{event.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.featured_image_url && (
            <img
              src={event.featured_image_url}
              alt={event.name}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarDays className="h-4 w-4" />
              <span>{new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{new Date(event.event_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{event.venue}</span>
            </div>
          </div>
          {event.description && (
            <div>
              <h4 className="font-semibold mb-2">About this event</h4>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Form state
  const [isLoading] = useState(false);
  const [loadingProgress] = useState(0);
  const [showMerchandise, setShowMerchandise] = useState(false);
  const [showAddOns, setShowAddOns] = useState(false);
  const [merchandiseCart] = useState<any[]>([]);

  const renderTicketSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Select Your Tickets</h3>
        <p className="text-gray-600 mb-6">Choose the ticket types and quantities you'd like to purchase.</p>
      </div>

      <div className="space-y-4">
        {ticketTypes?.map((ticketType) => (
          <Card key={ticketType.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-lg">{ticketType.name}</h4>
                    <Badge variant={ticketType.available_quantity > 10 ? "default" : "destructive"}>
                      {ticketType.available_quantity} left
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3">{ticketType.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Max {ticketType.max_per_order} per order
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ${ticketType.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">per ticket</div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTicketQuantity(ticketType.id, Math.max(0, getTicketQuantity(ticketType.id) - 1))}
                      disabled={getTicketQuantity(ticketType.id) === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <span className="w-8 text-center font-semibold">
                      {getTicketQuantity(ticketType.id)}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTicketQuantity(ticketType.id, Math.min(ticketType.max_per_order, getTicketQuantity(ticketType.id) + 1))}
                      disabled={getTicketQuantity(ticketType.id) >= ticketType.max_per_order || ticketType.available_quantity === 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTickets.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Selected: {getTotalTickets()} ticket{getTotalTickets() !== 1 ? 's' : ''}</p>
                <p className="text-sm text-gray-600">Subtotal: ${calculateSubtotal().toFixed(2)}</p>
              </div>
              <Button onClick={handleNextStep}>
                Continue to Add-ons
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAddOns = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Add-ons & Extras</h3>
        <p className="text-gray-600 mb-6">Enhance your experience with these optional add-ons.</p>
      </div>

      {addOns && addOns.length > 0 ? (
        <div className="space-y-4">
          {addOns.map((addOn) => (
            <Card key={addOn.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">{addOn.name}</h4>
                    <p className="text-gray-600 mb-3">{addOn.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        ${addOn.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">each</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateAddOnQuantity(addOn.id, Math.max(0, getAddOnQuantity(addOn.id) - 1))}
                        disabled={getAddOnQuantity(addOn.id) === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="w-8 text-center font-semibold">
                        {getAddOnQuantity(addOn.id)}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateAddOnQuantity(addOn.id, Math.min(addOn.max_quantity, getAddOnQuantity(addOn.id) + 1))}
                        disabled={getAddOnQuantity(addOn.id) >= addOn.max_quantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No add-ons available for this event.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={handlePrevStep}>
          Back to Tickets
        </Button>
        <Button onClick={handleNextStep} className="flex-1">
          Continue to Details
        </Button>
      </div>
    </div>
  );

  const renderCustomerDetails = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Your Details</h3>
        <p className="text-gray-600 mb-6">We'll need this information to send you your tickets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={customerInfo.firstName}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
            placeholder="Enter your first name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={customerInfo.lastName}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={customerInfo.email}
          onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Enter your email address"
        />
        <p className="text-sm text-gray-500">Your tickets will be sent to this email address</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={customerInfo.phone}
          onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="Enter your phone number (optional)"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handlePrevStep}>
          Back to Add-ons
        </Button>
        <Button onClick={handleNextStep} disabled={!canProceedToNextStep()} className="flex-1">
          Continue to Payment
        </Button>
      </div>
    </div>
  );

  const renderPayment = () => {
    // const isStripePayment = paymentProvider === 'stripe';
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Payment</h3>
          <p className="text-gray-600 mb-6">Complete your order with secure payment processing.</p>
        </div>

        <Card className="bg-gray-50">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4">Order Summary</h4>
            
            {selectedTickets.map((ticket) => {
              const ticketType = ticketTypes?.find(tt => tt.id === ticket.ticketTypeId);
              if (!ticketType) return null;
              
              return (
                <div key={ticket.ticketTypeId} className="flex justify-between items-center py-2">
                  <span>{ticketType.name} × {ticket.quantity}</span>
                  <span>${(ticketType.price * ticket.quantity).toFixed(2)}</span>
                </div>
              );
            })}
            
            {selectedAddOns.map((addOn) => {
              const addOnItem = addOns?.find(ao => ao.id === addOn.addOnId);
              if (!addOnItem) return null;
              
              return (
                <div key={addOn.addOnId} className="flex justify-between items-center py-2">
                  <span>{addOnItem.name} × {addOn.quantity}</span>
                  <span>${(addOnItem.price * addOn.quantity).toFixed(2)}</span>
                </div>
              );
            })}
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processing Fee (2.9%)</span>
                <span>${calculateProcessingFee().toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5" />
              <h4 className="font-semibold">Payment Information</h4>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                Secure payment processing powered by Stripe
              </p>
              
              <Button className="w-full" size="lg">
                Complete Payment - ${calculateTotal().toFixed(2)}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={handlePrevStep}>
          Back to Details
        </Button>
      </div>
    );
  };

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className={`min-h-screen ${isEmbedded ? 'bg-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Card className="overflow-hidden">
            <div className="relative">
              {event.featured_image_url && (
                <img
                  src={event.featured_image_url}
                  alt={event.name}
                  className="w-full h-32 sm:h-48 object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">{event.name}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.venue}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {}}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Event Info
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {steps.map((step) => (
                      <div
                        key={step.number}
                        className={`flex items-center gap-2 ${
                          step.number <= currentStep ? 'text-blue-600' : 'text-gray-400'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            step.number <= currentStep
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {step.number}
                        </div>
                        <span className="text-sm font-medium hidden sm:inline">
                          {step.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Progress value={progressPercentage} className="w-full" />
              </CardHeader>
              
              <CardContent>
                {currentStep === 1 && renderTicketSelection()}
                {currentStep === 2 && renderAddOns()}
                {currentStep === 3 && renderCustomerDetails()}
                {currentStep === 4 && renderPayment()}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(event.event_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{event.venue}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{event.capacity} capacity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            {(selectedTickets.length > 0 || selectedAddOns.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTickets.map((ticket) => {
                    const ticketType = ticketTypes?.find(tt => tt.id === ticket.ticketTypeId);
                    if (!ticketType) return null;
                    
                    return (
                      <div key={ticket.ticketTypeId} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{ticketType.name}</p>
                          <p className="text-sm text-gray-600">Qty: {ticket.quantity}</p>
                        </div>
                        <p className="font-semibold">
                          ${(ticketType.price * ticket.quantity).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                  
                  {selectedAddOns.map((addOn) => {
                    const addOnItem = addOns?.find(ao => ao.id === addOn.addOnId);
                    if (!addOnItem) return null;
                    
                    return (
                      <div key={addOn.addOnId} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{addOnItem.name}</p>
                          <p className="text-sm text-gray-600">Qty: {addOn.quantity}</p>
                        </div>
                        <p className="font-semibold">
                          ${(addOnItem.price * addOn.quantity).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium">Subtotal</p>
                    <p className="font-semibold">${calculateSubtotal().toFixed(2)}</p>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-gray-600">Processing Fee</p>
                    <p className="text-gray-600">${calculateProcessingFee().toFixed(2)}</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <p>Total</p>
                    <p>${calculateTotal().toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organizer Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {event.organizations?.logo_url && (
                    <img
                      src={event.organizations.logo_url}
                      alt={event.organizations.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium">Organized by</p>
                    <p className="text-sm text-gray-600">{event.organizations?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showEventInfo && <EventInfoModal />}
    </div>
  );
};

export default BetaCheckout;