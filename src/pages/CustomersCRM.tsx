import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Search, UserCog, DollarSign, TrendingUp, Calendar, Mail, Phone, MapPin, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CustomerDetailModal } from "@/components/CustomerDetailModal";
import { BulkEmailModal } from "@/components/BulkEmailModal";

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

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("organization_id", currentOrganization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        console.log('✅ Loaded contacts:', data.length);
        setContacts(data);

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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            Customers & CRM
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage customer relationships, donations, and patron engagement
          </p>
        </div>
        {selectedContacts.size > 0 && (
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {selectedContacts.size} selected
            </Badge>
            <Button
              onClick={() => setBulkEmailOpen(true)}
              size="sm"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email to Selected
            </Button>
            <Button
              onClick={() => setSelectedContacts(new Set())}
              variant="outline"
              size="sm"
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            <Input
              placeholder="Search customers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Contacts Table */}
      <Card>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm w-12">
                      <Checkbox
                        checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                        onCheckedChange={toggleAllContacts}
                      />
                    </th>
                    <th className="text-left p-4 font-medium text-sm">Customer</th>
                    <th className="text-left p-4 font-medium text-sm">Email</th>
                    <th className="text-right p-4 font-medium text-sm">Lifetime Value</th>
                    <th className="text-right p-4 font-medium text-sm">Donations</th>
                    <th className="text-right p-4 font-medium text-sm">Orders</th>
                    <th className="text-right p-4 font-medium text-sm">Events</th>
                    <th className="text-left p-4 font-medium text-sm">Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map(contact => (
                    <tr
                      key={contact.id}
                      className="border-b hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={() => toggleContactSelection(contact.id)}
                        />
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => handleContactClick(contact)}>
                        <div className="font-medium text-blue-600 hover:text-blue-800">
                          {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
                        </div>
                        {(contact.city || contact.country) && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {[contact.city, contact.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {contact.tags.slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground cursor-pointer" onClick={() => handleContactClick(contact)}>
                        {contact.email}
                      </td>
                      <td className="p-4 text-right font-semibold cursor-pointer" onClick={() => handleContactClick(contact)}>
                        {formatCurrency(contact.lifetime_value)}
                      </td>
                      <td className="p-4 text-right cursor-pointer" onClick={() => handleContactClick(contact)}>
                        {contact.total_donations > 0 ? (
                          <span className="text-pink-600 font-medium">
                            {formatCurrency(contact.total_donations)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right cursor-pointer" onClick={() => handleContactClick(contact)}>{contact.total_orders}</td>
                      <td className="p-4 text-right cursor-pointer" onClick={() => handleContactClick(contact)}>{contact.events_attended}</td>
                      <td className="p-4 text-sm text-muted-foreground cursor-pointer" onClick={() => handleContactClick(contact)}>
                        {formatDate(contact.last_order_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        contact={selectedContact}
        open={modalOpen}
        onOpenChange={setModalOpen}
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
    </div>
  );
};

export default CustomersCRM;
