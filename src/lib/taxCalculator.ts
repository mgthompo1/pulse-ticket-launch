/**
 * Tax Calculation Service for TicketFlo
 *
 * Handles GST (NZ, AU), VAT (UK, EU), Sales Tax (US), and HST/PST/QST (Canada)
 * Supports both tax-inclusive and tax-exclusive pricing models
 */

export interface TaxConfig {
  enabled: boolean;
  name: string;           // 'GST', 'VAT', 'Sales Tax', etc.
  rate: number;           // 15.00 for 15%
  inclusive: boolean;     // true = price includes tax, false = add at checkout
  country: string;        // 'NZ', 'AU', 'US', 'CA', 'GB', etc.
  region?: string;        // State/Province (for US/Canada)
  registrationNumber?: string;
}

export interface TaxableAmount {
  tickets: number;
  addons: number;
  donations: number;
  bookingFee: number;
}

export interface TaxBreakdown {
  subtotal: number;           // Pre-tax amount
  taxOnTickets: number;
  taxOnAddons: number;
  taxOnDonations: number;
  taxOnFees: number;
  totalTax: number;
  bookingFee: number;         // Pre-tax fee
  bookingFeeTax: number;      // Tax on fee
  grandTotal: number;         // Everything included
  displayAmounts: {           // For UI display
    ticketAmount: number;     // What to show for ticket price
    addonAmount: number;
    donationAmount: number;
    feeAmount: number;
  };
}

export class TaxCalculator {
  private config: TaxConfig;

  constructor(config: TaxConfig) {
    this.config = config;
  }

  /**
   * Calculate tax breakdown for an order
   */
  calculate(amounts: TaxableAmount): TaxBreakdown {
    if (!this.config.enabled || this.config.rate === 0) {
      return this.noTaxBreakdown(amounts);
    }

    if (this.config.inclusive) {
      return this.calculateInclusive(amounts);
    } else {
      return this.calculateExclusive(amounts);
    }
  }

  /**
   * No tax scenario
   */
  private noTaxBreakdown(amounts: TaxableAmount): TaxBreakdown {
    const subtotal = amounts.tickets + amounts.addons + amounts.donations;
    return {
      subtotal,
      taxOnTickets: 0,
      taxOnAddons: 0,
      taxOnDonations: 0,
      taxOnFees: 0,
      totalTax: 0,
      bookingFee: amounts.bookingFee,
      bookingFeeTax: 0,
      grandTotal: subtotal + amounts.bookingFee,
      displayAmounts: {
        ticketAmount: amounts.tickets,
        addonAmount: amounts.addons,
        donationAmount: amounts.donations,
        feeAmount: amounts.bookingFee,
      },
    };
  }

  /**
   * Tax-inclusive calculation (NZ, AU, UK, EU)
   * Prices shown to customers already include tax
   * We need to extract the tax component
   */
  private calculateInclusive(amounts: TaxableAmount): TaxBreakdown {
    const taxMultiplier = this.config.rate / 100;
    const divisor = 1 + taxMultiplier;

    // Extract tax from inclusive prices
    const ticketSubtotal = amounts.tickets / divisor;
    const addonSubtotal = amounts.addons / divisor;
    const donationSubtotal = amounts.donations / divisor;
    const feeSubtotal = amounts.bookingFee / divisor;

    const taxOnTickets = amounts.tickets - ticketSubtotal;
    const taxOnAddons = amounts.addons - addonSubtotal;
    const taxOnDonations = amounts.donations - donationSubtotal;
    const bookingFeeTax = amounts.bookingFee - feeSubtotal;

    const subtotal = ticketSubtotal + addonSubtotal + donationSubtotal;
    const totalTax = taxOnTickets + taxOnAddons + taxOnDonations + bookingFeeTax;

    return {
      subtotal: this.round(subtotal),
      taxOnTickets: this.round(taxOnTickets),
      taxOnAddons: this.round(taxOnAddons),
      taxOnDonations: this.round(taxOnDonations),
      taxOnFees: this.round(bookingFeeTax),
      totalTax: this.round(totalTax),
      bookingFee: this.round(feeSubtotal),
      bookingFeeTax: this.round(bookingFeeTax),
      grandTotal: this.round(amounts.tickets + amounts.addons + amounts.donations + amounts.bookingFee),
      displayAmounts: {
        ticketAmount: this.round(amounts.tickets),
        addonAmount: this.round(amounts.addons),
        donationAmount: this.round(amounts.donations),
        feeAmount: this.round(amounts.bookingFee),
      },
    };
  }

