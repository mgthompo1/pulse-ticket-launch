import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TicketVerificationProps {
  eventId: string;
}

interface TicketVerificationResult {
  ticket_id: string | null;
  is_valid: boolean;
  is_used: boolean;
  customer_name: string | null;
  ticket_type: string | null;
  error_message: string | null;
}

export const SecureTicketVerification = ({ eventId }: TicketVerificationProps) => {
  const [ticketCode, setTicketCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<TicketVerificationResult | null>(null);
  const { toast } = useToast();

  const verifyTicket = async () => {
    if (!ticketCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a ticket code",
        variant: "destructive"
      });
      return;
    }

    setVerifying(true);
    setResult(null);

    try {
      // Use the secure RPC function to verify ticket
      const { data, error } = await supabase.rpc('verify_ticket_code', {
        p_ticket_code: ticketCode.trim(),
        p_event_id: eventId
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setResult(data[0]);
      } else {
        setResult({
          ticket_id: null,
          is_valid: false,
          is_used: false,
          customer_name: null,
          ticket_type: null,
          error_message: 'No data returned'
        });
      }
    } catch (error: any) {
      console.error('Ticket verification error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify ticket",
        variant: "destructive"
      });
      setResult({
        ticket_id: null,
        is_valid: false,
        is_used: false,
        customer_name: null,
        ticket_type: null,
        error_message: error.message || 'Verification failed'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyTicket();
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;

    if (!result.is_valid) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    
    if (result.is_used) {
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    }
    
    return <CheckCircle className="h-5 w-5 text-success" />;
  };

  const getStatusColor = (): "default" | "destructive" | "outline" | "secondary" | "success" | "warning" => {
    if (!result || !result.is_valid) return 'destructive';
    if (result.is_used) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (!result) return '';
    
    if (!result.is_valid) {
      return 'Invalid Ticket';
    }
    
    if (result.is_used) {
      return 'Already Used';
    }
    
    return 'Valid Ticket';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Secure Ticket Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="ticketCode" className="text-sm font-medium">
            Ticket Code
          </label>
          <Input
            id="ticketCode"
            type="text"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter ticket code (e.g., TCK-12345678)"
            disabled={verifying}
          />
        </div>

        <Button 
          onClick={verifyTicket} 
          disabled={verifying || !ticketCode.trim()}
          className="w-full"
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            'Verify Ticket'
          )}
        </Button>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <Badge variant={getStatusColor()}>
                {getStatusText()}
              </Badge>
            </div>

            {result.error_message ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {result.error_message}
                </AlertDescription>
              </Alert>
            ) : result.is_valid ? (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div>
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="ml-2">{result.customer_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Ticket Type:</span>
                    <span className="ml-2">{result.ticket_type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Status:</span>
                    <span className="ml-2">
                      {result.is_used ? 'Used' : 'Available for check-in'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        <Alert>
          <AlertDescription className="text-xs text-muted-foreground">
            🔒 This verification uses secure RLS policies. Only event organizers can verify tickets for their events. Ticket codes are never exposed publicly.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};