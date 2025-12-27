/**
 * Confirmation - Success page with booking details and upsells
 * Celebratory animation with next steps
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  Mail,
  Download,
  Share2,
  ChevronRight,
  Star,
  Gift,
  CreditCard,
  QrCode,
  Smartphone,
  Printer,
  Flag,
  Car,
  Shirt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BookingFlowState,
  AttractionPackage,
  AttractionAddon,
  formatPrice,
  formatDate,
  formatTime,
} from '@/types/attraction-v3';
import {
  successCheckmark,
  confettiExplosion,
  staggerContainer,
  staggerItem,
  cardHover,
  buttonTap,
} from '@/lib/animations';

interface GolfDetails {
  holes: number;
  cartIncluded: boolean;
  caddieSelected: boolean;
  dressCode?: string | null;
  par?: number;
  courseRating?: number | null;
  slopeRating?: number | null;
}

interface ConfirmationProps {
  booking: {
    id: string;
    reference: string;
    status: string;
    date: string;
    time: string;
    partySize: number;
    customerName: string;
    customerEmail: string;
    total: number;
    currency: string;
  };
  attraction: {
    name: string;
    location?: string;
    imageUrl?: string;
  };
  selectedPackage?: AttractionPackage | null;
  selectedAddons?: { addon: AttractionAddon; quantity: number }[];
  staffName?: string;
  golfDetails?: GolfDetails;
  upsells?: {
    id: string;
    title: string;
    description: string;
    price: number;
    imageUrl?: string;
  }[];
  onAddUpsell?: (upsellId: string) => void;
  onDownloadTicket?: () => void;
  onAddToCalendar?: () => void;
  className?: string;
}

export const Confirmation: React.FC<ConfirmationProps> = ({
  booking,
  attraction,
  selectedPackage,
  selectedAddons,
  staffName,
  golfDetails,
  upsells = [],
  onAddUpsell,
  onDownloadTicket,
  onAddToCalendar,
  className,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('max-w-2xl mx-auto space-y-8', className)}
    >
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          >
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                  scale: 0,
                }}
                animate={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  scale: [0, 1, 1, 0],
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut',
                }}
                className={cn(
                  'absolute w-3 h-3 rounded-sm',
                  ['bg-primary', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-pink-400'][
                    Math.floor(Math.random() * 5)
                  ]
                )}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Header */}
      <motion.div
        variants={staggerItem}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
          className="w-20 h-20 mx-auto rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <CheckCircle className="w-10 h-10 text-green-500" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          Booking Confirmed!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground"
        >
          Your adventure awaits. Check your email for confirmation.
        </motion.p>
      </motion.div>

      {/* Booking Reference Card */}
      <motion.div
        variants={staggerItem}
        className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Booking Reference</p>
            <p className="text-2xl font-mono font-bold text-primary">{booking.reference}</p>
          </div>
          <div className="w-16 h-16 bg-card rounded-xl flex items-center justify-center shadow-sm border border-border">
            <QrCode className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span>Confirmation sent to <span className="font-medium text-foreground">{booking.customerEmail}</span></span>
        </div>
      </motion.div>

      {/* Booking Details Card */}
      <motion.div
        variants={staggerItem}
        className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        {/* Attraction Header */}
        {attraction.imageUrl && (
          <div className="relative h-40 bg-muted">
            <img
              src={attraction.imageUrl}
              alt={attraction.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-xl font-bold text-white">{attraction.name}</h2>
              {attraction.location && (
                <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {attraction.location}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <DetailItem
              icon={<Calendar className="w-5 h-5" />}
              label="Date"
              value={formatDate(booking.date)}
            />
            <DetailItem
              icon={<Clock className="w-5 h-5" />}
              label={golfDetails ? 'Tee Time' : 'Time'}
              value={formatTime(booking.time)}
            />
            <DetailItem
              icon={<Users className="w-5 h-5" />}
              label={golfDetails ? 'Players' : 'Guests'}
              value={`${booking.partySize} ${booking.partySize === 1 ? (golfDetails ? 'player' : 'person') : (golfDetails ? 'players' : 'people')}`}
            />
            {golfDetails && (
              <DetailItem
                icon={<Flag className="w-5 h-5" />}
                label="Round"
                value={`${golfDetails.holes} holes`}
              />
            )}
            {staffName && (
              <DetailItem
                icon={<Star className="w-5 h-5" />}
                label="Guide"
                value={staffName}
              />
            )}
          </div>

          {/* Golf-specific details */}
          {golfDetails && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Flag className="w-4 h-4 text-green-600" />
                Golf Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Golf Cart
                  </span>
                  <span className="font-medium text-foreground">
                    {golfDetails.cartIncluded ? 'Included' : 'Not included'}
                  </span>
                </div>
                {golfDetails.caddieSelected && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Caddie Service</span>
                    <span className="font-medium text-foreground">Yes</span>
                  </div>
                )}
                {golfDetails.par && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Course Par</span>
                    <span className="font-medium text-foreground">{golfDetails.par}</span>
                  </div>
                )}
                {golfDetails.courseRating && golfDetails.slopeRating && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rating / Slope</span>
                    <span className="font-medium text-foreground">
                      {golfDetails.courseRating} / {golfDetails.slopeRating}
                    </span>
                  </div>
                )}
              </div>
              {golfDetails.dressCode && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                    <Shirt className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-sm">Dress Code: </span>
                      <span className="text-sm">{golfDetails.dressCode}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Package & Add-ons */}
          {(selectedPackage || (selectedAddons && selectedAddons.length > 0)) && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">What's Included</h3>
              <div className="space-y-2">
                {selectedPackage && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{selectedPackage.name}</span>
                    <span className="font-medium text-foreground">{formatPrice(selectedPackage.price, booking.currency)}</span>
                  </div>
                )}
                {selectedAddons?.map(({ addon, quantity }) => (
                  <div key={addon.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {addon.name} {quantity > 1 && `x${quantity}`}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatPrice(addon.price * quantity, booking.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">Total Paid</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(booking.total, booking.currency)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        variants={staggerItem}
        className="grid grid-cols-2 gap-4"
      >
        <motion.button
          whileHover={cardHover}
          whileTap={buttonTap}
          onClick={onDownloadTicket}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-border bg-card text-foreground font-medium hover:border-muted-foreground/50 transition-colors"
        >
          <Download className="w-5 h-5" />
          Download Ticket
        </motion.button>

        <motion.button
          whileHover={cardHover}
          whileTap={buttonTap}
          onClick={onAddToCalendar}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Calendar className="w-5 h-5" />
          Add to Calendar
        </motion.button>
      </motion.div>

      {/* How to Use Your Ticket */}
      <motion.div
        variants={staggerItem}
        className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-foreground mb-4">How to Use Your Ticket</h3>
        <div className="space-y-4">
          <StepItem
            number={1}
            icon={<Smartphone className="w-5 h-5" />}
            title="Show Your QR Code"
            description="Present the QR code on your phone at the entrance"
          />
          <StepItem
            number={2}
            icon={<Clock className="w-5 h-5" />}
            title="Arrive 10 Minutes Early"
            description="Allow time for check-in and any safety briefings"
          />
          <StepItem
            number={3}
            icon={<Star className="w-5 h-5" />}
            title="Enjoy Your Experience"
            description="Have an amazing time and create memories!"
          />
        </div>
      </motion.div>

      {/* Upsells */}
      {upsells.length > 0 && (
        <motion.div variants={staggerItem} className="space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Enhance Your Experience</h3>
          </div>

          <div className="grid gap-4">
            {upsells.map((upsell) => (
              <motion.div
                key={upsell.id}
                whileHover={cardHover}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
              >
                {upsell.imageUrl && (
                  <img
                    src={upsell.imageUrl}
                    alt={upsell.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground">{upsell.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">{upsell.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    +{formatPrice(upsell.price, booking.currency)}
                  </p>
                  <motion.button
                    whileTap={buttonTap}
                    onClick={() => onAddUpsell?.(upsell.id)}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Add
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Share Section */}
      <motion.div
        variants={staggerItem}
        className="text-center py-6"
      >
        <p className="text-sm text-muted-foreground mb-3">Share your upcoming adventure</p>
        <div className="flex justify-center gap-4">
          <ShareButton network="twitter" />
          <ShareButton network="facebook" />
          <ShareButton network="copy" />
        </div>
      </motion.div>

      {/* Rate Your Booking Experience */}
      <motion.div
        variants={staggerItem}
        className="text-center py-8 bg-muted rounded-2xl"
      >
        <h3 className="font-semibold text-foreground mb-2">How was your booking experience?</h3>
        <p className="text-sm text-muted-foreground mb-4">Help us improve</p>
        <div className="flex justify-center gap-2">
          {['😡', '😕', '😐', '😊', '😍'].map((emoji, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="text-2xl p-2 hover:bg-card rounded-lg transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Detail item component
const DetailItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  </div>
);

// Step item for instructions
const StepItem: React.FC<{
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ number, icon, title, description }) => (
  <div className="flex items-start gap-4">
    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold flex-shrink-0">
      {number}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-primary">{icon}</span>
        <h4 className="font-medium text-foreground">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

// Share button
const ShareButton: React.FC<{
  network: 'twitter' | 'facebook' | 'copy';
}> = ({ network }) => {
  const icons = {
    twitter: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    facebook: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    copy: <Share2 className="w-5 h-5" />,
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
    >
      {icons[network]}
    </motion.button>
  );
};

// Compact confirmation banner for top of page
export const ConfirmationBanner: React.FC<{
  reference: string;
  onViewDetails: () => void;
  className?: string;
}> = ({ reference, onViewDetails, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-100',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="text-sm text-green-700">
          Booking confirmed! Reference: <span className="font-mono font-semibold">{reference}</span>
        </span>
      </div>
      <button
        onClick={onViewDetails}
        className="text-sm text-green-700 font-medium hover:underline flex items-center gap-1"
      >
        View Details <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default Confirmation;
