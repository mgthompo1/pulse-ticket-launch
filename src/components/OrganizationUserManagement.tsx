import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, UserPlus, Mail, Users, Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface OrganizationUser {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: string[];
  joined_at: string;
  users?: {
    email: string;
  } | null;
}

interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: string[];
  status: string;
  expires_at: string;
  created_at: string;
  invitation_token: string;
}

interface OrganizationUserManagementProps {
  organizationId: string;
  organizationName: string;
  currentUserRole?: 'owner' | 'admin' | 'editor' | 'viewer';
}

const PERMISSIONS = [
  { id: 'manage_events', label: 'Manage Events', description: 'Create, edit, and delete events' },
  { id: 'edit_events', label: 'Edit Events', description: 'Edit existing events' },
  { id: 'view_events', label: 'View Events', description: 'View event details' },
  { id: 'manage_payments', label: 'Manage Payments', description: 'Configure payment settings' },
  { id: 'view_payments', label: 'View Payments', description: 'View payment information' },
  { id: 'manage_users', label: 'Manage Users', description: 'Invite and manage organization users' },
  { id: 'view_analytics', label: 'View Analytics', description: 'View event analytics and reports' },
];

export const OrganizationUserManagement = ({ organizationId, organizationName, currentUserRole }: OrganizationUserManagementProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<'owner'|'admin'|'editor'|'viewer'|'unknown'>('unknown');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadUsers();
      loadInvitations();
    }
  }, [organizationId]);
  
  // Keep current role in sync with parent-provided role
  useEffect(() => {
    if (currentUserRole) {
      setCurrentRole(currentUserRole);
    }
  }, [currentUserRole]);
  const canManageUsers = currentRole === 'owner' || currentRole === 'admin';


  const loadUsers = async () => {
    try {
      // Ensure the auth token is forwarded so the Edge Function can verify membership
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('list-org-users', {
        body: { organizationId },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (error) throw error;
      const rows = (data?.users || []) as any[];
      setUsers(rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        role: row.role,
        permissions: row.permissions || [],
        joined_at: row.joined_at || new Date().toISOString(),
        users: row.email ? { email: row.email } : null
      })) as OrganizationUser[]);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization users',
        variant: 'destructive',
      });
    }
  };

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      if (error) throw error;
      setInvitations((data || []).map(invitation => ({
        ...invitation,
        permissions: invitation.permissions || [],
        created_at: invitation.created_at || new Date().toISOString(),
        expires_at: invitation.expires_at || new Date().toISOString()
      })) as Invitation[]);
    } catch (error: any) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail || !inviteRole) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      console.log('Sending invitation with data:', {
        email: inviteEmail,
        role: inviteRole,
        permissions: invitePermissions,
        organizationId,
      });

      const { data, error } = await supabase.functions.invoke('send-organization-invitation', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          permissions: invitePermissions,
          organizationId,
        }
      });

      console.log('Invitation response:', { data, error });

      if (error) throw error;

      // Handle different response scenarios
      if (data?.alreadyMember) {
        // User is already a member of this organization
        toast({
          title: 'Already a Member',
          description: data.message || `This user is already a member of your organization.`,
          variant: 'destructive',
        });
        return;
      }

      if (data?.addedDirectly) {
        // User existed and was added directly (no invitation needed)
        toast({
          title: 'User Added',
          description: data.message || `User has been added to your organization.`,
        });
        setInviteDialogOpen(false);
        setInviteEmail('');
        setInviteRole('viewer');
        setInvitePermissions([]);
        // Reload users since they were added directly
        loadUsers();
        return;
      }

      // Normal invitation sent
      toast({
        title: 'Success',
        description: `Invitation sent to ${inviteEmail}`,
      });

      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
      setInvitePermissions([]);
      loadInvitations();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User removed from organization',
      });
      loadUsers();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user',
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation cancelled',
      });
      loadInvitations();
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'destructive';
      case 'editor': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const handleCopyInvitationLink = async (invitationToken: string) => {
    const invitationUrl = `${window.location.origin}/invite?token=${invitationToken}`;
    
    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast({
        title: 'Success',
        description: 'Invitation link copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy invitation link',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">
            Manage users and permissions for {organizationName}
          </p>
        </div>

        {canManageUsers && (
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {PERMISSIONS.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={invitePermissions.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setInvitePermissions([...invitePermissions, permission.id]);
                          } else {
                            setInvitePermissions(invitePermissions.filter(p => p !== permission.id));
                          }
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendInvitation} disabled={sending}>
                  {sending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Active Users ({users.length})
          </CardTitle>
          <CardDescription>
            Users who have access to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((orgUser) => (
                <TableRow key={orgUser.id}>
                  <TableCell>
                    {orgUser.users?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(orgUser.role)}>
                      {orgUser.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {orgUser.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {PERMISSIONS.find(p => p.id === permission)?.label || permission}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(orgUser.joined_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {canManageUsers && orgUser.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(orgUser.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invitation Link</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                          {`${window.location.origin}/invite?token=${invitation.invitation_token}`}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyInvitationLink(invitation.invitation_token)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyInvitationLink(invitation.invitation_token)}
                          title="Copy invitation link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};