-- Create storage policies for organization logos

-- Allow users to upload organization logos (using org-logos/ path)
CREATE POLICY "Users can upload organization logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'event-logos' 
  AND auth.uid() IN (
    SELECT o.user_id 
    FROM organizations o 
    WHERE objects.name LIKE ('org-logos/' || o.id::text || '%')
  )
);

-- Allow users to update their organization logos
CREATE POLICY "Users can update organization logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'event-logos' 
  AND auth.uid() IN (
    SELECT o.user_id 
    FROM organizations o 
    WHERE objects.name LIKE ('org-logos/' || o.id::text || '%')
  )
);

-- Allow users to delete their organization logos
CREATE POLICY "Users can delete organization logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'event-logos' 
  AND auth.uid() IN (
    SELECT o.user_id 
    FROM organizations o 
    WHERE objects.name LIKE ('org-logos/' || o.id::text || '%')
  )
);