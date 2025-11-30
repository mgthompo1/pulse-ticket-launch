import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCRMAdapter, hasCRMConnection } from '@/lib/crm';
import type { CRMList, CRMContact } from '@/lib/crm/types';
import {
  Users,
  Plus,
  Search,
  Mail,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  UserPlus,
  Upload,
  Download,
  Send,
  Building2,
  Briefcase,
  Phone,
  ExternalLink,
  Loader2,
  RefreshCw,
  Flame,
  Snowflake,
  Trash2,
  Edit,
} from 'lucide-react';

interface EventInviteManagerProps {
  eventId: string;
  organizationId: string;
}

interface Invite {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  invite_status: string;
  invite_sent_at: string | null;
  registered_at: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  outcome_tag: string | null;
  crm_type: string | null;
  crm_contact_id: string | null;
  crm_context: Record<string, unknown>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
  invited: { label: 'Invited', color: 'bg-blue-100 text-blue-800', icon: <Mail className="h-3 w-3" /> },
  opened: { label: 'Opened', color: 'bg-cyan-100 text-cyan-800', icon: <ExternalLink className="h-3 w-3" /> },
  clicked: { label: 'Clicked', color: 'bg-purple-100 text-purple-800', icon: <ExternalLink className="h-3 w-3" /> },
  registered: { label: 'Registered', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
  waitlisted: { label: 'Waitlisted', color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
};

const OUTCOME_TAGS = [
  { id: 'hot_lead', label: 'Hot Lead', icon: <Flame className="h-4 w-4 text-red-500" />, color: 'text-red-600' },
  { id: 'warm', label: 'Warm', icon: <Flame className="h-4 w-4 text-orange-500" />, color: 'text-orange-600' },
  { id: 'cold', label: 'Cold', icon: <Snowflake className="h-4 w-4 text-blue-500" />, color: 'text-blue-600' },
  { id: 'follow_up', label: 'Follow Up', icon: <Phone className="h-4 w-4 text-purple-500" />, color: 'text-purple-600' },
  { id: 'not_interested', label: 'Not Interested', icon: <XCircle className="h-4 w-4 text-gray-500" />, color: 'text-gray-600' },
];

export function EventInviteManager({ eventId, organizationId }: EventInviteManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvites, setSelectedInvites] = useState<Set<string>>(new Set());

  // CRM state
  const [hasCRM, setHasCRM] = useState(false);
  const [crmLists, setCrmLists] = useState<CRMList[]>([]);
  const [loadingCRM, setLoadingCRM] = useState(false);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');

  // Add invite form
  const [newInvite, setNewInvite] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    job_title: '',
  });
  const [addingInvite, setAddingInvite] = useState(false);

  // CRM import state
  const [selectedList, setSelectedList] = useState<string>('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadInvites();
    checkCRMConnection();
  }, [eventId, organizationId]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_invites')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error loading invites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load guest list',
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
      console.error('Error checking CRM connection:', error);
    }
  };

  const loadCRMLists = async () => {
    setLoadingCRM(true);
    try {
      const adapter = await getCRMAdapter(organizationId);
      const lists = await adapter.getLists();
      setCrmLists(lists);
    } catch (error) {
      console.error('Error loading CRM lists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load CRM lists',
        variant: 'destructive',
      });
    } finally {
      setLoadingCRM(false);
    }
  };

  const handleAddInvite = async () => {
    if (!newInvite.email) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setAddingInvite(true);
    try {
      const { error } = await supabase.from('event_invites').insert({
        event_id: eventId,
        email: newInvite.email.toLowerCase(),
        first_name: newInvite.first_name || null,
        last_name: newInvite.last_name || null,
        company: newInvite.company || null,
        job_title: newInvite.job_title || null,
        invite_status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already on the guest list');
        }
        throw error;
      }

      toast({
        title: 'Guest Added',
        description: `${newInvite.email} has been added to the guest list`,
      });

      setNewInvite({ email: '', first_name: '', last_name: '', company: '', job_title: '' });
      setShowAddDialog(false);
      loadInvites();
    } catch (error: any) {
      console.error('Error adding invite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add guest',
        variant: 'destructive',
      });
    } finally {
      setAddingInvite(false);
    }
  };

  const handleImportFromCRM = async () => {
    if (!selectedList) {
      toast({
        title: 'Select a List',
        description: 'Please select a CRM list to import',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      const adapter = await getCRMAdapter(organizationId);
      const contacts = await adapter.getListContacts(selectedList, 500);

      if (contacts.length === 0) {
        toast({
          title: 'No Contacts',
          description: 'The selected list has no contacts',
        });
        return;
      }

      // Get connection status to know CRM type
      const status = await adapter.getConnectionStatus();

      // Insert contacts as invites
      const inviteData = contacts
        .filter((c) => c.email)
        .map((contact) => ({
          event_id: eventId,
          email: contact.email.toLowerCase(),
          first_name: contact.firstName || null,
          last_name: contact.lastName || null,
          company: contact.company || null,
          job_title: contact.jobTitle || null,
          phone: contact.phone || null,
          crm_type: status.crmType,
          crm_contact_id: contact.id,
          crm_context: contact.context || {},
          invite_status: 'pending',
        }));

      const { error, data } = await supabase
        .from('event_invites')
        .upsert(inviteData, {
          onConflict: 'event_id,email',
          ignoreDuplicates: true,
        })
        .select();

      toast({
        title: 'Import Complete',
        description: `${data?.length || 0} contacts imported from CRM`,
      });

      setShowImportDialog(false);
      setSelectedList('');
      loadInvites();
    } catch (error: any) {
      console.error('Error importing from CRM:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import contacts',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSendInvites = async (inviteIds?: string[]) => {
    const idsToSend = inviteIds || Array.from(selectedInvites);
    if (idsToSend.length === 0) {
      toast({
        title: 'No Guests Selected',
        description: 'Please select guests to send invites to',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Update status to invited
      const { error } = await supabase
        .from('event_invites')
        .update({
          invite_status: 'invited',
          invite_sent_at: new Date().toISOString(),
          invite_sent_via: 'manual',
        })
        .in('id', idsToSend);

      if (error) throw error;

      toast({
        title: 'Invites Marked as Sent',
        description: `${idsToSend.length} invites marked as sent. Email sending coming soon.`,
      });

      setSelectedInvites(new Set());
      loadInvites();
    } catch (error) {
      console.error('Error sending invites:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invite status',
        variant: 'destructive',
      });
    }
  };

  const handleTagOutcome = async (inviteId: string, tag: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('event_invites')
        .update({
          outcome_tag: tag,
          outcome_tagged_at: new Date().toISOString(),
          outcome_tagged_by: user?.id,
        })
        .eq('id', inviteId);

      if (error) throw error;

      toast({ title: 'Outcome Tagged', description: `Guest tagged as ${tag}` });
      loadInvites();
    } catch (error) {
      console.error('Error tagging outcome:', error);
      toast({
        title: 'Error',
        description: 'Failed to tag outcome',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteInvites = async (inviteIds: string[]) => {
    try {
      const { error } = await supabase
        .from('event_invites')
        .delete()
        .in('id', inviteIds);

      if (error) throw error;

      toast({
        title: 'Guests Removed',
        description: `${inviteIds.length} guests removed from the list`,
      });

      setSelectedInvites(new Set());
      loadInvites();
    } catch (error) {
      console.error('Error deleting invites:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove guests',
        variant: 'destructive',
      });
    }
  };

  // Filter invites
  const filteredInvites = invites.filter((invite) => {
    const matchesSearch =
      !searchQuery ||
      invite.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invite.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invite.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invite.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invite.invite_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: invites.length,
    pending: invites.filter((i) => i.invite_status === 'pending').length,
    invited: invites.filter((i) => i.invite_status === 'invited').length,
    registered: invites.filter((i) => i.invite_status === 'registered').length,
    attended: invites.filter((i) => i.checked_in).length,
  };

  const toggleSelectAll = () => {
    if (selectedInvites.size === filteredInvites.length) {
      setSelectedInvites(new Set());
    } else {
      setSelectedInvites(new Set(filteredInvites.map((i) => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedInvites);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvites(newSelected);
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
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Guests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.invited}</div>
            <div className="text-xs text-muted-foreground">Invited</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.registered}</div>
            <div className="text-xs text-muted-foreground">Registered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.attended}</div>
            <div className="text-xs text-muted-foreground">Attended</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Guest List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest List
              </CardTitle>
              <CardDescription>Manage your event invite list</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasCRM && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowImportDialog(true);
                    loadCRMLists();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import from CRM
                </Button>
              )}
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Guest
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filter Row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadInvites}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedInvites.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedInvites.size} selected</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => handleSendInvites()}>
                <Send className="h-4 w-4 mr-2" />
                Send Invites
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDeleteInvites(Array.from(selectedInvites))}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          )}

          {/* Table */}
          {filteredInvites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No guests yet</p>
              <p className="text-sm">Add guests manually or import from your CRM</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedInvites.size === filteredInvites.length && filteredInvites.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvites.has(invite.id)}
                          onCheckedChange={() => toggleSelect(invite.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {invite.first_name || invite.last_name
                              ? `${invite.first_name || ''} ${invite.last_name || ''}`.trim()
                              : invite.email}
                          </span>
                          <span className="text-sm text-muted-foreground">{invite.email}</span>
                          {invite.crm_type && (
                            <Badge variant="outline" className="mt-1 w-fit text-xs">
                              {invite.crm_type}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {invite.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              {invite.company}
                            </span>
                          )}
                          {invite.job_title && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {invite.job_title}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {STATUS_CONFIG[invite.invite_status] && (
                          <Badge className={`${STATUS_CONFIG[invite.invite_status].color} flex items-center gap-1 w-fit`}>
                            {STATUS_CONFIG[invite.invite_status].icon}
                            {STATUS_CONFIG[invite.invite_status].label}
                          </Badge>
                        )}
                        {invite.checked_in && (
                          <Badge className="bg-purple-100 text-purple-800 mt-1 flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Checked In
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-auto px-2">
                              {invite.outcome_tag ? (
                                <span className="flex items-center gap-1">
                                  {OUTCOME_TAGS.find((t) => t.id === invite.outcome_tag)?.icon}
                                  {OUTCOME_TAGS.find((t) => t.id === invite.outcome_tag)?.label}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Tag outcome</span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {OUTCOME_TAGS.map((tag) => (
                              <DropdownMenuItem
                                key={tag.id}
                                onClick={() => handleTagOutcome(invite.id, tag.id)}
                              >
                                <span className="flex items-center gap-2">
                                  {tag.icon}
                                  {tag.label}
                                </span>
                              </DropdownMenuItem>
                            ))}
                            {invite.outcome_tag && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleTagOutcome(invite.id, '')}
                                  className="text-muted-foreground"
                                >
                                  Clear tag
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invite.invite_status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleSendInvites([invite.id])}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteInvites([invite.id])}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Guest Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Guest</DialogTitle>
            <DialogDescription>Add a new guest to your event invite list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="guest@example.com"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={newInvite.first_name}
                  onChange={(e) => setNewInvite({ ...newInvite, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={newInvite.last_name}
                  onChange={(e) => setNewInvite({ ...newInvite, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Acme Inc."
                value={newInvite.company}
                onChange={(e) => setNewInvite({ ...newInvite, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                placeholder="Marketing Director"
                value={newInvite.job_title}
                onChange={(e) => setNewInvite({ ...newInvite, job_title: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInvite} disabled={addingInvite}>
              {addingInvite ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Guest
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from CRM Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from CRM</DialogTitle>
            <DialogDescription>Import contacts from your CRM to the guest list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingCRM ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : crmLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No lists found in your CRM.</p>
                <p className="text-sm">Create a list in your CRM first, then import it here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select a List</Label>
                <Select value={selectedList} onValueChange={setSelectedList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a CRM list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {crmLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        <span className="flex items-center gap-2">
                          {list.name}
                          <span className="text-muted-foreground">({list.contactCount} contacts)</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportFromCRM} disabled={importing || !selectedList}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Contacts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
