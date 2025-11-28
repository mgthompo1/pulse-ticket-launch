import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, Plus, Trash2, GripVertical, Star, MessageSquare,
  ListChecks, ThumbsUp, Send, BarChart3, Users, CheckCircle, Clock,
  Percent, Gift
} from "lucide-react";
import { format } from "date-fns";

interface SurveyQuestion {
  id: string;
  type: "rating" | "text" | "multiple_choice" | "nps";
  question: string;
  required: boolean;
  options?: string[];
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  questions: SurveyQuestion[];
  send_delay_hours: number;
  reminder_enabled: boolean;
  reminder_delay_hours: number;
  thank_you_title: string;
  thank_you_message: string | null;
  incentive_enabled: boolean;
  incentive_type: string | null;
  incentive_value: string | null;
  total_sent: number;
  total_responses: number;
}

interface SurveyResponse {
  id: string;
  customer_email: string;
  customer_name: string | null;
  responses: Record<string, unknown>;
  nps_score: number | null;
  overall_rating: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface PostEventSurveySettingsProps {
  eventId: string;
  organizationId: string;
}

const DEFAULT_QUESTIONS: SurveyQuestion[] = [
  {
    id: "q1",
    type: "nps",
    question: "How likely are you to recommend this event to a friend or colleague?",
    required: true,
  },
  {
    id: "q2",
    type: "rating",
    question: "How would you rate the overall event experience?",
    required: true,
  },
  {
    id: "q3",
    type: "multiple_choice",
    question: "What did you enjoy most about the event?",
    required: false,
    options: ["The venue", "The content/program", "Networking opportunities", "Food & beverages", "Organization", "Other"],
  },
  {
    id: "q4",
    type: "text",
    question: "What could we improve for future events?",
    required: false,
  },
];

export const PostEventSurveySettings = ({ eventId, organizationId }: PostEventSurveySettingsProps) => {
  const { toast } = useToast();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null);
  const [activeTab, setActiveTab] = useState("settings");

  // Form state for new/edit question
  const [questionForm, setQuestionForm] = useState<SurveyQuestion>({
    id: "",
    type: "rating",
    question: "",
    required: true,
    options: [],
  });

  useEffect(() => {
    loadSurvey();
  }, [eventId]);

