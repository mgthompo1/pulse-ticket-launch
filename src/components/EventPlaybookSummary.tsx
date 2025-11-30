import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCRMAdapter, hasCRMConnection } from '@/lib/crm';
import type { CRMTimelineEvent, CRMContactUpdate } from '@/lib/crm/types';
import {
  Users,
  CheckCircle,
  XCircle,
  Flame,
  Snowflake,
  Phone,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Download,
  Upload,
  Loader2,
  Clock,
  Mail,
  UserCheck,
  UserX,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EventPlaybookSummaryProps {
  eventId: string;
  organizationId: string;
}

interface SummaryStats {
  totalInvited: number;
  totalRegistered: number;
  totalAttended: number;
  totalNoShow: number;
  totalDeclined: number;
  registrationRate: number;
  attendanceRate: number;
  outcomeCounts: Record<string, number>;
}

interface InviteForSync {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  invite_status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  outcome_tag: string | null;
  crm_type: string | null;
  crm_contact_id: string | null;
  crm_synced_at: string | null;
  crm_sync_status: string;
  notes_count?: number;
}

const OUTCOME_TAGS = [
  { id: 'hot_lead', label: 'Hot Lead', icon: <Flame className="h-4 w-4" />, color: 'text-red-600' },
  { id: 'warm', label: 'Warm', icon: <Flame className="h-4 w-4" />, color: 'text-orange-600' },
  { id: 'cold', label: 'Cold', icon: <Snowflake className="h-4 w-4" />, color: 'text-blue-600' },
  { id: 'follow_up', label: 'Follow Up', icon: <Phone className="h-4 w-4" />, color: 'text-purple-600' },
  { id: 'not_interested', label: 'Not Interested', icon: <XCircle className="h-4 w-4" />, color: 'text-gray-600' },
];

export function EventPlaybookSummary({ eventId, organizationId }: EventPlaybookSummaryProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [invites, setInvites] = useState<InviteForSync[]>([]);
  const [selectedForSync, setSelectedForSync] = useState<Set<string>>(new Set());
  const [hasCRM, setHasCRM] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [syncFilter, setSyncFilter] = useState<string>('all');

  useEffect(() => {
    loadSummaryData();
    checkCRMConnection();
  }, [eventId, organizationId]);

  const loadSummaryData = async () => {
    setLoading(true);
    try {
      // Load event data
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*, event_playbooks(*)')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEventData(event);

      // Load invites with note counts
      const { data: invitesData, error: invitesError } = await supabase
        .from('event_invites')
        .select(`
          *,
          notes:event_attendee_notes(count)
        `)
        .eq('event_id', eventId)
        .order('outcome_tag', { ascending: false, nullsFirst: false });

      if (invitesError) throw invitesError;

      const processedInvites = (invitesData || []).map((inv: any) => ({
        ...inv,
        notes_count: inv.notes?.[0]?.count || 0,
      }));

      setInvites(processedInvites);

      // Calculate stats
      const totalInvited = processedInvites.length;
      const totalRegistered = processedInvites.filter((i: InviteForSync) => i.invite_status === 'registered').length;
      const totalAttended = processedInvites.filter((i: InviteForSync) => i.checked_in).length;
      const totalNoShow = processedInvites.filter((i: InviteForSync) => i.invite_status === 'registered' && !i.checked_in).length;
      const totalDeclined = processedInvites.filter((i: InviteForSync) => i.invite_status === 'declined').length;

      const outcomeCounts: Record<string, number> = {};
      processedInvites.forEach((inv: InviteForSync) => {
        if (inv.outcome_tag) {
          outcomeCounts[inv.outcome_tag] = (outcomeCounts[inv.outcome_tag] || 0) + 1;
        }
      });

      setStats({
        totalInvited,
        totalRegistered,
        totalAttended,
        totalNoShow,
        totalDeclined,
        registrationRate: totalInvited > 0 ? (totalRegistered / totalInvited) * 100 : 0,
        attendanceRate: totalRegistered > 0 ? (totalAttended / totalRegistered) * 100 : 0,
        outcomeCounts,
      });

      // Auto-select all with CRM IDs for sync
      const withCRM = processedInvites.filter((i: InviteForSync) => i.crm_contact_id && i.crm_sync_status !== 'synced');
      setSelectedForSync(new Set(withCRM.map((i: InviteForSync) => i.id)));
    } catch (error) {
      console.error('Error loading summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event summary',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCRMConnection = async () => {
    try {
      const connected = await hasCRMConnection(organizationId);
      setHasCRM(connected);
    } catch (error) {
      console.error('Error checking CRM:', error);
    }
  };

  const handleSyncToCRM = async () => {
    if (selectedForSync.size === 0) {
      toast({
        title: 'No Contacts Selected',
        description: 'Please select contacts to sync',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    try {
      const adapter = await getCRMAdapter(organizationId);
      const toSync = invites.filter((i) => selectedForSync.has(i.id) && i.crm_contact_id);

      // Prepare timeline events
      const timelineEvents: CRMTimelineEvent[] = toSync.map((invite) => ({
        contactId: invite.crm_contact_id!,
        eventType: invite.checked_in ? 'event_attended' : 'event_invited',
        title: `${invite.checked_in ? 'Attended' : 'Invited to'} ${eventData?.title || 'Event'}`,
        body: buildEventBody(invite),
        timestamp: invite.checked_in_at ? new Date(invite.checked_in_at) : new Date(),
        metadata: {
          eventId,
          eventName: eventData?.title,
          outcome: invite.outcome_tag,
          checkedIn: invite.checked_in,
        },
      }));

      // Create timeline events in CRM
      const result = await adapter.createTimelineEvents(timelineEvents);

      // Update sync status in database
      const syncedIds = toSync.map((i) => i.id);
      await supabase
        .from('event_invites')
        .update({
          crm_synced_at: new Date().toISOString(),
          crm_sync_status: 'synced',
        })
        .in('id', syncedIds);

      toast({
        title: 'Sync Complete',
        description: `${result.syncedCount} contacts synced to CRM. ${result.failedCount > 0 ? `${result.failedCount} failed.` : ''}`,
      });

      setSelectedForSync(new Set());
      loadSummaryData();
    } catch (error: any) {
      console.error('Error syncing to CRM:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync contacts to CRM',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const buildEventBody = (invite: InviteForSync): string => {
    const parts = [];

    if (invite.checked_in) {
      parts.push(`Attended event on ${new Date(invite.checked_in_at!).toLocaleDateString()}`);
    } else if (invite.invite_status === 'registered') {
      parts.push('Registered but did not attend (no-show)');
    } else if (invite.invite_status === 'declined') {
      parts.push('Declined invitation');
    } else {
      parts.push('Was invited');
    }

    if (invite.outcome_tag) {
      const tag = OUTCOME_TAGS.find((t) => t.id === invite.outcome_tag);
      parts.push(`Outcome: ${tag?.label || invite.outcome_tag}`);
    }

    if (invite.notes_count && invite.notes_count > 0) {
      parts.push(`${invite.notes_count} notes recorded`);
    }

    return parts.join('\n');
  };

  const handleExportCSV = () => {
    const headers = ['Email', 'First Name', 'Last Name', 'Company', 'Status', 'Checked In', 'Outcome', 'Notes Count'];
    const rows = invites.map((i) => [
      i.email,
      i.first_name || '',
      i.last_name || '',
      i.company || '',
      i.invite_status,
      i.checked_in ? 'Yes' : 'No',
      i.outcome_tag || '',
      String(i.notes_count || 0),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-summary-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInvites = invites.filter((invite) => {
    if (syncFilter === 'all') return true;
    if (syncFilter === 'synced') return invite.crm_sync_status === 'synced';
    if (syncFilter === 'pending') return invite.crm_contact_id && invite.crm_sync_status !== 'synced';
    if (syncFilter === 'attended') return invite.checked_in;
    if (syncFilter === 'no_crm') return !invite.crm_contact_id;
    return true;
  });

  const toggleSelectAll = () => {
    const selectable = filteredInvites.filter((i) => i.crm_contact_id && i.crm_sync_status !== 'synced');
    if (selectedForSync.size === selectable.length) {
      setSelectedForSync(new Set());
    } else {
      setSelectedForSync(new Set(selectable.map((i) => i.id)));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>{eventData?.title || 'Event'} - Summary</CardTitle>
                <CardDescription>
                  {eventData?.event_playbooks?.name && (
                    <Badge variant="outline" className="mt-1">
                      {eventData.event_playbooks.name}
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={loadSummaryData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">{stats.totalInvited}</div>
              <div className="text-xs text-muted-foreground">Invited</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Mail className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="text-2xl font-bold">{stats.totalRegistered}</div>
              <div className="text-xs text-muted-foreground">Registered</div>
              <Progress value={stats.registrationRate} className="h-1 mt-2" />
              <span className="text-xs text-muted-foreground">{stats.registrationRate.toFixed(0)}%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold">{stats.totalAttended}</div>
              <div className="text-xs text-muted-foreground">Attended</div>
              <Progress value={stats.attendanceRate} className="h-1 mt-2" />
              <span className="text-xs text-muted-foreground">{stats.attendanceRate.toFixed(0)}%</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <UserX className="h-5 w-5 text-amber-600" />
              </div>
              <div className="text-2xl font-bold">{stats.totalNoShow}</div>
              <div className="text-xs text-muted-foreground">No-Shows</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold">{stats.totalDeclined}</div>
              <div className="text-xs text-muted-foreground">Declined</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outcome Breakdown */}
      {stats && Object.keys(stats.outcomeCounts).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Outcome Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {OUTCOME_TAGS.map((tag) => {
                const count = stats.outcomeCounts[tag.id] || 0;
                if (count === 0) return null;
                return (
                  <div key={tag.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <span className={tag.color}>{tag.icon}</span>
                    <span className="font-medium">{tag.label}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CRM Sync Section */}
      {hasCRM && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Sync to CRM
                </CardTitle>
                <CardDescription>
                  Push attendance and outcome data back to your CRM
                </CardDescription>
              </div>
              <Button
                onClick={handleSyncToCRM}
                disabled={syncing || selectedForSync.size === 0}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Sync {selectedForSync.size} Contacts
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <Select value={syncFilter} onValueChange={setSyncFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contacts</SelectItem>
                    <SelectItem value="pending">Pending Sync</SelectItem>
                    <SelectItem value="synced">Already Synced</SelectItem>
                    <SelectItem value="attended">Attended Only</SelectItem>
                    <SelectItem value="no_crm">No CRM Link</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSyncDetails(!showSyncDetails)}
                >
                  {showSyncDetails ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show Details ({filteredInvites.length})
                    </>
                  )}
                </Button>
              </div>

              {/* Sync Table */}
              {showSyncDetails && (
                <div className="border rounded-lg max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedForSync.size > 0 &&
                              selectedForSync.size ===
                                filteredInvites.filter((i) => i.crm_contact_id && i.crm_sync_status !== 'synced').length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Sync Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedForSync.has(invite.id)}
                              disabled={!invite.crm_contact_id || invite.crm_sync_status === 'synced'}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedForSync);
                                if (checked) {
                                  newSelected.add(invite.id);
                                } else {
                                  newSelected.delete(invite.id);
                                }
                                setSelectedForSync(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {invite.first_name || invite.last_name
                                  ? `${invite.first_name || ''} ${invite.last_name || ''}`.trim()
                                  : invite.email}
                              </span>
                              <p className="text-xs text-muted-foreground">{invite.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {invite.checked_in ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Attended
                              </Badge>
                            ) : invite.invite_status === 'registered' ? (
                              <Badge className="bg-amber-100 text-amber-800">
                                <Clock className="h-3 w-3 mr-1" />
                                No-Show
                              </Badge>
                            ) : (
                              <Badge variant="outline">{invite.invite_status}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {invite.outcome_tag && (
                              <span className="flex items-center gap-1">
                                {OUTCOME_TAGS.find((t) => t.id === invite.outcome_tag)?.icon}
                                {OUTCOME_TAGS.find((t) => t.id === invite.outcome_tag)?.label}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!invite.crm_contact_id ? (
                              <Badge variant="outline" className="text-gray-500">
                                No CRM Link
                              </Badge>
                            ) : invite.crm_sync_status === 'synced' ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Synced
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-blue-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No CRM Notice */}
      {!hasCRM && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No CRM Connected</p>
            <p className="text-sm">Connect a CRM in Settings to sync event data back to your contact records.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
