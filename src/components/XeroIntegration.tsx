import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  FileText, 
  Users, 
  Package,
  Clock,
  
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface XeroConnection {
  id: string;
  tenant_id: string;
  connection_status: string | null;
  last_sync_at: string | null;
  sync_settings: Json;
  created_at: string;
}

interface XeroSyncLog {
  id: string;
  operation_type: string;
  entity_type: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  sync_data: Json;
}

interface XeroIntegrationProps {
  organizationId: string;
}

const XeroIntegration: React.FC<XeroIntegrationProps> = ({ organizationId }) => {
  const [connection, setConnection] = useState<XeroConnection | null>(null);
  const [syncLogs, setSyncLogs] = useState<XeroSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadXeroConnection();
  }, [organizationId]);

  useEffect(() => {
    if (connection) {
      loadSyncLogs();
    }
  }, [connection]);

  const loadXeroConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('xero_connections')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setConnection(data);
    } catch (error) {
      console.error('Error loading Xero connection:', error);
      toast({
        title: "Error",
        description: "Failed to load Xero connection status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSyncLogs = async () => {
    if (!connection) return;

    try {
      const { data, error } = await supabase
        .from('xero_sync_logs')
        .select('*')
        .eq('xero_connection_id', connection.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error loading sync logs:', error);
    }
  };

  const connectToXero = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('xero-auth', {
        body: {
          action: 'getAuthUrl',
          organizationId: organizationId
        }
      });

      if (error) throw error;

      // Store state for verification
      localStorage.setItem('xero_auth_state', data.state);
      
      // Redirect to Xero authorization
      window.open(data.authUrl, 'xero-auth', 'width=600,height=700');

      // Listen for callback
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'XERO_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          handleAuthCallback(event.data.code, event.data.state);
        }
      };

      window.addEventListener('message', handleMessage);

    } catch (error) {
      console.error('Error connecting to Xero:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Xero connection",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleAuthCallback = async (code: string, state: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('xero-auth', {
        body: {
          action: 'exchangeCode',
          code: code,
          state: state,
          organizationId: organizationId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Connected to Xero organization: ${data.tenantName}`,
      });

      loadXeroConnection();
    } catch (error) {
      console.error('Error completing Xero connection:', error);
      toast({
        title: "Error",
        description: "Failed to complete Xero connection",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('xero-sync', {
        body: {
          action: 'testConnection',
          organizationId: organizationId
        }
      });

      if (error) throw error;

      toast({
        title: "Connection Test Successful",
        description: `Connected to: ${data.organisation.Name}`,
      });

      loadXeroConnection();
    } catch (error) {
      console.error('Error testing Xero connection:', error);
      toast({
        title: "Connection Test Failed",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const updateSyncSettings = async (settings: Record<string, unknown>) => {
    try {
      const { error } = await supabase
        .from('xero_connections')
        .update({ sync_settings: settings as Json })
        .eq('id', connection!.id);

      if (error) throw error;

      setConnection(prev => prev ? { ...prev, sync_settings: settings as Json } : null);

      toast({
        title: "Settings Updated",
        description: "Xero sync settings have been updated",
      });
    } catch (error) {
      console.error('Error updating sync settings:', error);
      toast({
        title: "Error",
        description: "Failed to update sync settings",
        variant: "destructive",
      });
    }
  };

  const createTestInvoice = async () => {
    try {
      // Get the most recent completed order
      const { data: order, error } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !order) {
        toast({
          title: "No Orders Found",
          description: "No completed orders found to create test invoice",
          variant: "destructive",
        });
        return;
      }

      const { data, error: syncError } = await supabase.functions.invoke('xero-sync', {
        body: {
          action: 'createInvoice',
          organizationId: organizationId,
          orderId: order.id
        }
      });

      if (syncError) throw syncError;

      toast({
        title: "Test Invoice Created",
        description: `Invoice ${data.invoiceNumber} created successfully in Xero`,
      });

      loadSyncLogs();
    } catch (error) {
      console.error('Error creating test invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create test invoice",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading Xero integration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = connection?.connection_status === 'connected';
  const syncSettings = connection?.sync_settings as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src="https://developer.xero.com/static/images/logos/xero-brand-logo-rgb.svg" 
              alt="Xero" 
              className="h-6"
            />
            Xero Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Connection Status:</span>
              {isConnected ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Disconnected
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {isConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testConnection}
                  disabled={testing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
                  Test Connection
                </Button>
              ) : (
                <Button
                  onClick={connectToXero}
                  disabled={connecting}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {connecting ? 'Connecting...' : 'Connect to Xero'}
                </Button>
              )}
            </div>
          </div>

          {connection?.last_sync_at && (
            <div className="text-xs text-muted-foreground">
              Last sync: {new Date(connection.last_sync_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-invoices">Auto-create Invoices</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create invoices in Xero when orders are completed
                  </p>
                </div>
                <Switch
                  id="auto-invoices"
                  checked={syncSettings?.auto_create_invoices === true}
                  onCheckedChange={(checked) => 
                    updateSyncSettings({
                      ...syncSettings,
                      auto_create_invoices: checked
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sync-customers">Sync Customers</Label>
                  <p className="text-xs text-muted-foreground">
                    Create contacts in Xero for new customers
                  </p>
                </div>
                <Switch
                  id="sync-customers"
                  checked={syncSettings?.sync_customers === true}
                  onCheckedChange={(checked) => 
                    updateSyncSettings({
                      ...syncSettings,
                      sync_customers: checked
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sync-products">Sync Products</Label>
                  <p className="text-xs text-muted-foreground">
                    Sync ticket types and merchandise as items in Xero
                  </p>
                </div>
                <Switch
                  id="sync-products"
                  checked={syncSettings?.sync_products === true}
                  onCheckedChange={(checked) => 
                    updateSyncSettings({
                      ...syncSettings,
                      sync_products: checked
                    })
                  }
                />
              </div>

              <Separator />

              <div className="pt-4">
                <Button variant="outline" onClick={createTestInvoice}>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Test Invoice
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No sync activity yet
                </p>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {log.operation_type === 'invoice_create' && <FileText className="h-4 w-4" />}
                        {log.operation_type === 'customer_sync' && <Users className="h-4 w-4" />}
                        {log.operation_type === 'product_sync' && <Package className="h-4 w-4" />}
                        
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {log.operation_type.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Success
                          </Badge>
                        ) : log.status === 'failed' ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default XeroIntegration;