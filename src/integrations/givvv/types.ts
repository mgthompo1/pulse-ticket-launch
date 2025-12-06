// Givvv types for integration with TicketFlo

export interface GivvvOrganization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  created_at: string;
}

export interface GivvvWidget {
  id: string;
  organization_id: string;
  theme_color: string;
  preset_amounts: number[];
  allow_custom_amount: boolean;
  designations: string[];
}

export interface GivvvDonor {
  id: string;
  organization_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface GivvvDonation {
  id: string;
  organization_id: string;
  donor_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  recurring: boolean;
  recurring_interval: 'weekly' | 'monthly' | null;
  designation: string | null;
  created_at: string;
}
