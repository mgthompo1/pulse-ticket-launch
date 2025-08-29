import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface GooglePayConfigurationProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const GooglePayConfiguration = ({ 
  isEnabled,
  onToggle
}: GooglePayConfigurationProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="googlePayEnabled">Enable Google Pay</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Google Pay will be automatically configured through Stripe
          </p>
        </div>
        <Switch
          id="googlePayEnabled"
          checked={isEnabled}
          onCheckedChange={onToggle}
        />
      </div>
      
      {isEnabled && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            ✅ Google Pay is enabled and will be automatically configured through your Stripe account.
            No additional setup required.
          </p>
        </div>
      )}
    </div>
  );
};
