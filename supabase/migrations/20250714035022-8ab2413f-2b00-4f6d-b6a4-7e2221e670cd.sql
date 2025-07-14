-- Create storage bucket for event logos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-logos', 'event-logos', true);

-- Create storage policies for event logos
CREATE POLICY "Event logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-logos');

CREATE POLICY "Users can upload event logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-logos' 
  AND auth.uid() IN (
    SELECT o.user_id 
    FROM organizations o 
    JOIN events e ON e.organization_id = o.id 
    WHERE e.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Users can update their event logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-logos' 
  AND auth.uid() IN (
    SELECT o.user_id 
    FROM organizations o 
    JOIN events e ON e.organization_id = o.id 
    WHERE e.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Users can delete their event logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-logos' 
  AND auth.uid() IN (
    SELECT o.user_id 
    FROM organizations o 
    JOIN events e ON e.organization_id = o.id 
    WHERE e.id::text = (storage.foldername(objects.name))[1]
  )
);

-- Add logo_url column to events table
ALTER TABLE public.events 
ADD COLUMN logo_url text;