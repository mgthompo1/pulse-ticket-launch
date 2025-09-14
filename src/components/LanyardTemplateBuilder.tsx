import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  LanyardTemplate,
  LanyardBlock,
  LanyardBlockType,
  LanyardPreviewData,
  createDefaultLanyardTemplate
} from "@/types/lanyard-template";
import LanyardPreviewSimple from "./LanyardPreviewSimple";
import {
  User,
  Calendar,
  Clock,
  Tag,
  QrCode,
  Star,
  Type,
  Minus,
  Image,
  Download,
  Eye,
  Settings,
  Plus,
  Trash2,
  Move,
  RotateCcw
} from "lucide-react";

interface LanyardTemplateBuilderProps {
  template?: LanyardTemplate;
  onSave: (template: Partial<LanyardTemplate>) => void;
  onPreview: (template: LanyardTemplate, previewData: LanyardPreviewData) => void;
  previewData?: LanyardPreviewData;
}

const defaultPreviewData: LanyardPreviewData = {
  attendeeName: "John Doe",
  eventTitle: "Annual Conference 2024",
  eventDate: "March 15, 2024",
  eventTime: "9:00 AM",
  ticketType: "VIP Access",
  ticketCode: "TC-2024-001",
  specialAccess: "Backstage Pass"
};

const blockTypes: { type: LanyardBlockType; label: string; icon: any }[] = [
  { type: 'attendee_name', label: 'Attendee Name', icon: User },
  { type: 'event_title', label: 'Event Title', icon: Type },
  { type: 'event_date', label: 'Event Date', icon: Calendar },
  { type: 'event_time', label: 'Event Time', icon: Clock },
  { type: 'ticket_type', label: 'Ticket Type', icon: Tag },
  { type: 'qr_code', label: 'QR Code', icon: QrCode },
  { type: 'organization_logo', label: 'Organization Logo', icon: Image },
  { type: 'event_logo', label: 'Event Logo', icon: Image },
  { type: 'special_access', label: 'Special Access', icon: Star },
  { type: 'custom_text', label: 'Custom Text', icon: Type },
  { type: 'divider_line', label: 'Divider Line', icon: Minus }
];

