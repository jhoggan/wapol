-- Committee onboarding: extend candidates, add political_groups, polymorphic committees.
-- Verified against live public schema (candidates, committees, RLS policies, filing trigger).

-- -----------------------------------------------------------------------------
-- political_groups
-- -----------------------------------------------------------------------------

CREATE TABLE public.political_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  leader_first_name text,
  leader_last_name text,
  mission_statement text,
  group_type text NOT NULL,
  legal_name text NOT NULL,
  mailing_address text,
  regulatory_state text,
  regulatory_id text,
  website text,
  social_media jsonb,
  contact_phone text,
  contact_email text,
  election_year integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT political_groups_group_type_check CHECK (
    group_type IN ('PAC', 'Super PAC', 'Ballot Committee', '527', 'LLC')
  )
);

CREATE INDEX idx_political_groups_user_id ON public.political_groups (user_id);

-- -----------------------------------------------------------------------------
-- candidates: new columns + relax NOT NULL where needed
-- -----------------------------------------------------------------------------

ALTER TABLE public.candidates
  ADD COLUMN first_name text,
  ADD COLUMN last_name text,
  ADD COLUMN office_name text,
  ADD COLUMN campaign_level text,
  ADD COLUMN judicial_election boolean NOT NULL DEFAULT false,
  ADD COLUMN general_election_date date,
  ADD COLUMN primary_election_date date,
  ADD COLUMN special_election boolean NOT NULL DEFAULT false,
  ADD COLUMN currently_holding_office boolean NOT NULL DEFAULT false,
  ADD COLUMN public_finance_program boolean NOT NULL DEFAULT false,
  ADD COLUMN committee_legal_name text,
  ADD COLUMN committee_mailing_address text,
  ADD COLUMN website text,
  ADD COLUMN contact_phone text,
  ADD COLUMN contact_email text,
  ADD COLUMN regulatory_state text;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_campaign_level_check CHECK (
    campaign_level IS NULL
    OR campaign_level IN ('federal', 'state', 'county', 'municipal')
  );

ALTER TABLE public.candidates
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN race_type DROP NOT NULL,
  ALTER COLUMN office_sought DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- committees: entity type, optional candidate, political group link, treasurer rule
-- -----------------------------------------------------------------------------

ALTER TABLE public.committees
  ADD COLUMN entity_type text NOT NULL DEFAULT 'candidate',
  ADD COLUMN political_group_id uuid REFERENCES public.political_groups (id) ON DELETE CASCADE;

ALTER TABLE public.committees
  ADD CONSTRAINT committees_entity_type_check CHECK (
    entity_type IN ('candidate', 'political_group', 'c3', 'c4')
  );

UPDATE public.committees
SET entity_type = 'candidate'
WHERE candidate_id IS NOT NULL;

ALTER TABLE public.committees
  ALTER COLUMN candidate_id DROP NOT NULL;

ALTER TABLE public.committees
  ALTER COLUMN treasurer_name DROP NOT NULL;

ALTER TABLE public.committees
  ADD CONSTRAINT committees_entity_link_check CHECK (
    (entity_type = 'candidate' AND candidate_id IS NOT NULL AND political_group_id IS NULL)
    OR (
      entity_type = 'political_group'
      AND political_group_id IS NOT NULL
      AND candidate_id IS NULL
    )
    OR (entity_type IN ('c3', 'c4'))
  );

ALTER TABLE public.committees
  ADD CONSTRAINT committees_treasurer_when_candidate CHECK (
    entity_type <> 'candidate' OR treasurer_name IS NOT NULL
  );

CREATE INDEX idx_committees_political_group_id ON public.committees (political_group_id);

-- -----------------------------------------------------------------------------
-- Trigger: default filing jurisdiction only when tied to a candidate
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.committees_default_filing_jurisdiction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rt public.race_type;
BEGIN
  IF NEW.candidate_id IS NOT NULL AND NEW.filing_jurisdiction_type IS NULL THEN
    SELECT c.race_type INTO STRICT rt
    FROM public.candidates AS c
    WHERE c.id = NEW.candidate_id;

    NEW.filing_jurisdiction_type := CASE rt
      WHEN 'state_house' THEN 'lieutenant_governor'::public.jurisdiction_type
      WHEN 'state_senate' THEN 'lieutenant_governor'::public.jurisdiction_type
      WHEN 'state_school_board' THEN 'lieutenant_governor'::public.jurisdiction_type
      WHEN 'state_constitutional' THEN 'lieutenant_governor'::public.jurisdiction_type
      WHEN 'county' THEN 'county'::public.jurisdiction_type
      WHEN 'county_school_board' THEN 'county'::public.jurisdiction_type
      WHEN 'municipal' THEN 'municipal'::public.jurisdiction_type
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- RLS: political_groups + updated committees policy
-- -----------------------------------------------------------------------------

ALTER TABLE public.political_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own political groups"
ON public.political_groups
FOR ALL
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users can manage their own committees" ON public.committees;

CREATE POLICY "users can manage their own committees"
ON public.committees
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.candidates AS c
    WHERE c.id = committees.candidate_id
      AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.political_groups AS pg
    WHERE pg.id = committees.political_group_id
      AND pg.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.candidates AS c
    WHERE c.id = committees.candidate_id
      AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.political_groups AS pg
    WHERE pg.id = committees.political_group_id
      AND pg.user_id = auth.uid()
  )
);
