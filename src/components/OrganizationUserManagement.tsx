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
import { Trash2, UserPlus, Mail, Users } from 'lucide-react';
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
}

interface OrganizationUserManagementProps {
  organizationId: string;
  organizationName: string;
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

export const OrganizationUserManagement = ({ organizationId, organizationName }: OrganizationUserManagementProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_users')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      
      // Get user emails separately to avoid auth.users join issues
      const userEmails: Record<string, string> = {};
      if (data?.length) {
        const userIds = data.map(u => u.user_id);
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        authUsers?.users?.forEach(user => {
          if (userIds.includes(user.id)) {
            userEmails[user.id] = user.email || 'Unknown';
          }
        });
      }
      
      setUsers((data || []).map(user => ({
        ...user,
        permissions: user.permissions || [],
        joined_at: user.joined_at || new Date().toISOString(),
        users: userEmails[user.user_id] ? { email: userEmails[user.user_id] } : null
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
                    {orgUser.role !== 'owner' && (
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
                      {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        Cancel
                      </Button>
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