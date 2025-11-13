import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VenueLocation {
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

interface VenueLocationPickerProps {
  value: VenueLocation;
  onChange: (location: VenueLocation) => void;
  label?: string;
  placeholder?: string;
}

// Get Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const VenueLocationPicker: React.FC<VenueLocationPickerProps> = ({
  value,
  onChange,
  label = "Venue Location",
  placeholder = "Enter venue address..."
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setShowApiKeyWarning(true);
      return;
    }

    // Check if script is already loaded
    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setShowApiKeyWarning(true);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || !GOOGLE_MAPS_API_KEY) return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['formatted_address', 'geometry', 'place_id', 'name']
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place && place.geometry && place.geometry.location) {
          onChange({
            address: place.formatted_address || place.name || '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id
          });
        }
      });
    } catch (error) {
      console.error('Error initializing Google Maps Autocomplete:', error);
      setShowApiKeyWarning(true);
    }
  }, [scriptLoaded, onChange]);

  // Handle manual input (when autocomplete is not used)
  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      address: e.target.value,
      lat: value.lat,
      lng: value.lng,
      placeId: value.placeId
    });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="venue-location" className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
      </Label>

      {showApiKeyWarning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Google Maps integration requires an API key. Add VITE_GOOGLE_MAPS_API_KEY to your .env file for autocomplete and map display.
          </AlertDescription>
        </Alert>
      )}

      <Input
        ref={inputRef}
        id="venue-location"
        type="text"
        value={value.address}
        onChange={handleManualInput}
        placeholder={placeholder}
        className="w-full"
      />

      {value.lat && value.lng && (
        <p className="text-xs text-muted-foreground">
          Coordinates: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};
