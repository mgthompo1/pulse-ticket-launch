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
  TrendingUp,
  X
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

  // LinkedIn OAuth URLs - Using dynamic redirect URI
  const LINKEDIN_CLIENT_ID = "780xcbz4f2nchj"; // Your correct LinkedIn Client ID
  const LINKEDIN_REDIRECT_URI = `${window.location.origin}/auth/linkedin/callback`;
  
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
    const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=r_basicprofile%20w_member_social&state=${user?.id}`;
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

  const handlePost = async (platform: string, content: string, scheduledTime: string, imageUrl: string | null, postNow: boolean = false) => {
    if (!user) return;

    try {
      const connection = connections.find(c => c.platform === platform && c.is_connected);
      if (!connection) {
        toast({
          title: "Error",
          description: "Platform not connected",
          variant: "destructive"
        });
        return;
      }

      if (postNow) {
        // Post immediately to social media
        const { error } = await supabase.functions.invoke('social-media-post', {
          body: {
            user_id: user.id,
            platform,
            content,
            image_url: imageUrl
          }
        });

        if (error) throw error;

        toast({
          title: "Posted Successfully",
          description: `Your post has been published to ${platform}`,
        });
      } else {
        // Schedule for later
        const { error } = await supabase
          .from('scheduled_posts')
          .insert({
            user_id: user.id,
            connection_id: connection.id,
            platform,
            content,
            scheduled_time: scheduledTime,
            status: 'scheduled',
            image_url: imageUrl
          });

        if (error) throw error;

        toast({
          title: "Post Scheduled",
          description: `Your ${platform} post has been scheduled successfully`
        });
      }

      loadScheduledPosts();
    } catch (error) {
      console.error('Error posting:', error);
      toast({
        title: "Error",
        description: postNow ? "Failed to post immediately" : "Failed to schedule post",
        variant: "destructive"
      });
    }
  };


  const deleteScheduledPost = async (postId: string) => {
    if (!user) return;

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

  const checkForScheduledPosts = async () => {
    try {
      const { error } = await supabase.functions.invoke('publish-scheduled-posts');
      
      if (error) {
        console.error('Error checking scheduled posts:', error);
        toast({
          title: "Error",
          description: "Failed to check for scheduled posts",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Check Complete",
          description: "Checked for scheduled posts to publish"
        });
        loadScheduledPosts(); // Refresh the list
      }
    } catch (error) {
      console.error('Error:', error);
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
                  onPost={handlePost}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Scheduled Posts Management</h4>
                <p className="text-sm text-muted-foreground">
                  Manually check for posts ready to publish
                </p>
              </div>
              <Button 
                onClick={checkForScheduledPosts}
                variant="outline"
                size="sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Check Now
              </Button>
            </div>
            <ScheduledPostsList 
              posts={scheduledPosts}
              onDelete={deleteScheduledPost}
            />
          </div>
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
  onPost: (platform: string, content: string, scheduledTime: string, imageUrl: string | null, postNow: boolean) => void;
}

const PostScheduler = ({ selectedEvent, connections, onPost }: PostSchedulerProps) => {
  const [platform, setPlatform] = useState<string>('linkedin');
  const [content, setContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('social-media-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media-images')
        .getPublicUrl(fileName);

      setUploadedImage(publicUrl);
      
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed", 
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
  };

  const handleSubmit = (postNow: boolean) => {
    if (!content.trim() || (!postNow && isScheduled && !scheduledTime)) return;
    
    const postTime = postNow ? new Date().toISOString() : (isScheduled ? scheduledTime : new Date().toISOString());
    onPost(platform, content, postTime, uploadedImage, postNow);
    
    // Reset form
    setContent('');
    setScheduledTime('');
    setIsScheduled(false);
    removeImage();
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
        <Label>Add Image (Optional)</Label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </div>
          )}
        </div>
        
        {uploadedImage && (
          <div className="relative inline-block mt-2">
            <img 
              src={uploadedImage} 
              alt="Upload preview" 
              className="w-32 h-32 object-cover rounded-lg border"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
              onClick={removeImage}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
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

      <div className="flex gap-2">
        <Button 
          onClick={() => handleSubmit(true)} 
          className="flex-1"
          disabled={!content.trim()}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Post Now
        </Button>
        <Button 
          onClick={() => handleSubmit(false)} 
          variant="outline"
          className="flex-1"
          disabled={!content.trim() || (isScheduled && !scheduledTime)}
        >
          <Clock className="w-4 h-4 mr-2" />
          {isScheduled ? "Schedule Post" : "Schedule for Later"}
        </Button>
      </div>
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
