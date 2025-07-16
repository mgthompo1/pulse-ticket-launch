import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Copy, CheckCircle } from "lucide-react";

interface AIEventGeneratorProps {
  onEventGenerated?: (eventData: any) => void;
}

const AIEventGenerator = ({ onEventGenerated }: AIEventGeneratorProps) => {
  const [formData, setFormData] = useState({
    eventType: "",
    industry: "",
    audience: "",
    duration: "",
    description: ""
  });
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!formData.eventType || !formData.industry || !formData.audience || !formData.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to generate AI suggestions.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-event-generator", {
        body: formData
      });

      if (error) throw error;

      setGeneratedContent(data);
      toast({
        title: "AI Content Generated!",
        description: "Your event suggestions are ready to review."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${fieldName} copied to clipboard.`
    });
  };

  const useGenerated = () => {
    if (generatedContent && onEventGenerated) {
      onEventGenerated(generatedContent);
      toast({
        title: "Content Applied!",
        description: "AI-generated content has been applied to your event form."
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Event Generator
        </CardTitle>
        <CardDescription>
          Let AI create compelling event details and suggestions for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={formData.eventType} onValueChange={(value) => setFormData(prev => ({ ...prev, eventType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Conference">Conference</SelectItem>
                <SelectItem value="Workshop">Workshop</SelectItem>
                <SelectItem value="Seminar">Seminar</SelectItem>
                <SelectItem value="Networking Event">Networking Event</SelectItem>
                <SelectItem value="Trade Show">Trade Show</SelectItem>
                <SelectItem value="Concert">Concert</SelectItem>
                <SelectItem value="Festival">Festival</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Industry</Label>
            <Select value={formData.industry} onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
                <SelectItem value="Non-profit">Non-profit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={formData.audience} onValueChange={(value) => setFormData(prev => ({ ...prev, audience: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select audience size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Small intimate group">Small intimate group (20-50)</SelectItem>
                <SelectItem value="Medium audience">Medium audience (50-200)</SelectItem>
                <SelectItem value="Large audience">Large audience (200+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2-hour session">2-hour session</SelectItem>
                <SelectItem value="half-day event">Half-day event</SelectItem>
                <SelectItem value="full-day event">Full-day event</SelectItem>
                <SelectItem value="multi-day event">Multi-day event</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Event Description (Optional)</Label>
          <Textarea 
            placeholder="Describe your event in detail to help the AI generate more relevant suggestions..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Provide specific details about your event goals, activities, speakers, or themes to get more tailored AI suggestions.
          </p>
        </div>

        <Button
          onClick={handleGenerate} 
          disabled={isLoading}
          className="w-full gradient-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating AI Content...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Event Ideas
            </>
          )}
        </Button>

        {generatedContent && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">AI Generated Content</h3>
              <Button onClick={useGenerated} variant="outline" size="sm">
                Use This Content
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Event Name</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.name, "Event Name")}
                  >
                    {copiedField === "Event Name" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <Input value={generatedContent.name} readOnly />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Description</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.description, "Description")}
                  >
                    {copiedField === "Description" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <Textarea value={generatedContent.description} readOnly rows={4} />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Suggested Ticket Types</Label>
                <div className="space-y-2">
                  {generatedContent.suggestedTicketTypes?.map((ticket: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{ticket.name}</p>
                          <p className="text-sm text-muted-foreground">{ticket.description}</p>
                        </div>
                        <p className="font-bold text-primary">${ticket.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Marketing Tips</Label>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {generatedContent.marketingTips?.map((tip: string, index: number) => (
                    <li key={index} className="text-muted-foreground">{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Suggested Capacity:</strong> {generatedContent.suggestedCapacity} attendees
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIEventGenerator;