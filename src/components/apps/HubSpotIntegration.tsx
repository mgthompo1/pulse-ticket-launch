import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
  Upload,
  Download,
  Users,
  Settings,
  Clock,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Link2,
  Unlink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface HubSpotConnection {
  id: string;
  hub_id: string;
  hub_domain: string | null;
  user_email: string | null;
  connection_status: string;
  last_error: string | null;
  sync_settings: Json;
  last_sync_at: string | null;
  created_at: string;
}

interface HubSpotFieldMapping {
  id: string;
  ticketflo_field: string;
  hubspot_property: string;
  sync_direction: string;
  is_custom_property: boolean;
  is_enabled: boolean;
}

interface HubSpotSyncLog {
  id: string;
  operation_type: string;
  status: string;
  records_processed: number | null;
  records_created: number | null;
  records_updated: number | null;
  records_failed: number | null;
  error_message: string | null;
  created_at: string;
}

interface HubSpotIntegrationProps {
  organizationId: string;
  onBack: () => void;
}

const HubSpotIntegration: React.FC<HubSpotIntegrationProps> = ({ organizationId, onBack }) => {
  const [connection, setConnection] = useState<HubSpotConnection | null>(null);
  const [fieldMappings, setFieldMappings] = useState<HubSpotFieldMapping[]>([]);
  const [syncLogs, setSyncLogs] = useState<HubSpotSyncLog[]>([]);
  const [contactCount, setContactCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull'>('push');
  const { toast } = useToast();

  // Load connection status
  const loadConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hubspot_connections')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setConnection(data);

      if (data) {
        loadFieldMappings(data.id);
        loadSyncLogs(data.id);
      }
    } catch (error) {
      console.error('Error loading HubSpot connection:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Load field mappings
  const loadFieldMappings = async (connectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('hubspot_field_mappings')
        .select('*')
        .eq('hubspot_connection_id', connectionId)
        .order('ticketflo_field');

      if (error) throw error;
      setFieldMappings(data || []);
    } catch (error) {
      console.error('Error loading field mappings:', error);
    }
  };

  // Load sync logs
  const loadSyncLogs = async (connectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('hubspot_sync_logs')
        .select('*')
        .eq('hubspot_connection_id', connectionId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error loading sync logs:', error);
    }
  };

  // Load contact count
  const loadContactCount = async () => {
    try {
      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (error) throw error;
      setContactCount(count || 0);
    } catch (error) {
      console.error('Error loading contact count:', error);
    }
  };

  useEffect(() => {
    loadConnection();
    loadContactCount();
  }, [loadConnection, organizationId]);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'HUBSPOT_AUTH_SUCCESS') {
        const { code, organizationId: orgId } = event.data;

        if (orgId !== organizationId) return;

        setConnecting(true);
        try {
          const { data, error } = await supabase.functions.invoke('hubspot-auth', {
            body: {
              action: 'exchangeCode',
              code,
              organizationId,
            },
          });

          if (error) throw error;

          toast({
            title: 'HubSpot Connected',
            description: `Successfully connected to HubSpot portal ${data.connection.hubId}`,
          });

          loadConnection();
        } catch (error: any) {
          console.error('Error completing HubSpot connection:', error);
          toast({
            title: 'Connection Failed',
            description: error.message || 'Failed to complete HubSpot connection',
            variant: 'destructive',
          });
        } finally {
          setConnecting(false);
        }
      } else if (event.data.type === 'HUBSPOT_AUTH_ERROR') {
        toast({
          title: 'Connection Failed',
          description: event.data.error || 'HubSpot authorization failed',
          variant: 'destructive',
        });
        setConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [organizationId, toast, loadConnection]);

  // Connect to HubSpot
  const connectToHubSpot = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-auth', {
        body: {
          action: 'getAuthUrl',
          organizationId,
        },
      });

      if (error) throw error;

      // Open popup for OAuth
      window.open(data.authUrl, 'hubspot-auth', 'width=600,height=700');
    } catch (error: any) {
      console.error('Error initiating HubSpot connection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate HubSpot connection',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  // Disconnect from HubSpot
  const disconnectHubSpot = async () => {
    if (!confirm('Are you sure you want to disconnect HubSpot? This will remove all sync mappings.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('hubspot-auth', {
        body: {
          action: 'disconnect',
          organizationId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Disconnected',
        description: 'HubSpot has been disconnected',
      });

      setConnection(null);
      setFieldMappings([]);
      setSyncLogs([]);
    } catch (error: any) {
      console.error('Error disconnecting HubSpot:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect HubSpot',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Test connection
  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-auth', {
        body: {
          action: 'testConnection',
          organizationId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Connection Active',
        description: `Connected to HubSpot portal ${data.hubId} with ${data.totalContacts} contacts`,
      });

      loadConnection();
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Connection Test Failed',
        description: error.message || 'Failed to verify HubSpot connection',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  // Manual sync
  const performSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-sync', {
        body: {
          action: syncDirection === 'push' ? 'pushContacts' : 'pullContacts',
          organizationId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Sync Complete',
        description: `${syncDirection === 'push' ? 'Pushed' : 'Pulled'} ${data.recordsProcessed || 0} contacts`,
      });

      loadConnection();
      if (connection) {
        loadSyncLogs(connection.id);
      }
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync contacts',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Toggle field mapping
  const toggleFieldMapping = async (mappingId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('hubspot_field_mappings')
        .update({ is_enabled: enabled })
        .eq('id', mappingId);

      if (error) throw error;

      setFieldMappings((prev) =>
        prev.map((m) => (m.id === mappingId ? { ...m, is_enabled: enabled } : m))
      );
    } catch (error) {
      console.error('Error updating field mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to update field mapping',
        variant: 'destructive',
      });
    }
  };

  // Update sync settings
  const updateSyncSettings = async (key: string, value: any) => {
    if (!connection) return;

    try {
      const currentSettings = (connection.sync_settings as Record<string, any>) || {};
      const newSettings = { ...currentSettings, [key]: value };

      const { error } = await supabase
        .from('hubspot_connections')
        .update({ sync_settings: newSettings })
        .eq('id', connection.id);

      if (error) throw error;

      setConnection({ ...connection, sync_settings: newSettings });
    } catch (error) {
      console.error('Error updating sync settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  const syncSettings = (connection?.sync_settings as Record<string, any>) || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-12 h-12 rounded-xl bg-[#ff7a59] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
              <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.982V3.06A2.06 2.06 0 0017.37 1h-.042a2.06 2.06 0 00-2.06 2.06v.042c0 .86.496 1.604 1.218 1.963V7.93a5.728 5.728 0 00-3.044 1.609l-6.9-5.364a2.448 2.448 0 00.097-.682A2.448 2.448 0 004.193 1.05a2.448 2.448 0 00-2.444 2.443 2.448 2.448 0 002.444 2.444c.453 0 .874-.129 1.24-.342l6.787 5.276a5.764 5.764 0 00-.373 2.043c0 .726.136 1.42.382 2.06l-2.026 1.576a2.052 2.052 0 00-1.136-.346 2.06 2.06 0 00-2.06 2.06A2.06 2.06 0 009.067 20.4c.53 0 1.014-.204 1.38-.535l2.122-1.65a5.764 5.764 0 003.595 1.26 5.775 5.775 0 005.769-5.769 5.763 5.763 0 00-3.769-5.776zm-1.831 8.69a2.914 2.914 0 01-2.91-2.914 2.914 2.914 0 012.91-2.91 2.914 2.914 0 012.914 2.91 2.914 2.914 0 01-2.914 2.914z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold">HubSpot Integration</h2>
            <p className="text-muted-foreground">Sync contacts between TicketFlo and HubSpot CRM</p>
          </div>
        </div>

        {connection && (
          <Badge
            variant={connection.connection_status === 'connected' ? 'default' : 'destructive'}
            className={connection.connection_status === 'connected' ? 'bg-green-500' : ''}
          >
            {connection.connection_status === 'connected' ? (
              <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
            ) : (
              <><XCircle className="w-3 h-3 mr-1" /> {connection.connection_status}</>
            )}
          </Badge>
        )}
      </div>

      {!connection ? (
        /* Not Connected State */
        <Card>
          <CardHeader>
            <CardTitle>Connect to HubSpot</CardTitle>
            <CardDescription>
              Link your HubSpot account to sync contacts and customer data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Upload className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Push to HubSpot</p>
                  <p className="text-sm text-muted-foreground">
                    Send your {contactCount} TicketFlo contacts to HubSpot for marketing campaigns
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Download className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Pull from HubSpot</p>
                  <p className="text-sm text-muted-foreground">
                    Import HubSpot contacts to invite them to events
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={connectToHubSpot} disabled={connecting} className="w-full">
              {connecting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
              ) : (
                <><Link2 className="w-4 h-4 mr-2" /> Connect HubSpot Account</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Connected State */
        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sync"><Users className="w-4 h-4 mr-2" /> Sync Contacts</TabsTrigger>
            <TabsTrigger value="mappings"><Settings className="w-4 h-4 mr-2" /> Field Mappings</TabsTrigger>
            <TabsTrigger value="logs"><Clock className="w-4 h-4 mr-2" /> Sync History</TabsTrigger>
          </TabsList>

          {/* Sync Tab */}
          <TabsContent value="sync" className="space-y-4">
            {/* Connection Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-muted-foreground">Portal ID</Label>
                    <p className="font-medium">{connection.hub_id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Domain</Label>
                    <p className="font-medium">{connection.hub_domain || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Connected By</Label>
                    <p className="font-medium">{connection.user_email || 'N/A'}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={testConnection} disabled={testing}>
                    {testing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  <Button variant="outline" onClick={disconnectHubSpot}>
                    <Unlink className="w-4 h-4 mr-2" /> Disconnect
                  </Button>
                  <Button variant="ghost" asChild>
                    <a
                      href={`https://app.hubspot.com/contacts/${connection.hub_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> Open HubSpot
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Manual Sync */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manual Sync</CardTitle>
                <CardDescription>
                  Manually sync contacts between TicketFlo and HubSpot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card
                    className={`cursor-pointer transition-all ${
                      syncDirection === 'push' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSyncDirection('push')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Push to HubSpot</p>
                          <p className="text-sm text-muted-foreground">
                            {contactCount} contacts to sync
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${
                      syncDirection === 'pull' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSyncDirection('pull')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Download className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">Pull from HubSpot</p>
                          <p className="text-sm text-muted-foreground">
                            Import HubSpot contacts
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Conflict Resolution */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <Label>Conflict Resolution</Label>
                    <p className="text-sm text-muted-foreground">
                      When a contact exists in both systems
                    </p>
                  </div>
                  <Select
                    value={syncSettings.conflict_resolution || 'ticketflo_wins'}
                    onValueChange={(value) => updateSyncSettings('conflict_resolution', value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ticketflo_wins">TicketFlo data wins</SelectItem>
                      <SelectItem value="hubspot_wins">HubSpot data wins</SelectItem>
                      <SelectItem value="most_recent_wins">Most recent wins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={performSync}
                  disabled={syncing}
                  className="w-full"
                  size="lg"
                >
                  {syncing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                  ) : (
                    <>
                      {syncDirection === 'push' ? (
                        <Upload className="w-4 h-4 mr-2" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {syncDirection === 'push' ? 'Push Contacts to HubSpot' : 'Pull Contacts from HubSpot'}
                    </>
                  )}
                </Button>

                {connection.last_sync_at && (
                  <p className="text-sm text-muted-foreground text-center">
                    Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Field Mappings Tab */}
          <TabsContent value="mappings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Field Mappings</CardTitle>
                <CardDescription>
                  Configure how TicketFlo fields map to HubSpot contact properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>TicketFlo Field</TableHead>
                      <TableHead>HubSpot Property</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Custom</TableHead>
                      <TableHead className="text-right">Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">
                          {mapping.ticketflo_field.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {mapping.hubspot_property}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {mapping.sync_direction === 'push' && <Upload className="w-3 h-3 mr-1" />}
                            {mapping.sync_direction === 'pull' && <Download className="w-3 h-3 mr-1" />}
                            {mapping.sync_direction === 'both' && <RefreshCw className="w-3 h-3 mr-1" />}
                            {mapping.sync_direction}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {mapping.is_custom_property && (
                            <Badge variant="secondary">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={mapping.is_enabled}
                            onCheckedChange={(checked) => toggleFieldMapping(mapping.id, checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Sync Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sync Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Create Custom Properties</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create TicketFlo-specific properties in HubSpot
                    </p>
                  </div>
                  <Switch
                    checked={syncSettings.create_custom_properties ?? true}
                    onCheckedChange={(checked) =>
                      updateSyncSettings('create_custom_properties', checked)
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sync Tags</Label>
                    <p className="text-sm text-muted-foreground">
                      Include TicketFlo tags when syncing contacts
                    </p>
                  </div>
                  <Switch
                    checked={syncSettings.sync_tags ?? true}
                    onCheckedChange={(checked) => updateSyncSettings('sync_tags', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include Order History</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync order totals and purchase history
                    </p>
                  </div>
                  <Switch
                    checked={syncSettings.include_order_history ?? true}
                    onCheckedChange={(checked) =>
                      updateSyncSettings('include_order_history', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sync History</CardTitle>
                <CardDescription>Recent sync operations and their results</CardDescription>
              </CardHeader>
              <CardContent>
                {syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No sync history yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {log.operation_type.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.status === 'success'
                                  ? 'default'
                                  : log.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className={log.status === 'success' ? 'bg-green-500' : ''}
                            >
                              {log.status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {log.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.records_processed !== null && (
                              <span className="text-sm">
                                {log.records_created || 0} created, {log.records_updated || 0} updated
                                {(log.records_failed || 0) > 0 && (
                                  <span className="text-red-500 ml-1">
                                    ({log.records_failed} failed)
                                  </span>
                                )}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default HubSpotIntegration;
