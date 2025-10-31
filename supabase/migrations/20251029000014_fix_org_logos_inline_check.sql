-- Fix org logo storage policies by inlining the membership check
-- Drop the existing policies and recreate with inline logic

DROP POLICY IF EXISTS "Organization members can upload org logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update org logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can delete org logos" ON storage.objects;

-- Allow organization owners AND members to upload org logos
CREATE POLICY "Organization members can upload org logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-logos'
  AND (storage.foldername(storage.objects.name))[1] = 'org-logos'
  AND auth.role() = 'authenticated'
  AND (
    -- Extract org ID from filename like "{uuid}-logo.png"
    -- Check if user is owner OR member of that organization
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id::text = split_part((storage.filename(storage.objects.name)), '-logo', 1)
      AND (
        -- Owner check
        o.user_id = auth.uid()
        OR
        -- Member check (inline without function to avoid issues)
        EXISTS (
          SELECT 1
          FROM public.organization_users ou
          WHERE ou.organization_id = o.id
          AND ou.user_id = auth.uid()
        )
      )
    )
  )
);

-- Allow organization owners AND members to update org logos
CREATE POLICY "Organization members can update org logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-logos'
  AND (storage.foldername(storage.objects.name))[1] = 'org-logos'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id::text = split_part((storage.filename(storage.objects.name)), '-logo', 1)
      AND (
        o.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1
          FROM public.organization_users ou
          WHERE ou.organization_id = o.id
          AND ou.user_id = auth.uid()
        )
      )
    )
  )
);

-- Allow organization owners AND members to delete org logos
CREATE POLICY "Organization members can delete org logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-logos'
  AND (storage.foldername(storage.objects.name))[1] = 'org-logos'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id::text = split_part((storage.filename(storage.objects.name)), '-logo', 1)
      AND (
        o.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1
          FROM public.organization_users ou
          WHERE ou.organization_id = o.id
          AND ou.user_id = auth.uid()
        )
      )
    )
  )
);

COMMENT ON POLICY "Organization members can upload org logos" ON storage.objects IS
'Allows organization owners and members to upload logos to org-logos/ folder (inline membership check)';

COMMENT ON POLICY "Organization members can update org logos" ON storage.objects IS
'Allows organization owners and members to update logos in org-logos/ folder (inline membership check)';

COMMENT ON POLICY "Organization members can delete org logos" ON storage.objects IS
'Allows organization owners and members to delete logos from org-logos/ folder (inline membership check)';
