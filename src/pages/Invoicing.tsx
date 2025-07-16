import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, 
  Mail, 
  Plus, 
  Trash2, 
  Calculator, 
  Building, 
  User, 
  Calendar, 
  CreditCard,
  Download,
  Send,
  DollarSign
} from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  // Company Information
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  companyPhone: string;
  companyEmail: string;
  // Client Information
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  clientPhone: string;
  // Event Information
  eventName: string;
  eventDate: string;
  eventVenue: string;
  // Invoice Items
  items: InvoiceItem[];
  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  // Payment Terms
  paymentTerms: string;
  notes: string;
  // Payment Status
  status: 'draft' | 'sent' | 'paid' | 'overdue';
}

const Invoicing = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const dropInRef = useRef<HTMLDivElement>(null);
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyPostalCode: '',
    companyPhone: '',
    companyEmail: '',
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    clientCity: '',
    clientPostalCode: '',
    clientPhone: '',
    eventName: '',
    eventDate: '',
    eventVenue: '',
    items: [
      {
        id: '1',
        description: 'Event Services',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ],
    subtotal: 0,
    taxRate: 15, // Default GST rate for NZ
    taxAmount: 0,
    total: 0,
    paymentTerms: 'Payment due within 30 days. Late payments may incur additional fees.',
    notes: '',
    status: 'draft'
  });

  useEffect(() => {
    loadOrganizationData();
    loadEvents();
  }, [user]);

  useEffect(() => {
    calculateTotals();
  }, [invoiceData.items, invoiceData.taxRate]);

  const loadOrganizationData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setOrganizationData(data);
        setInvoiceData(prev => ({
          ...prev,
          companyName: data.name || '',
          companyEmail: data.email || '',
        }));
      }
    } catch (error) {
      console.error("Error loading organization:", error);
    }
  };

  const loadEvents = async () => {
    if (!user) return;
    
    try {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (orgData) {
        const { data: eventsData, error } = await supabase
          .from("events")
          .select("*")
          .eq("organization_id", orgData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setEvents(eventsData || []);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const calculateTotals = () => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * invoiceData.taxRate) / 100;
    const total = subtotal + taxAmount;

    setInvoiceData(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      total
    }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updated.amount = updated.quantity * updated.rate;
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (id: string) => {
    if (invoiceData.items.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "Invoice must have at least one item",
        variant: "destructive"
      });
      return;
    }
    
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleEventSelect = (eventId: string) => {
    const selectedEvent = events.find(e => e.id === eventId);
    if (selectedEvent) {
      setInvoiceData(prev => ({
        ...prev,
        eventName: selectedEvent.name,
        eventDate: selectedEvent.event_date,
        eventVenue: selectedEvent.venue || ''
      }));
    }
  };

  const sendInvoiceEmail = async () => {
    if (!invoiceData.clientEmail) {
      toast({
        title: "Error",
        description: "Client email is required to send invoice",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: { 
          invoiceData,
          organizationData
        }
      });

      if (error) throw error;

      setInvoiceData(prev => ({ ...prev, status: 'sent' }));
      toast({
        title: "Invoice Sent",
        description: "Invoice has been sent to the client successfully"
      });
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast({
        title: "Error",
        description: "Failed to send invoice email",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    if (invoiceData.total <= 0) {
      toast({
        title: "Error",
        description: "Invoice total must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (!organizationData?.windcave_enabled) {
      toast({
        title: "Payment Not Available",
        description: "Windcave payment is not configured for this organization",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("windcave-session", {
        body: {
          amount: invoiceData.total,
          currency: organizationData.currency || 'NZD',
          description: `Invoice ${invoiceData.invoiceNumber} - ${invoiceData.eventName}`,
          customerInfo: {
            name: invoiceData.clientName,
            email: invoiceData.clientEmail
          }
        }
      });

      if (error) throw error;

      if (data.links && Array.isArray(data.links)) {
        setShowPaymentForm(true);
        // Initialize Windcave Drop-In here
        setTimeout(() => {
          initializeWindcaveDropIn(data.links, invoiceData.total);
        }, 100);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: "Failed to initialize payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeWindcaveDropIn = (links: any[], amount: number) => {
    // Windcave Drop-In initialization logic would go here
    // This is a placeholder for the actual Windcave integration
    console.log("Initializing Windcave Drop-In with links:", links, "amount:", amount);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Invoice Generator
            </h1>
            <p className="text-muted-foreground">Create and send professional invoices for your events</p>
          </div>
          <Badge variant={
            invoiceData.status === 'paid' ? 'default' : 
            invoiceData.status === 'sent' ? 'secondary' : 
            invoiceData.status === 'overdue' ? 'destructive' : 'outline'
          }>
            {invoiceData.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={invoiceData.invoiceDate}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={invoiceData.companyName}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={invoiceData.companyEmail}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, companyEmail: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="companyAddress">Address</Label>
                  <Input
                    id="companyAddress"
                    value={invoiceData.companyAddress}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, companyAddress: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="companyCity">City</Label>
                    <Input
                      id="companyCity"
                      value={invoiceData.companyCity}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, companyCity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyPostalCode">Postal Code</Label>
                    <Input
                      id="companyPostalCode"
                      value={invoiceData.companyPostalCode}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, companyPostalCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyPhone">Phone</Label>
                    <Input
                      id="companyPhone"
                      value={invoiceData.companyPhone}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, companyPhone: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      value={invoiceData.clientName}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, clientName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={invoiceData.clientEmail}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, clientEmail: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="clientAddress">Address</Label>
                  <Input
                    id="clientAddress"
                    value={invoiceData.clientAddress}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, clientAddress: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="clientCity">City</Label>
                    <Input
                      id="clientCity"
                      value={invoiceData.clientCity}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, clientCity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPostalCode">Postal Code</Label>
                    <Input
                      id="clientPostalCode"
                      value={invoiceData.clientPostalCode}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, clientPostalCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Phone</Label>
                    <Input
                      id="clientPhone"
                      value={invoiceData.clientPhone}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, clientPhone: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Information */}
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="eventSelect">Select Event (Optional)</Label>
                  <Select onValueChange={handleEventSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event to auto-fill details" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name} - {new Date(event.event_date).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventName">Event Name</Label>
                    <Input
                      id="eventName"
                      value={invoiceData.eventName}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, eventName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventDate">Event Date</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={invoiceData.eventDate}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, eventDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="eventVenue">Venue</Label>
                  <Input
                    id="eventVenue"
                    value={invoiceData.eventVenue}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, eventVenue: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Services & Pricing
                  </span>
                  <Button onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoiceData.items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label htmlFor={`description-${item.id}`}>Description</Label>
                        <Input
                          id={`description-${item.id}`}
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Service description"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`quantity-${item.id}`}>Qty</Label>
                        <Input
                          id={`quantity-${item.id}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`rate-${item.id}`}>Rate</Label>
                        <Input
                          id={`rate-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Amount</Label>
                        <Input
                          value={`$${item.amount.toFixed(2)}`}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          onClick={() => removeItem(item.id)}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                {/* Tax Rate */}
                <div className="flex justify-end">
                  <div className="w-48 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${invoiceData.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span>Tax Rate:</span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={invoiceData.taxRate}
                          onChange={(e) => setInvoiceData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                          className="w-16 h-6 text-xs"
                        />
                        <span>%</span>
                      </div>
                      <span>${invoiceData.taxAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${invoiceData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms & Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Terms & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Textarea
                    id="paymentTerms"
                    value={invoiceData.paymentTerms}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={invoiceData.notes}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional information for the client..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions & Payment */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={sendInvoiceEmail} 
                  disabled={loading || !invoiceData.clientEmail}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {loading ? "Sending..." : "Send Invoice"}
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                
                <Button 
                  onClick={initiatePayment}
                  disabled={loading || invoiceData.total <= 0}
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Collect Payment
                </Button>
              </CardContent>
            </Card>

            {/* Payment Form */}
            {showPaymentForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment Collection
                  </CardTitle>
                  <CardDescription>
                    Total Amount: ${invoiceData.total.toFixed(2)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    id="windcave-drop-in"
                    ref={dropInRef}
                    className="min-h-[300px] border rounded-lg p-4"
                  >
                    {/* Windcave Drop-In will be rendered here */}
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>Loading payment form...</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowPaymentForm(false)}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    Cancel Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Invoice Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Invoice #:</span>
                  <span className="font-mono">{invoiceData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(invoiceData.invoiceDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span>{new Date(invoiceData.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{invoiceData.items.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${invoiceData.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoicing;