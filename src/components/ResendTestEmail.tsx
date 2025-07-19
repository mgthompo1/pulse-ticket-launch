import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react";

export const ResendTestEmail = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastTest, setLastTest] = useState<{
    success: boolean;
    timestamp: string;
    emailId?: string;
  } | null>(null);
  const { toast } = useToast();

  const sendTestEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('test-resend-email', {
        body: {
          to: email,
          subject: "Resend API Test - Email Delivery Verification"
        }
      });

      if (error) throw error;

      setLastTest({
        success: data.success,
        timestamp: data.timestamp,
        emailId: data.emailId
      });

      if (data.success) {
        toast({
          title: "Test Email Sent! ✅",
          description: `Check your inbox at ${email}`,
        });
      } else {
        throw new Error(data.error || "Unknown error occurred");
      }

    } catch (error: any) {
      console.error('Test email failed:', error);
      
      setLastTest({
        success: false,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Resend API Test
        </CardTitle>
        <CardDescription>
          Verify that your Resend integration is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email Address</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button 
          onClick={sendTestEmail} 
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? (
            "Sending..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Test Email
            </>
          )}
        </Button>

        {lastTest && (
          <div className={`p-3 rounded-lg border ${
            lastTest.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {lastTest.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`font-medium ${
                lastTest.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {lastTest.success ? 'Test Successful!' : 'Test Failed'}
              </span>
            </div>
            <div className={`text-sm ${
              lastTest.success ? 'text-green-700' : 'text-red-700'
            }`}>
              <p>Tested at: {new Date(lastTest.timestamp).toLocaleString()}</p>
              {lastTest.success && lastTest.emailId && (
                <p>Email ID: {lastTest.emailId}</p>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Note:</strong> This will send a real email to the address you provide.</p>
          <p>Make sure to check your spam folder if you don't see the email in your inbox.</p>
        </div>
      </CardContent>
    </Card>
  );
};