export const LanyardTemplateBuilder = ({
  template,
  onSave,
  onPreview,
  previewData = defaultPreviewData
}: LanyardTemplateBuilderProps) => {
  const [currentTemplate, setCurrentTemplate] = useState<Partial<LanyardTemplate>>(
    template || createDefaultLanyardTemplate()
  );
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addBlock = (type: LanyardBlockType) => {
    const newBlock: LanyardBlock = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 20, y: 20 },
      size: { width: 40, height: 15 },
      style: {
        fontSize: 12,
        fontWeight: 'normal',
        color: '#000000',
        textAlign: 'center',
        backgroundColor: 'transparent',
        borderRadius: 0,
        padding: 4
      }
    } as LanyardBlock;

    // Type-specific defaults
    if (type === 'qr_code') {
      newBlock.size = { width: 20, height: 20 };
      (newBlock as any).qrSize = 100;
      (newBlock as any).includeTicketCode = true;
    } else if (type === 'divider_line') {
      newBlock.size = { width: 60, height: 2 };
      (newBlock as any).lineColor = '#e2e8f0';
      (newBlock as any).lineThickness = 1;
    } else if (type === 'attendee_name') {
      newBlock.style.fontSize = 16;
      newBlock.style.fontWeight = 'bold';
      (newBlock as any).showFirstName = true;
      (newBlock as any).showLastName = true;
    }

    setCurrentTemplate(prev => ({
      ...prev,
      blocks: [...(prev.blocks || []), newBlock]
    }));
  };

  const updateBlock = (blockId: string, updates: Partial<LanyardBlock>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      blocks: (prev.blocks || []).map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    }));
  };

  const deleteBlock = (blockId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      blocks: (prev.blocks || []).filter(block => block.id !== blockId)
    }));
    setSelectedBlock(null);
  };

  const handleSave = () => {
    onSave(currentTemplate);
  };

  const handlePreview = () => {
    if (currentTemplate.blocks) {
      onPreview(currentTemplate as LanyardTemplate, previewData);
    }
  };

  const resetToDefault = () => {
    setCurrentTemplate(createDefaultLanyardTemplate());
    setSelectedBlock(null);
  };

  const selectedBlockData = selectedBlock
    ? currentTemplate.blocks?.find(b => b.id === selectedBlock)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lanyard Template Designer</CardTitle>
              <CardDescription>
                Create and customize professional lanyards for your events
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetToDefault}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button onClick={handleSave}>
                <Download className="mr-2 h-4 w-4" />
                Save Template
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lanyard Preview</CardTitle>
              <CardDescription>
                {currentTemplate.dimensions?.width || 85}mm × {currentTemplate.dimensions?.height || 120}mm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                {currentTemplate.blocks && currentTemplate.blocks.length > 0 ? (
                  <div className="relative">
                    <LanyardPreviewSimple
                      template={currentTemplate as LanyardTemplate}
                      previewData={previewData}
                      scale={0.8}
                    />
                    {/* Selection overlay for editing */}
                    <div
                      ref={canvasRef}
                      className="absolute inset-0"
                      style={{
                        pointerEvents: 'auto'
                      }}
                    >
                      {currentTemplate.blocks?.map(block => (
                        <div
                          key={block.id}
                          className={`absolute border-2 cursor-pointer transition-all ${
                            selectedBlock === block.id
                              ? 'border-blue-500 bg-blue-100/20'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                          style={{
                            left: `${block.position.x}%`,
                            top: `${block.position.y}%`,
                            width: `${block.size.width}%`,
                            height: `${block.size.height}%`,
                            borderRadius: '2px'
                          }}
                          onClick={() => setSelectedBlock(block.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
                    style={{
                      width: '204px', // 85mm * 3 * 0.8 for scale
                      height: '288px'  // 120mm * 3 * 0.8 for scale
                    }}
                  >
                    <div className="text-center text-gray-400">
                      <QrCode className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">Add blocks to design your lanyard</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="blocks" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="blocks">Blocks</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Add Blocks Tab */}
            <TabsContent value="blocks">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Elements</CardTitle>
                  <CardDescription>Drag elements to add them to your lanyard</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {blockTypes.map(({ type, label, icon: Icon }) => (
                      <Button
                        key={type}
                        variant="outline"
                        className="h-auto p-3 justify-start"
                        onClick={() => addBlock(type)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Block Properties Tab */}
            <TabsContent value="properties">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Block Properties</CardTitle>
                  <CardDescription>
                    {selectedBlockData ? `Editing ${selectedBlockData.type}` : 'Select a block to edit'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedBlockData ? (
                    <>
                      {/* Position & Size */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Position & Size</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">X Position (%)</Label>
                            <Slider
                              value={[selectedBlockData.position.x]}
                              onValueChange={([value]) =>
                                updateBlock(selectedBlockData.id, {
                                  position: { ...selectedBlockData.position, x: value }
                                })
                              }
                              max={100}
                              step={1}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Y Position (%)</Label>
                            <Slider
                              value={[selectedBlockData.position.y]}
                              onValueChange={([value]) =>
                                updateBlock(selectedBlockData.id, {
                                  position: { ...selectedBlockData.position, y: value }
                                })
                              }
                              max={100}
                              step={1}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Width (%)</Label>
                            <Slider
                              value={[selectedBlockData.size.width]}
                              onValueChange={([value]) =>
                                updateBlock(selectedBlockData.id, {
                                  size: { ...selectedBlockData.size, width: value }
                                })
                              }
                              max={100}
                              step={1}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Height (%)</Label>
                            <Slider
                              value={[selectedBlockData.size.height]}
                              onValueChange={([value]) =>
                                updateBlock(selectedBlockData.id, {
                                  size: { ...selectedBlockData.size, height: value }
                                })
                              }
                              max={50}
                              step={1}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Text Styling */}
                      {selectedBlockData.type !== 'qr_code' && selectedBlockData.type !== 'divider_line' && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Text Styling</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Font Size</Label>
                              <Slider
                                value={[selectedBlockData.style.fontSize || 12]}
                                onValueChange={([value]) =>
                                  updateBlock(selectedBlockData.id, {
                                    style: { ...selectedBlockData.style, fontSize: value }
                                  })
                                }
                                min={8}
                                max={24}
                                step={1}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Font Weight</Label>
                              <Select
                                value={selectedBlockData.style.fontWeight || 'normal'}
                                onValueChange={(value) =>
                                  updateBlock(selectedBlockData.id, {
                                    style: { ...selectedBlockData.style, fontWeight: value as any }
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="light">Light</SelectItem>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="bold">Bold</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Text Align</Label>
                              <Select
                                value={selectedBlockData.style.textAlign || 'center'}
                                onValueChange={(value) =>
                                  updateBlock(selectedBlockData.id, {
                                    style: { ...selectedBlockData.style, textAlign: value as any }
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">Left</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Text Color</Label>
                              <Input
                                type="color"
                                value={selectedBlockData.style.color || '#000000'}
                                onChange={(e) =>
                                  updateBlock(selectedBlockData.id, {
                                    style: { ...selectedBlockData.style, color: e.target.value }
                                  })
                                }
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Type-specific properties */}
                      {selectedBlockData.type === 'custom_text' && (
                        <div>
                          <Label className="text-xs">Custom Text</Label>
                          <Input
                            value={(selectedBlockData as any).text || ''}
                            onChange={(e) =>
                              updateBlock(selectedBlockData.id, { text: e.target.value } as any)
                            }
                            placeholder="Enter custom text..."
                          />
                        </div>
                      )}

                      {selectedBlockData.type === 'divider_line' && (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Line Color</Label>
                            <Input
                              type="color"
                              value={(selectedBlockData as any).lineColor || '#e2e8f0'}
                              onChange={(e) =>
                                updateBlock(selectedBlockData.id, { lineColor: e.target.value } as any)
                              }
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Line Thickness</Label>
                            <Slider
                              value={[(selectedBlockData as any).lineThickness || 1]}
                              onValueChange={([value]) =>
                                updateBlock(selectedBlockData.id, { lineThickness: value } as any)
                              }
                              min={1}
                              max={5}
                              step={1}
                            />
                          </div>
                        </div>
                      )}

                      {/* Delete Button */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBlock(selectedBlockData.id)}
                        className="w-full"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Block
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>Select a block to view its properties</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Template Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Template Name</Label>
                    <Input
                      value={currentTemplate.name || ''}
                      onChange={(e) => setCurrentTemplate(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      placeholder="Enter template name..."
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Background Color</Label>
                    <Input
                      type="color"
                      value={currentTemplate.background?.color || '#ffffff'}
                      onChange={(e) => setCurrentTemplate(prev => ({
                        ...prev,
                        background: { ...prev.background, color: e.target.value }
                      }))}
                      className="h-8"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Width (mm)</Label>
                      <Input
                        type="number"
                        value={currentTemplate.dimensions?.width || 85}
                        onChange={(e) => setCurrentTemplate(prev => ({
                          ...prev,
                          dimensions: {
                            ...prev.dimensions,
                            width: parseInt(e.target.value) || 85,
                            height: prev.dimensions?.height || 120,
                            unit: 'mm' as const
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Height (mm)</Label>
                      <Input
                        type="number"
                        value={currentTemplate.dimensions?.height || 120}
                        onChange={(e) => setCurrentTemplate(prev => ({
                          ...prev,
                          dimensions: {
                            ...prev.dimensions,
                            height: parseInt(e.target.value) || 120,
                            width: prev.dimensions?.width || 85,
                            unit: 'mm' as const
                          }
                        }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};