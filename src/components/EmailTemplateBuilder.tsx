import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateBuilder;


