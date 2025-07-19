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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [savedInvoices, setSavedInvoices] = useState<any[]>([]);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [showInvoiceList, setShowInvoiceList] = useState(false);
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
    loadSavedInvoices();
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

  const loadSavedInvoices = async () => {
    if (!user) return;
    
    try {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (orgData) {
        const { data: invoicesData, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("organization_id", orgData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSavedInvoices(invoicesData || []);
      }
    } catch (error) {
      console.error("Error loading saved invoices:", error);
    }
  };

  const saveInvoice = async () => {
    if (!user || !organizationData) return;
    
    setLoading(true);
    try {
      console.log("=== SAVING INVOICE ===");
      console.log("Current paymentUrl:", paymentUrl);
      console.log("Windcave enabled:", organizationData.windcave_enabled);
      console.log("Invoice total:", invoiceData.total);
      
      const invoicePayload = {
        organization_id: organizationData.id,
        invoice_number: invoiceData.invoiceNumber,
        invoice_date: invoiceData.invoiceDate,
        due_date: invoiceData.dueDate,
        company_name: invoiceData.companyName,
        company_address: invoiceData.companyAddress,
        company_city: invoiceData.companyCity,
        company_postal_code: invoiceData.companyPostalCode,
        company_phone: invoiceData.companyPhone,
        company_email: invoiceData.companyEmail,
        client_name: invoiceData.clientName,
        client_email: invoiceData.clientEmail,
        client_address: invoiceData.clientAddress,
        client_city: invoiceData.clientCity,
        client_postal_code: invoiceData.clientPostalCode,
        client_phone: invoiceData.clientPhone,
        event_name: invoiceData.eventName,
        event_date: invoiceData.eventDate,
        event_venue: invoiceData.eventVenue,
        items: invoiceData.items as any,
        subtotal: invoiceData.subtotal,
        tax_rate: invoiceData.taxRate,
        tax_amount: invoiceData.taxAmount,
        total: invoiceData.total,
        payment_terms: invoiceData.paymentTerms,
        notes: invoiceData.notes,
        status: invoiceData.status,
        payment_url: paymentUrl // Use existing payment URL initially
      };

      console.log("Saving invoice with current payment URL:", paymentUrl);

      let result;
      if (currentInvoiceId) {
        // Update existing invoice
        result = await supabase
          .from("invoices")
          .update(invoicePayload)
          .eq("id", currentInvoiceId)
          .select()
          .single();
      } else {
        // Create new invoice
        result = await supabase
          .from("invoices")
          .insert(invoicePayload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (result.data) {
        const savedInvoiceId = result.data.id;
        setCurrentInvoiceId(savedInvoiceId);
        
        // Generate payment URL AFTER saving (since we need the invoice ID)
        let finalPaymentUrl = paymentUrl;
        if (!finalPaymentUrl && organizationData && (organizationData.windcave_enabled || organizationData.payment_provider === "stripe") && invoiceData.total > 0) {
          console.log("Generating payment URL after saving...");
          finalPaymentUrl = await generatePaymentUrl() || '';
          console.log("Generated payment URL:", finalPaymentUrl);
          
          // Update the invoice with the payment URL
          if (finalPaymentUrl) {
            const { error: updateError } = await supabase
              .from("invoices")
              .update({ payment_url: finalPaymentUrl })
              .eq("id", savedInvoiceId);
            
            if (updateError) {
              console.error("Error updating invoice with payment URL:", updateError);
            } else {
              console.log("Invoice updated with payment URL");
            }
          }
        }
        
        // Update the payment URL state
        if (finalPaymentUrl) {
          setPaymentUrl(finalPaymentUrl);
        }
        
        toast({
          title: "Invoice Saved",
          description: `Invoice ${invoiceData.invoiceNumber} has been saved successfully`
        });
        console.log("Invoice saved successfully with payment URL:", finalPaymentUrl);
        loadSavedInvoices(); // Refresh the saved invoices list
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Error",
        description: "Failed to save invoice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInvoice = (savedInvoice: any) => {
    console.log("=== LOADING INVOICE ===");
    console.log("Saved invoice data:", savedInvoice);
    console.log("Payment URL from saved invoice:", savedInvoice.payment_url);
    
    setInvoiceData({
      invoiceNumber: savedInvoice.invoice_number,
      invoiceDate: savedInvoice.invoice_date,
      dueDate: savedInvoice.due_date,
      companyName: savedInvoice.company_name,
      companyAddress: savedInvoice.company_address || '',
      companyCity: savedInvoice.company_city || '',
      companyPostalCode: savedInvoice.company_postal_code || '',
      companyPhone: savedInvoice.company_phone || '',
      companyEmail: savedInvoice.company_email || '',
      clientName: savedInvoice.client_name,
      clientEmail: savedInvoice.client_email,
      clientAddress: savedInvoice.client_address || '',
      clientCity: savedInvoice.client_city || '',
      clientPostalCode: savedInvoice.client_postal_code || '',
      clientPhone: savedInvoice.client_phone || '',
      eventName: savedInvoice.event_name || '',
      eventDate: savedInvoice.event_date || '',
      eventVenue: savedInvoice.event_venue || '',
      items: savedInvoice.items || [],
      subtotal: savedInvoice.subtotal,
      taxRate: savedInvoice.tax_rate,
      taxAmount: savedInvoice.tax_amount,
      total: savedInvoice.total,
      paymentTerms: savedInvoice.payment_terms || '',
      notes: savedInvoice.notes || '',
      status: savedInvoice.status as 'draft' | 'sent' | 'paid' | 'overdue'
    });
    setCurrentInvoiceId(savedInvoice.id);
    setPaymentUrl(savedInvoice.payment_url || '');
    setShowInvoiceList(false);
    
    console.log("Invoice loaded, payment URL set to:", savedInvoice.payment_url || '');
  };

  const createNewInvoice = () => {
    console.log("=== CREATING NEW INVOICE ===");
    setInvoiceData({
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      companyName: organizationData?.name || '',
      companyAddress: organizationData?.address || '',
      companyCity: organizationData?.city || '',
      companyPostalCode: organizationData?.postal_code || '',
      companyPhone: organizationData?.phone || '',
      companyEmail: organizationData?.email || '',
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
      taxRate: 15,
      taxAmount: 0,
      total: 0,
      paymentTerms: 'Payment due within 30 days. Late payments may incur additional fees.',
      notes: '',
      status: 'draft'
    });
    setCurrentInvoiceId(null);
    setPaymentUrl('');
    setShowInvoiceList(false);
    console.log("New invoice created, payment URL reset");
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
      // Generate payment URL if possible
      if (!paymentUrl && organizationData && (organizationData.windcave_enabled || organizationData.payment_provider === "stripe") && invoiceData.total > 0) {
        const generatedUrl = await generatePaymentUrl();
        if (generatedUrl) {
          // Save the invoice with the payment URL
          await saveInvoice();
        }
      }

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

  const generatePaymentUrl = async () => {
    console.log("=== GENERATING PAYMENT URL ===");
    if (invoiceData.total <= 0) {
      console.log("Payment URL generation skipped - total:", invoiceData.total);
      return null;
    }

    if (!organizationData) {
      console.log("No organization data available");
      return null;
    }

    if (!currentInvoiceId) {
      console.log("No invoice ID available - invoice must be saved first");
      toast({
        title: "Save Invoice First",
        description: "Please save the invoice before generating payment link",
        variant: "destructive"
      });
      return null;
    }

    const paymentProvider = organizationData.payment_provider;
    console.log("Payment provider:", paymentProvider);

    try {
      if (paymentProvider === "stripe") {
        // Use Stripe for payment processing
        console.log("Calling stripe-invoice-payment with invoice ID:", currentInvoiceId);

        const { data, error } = await supabase.functions.invoke("stripe-invoice-payment", {
          body: {
            invoiceId: currentInvoiceId
          }
        });

        if (error) {
          console.error("Stripe invoice payment error:", error);
          throw error;
        }

        console.log("Stripe invoice payment response:", data);

        if (data.paymentUrl) {
          console.log("Generated Stripe payment URL:", data.paymentUrl);
          return data.paymentUrl;
        } else {
          console.log("No payment URL found in Stripe response");
        }

      } else if (paymentProvider === "windcave" && organizationData.windcave_enabled) {
        // Use Windcave for payment processing
        console.log("Calling windcave-invoice-payment with invoice ID:", currentInvoiceId);

        const { data, error } = await supabase.functions.invoke("windcave-invoice-payment", {
          body: {
            invoiceId: currentInvoiceId,
            invoiceData: {
              total: invoiceData.total,
              clientName: invoiceData.clientName,
              clientEmail: invoiceData.clientEmail,
              clientPhone: invoiceData.clientPhone,
              invoiceNumber: invoiceData.invoiceNumber
            }
          }
        });

        if (error) {
          console.error("Windcave invoice payment error:", error);
          throw error;
        }

        console.log("Windcave invoice payment response:", data);

        if (data.links && Array.isArray(data.links)) {
          console.log("Available payment links:", data.links);
          // Find the payment URL (use the hpp link for hosted payment page)
          const paymentLink = data.links.find(link => link.rel === "hpp");
          if (paymentLink) {
            const generatedUrl = paymentLink.href;
            console.log("Generated Windcave payment URL:", generatedUrl);
            return generatedUrl;
          } else {
            console.log("No suitable payment link found in response");
          }
        } else {
          console.log("No links found in windcave response");
        }

      } else {
        console.log("No valid payment provider configured");
        toast({
          title: "Payment Provider Not Configured",
          description: `Please configure ${paymentProvider || 'a payment provider'} in your organization settings`,
          variant: "destructive"
        });
        return null;
      }

    } catch (error) {
      console.error("Error generating payment URL:", error);
      toast({
        title: "Payment URL Generation Failed",
        description: "Could not generate payment link. Please try again.",
        variant: "destructive"
      });
      return null;
    }
    return null;
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

    // Check if we have a selected event, otherwise use a default one
    let eventId = null;
    if (events.length > 0) {
      // Use the first event if available, or create a minimal event representation
      eventId = events[0].id;
    } else {
      toast({
        title: "Error",
        description: "No events available for payment processing",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create invoice items in the format expected by windcave-session
      const items = invoiceData.items.map(item => ({
        id: item.id,
        type: 'service',
        description: item.description,
        quantity: item.quantity,
        price: item.rate
      }));

      const { data, error } = await supabase.functions.invoke("windcave-session", {
        body: {
          eventId: eventId,
          items: items,
          customerInfo: {
            name: invoiceData.clientName,
            email: invoiceData.clientEmail,
            phone: invoiceData.clientPhone
          }
        }
      });

      if (error) throw error;

      if (data.links && Array.isArray(data.links)) {
        // Store payment URL for invoice
        const paymentLink = data.links.find(link => link.method === "GET" || link.rel === "payment");
        if (paymentLink) {
          setPaymentUrl(paymentLink.href);
        }
        
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
    if (!dropInRef.current) {
      console.error("Drop-In container not found");
      return;
    }

    // Find the dropin link
    const dropInLink = links.find(link => link.method === "IFRAME" || link.rel === "dropin");
    
    if (!dropInLink) {
      console.error("Drop-In link not found in response");
      toast({
        title: "Error",
        description: "Payment interface not available",
        variant: "destructive"
      });
      return;
    }

    // Clear any existing content
    dropInRef.current.innerHTML = '';

    // Create iframe for Windcave Drop-In
    const iframe = document.createElement('iframe');
    iframe.src = dropInLink.href;
    iframe.width = '100%';
    iframe.height = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    
    // Add iframe to container
    dropInRef.current.appendChild(iframe);

    // Listen for payment completion messages
    const messageHandler = (event: MessageEvent) => {
      // Only accept messages from Windcave domain
      if (!event.origin.includes('windcave.com')) {
        return;
      }

      console.log("Received message from Windcave:", event.data);

      if (event.data.type === 'payment.success') {
        // Payment successful
        setInvoiceData(prev => ({ ...prev, status: 'paid' }));
        setShowPaymentForm(false);
        toast({
          title: "Payment Successful",
          description: "Invoice has been paid successfully",
        });
      } else if (event.data.type === 'payment.failure') {
        // Payment failed
        toast({
          title: "Payment Failed",
          description: "Payment could not be processed",
          variant: "destructive"
        });
      } else if (event.data.type === 'payment.cancelled') {
        // Payment cancelled
        setShowPaymentForm(false);
        toast({
          title: "Payment Cancelled",
          description: "Payment was cancelled by user",
          variant: "destructive"
        });
      }
    };

    // Add event listener
    window.addEventListener('message', messageHandler);

    // Cleanup function
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  };

  const downloadPDF = async () => {
    try {
      setLoading(true);
      
      // Create a temporary container for the invoice content
      const invoiceContainer = document.createElement('div');
      invoiceContainer.style.width = '800px';
      invoiceContainer.style.padding = '40px';
      invoiceContainer.style.backgroundColor = 'white';
      invoiceContainer.style.fontFamily = 'Arial, sans-serif';
      invoiceContainer.style.position = 'absolute';
      invoiceContainer.style.left = '-9999px';
      invoiceContainer.style.top = '0';
      
      // Generate invoice HTML
      invoiceContainer.innerHTML = `
        <!-- Header with Logo and Invoice Title -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #333;">
          <div style="flex: 1;">
            ${organizationData?.logo_url ? `
              <img src="${organizationData.logo_url}" alt="${invoiceData.companyName}" style="max-height: 80px; max-width: 200px; margin-bottom: 10px;" />
            ` : ''}
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: bold;">INVOICE</h1>
          </div>
          <div style="text-align: right; flex: 1;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">${invoiceData.invoiceNumber}</p>
            <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">Issue Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
            <div style="margin-top: 15px; padding: 8px 15px; background: ${invoiceData.status === 'paid' ? '#d4edda' : '#fff3cd'}; border-radius: 4px; border: 1px solid ${invoiceData.status === 'paid' ? '#c3e6cb' : '#ffeaa7'};">
              <span style="font-weight: bold; color: ${invoiceData.status === 'paid' ? '#155724' : '#856404'}; text-transform: uppercase; font-size: 12px;">${invoiceData.status}</span>
            </div>
          </div>
        </div>

        <!-- Company and Client Information -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div style="width: 45%; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">From</h3>
            <div style="color: #666; line-height: 1.6;">
              <p style="margin: 0; font-weight: bold; font-size: 16px; color: #333;">${invoiceData.companyName}</p>
              ${invoiceData.companyAddress ? `<p style="margin: 8px 0 0 0;">${invoiceData.companyAddress}</p>` : ''}
              ${invoiceData.companyCity || invoiceData.companyPostalCode ? `<p style="margin: 5px 0 0 0;">${invoiceData.companyCity}${invoiceData.companyCity && invoiceData.companyPostalCode ? ', ' : ''}${invoiceData.companyPostalCode}</p>` : ''}
              ${invoiceData.companyPhone ? `<p style="margin: 5px 0 0 0;"><strong>Phone:</strong> ${invoiceData.companyPhone}</p>` : ''}
              ${invoiceData.companyEmail ? `<p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${invoiceData.companyEmail}</p>` : ''}
            </div>
          </div>
          <div style="width: 45%; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">To</h3>
            <div style="color: #666; line-height: 1.6;">
              <p style="margin: 0; font-weight: bold; font-size: 16px; color: #333;">${invoiceData.clientName}</p>
              ${invoiceData.clientAddress ? `<p style="margin: 8px 0 0 0;">${invoiceData.clientAddress}</p>` : ''}
              ${invoiceData.clientCity || invoiceData.clientPostalCode ? `<p style="margin: 5px 0 0 0;">${invoiceData.clientCity}${invoiceData.clientCity && invoiceData.clientPostalCode ? ', ' : ''}${invoiceData.clientPostalCode}</p>` : ''}
              ${invoiceData.clientPhone ? `<p style="margin: 5px 0 0 0;"><strong>Phone:</strong> ${invoiceData.clientPhone}</p>` : ''}
              ${invoiceData.clientEmail ? `<p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${invoiceData.clientEmail}</p>` : ''}
            </div>
          </div>
        </div>

        ${invoiceData.eventName ? `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #333; margin: 0 0 10px 0;">Event Details</h3>
          <p style="margin: 0; color: #666;"><strong>Event:</strong> ${invoiceData.eventName}</p>
          <p style="margin: 5px 0 0 0; color: #666;"><strong>Date:</strong> ${invoiceData.eventDate ? new Date(invoiceData.eventDate).toLocaleDateString() : 'N/A'}</p>
          <p style="margin: 5px 0 0 0; color: #666;"><strong>Venue:</strong> ${invoiceData.eventVenue}</p>
        </div>
        ` : ''}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6;">Description</th>
              <th style="padding: 15px; text-align: center; border-bottom: 2px solid #dee2e6; width: 80px;">Qty</th>
              <th style="padding: 15px; text-align: right; border-bottom: 2px solid #dee2e6; width: 100px;">Rate</th>
              <th style="padding: 15px; text-align: right; border-bottom: 2px solid #dee2e6; width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items.map(item => `
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #dee2e6;">${item.description}</td>
                <td style="padding: 15px; text-align: center; border-bottom: 1px solid #dee2e6;">${item.quantity}</td>
                <td style="padding: 15px; text-align: right; border-bottom: 1px solid #dee2e6;">$${item.rate.toFixed(2)}</td>
                <td style="padding: 15px; text-align: right; border-bottom: 1px solid #dee2e6;">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <span>Subtotal:</span>
              <span>$${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <span>Tax (${invoiceData.taxRate}%):</span>
              <span>$${invoiceData.taxAmount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 15px 0; font-weight: bold; font-size: 18px; border-bottom: 3px solid #333;">
              <span>Total:</span>
              <span>$${invoiceData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${invoiceData.paymentTerms ? `
        <div style="margin-bottom: 20px;">
          <h4 style="color: #333; margin-bottom: 10px;">Payment Terms</h4>
          <p style="color: #666; line-height: 1.5; margin: 0;">${invoiceData.paymentTerms}</p>
        </div>
        ` : ''}

        ${invoiceData.notes ? `
        <div style="margin-bottom: 30px;">
          <h4 style="color: #333; margin-bottom: 10px;">Notes</h4>
          <p style="color: #666; line-height: 1.5; margin: 0;">${invoiceData.notes}</p>
        </div>
        ` : ''}

        ${invoiceData.status !== 'paid' && organizationData?.windcave_enabled && invoiceData.total > 0 ? `
        <!-- Payment Section -->
        <div style="margin-top: 40px; padding: 25px; background: linear-gradient(135deg, #28a745, #20c997); border-radius: 12px; border: 1px solid #20c997; text-align: center;">
          <h3 style="color: white; margin: 0 0 15px 0; font-size: 20px; font-weight: bold;">Ready to Pay?</h3>
          <p style="color: white; margin: 0 0 20px 0; font-size: 16px; opacity: 0.9;">Pay this invoice securely with your credit card</p>
          <div style="display: inline-block; background: white; padding: 15px 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Total Amount Due</p>
            <p style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold; color: #333;">$${invoiceData.total.toFixed(2)}</p>
            ${paymentUrl ? `
              <a href="${paymentUrl}" target="_blank" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; transition: background 0.3s;">
                🔒 Click Here to Pay Now
              </a>
              <div style="margin-top: 10px; font-size: 12px; color: #666; word-break: break-all;">
                Payment URL: ${paymentUrl}
              </div>
            ` : `
              <div style="display: inline-block; background: #6c757d; color: white; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Payment link will be generated when invoice is saved
              </div>
            `}
          </div>
          <p style="color: white; margin: 15px 0 0 0; font-size: 12px; opacity: 0.8;">Secure payment powered by Windcave</p>
        </div>
        ` : ''}
      `;

      // Add to document temporarily
      document.body.appendChild(invoiceContainer);

      // Generate canvas from HTML
      const canvas = await html2canvas(invoiceContainer, {
        scale: 1, // Reduced from 2 to 1 to decrease file size
        useCORS: true,
        backgroundColor: '#ffffff',
        allowTaint: false,
        logging: false // Disable logging to improve performance
      });

      // Remove temporary container
      document.body.removeChild(invoiceContainer);

      // Create PDF with compression
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.7); // Use JPEG with 70% quality instead of PNG
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Add image to PDF with compression
      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio, undefined, 'MEDIUM');
      
      // Download the PDF
      pdf.save(`invoice-${invoiceData.invoiceNumber}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: "Invoice PDF has been generated and downloaded successfully"
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
            {/* Invoice Management */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={saveInvoice} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : currentInvoiceId ? "Update Invoice" : "Save Invoice"}
                </Button>

                {currentInvoiceId && organizationData && (organizationData.windcave_enabled || organizationData.payment_provider === "stripe") && invoiceData.total > 0 && !paymentUrl && (
                  <Button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const url = await generatePaymentUrl();
                        if (url) {
                          setPaymentUrl(url); // Set the URL in state so it's displayed
                          
                          // Update the invoice with the payment URL
                          const { error: updateError } = await supabase
                            .from("invoices")
                            .update({ payment_url: url })
                            .eq("id", currentInvoiceId);
                          
                          if (updateError) {
                            console.error("Error updating invoice with payment URL:", updateError);
                          } else {
                            toast({
                              title: "Payment URL Generated",
                              description: `Payment link: ${url}`,
                              duration: 10000 // Show for 10 seconds so user can copy it
                            });
                            
                            // Also copy to clipboard
                            try {
                              await navigator.clipboard.writeText(url);
                              toast({
                                title: "URL Copied",
                                description: "Payment URL has been copied to clipboard"
                              });
                            } catch (clipboardError) {
                              console.log("Could not copy to clipboard:", clipboardError);
                            }
                          }
                        }
                      } catch (error) {
                        console.error("Error generating payment URL:", error);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : "Generate Payment Link"}
                  </Button>
                )}

                {/* Display Payment URL if available */}
                {paymentUrl && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Payment Link Generated</CardTitle>
                      <CardDescription>Share this link with your client for payment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <Label className="text-sm font-medium">Payment URL:</Label>
                          <div className="mt-1 p-2 bg-background border rounded flex items-center justify-between">
                            <span className="text-sm font-mono break-all">{paymentUrl}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(paymentUrl);
                                  toast({
                                    title: "Copied!",
                                    description: "Payment URL copied to clipboard"
                                  });
                                } catch (error) {
                                  console.error("Failed to copy:", error);
                                }
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => window.open(paymentUrl, '_blank')}
                            className="flex-1"
                          >
                            Test Payment Link
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const subject = `Invoice ${invoiceData.invoiceNumber} - Payment Required`;
                              const body = `Dear ${invoiceData.clientName},

Please find your invoice ${invoiceData.invoiceNumber} for $${invoiceData.total.toFixed(2)}.

To make payment, please click the link below:
${paymentUrl}

Thank you for your business.

Best regards,
${invoiceData.companyName}`;
                              window.open(`mailto:${invoiceData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                            }}
                            className="flex-1"
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Email Client
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={() => setShowInvoiceList(!showInvoiceList)}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showInvoiceList ? "Hide" : "View"} Saved Invoices ({savedInvoices.length})
                </Button>

                {currentInvoiceId && (
                  <Button 
                    onClick={createNewInvoice}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Invoice
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Saved Invoices List */}
            {showInvoiceList && (
              <Card>
                <CardHeader>
                  <CardTitle>Saved Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {savedInvoices.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No saved invoices yet</p>
                  ) : (
                    <div className="space-y-2">
                      {savedInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{invoice.invoice_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {invoice.client_name} • ${invoice.total.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(invoice.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' : 
                              invoice.status === 'sent' ? 'secondary' : 
                              invoice.status === 'overdue' ? 'destructive' : 'outline'
                            }>
                              {invoice.status}
                            </Badge>
                            <Button 
                              onClick={() => loadInvoice(invoice)}
                              size="sm"
                              variant="ghost"
                            >
                              Load
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                
                <Button 
                  onClick={downloadPDF}
                  disabled={loading}
                  variant="outline" 
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? "Generating PDF..." : "Download PDF"}
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