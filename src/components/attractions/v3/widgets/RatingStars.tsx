/**
 * RatingStars - Star rating display component
 * Shows filled, half, and empty stars with optional count
 */

import React from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  className?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = false,
  showCount = false,
  count,
  className,
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.25 && rating % 1 < 0.75;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0) - (rating % 1 >= 0.75 ? 1 : 0);
  const extraFullStar = rating % 1 >= 0.75;

  const starClass = sizeClasses[size];
  const textClass = textSizeClasses[size];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Full Stars */}
      {Array.from({ length: fullStars + (extraFullStar ? 1 : 0) }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className={cn(starClass, 'fill-yellow-400 text-yellow-400')}
        />
      ))}

      {/* Half Star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className={cn(starClass, 'text-gray-200')} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={cn(starClass, 'fill-yellow-400 text-yellow-400')} />
          </div>
        </div>
      )}

      {/* Empty Stars */}
      {Array.from({ length: Math.max(0, emptyStars) }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className={cn(starClass, 'text-gray-200')}
        />
      ))}

      {/* Rating Value */}
      {showValue && (
        <span className={cn('font-semibold text-gray-900 ml-1', textClass)}>
          {rating.toFixed(1)}
        </span>
      )}

      {/* Count */}
      {showCount && count !== undefined && (
        <span className={cn('text-gray-500 ml-1', textClass)}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
};

// Interactive rating input
interface RatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const RatingInput: React.FC<RatingInputProps> = ({
  value,
  onChange,
  size = 'md',
  disabled = false,
  className,
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  const starClass = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = displayValue >= starValue;

        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(starValue)}
            onMouseEnter={() => !disabled && setHoverValue(starValue)}
            className={cn(
              'transition-transform',
              !disabled && 'hover:scale-110 cursor-pointer'
            )}
          >
            <Star
              className={cn(
                starClass,
                'transition-colors',
                isFilled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-300'
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

// Compact inline rating
export const InlineRating: React.FC<{
  rating: number;
  count?: number;
  className?: string;
}> = ({ rating, count, className }) => {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      <span className="font-medium text-gray-900">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-gray-500 text-sm">({count})</span>
      )}
    </div>
  );
};

export default RatingStars;
