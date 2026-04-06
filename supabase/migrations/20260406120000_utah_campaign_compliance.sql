-- Utah campaign compliance schema
-- Run in the Supabase SQL editor or via the Supabase CLI.
-- Not idempotent: drop objects first if you need to re-run.
-- PostgreSQL < 14: replace EXECUTE FUNCTION with EXECUTE PROCEDURE on the trigger.

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.race_type AS ENUM (
  'state_house',
  'state_senate',
  'state_school_board',
  'state_constitutional',
  'county',
  'county_school_board',
  'municipal'
);

CREATE TYPE public.jurisdiction_type AS ENUM (
  'lieutenant_governor',
  'county',
  'municipal'
);

-- -----------------------------------------------------------------------------
-- candidates
-- -----------------------------------------------------------------------------

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  office_sought text NOT NULL,
  race_type public.race_type NOT NULL,
  party text,
  election_year integer NOT NULL,
  committee_name text,
  utopia_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidates_user_id ON public.candidates (user_id);

CREATE INDEX idx_candidates_election_year ON public.candidates (election_year);

CREATE INDEX idx_candidates_race_type ON public.candidates (race_type);

-- -----------------------------------------------------------------------------
-- committees
-- filing_jurisdiction_type is nullable in the column definition so inserts can
-- omit it; the trigger below fills it from the candidate's race_type. The CHECK
-- constraint ensures it is always stored before the row is written. Omitting
-- the column (or passing NULL) yields the default mapping; supplying a value
-- keeps your manual override.
-- -----------------------------------------------------------------------------

CREATE TABLE public.committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
  treasurer_name text NOT NULL,
  mailing_address text NOT NULL,
  filing_jurisdiction_type public.jurisdiction_type,
  filing_jurisdiction_name text NOT NULL,
  filing_status text NOT NULL,
  contribution_limit numeric(14, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT committees_filing_jurisdiction_required CHECK (
    filing_jurisdiction_type IS NOT NULL
  )
);

CREATE INDEX idx_committees_candidate_id ON public.committees (candidate_id);

CREATE OR REPLACE FUNCTION public.committees_default_filing_jurisdiction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rt public.race_type;
BEGIN
  IF NEW.filing_jurisdiction_type IS NULL THEN
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

CREATE TRIGGER committees_default_filing_jurisdiction
BEFORE INSERT OR UPDATE OF candidate_id, filing_jurisdiction_type ON public.committees
FOR EACH ROW
EXECUTE FUNCTION public.committees_default_filing_jurisdiction();

-- -----------------------------------------------------------------------------
-- contributions
-- -----------------------------------------------------------------------------

CREATE TABLE public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees (id) ON DELETE CASCADE,
  donor_full_name text NOT NULL,
  amount numeric(14, 2) NOT NULL,
  date date NOT NULL,
  payment_method text NOT NULL,
  employer text,
  occupation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contributions_committee_id ON public.contributions (committee_id);

CREATE INDEX idx_contributions_date ON public.contributions (date);

-- -----------------------------------------------------------------------------
-- expenditures
-- -----------------------------------------------------------------------------

CREATE TABLE public.expenditures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees (id) ON DELETE CASCADE,
  payee_name text NOT NULL,
  amount numeric(14, 2) NOT NULL,
  date date NOT NULL,
  purpose text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenditures_committee_id ON public.expenditures (committee_id);

CREATE INDEX idx_expenditures_date ON public.expenditures (date);

-- -----------------------------------------------------------------------------
-- filing_deadlines
-- -----------------------------------------------------------------------------

CREATE TABLE public.filing_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees (id) ON DELETE CASCADE,
  deadline_name text NOT NULL,
  filing_period_start date NOT NULL,
  filing_period_end date NOT NULL,
  due_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT filing_deadlines_period_order CHECK (
    filing_period_start <= filing_period_end
  )
);

CREATE INDEX idx_filing_deadlines_committee_id ON public.filing_deadlines (committee_id);

CREATE INDEX idx_filing_deadlines_due_date ON public.filing_deadlines (due_date);
