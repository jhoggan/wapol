-- Candidate onboarding: special election fields, left-leaning flag, drop duplicate mailing on candidates.
-- Verified against live public.candidates (MCP / information_schema).

ALTER TABLE public.candidates
  ADD COLUMN special_election_date date,
  ADD COLUMN special_election_type text,
  ADD COLUMN identifies_left_leaning boolean;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_special_election_type_check CHECK (
    special_election_type IS NULL
    OR special_election_type IN ('primary', 'general', 'runoff')
  );

ALTER TABLE public.candidates
  DROP COLUMN committee_mailing_address;
