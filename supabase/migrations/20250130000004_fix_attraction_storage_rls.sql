-- Fix storage RLS policies for event-logos bucket
-- Allow authenticated users to upload to their organization's folder
CREATE POLICY "Users can upload logos for their attractions" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-logos' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(storage.objects.name))[1] = 'attractions' AND
  EXISTS (
    SELECT 1 FROM attractions a
    JOIN organizations o ON a.organization_id = o.id
    WHERE a.id::text = (storage.foldername(storage.objects.name))[2]
    AND o.user_id = auth.uid()
  )
);

-- Allow users to view logos for attractions they can see
CREATE POLICY "Users can view attraction logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'event-logos' AND 
  (storage.foldername(storage.objects.name))[1] = 'attractions'
);

-- Allow users to update logos for their attractions
CREATE POLICY "Users can update logos for their attractions" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-logos' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(storage.objects.name))[1] = 'attractions' AND
  EXISTS (
    SELECT 1 FROM attractions a
    JOIN organizations o ON a.organization_id = o.id
    WHERE a.id::text = (storage.foldername(storage.objects.name))[2]
    AND o.user_id = auth.uid()
  )
);

-- Allow users to delete logos for their attractions
CREATE POLICY "Users can delete logos for their attractions" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-logos' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(storage.objects.name))[1] = 'attractions' AND
  EXISTS (
    SELECT 1 FROM attractions a
    JOIN organizations o ON a.organization_id = o.id
    WHERE a.id::text = (storage.foldername(storage.objects.name))[2]
    AND o.user_id = auth.uid()
  )
);

-- Ensure attractions table has proper UPDATE policy
-- This should already exist but let's make sure it's correct
DROP POLICY IF EXISTS "Users can manage attractions for their organizations" ON attractions;
CREATE POLICY "Users can manage attractions for their organizations" 
ON attractions FOR ALL 
USING (organization_id IN (
  SELECT id FROM public.organizations WHERE user_id = auth.uid()
));

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
