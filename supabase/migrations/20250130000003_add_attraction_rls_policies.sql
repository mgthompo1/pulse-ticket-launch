-- Enable RLS on attractions tables
ALTER TABLE attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attraction_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE attraction_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attractions
CREATE POLICY "Published attractions are publicly viewable" 
ON attractions FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can manage attractions for their organizations" 
ON attractions FOR ALL 
USING (organization_id IN (
  SELECT id FROM public.organizations WHERE user_id = auth.uid()
));

-- RLS Policies for attraction_resources
CREATE POLICY "Resources are publicly viewable for active attractions" 
ON attraction_resources FOR SELECT 
USING (attraction_id IN (
  SELECT id FROM attractions WHERE status = 'active'
));

CREATE POLICY "Users can manage resources for their attractions" 
ON attraction_resources FOR ALL 
USING (attraction_id IN (
  SELECT a.id FROM attractions a 
  JOIN public.organizations o ON a.organization_id = o.id 
  WHERE o.user_id = auth.uid()
));

-- RLS Policies for booking_slots
CREATE POLICY "Available slots are publicly viewable" 
ON booking_slots FOR SELECT 
USING (status = 'available' AND attraction_id IN (
  SELECT id FROM attractions WHERE status = 'active'
));

CREATE POLICY "Users can manage slots for their attractions" 
ON booking_slots FOR ALL 
USING (attraction_id IN (
  SELECT a.id FROM attractions a 
  JOIN public.organizations o ON a.organization_id = o.id 
  WHERE o.user_id = auth.uid()
));

-- RLS Policies for attraction_bookings
CREATE POLICY "Anyone can create attraction bookings" 
ON attraction_bookings FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view bookings for their attractions" 
ON attraction_bookings FOR SELECT 
USING (attraction_id IN (
  SELECT a.id FROM attractions a 
  JOIN public.organizations o ON a.organization_id = o.id 
  WHERE o.user_id = auth.uid()
));

CREATE POLICY "Users can update bookings for their attractions" 
ON attraction_bookings FOR UPDATE 
USING (attraction_id IN (
  SELECT a.id FROM attractions a 
  JOIN public.organizations o ON a.organization_id = o.id 
  WHERE o.user_id = auth.uid()
));

-- Allow customers to view their own bookings by email
CREATE POLICY "Customers can view their own bookings" 
ON attraction_bookings FOR SELECT 
USING (customer_email = auth.jwt() ->> 'email');

-- Allow customers to update their own bookings
CREATE POLICY "Customers can update their own bookings" 
ON attraction_bookings FOR UPDATE 
USING (customer_email = auth.jwt() ->> 'email');
