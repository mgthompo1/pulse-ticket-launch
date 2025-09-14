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
  EmailBlockType,
  HeaderBlock,
  TextBlock,
  EventDetailsBlock,
  TicketListBlock,
  ButtonBlock,
  DividerBlock,
  ImageBlock,
  FooterBlock,
} from "@/types/email-template";

interface EmailTemplateBuilderProps {
  template?: EmailTemplate;
  onChange?: (template: EmailTemplate) => void;
  emailCustomization?: any;
  onEmailCustomizationChange?: (customization: any) => void;
  isAttractionMode?: boolean;
  templateType?: 'ticket_confirmation' | 'booking_confirmation';
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateBuilder;


