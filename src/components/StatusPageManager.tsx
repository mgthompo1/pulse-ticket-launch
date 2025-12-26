import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  XCircle,
  Clock,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import {
  fetchServices,
  fetchIncidents,
  createIncident,
  updateIncident,
  resolveIncident,
  updateServiceStatus,
  getStatusPageUrl,
  getStatusColor,
  getSeverityColor,
  formatStatus,
  type KodoService,
  type KodoIncident,
} from "@/lib/kodo-client";

export function StatusPageManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<KodoService[]>([]);
  const [incidents, setIncidents] = useState<KodoIncident[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingService, setUpdatingService] = useState<string | null>(null);
  const [resolvingIncident, setResolvingIncident] = useState<string | null>(null);

  // New incident form state
  const [newIncident, setNewIncident] = useState({
    title: "",
    severity: "major" as "minor" | "major" | "critical",
    status: "investigating" as "investigating" | "identified" | "monitoring" | "resolved",
    message: "",
    services: [] as string[],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [servicesData, incidentsData] = await Promise.all([
        fetchServices(),
        fetchIncidents(),
      ]);
      setServices(servicesData);
      setIncidents(incidentsData);
    } catch (error) {
      console.error("Failed to load status data:", error);
      toast({
        title: "Error",
        description: "Failed to load status page data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateIncident = async () => {
    if (!newIncident.title || !newIncident.message) {
      toast({
        title: "Validation Error",
        description: "Title and message are required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const result = await createIncident({
        title: newIncident.title,
        severity: newIncident.severity,
        status: newIncident.status,
        message: newIncident.message,
        services: newIncident.services.length > 0 ? newIncident.services : undefined,
      });

      if (result) {
        toast({
          title: "Incident Created",
          description: "The incident has been published to the status page",
        });
        setCreateDialogOpen(false);
        setNewIncident({
          title: "",
          severity: "major",
          status: "investigating",
          message: "",
          services: [],
        });
        loadData();
      } else {
        throw new Error("Failed to create incident");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create incident",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateServiceStatus = async (serviceId: string, status: KodoService["status"]) => {
    setUpdatingService(serviceId);
    try {
      const success = await updateServiceStatus(serviceId, status);
      if (success) {
        toast({
          title: "Status Updated",
          description: "Service status has been updated",
        });
        loadData();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive",
      });
    } finally {
      setUpdatingService(null);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    setResolvingIncident(incidentId);
    try {
      const success = await resolveIncident(incidentId, "Issue has been resolved.");
      if (success) {
        toast({
          title: "Incident Resolved",
          description: "The incident has been marked as resolved",
        });
        loadData();
      } else {
        throw new Error("Failed to resolve incident");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve incident",
        variant: "destructive",
      });
    } finally {
      setResolvingIncident(null);
    }
  };

  const getServiceIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "partial_outage":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "major_outage":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "maintenance":
        return <Wrench className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const activeIncidents = incidents.filter((i) => i.status !== "resolved");
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved").slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3 text-lg">Loading status page data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Status Page Management
          </h2>
          <p className="text-muted-foreground">
            Manage your public status page via Kodo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={getStatusPageUrl()} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Status Page
            </a>
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
                <DialogDescription>
                  Report an incident to be displayed on your public status page
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., API Performance Degradation"
                    value={newIncident.title}
                    onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={newIncident.severity}
                      onValueChange={(v: "minor" | "major" | "critical") =>
                        setNewIncident({ ...newIncident, severity: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="major">Major</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={newIncident.status}
                      onValueChange={(v: "investigating" | "identified" | "monitoring" | "resolved") =>
                        setNewIncident({ ...newIncident, status: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="identified">Identified</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Affected Services</Label>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <Badge
                        key={service.id}
                        variant={newIncident.services.includes(service.name) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const updated = newIncident.services.includes(service.name)
                            ? newIncident.services.filter((s) => s !== service.name)
                            : [...newIncident.services, service.name];
                          setNewIncident({ ...newIncident, services: updated });
                        }}
                      >
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Describe the incident and current status..."
                    value={newIncident.message}
                    onChange={(e) => setNewIncident({ ...newIncident, message: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateIncident} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Incident
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground">
              {services.filter((s) => s.status === "operational").length} operational
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeIncidents.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeIncidents.filter((i) => i.severity === "critical").length} critical
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {activeIncidents.length === 0 ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-green-600">All Systems Operational</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  <span className="text-orange-600">Issues Detected</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>Manage the status of your services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className={`flex items-center justify-between p-4 border-2 rounded-lg ${getStatusColor(service.status)}`}
              >
                <div className="flex items-center gap-3">
                  {getServiceIcon(service.status)}
                  <div>
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={getStatusColor(service.status)}>
                    {formatStatus(service.status)}
                  </Badge>
                  <Select
                    value={service.status}
                    onValueChange={(v: KodoService["status"]) => handleUpdateServiceStatus(service.id, v)}
                    disabled={updatingService === service.id}
                  >
                    <SelectTrigger className="w-[140px]">
                      {updatingService === service.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="degraded">Degraded</SelectItem>
                      <SelectItem value="partial_outage">Partial Outage</SelectItem>
                      <SelectItem value="major_outage">Major Outage</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Active Incidents ({activeIncidents.length})
          </CardTitle>
          <CardDescription>Currently ongoing incidents</CardDescription>
        </CardHeader>
        <CardContent>
          {activeIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
              <p>No active incidents</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-4 border-2 rounded-lg ${getSeverityColor(incident.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getSeverityColor(incident.severity)}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{formatStatus(incident.status)}</Badge>
                      </div>
                      <h4 className="font-semibold">{incident.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{incident.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {format(new Date(incident.created_at), "PPp")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolveIncident(incident.id)}
                      disabled={resolvingIncident === incident.id}
                    >
                      {resolvingIncident === incident.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Resolved Incidents */}
      {resolvedIncidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Recently Resolved
            </CardTitle>
            <CardDescription>Last 5 resolved incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resolvedIncidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{incident.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Resolved {incident.resolved_at ? format(new Date(incident.resolved_at), "PPp") : "N/A"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    Resolved
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StatusPageManager;
