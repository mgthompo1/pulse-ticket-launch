
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
interface WindcaveConfigurationProps {
  windcaveUsername: string;
  windcaveApiKey: string;
  windcaveEndpoint: string;
  windcaveEnabled: boolean;
  windcaveHitUsername: string;
  windcaveHitKey: string;
  windcaveStationId: string;
  currency: string;
  onWindcaveUsernameChange: (value: string) => void;
  onWindcaveApiKeyChange: (value: string) => void;
  onWindcaveEndpointChange: (value: string) => void;
  onWindcaveEnabledChange: (value: boolean) => void;
  onWindcaveHitUsernameChange: (value: string) => void;
  onWindcaveHitKeyChange: (value: string) => void;
  onWindcaveStationIdChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
}

export const WindcaveConfiguration = ({
  windcaveUsername,
  windcaveApiKey,
  windcaveEndpoint,
  windcaveEnabled,
  windcaveHitUsername,
  windcaveHitKey,
  windcaveStationId,
  currency,
  onWindcaveUsernameChange,
  onWindcaveApiKeyChange,
  onWindcaveEndpointChange,
  onWindcaveEnabledChange,
  onWindcaveHitUsernameChange,
  onWindcaveHitKeyChange,
  onWindcaveStationIdChange,
  onCurrencyChange,
}: WindcaveConfigurationProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="windcaveUsername">Windcave Username</Label>
        <Input
          id="windcaveUsername"
          value={windcaveUsername}
          onChange={(e) => onWindcaveUsernameChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="windcaveApiKey">Windcave API Key</Label>
        <Input
          id="windcaveApiKey"
          value={windcaveApiKey}
          onChange={(e) => onWindcaveApiKeyChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="windcaveEndpoint">Windcave Endpoint</Label>
        <Select value={windcaveEndpoint} onValueChange={onWindcaveEndpointChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select endpoint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UAT">UAT</SelectItem>
            <SelectItem value="SEC">SEC</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Label htmlFor="windcaveEnabled">Windcave Enabled</Label>
        <Switch
          id="windcaveEnabled"
          checked={windcaveEnabled}
          onCheckedChange={onWindcaveEnabledChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="windcaveHitUsername">Windcave HIT Username</Label>
        <Input
          id="windcaveHitUsername"
          value={windcaveHitUsername}
          onChange={(e) => onWindcaveHitUsernameChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="windcaveHitKey">Windcave HIT Key</Label>
        <Input
          id="windcaveHitKey"
          value={windcaveHitKey}
          onChange={(e) => onWindcaveHitKeyChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="windcaveStationId">Windcave Station ID</Label>
        <Input
          id="windcaveStationId"
          value={windcaveStationId}
          onChange={(e) => onWindcaveStationIdChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="windcaveHitCurrency">Windcave HIT Currency</Label>
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NZD">New Zealand Dollar (NZD)</SelectItem>
            <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
            <SelectItem value="USD">US Dollar (USD)</SelectItem>
            <SelectItem value="GBP">British Pound (GBP)</SelectItem>
            <SelectItem value="EUR">Euro (EUR)</SelectItem>
            <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
};