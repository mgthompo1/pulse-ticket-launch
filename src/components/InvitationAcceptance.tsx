import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, Building, Shield } from 'lucide-react';

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  organization: {
    name: string;
    id: string;
  };
  invited_by_email?: string;
  expires_at: string;
}

export const InvitationAcceptance = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    if (inviteToken) {
      loadInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [inviteToken]);

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organization:organizations(name, id)
        `)
        .eq('invitation_token', inviteToken || '')
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        setError('Invitation not found or has expired');
        return;
      }

      // Check if invitation has expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      setInvitation(data as any);
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to accept this invitation',
        variant: 'destructive',
      });
      return;
    }

    if (!invitation) return;

    // Check if user email matches invitation
    if (user.email !== invitation.email) {
      toast({
        title: 'Email Mismatch',
        description: `This invitation was sent to ${invitation.email}. Please sign in with that email address.`,
        variant: 'destructive',
      });
      return;
    }

    setAccepting(true);
    try {
      const { error } = await supabase.rpc('accept_organization_invitation', {
        p_invitation_token: inviteToken || ''
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `You've successfully joined ${invitation.organization.name}`,
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept invitation',
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'editor': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')} variant="outline">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join an organization on TicketFlo
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{invitation.organization.name}</p>
                <p className="text-sm text-muted-foreground">Organization</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div className="flex items-center space-x-2">
                <span className="text-sm">Role:</span>
                <Badge variant={getRoleBadgeVariant(invitation.role)}>
                  {invitation.role}
                </Badge>
              </div>
            </div>

            {invitation.permissions.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Permissions:</p>
                <div className="flex flex-wrap gap-1">
                  {invitation.permissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {permission.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user ? (
            user.email === invitation.email ? (
              <Button 
                onClick={handleAcceptInvitation} 
                disabled={accepting}
                className="w-full"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  This invitation was sent to <strong>{invitation.email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  You're currently signed in as <strong>{user.email}</strong>
                </p>
                <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
                  Sign in with correct email
                </Button>
              </div>
            )
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Create your account to accept this invitation
              </p>
              <Button 
                onClick={() => navigate(`/invitation-setup?invite=${inviteToken}`)} 
                className="w-full"
              >
                Create Account
              </Button>
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <button 
                  onClick={() => navigate('/auth')}
                  className="text-primary hover:underline"
                >
                  Sign in instead
                </button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};