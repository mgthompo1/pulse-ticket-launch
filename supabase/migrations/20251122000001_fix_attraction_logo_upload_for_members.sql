-- Fix attraction logo upload to work for organization members, not just owners
-- Previous policy only checked o.user_id = auth.uid() (owner only)
-- New policy checks organization_users table (includes all members)

-- Drop old policies
DROP POLICY IF EXISTS "Users can upload logos for their attractions" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos for their attractions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos for their attractions" ON storage.objects;

-- Allow organization members to upload logos for their attractions
CREATE POLICY "Users can upload logos for their attractions" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(storage.objects.name))[1] = 'attractions' AND
  EXISTS (
    SELECT 1 FROM attractions a
    JOIN organization_users ou ON a.organization_id = ou.organization_id
    WHERE a.id::text = (storage.foldername(storage.objects.name))[2]
    AND ou.user_id = auth.uid()
  )
);

-- Allow organization members to update logos for their attractions
CREATE POLICY "Users can update logos for their attractions" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(storage.objects.name))[1] = 'attractions' AND
  EXISTS (
    SELECT 1 FROM attractions a
    JOIN organization_users ou ON a.organization_id = ou.organization_id
    WHERE a.id::text = (storage.foldername(storage.objects.name))[2]
    AND ou.user_id = auth.uid()
  )
);

-- Allow organization members to delete logos for their attractions
CREATE POLICY "Users can delete logos for their attractions" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-logos' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(storage.objects.name))[1] = 'attractions' AND
  EXISTS (
    SELECT 1 FROM attractions a
    JOIN organization_users ou ON a.organization_id = ou.organization_id
    WHERE a.id::text = (storage.foldername(storage.objects.name))[2]
    AND ou.user_id = auth.uid()
  )
);
