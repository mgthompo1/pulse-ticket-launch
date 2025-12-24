/**
 * useReviewsV3 - Reviews and ratings fetching
 * Fetches published reviews with summary statistics
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AttractionReview } from '@/types/attraction-v3';

interface UseReviewsV3Props {
  attractionId: string;
  limit?: number;
  enabled?: boolean;
}

interface ReviewsSummary {
  averageRating: number;
  totalCount: number;
  breakdown: { stars: number; count: number }[];
  recentCount: number; // Last 30 days
}

interface UseReviewsV3Return {
  reviews: AttractionReview[];
  featuredReviews: AttractionReview[];
  summary: ReviewsSummary | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useReviewsV3({
  attractionId,
  limit = 10,
  enabled = true,
}: UseReviewsV3Props): UseReviewsV3Return {
  // Fetch reviews
  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    error: reviewsError,
    refetch,
  } = useQuery({
    queryKey: ['reviews-v3', attractionId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_reviews')
        .select('*')
        .eq('attraction_id', attractionId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as AttractionReview[];
    },
    enabled: enabled && !!attractionId,
  });

  // Fetch summary from materialized view
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
  } = useQuery({
    queryKey: ['reviews-summary-v3', attractionId],
    queryFn: async () => {
      // Try to fetch from materialized view first
      const { data, error } = await supabase
        .from('attraction_rating_summary')
        .select('*')
        .eq('attraction_id', attractionId)
        .single();

      if (error) {
        // If materialized view doesn't exist, calculate manually
        return calculateSummary(attractionId);
      }

      return {
        averageRating: data.average_rating || 0,
        totalCount: data.total_reviews || 0,
        breakdown: [],
        recentCount: data.recent_reviews || 0,
      };
    },
    enabled: enabled && !!attractionId,
  });

  // Calculate breakdown from reviews
  const summary = useMemo<ReviewsSummary | null>(() => {
    if (!reviewsData) return summaryData || null;

    const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviewsData.filter((r) => r.rating === stars).length,
    }));

    if (summaryData) {
      return {
        ...summaryData,
        breakdown,
      };
    }

    // Calculate from reviews if no summary data
    const totalRating = reviewsData.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviewsData.length > 0 ? totalRating / reviewsData.length : 0;

    // Count recent reviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = reviewsData.filter(
      (r) => new Date(r.created_at) >= thirtyDaysAgo
    ).length;

    return {
      averageRating,
      totalCount: reviewsData.length,
      breakdown,
      recentCount,
    };
  }, [reviewsData, summaryData]);

  // Featured reviews
  const featuredReviews = useMemo(() => {
    if (!reviewsData) return [];
    return reviewsData.filter((r) => r.is_featured);
  }, [reviewsData]);

  return {
    reviews: reviewsData || [],
    featuredReviews,
    summary,
    isLoading: isLoadingReviews || isLoadingSummary,
    error: reviewsError as Error | null,
    refetch,
  };
}

// Helper to calculate summary manually
async function calculateSummary(attractionId: string): Promise<ReviewsSummary> {
  const { data, error } = await supabase
    .from('attraction_reviews')
    .select('rating, created_at')
    .eq('attraction_id', attractionId)
    .eq('is_published', true);

  if (error || !data || data.length === 0) {
    return {
      averageRating: 0,
      totalCount: 0,
      breakdown: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
      recentCount: 0,
    };
  }

  const totalRating = data.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalRating / data.length;

  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: data.filter((r) => r.rating === stars).length,
  }));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCount = data.filter(
    (r) => new Date(r.created_at) >= thirtyDaysAgo
  ).length;

  return {
    averageRating,
    totalCount: data.length,
    breakdown,
    recentCount,
  };
}

export default useReviewsV3;
