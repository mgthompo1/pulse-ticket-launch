import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Copy,
  Trash2,
  Percent,
  DollarSign,
  Tag,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GroupDiscountCodesProps {
  groupId: string;
  groupName: string;
  allocationId?: string;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed" | "group_price";
  discount_value: number | null;
  custom_price: number | null;
  reason: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

export const GroupDiscountCodes: React.FC<GroupDiscountCodesProps> = ({
  groupId,
  groupName,
  allocationId,
}) => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "group_price" as "percentage" | "fixed" | "group_price",
    discountValue: "",
    customPrice: "",
    reason: "",
    maxUses: "",
  });

  useEffect(() => {
    loadDiscountCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadDiscountCodes = async () => {
    setLoading(true);
    try {
      // Query promo_codes table for codes specific to this group
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("organization_id", groupId) // We'll use organization_id to store group_id
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data as DiscountCode[] || []);
    } catch (error) {
      console.error("Error loading discount codes:", error);
      toast({
        title: "Error",
        description: "Failed to load discount codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    // Generate a random code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateCode = async () => {
    if (!formData.code) {
      toast({
        title: "Validation Error",
        description: "Please enter a discount code",
        variant: "destructive",
      });
      return;
    }

    try {
      const codeData: {
        code: string;
        discount_type: string;
        discount_value: number | null;
        custom_price: number | null;
        organization_id: string;
        reason: string | null;
        max_uses: number | null;
        uses_count: number;
        is_active: boolean;
      } = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discountType,
        discount_value: null,
        custom_price: null,
        organization_id: groupId, // Store group_id in organization_id field
        reason: formData.reason || null,
        max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
        uses_count: 0,
        is_active: true,
      };

      if (formData.discountType === "percentage" || formData.discountType === "fixed") {
        codeData.discount_value = parseFloat(formData.discountValue);
      } else if (formData.discountType === "group_price") {
        codeData.custom_price = parseFloat(formData.customPrice);
      }

      const { error } = await supabase.from("promo_codes").insert(codeData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Discount code created successfully",
      });

      setShowCreateDialog(false);
      setFormData({
        code: "",
        discountType: "group_price",
        discountValue: "",
        customPrice: "",
        reason: "",
        maxUses: "",
      });
      loadDiscountCodes();
    } catch (error) {
      console.error("Error creating discount code:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create code";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("Are you sure you want to delete this discount code?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("promo_codes")
        .delete()
        .eq("id", codeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Discount code deleted successfully",
      });

      loadDiscountCodes();
    } catch (error) {
      console.error("Error deleting code:", error);
      toast({
        title: "Error",
        description: "Failed to delete discount code",
        variant: "destructive",
      });
    }
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Code "${code}" copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Discount Codes</h3>
          <p className="text-muted-foreground">
            Create discount codes for {groupName} members
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Code
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900">How Discount Codes Work:</p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>
                  <strong>Group Price:</strong> Set a custom price (e.g., $50 for financial
                  hardship)
                </li>
                <li>
                  <strong>Percentage Off:</strong> Discount by percentage (e.g., 25% off)
                </li>
                <li>
                  <strong>Fixed Amount:</strong> Discount by dollar amount (e.g., $25 off)
                </li>
                <li>Share codes with your members via email or direct message</li>
                <li>Track usage and set maximum uses per code</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Codes List */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading discount codes...</p>
          </CardContent>
        </Card>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3 py-8">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No Discount Codes Yet</h3>
                <p className="text-muted-foreground">
                  Create discount codes to offer special pricing to your members
                </p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Code
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {codes.map((code) => (
            <Card key={code.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-lg font-mono font-bold bg-gray-100 px-3 py-1 rounded">
                        {code.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCodeToClipboard(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {code.reason && (
                      <p className="text-sm text-muted-foreground mt-2">{code.reason}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCode(code.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Discount Details */}
                <div className="flex items-center gap-2">
                  {code.discount_type === "percentage" && (
                    <>
                      <Percent className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">
                        {code.discount_value}% Off
                      </span>
                    </>
                  )}
                  {code.discount_type === "fixed" && (
                    <>
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">
                        ${code.discount_value?.toFixed(2)} Off
                      </span>
                    </>
                  )}
                  {code.discount_type === "group_price" && (
                    <>
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-600">
                        Custom Price: ${code.custom_price?.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Usage:</span>
                  <span className="font-semibold">
                    {code.uses_count}
                    {code.max_uses ? ` / ${code.max_uses}` : " uses"}
                  </span>
                </div>

                {/* Status Badge */}
                <Badge variant={code.is_active ? "default" : "secondary"}>
                  {code.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Discount Code</DialogTitle>
            <DialogDescription>
              Create a new discount code for your group members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Discount Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="SUMMER2025"
                  className="font-mono uppercase"
                />
                <Button
                  variant="outline"
                  onClick={() => setFormData((prev) => ({ ...prev, code: generateCode() }))}
                >
                  Generate
                </Button>
              </div>
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <Label htmlFor="discountType">Discount Type *</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: "percentage" | "fixed" | "group_price") =>
                  setFormData((prev) => ({ ...prev, discountType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group_price">Custom Price</SelectItem>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Fields */}
            {formData.discountType === "group_price" && (
              <div className="space-y-2">
                <Label htmlFor="customPrice">Custom Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="customPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.customPrice}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customPrice: e.target.value }))
                    }
                    placeholder="50.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The price members will pay with this code
                </p>
              </div>
            )}

            {(formData.discountType === "percentage" ||
              formData.discountType === "fixed") && (
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === "percentage"
                    ? "Percentage Off *"
                    : "Amount Off *"}
                </Label>
                <div className="relative">
                  {formData.discountType === "fixed" && (
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  )}
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    step={formData.discountType === "percentage" ? "1" : "0.01"}
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, discountValue: e.target.value }))
                    }
                    placeholder={formData.discountType === "percentage" ? "25" : "25.00"}
                    className={formData.discountType === "fixed" ? "pl-7" : ""}
                  />
                  {formData.discountType === "percentage" && (
                    <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                  )}
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason / Description</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Financial hardship assistance"
                rows={2}
              />
            </div>

            {/* Max Uses */}
            <div className="space-y-2">
              <Label htmlFor="maxUses">Maximum Uses (Optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                value={formData.maxUses}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxUses: e.target.value }))}
                placeholder="Unlimited"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for unlimited uses
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCode}>Create Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupDiscountCodes;
