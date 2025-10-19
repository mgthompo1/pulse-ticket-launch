import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PromoCodeValidationResult {
  valid: boolean;
  promo_code_id: string | null;
  discount_amount: number;
  error_message: string | null;
}

interface UsePromoCodeAndDiscountsProps {
  eventId: string;
  customerEmail: string;
  ticketCount: number;
  subtotal: number;
}

export const usePromoCodeAndDiscounts = ({
  eventId,
  customerEmail,
  ticketCount,
  subtotal,
}: UsePromoCodeAndDiscountsProps) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeId, setPromoCodeId] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const [groupDiscount, setGroupDiscount] = useState(0);
  const [groupDiscountTier, setGroupDiscountTier] = useState<number | null>(null);

  // Calculate group discount automatically whenever ticket count or subtotal changes
  useEffect(() => {
    const fetchGroupDiscount = async () => {
      if (ticketCount < 2 || subtotal <= 0) {
        setGroupDiscount(0);
        setGroupDiscountTier(null);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('calculate_group_discount', {
          p_event_id: eventId,
          p_ticket_count: ticketCount,
          p_subtotal: subtotal,
        });

        if (error) {
          console.error('Error calculating group discount:', error);
          return;
        }

        if (data) {
          setGroupDiscount(data);
          if (data > 0) {
            // Fetch the tier that was applied for display
            const { data: tiers } = await supabase
              .from('group_discount_tiers')
              .select('min_quantity')
              .eq('event_id', eventId)
              .eq('active', true)
              .lte('min_quantity', ticketCount)
              .order('min_quantity', { ascending: false })
              .limit(1);

            if (tiers && tiers.length > 0) {
              setGroupDiscountTier(tiers[0].min_quantity);
            }
          } else {
            setGroupDiscountTier(null);
          }
        }
      } catch (error) {
        console.error('Error fetching group discount:', error);
      }
    };

    fetchGroupDiscount();
  }, [eventId, ticketCount, subtotal]);

  // Validate promo code
  const validatePromoCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setPromoError(null);
      setPromoDiscount(0);
      setPromoCodeId(null);
      return;
    }

    setIsValidating(true);
    setPromoError(null);

    try {
      const params = {
        p_code: code.toUpperCase().trim(),
        p_event_id: eventId,
        p_customer_email: customerEmail || '',
        p_ticket_count: ticketCount,
        p_subtotal: Number(subtotal),
      };

      console.log('🎟️ Validating promo code with params:', params);

      const { data, error } = await supabase.rpc('validate_promo_code', params);

      if (error) {
        console.error('❌ Error validating promo code:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setPromoError(error.message || 'Failed to validate promo code');
        setPromoDiscount(0);
        setPromoCodeId(null);
        return;
      }

      const result = data[0] as PromoCodeValidationResult;

      if (!result.valid) {
        setPromoError(result.error_message || 'Invalid promo code');
        setPromoDiscount(0);
        setPromoCodeId(null);
      } else {
        setPromoError(null);
        setPromoDiscount(result.discount_amount);
        setPromoCodeId(result.promo_code_id);
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoError('Failed to validate promo code');
      setPromoDiscount(0);
      setPromoCodeId(null);
    } finally {
      setIsValidating(false);
    }
  }, [eventId, customerEmail, ticketCount, subtotal]);

  // Clear promo code
  const clearPromoCode = () => {
    setPromoCode('');
    setPromoCodeId(null);
    setPromoDiscount(0);
    setPromoError(null);
  };

  // Apply promo code
  const applyPromoCode = async () => {
    await validatePromoCode(promoCode);
  };

  // Calculate total discount (promo + group, but not both if promo is better)
  const getTotalDiscount = () => {
    // If promo code is applied, use whichever is better: promo or group discount
    if (promoDiscount > 0) {
      return Math.max(promoDiscount, groupDiscount);
    }
    // Otherwise just return group discount
    return groupDiscount;
  };

  // Get discount breakdown for display
  const getDiscountBreakdown = () => {
    const breakdown: { type: string; amount: number; description: string }[] = [];

    if (promoDiscount > 0 && promoDiscount >= groupDiscount) {
      breakdown.push({
        type: 'promo',
        amount: promoDiscount,
        description: `Promo code: ${promoCode}`,
      });
    } else if (groupDiscount > 0) {
      breakdown.push({
        type: 'group',
        amount: groupDiscount,
        description: `Group discount (${groupDiscountTier}+ tickets)`,
      });
    }

    return breakdown;
  };

  // Calculate final total
  const calculateFinalTotal = (baseTotal: number) => {
    return Math.max(0, baseTotal - getTotalDiscount());
  };

  return {
    // Promo code state
    promoCode,
    setPromoCode,
    promoCodeId,
    promoDiscount,
    promoError,
    isValidating,

    // Group discount state
    groupDiscount,
    groupDiscountTier,

    // Actions
    applyPromoCode,
    clearPromoCode,
    validatePromoCode,

    // Helpers
    getTotalDiscount,
    getDiscountBreakdown,
    calculateFinalTotal,
  };
};
