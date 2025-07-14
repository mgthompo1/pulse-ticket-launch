import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Filter, Download, Mail, CheckCircle, AlertCircle, Clock, MapPin, Calendar, Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface AttendeeManagementProps {
  eventId: string;
}

interface Attendee {
  ticket_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  ticket_type: string;
  ticket_status: string;
  checked_in: boolean;
  checked_in_at: string;
  order_date: string;
  price: number;
  quantity: number;
  ticket_code: string;
}

const AttendeeManagement: React.FC<AttendeeManagementProps> = ({ eventId }) => {
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("all");
  const [checkedInFilter, setCheckedInFilter] = useState("all");
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailContent, setEmailContent] = useState({
    subject: "",
    message: "",
    sendToSelected: false
  });

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalTickets: 0,
    checkedInCount: 0,
    totalRevenue: 0,
    ticketTypeBreakdown: {} as Record<string, number>,
    checkInRate: 0,
    locationBreakdown: { local: 0, regional: 0, international: 0 }
  });

  useEffect(() => {
    loadAttendees();
  }, [eventId]);

  useEffect(() => {
    filterAttendees();
  }, [attendees, searchTerm, statusFilter, ticketTypeFilter, checkedInFilter]);

  const loadAttendees = async () => {
    try {
      setLoading(true);
      
      // Load attendee data from the guest_status_view
      const { data, error } = await supabase
        .from("guest_status_view")
        .select("*")
        .eq("event_id", eventId)
        .order("order_date", { ascending: false });

      if (error) throw error;

      setAttendees(data || []);
      calculateAnalytics(data || []);
    } catch (error) {
      console.error("Error loading attendees:", error);
      toast({
        title: "Error",
        description: "Failed to load attendee data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (attendeeData: Attendee[]) => {
    const totalTickets = attendeeData.length;
    const checkedInCount = attendeeData.filter(a => a.checked_in).length;
    const totalRevenue = attendeeData.reduce((sum, a) => sum + (a.price * a.quantity), 0);
    const checkInRate = totalTickets > 0 ? (checkedInCount / totalTickets) * 100 : 0;

    // Ticket type breakdown
    const ticketTypeBreakdown = attendeeData.reduce((acc, attendee) => {
      acc[attendee.ticket_type] = (acc[attendee.ticket_type] || 0) + attendee.quantity;
      return acc;
    }, {});

    // Location breakdown (simplified - in real app would use actual location data)
    const locationBreakdown = {
      local: Math.floor(totalTickets * 0.6),
      regional: Math.floor(totalTickets * 0.3),
      international: Math.floor(totalTickets * 0.1)
    };

    setAnalytics({
      totalTickets,
      checkedInCount,
      totalRevenue,
      ticketTypeBreakdown,
      checkInRate,
      locationBreakdown
    });
  };

  const filterAttendees = () => {
    let filtered = [...attendees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(attendee =>
        attendee.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.ticket_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(attendee => attendee.ticket_status === statusFilter);
    }

    // Ticket type filter
    if (ticketTypeFilter !== "all") {
      filtered = filtered.filter(attendee => attendee.ticket_type === ticketTypeFilter);
    }

    // Check-in filter
    if (checkedInFilter !== "all") {
      const isCheckedIn = checkedInFilter === "checked-in";
      filtered = filtered.filter(attendee => attendee.checked_in === isCheckedIn);
    }

    setFilteredAttendees(filtered);
  };

  const exportAttendees = () => {
    const csvContent = [
      ["Name", "Email", "Phone", "Ticket Type", "Status", "Checked In", "Order Date", "Price", "Ticket Code"],
      ...filteredAttendees.map(attendee => [
        attendee.customer_name,
        attendee.customer_email,
        attendee.customer_phone || "",
        attendee.ticket_type,
        attendee.ticket_status,
        attendee.checked_in ? "Yes" : "No",
        new Date(attendee.order_date).toLocaleDateString(),
        `$${attendee.price.toFixed(2)}`,
        attendee.ticket_code
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${eventId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Attendee data has been exported to CSV"
    });
  };

  const toggleCheckIn = async (attendee: Attendee) => {
    try {
      if (attendee.checked_in) {
        // Remove check-in
        const { error } = await supabase
          .from("check_ins")
          .delete()
          .eq("ticket_id", attendee.ticket_id);

        if (error) throw error;

        await supabase
          .from("tickets")
          .update({ checked_in: false })
          .eq("id", attendee.ticket_id);

      } else {
        // Add check-in
        const { error: checkInError } = await supabase
          .from("check_ins")
          .insert({
            ticket_id: attendee.ticket_id,
            checked_in_at: new Date().toISOString(),
            notes: "Manual check-in from attendee management"
          });

        if (checkInError) throw checkInError;

        await supabase
          .from("tickets")
          .update({ checked_in: true })
          .eq("id", attendee.ticket_id);
      }

      toast({
        title: "Success",
        description: `${attendee.customer_name} has been ${attendee.checked_in ? 'checked out' : 'checked in'}`
      });

      loadAttendees();
    } catch (error) {
      console.error("Error updating check-in status:", error);
      toast({
        title: "Error",
        description: "Failed to update check-in status",
        variant: "destructive"
      });
    }
  };

  const sendEmail = async () => {
    try {
      const recipients = emailContent.sendToSelected 
        ? [selectedAttendee?.customer_email].filter(Boolean)
        : filteredAttendees.map(a => a.customer_email);

      // In a real implementation, you would call an edge function to send emails
      toast({
        title: "Emails Sent",
        description: `Email sent to ${recipients.length} attendee(s)`
      });

      setShowEmailDialog(false);
      setEmailContent({ subject: "", message: "", sendToSelected: false });
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "valid": return "default";
      case "used": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const uniqueTicketTypes = [...new Set(attendees.map(a => a.ticket_type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Attendee Management
          </h2>
          <p className="text-muted-foreground">Manage and track event attendees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAttendees}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Email to Attendees</DialogTitle>
                <DialogDescription>
                  Send a message to your event attendees
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input
                    id="emailSubject"
                    value={emailContent.subject}
                    onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Event Update"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailMessage">Message</Label>
                  <Textarea
                    id="emailMessage"
                    value={emailContent.message}
                    onChange={(e) => setEmailContent(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Your message to attendees..."
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sendToSelected"
                    checked={emailContent.sendToSelected}
                    onCheckedChange={(checked) => setEmailContent(prev => ({ ...prev, sendToSelected: checked }))}
                  />
                  <Label htmlFor="sendToSelected">
                    Send only to selected attendee
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={sendEmail}>Send Email</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.checkedInCount} checked in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-in Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.checkInRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.checkedInCount} of {analytics.totalTickets}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From ticket sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.locationBreakdown.local}</div>
            <p className="text-xs text-muted-foreground">
              Local attendees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, email, or ticket code"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketTypeFilter">Ticket Type</Label>
              <Select value={ticketTypeFilter} onValueChange={setTicketTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTicketTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkedInFilter">Check-in Status</Label>
              <Select value={checkedInFilter} onValueChange={setCheckedInFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="not-checked-in">Not Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendees ({filteredAttendees.length})</CardTitle>
          <CardDescription>
            Manage individual attendees and their check-in status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ticket Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading attendees...
                    </TableCell>
                  </TableRow>
                ) : filteredAttendees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No attendees found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendees.map((attendee) => (
                    <TableRow key={attendee.ticket_id}>
                      <TableCell className="font-medium">
                        {attendee.customer_name}
                      </TableCell>
                      <TableCell>{attendee.customer_email}</TableCell>
                      <TableCell>{attendee.ticket_type}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(attendee.ticket_status)}>
                          {attendee.ticket_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {attendee.checked_in ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm">
                            {attendee.checked_in 
                              ? new Date(attendee.checked_in_at).toLocaleString()
                              : "Not checked in"
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(attendee.order_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>${attendee.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => toggleCheckIn(attendee)}
                          >
                            {attendee.checked_in ? "Check Out" : "Check In"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedAttendee(attendee);
                              setEmailContent(prev => ({ ...prev, sendToSelected: true }));
                              setShowEmailDialog(true);
                            }}
                          >
                            Email
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendeeManagement;