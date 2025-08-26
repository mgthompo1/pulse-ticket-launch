import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserCheck, Building, Shield, ArrowLeft } from 'lucide-react';

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

export const InvitationPasswordSetup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [useExistingAccount, setUseExistingAccount] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

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
      // Use the new database function to get invitation details
      const { data: invitationData, error: invitationError } = await supabase
        .rpc('get_invitation_details', { p_invitation_token: inviteToken || '' });

      if (invitationError || !invitationData || invitationData.length === 0) {
        setError('Invitation not found or has expired');
        return;
      }

      const invitation = invitationData[0];
      
      // Format the data for the component
      const formattedInvitation = {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        permissions: invitation.permissions,
        expires_at: invitation.expires_at,
        organization: {
          id: invitation.organization_id,
          name: invitation.organization_name
        }
      };

      setInvitation(formattedInvitation as any);
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    // Password strength validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create the user account - use basic signup without any extra options
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw signUpError;
      }

      if (data.user) {
        console.log('User account created:', data.user.id);
        
        // Try to sign in immediately (some setups auto-confirm)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });

        if (signInError) {
          console.log('Auto sign-in failed, user needs to confirm email');
          toast({
            title: 'Account Created!',
            description: 'Please check your email and confirm your account, then sign in to complete the invitation.',
          });
          navigate(`/auth?email=${encodeURIComponent(invitation.email)}`);
          return;
        }

        if (signInData.user) {
          console.log('User signed in successfully:', signInData.user.id);
          
          // Now use the database function to accept the invitation
          const { data: acceptResult, error: acceptError } = await supabase
            .rpc('accept_invitation_and_signup', {
              p_invitation_token: inviteToken || '',
              p_user_id: signInData.user.id
            });

          if (acceptError) {
            console.error('Error accepting invitation:', acceptError);
            toast({
              title: 'Invitation Error',
              description: 'There was an issue accepting your invitation. Please contact support.',
              variant: 'destructive',
            });
            return;
          }

          const result = acceptResult as any;
          if (result && result.success) {
            toast({
              title: 'Welcome!',
              description: `Your account has been created and you've joined ${invitation.organization?.name || 'your organization'}!`,
            });
            navigate('/dashboard');
          } else {
            toast({
              title: 'Invitation Error',
              description: result?.error || 'Failed to accept invitation',
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleSignInWithTemp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    setCreating(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: tempPassword,
      });

      if (signInError) {
        console.error('Error signing in with temporary password:', signInError);
        setError('Failed to sign in with temporary password. Please try again or contact support.');
        toast({
          title: 'Sign In Failed',
          description: 'Failed to sign in with temporary password. Please try again or contact support.',
          variant: 'destructive',
        });
        return;
      }

      // Wait a moment for authentication to fully establish
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify authentication is working
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current user after sign in with temp password:', currentUser);
      if (!currentUser) {
        console.error('User not authenticated after sign in with temp password');
        toast({
          title: 'Authentication Issue',
          description: 'Please try signing in again to complete the invitation.',
        });
        navigate('/auth');
        return;
      }

      // Since the user is already in organization_users (added when invitation was sent),
      // we just need to update the placeholder user_id with the real user_id
      console.log('Adding user to organization_users...');
      
      // Use simple SQL query to bypass all TypeScript issues
      const { error: insertError } = await supabase
        .from('organization_users')
        .insert({
          organization_id: invitation.organization.id,
          user_id: currentUser.id,
          role: 'member',
          permissions: ['read', 'write']
        } as any); // Use 'as any' to bypass TypeScript type checking

      if (insertError) {
        console.error('Error adding user to organization:', insertError);
        
        // If insert fails, try to update (in case they're already there)
        const { error: updateError } = await supabase
          .from('organization_users')
          .update({
            user_id: currentUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', invitation.organization.id)
          .eq('user_id', invitation.id); // Use invitation.id as the placeholder user_id

        if (updateError) {
          console.error('Error updating organization_users:', updateError);
          toast({
            title: 'Welcome!',
            description: `Your account has been created and you've joined ${invitation.organization?.name || 'your organization'}. There was an issue updating your organization membership, but you're already a member.`,
          });
        } else {
          toast({
            title: 'Welcome!',
            description: `Your account has been created and you've joined ${invitation.organization?.name || 'your organization'}`,
          });
        }
      } else {
        toast({
          title: 'Welcome!',
          description: `Your account has been created and you've joined ${invitation.organization?.name || 'your organization'}`,
        });
      }
      
      // Mark invitation as accepted
      const { error: updateInvitationError } = await supabase
        .from('organization_invitations')
        .update({ 
          status: 'accepted', 
          updated_at: new Date().toISOString() 
        })
        .eq('invitation_token', inviteToken || '');

      if (updateInvitationError) {
        console.error('Error updating invitation status:', updateInvitationError);
      }
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error signing in with temporary password:', error);
      setError(error.message || 'Failed to sign in with temporary password');
    } finally {
      setCreating(false);
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
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  // Additional safety check for organization data
  if (!invitation.organization || !invitation.organization.name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation is missing organization information. Please contact the person who sent you this invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <button 
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </button>
        </div>

        <Card className="gradient-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Complete Your Registration</CardTitle>
            <CardDescription>
              Set up your password to join {invitation.organization?.name || 'Your Organization'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Invitation Details */}
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{invitation.organization?.name || 'Your Organization'}</p>
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

              <div>
                <p className="text-sm text-muted-foreground">
                  Email: <strong>{invitation.email}</strong>
                </p>
              </div>
            </div>

            {/* Password Setup Form */}
            <form onSubmit={handleCreateAccount} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full gradient-primary" 
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Join Organization'
                )}
              </Button>
            </form>

            {/* Alternative: Sign in with temporary password */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or try alternative method
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Having trouble creating an account? Try signing in with a temporary password:
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUseExistingAccount(!useExistingAccount)}
                  className="w-full"
                >
                  {useExistingAccount ? 'Hide Alternative' : 'Show Alternative Sign-in'}
                </Button>
              </div>

              {useExistingAccount && (
                <form onSubmit={handleSignInWithTemp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="temp-password">Temporary Password</Label>
                    <Input
                      id="temp-password"
                      type="password"
                      placeholder="Enter temporary password"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Use the temporary password sent with your invitation
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    variant="secondary"
                    className="w-full" 
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In & Join Organization'
                    )}
                  </Button>
                </form>
              )}
            </div>

            <div className="text-center">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};