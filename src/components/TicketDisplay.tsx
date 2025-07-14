import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Ticket, User } from 'lucide-react';

interface TicketDisplayProps {
  ticket: {
    id: string;
    ticket_code: string;
    status: string;
    ticketTypeName: string;
    eventName: string;
    eventDate: string;
    customerName: string;
  };
  eventDetails?: {
    venue?: string;
    logo_url?: string;
    description?: string;
  };
}

export const TicketDisplay = ({ ticket, eventDetails }: TicketDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrData = JSON.stringify({
          ticketId: ticket.id,
          ticketCode: ticket.ticket_code,
          eventName: ticket.eventName,
          customerName: ticket.customerName,
          status: ticket.status
        });
        
        const qrUrl = await QRCode.toDataURL(qrData, {
          width: 128,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [ticket]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <Card className="max-w-md mx-auto bg-gradient-to-br from-background to-accent/5 border-2 border-primary/20 shadow-lg">
      <CardContent className="p-6 space-y-6">
        {/* Header with logo and event name */}
        <div className="text-center border-b border-border pb-4">
          {eventDetails?.logo_url && (
            <img 
              src={eventDetails.logo_url} 
              alt="Event Logo" 
              className="h-16 w-auto mx-auto mb-3 object-contain"
            />
          )}
          <h1 className="text-xl font-bold text-foreground">{ticket.eventName}</h1>
          {eventDetails?.venue && (
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span>{eventDetails.venue}</span>
            </div>
          )}
        </div>

        {/* Event details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">{formatDate(ticket.eventDate)}</div>
              <div className="text-sm text-muted-foreground">{formatTime(ticket.eventDate)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Ticket className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">{ticket.ticketTypeName}</div>
              <div className="text-xs text-muted-foreground">Ticket Type</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">{ticket.customerName}</div>
              <div className="text-xs text-muted-foreground">Attendee</div>
            </div>
          </div>
        </div>

        {/* QR Code section */}
        <div className="border-t border-border pt-4">
          <div className="text-center space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              Scan QR Code at Event
            </div>
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="mx-auto border border-border rounded"
              />
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Ticket Code: <span className="font-mono font-medium">{ticket.ticket_code}</span></div>
              <div>Status: <span className="capitalize font-medium text-green-600">{ticket.status}</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 text-center">
          <div className="text-xs text-muted-foreground">
            Please present this ticket at the event entrance
          </div>
        </div>
      </CardContent>
    </Card>
  );
};