import React from 'react';
import { MapPin } from 'lucide-react';

interface VenueMapProps {
  address?: string;
  lat?: number;
  lng?: number;
  height?: string;
  className?: string;
}

// Get Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const VenueMap: React.FC<VenueMapProps> = ({
  address,
  lat,
  lng,
  height = "300px",
  className = ""
}) => {
  // Don't render if no location data
  if (!address && (!lat || !lng)) {
    return null;
  }

  // If we have coordinates, use them for the map
  if (lat && lng && GOOGLE_MAPS_API_KEY) {
    const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${lat},${lng}&zoom=15`;

    return (
      <div className={`relative overflow-hidden rounded-lg border ${className}`} style={{ height }}>
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={mapSrc}
        />
      </div>
    );
  }

  // Fallback: If no API key or no coordinates, show address with link to Google Maps
  if (address) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    return (
      <div className={`flex items-start gap-3 p-4 border rounded-lg bg-slate-50 ${className}`}>
        <MapPin className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{address}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block"
          >
            View on Google Maps →
          </a>
        </div>
      </div>
    );
  }

  return null;
};
