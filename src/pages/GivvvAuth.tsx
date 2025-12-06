import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, Shield, Calendar, Users, BarChart3, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

// Givvv branding colors
const GIVVV_GREEN = "#10b981";

const GivvvAuth = () => {
  const [loading, setLoading] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState("");
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // OAuth params from Givvv
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const scope = searchParams.get("scope") || "events:read,orders:read";

  // Validate the request
  useEffect(() => {
    if (!clientId || clientId !== "givvv") {
      setError("Invalid client. Only Givvv integration is supported.");
      return;
    }

    if (!redirectUri) {
      setError("Missing redirect URI.");
      return;
    }

    // Validate redirect URI is from Givvv
    try {
      const url = new URL(redirectUri);
      const allowedHosts = [
        "localhost",
        "givvv.org",
        "www.givvv.org",
        "app.givvv.org",
        "givvv.netlify.app",
      ];
      if (!allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
        setError("Invalid redirect URI. Must be a Givvv domain.");
      }
    } catch {
      setError("Invalid redirect URI format.");
    }
  }, [clientId, redirectUri]);

  // Load user's organization
  useEffect(() => {
    const loadOrganization = async () => {
      if (!user) return;

      try {
        // Get user's organization memberships with admin/owner role
        const { data: memberships, error: memberError } = await supabase
          .from("organization_users")
          .select("organization_id, role, organizations(id, name)")
          .eq("user_id", user.id)
          .in("role", ["owner", "admin", "manager"]);

        if (memberError) {
          console.error("Error loading organization membership:", memberError);
          setError("Failed to load your organization. Please try again.");
          return;
        }

        if (!memberships || memberships.length === 0) {
          // Check if they have any membership at all (just not admin)
          const { data: anyMembership } = await supabase
            .from("organization_users")
            .select("role")
            .eq("user_id", user.id)
            .limit(1);

          if (anyMembership && anyMembership.length > 0) {
            setError(`You need to be an organization admin to connect Givvv. Your current role: ${anyMembership[0].role}`);
          } else {
            setError("You don't have an organization yet. Please create one in TicketFlo first.");
          }
          return;
        }

        // Use the first admin/owner organization (could add org picker later)
        const primaryMembership = memberships[0];
        if (primaryMembership?.organizations) {
          setOrganization({
            id: primaryMembership.organization_id,
            name: (primaryMembership.organizations as any).name,
          });
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load organization.");
      }
    };

    loadOrganization();
  }, [user]);

  const handleAuthorize = async () => {
    if (!organization || !redirectUri) return;

    setAuthorizing(true);
    setError("");

    try {
      // Generate a secure authorization code
      const code = crypto.randomUUID() + "-" + crypto.randomUUID();

      // Store the auth code in the database
      const { error: insertError } = await supabase
        .from("integration_auth_codes" as any)
        .insert({
          code,
          organization_id: organization.id,
          partner_platform: "givvv",
          redirect_uri: redirectUri,
          state: state || null,
          scopes: scope.split(","),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
        });

      if (insertError) {
        console.error("Error creating auth code:", insertError);
        throw new Error("Failed to create authorization code");
      }

      // Redirect back to Givvv with the code
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set("code", code);
      if (state) {
        callbackUrl.searchParams.set("state", state);
      }

      window.location.href = callbackUrl.toString();
    } catch (err) {
      console.error("Authorization error:", err);
      setError(err instanceof Error ? err.message : "Authorization failed");
      setAuthorizing(false);
    }
  };

  const handleDeny = () => {
    if (!redirectUri) {
      navigate("/dashboard");
      return;
    }

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set("error", "access_denied");
    callbackUrl.searchParams.set("error_description", "User denied access");
    if (state) {
      callbackUrl.searchParams.set("state", state);
    }

    window.location.href = callbackUrl.toString();
  };

  // If not logged in, redirect to auth page with return URL
  useEffect(() => {
    if (!authLoading && !user) {
      const returnUrl = `/auth/givvv?${searchParams.toString()}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
    }
  }, [user, authLoading, navigate, searchParams]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff4d00]" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  const requestedScopes = scope.split(",");
  const scopeDescriptions: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
    "events:read": {
      icon: <Calendar className="w-5 h-5" />,
      label: "View Events",
      description: "Access your event details, dates, and venues",
    },
    "orders:read": {
      icon: <Users className="w-5 h-5" />,
      label: "View Orders",
      description: "Access ticket sales and order information",
    },
    "analytics:read": {
      icon: <BarChart3 className="w-5 h-5" />,
      label: "View Analytics",
      description: "Access event statistics and revenue data",
    },
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#ff4d00]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors font-manrope">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </Link>
        </div>

        <Card className="bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl">
          <CardHeader className="text-center pb-4">
            {/* Platform logos */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-xl font-bold text-[#ff4d00]">TF</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-8 h-0.5 bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: GIVVV_GREEN }}>
                <span className="text-xl font-bold text-white">g</span>
              </div>
            </div>

            <CardTitle className="text-xl font-semibold text-white font-dm-sans">
              Connect to Givvv
            </CardTitle>
            <CardDescription className="text-gray-400 font-manrope">
              Givvv wants to access your TicketFlo account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error ? (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Organization info */}
                {organization && (
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Connecting organization</p>
                    <p className="text-white font-medium">{organization.name}</p>
                  </div>
                )}

                {/* Requested permissions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Givvv is requesting access to:</span>
                  </div>

                  <div className="space-y-2">
                    {requestedScopes.map((scopeKey) => {
                      const scopeInfo = scopeDescriptions[scopeKey];
                      if (!scopeInfo) return null;

                      return (
                        <div
                          key={scopeKey}
                          className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="text-emerald-400 mt-0.5">{scopeInfo.icon}</div>
                          <div>
                            <p className="text-white font-medium text-sm">{scopeInfo.label}</p>
                            <p className="text-gray-400 text-xs">{scopeInfo.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* What Givvv can do */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-400 font-medium mb-2">What this means:</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      Your events will appear in your Givvv dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      Combined donation + ticket revenue reports
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      You can disconnect at any time
                    </li>
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                    onClick={handleDeny}
                    disabled={authorizing}
                  >
                    Deny
                  </Button>
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: GIVVV_GREEN }}
                    onClick={handleAuthorize}
                    disabled={authorizing || !organization}
                  >
                    {authorizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Authorize
                      </>
                    )}
                  </Button>
                </div>

                {/* Trust info */}
                <p className="text-xs text-gray-500 text-center">
                  By authorizing, you agree to share the selected data with Givvv.
                  You can revoke access from your{" "}
                  <Link to="/dashboard/settings" className="text-emerald-400 hover:underline">
                    settings
                  </Link>
                  .
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure connection powered by{" "}
            <span className="text-[#ff4d00] font-medium">TicketFlo</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GivvvAuth;
