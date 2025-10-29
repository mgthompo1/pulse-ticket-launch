import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaxPreset {
  id: string;
  country_code: string;
  country_name: string;
  region: string | null;
  tax_name: string;
  tax_rate: number;
  tax_inclusive: boolean;
  notes: string | null;
}

interface TaxSettingsProps {
  organizationId: string;
}

export const TaxSettings = ({ organizationId }: TaxSettingsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [presets, setPresets] = useState<TaxPreset[]>([]);

  // Tax configuration state
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxName, setTaxName] = useState('GST');
  const [taxRate, setTaxRate] = useState('15.00');
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [taxNumber, setTaxNumber] = useState('');
  const [taxCountry, setTaxCountry] = useState('NZ');
  const [taxRegion, setTaxRegion] = useState('');

  const loadTaxSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('tax_enabled, tax_name, tax_rate, tax_inclusive, tax_number, tax_country, tax_region')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      if (data) {
        setTaxEnabled(data.tax_enabled || false);
        setTaxName(data.tax_name || 'GST');
        setTaxRate(data.tax_rate?.toString() || '15.00');
        setTaxInclusive(data.tax_inclusive ?? true);
        setTaxNumber(data.tax_number || '');
        setTaxCountry(data.tax_country || 'NZ');
        setTaxRegion(data.tax_region || '');
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  const loadTaxPresets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tax_presets')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error loading tax presets:', error);
    }
  }, []);

  useEffect(() => {
    loadTaxSettings();
    loadTaxPresets();
  }, [loadTaxSettings, loadTaxPresets]);

  const handlePresetSelect = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setTaxName(preset.tax_name);
      setTaxRate(preset.tax_rate.toString());
      setTaxInclusive(preset.tax_inclusive);
      setTaxCountry(preset.country_code);
      setTaxRegion(preset.region || '');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        tax_enabled: taxEnabled,
        tax_name: taxName,
        tax_rate: parseFloat(taxRate),
        tax_inclusive: taxInclusive,
        tax_number: taxNumber || null,
        tax_country: taxCountry,
        tax_region: taxRegion || null,
      };

      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId)
        .select();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tax settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving tax settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tax settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const countryPresets = presets.filter(p => p.country_code === taxCountry);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Settings</CardTitle>
        <CardDescription>
          Configure GST, VAT, or Sales Tax for your organization. Tax will be applied to tickets, add-ons, donations, and booking fees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Tax Toggle */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex-1">
            <Label htmlFor="tax-enabled" className="text-base font-semibold">
              Enable Tax Collection
            </Label>
            <p className="text-sm text-gray-500">
              Automatically calculate and collect tax on all sales
            </p>
          </div>
          <Switch
            id="tax-enabled"
            checked={taxEnabled}
            onCheckedChange={setTaxEnabled}
          />
        </div>

        {taxEnabled && (
          <>
            {/* Quick Presets */}
            <div className="space-y-2">
              <Label>Quick Setup (Optional)</Label>
              <Select onValueChange={handlePresetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a preset or configure manually..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Configure Manually</SelectItem>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.country_name}
                      {preset.region && ` - ${preset.region}`}
                      {' - '}
                      {preset.tax_name} ({preset.tax_rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tax Display Model Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{taxInclusive ? 'Tax-Inclusive' : 'Tax-Exclusive'} Pricing</strong>
                <br />
                {taxInclusive ? (
                  <>Prices shown to customers include tax (recommended for NZ, AU, UK, EU)</>
                ) : (
                  <>Tax is added at checkout (recommended for US, Canada)</>
                )}
              </AlertDescription>
            </Alert>

            {/* Tax Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax-name">Tax Name</Label>
                <Input
                  id="tax-name"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="GST, VAT, Sales Tax..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="15.00"
                />
              </div>
            </div>

            {/* Tax Inclusive Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="tax-inclusive"
                checked={taxInclusive}
                onCheckedChange={setTaxInclusive}
              />
              <Label htmlFor="tax-inclusive">
                Prices include tax (tax-inclusive pricing)
              </Label>
            </div>

            {/* Country & Region */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax-country">Country</Label>
                <Input
                  id="tax-country"
                  value={taxCountry}
                  onChange={(e) => setTaxCountry(e.target.value.toUpperCase())}
                  placeholder="NZ, AU, US, GB, CA..."
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-region">State/Province (Optional)</Label>
                <Input
                  id="tax-region"
                  value={taxRegion}
                  onChange={(e) => setTaxRegion(e.target.value)}
                  placeholder="For US/Canada only"
                />
              </div>
            </div>

            {/* Tax Registration Number */}
            <div className="space-y-2">
              <Label htmlFor="tax-number">Tax Registration Number (Optional)</Label>
              <Input
                id="tax-number"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="GST/VAT/ABN Number"
              />
              <p className="text-sm text-gray-500">
                Your GST number, VAT registration, ABN, or EIN
              </p>
            </div>

            {/* Example Calculation */}
            {taxRate && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold">Example: $100 ticket</p>
                {taxInclusive ? (
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Display Price:</span>
                      <span>$100.00 (inc. {taxName})</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>${(100 / (1 + parseFloat(taxRate) / 100)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>{taxName} ({taxRate}%):</span>
                      <span>${(100 - 100 / (1 + parseFloat(taxRate) / 100)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>Customer Pays:</span>
                      <span>$100.00</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Ticket Price:</span>
                      <span>$100.00</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>{taxName} ({taxRate}%):</span>
                      <span>${(100 * parseFloat(taxRate) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>Customer Pays:</span>
                      <span>${(100 + 100 * parseFloat(taxRate) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save Tax Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
