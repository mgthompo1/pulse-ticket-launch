import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Search, UserCog, DollarSign, TrendingUp, Calendar, Mail, Phone, MapPin, Tag, MoreVertical, Send, FileText, Link as LinkIcon, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CustomerDetailModal } from "@/components/CustomerDetailModal";
import { BulkEmailModal } from "@/components/BulkEmailModal";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { SendEventLinkModal } from "@/components/SendEventLinkModal";
import { CreateCustomOrderModal } from "@/components/CreateCustomOrderModal";
import { CreateInvoiceModal } from "@/components/CreateInvoiceModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tags: string[] | null;
  total_orders: number;
  total_spent: number;
  total_donations: number;
  lifetime_value: number;
  events_attended: number;
  last_order_date: string | null;
  created_at: string;
  groups?: { name: string }[] | null;
  payment_methods?: {
    stripe?: {
      customer_id: string;
      payment_method_id: string;
      last4: string;
      brand: string;
      exp_month: number;
      exp_year: number;
    };
    windcave?: {
      customer_id: string;
      token: string;
    };
  };
}

const CustomersCRM: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganizations();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);

  // Phone sales modals
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [sendEventLinkOpen, setSendEventLinkOpen] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [phoneSalesContact, setPhoneSalesContact] = useState<Contact | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalLifetimeValue: 0,
    totalDonations: 0,
    avgOrderValue: 0,
  });

  useEffect(() => {
    if (currentOrganization) {
      // Check if CRM is enabled for this organization
      if (!currentOrganization.crm_enabled) {
        toast({
          title: "CRM Not Enabled",
          description: "Please enable CRM in organization settings",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      loadContacts();
    } else if (!orgLoading) {
      setLoading(false);
    }
  }, [currentOrganization, orgLoading]);

  const loadContacts = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      console.log('📊 Loading contacts for organization:', currentOrganization.name, currentOrganization.id);

      // Fetch contacts with group information and payment methods
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          *,
          contact_events (
            order_id,
            orders (
              id,
              order_items (
                tickets (
                  group_ticket_sales (
                    groups (
                      name
                    )
                  )
                )
              )
            )
          )
        `)
        .eq("organization_id", currentOrganization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        console.log('✅ Loaded contacts:', data.length);

        // Process data to extract unique groups for each contact
        const processedContacts = data.map((contact: any) => {
          const groups = new Set<string>();

          // Navigate through the nested structure to find groups
          contact.contact_events?.forEach((ce: any) => {
            ce.orders?.order_items?.forEach((item: any) => {
              item.tickets?.forEach((ticket: any) => {
                ticket.group_ticket_sales?.forEach((gts: any) => {
                  if (gts.groups?.name) {
                    groups.add(gts.groups.name);
                  }
                });
              });
            });
          });

          return {
            ...contact,
            groups: groups.size > 0 ? Array.from(groups).map(name => ({ name })) : null
          };
        });

        setContacts(processedContacts);

        // Calculate stats
        const totalLTV = data.reduce((sum, contact) => sum + Number(contact.lifetime_value || 0), 0);
        const totalDon = data.reduce((sum, contact) => sum + Number(contact.total_donations || 0), 0);
        const totalSpent = data.reduce((sum, contact) => sum + Number(contact.total_spent || 0), 0);
        const totalOrders = data.reduce((sum, contact) => sum + contact.total_orders, 0);

        setStats({
          totalContacts: data.length,
          totalLifetimeValue: totalLTV,
          totalDonations: totalDon,
          avgOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
        });
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.email?.toLowerCase().includes(query) ||
      contact.first_name?.toLowerCase().includes(query) ||
      contact.last_name?.toLowerCase().includes(query) ||
      contact.full_name?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setModalOpen(true);
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  const toggleAllContacts = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const getSelectedContactObjects = () => {
    return contacts.filter(c => selectedContacts.has(c.id));
  };

  if (loading || orgLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show message if no organization is selected
  if (!currentOrganization) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No Organization Selected</p>
            <p className="text-muted-foreground">
              Please select an organization from the sidebar to view customers
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if CRM is not enabled
  if (!currentOrganization.crm_enabled) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">CRM Not Enabled</p>
            <p className="text-muted-foreground">
              Please enable CRM in organization settings to view and manage customers
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 md:h-8 md:w-8" />
            Customers & CRM
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage customer relationships, donations, and patron engagement
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {selectedContacts.size > 0 ? (
            <>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {selectedContacts.size} selected
              </Badge>
              <Button
                onClick={() => setBulkEmailOpen(true)}
                size="sm"
              >
                <Mail className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Send Email to Selected</span>
                <span className="sm:hidden">Email</span>
              </Button>
              <Button
                onClick={() => setSelectedContacts(new Set())}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setAddCustomerOpen(true)}
              className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lifetime Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalLifetimeValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Donations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDonations)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Order Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">All Customers</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredContacts.length === 0 ? (
            <div className="py-12 text-center">
              <UserCog className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No customers yet</p>
              <p className="text-muted-foreground">
                Customers will appear here when they make purchases or donations
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={() => toggleContactSelection(contact.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0" onClick={() => handleContactClick(contact)}>
                          <p className="font-medium text-blue-600 truncate">
                            {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                          {contact.groups && contact.groups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contact.groups.slice(0, 2).map((group, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {group.name}
                                </Badge>
                              ))}
                              {contact.groups.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{contact.groups.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Phone Sales</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setPhoneSalesContact(contact);
                            setSendEventLinkOpen(true);
                          }}>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Send Event Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setPhoneSalesContact(contact);
                            setCreateOrderOpen(true);
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Create Custom Order
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setPhoneSalesContact(contact);
                            setCreateInvoiceOpen(true);
                          }}>
                            <Send className="h-4 w-4 mr-2" />
                            Create & Send Invoice
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleContactClick(contact)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t" onClick={() => handleContactClick(contact)}>
                      <div>
                        <p className="text-xs text-muted-foreground">LTV</p>
                        <p className="font-semibold text-sm">{formatCurrency(contact.lifetime_value)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Orders</p>
                        <p className="font-semibold text-sm">{contact.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Events</p>
                        <p className="font-semibold text-sm">{contact.events_attended}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-2 font-medium text-sm w-12">
                      <Checkbox
                        checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                        onCheckedChange={toggleAllContacts}
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-sm">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-sm">Email</th>
                    <th className="text-left py-3 px-2 font-medium text-sm hidden lg:table-cell">Group</th>
                    <th className="text-right py-3 px-2 font-medium text-sm">LTV</th>
                    <th className="text-right py-3 px-2 font-medium text-sm hidden md:table-cell">Donations</th>
                    <th className="text-right py-3 px-2 font-medium text-sm">Orders</th>
                    <th className="text-right py-3 px-2 font-medium text-sm hidden sm:table-cell">Events</th>
                    <th className="text-left py-3 px-2 font-medium text-sm hidden xl:table-cell">Last Order</th>
                    <th className="text-center py-3 px-2 font-medium text-sm w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map(contact => (
                    <tr
                      key={contact.id}
                      className="border-b hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={() => toggleContactSelection(contact.id)}
                        />
                      </td>
                      <td className="py-3 px-2 cursor-pointer" onClick={() => handleContactClick(contact)}>
                        <div className="font-medium text-blue-600 hover:text-blue-800">
                          {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {contact.tags.slice(0, 1).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 1}
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground cursor-pointer" onClick={() => handleContactClick(contact)}>
                        {contact.email}
                      </td>
                      <td className="py-3 px-2 cursor-pointer hidden lg:table-cell" onClick={() => handleContactClick(contact)}>
                        {contact.groups && contact.groups.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {contact.groups.slice(0, 1).map((group, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {group.name}
                              </Badge>
                            ))}
                            {contact.groups.length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.groups.length - 1}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-sm cursor-pointer" onClick={() => handleContactClick(contact)}>
                        {formatCurrency(contact.lifetime_value)}
                      </td>
                      <td className="py-3 px-2 text-right cursor-pointer hidden md:table-cell" onClick={() => handleContactClick(contact)}>
                        {contact.total_donations > 0 ? (
                          <span className="text-pink-600 font-medium text-sm">
                            {formatCurrency(contact.total_donations)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right cursor-pointer text-sm" onClick={() => handleContactClick(contact)}>{contact.total_orders}</td>
                      <td className="py-3 px-2 text-right cursor-pointer text-sm hidden sm:table-cell" onClick={() => handleContactClick(contact)}>{contact.events_attended}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground cursor-pointer hidden xl:table-cell" onClick={() => handleContactClick(contact)}>
                        {formatDate(contact.last_order_date)}
                      </td>
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Phone Sales</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setPhoneSalesContact(contact);
                              setSendEventLinkOpen(true);
                            }}>
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Send Event Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setPhoneSalesContact(contact);
                              setCreateOrderOpen(true);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Create Custom Order
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setPhoneSalesContact(contact);
                              setCreateInvoiceOpen(true);
                            }}>
                              <Send className="h-4 w-4 mr-2" />
                              Create & Send Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleContactClick(contact)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        contact={selectedContact}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSendEventLink={() => {
          setPhoneSalesContact(selectedContact);
          setSendEventLinkOpen(true);
        }}
        onCreateCustomOrder={() => {
          setPhoneSalesContact(selectedContact);
          setCreateOrderOpen(true);
        }}
        onCreateInvoice={() => {
          setPhoneSalesContact(selectedContact);
          setCreateInvoiceOpen(true);
        }}
        onCustomerUpdated={() => {
          loadContacts();
        }}
      />

      {/* Bulk Email Modal */}
      <BulkEmailModal
        contacts={getSelectedContactObjects()}
        open={bulkEmailOpen}
        onOpenChange={setBulkEmailOpen}
        onSuccess={() => {
          setSelectedContacts(new Set());
          toast({
            title: "Emails Sent",
            description: "Bulk emails sent successfully",
          });
        }}
      />

      {/* Phone Sales Modals */}
      <AddCustomerModal
        organizationId={currentOrganization?.id || ""}
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onSuccess={() => {
          loadContacts();
        }}
      />

      <SendEventLinkModal
        contact={phoneSalesContact}
        organizationId={currentOrganization?.id || ""}
        open={sendEventLinkOpen}
        onOpenChange={setSendEventLinkOpen}
        onSuccess={() => {
          loadContacts();
        }}
      />

      <CreateCustomOrderModal
        contact={phoneSalesContact}
        organizationId={currentOrganization?.id || ""}
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        onSuccess={() => {
          loadContacts();
        }}
      />

      <CreateInvoiceModal
        contact={phoneSalesContact}
        organizationId={currentOrganization?.id || ""}
        organizationName={currentOrganization?.name || ""}
        open={createInvoiceOpen}
        onOpenChange={setCreateInvoiceOpen}
        onSuccess={() => {
          loadContacts();
        }}
      />
    </div>
  );
};

export default CustomersCRM;
