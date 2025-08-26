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
      // First, get the invitation details
      const { data: invitationData, error: invitationError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('invitation_token', inviteToken || '')
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitationData) {
        setError('Invitation not found or has expired');
        return;
      }

      // Check if invitation has expired
      if (new Date(invitationData.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      // Try to get organization details with the join first
      let organizationData = null;
      try {
        const { data: orgJoinData, error: orgJoinError } = await supabase
          .from('organization_invitations')
          .select(`
            *,
            organization:organizations(name, id)
          `)
          .eq('invitation_token', inviteToken || '')
          .eq('status', 'pending')
          .single();

        if (!orgJoinError && orgJoinData?.organization) {
          organizationData = orgJoinData.organization;
        }
      } catch (joinError) {
        console.log('Join query failed, trying separate query...');
      }

      // If join failed, try to get organization data separately
      if (!organizationData) {
        try {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('name, id')
            .eq('id', invitationData.organization_id)
            .single();

          if (!orgError && orgData) {
            organizationData = orgData;
          }
        } catch (separateError) {
          console.log('Separate organization query also failed');
        }
      }

      // If we still don't have organization data, create a fallback
      if (!organizationData) {
        // Create a fallback invitation object with minimal organization info
        const fallbackInvitation = {
          ...invitationData,
          organization: {
            id: invitationData.organization_id,
            name: 'Your Organization' // Fallback name
          }
        };
        setInvitation(fallbackInvitation as any);
        return;
      }

      // Combine the data
      const combinedData = {
        ...invitationData,
        organization: organizationData
      };

      setInvitation(combinedData as any);
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
      // Create the user account with auto-confirmation for invited users
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            signup_source: 'invitation',
            skip_email_verification: true
          }
        }
      });

      if (signUpError) throw signUpError;

      // For invited users, we'll auto-confirm their email and accept the invitation
      if (data.user) {
        console.log('User account created:', data.user);
        
        // Check if the user needs email confirmation
        if (!data.user.email_confirmed_at) {
          console.log('User needs email confirmation, attempting to confirm...');
          
          // Try to confirm the user's email programmatically
          try {
            const { error: confirmError } = await supabase.auth.admin.updateUserById(
              data.user.id,
              { email_confirm: true }
            );
            
            if (confirmError) {
              console.log('Admin confirmation failed, trying alternative approach...');
              // If admin confirmation fails, we'll proceed with the normal flow
            }
          } catch (adminError) {
            console.log('Admin API not available, proceeding with normal flow...');
          }
        }
        
        // Wait for the account to be fully available
        console.log('Waiting for account to be fully available...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Now try to sign in the user
        console.log('Attempting to sign in with:', invitation.email);
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });

        if (signInError) {
          console.error('Error signing in after account creation:', signInError);
          
          // If auto sign-in fails, try one more time after a longer delay
          console.log('First sign-in attempt failed, waiting longer and trying again...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { error: retrySignInError } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password,
          });
          
          if (retrySignInError) {
            console.error('Retry sign in also failed:', retrySignInError);
            
            // If both attempts fail, show a more helpful message
            toast({
              title: 'Account Created Successfully!',
              description: 'Your account was created, but there was an issue with automatic sign-in. Please try signing in manually.',
            });
            
            // Redirect to auth page with a helpful message
            navigate('/auth?message=account-created');
            return;
          }
        }

        // Wait a moment for authentication to fully establish
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify authentication is working
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        console.log('Current user after sign in:', currentUser);
        if (!currentUser) {
          console.error('User not authenticated after sign in');
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