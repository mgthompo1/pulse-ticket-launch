-- Add storage policy for organization logo uploads in org-logos/ folder
-- This allows organization members to upload logos to org-logos/{org_id}-logo.{ext}

-- Allow organization members to upload their org logos
CREATE POLICY "Organization members can upload org logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-logos'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND auth.role() = 'authenticated'
  AND (
    -- Extract org ID from filename like "org-logos/uuid-logo.png"
    -- The UUID part before "-logo" should match an org they belong to
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id::text = split_part((storage.filename(name)), '-logo', 1)
      AND (
        o.user_id = auth.uid()
        OR public.user_is_org_member(o.id, auth.uid())
      )
    )
  )
);

-- Allow organization members to update their org logos
CREATE POLICY "Organization members can update org logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-logos'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id::text = split_part((storage.filename(name)), '-logo', 1)
      AND (
        o.user_id = auth.uid()
        OR public.user_is_org_member(o.id, auth.uid())
      )
    )
  )
);

-- Allow organization members to delete their org logos
CREATE POLICY "Organization members can delete org logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-logos'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id::text = split_part((storage.filename(name)), '-logo', 1)
      AND (
        o.user_id = auth.uid()
        OR public.user_is_org_member(o.id, auth.uid())
      )
    )
  )
);

COMMENT ON POLICY "Organization members can upload org logos" ON storage.objects IS
'Allows organization owners and members to upload logos to org-logos/ folder';

COMMENT ON POLICY "Organization members can update org logos" ON storage.objects IS
'Allows organization owners and members to update logos in org-logos/ folder';

COMMENT ON POLICY "Organization members can delete org logos" ON storage.objects IS
'Allows organization owners and members to delete logos from org-logos/ folder';
