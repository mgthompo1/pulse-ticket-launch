import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaxCalculator, createTaxCalculator, TaxBreakdown, TaxableAmount } from '@/lib/taxCalculator';

interface UseTaxCalculationProps {
  organizationId?: string;
  eventId?: string;
  ticketAmount: number;
  addonAmount: number;
  donationAmount: number;
  bookingFeePercent?: number;
  enabled?: boolean;
}

export function useTaxCalculation({
  organizationId,
  eventId,
  ticketAmount,
  addonAmount,
  donationAmount,
  bookingFeePercent = 0,
  enabled = true,
}: UseTaxCalculationProps) {
  const [loading, setLoading] = useState(true);
  const [taxCalculator, setTaxCalculator] = useState<TaxCalculator | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load organization tax settings
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const loadTaxSettings = async () => {
      try {
        let orgId = organizationId;

        // If we only have eventId, get the organization ID from the event
        if (!orgId && eventId) {
          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('organization_id')
            .eq('id', eventId)
            .single();

          if (eventError) throw eventError;
          orgId = eventData.organization_id;
        }

        if (!orgId) {
          throw new Error('No organization ID provided');
        }

        // Load organization tax settings
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('tax_enabled, tax_name, tax_rate, tax_inclusive, tax_number, tax_country, tax_region')
          .eq('id', orgId)
          .single();

        if (orgError) throw orgError;

        const calculator = createTaxCalculator(orgData);
        setTaxCalculator(calculator);
      } catch (err) {
        console.error('Error loading tax settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tax settings');
      } finally {
        setLoading(false);
      }
    };

    loadTaxSettings();
  }, [organizationId, eventId, enabled]);

  // Calculate tax breakdown
  const taxBreakdown = useMemo<TaxBreakdown | null>(() => {
    if (!taxCalculator || loading) return null;

    const subtotal = ticketAmount + addonAmount + donationAmount;
    const bookingFee = subtotal * (bookingFeePercent / 100);

    const amounts: TaxableAmount = {
      tickets: ticketAmount,
      addons: addonAmount,
      donations: donationAmount,
      bookingFee,
    };

    return taxCalculator.calculate(amounts);
  }, [taxCalculator, ticketAmount, addonAmount, donationAmount, bookingFeePercent, loading]);

  return {
    loading,
    error,
    taxBreakdown,
    taxCalculator,
    taxEnabled: taxCalculator?.config?.enabled ?? false,
    taxName: taxCalculator?.config?.name ?? 'Tax',
    taxRate: taxCalculator?.config?.rate ?? 0,
    taxInclusive: taxCalculator?.config?.inclusive ?? false,
  };
}

/**
 * Format tax breakdown for order storage
 */
export function formatTaxForOrder(taxBreakdown: TaxBreakdown | null, taxCalculator: TaxCalculator | null) {
  if (!taxBreakdown || !taxCalculator) {
    return {
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      tax_name: null,
      tax_inclusive: false,
      tax_on_tickets: 0,
      tax_on_addons: 0,
      tax_on_donations: 0,
      tax_on_fees: 0,
      booking_fee: 0,
      booking_fee_tax: 0,
    };
  }

  return {
    subtotal: taxBreakdown.subtotal,
    tax_rate: taxCalculator.config.rate,
    tax_amount: taxBreakdown.totalTax,
    tax_name: taxCalculator.config.name,
    tax_inclusive: taxCalculator.config.inclusive,
    tax_on_tickets: taxBreakdown.taxOnTickets,
    tax_on_addons: taxBreakdown.taxOnAddons,
    tax_on_donations: taxBreakdown.taxOnDonations,
    tax_on_fees: taxBreakdown.taxOnFees,
    booking_fee: taxBreakdown.bookingFee,
    booking_fee_tax: taxBreakdown.bookingFeeTax,
  };
}
