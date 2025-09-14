import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PersonalizationHelper from "./PersonalizationHelper";
import type {
  EmailBlock,
  EmailTemplate,
  EmailTemplateType,
  EmailBlockType,
  HeaderBlock,
  TextBlock,
  EventDetailsBlock,
  TicketListBlock,
  ButtonBlock,
  DividerBlock,
  ImageBlock,
  FooterBlock,
  EventCountdownBlock,
  AttendanceInfoBlock,
  ImportantUpdatesBlock,
  VenueDirectionsBlock,
  CheckInInfoBlock,
  WeatherInfoBlock,
  RecommendedItemsBlock,
} from "@/types/email-template";

interface EmailTemplateBuilderProps {
  template?: EmailTemplate;
  onChange?: (template: EmailTemplate) => void;
  emailCustomization?: any;
  onEmailCustomizationChange?: (customization: any) => void;
  isAttractionMode?: boolean;
  templateType?: EmailTemplateType;
}

const blockLabel: Record<EmailBlockType, string> = {
  header: "Header",
  text: "Text",
  event_details: "Event Details",
  ticket_list: "Ticket List",
  registration_details: "Registration Details",
  payment_summary: "Payment Summary",
  button: "Button",
  divider: "Divider",
  image: "Image",
  footer: "Footer",
  calendar_button: "Add to Calendar",
  qr_tickets: "QR Code Tickets",
  order_management: "Order Management",
  social_links: "Social Media",
  custom_message: "Custom Message",
  next_steps: "Next Steps",
  // Reminder email blocks
  event_countdown: "Event Countdown",
  attendance_info: "Attendance Info",
  important_updates: "Important Updates",
  venue_directions: "Venue & Directions",
  check_in_info: "Check-in Information",
  weather_info: "Weather Forecast",
  recommended_items: "Recommended Items",
};