  const loadSurvey = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSurvey(data);
        loadResponses(data.id);
      }
    } catch (error) {
      console.error("Error loading survey:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async (surveyId: string) => {
    try {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error("Error loading responses:", error);
    }
  };

  const createSurvey = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("surveys")
        .insert({
          event_id: eventId,
          organization_id: organizationId,
          title: "How was your experience?",
          questions: DEFAULT_QUESTIONS,
          send_delay_hours: 24,
          reminder_enabled: true,
          reminder_delay_hours: 72,
          thank_you_title: "Thank you for your feedback!",
          thank_you_message: "Your feedback helps us create better events.",
        })
        .select()
        .single();

      if (error) throw error;

      setSurvey(data);

      // Update event with survey_id
      await supabase
        .from("events")
        .update({ survey_enabled: true, survey_id: data.id })
        .eq("id", eventId);

      toast({
        title: "Survey Created",
        description: "Your post-event survey has been set up.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create survey",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSurvey = async (updates: Partial<Survey>) => {
    if (!survey) return;

    try {
      const { error } = await supabase
        .from("surveys")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", survey.id);

      if (error) throw error;

      setSurvey({ ...survey, ...updates });

      toast({
        title: "Saved",
        description: "Survey settings updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update survey",
        variant: "destructive",
      });
    }
  };

  const addQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      id: `q${Date.now()}`,
      type: "rating",
      question: "",
      required: true,
      options: [],
    });
    setShowQuestionDialog(true);
  };

  const editQuestion = (question: SurveyQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({ ...question });
    setShowQuestionDialog(true);
  };

  const saveQuestion = () => {
    if (!survey || !questionForm.question) return;

    let updatedQuestions: SurveyQuestion[];
    if (editingQuestion) {
      updatedQuestions = survey.questions.map((q) =>
        q.id === editingQuestion.id ? questionForm : q
      );
    } else {
      updatedQuestions = [...survey.questions, questionForm];
    }

    updateSurvey({ questions: updatedQuestions });
    setShowQuestionDialog(false);
  };

  const deleteQuestion = (questionId: string) => {
    if (!survey) return;
    const updatedQuestions = survey.questions.filter((q) => q.id !== questionId);
    updateSurvey({ questions: updatedQuestions });
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case "rating":
        return <Star className="h-4 w-4" />;
      case "text":
        return <MessageSquare className="h-4 w-4" />;
      case "multiple_choice":
        return <ListChecks className="h-4 w-4" />;
      case "nps":
        return <ThumbsUp className="h-4 w-4" />;
      default:
        return <ClipboardList className="h-4 w-4" />;
    }
  };

  const calculateStats = () => {
    if (responses.length === 0) return { avgRating: 0, npsScore: 0, responseRate: 0 };

    const completedResponses = responses.filter((r) => r.completed);
    const npsResponses = completedResponses.filter((r) => r.nps_score !== null);
    const ratingResponses = completedResponses.filter((r) => r.overall_rating !== null);

    const avgRating = ratingResponses.length > 0
      ? ratingResponses.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / ratingResponses.length
      : 0;

    // NPS calculation: % Promoters (9-10) - % Detractors (0-6)
    const promoters = npsResponses.filter((r) => (r.nps_score || 0) >= 9).length;
    const detractors = npsResponses.filter((r) => (r.nps_score || 0) <= 6).length;
    const npsScore = npsResponses.length > 0
      ? Math.round(((promoters - detractors) / npsResponses.length) * 100)
      : 0;

    const responseRate = survey?.total_sent
      ? Math.round((completedResponses.length / survey.total_sent) * 100)
      : 0;

    return { avgRating, npsScore, responseRate };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ClipboardList className="h-6 w-6 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!survey) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-2">No Survey Set Up</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create a post-event survey to collect valuable feedback from your attendees
          </p>
          <Button onClick={createSurvey} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" />
            {saving ? "Creating..." : "Create Survey"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{survey.total_sent}</p>
                <p className="text-xs text-muted-foreground">Surveys Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{survey.total_responses}</p>
                <p className="text-xs text-muted-foreground">Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}/5</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.npsScore > 0 ? "+" : ""}{stats.npsScore}</p>
                <p className="text-xs text-muted-foreground">NPS Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Post-Event Survey
              </CardTitle>
              <CardDescription>
                Collect feedback from attendees after your event
              </CardDescription>
            </div>
            <Switch
              checked={survey.is_active}
              onCheckedChange={(checked) => updateSurvey({ is_active: checked })}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="questions">Questions ({survey.questions.length})</TabsTrigger>
              <TabsTrigger value="responses">Responses ({responses.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              {/* Survey Title & Description */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Survey Title</Label>
                  <Input
                    value={survey.title}
                    onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
                    onBlur={() => updateSurvey({ title: survey.title })}
                    placeholder="How was your experience?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={survey.description || ""}
                    onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
                    onBlur={() => updateSurvey({ description: survey.description })}
                    placeholder="We'd love to hear your thoughts..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Timing Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Timing</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Send Delay</Label>
                    <Select
                      value={String(survey.send_delay_hours)}
                      onValueChange={(value) => updateSurvey({ send_delay_hours: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour after event</SelectItem>
                        <SelectItem value="6">6 hours after event</SelectItem>
                        <SelectItem value="12">12 hours after event</SelectItem>
                        <SelectItem value="24">24 hours after event</SelectItem>
                        <SelectItem value="48">48 hours after event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Send Reminder</Label>
                      <Switch
                        checked={survey.reminder_enabled}
                        onCheckedChange={(checked) => updateSurvey({ reminder_enabled: checked })}
                      />
                    </div>
                    {survey.reminder_enabled && (
                      <Select
                        value={String(survey.reminder_delay_hours)}
                        onValueChange={(value) => updateSurvey({ reminder_delay_hours: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="48">48 hours later</SelectItem>
                          <SelectItem value="72">72 hours later</SelectItem>
                          <SelectItem value="168">1 week later</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              {/* Thank You Message */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Thank You Page</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Thank You Title</Label>
                    <Input
                      value={survey.thank_you_title}
                      onChange={(e) => setSurvey({ ...survey, thank_you_title: e.target.value })}
                      onBlur={() => updateSurvey({ thank_you_title: survey.thank_you_title })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thank You Message</Label>
                    <Textarea
                      value={survey.thank_you_message || ""}
                      onChange={(e) => setSurvey({ ...survey, thank_you_message: e.target.value })}
                      onBlur={() => updateSurvey({ thank_you_message: survey.thank_you_message })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Incentive Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Survey Incentive</h4>
                    <p className="text-sm text-muted-foreground">
                      Offer a reward for completing the survey
                    </p>
                  </div>
                  <Switch
                    checked={survey.incentive_enabled}
                    onCheckedChange={(checked) => updateSurvey({ incentive_enabled: checked })}
                  />
                </div>

                {survey.incentive_enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label>Incentive Type</Label>
                      <Select
                        value={survey.incentive_type || "discount"}
                        onValueChange={(value) => updateSurvey({ incentive_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">
                            <div className="flex items-center gap-2">
                              <Percent className="h-4 w-4" />
                              Discount Code
                            </div>
                          </SelectItem>
                          <SelectItem value="entry">
                            <div className="flex items-center gap-2">
                              <Gift className="h-4 w-4" />
                              Prize Entry
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{survey.incentive_type === "discount" ? "Discount Code" : "Prize Description"}</Label>
                      <Input
                        value={survey.incentive_value || ""}
                        onChange={(e) => setSurvey({ ...survey, incentive_value: e.target.value })}
                        onBlur={() => updateSurvey({ incentive_value: survey.incentive_value })}
                        placeholder={survey.incentive_type === "discount" ? "THANKS10" : "Win a free ticket!"}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={addQuestion} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>

              {survey.questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No questions yet. Add your first question to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {survey.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="h-4 w-4 cursor-move" />
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getQuestionIcon(question.type)}
                          <span className="text-xs uppercase text-muted-foreground">
                            {question.type.replace("_", " ")}
                          </span>
                          {question.required && (
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <p className="font-medium">{question.question}</p>
                        {question.options && question.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {question.options.map((option, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {option}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => editQuestion(question)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="responses" className="space-y-4">
              {responses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No responses yet</p>
                  <p className="text-sm">Responses will appear here after attendees complete the survey</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {responses.slice(0, 20).map((response) => (
                    <div
                      key={response.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{response.customer_email}</p>
                        <p className="text-sm text-muted-foreground">
                          {response.customer_name || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(response.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {response.nps_score !== null && (
                          <div className="text-center">
                            <p className="text-lg font-bold">{response.nps_score}</p>
                            <p className="text-xs text-muted-foreground">NPS</p>
                          </div>
                        )}
                        {response.overall_rating !== null && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{response.overall_rating}</span>
                          </div>
                        )}
                        <Badge
                          variant={response.completed ? "default" : "secondary"}
                          className={response.completed ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : ""}
                        >
                          {response.completed ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              In Progress
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>
              Configure your survey question
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={questionForm.type}
                onValueChange={(value: SurveyQuestion["type"]) =>
                  setQuestionForm({ ...questionForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Rating (1-5 stars)
                    </div>
                  </SelectItem>
                  <SelectItem value="nps">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4" />
                      NPS (0-10 scale)
                    </div>
                  </SelectItem>
                  <SelectItem value="multiple_choice">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Multiple Choice
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Text Response
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={questionForm.question}
                onChange={(e) =>
                  setQuestionForm({ ...questionForm, question: e.target.value })
                }
                placeholder="Enter your question..."
                rows={2}
              />
            </div>

            {questionForm.type === "multiple_choice" && (
              <div className="space-y-2">
                <Label>Options (one per line)</Label>
                <Textarea
                  value={questionForm.options?.join("\n") || ""}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      options: e.target.value.split("\n").filter((o) => o.trim()),
                    })
                  }
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="required"
                checked={questionForm.required}
                onCheckedChange={(checked) =>
                  setQuestionForm({ ...questionForm, required: checked })
                }
              />
              <Label htmlFor="required">Required question</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuestion} disabled={!questionForm.question}>
              {editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
