-- Prevent removing the last owner from an organization

CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- Count remaining owners for the organization after this delete
  SELECT COUNT(*) INTO owner_count
  FROM public.organization_users
  WHERE organization_id = OLD.organization_id AND role = 'owner' AND user_id <> OLD.user_id;

  IF owner_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last owner of this organization';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_removal ON public.organization_users;
CREATE TRIGGER trg_prevent_last_owner_removal
  BEFORE DELETE ON public.organization_users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_owner_removal();


