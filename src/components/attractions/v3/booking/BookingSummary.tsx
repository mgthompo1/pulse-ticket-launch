/**
 * BookingSummary - Sticky sidebar showing booking details and price breakdown
 * Premium design with trust signals and clear CTA
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  User,
  ShoppingBag,
  Shield,
  CreditCard,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AttractionV3Data,
  EnhancedBookingSlot,
  AttractionAddon,
  AttractionPackage,
  StaffProfile,
  SelectedAddon,
  formatPrice,
  formatTime,
  formatDate,
  calculateBookingTotal,
} from '@/types/attraction-v3';
import { fadeInUp, staggerContainer, staggerItem, buttonTap } from '@/lib/animations';

interface BookingSummaryProps {
  attraction: AttractionV3Data;
  selectedDate: string;
  selectedSlot: EnhancedBookingSlot | null;
  selectedStaff?: StaffProfile | null;
  selectedAddons: Map<string, number>;
  selectedPackage?: AttractionPackage | null;
  addons: AttractionAddon[];
  partySize: number;
  onContinue: () => void;
  onEdit?: (section: 'date' | 'time' | 'staff' | 'addons' | 'party') => void;
  isProcessing?: boolean;
  ctaText?: string;
  showTrustSignals?: boolean;
  className?: string;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  attraction,
  selectedDate,
  selectedSlot,
  selectedStaff,
  selectedAddons,
  selectedPackage,
  addons,
  partySize,
  onContinue,
  onEdit,
  isProcessing = false,
  ctaText = 'Continue',
  showTrustSignals = true,
  className,
}) => {
  const currency = attraction.currency || 'USD';
  const basePrice = selectedSlot?.price ?? attraction.base_price;

  // Calculate totals
  const baseTotal = selectedPackage ? selectedPackage.price : basePrice * partySize;
  const safeAddons = addons || [];
  const addonsTotal = Array.from(selectedAddons?.entries() || []).reduce((total, [addonId, quantity]) => {
    const addon = safeAddons.find((a) => a.id === addonId);
    if (!addon) return total;

    let addonCost = 0;
    switch (addon.pricing_type) {
      case 'flat':
        addonCost = addon.price * quantity;
        break;
      case 'per_person':
        addonCost = addon.price * quantity * partySize;
        break;
      case 'percentage':
        addonCost = (baseTotal * (addon.price / 100)) * quantity;
        break;
    }
    return total + addonCost;
  }, 0);

  const grandTotal = baseTotal + addonsTotal;

  const canContinue = selectedSlot !== null;

  // Get selected addon details
  const selectedAddonDetails: SelectedAddon[] = Array.from(selectedAddons?.entries() || [])
    .map(([addonId, quantity]) => {
      const addon = safeAddons.find((a) => a.id === addonId);
      return addon ? { addon, quantity } : null;
    })
    .filter(Boolean) as SelectedAddon[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card rounded-xl border border-border shadow-premium overflow-hidden',
        'booking-summary-sticky',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted">
        <h3 className="font-semibold text-foreground">Booking Summary</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Attraction Info */}
        <div className="flex items-start gap-3">
          {attraction.logo_url ? (
            <img
              src={attraction.logo_url}
              alt={attraction.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate">{attraction.name}</h4>
            {attraction.venue && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {attraction.venue}
              </p>
            )}
          </div>
        </div>

        <hr className="border-border" />

        {/* Booking Details */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {/* Date */}
          <motion.div
            variants={staggerItem}
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {formatDate(selectedDate)}
              </span>
              {onEdit && (
                <button
                  onClick={() => onEdit('date')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Time */}
          <motion.div
            variants={staggerItem}
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {selectedSlot ? formatTime(selectedSlot.start_time) : 'Select time'}
              </span>
              {onEdit && (
                <button
                  onClick={() => onEdit('time')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Party Size */}
          <motion.div
            variants={staggerItem}
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Party Size</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {partySize} {partySize === 1 ? 'person' : 'people'}
              </span>
              {onEdit && (
                <button
                  onClick={() => onEdit('party')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Staff */}
          {selectedStaff && (
            <motion.div
              variants={staggerItem}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {attraction.resource_label || 'Staff'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedStaff.photo_url && (
                  <img
                    src={selectedStaff.photo_url}
                    alt={selectedStaff.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                )}
                <span className="text-sm font-medium text-foreground">
                  {selectedStaff.name}
                </span>
              </div>
            </motion.div>
          )}

          {/* Package */}
          {selectedPackage && (
            <motion.div
              variants={staggerItem}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-sm">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Package</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {selectedPackage.name}
              </span>
            </motion.div>
          )}

          {/* Add-ons */}
          <AnimatePresence>
            {selectedAddonDetails.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Add-ons</span>
                </div>
                <div className="pl-6 space-y-1">
                  {selectedAddonDetails.map(({ addon, quantity }) => (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {addon.name} × {quantity}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatPrice(addon.price * quantity, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <hr className="border-border" />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedPackage ? selectedPackage.name : `${formatPrice(basePrice, currency)} × ${partySize}`}
            </span>
            <span className="font-medium text-foreground">
              {formatPrice(baseTotal, currency)}
            </span>
          </div>

          {addonsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Add-ons</span>
              <span className="font-medium text-foreground">
                {formatPrice(addonsTotal, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(grandTotal, currency)}
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <motion.div whileTap={canContinue ? buttonTap : undefined}>
          <Button
            onClick={onContinue}
            disabled={!canContinue || isProcessing}
            className="w-full text-base font-semibold py-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {ctaText} - {formatPrice(grandTotal, currency)}
              </span>
            )}
          </Button>
        </motion.div>

        {/* Trust Signals */}
        {showTrustSignals && (
          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              Secure checkout
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="w-3.5 h-3.5 text-blue-500" />
              Instant confirmation
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Mobile Sticky Footer version
export const MobileBookingFooter: React.FC<{
  totalPrice: number;
  currency?: string;
  ctaText: string;
  onContinue: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  className?: string;
}> = ({
  totalPrice,
  currency = 'USD',
  ctaText,
  onContinue,
  disabled = false,
  isProcessing = false,
  className,
}) => {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        'mobile-bottom-sheet lg:hidden',
        'flex items-center justify-between p-4 gap-4',
        className
      )}
    >
      <div className="mobile-bottom-sheet-handle lg:hidden" />

      <div>
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-xl font-bold text-foreground">
          {formatPrice(totalPrice, currency)}
        </p>
      </div>

      <Button
        onClick={onContinue}
        disabled={disabled || isProcessing}
        className="flex-1 max-w-xs text-base font-semibold py-6"
      >
        {isProcessing ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
          />
        ) : (
          ctaText
        )}
      </Button>
    </motion.div>
  );
};

export default BookingSummary;