export const EmailTemplateBuilder: React.FC<EmailTemplateBuilderProps> = ({ 
  template, 
  onChange, 
  emailCustomization, 
  onEmailCustomizationChange, 
  isAttractionMode
}) => {
  // Determine which data source to use
  const isUsingEmailCustomization = isAttractionMode && emailCustomization && onEmailCustomizationChange;
  
  // Provide default template if none provided
  const currentTemplate = template || (isUsingEmailCustomization ? emailCustomization.template : null) || {
    version: 1 as const,
    subject: '',
    blocks: [],
    theme: {
      backgroundColor: '#ffffff',
      headerColor: '#000000',
      textColor: '#333333',
      buttonColor: '#007bff',
      accentColor: '#f8f9fa',
      borderColor: '#e5e7eb',
      fontFamily: 'Arial, sans-serif'
    }
  };

  // Unified change handler
  const handleTemplateChange = (newTemplate: any) => {
    if (isUsingEmailCustomization && onEmailCustomizationChange) {
      onEmailCustomizationChange({
        ...emailCustomization,
        template: newTemplate
      });
    } else if (onChange) {
      onChange(newTemplate);
    }
  };
  const addBlock = (type: EmailBlockType) => {
    const id = Math.random().toString(36).slice(2, 9);
    const base = { id, type } as EmailBlock;
    const block: EmailBlock =
      type === "header"
        ? { ...(base as HeaderBlock), title: "Header", align: "center", includeLogo: true }
        : type === "text"
        ? { ...(base as TextBlock), html: "Paragraph text" }
        : type === "event_details"
        ? { ...(base as EventDetailsBlock), showDate: true, showTime: true, showVenue: true, showCustomer: true }
        : type === "ticket_list"
        ? { ...(base as TicketListBlock), showCode: true, showPrice: true }
        : type === "registration_details"
        ? { ...(base as any), showTotal: true, showQuantity: true }
        : type === "payment_summary"
        ? { ...(base as any), showPaymentMethod: true, showLast4: true, showTotal: true }
        : type === "button"
        ? { ...(base as ButtonBlock), label: "View Tickets", url: "/tickets?orderId={{ORDER_ID}}&email={{CUSTOMER_EMAIL}}", align: "center" }
        : type === "divider"
        ? ({ ...(base as DividerBlock) } as DividerBlock)
        : type === "image"
        ? { ...(base as ImageBlock), src: "", alt: "", align: "center", width: 560 }
        : ({ ...(base as FooterBlock), text: "Footer" } as FooterBlock);

    handleTemplateChange({ ...currentTemplate, blocks: [...currentTemplate.blocks, block] });
  };

  const updateBlock = (id: string, patch: Partial<EmailBlock>) => {
    handleTemplateChange({
      ...currentTemplate,
      blocks: currentTemplate.blocks.map((b: EmailBlock) => (b.id === id ? { ...b, ...patch } as EmailBlock : b)),
    });
  };

  const removeBlock = (id: string) => {
    handleTemplateChange({ ...currentTemplate, blocks: currentTemplate.blocks.filter((b: EmailBlock) => b.id !== id) });
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const idx = currentTemplate.blocks.findIndex((b: EmailBlock) => b.id === id);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= currentTemplate.blocks.length) return;
    const blocks = [...currentTemplate.blocks];
    const [item] = blocks.splice(idx, 1);
    blocks.splice(next, 0, item);
    handleTemplateChange({ ...currentTemplate, blocks });
  };

  const controls = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        {(Object.keys(blockLabel) as EmailBlockType[]).map((t) => (
          <Button key={t} type="button" variant="outline" onClick={() => addBlock(t)}>
            + {blockLabel[t]}
          </Button>
        ))}
      </div>
    ),
    [currentTemplate]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Template Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            value={currentTemplate.subject}
            onChange={(e) => handleTemplateChange({ ...currentTemplate, subject: e.target.value })}
            placeholder="Your ticket confirmation"
          />
        </div>

        <div className="space-y-2">
          <Label>Blocks</Label>
          {controls}
        </div>

        <div className="space-y-4">
          {currentTemplate.blocks.map((block: EmailBlock) => (
            <div key={block.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <strong>{blockLabel[block.type as EmailBlockType]}</strong>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => moveBlock(block.id, -1)}>
                    ↑
                  </Button>
                  <Button variant="outline" type="button" onClick={() => moveBlock(block.id, 1)}>
                    ↓
                  </Button>
                  <Button variant="destructive" type="button" onClick={() => removeBlock(block.id)}>
                    Remove
                  </Button>
                </div>
              </div>

              {block.type === "header" && (
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={(block as HeaderBlock).title} onChange={(e) => updateBlock(block.id, { title: e.target.value })} />
                </div>
              )}

              {block.type === "text" && (
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    rows={4}
                    value={(block as TextBlock).html || ""}
                    onChange={(e) => updateBlock(block.id, { html: e.target.value })}
                  />
                </div>
              )}

              {block.type === "button" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input value={(block as ButtonBlock).label} onChange={(e) => updateBlock(block.id, { label: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input 
                      value={(block as ButtonBlock).url} 
                      onChange={(e) => updateBlock(block.id, { url: e.target.value })} 
                      placeholder="/payment-success?orderId={{ORDER_ID}}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Links to the order details page where customers can view their tickets.
                    </p>
                  </div>
                </div>
              )}

              {block.type === "image" && (
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input value={(block as ImageBlock).src} onChange={(e) => updateBlock(block.id, { src: e.target.value })} />
                </div>
              )}

              {block.type === "custom_message" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Message</Label>
                    <PersonalizationHelper 
                      onInsertVariable={(variable) => {
                        const currentMessage = (block as any).message || '';
                        updateBlock(block.id, { message: currentMessage + variable });
                      }}
                      className="text-xs"
                    />
                  </div>
                  <Textarea
                    rows={3}
                    value={(block as any).message || ""}
                    onChange={(e) => updateBlock(block.id, { message: e.target.value })}
                    placeholder="Thanks for choosing @EventName! We're excited to see you there."
                  />
                </div>
              )}

              {block.type === "next_steps" && (
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input 
                    value={(block as any).title || ""} 
                    onChange={(e) => updateBlock(block.id, { title: e.target.value })} 
                    placeholder="What to expect next:"
                  />
                  <Label>Steps (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={(block as any).steps?.join('\n') || ""}
                    onChange={(e) => updateBlock(block.id, { steps: e.target.value.split('\n').filter(s => s.trim()) })}
                    placeholder="Save this email - you'll need it at the event&#10;Add the event to your calendar&#10;Arrive 15 minutes early for check-in"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${block.id}-showIcons`}
                      checked={(block as any).showIcons !== false}
                      onCheckedChange={(checked) => updateBlock(block.id, { showIcons: checked })}
                    />
                    <Label htmlFor={`${block.id}-showIcons`}>Show numbered emojis</Label>
                  </div>
                </div>
              )}

              {block.type === "calendar_button" && (
                <div className="space-y-2">
                  <Label>Button Label</Label>
                  <Input 
                    value={(block as any).label || ""} 
                    onChange={(e) => updateBlock(block.id, { label: e.target.value })} 
                    placeholder="Add to Calendar"
                  />
                  <Label>Alignment</Label>
                  <Select value={(block as any).align || "center"} onValueChange={(value) => updateBlock(block.id, { align: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${block.id}-showIcon`}
                      checked={(block as any).showIcon !== false}
                      onCheckedChange={(checked) => updateBlock(block.id, { showIcon: checked })}
                    />
                    <Label htmlFor={`${block.id}-showIcon`}>Show calendar icon</Label>
                  </div>
                </div>
              )}

              {block.type === "qr_tickets" && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${block.id}-showInline`}
                      checked={(block as any).showInline !== false}
                      onCheckedChange={(checked) => updateBlock(block.id, { showInline: checked })}
                    />
                    <Label htmlFor={`${block.id}-showInline`}>Show QR codes inline</Label>
                  </div>
                  <Label>Layout</Label>
                  <Select value={(block as any).layout || "grid"} onValueChange={(value) => updateBlock(block.id, { layout: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {block.type === "order_management" && (
                <div className="space-y-2">
                  <Label>Custom Text</Label>
                  <Input 
                    value={(block as any).customText || ""} 
                    onChange={(e) => updateBlock(block.id, { customText: e.target.value })} 
                    placeholder="Need to make changes?"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`${block.id}-showViewOrder`}
                        checked={(block as any).showViewOrder !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showViewOrder: checked })}
                      />
                      <Label htmlFor={`${block.id}-showViewOrder`}>Show "View Order" button</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`${block.id}-showModifyOrder`}
                        checked={(block as any).showModifyOrder === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { showModifyOrder: checked })}
                      />
                      <Label htmlFor={`${block.id}-showModifyOrder`}>Show "Modify Order" button</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`${block.id}-showCancelOrder`}
                        checked={(block as any).showCancelOrder === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { showCancelOrder: checked })}
                      />
                      <Label htmlFor={`${block.id}-showCancelOrder`}>Show "Cancel Order" button</Label>
                    </div>
                  </div>
                </div>
              )}

              {block.type === "social_links" && (
                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select value={(block as any).style || "icons"} onValueChange={(value) => updateBlock(block.id, { style: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icons">Icons</SelectItem>
                      <SelectItem value="buttons">Text Buttons</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Alignment</Label>
                  <Select value={(block as any).align || "center"} onValueChange={(value) => updateBlock(block.id, { align: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label>Facebook URL</Label>
                      <Input 
                        value={(block as any).platforms?.facebook || ""} 
                        onChange={(e) => updateBlock(block.id, { platforms: { ...(block as any).platforms, facebook: e.target.value } })} 
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    <div>
                      <Label>Twitter URL</Label>
                      <Input 
                        value={(block as any).platforms?.twitter || ""} 
                        onChange={(e) => updateBlock(block.id, { platforms: { ...(block as any).platforms, twitter: e.target.value } })} 
                        placeholder="https://twitter.com/yourhandle"
                      />
                    </div>
                    <div>
                      <Label>Instagram URL</Label>
                      <Input 
                        value={(block as any).platforms?.instagram || ""} 
                        onChange={(e) => updateBlock(block.id, { platforms: { ...(block as any).platforms, instagram: e.target.value } })} 
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </div>
                    <div>
                      <Label>Website URL</Label>
                      <Input 
                        value={(block as any).platforms?.website || ""} 
                        onChange={(e) => updateBlock(block.id, { platforms: { ...(block as any).platforms, website: e.target.value } })} 
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reminder email specific block configurations */}
              {block.type === "event_countdown" && (
                <div className="space-y-2">
                  <Label>Custom Text</Label>
                  <Input
                    value={(block as EventCountdownBlock).customText || ""}
                    onChange={(e) => updateBlock(block.id, { customText: e.target.value })}
                    placeholder="Don't miss out!"
                  />
                  <Label>Urgency Threshold (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={(block as EventCountdownBlock).urgencyThreshold || 3}
                    onChange={(e) => updateBlock(block.id, { urgencyThreshold: parseInt(e.target.value) })}
                  />
                  <Label>Alignment</Label>
                  <Select value={(block as EventCountdownBlock).align || "center"} onValueChange={(value) => updateBlock(block.id, { align: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showDays`}
                        checked={(block as EventCountdownBlock).showDays !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showDays: checked })}
                      />
                      <Label htmlFor={`${block.id}-showDays`}>Show days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showHours`}
                        checked={(block as EventCountdownBlock).showHours === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { showHours: checked })}
                      />
                      <Label htmlFor={`${block.id}-showHours`}>Show hours</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showMinutes`}
                        checked={(block as EventCountdownBlock).showMinutes === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { showMinutes: checked })}
                      />
                      <Label htmlFor={`${block.id}-showMinutes`}>Show minutes</Label>
                    </div>
                  </div>
                </div>
              )}

              {block.type === "attendance_info" && (
                <div className="space-y-2">
                  <Label>Custom Message</Label>
                  <Textarea
                    rows={2}
                    value={(block as AttendanceInfoBlock).customMessage || ""}
                    onChange={(e) => updateBlock(block.id, { customMessage: e.target.value })}
                    placeholder="Here's a reminder of your attendance details:"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showTicketCount`}
                        checked={(block as AttendanceInfoBlock).showTicketCount !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showTicketCount: checked })}
                      />
                      <Label htmlFor={`${block.id}-showTicketCount`}>Show ticket count</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showAttendeeNames`}
                        checked={(block as AttendanceInfoBlock).showAttendeeNames === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { showAttendeeNames: checked })}
                      />
                      <Label htmlFor={`${block.id}-showAttendeeNames`}>Show attendee names</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showTicketTypes`}
                        checked={(block as AttendanceInfoBlock).showTicketTypes !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showTicketTypes: checked })}
                      />
                      <Label htmlFor={`${block.id}-showTicketTypes`}>Show ticket types</Label>
                    </div>
                  </div>
                </div>
              )}

              {block.type === "important_updates" && (
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={(block as ImportantUpdatesBlock).title || ""}
                    onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                    placeholder="Important Updates"
                  />
                  <Label>Updates (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={(block as ImportantUpdatesBlock).updates?.join('\n') || ""}
                    onChange={(e) => updateBlock(block.id, { updates: e.target.value.split('\n').filter(s => s.trim()) })}
                    placeholder="Enter updates, one per line"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-highlightNew`}
                        checked={(block as ImportantUpdatesBlock).highlightNew === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { highlightNew: checked })}
                      />
                      <Label htmlFor={`${block.id}-highlightNew`}>Highlight new updates</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showTimestamp`}
                        checked={(block as ImportantUpdatesBlock).showTimestamp === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { showTimestamp: checked })}
                      />
                      <Label htmlFor={`${block.id}-showTimestamp`}>Show timestamps</Label>
                    </div>
                  </div>
                </div>
              )}

              {block.type === "venue_directions" && (
                <div className="space-y-2">
                  <Label>Custom Directions</Label>
                  <Textarea
                    rows={3}
                    value={(block as VenueDirectionsBlock).customDirections || ""}
                    onChange={(e) => updateBlock(block.id, { customDirections: e.target.value })}
                    placeholder="Additional directions or instructions"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showAddress`}
                        checked={(block as VenueDirectionsBlock).showAddress !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showAddress: checked })}
                      />
                      <Label htmlFor={`${block.id}-showAddress`}>Show venue address</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showMapLink`}
                        checked={(block as VenueDirectionsBlock).showMapLink !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showMapLink: checked })}
                      />
                      <Label htmlFor={`${block.id}-showMapLink`}>Show "Get Directions" button</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showParkingInfo`}
                        checked={(block as VenueDirectionsBlock).showParkingInfo === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { showParkingInfo: checked })}
                      />
                      <Label htmlFor={`${block.id}-showParkingInfo`}>Show parking information</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showPublicTransport`}
                        checked={(block as VenueDirectionsBlock).showPublicTransport === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { showPublicTransport: checked })}
                      />
                      <Label htmlFor={`${block.id}-showPublicTransport`}>Show public transport options</Label>
                    </div>
                  </div>
                </div>
              )}

              {block.type === "check_in_info" && (
                <div className="space-y-2">
                  <Label>Custom Instructions</Label>
                  <Textarea
                    rows={2}
                    value={(block as CheckInInfoBlock).customInstructions || ""}
                    onChange={(e) => updateBlock(block.id, { customInstructions: e.target.value })}
                    placeholder="Check-in opens @CheckInTime"
                  />
                  <Label>Check-in Process (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={(block as CheckInInfoBlock).showCheckInProcess?.join('\n') || ""}
                    onChange={(e) => updateBlock(block.id, { showCheckInProcess: e.target.value.split('\n').filter(s => s.trim()) })}
                    placeholder="Arrive at least 15 minutes early&#10;Have your ticket ready (digital or printed)&#10;Bring a valid ID if required"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showQRCodes`}
                        checked={(block as CheckInInfoBlock).showQRCodes !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showQRCodes: checked })}
                      />
                      <Label htmlFor={`${block.id}-showQRCodes`}>Show QR codes for check-in</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showArrivalTime`}
                        checked={(block as CheckInInfoBlock).showArrivalTime !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showArrivalTime: checked })}
                      />
                      <Label htmlFor={`${block.id}-showArrivalTime`}>Show recommended arrival time</Label>
                    </div>
                  </div>
                </div>
              )}

              {block.type === "weather_info" && (
                <div className="space-y-2">
                  <Label>Custom Message</Label>
                  <Textarea
                    rows={2}
                    value={(block as WeatherInfoBlock).customMessage || ""}
                    onChange={(e) => updateBlock(block.id, { customMessage: e.target.value })}
                    placeholder="Check the weather and dress accordingly!"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showForecast`}
                        checked={(block as WeatherInfoBlock).showForecast !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showForecast: checked })}
                      />
                      <Label htmlFor={`${block.id}-showForecast`}>Show weather forecast</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-showRecommendations`}
                        checked={(block as WeatherInfoBlock).showRecommendations !== false}
                        onCheckedChange={(checked) => updateBlock(block.id, { showRecommendations: checked })}
                      />
                      <Label htmlFor={`${block.id}-showRecommendations`}>Show clothing recommendations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${block.id}-autoUpdate`}
                        checked={(block as WeatherInfoBlock).autoUpdate === true}
                        onCheckedChange={(checked) => updateBlock(block.id, { autoUpdate: checked })}
                      />
                      <Label htmlFor={`${block.id}-autoUpdate`}>Auto-update with live weather data</Label>
                    </div>
                  </div>
                </div>
              )}

              {block.type === "recommended_items" && (
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={(block as RecommendedItemsBlock).title || ""}
                    onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                    placeholder="What to bring:"
                  />
                  <Label>Items to Bring (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={(block as RecommendedItemsBlock).categories?.bring?.join('\n') || ""}
                    onChange={(e) => updateBlock(block.id, {
                      categories: {
                        ...(block as RecommendedItemsBlock).categories,
                        bring: e.target.value.split('\n').filter(s => s.trim())
                      }
                    })}
                    placeholder="Valid ID&#10;Your ticket&#10;Comfortable shoes"
                  />
                  <Label>What to Wear (one per line)</Label>
                  <Textarea
                    rows={2}
                    value={(block as RecommendedItemsBlock).categories?.wear?.join('\n') || ""}
                    onChange={(e) => updateBlock(block.id, {
                      categories: {
                        ...(block as RecommendedItemsBlock).categories,
                        wear: e.target.value.split('\n').filter(s => s.trim())
                      }
                    })}
                    placeholder="Weather-appropriate clothing&#10;Comfortable footwear"
                  />
                  <Label>What to Avoid (one per line)</Label>
                  <Textarea
                    rows={2}
                    value={(block as RecommendedItemsBlock).categories?.avoid?.join('\n') || ""}
                    onChange={(e) => updateBlock(block.id, {
                      categories: {
                        ...(block as RecommendedItemsBlock).categories,
                        avoid: e.target.value.split('\n').filter(s => s.trim())
                      }
                    })}
                    placeholder="Large bags (check venue policy)&#10;Outside food and drinks"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${block.id}-showIcons`}
                      checked={(block as RecommendedItemsBlock).showIcons !== false}
                      onCheckedChange={(checked) => updateBlock(block.id, { showIcons: checked })}
                    />
                    <Label htmlFor={`${block.id}-showIcons`}>Show category icons</Label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateBuilder;


