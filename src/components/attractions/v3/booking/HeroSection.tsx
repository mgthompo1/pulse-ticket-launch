/**
 * HeroSection - Full-bleed hero with gallery, rating, and floating booking card
 * Airbnb/Stripe inspired design with Framer Motion animations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  Users,
  Play,
  ImageIcon,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AttractionV3Data,
  GalleryImage,
  RatingSummary,
  formatPrice,
} from '@/types/attraction-v3';
import { fadeInUp, staggerContainer, staggerItem, cardHover } from '@/lib/animations';

interface HeroSectionProps {
  attraction: AttractionV3Data;
  gallery?: GalleryImage[];
  ratingSummary?: RatingSummary | null;
  recentBookingsCount?: number;
  onBookNow: () => void;
  onGalleryOpen?: () => void;
  onBack?: () => void;
  className?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  attraction,
  gallery = [],
  ratingSummary,
  recentBookingsCount = 0,
  onBookNow,
  onGalleryOpen,
  onBack,
  className,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const heroSettings = attraction.hero_settings ?? {
    layout: 'fullwidth',
    showGallery: true,
    showRating: true,
    showBookingCount: true,
    overlayOpacity: 0.5,
    ctaText: 'Book Now',
    showFloatingCard: true,
  };

  const isMinimal = heroSettings.layout === 'minimal';
  const showFloatingCard = heroSettings.showFloatingCard !== false && !isMinimal;

  // Get images for gallery
  const images = gallery.length > 0
    ? gallery.map((g) => g.image_url)
    : attraction.featured_image_url
    ? [attraction.featured_image_url]
    : attraction.logo_url
    ? [attraction.logo_url]
    : [];

  const currentImage = images[currentImageIndex] || '/placeholder-attraction.jpg';

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Minimal layout - just a compact header
  if (isMinimal) {
    return (
      <section className={cn('relative w-full bg-gradient-to-r from-primary/10 to-primary/5 py-8', className)}>
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {attraction.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {attraction.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {attraction.venue}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {attraction.duration_minutes} min
                </span>
                <span className="font-semibold text-foreground">
                  From {formatPrice(attraction.base_price, attraction.currency || 'USD')}
                </span>
              </div>
            </div>
            <Button
              size="lg"
              onClick={onBookNow}
              className="w-full md:w-auto"
            >
              <Calendar className="w-5 h-5 mr-2" />
              {heroSettings.ctaText || 'Book Now'}
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('relative w-full', className)}>
      {/* Hero Image Container */}
      <div className="hero-fullwidth">
        {/* Background Image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {images.length > 0 ? (
              <img
                src={currentImage}
                alt={attraction.name}
                className="hero-image"
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Gradient Overlay */}
        <div
          className="hero-overlay"
          style={{ opacity: heroSettings.overlayOpacity }}
        />

        {/* Back Button */}
        {onBack && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-6 left-6 z-20"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="glass hover:bg-white/90"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </motion.div>
        )}

        {/* Gallery Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full glass hover:bg-white/90 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full glass hover:bg-white/90 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Image Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    index === currentImageIndex
                      ? 'w-6 bg-white'
                      : 'bg-white/50 hover:bg-white/75'
                  )}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* View Gallery Button */}
        {gallery.length > 1 && onGalleryOpen && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onGalleryOpen}
            className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg glass hover:bg-white/90 text-sm font-medium"
          >
            <ImageIcon className="w-4 h-4" />
            View all {gallery.length} photos
          </motion.button>
        )}

        {/* Hero Content */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="hero-content"
        >
          <div className="max-w-4xl">
            {/* Trust Badges */}
            <motion.div variants={staggerItem} className="flex flex-wrap gap-2 mb-4">
              {heroSettings.showRating && ratingSummary && ratingSummary.review_count > 0 && (
                <Badge variant="secondary" className="glass text-white border-white/20">
                  <Star className="w-3.5 h-3.5 mr-1 fill-yellow-400 text-yellow-400" />
                  {ratingSummary.average_rating.toFixed(1)} ({ratingSummary.review_count} reviews)
                </Badge>
              )}

              {heroSettings.showBookingCount && recentBookingsCount > 0 && (
                <Badge variant="secondary" className="glass text-white border-white/20">
                  <Zap className="w-3.5 h-3.5 mr-1 text-yellow-400" />
                  {recentBookingsCount} booked today
                </Badge>
              )}

            </motion.div>

            {/* Title */}
            <motion.h1
              variants={staggerItem}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            >
              {attraction.name}
            </motion.h1>

            {/* Meta Info */}
            <motion.div
              variants={staggerItem}
              className="flex flex-wrap items-center gap-4 text-white/90 mb-6"
            >
              {attraction.venue && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {attraction.venue}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {attraction.duration_minutes} minutes
              </span>
              <span className="flex items-center gap-2 font-semibold text-white">
                From {formatPrice(attraction.base_price, attraction.currency || 'USD')}
              </span>
            </motion.div>

            {/* Mobile CTA */}
            <motion.div variants={staggerItem} className="lg:hidden">
              <Button
                size="lg"
                onClick={onBookNow}
                className="w-full sm:w-auto text-lg font-semibold shadow-floating hover:scale-105 transition-transform"
              >
                <Calendar className="w-5 h-5 mr-2" />
                {heroSettings.ctaText || 'Book Now'}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Floating Booking Card (Desktop) */}
        {showFloatingCard && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="hero-floating-card"
          >
            <div className="space-y-4">
              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {formatPrice(attraction.base_price, attraction.currency || 'USD')}
                </span>
                <span className="text-muted-foreground">per person</span>
              </div>

              {/* Rating */}
              {ratingSummary && ratingSummary.review_count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 font-semibold text-foreground">{ratingSummary.average_rating.toFixed(1)}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ({ratingSummary.review_count} reviews)
                  </span>
                </div>
              )}

              {/* Quick Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {attraction.duration_minutes} min
                </span>
                {attraction.max_party_size && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Up to {attraction.max_party_size}
                  </span>
                )}
              </div>

              {/* Divider */}
              <hr className="border-border" />

              {/* CTA Button */}
              <Button
                size="lg"
                onClick={onBookNow}
                className="w-full text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                <Calendar className="w-5 h-5 mr-2" />
                {heroSettings.ctaText || 'Check Availability'}
              </Button>

              {/* Trust Signals */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-green-500" />
                  Free cancellation
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-blue-500" />
                  Instant confirm
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Description Section (Below Hero) */}
      {attraction.description && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card py-8 px-6 md:px-12"
        >
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              About this experience
            </h2>
            <div
              className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: attraction.description }}
            />
          </div>
        </motion.div>
      )}
    </section>
  );
};

export default HeroSection;
