import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, MapPin, ArrowLeft } from 'lucide-react';
import { AttractionData } from '@/types/attraction';
import { Theme } from '@/types/theme';

interface AttractionHeroProps {
  attraction: AttractionData;
  theme: Theme;
  onBack?: () => void;
  onBookNow: () => void;
}

export const AttractionHero: React.FC<AttractionHeroProps> = ({
  attraction,
  theme,
  onBack,
  onBookNow
}) => {
  const {
    primaryColor,
    buttonTextColor,
    headerTextColor,
    bodyTextColor
  } = theme;

  const widgetCustomization = attraction.widget_customization as any;

  return (
    <div className="bg-white py-8 px-4">
      {/* Back Button */}
      {onBack && (
        <div className="max-w-4xl">
          <div className="flex justify-start mb-6">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      )}

      {/* Logo Container - Centered */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          {attraction.logo_url ? (
            <img
              src={attraction.logo_url}
              alt={`${attraction.name} Logo`}
              className="mx-auto max-h-64 w-auto object-contain rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
              <Calendar className="h-16 w-16" style={{ color: primaryColor }} />
            </div>
          )}

          {/* Organization Logo */}
          {widgetCustomization?.branding?.showOrgLogo &&
           attraction.organizations?.logo_url &&
           attraction.organizations.logo_url !== attraction.logo_url && (
            <div className="mt-6">
              <img
                src={attraction.organizations.logo_url}
                alt={`${attraction.organizations?.name || 'Organization'} Logo`}
                className="h-12 mx-auto object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* Text Container - Left Aligned */}
      <div className="max-w-4xl">
        <div className="space-y-6 text-left max-w-2xl">
          {/* Attraction Name */}
          <h1
            className="text-4xl md:text-5xl font-bold leading-tight"
            style={{ color: headerTextColor }}
          >
            {attraction.name}
          </h1>

          {/* Venue */}
          {attraction.venue && (
            <div
              className="flex items-center gap-3 text-xl"
              style={{ color: bodyTextColor }}
            >
              <MapPin className="h-6 w-6" style={{ color: primaryColor }} />
              <span className="font-medium">{attraction.venue}</span>
            </div>
          )}

          {/* Duration */}
          <div
            className="flex items-center gap-3 text-lg"
            style={{ color: bodyTextColor }}
          >
            <Clock className="h-5 w-5" style={{ color: primaryColor }} />
            <span className="font-medium">{attraction.duration_minutes} minute sessions</span>
          </div>

          {/* Pricing */}
          <div
            className="flex items-center gap-3 text-lg"
            style={{ color: bodyTextColor }}
          >
            <DollarSign className="h-5 w-5" style={{ color: primaryColor }} />
            <span className="font-medium">From ${attraction.base_price}</span>
          </div>

          {/* Host/Organization */}
          {attraction.organizations?.name && (
            <div
              className="flex items-center gap-3 text-lg"
              style={{ color: bodyTextColor }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-xs text-white font-bold">H</span>
              </div>
              <span>
                Hosted by{' '}
                <span className="font-medium">{attraction.organizations.name}</span>
              </span>
            </div>
          )}

          {/* Custom Header Text */}
          {widgetCustomization?.branding?.customHeaderText && (
            <div
              className="text-xl leading-relaxed"
              style={{ color: bodyTextColor }}
              dangerouslySetInnerHTML={{
                __html: widgetCustomization.branding.customHeaderText
              }}
            />
          )}

          {/* Book Now CTA */}
          <div className="pt-4">
            <Button
              size="lg"
              className="font-semibold px-12 py-4 text-xl shadow-lg hover:shadow-xl transition-all duration-200"
              style={{ backgroundColor: primaryColor, color: buttonTextColor }}
              onClick={onBookNow}
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
