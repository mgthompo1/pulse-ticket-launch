import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const MailchimpIntegration = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [listId, setListId] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load events for the current org
    const fetchEvents = async () => {
      const { data, error } = await supabase.from("events").select("id, name");
      if (error) {
        toast({ title: "Error", description: "Failed to load events", variant: "destructive" });
      } else {
        setEvents(data || []);
      }
    };
    fetchEvents();
  }, []);

  const handleSync = async () => {
    if (!apiKey || !listId || !selectedEvent) {
      toast({ title: "Missing Info", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.functions.invoke("mailchimp-sync", {
      body: { apiKey, listId, eventId: selectedEvent }
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Attendees synced to Mailchimp!" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mailchimp Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Mailchimp API Key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
        <Input
          placeholder="Mailchimp List ID"
          value={listId}
          onChange={e => setListId(e.target.value)}
        />
        <select
          className="w-full border rounded p-2"
          value={selectedEvent}
          onChange={e => setSelectedEvent(e.target.value)}
        >
          <option value="">Select Event</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
        <Button onClick={handleSync} disabled={loading}>
          {loading ? "Syncing..." : "Sync Attendees to Mailchimp"}
        </Button>
        <div>
          <a
            href="https://login.mailchimp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Go to Mailchimp to send a campaign
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default MailchimpIntegration; 