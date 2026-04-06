-- Waitlist, profiles, notification preferences, federal candidate fields.
-- Verified against live schema (MCP): candidates has no waitlist/profiles; campaign_level check already includes 'federal'.

-- -----------------------------------------------------------------------------
-- waitlist (public insert for anon + authenticated; no client SELECT)
-- -----------------------------------------------------------------------------

CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  state text NOT NULL,
  entity_type text,
  party text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_insert_anon"
ON public.waitlist
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "waitlist_insert_authenticated"
ON public.waitlist
FOR INSERT
TO authenticated
WITH CHECK (true);

GRANT INSERT ON TABLE public.waitlist TO anon;
GRANT INSERT ON TABLE public.waitlist TO authenticated;

-- -----------------------------------------------------------------------------
-- candidates: federal office fields
-- -----------------------------------------------------------------------------

ALTER TABLE public.candidates
  ADD COLUMN federal_office text,
  ADD COLUMN federal_state text;

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO public
USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO public
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- notification_preferences (one row per user)
-- -----------------------------------------------------------------------------

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  filing_deadline_reminders boolean NOT NULL DEFAULT true,
  contribution_limit_alerts boolean NOT NULL DEFAULT true,
  product_updates boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select_own"
ON public.notification_preferences
FOR SELECT
TO public
USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_own"
ON public.notification_preferences
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_own"
ON public.notification_preferences
FOR UPDATE
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER notification_preferences_set_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_preferences TO authenticated;
