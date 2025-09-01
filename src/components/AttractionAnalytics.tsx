import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Users, Calendar, DollarSign, Ticket, TrendingUp, MapPin, Clock } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

// Helper function to safely format dates
const safeFormatDate = (dateString: string | null | undefined, formatString: string): string => {
  if (!dateString) return 'Not specified';
  
  try {
    const date = new Date(dateString);
    if (isValid(date)) {
      return format(date, formatString);
    }
    return 'Invalid date';
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid date';
  }
};

interface AttractionAnalyticsProps {
  attractions: Array<{
    id: string;
    name: string;
    venue: string | null;
    attraction_type: string;
    duration_minutes: number;
    base_price: number;
    status: string;
  }>;
}

interface AttractionDetails {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  attraction_type: string;
  duration_minutes: number;
  base_price: number;
  max_concurrent_bookings: number;
  status: string;
}

interface BookingDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total_amount: number;
  booking_status: string;
  created_at: string;
  booking_date: string;
  party_size: number;
  special_requests: string | null;
  booking_slots: {
    start_time: string;
    end_time: string;
  } | null;
}

interface AnalyticsSummary {
  totalRevenue: number;
  totalBookings: number;
  totalCustomers: number;
  averageBookingValue: number;
  averagePartySize: number;
  occupancyRate: number;
}

export const AttractionAnalytics: React.FC<AttractionAnalyticsProps> = ({ attractions }) => {
  const [selectedAttractionId, setSelectedAttractionId] = useState<string>("");
  const [attractionDetails, setAttractionDetails] = useState<AttractionDetails | null>(null);
  const [bookings, setBookings] = useState<BookingDetails[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();



  const loadAttractionAnalytics = async (attractionId: string) => {
    setLoading(true);
    try {
      // Load attraction details
      const { data: attractionData, error: attractionError } = await supabase
        .from('attractions')
        .select('*')
        .eq('id', attractionId)
        .single();

      if (attractionError) throw attractionError;
      setAttractionDetails(attractionData);

      // Load bookings with related data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('attraction_bookings')
        .select(`
          *,
          booking_slots (
            start_time,
            end_time
          )
        `)
        .eq('attraction_id', attractionId)
        .in('booking_status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      // Calculate analytics
      if (bookingsData) {
        const totalRevenue = bookingsData.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
        const totalBookings = bookingsData.length;
        const totalCustomers = bookingsData.length; // Each booking is one customer
        const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
        const averagePartySize = bookingsData.reduce((sum, booking) => sum + (booking.party_size || 1), 0) / totalBookings;
        
        // Calculate occupancy rate (simplified - in real app would consider time slots)
        const occupancyRate = attractionData?.max_concurrent_bookings ? 
          (totalBookings / attractionData.max_concurrent_bookings) * 100 : 0;

        setAnalytics({
          totalRevenue,
          totalBookings,
          totalCustomers,
          averageBookingValue,
          averagePartySize,
          occupancyRate
        });
      }
    } catch (error) {
      console.error('Error loading attraction analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load attraction analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!bookings.length || !attractionDetails) return;

    const csvContent = [
      ['Customer Name', 'Email', 'Phone', 'Booking Date', 'Total Amount', 'Party Size', 'Special Requests', 'Booking Time', 'Status'].join(','),
      ...bookings.map(booking => [
        `"${booking.customer_name}"`,
        `"${booking.customer_email}"`,
        `"${booking.customer_phone || ''}"`,
        `"${safeFormatDate(booking.booking_date, 'yyyy-MM-dd')}"`,
        booking.total_amount,
        booking.party_size,
        `"${booking.special_requests || ''}"`,
        booking.booking_slots ? 
          `"${safeFormatDate(booking.booking_slots.start_time, 'HH:mm')} - ${safeFormatDate(booking.booking_slots.end_time, 'HH:mm')}"` : 
          'Not specified',
        booking.booking_status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${attractionDetails.name}-analytics-${safeFormatDate(new Date().toISOString(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Analytics report exported successfully"
    });
  };

  useEffect(() => {
    if (selectedAttractionId) {
      loadAttractionAnalytics(selectedAttractionId);
    }
  }, [selectedAttractionId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attraction Analytics</h2>
          <p className="text-muted-foreground">Detailed insights and reporting for your attractions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Attraction</CardTitle>
          <CardDescription>Choose an attraction to view detailed analytics</CardDescription>
        </CardHeader>
        <CardContent>
          {!attractions || attractions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No attractions found.</p>
              <p className="text-sm mt-2">Create some attractions first to view analytics.</p>
            </div>
          ) : (
            <Select value={selectedAttractionId} onValueChange={setSelectedAttractionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an attraction to analyze" />
              </SelectTrigger>
              <SelectContent>
                {attractions.map((attraction) => (
                  <SelectItem key={attraction.id} value={attraction.id}>
                    {attraction.name} - {attraction.attraction_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading analytics...</p>
          </CardContent>
        </Card>
      )}

      {attractionDetails && analytics && !loading && (
        <>
          {/* Attraction Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Attraction Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Attraction Name</p>
                  <p className="font-medium">{attractionDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{attractionDetails.attraction_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">{attractionDetails.venue || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={attractionDetails.status === 'active' ? 'default' : 'secondary'}>
                    {attractionDetails.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalBookings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.averageBookingValue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Party Size</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.averagePartySize.toFixed(1)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.occupancyRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Bookings Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Booking Details</CardTitle>
                <CardDescription>Complete list of bookings and customer information</CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Booking Date</TableHead>
                        <TableHead>Party Size</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Special Requests</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{booking.customer_phone || 'Not provided'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{safeFormatDate(booking.booking_date, 'MMM d, yyyy')}</p>
                          {booking.booking_slots && (
                            <p className="text-xs text-muted-foreground">
                              {safeFormatDate(booking.booking_slots.start_time, 'HH:mm')} - {safeFormatDate(booking.booking_slots.end_time, 'HH:mm')}
                            </p>
                          )}
                        </TableCell>
                         <TableCell>
                           <p className="font-medium">{booking.party_size} {booking.party_size === 1 ? 'person' : 'people'}</p>
                         </TableCell>
                         <TableCell>
                           <p className="font-medium">${booking.total_amount.toFixed(2)}</p>
                         </TableCell>
                         <TableCell>
                           <div className="max-w-xs">
                             {booking.special_requests ? (
                               <p className="text-sm text-muted-foreground truncate" title={booking.special_requests}>
                                 {booking.special_requests}
                               </p>
                             ) : (
                               <span className="text-xs text-muted-foreground">No special requests</span>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           <Badge variant={booking.booking_status === 'confirmed' || booking.booking_status === 'completed' ? 'default' : 'secondary'}>
                             {booking.booking_status}
                           </Badge>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {bookings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No bookings found for this attraction
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedAttractionId && !loading && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Select an attraction above to view detailed analytics and reporting</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
