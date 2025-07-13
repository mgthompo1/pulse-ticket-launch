import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Clock, Users, Ticket, CreditCard, ShoppingCart, Minus, Plus } from "lucide-react";

const TicketWidget = () => {
  const [ticketQuantities, setTicketQuantities] = useState({
    general: 0,
    vip: 0,
    student: 0
  });

  const [selectedSeats, setSelectedSeats] = useState([]);

  const ticketTypes = [
    {
      id: "general",
      name: "General Admission",
      price: 49,
      description: "Access to main event area",
      available: 245,
      total: 500
    },
    {
      id: "vip",
      name: "VIP Experience",
      price: 149,
      description: "Premium seating + backstage access",
      available: 23,
      total: 50
    },
    {
      id: "student",
      name: "Student Discount",
      price: 29,
      description: "Valid student ID required",
      available: 89,
      total: 100
    }
  ];

  const updateQuantity = (ticketId, change) => {
    setTicketQuantities(prev => ({
      ...prev,
      [ticketId]: Math.max(0, Math.min(10, prev[ticketId] + change))
    }));
  };

  const getTotalPrice = () => {
    return ticketTypes.reduce((total, ticket) => {
      return total + (ticket.price * ticketQuantities[ticket.id]);
    }, 0);
  };

  const getTotalTickets = () => {
    return Object.values(ticketQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Event Header */}
        <Card className="mb-8 gradient-card">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Tech Conference 2024
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join industry leaders for three days of innovation, networking, and cutting-edge technology discussions.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>March 15-17, 2024</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>San Francisco Convention Center</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>2,000 Expected Attendees</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ticket Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Select Your Tickets
                </CardTitle>
                <CardDescription>Choose your ticket type and quantity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{ticket.name}</h3>
                          <Badge variant={ticket.available > 10 ? "default" : "destructive"}>
                            {ticket.available} left
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">{ticket.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">${ticket.price}</span>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(ticket.id, -1)}
                              disabled={ticketQuantities[ticket.id] === 0}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {ticketQuantities[ticket.id]}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(ticket.id, 1)}
                              disabled={ticketQuantities[ticket.id] >= 10 || ticket.available === 0}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Seat Selection (if applicable) */}
            {getTotalTickets() > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose Your Seats</CardTitle>
                  <CardDescription>Select your preferred seating</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/20 p-6 rounded-lg text-center">
                    <div className="mb-4">
                      <div className="bg-primary/20 text-primary px-4 py-2 rounded inline-block text-sm font-medium">
                        STAGE
                      </div>
                    </div>
                    <div className="grid grid-cols-8 gap-1 max-w-md mx-auto">
                      {Array.from({ length: 64 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center cursor-pointer transition-colors ${
                            Math.random() > 0.3
                              ? "bg-muted hover:bg-primary/20"
                              : "bg-destructive/20 cursor-not-allowed"
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-muted rounded"></div>
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-primary rounded"></div>
                        <span>Selected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-destructive/20 rounded"></div>
                        <span>Unavailable</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketTypes.map((ticket) => 
                  ticketQuantities[ticket.id] > 0 && (
                    <div key={ticket.id} className="flex justify-between">
                      <div>
                        <p className="font-medium">{ticket.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${ticket.price} × {ticketQuantities[ticket.id]}
                        </p>
                      </div>
                      <span className="font-medium">
                        ${ticket.price * ticketQuantities[ticket.id]}
                      </span>
                    </div>
                  )
                )}
                
                {getTotalTickets() > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${getTotalPrice()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Service Fee</span>
                        <span>${Math.round(getTotalPrice() * 0.05)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${getTotalPrice() + Math.round(getTotalPrice() * 0.05)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {getTotalTickets() > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Attendee Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Enter your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="your@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="(555) 123-4567" />
                  </div>
                  <Button className="w-full gradient-primary hover-scale" size="lg">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to Payment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketWidget;