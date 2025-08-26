import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Facebook, 
  Linkedin, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  BarChart3,
  Users,
  Eye,
  Zap,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  name: string;
  status: string;
  event_date: string;
  description?: string;
}

interface SocialMediaIntegrationProps {
  selectedEvent?: Event;
}

interface SocialConnection {
  id: string;
  platform: string;
  account_name: string;
  account_type: string;
  is_connected: boolean;
  last_sync?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
}

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  scheduled_time: string;
  status: string;
  created_at: string;
  event_id?: string;
  image_url?: string;
  link_url?: string;
}

export const SocialMediaIntegration = ({ selectedEvent }: SocialMediaIntegrationProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [activeTab, setActiveTab] = useState("connections");

  // LinkedIn OAuth URLs - Using your actual LinkedIn app Client ID
  const LINKEDIN_CLIENT_ID = "780xcbz4f2nchj"; // Your correct LinkedIn Client ID
  const LINKEDIN_REDIRECT_URI = "https://ticketflo.org/auth/linkedin/callback"; // Use exact URL from LinkedIn config
  
  // Facebook OAuth URLs (hardcoded for testing)
  const FACEBOOK_CLIENT_ID = "your_facebook_client_id";
  const FACEBOOK_REDIRECT_URI = `${window.location.origin}/auth/facebook/callback`;

  useEffect(() => {
    loadConnections();
    loadScheduledPosts();
  }, []);

  const loadConnections = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnections((data || []) as SocialConnection[]);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadScheduledPosts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setScheduledPosts((data || []) as ScheduledPost[]);
    } catch (error) {
      console.error('Error loading scheduled posts:', error);
    }
  };

  const connectLinkedIn = () => {
    const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=r_liteprofile%20w_member_social&state=${user?.id}`;
    window.location.href = linkedinAuthUrl; // Use location.href instead of popup
  };

  const connectFacebook = () => {
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&scope=pages_manage_posts,pages_read_engagement,pages_show_list&state=${user?.id}`;
    window.open(facebookAuthUrl, '_blank', 'width=600,height=600');
  };

  const disconnectPlatform = async (platform: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('social_connections')
        .update({ 
          is_connected: false, 
          access_token: null, 
          refresh_token: null,
          expires_at: null 
        })
        .eq('user_id', user.id)
        .eq('platform', platform);

      if (error) throw error;
      
      toast({
        title: "Disconnected",
        description: `Successfully disconnected from ${platform}`,
      });
      
      loadConnections();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to disconnect from ${platform}`,
        variant: "destructive",
      });
    }
  };

  const schedulePost = async (platform: string, content: string, scheduledTime: string) => {
    if (!user || !selectedEvent) return;

    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: user.id,
          platform,
          content,
          scheduled_time: scheduledTime,
          status: 'scheduled',
          event_id: selectedEvent.id
        });

      if (error) throw error;

      toast({
        title: "Post Scheduled",
        description: `Your ${platform} post has been scheduled for ${new Date(scheduledTime).toLocaleString()}`,
      });

      loadScheduledPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule post",
        variant: "destructive",
      });
    }
  };

  const deleteScheduledPost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post Deleted",
        description: "Scheduled post has been removed",
      });

      loadScheduledPosts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Social Media Integration</h2>
          <p className="text-muted-foreground">
            Connect your social accounts and schedule posts to promote your events
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Powered by OAuth
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Posts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LinkedIn Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Linkedin className="w-5 h-5 text-blue-600" />
                  LinkedIn
                </CardTitle>
                <CardDescription>
                  Connect your LinkedIn account to schedule posts and company updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connections.find(c => c.platform === 'linkedin' && c.is_connected) ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Connected</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Account: {connections.find(c => c.platform === 'linkedin')?.account_name}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => disconnectPlatform('linkedin')}
                      className="w-full"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">Not Connected</span>
                    </div>
                    <Button 
                      onClick={connectLinkedIn}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Linkedin className="w-4 h-4 mr-2" />
                      Connect LinkedIn
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Facebook Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-blue-700" />
                  Facebook
                </CardTitle>
                <CardDescription>
                  Connect your Facebook page to schedule posts and boost engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connections.find(c => c.platform === 'facebook' && c.is_connected) ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Connected</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Account: {connections.find(c => c.platform === 'facebook')?.account_name}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => disconnectPlatform('facebook')}
                      className="w-full"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">Not Connected</span>
                    </div>
                    <Button 
                      onClick={connectFacebook}
                      className="w-full bg-blue-700 hover:bg-blue-800"
                    >
                      <Facebook className="w-4 h-4 mr-2" />
                      Connect Facebook
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Overview of your social media connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connections.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {connection.platform === 'linkedin' ? (
                        <Linkedin className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Facebook className="w-5 h-5 text-blue-700" />
                      )}
                      <div>
                        <div className="font-medium capitalize">{connection.platform}</div>
                        <div className="text-sm text-muted-foreground">
                          {connection.account_name} • {connection.account_type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={connection.is_connected ? "default" : "secondary"}>
                        {connection.is_connected ? "Connected" : "Disconnected"}
                      </Badge>
                      {connection.last_sync && (
                        <span className="text-xs text-muted-foreground">
                          Last sync: {new Date(connection.last_sync).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {connections.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No social media accounts connected yet. Connect your accounts to start scheduling posts.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Posts Tab */}
        <TabsContent value="schedule" className="space-y-4">
          {!selectedEvent ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  Select an event from the events tab to schedule social media posts
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Schedule New Post
                </CardTitle>
                <CardDescription>
                  Create and schedule a social media post for {selectedEvent.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PostScheduler 
                  selectedEvent={selectedEvent}
                  connections={connections}
                  onSchedule={schedulePost}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scheduled Posts Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Scheduled Posts
              </CardTitle>
              <CardDescription>Manage your upcoming social media posts</CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduledPostsList 
                posts={scheduledPosts}
                onDelete={deleteScheduledPost}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <SocialMediaAnalytics connections={connections} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Post Scheduler Component
interface PostSchedulerProps {
  selectedEvent: Event;
  connections: SocialConnection[];
  onSchedule: (platform: string, content: string, scheduledTime: string) => void;
}

const PostScheduler = ({ selectedEvent, connections, onSchedule }: PostSchedulerProps) => {
  const [platform, setPlatform] = useState<string>('linkedin');
  const [content, setContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  const connectedPlatforms = connections.filter(c => c.is_connected).map(c => c.platform);

  if (connectedPlatforms.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Connected Accounts</h3>
        <p className="text-muted-foreground mb-4">
          You need to connect at least one social media account to schedule posts.
        </p>
        <Button onClick={() => window.location.hash = '#connections'}>
          Connect Accounts
        </Button>
      </div>
    );
  }

  const handleSchedule = () => {
    if (!content.trim() || (isScheduled && !scheduledTime)) return;
    
    const postTime = isScheduled ? scheduledTime : new Date().toISOString();
    onSchedule(platform, content, postTime);
    
    // Reset form
    setContent('');
    setScheduledTime('');
    setIsScheduled(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={platform} onValueChange={(value: string) => setPlatform(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {connectedPlatforms.map(p => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-2">
                    {p === 'linkedin' ? (
                      <Linkedin className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Facebook className="w-4 h-4 text-blue-700" />
                    )}
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Schedule Post</Label>
            <Switch
              checked={isScheduled}
              onCheckedChange={setIsScheduled}
            />
          </div>
          {isScheduled && (
            <Input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Post Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Write your ${platform} post about ${selectedEvent.name}...`}
          rows={4}
        />
        <div className="text-sm text-muted-foreground">
          {content.length}/3,000 characters
        </div>
      </div>

      <div className="space-y-2">
        <Label>Event Information</Label>
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="font-medium">{selectedEvent.name}</div>
          <div className="text-sm text-muted-foreground">
            {new Date(selectedEvent.event_date).toLocaleDateString()} • {selectedEvent.status}
          </div>
        </div>
      </div>

      <Button 
        onClick={handleSchedule} 
        className="w-full"
        disabled={!content.trim() || (isScheduled && !scheduledTime)}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        {isScheduled ? "Schedule Post" : "Post Now"}
      </Button>
    </div>
  );
};