  /**
   * Tax-exclusive calculation (US, Canada)
   * Prices shown are before tax, tax is added at checkout
   */
  private calculateExclusive(amounts: TaxableAmount): TaxBreakdown {
    const taxMultiplier = this.config.rate / 100;

    const ticketSubtotal = amounts.tickets;
    const addonSubtotal = amounts.addons;
    const donationSubtotal = amounts.donations;
    const feeSubtotal = amounts.bookingFee;

    const taxOnTickets = ticketSubtotal * taxMultiplier;
    const taxOnAddons = addonSubtotal * taxMultiplier;
    const taxOnDonations = donationSubtotal * taxMultiplier;
    const bookingFeeTax = feeSubtotal * taxMultiplier;

    const subtotal = ticketSubtotal + addonSubtotal + donationSubtotal;
    const totalTax = taxOnTickets + taxOnAddons + taxOnDonations + bookingFeeTax;
    const grandTotal = subtotal + totalTax + feeSubtotal + bookingFeeTax;

    return {
      subtotal: this.round(subtotal),
      taxOnTickets: this.round(taxOnTickets),
      taxOnAddons: this.round(taxOnAddons),
      taxOnDonations: this.round(taxOnDonations),
      taxOnFees: this.round(bookingFeeTax),
      totalTax: this.round(totalTax),
      bookingFee: this.round(feeSubtotal),
      bookingFeeTax: this.round(bookingFeeTax),
      grandTotal: this.round(grandTotal),
      displayAmounts: {
        ticketAmount: this.round(ticketSubtotal),
        addonAmount: this.round(addonSubtotal),
        donationAmount: this.round(donationSubtotal),
        feeAmount: this.round(feeSubtotal),
      },
    };
  }

  /**
   * Round to 2 decimal places
   */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Format tax label for display
   * Examples: "GST (15%)", "VAT (20%)", "Sales Tax (8.5%)"
   */
  getTaxLabel(): string {
    return `${this.config.name} (${this.config.rate}%)`;
  }

  /**
   * Get inclusive/exclusive suffix for UI
   */
  getTaxSuffix(): string {
    return this.config.inclusive ? 'inc. tax' : '';
  }
}

/**
 * Helper to create TaxCalculator from organization data
 */
export function createTaxCalculator(organization: any): TaxCalculator {
  const config: TaxConfig = {
    enabled: organization.tax_enabled || false,
    name: organization.tax_name || 'Tax',
    rate: parseFloat(organization.tax_rate || '0'),
    inclusive: organization.tax_inclusive || false,
    country: organization.tax_country || '',
    region: organization.tax_region,
    registrationNumber: organization.tax_number,
  };

  return new TaxCalculator(config);
}

/**
 * Tax presets for quick setup
 */
export const TAX_PRESETS = {
  NZ: { name: 'GST', rate: 15.0, inclusive: true, country: 'NZ' },
  AU: { name: 'GST', rate: 10.0, inclusive: true, country: 'AU' },
  GB: { name: 'VAT', rate: 20.0, inclusive: true, country: 'GB' },
  US: { name: 'Sales Tax', rate: 0.0, inclusive: false, country: 'US' },
  CA: { name: 'GST', rate: 5.0, inclusive: false, country: 'CA' },
};
