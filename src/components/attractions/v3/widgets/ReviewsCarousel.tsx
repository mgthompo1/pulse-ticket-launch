/**
 * ReviewsCarousel - Social proof reviews display
 * Shows customer reviews in carousel or grid format
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Quote,
  CheckCircle,
  ThumbsUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttractionReview } from '@/types/attraction-v3';
import { staggerContainer, staggerItem, slideInFromBottom } from '@/lib/animations';
import { RatingStars } from './RatingStars';

interface ReviewsCarouselProps {
  reviews: AttractionReview[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  variant?: 'carousel' | 'grid' | 'compact' | 'featured';
  maxDisplay?: number;
  className?: string;
}

export const ReviewsCarousel: React.FC<ReviewsCarouselProps> = ({
  reviews,
  autoPlay = true,
  autoPlayInterval = 5000,
  variant = 'carousel',
  maxDisplay = 3,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const publishedReviews = reviews.filter((r) => r.is_published !== false);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || publishedReviews.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % publishedReviews.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, publishedReviews.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % publishedReviews.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + publishedReviews.length) % publishedReviews.length);
  };

  if (publishedReviews.length === 0) {
    return null;
  }

  // Featured single review
  if (variant === 'featured') {
    const featuredReview = publishedReviews.find((r) => r.is_featured) || publishedReviews[0];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('relative p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10', className)}
      >
        <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {featuredReview.customer_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{featuredReview.customer_name}</span>
              {featuredReview.is_verified && (
                <CheckCircle className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <RatingStars rating={featuredReview.rating} size="sm" />
          </div>
        </div>

        {featuredReview.review_text && (
          <p className="text-gray-700 leading-relaxed">"{featuredReview.review_text}"</p>
        )}
      </motion.div>
    );
  }

  // Compact inline reviews
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-3', className)}>
        {publishedReviews.slice(0, maxDisplay).map((review) => (
          <div
            key={review.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-gray-600">
                {review.customer_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{review.customer_name}</span>
                <RatingStars rating={review.rating} size="xs" />
              </div>
              {review.review_text && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {review.review_text}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid view
  if (variant === 'grid') {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}
      >
        {publishedReviews.slice(0, maxDisplay).map((review) => (
          <motion.div
            key={review.id}
            variants={staggerItem}
            className="p-4 rounded-xl border border-gray-200 bg-white"
          >
            <ReviewCard review={review} />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // Carousel view (default)
  const currentReview = publishedReviews[currentIndex];

  return (
    <div className={cn('relative', className)}>
      {/* Navigation Arrows */}
      {publishedReviews.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Review Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm"
        >
          <ReviewCard review={currentReview} showFull />
        </motion.div>
      </AnimatePresence>

      {/* Dots Indicator */}
      {publishedReviews.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {publishedReviews.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentIndex ? 'bg-primary' : 'bg-gray-300'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual review card
const ReviewCard: React.FC<{
  review: AttractionReview;
  showFull?: boolean;
}> = ({ review, showFull = false }) => {
  const formattedDate = new Date(review.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="font-semibold text-primary">
              {review.customer_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{review.customer_name}</span>
              {review.is_verified && (
                <span className="inline-flex items-center gap-0.5 text-xs text-blue-600">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">{formattedDate}</span>
          </div>
        </div>
        <RatingStars rating={review.rating} size="sm" />
      </div>

      {/* Review Text */}
      {review.review_text && (
        <p className={cn(
          'text-gray-600',
          showFull ? 'text-base' : 'text-sm line-clamp-3'
        )}>
          {review.review_text}
        </p>
      )}
    </div>
  );
};

// Review summary stats
export const ReviewSummary: React.FC<{
  rating: number;
  count: number;
  breakdown?: { stars: number; count: number }[];
  className?: string;
}> = ({ rating, count, breakdown, className }) => {
  return (
    <div className={cn('flex items-start gap-6', className)}>
      {/* Overall Rating */}
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900">{rating.toFixed(1)}</div>
        <RatingStars rating={rating} size="sm" className="justify-center mt-1" />
        <p className="text-sm text-gray-500 mt-1">{count.toLocaleString()} reviews</p>
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="flex-1 space-y-1">
          {breakdown.map(({ stars, count: starCount }) => {
            const percentage = count > 0 ? (starCount / count) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-3">{stars}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8">{starCount}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Recent review notification
export const RecentReviewBadge: React.FC<{
  review: AttractionReview;
  className?: string;
}> = ({ review, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-white shadow-lg border border-gray-100',
        className
      )}
    >
      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {review.customer_name} left a {review.rating}-star review
        </p>
        {review.review_text && (
          <p className="text-xs text-gray-500 truncate">"{review.review_text}"</p>
        )}
      </div>
    </motion.div>
  );
};

export default ReviewsCarousel;
