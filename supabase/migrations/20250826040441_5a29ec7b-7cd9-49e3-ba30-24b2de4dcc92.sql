-- Create storage bucket for social media images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-media-images', 'social-media-images', true);

-- Create RLS policies for social media images bucket
CREATE POLICY "Users can upload their own social media images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'social-media-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own social media images" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'social-media-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own social media images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'social-media-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own social media images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'social-media-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public images can be viewed by anyone (for sharing)
CREATE POLICY "Public social media images are viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'social-media-images');