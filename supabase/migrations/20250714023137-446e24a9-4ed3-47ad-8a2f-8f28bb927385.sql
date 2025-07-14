-- Create content management table for landing page
CREATE TABLE public.landing_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  content_type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section, key)
);

-- Enable RLS
ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (for the landing page)
CREATE POLICY "Public can read landing page content" 
ON public.landing_page_content 
FOR SELECT 
USING (true);

-- Create policy for system updates (for the admin)
CREATE POLICY "System can update landing page content" 
ON public.landing_page_content 
FOR ALL 
USING (true);

-- Insert default content
INSERT INTO public.landing_page_content (section, key, value, description, content_type) VALUES
-- Hero Section
('hero', 'badge_text', '🎉 Trusted by 10,000+ event organizers worldwide', 'Top badge in hero section', 'text'),
('hero', 'main_headline', 'Beautiful Event Ticketing', 'Main headline first line', 'text'),
('hero', 'main_headline_accent', 'Made Simple', 'Main headline accent text', 'text'),
('hero', 'subheadline', 'Create stunning ticketing experiences, manage events effortlessly, and grow your audience with our all-in-one platform. No technical skills required.', 'Hero subheadline description', 'text'),
('hero', 'cta_primary', 'Sign Up Now', 'Primary call-to-action button text', 'text'),
('hero', 'cta_secondary', 'Watch Demo', 'Secondary call-to-action button text', 'text'),

-- Hero Stats
('hero_stats', 'rating_value', '4.9/5', 'User rating display', 'text'),
('hero_stats', 'rating_label', 'User Rating', 'Rating label', 'text'),
('hero_stats', 'organizers_value', '10K+', 'Number of organizers', 'text'),
('hero_stats', 'organizers_label', 'Organizers', 'Organizers label', 'text'),
('hero_stats', 'events_value', '50K+', 'Number of events created', 'text'),
('hero_stats', 'events_label', 'Events Created', 'Events label', 'text'),
('hero_stats', 'tickets_value', '$2M+', 'Value of tickets sold', 'text'),
('hero_stats', 'tickets_label', 'Tickets Sold', 'Tickets sold label', 'text'),

-- Features Section
('features', 'badge_text', '✨ Powerful Features', 'Features section badge', 'text'),
('features', 'title', 'Everything You Need to', 'Features section title first line', 'text'),
('features', 'title_accent', 'Sell More Tickets', 'Features section title accent', 'text'),
('features', 'description', 'From simple events to complex productions, our platform adapts to your needs with professional-grade tools and stunning design.', 'Features section description', 'text'),
('features', 'bottom_cta_text', 'Ready to transform your event ticketing experience?', 'Bottom CTA text in features', 'text'),
('features', 'bottom_badge_text', '💳 No setup fees • Free 14-day trial', 'Bottom badge text in features', 'text'),

-- Pricing Section
('pricing', 'badge_text', '💎 Simple Pricing', 'Pricing section badge', 'text'),
('pricing', 'title', 'Pay Only When You', 'Pricing section title first line', 'text'),
('pricing', 'title_accent', 'Sell Tickets', 'Pricing section title accent', 'text'),
('pricing', 'description', 'No monthly fees, no setup costs, no hidden charges. Just a simple platform fee when you make sales.', 'Pricing section description', 'text'),
('pricing', 'plan_name', 'Simple & Transparent', 'Pricing plan name', 'text'),
('pricing', 'plan_price', '1.00%', 'Pricing plan percentage', 'text'),
('pricing', 'plan_period', '+ $0.50 per ticket', 'Pricing plan period text', 'text'),
('pricing', 'plan_description', 'Pay only when you sell tickets - no monthly fees, no hidden costs', 'Pricing plan description', 'text'),
('pricing', 'plan_badge', 'All Features Included', 'Pricing plan badge', 'text'),
('pricing', 'plan_cta', 'Start Selling Tickets', 'Pricing plan CTA button', 'text'),

-- Pricing Bottom Section
('pricing_bottom', 'fee_breakdown_title', 'Complete Fee Breakdown', 'Fee breakdown section title', 'text'),
('pricing_bottom', 'platform_fee_label', 'Platform Fee', 'Platform fee label', 'text'),
('pricing_bottom', 'platform_fee_value', '1.00% + $0.50', 'Platform fee value', 'text'),
('pricing_bottom', 'platform_fee_desc', 'per ticket sold', 'Platform fee description', 'text'),
('pricing_bottom', 'processing_fee_label', 'Payment Processing', 'Processing fee label', 'text'),
('pricing_bottom', 'processing_fee_value', '2.9% + 30¢', 'Processing fee value', 'text'),
('pricing_bottom', 'processing_fee_desc', 'standard Stripe fees', 'Processing fee description', 'text'),
('pricing_bottom', 'example_text', 'Example: On a $20 ticket, total fees are $1.38 (6.9%) - you keep $18.62', 'Fee example text', 'text'),
('pricing_bottom', 'contact_text', 'Questions about fees or features?', 'Contact question text', 'text'),
('pricing_bottom', 'contact_link_text', 'Contact our support team', 'Contact link text', 'text');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_landing_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_landing_content_updated_at
    BEFORE UPDATE ON public.landing_page_content
    FOR EACH ROW
    EXECUTE FUNCTION public.update_landing_content_updated_at();