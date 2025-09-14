// Reminder Campaign Scheduler - runs periodically to check for campaigns ready to send
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REMINDER-SCHEDULER] ${step}${detailsStr}`);
};

interface ReminderCampaign {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  status: string;
  send_timing: string;
  send_value?: number;
  send_datetime?: string;
  timezone: string;
  recipient_type?: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  status: string;
}

class ReminderCampaignScheduler {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
  }

  // Find campaigns that need scheduling
  async getCampaignsNeedingScheduling(): Promise<Array<ReminderCampaign & { event: Event }>> {
    const { data: campaigns, error } = await this.supabase
      .from("reminder_email_campaigns")
      .select(`
        *,
        events!inner(
          id,
          name,
          event_date,
          status
        )
      `)
      .eq("status", "draft")
      .eq("events.status", "published")
      .gte("events.event_date", new Date().toISOString());

    if (error) {
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }

    return campaigns || [];
  }

  // Calculate send datetime based on campaign timing
  calculateSendDatetime(campaign: ReminderCampaign, event: Event): Date {
    const eventDate = new Date(event.event_date);

    switch (campaign.send_timing) {
      case "days_before":
        if (!campaign.send_value) throw new Error("send_value required for days_before");
        const daysBeforeDate = new Date(eventDate);
        daysBeforeDate.setDate(daysBeforeDate.getDate() - campaign.send_value);
        return daysBeforeDate;

      case "hours_before":
        if (!campaign.send_value) throw new Error("send_value required for hours_before");
        const hoursBeforeDate = new Date(eventDate);
        hoursBeforeDate.setHours(hoursBeforeDate.getHours() - campaign.send_value);
        return hoursBeforeDate;

      case "specific_datetime":
        if (!campaign.send_datetime) throw new Error("send_datetime required for specific_datetime");
        return new Date(campaign.send_datetime);

      default:
        throw new Error(`Invalid send_timing: ${campaign.send_timing}`);
    }
  }

  // Update campaign to scheduled status with send datetime
  async scheduleCampaign(campaignId: string, sendDatetime: Date): Promise<void> {
    const { error } = await this.supabase
      .from("reminder_email_campaigns")
      .update({
        status: "scheduled",
        send_datetime: sendDatetime.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (error) {
      throw new Error(`Failed to schedule campaign: ${error.message}`);
    }
  }

  // Create job entry for campaign processing
  async createCampaignJob(campaignId: string, scheduledFor: Date): Promise<void> {
    const { error } = await this.supabase
      .from("reminder_email_jobs")
      .insert({
        campaign_id: campaignId,
        scheduled_for: scheduledFor.toISOString(),
        status: "scheduled",
      });

    if (error) {
      // If job already exists, update it
      if (error.code === '23505') { // unique violation
        const { error: updateError } = await this.supabase
          .from("reminder_email_jobs")
          .update({
            scheduled_for: scheduledFor.toISOString(),
            status: "scheduled",
          })
          .eq("campaign_id", campaignId);

        if (updateError) {
          throw new Error(`Failed to update campaign job: ${updateError.message}`);
        }
      } else {
        throw new Error(`Failed to create campaign job: ${error.message}`);
      }
    }
  }

  // Get count of orders/recipients for a campaign
  async getRecipientCount(campaignId: string, eventId: string, recipientType: string): Promise<number> {
    let query = this.supabase
      .from("orders")
      .select("id", { count: 'exact', head: true })
      .eq("event_id", eventId)
      .eq("status", "completed");

    // Apply recipient type filtering
    if (recipientType === "ticket_holders_only") {
      query = query.not("order_items.ticket_types", "is", null);
    }

    const { count, error } = await query;

    if (error) {
      logStep("Error counting recipients", { error: error.message, campaignId });
      return 0;
    }

    return count || 0;
  }

  // Update campaign recipient count
  async updateRecipientCount(campaignId: string, count: number): Promise<void> {
    await this.supabase
      .from("reminder_email_campaigns")
      .update({
        total_recipients: count,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  }

  // Check if campaigns are ready to send (within next 5 minutes)
  async getCampaignsReadyToSend(): Promise<ReminderCampaign[]> {
    const now = new Date();
    const inFiveMinutes = new Date(now.getTime() + 5 * 60 * 1000);

    const { data: campaigns, error } = await this.supabase
      .from("reminder_email_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("send_datetime", inFiveMinutes.toISOString());

    if (error) {
      throw new Error(`Failed to fetch campaigns ready to send: ${error.message}`);
    }

    return campaigns || [];
  }

  // Trigger campaign processor for ready campaigns
  async triggerCampaignProcessor(): Promise<void> {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration for processor trigger");
    }

    const processorUrl = `${supabaseUrl}/functions/v1/process-reminder-campaigns`;

    try {
      const response = await fetch(processorUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trigger: "scheduler" }),
      });

      if (!response.ok) {
        throw new Error(`Processor trigger failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logStep("Processor triggered successfully", result);
    } catch (error) {
      logStep("Failed to trigger processor", { error: error.message });
      throw error;
    }
  }

  // Main scheduling process
  async processScheduling(): Promise<{
    campaignsScheduled: number;
    campaignsTriggered: number;
  }> {
    // Step 1: Schedule new campaigns
    const campaignsNeedingScheduling = await this.getCampaignsNeedingScheduling();
    let scheduled = 0;

    for (const campaignWithEvent of campaignsNeedingScheduling) {
      try {
        const sendDatetime = this.calculateSendDatetime(campaignWithEvent, campaignWithEvent.event);

        // Only schedule if send time is in the future
        if (sendDatetime > new Date()) {
          await this.scheduleCampaign(campaignWithEvent.id, sendDatetime);
          await this.createCampaignJob(campaignWithEvent.id, sendDatetime);

          // Update recipient count
          const recipientCount = await this.getRecipientCount(
            campaignWithEvent.id,
            campaignWithEvent.event_id,
            campaignWithEvent.recipient_type || "all_attendees"
          );
          await this.updateRecipientCount(campaignWithEvent.id, recipientCount);

          logStep("Campaign scheduled", {
            campaignId: campaignWithEvent.id,
            name: campaignWithEvent.name,
            sendDatetime: sendDatetime.toISOString(),
            recipientCount
          });

          scheduled++;
        } else {
          logStep("Campaign send time in past, skipping", {
            campaignId: campaignWithEvent.id,
            sendDatetime: sendDatetime.toISOString()
          });
        }
      } catch (error) {
        logStep("Failed to schedule campaign", {
          campaignId: campaignWithEvent.id,
          error: error.message
        });
      }
    }

    // Step 2: Check for campaigns ready to send
    const readyCampaigns = await this.getCampaignsReadyToSend();
    let triggered = 0;

    if (readyCampaigns.length > 0) {
      logStep("Found campaigns ready to send", { count: readyCampaigns.length });
      await this.triggerCampaignProcessor();
      triggered = readyCampaigns.length;
    }

    return {
      campaignsScheduled: scheduled,
      campaignsTriggered: triggered
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Reminder campaign scheduler started");

    const scheduler = new ReminderCampaignScheduler();
    const result = await scheduler.processScheduling();

    logStep("Scheduling process completed", result);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      message: `Scheduled ${result.campaignsScheduled} campaigns, triggered ${result.campaignsTriggered} campaigns for sending`,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});