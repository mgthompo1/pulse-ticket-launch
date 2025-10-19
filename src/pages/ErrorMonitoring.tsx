import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Filter, RefreshCw, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ErrorLog {
  id: string;
  error_message: string;
  error_stack: string | null;
  context: any;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  function_name: string | null;
  user_id: string | null;
  timestamp: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
}

export default function ErrorMonitoring() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('unresolved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  // Check if user is authenticated and has access
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load error logs
  const loadErrors = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      // Apply filters
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (resolvedFilter === 'resolved') {
        query = query.eq('resolved', true);
      } else if (resolvedFilter === 'unresolved') {
        query = query.eq('resolved', false);
      }

      if (searchQuery) {
        query = query.or(`error_message.ilike.%${searchQuery}%,function_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading error logs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load error logs',
          variant: 'destructive',
        });
        return;
      }

      setErrors(data || []);
    } catch (error) {
      console.error('Error loading error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadErrors();
    }
  }, [user, severityFilter, resolvedFilter, searchQuery]);

  // Mark error as resolved
  const markAsResolved = async (errorId: string) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', errorId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Error marked as resolved',
      });

      loadErrors();
    } catch (error) {
      console.error('Error marking as resolved:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark error as resolved',
        variant: 'destructive',
      });
    }
  };

  // Get severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-orange-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      case 'debug':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Monitoring</h1>
          <p className="text-gray-600">Monitor and manage application errors</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search errors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Severity Filter */}
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>

              {/* Resolved Filter */}
              <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unresolved">Unresolved</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={loadErrors} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Errors</p>
                  <p className="text-2xl font-bold text-gray-900">{errors.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {errors.filter((e) => e.severity === 'critical' && !e.resolved).length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unresolved</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {errors.filter((e) => !e.resolved).length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {errors.filter((e) => e.resolved).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error List */}
        <Card>
          <CardHeader>
            <CardTitle>Error Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : errors.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No errors found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedError(error)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(error.severity)}>
                          <span className="flex items-center gap-1">
                            {getSeverityIcon(error.severity)}
                            {error.severity.toUpperCase()}
                          </span>
                        </Badge>
                        {error.function_name && (
                          <Badge variant="outline">{error.function_name}</Badge>
                        )}
                        {error.resolved && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-gray-900 font-medium mb-2">{error.error_message}</p>

                    {error.error_stack && (
                      <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto max-h-20">
                        {error.error_stack.split('\n')[0]}...
                      </pre>
                    )}

                    {!error.resolved && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsResolved(error.id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Detail Modal */}
        {selectedError && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedError(null)}
          >
            <Card
              className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Error Details</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedError(null)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Severity</label>
                  <div className="mt-1">
                    <Badge className={getSeverityColor(selectedError.severity)}>
                      {selectedError.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {selectedError.function_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Function</label>
                    <p className="mt-1 text-gray-900">{selectedError.function_name}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Error Message</label>
                  <p className="mt-1 text-gray-900">{selectedError.error_message}</p>
                </div>

                {selectedError.error_stack && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stack Trace</label>
                    <pre className="mt-1 text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-x-auto">
                      {selectedError.error_stack}
                    </pre>
                  </div>
                )}

                {selectedError.context && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Context</label>
                    <pre className="mt-1 text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedError.context, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedError.timestamp).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    {selectedError.resolved ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolved {selectedError.resolved_at && `on ${new Date(selectedError.resolved_at).toLocaleString()}`}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Unresolved
                      </Badge>
                    )}
                  </div>
                </div>

                {!selectedError.resolved && (
                  <Button
                    onClick={() => {
                      markAsResolved(selectedError.id);
                      setSelectedError(null);
                    }}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