// Scheduled Posts List Component
interface ScheduledPostsListProps {
  posts: ScheduledPost[];
  onDelete: (postId: string) => void;
}

const ScheduledPostsList = ({ posts, onDelete }: ScheduledPostsListProps) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Scheduled Posts</h3>
        <p className="text-muted-foreground">
          Schedule your first social media post to promote your events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {post.platform === 'linkedin' ? (
              <Linkedin className="w-5 h-5 text-blue-600" />
            ) : (
              <Facebook className="w-5 h-5 text-blue-700" />
            )}
            <div className="flex-1">
              <div className="font-medium capitalize">{post.platform}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {post.content}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Scheduled for {new Date(post.scheduled_time).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={
              post.status === 'published' ? 'default' : 
              post.status === 'scheduled' ? 'secondary' : 
              'destructive'
            }>
              {post.status}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Social Media Analytics Component
interface SocialMediaAnalyticsProps {
  connections: SocialConnection[];
}

const SocialMediaAnalytics = ({ connections }: SocialMediaAnalyticsProps) => {
  const connectedCount = connections.filter(c => c.is_connected).length;
  
  if (connectedCount === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Analytics Available</h3>
        <p className="text-muted-foreground">
          Connect your social media accounts to see performance analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +15% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">4.2%</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            +0.8% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Reach</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12.5K</div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            +22% from last month
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
          <CardDescription>Engagement across your connected platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connections.filter(c => c.is_connected).map((connection) => (
              <div key={connection.id} className="flex items-center gap-3">
                {connection.platform === 'linkedin' ? (
                  <Linkedin className="w-5 h-5 text-blue-600" />
                ) : (
                  <Facebook className="w-5 h-5 text-blue-700" />
                )}
                <span className="flex-1 capitalize">{connection.platform}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span>Posts: 8</span>
                  <span>Engagement: 3.8%</span>
                  <span>Reach: 5.2K</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
