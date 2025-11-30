import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare,
  Tag,
  Flame,
  Snowflake,
  Phone,
  XCircle,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AttendeeNotesPanelProps {
  eventId: string;
  inviteId?: string;
  email?: string;
  customerName?: string;
  company?: string;
  onClose?: () => void;
  isDialog?: boolean;
}

interface Note {
  id: string;
  note_type: string;
  content: string;
  noted_at: string;
  noted_by: string;
  session_name?: string;
  is_private: boolean;
}

interface Invite {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  outcome_tag: string | null;
  checked_in_at: string | null;
  crm_context: Record<string, unknown>;
}

const NOTE_TYPES = [
  { id: 'conversation', label: 'Conversation', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'interest', label: 'Interest Noted', icon: <CheckCircle className="h-4 w-4" /> },
  { id: 'objection', label: 'Objection', icon: <AlertCircle className="h-4 w-4" /> },
  { id: 'follow_up', label: 'Follow-up Needed', icon: <Phone className="h-4 w-4" /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'observation', label: 'Observation', icon: <User className="h-4 w-4" /> },
];

const OUTCOME_TAGS = [
  { id: 'hot_lead', label: 'Hot Lead', icon: <Flame className="h-4 w-4" />, color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'warm', label: 'Warm', icon: <Flame className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'cold', label: 'Cold', icon: <Snowflake className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'follow_up', label: 'Follow Up', icon: <Phone className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'not_interested', label: 'Not Interested', icon: <XCircle className="h-4 w-4" />, color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export function AttendeeNotesPanel({
  eventId,
  inviteId,
  email,
  customerName,
  company,
  onClose,
  isDialog = false,
}: AttendeeNotesPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNotesHistory, setShowNotesHistory] = useState(false);

  // New note form
  const [newNote, setNewNote] = useState({
    type: 'conversation',
    content: '',
    sessionName: '',
    isPrivate: false,
  });

  // Selected outcome tag
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  useEffect(() => {
    if (inviteId || email) {
      loadInviteData();
    }
  }, [inviteId, email, eventId]);

  const loadInviteData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('event_invites')
        .select('*')
        .eq('event_id', eventId);

      if (inviteId) {
        query = query.eq('id', inviteId);
      } else if (email) {
        query = query.eq('email', email.toLowerCase());
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setInvite(data);
        setSelectedOutcome(data.outcome_tag);
        await loadNotes(data.id);
      }
    } catch (error) {
      console.error('Error loading invite data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('event_attendee_notes')
        .select('*')
        .eq('event_invite_id', id)
        .order('noted_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      toast({
        title: 'Note Required',
        description: 'Please enter a note',
        variant: 'destructive',
      });
      return;
    }

    if (!invite) {
      toast({
        title: 'Error',
        description: 'No attendee selected',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('event_attendee_notes').insert({
        event_invite_id: invite.id,
        note_type: newNote.type,
        content: newNote.content.trim(),
        session_name: newNote.sessionName || null,
        is_private: newNote.isPrivate,
        noted_by: user?.id,
        noted_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: 'Note Added', description: 'Your note has been saved' });
      setNewNote({ type: 'conversation', content: '', sessionName: '', isPrivate: false });
      await loadNotes(invite.id);
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTagOutcome = async (tag: string) => {
    if (!invite) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('event_invites')
        .update({
          outcome_tag: tag === selectedOutcome ? null : tag,
          outcome_tagged_at: new Date().toISOString(),
          outcome_tagged_by: user?.id,
        })
        .eq('id', invite.id);

      if (error) throw error;

      setSelectedOutcome(tag === selectedOutcome ? null : tag);
      toast({
        title: tag === selectedOutcome ? 'Tag Removed' : 'Outcome Tagged',
        description: tag === selectedOutcome ? 'Outcome tag has been cleared' : `Attendee tagged as "${OUTCOME_TAGS.find(t => t.id === tag)?.label}"`,
      });
    } catch (error: any) {
      console.error('Error tagging outcome:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to tag outcome',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Attendee Info Header */}
      {invite && (
        <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">
              {invite.first_name || invite.last_name
                ? `${invite.first_name || ''} ${invite.last_name || ''}`.trim()
                : customerName || invite.email}
            </h3>
            <p className="text-sm text-muted-foreground">{invite.email}</p>
            {(invite.company || company) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Building2 className="h-3 w-3" />
                {invite.company || company}
                {invite.job_title && ` - ${invite.job_title}`}
              </p>
            )}
            {invite.checked_in_at && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <Clock className="h-3 w-3" />
                Checked in {formatDistanceToNow(new Date(invite.checked_in_at), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Outcome Tags */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Tag Outcome</Label>
        <div className="flex flex-wrap gap-2">
          {OUTCOME_TAGS.map((tag) => (
            <Button
              key={tag.id}
              variant="outline"
              size="sm"
              className={`flex items-center gap-2 ${
                selectedOutcome === tag.id ? tag.color : ''
              }`}
              onClick={() => handleTagOutcome(tag.id)}
              disabled={saving}
            >
              {tag.icon}
              {tag.label}
              {selectedOutcome === tag.id && <CheckCircle className="h-3 w-3 ml-1" />}
            </Button>
          ))}
        </div>
      </div>

      {/* Add Note Form */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Add Note</Label>
        <div className="space-y-3">
          <Select value={newNote.type} onValueChange={(v) => setNewNote({ ...newNote, type: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select note type" />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <span className="flex items-center gap-2">
                    {type.icon}
                    {type.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Enter your note about this attendee..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            rows={3}
          />

          <Input
            placeholder="Session/Location (optional)"
            value={newNote.sessionName}
            onChange={(e) => setNewNote({ ...newNote, sessionName: e.target.value })}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newNote.isPrivate}
                onChange={(e) => setNewNote({ ...newNote, isPrivate: e.target.checked })}
                className="rounded"
              />
              Private note (won't sync to CRM)
            </label>

            <Button onClick={handleAddNote} disabled={saving || !newNote.content.trim()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Note
            </Button>
          </div>
        </div>
      </div>

      {/* Notes History */}
      {notes.length > 0 && (
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowNotesHistory(!showNotesHistory)}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Previous Notes ({notes.length})
            </span>
            {showNotesHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showNotesHistory && (
            <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {NOTE_TYPES.find((t) => t.id === note.note_type)?.label || note.note_type}
                    </Badge>
                    {note.session_name && (
                      <Badge variant="secondary" className="text-xs">
                        {note.session_name}
                      </Badge>
                    )}
                    {note.is_private && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Private
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(note.noted_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No Invite Found */}
      {!loading && !invite && (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Not on Guest List</p>
          <p className="text-sm">This attendee is not part of a playbook event.</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );

  if (isDialog) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Attendee Notes
            </DialogTitle>
            <DialogDescription>
              Add notes and tag outcomes for this attendee.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Attendee Notes
        </CardTitle>
        <CardDescription>
          Add notes and tag outcomes for this attendee.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
