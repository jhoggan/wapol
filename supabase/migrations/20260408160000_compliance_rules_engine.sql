-- Compliance rules engine: jurisdiction rulesets, deadline templates, reference data,
-- committee/candidate/filing_deadlines extensions, change requests, alerts, notifications, admin_users.
-- Verified against live public schema (MCP list_tables, Apr 2026).

-- -----------------------------------------------------------------------------
-- jurisdiction_rulesets
-- -----------------------------------------------------------------------------

CREATE TABLE public.jurisdiction_rulesets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,
  jurisdiction_type public.jurisdiction_type NOT NULL,
  jurisdiction_name text,
  election_year integer NOT NULL,
  entity_scope text NOT NULL DEFAULT 'candidate',
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  approved_by uuid REFERENCES auth.users (id),
  approved_at timestamptz,
  ai_generated boolean NOT NULL DEFAULT false,
  ai_generation_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jurisdiction_rulesets_entity_scope_check CHECK (
    entity_scope = ANY (ARRAY['candidate'::text, 'political_group'::text])
  ),
  CONSTRAINT jurisdiction_rulesets_status_check CHECK (
    status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])
  )
);

CREATE UNIQUE INDEX jurisdiction_rulesets_one_active_per_scope
  ON public.jurisdiction_rulesets (
    state,
    jurisdiction_type,
    (COALESCE(jurisdiction_name, ''::text)),
    election_year,
    entity_scope
  )
  WHERE status = 'active'::text;

CREATE INDEX idx_jurisdiction_rulesets_lookup
  ON public.jurisdiction_rulesets (state, jurisdiction_type, election_year, entity_scope, status);

-- -----------------------------------------------------------------------------
-- district_county_map (reference — no RLS)
-- -----------------------------------------------------------------------------

CREATE TABLE public.district_county_map (
  race_type text NOT NULL,
  district_number integer NOT NULL,
  state text NOT NULL DEFAULT 'Utah',
  county_scope text NOT NULL,
  counties text[] NOT NULL,
  CONSTRAINT district_county_map_pkey PRIMARY KEY (race_type, district_number, state),
  CONSTRAINT district_county_map_county_scope_check CHECK (
    county_scope = ANY (ARRAY['single_county'::text, 'multi_county'::text])
  )
);

-- -----------------------------------------------------------------------------
-- convention_dates (reference — no RLS)
-- -----------------------------------------------------------------------------

CREATE TABLE public.convention_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party text NOT NULL,
  state text NOT NULL DEFAULT 'Utah',
  election_year integer NOT NULL,
  convention_date date NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'statewide',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT convention_dates_party_state_year_jurisdiction_key UNIQUE (party, state, election_year, jurisdiction)
);

-- -----------------------------------------------------------------------------
-- deadline_templates
-- -----------------------------------------------------------------------------

CREATE TABLE public.deadline_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_id uuid NOT NULL REFERENCES public.jurisdiction_rulesets (id) ON DELETE CASCADE,
  race_types text[],
  party_affiliation text,
  report_name text NOT NULL,
  rule_type text NOT NULL,
  fixed_date date,
  days_offset integer,
  reference_election_type text,
  filing_period_start_rule text,
  filing_period_end_rule text,
  deadline_time text NOT NULL DEFAULT '23:59',
  fine_amount numeric(10, 2),
  disqualification_risk boolean NOT NULL DEFAULT false,
  grace_period_hours integer,
  applies_to_officeholders boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deadline_templates_rule_type_check CHECK (
    rule_type = ANY (
      ARRAY[
        'fixed_date'::text,
        'relative_to_election'::text,
        'relative_to_convention'::text,
        'relative_to_period_end'::text
      ]
    )
  ),
  CONSTRAINT deadline_templates_reference_election_type_check CHECK (
    reference_election_type IS NULL
    OR reference_election_type = ANY (
      ARRAY['primary'::text, 'general'::text, 'convention'::text]
    )
  )
);

CREATE INDEX idx_deadline_templates_ruleset ON public.deadline_templates (ruleset_id, sort_order);

-- -----------------------------------------------------------------------------
-- committees: ruleset_id
-- -----------------------------------------------------------------------------

ALTER TABLE public.committees
  ADD COLUMN IF NOT EXISTS ruleset_id uuid REFERENCES public.jurisdiction_rulesets (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_committees_ruleset_id ON public.committees (ruleset_id);

-- -----------------------------------------------------------------------------
-- candidates: convention + district fields
-- -----------------------------------------------------------------------------

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS convention_date_override date,
  ADD COLUMN IF NOT EXISTS convention_date_source text,
  ADD COLUMN IF NOT EXISTS district_county_scope text,
  ADD COLUMN IF NOT EXISTS district_number integer;

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_convention_date_source_check;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_convention_date_source_check CHECK (
    convention_date_source IS NULL
    OR convention_date_source = ANY (ARRAY['default'::text, 'override'::text])
  );

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_district_county_scope_check;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_district_county_scope_check CHECK (
    district_county_scope IS NULL
    OR district_county_scope = ANY (
      ARRAY['single_county'::text, 'multi_county'::text, 'statewide'::text]
    )
  );

-- -----------------------------------------------------------------------------
-- filing_deadlines: template + compliance fields
-- -----------------------------------------------------------------------------

ALTER TABLE public.filing_deadlines
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.deadline_templates (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ruleset_id uuid REFERENCES public.jurisdiction_rulesets (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rule_type text,
  ADD COLUMN IF NOT EXISTS fine_amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS disqualification_risk boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_period_hours integer,
  ADD COLUMN IF NOT EXISTS deadline_time text NOT NULL DEFAULT '23:59',
  ADD COLUMN IF NOT EXISTS alert_sent_7_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_sent_3_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_sent_day_of boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS filing_deadlines_committee_template_unique
  ON public.filing_deadlines (committee_id, template_id)
  WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_filing_deadlines_due_alert
  ON public.filing_deadlines (committee_id, due_date)
  WHERE completed = false;

-- -----------------------------------------------------------------------------
-- ruleset_change_requests
-- -----------------------------------------------------------------------------

CREATE TABLE public.ruleset_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_id uuid REFERENCES public.jurisdiction_rulesets (id) ON DELETE SET NULL,
  change_type text NOT NULL,
  proposed_changes jsonb NOT NULL,
  source text NOT NULL,
  source_url text,
  source_description text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users (id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ruleset_change_requests_change_type_check CHECK (
    change_type = ANY (
      ARRAY[
        'new_ruleset'::text,
        'update_template'::text,
        'add_template'::text,
        'remove_template'::text,
        'update_ruleset_metadata'::text
      ]
    )
  ),
  CONSTRAINT ruleset_change_requests_source_check CHECK (
    source = ANY (ARRAY['ai_agent'::text, 'manual'::text])
  ),
  CONSTRAINT ruleset_change_requests_status_check CHECK (
    status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])
  )
);

CREATE INDEX idx_ruleset_change_requests_created ON public.ruleset_change_requests (created_at DESC);
CREATE INDEX idx_ruleset_change_requests_status ON public.ruleset_change_requests (status);

-- -----------------------------------------------------------------------------
-- contribution_alerts
-- -----------------------------------------------------------------------------

CREATE TABLE public.contribution_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid REFERENCES public.contributions (id) ON DELETE CASCADE,
  committee_id uuid NOT NULL REFERENCES public.committees (id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  due_date date NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contribution_alerts_alert_type_check CHECK (
    alert_type = ANY (
      ARRAY[
        '31_day_warning'::text,
        '31_day_final'::text,
        '7_day_window_open'::text
      ]
    )
  )
);

CREATE INDEX idx_contribution_alerts_committee ON public.contribution_alerts (committee_id);
CREATE INDEX idx_contribution_alerts_contribution ON public.contribution_alerts (contribution_id);
CREATE INDEX idx_contributions_committee_date_active
  ON public.contributions (committee_id, date)
  WHERE refunded = false;

-- -----------------------------------------------------------------------------
-- notifications (in-app)
-- -----------------------------------------------------------------------------

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  committee_id uuid REFERENCES public.committees (id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (
    notification_type = ANY (
      ARRAY[
        'deadline_7_day'::text,
        'deadline_3_day'::text,
        'deadline_day_of'::text,
        'contribution_31_day_warning'::text,
        'contribution_31_day_final'::text,
        '7_day_window_open'::text,
        'ruleset_updated'::text
      ]
    )
  )
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id) WHERE read = false;

-- -----------------------------------------------------------------------------
-- admin_users (service role / app gate — no RLS, restricted grants)
-- -----------------------------------------------------------------------------

CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Used by RLS policies (authenticated users cannot SELECT admin_users directly).
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO service_role;

-- -----------------------------------------------------------------------------
-- updated_at on jurisdiction_rulesets
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_jurisdiction_rulesets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER jurisdiction_rulesets_updated_at
BEFORE UPDATE ON public.jurisdiction_rulesets
FOR EACH ROW
EXECUTE FUNCTION public.set_jurisdiction_rulesets_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.jurisdiction_rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruleset_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Rulesets: any authenticated user may read; only admins may write
CREATE POLICY "jurisdiction_rulesets_select_authenticated"
ON public.jurisdiction_rulesets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "jurisdiction_rulesets_admin_all"
ON public.jurisdiction_rulesets
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Templates: read for authenticated; write admin only
CREATE POLICY "deadline_templates_select_authenticated"
ON public.deadline_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "deadline_templates_admin_all"
ON public.deadline_templates
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Change requests: admin only
CREATE POLICY "ruleset_change_requests_admin_all"
ON public.ruleset_change_requests
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Contribution alerts: committee owners
CREATE POLICY "contribution_alerts_select_own_committees"
ON public.contribution_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.committees AS com
    WHERE com.id = contribution_alerts.committee_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.candidates AS c
          WHERE c.id = com.candidate_id
            AND c.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.political_groups AS pg
          WHERE pg.id = com.political_group_id
            AND pg.user_id = auth.uid()
        )
      )
  )
);

-- Notifications: own rows only
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Grants: reference tables (read all authenticated)
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.district_county_map TO authenticated;
GRANT SELECT ON public.convention_dates TO authenticated;

GRANT SELECT ON public.jurisdiction_rulesets TO authenticated;
GRANT SELECT ON public.deadline_templates TO authenticated;

GRANT SELECT ON public.contribution_alerts TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurisdiction_rulesets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadline_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruleset_change_requests TO authenticated;

-- admin_users: only service_role (app checks admin via is_admin_user() RPC)
REVOKE ALL ON public.admin_users FROM PUBLIC;
REVOKE ALL ON public.admin_users FROM anon;
REVOKE ALL ON public.admin_users FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.admin_users TO service_role;

-- Service role for background jobs
GRANT INSERT, UPDATE, DELETE ON public.notifications TO service_role;
GRANT ALL ON public.contribution_alerts TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.filing_deadlines TO service_role;
GRANT UPDATE ON public.committees TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.convention_dates TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.ruleset_change_requests TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.jurisdiction_rulesets TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.deadline_templates TO service_role;

-- -----------------------------------------------------------------------------
-- SEED: Utah LG 2026 active ruleset
-- -----------------------------------------------------------------------------

INSERT INTO public.jurisdiction_rulesets
  (name, state, jurisdiction_type, jurisdiction_name, election_year, entity_scope, status, notes)
VALUES
  (
    'Utah Lieutenant Governor 2026',
    'Utah',
    'lieutenant_governor'::public.jurisdiction_type,
    NULL,
    2026,
    'candidate',
    'active',
    'Utah state-level candidate compliance rules for 2026 election cycle per UCA 20A-11'
  );

-- -----------------------------------------------------------------------------
-- SEED: deadline_templates (Utah LG 2026)
-- -----------------------------------------------------------------------------

INSERT INTO public.deadline_templates
  (
    ruleset_id,
    race_types,
    party_affiliation,
    report_name,
    rule_type,
    fixed_date,
    days_offset,
    reference_election_type,
    filing_period_start_rule,
    filing_period_end_rule,
    fine_amount,
    disqualification_risk,
    grace_period_hours,
    sort_order,
    notes
  )
SELECT
  r.id,
  t.race_types,
  t.party_affiliation,
  t.report_name,
  t.rule_type,
  t.fixed_date,
  t.days_offset,
  t.reference_election_type,
  t.filing_period_start_rule,
  t.filing_period_end_rule,
  t.fine_amount,
  t.disqualification_risk,
  t.grace_period_hours,
  t.sort_order,
  t.notes
FROM public.jurisdiction_rulesets AS r
CROSS JOIN (
  VALUES
    (
      ARRAY['state_house', 'state_senate']::text[],
      NULL::text,
      'Convention Report'::text,
      'relative_to_convention'::text,
      NULL::date,
      -7::integer,
      'convention'::text,
      'fixed:2026-01-01'::text,
      'days_before_convention:-5'::text,
      100.00::numeric,
      false,
      NULL::integer,
      1::integer,
      'Partisan legislative candidates — 7 days before party convention'::text
    ),
    (
      ARRAY['state_house', 'state_senate']::text[],
      'Unaffiliated',
      'Unaffiliated Report',
      'fixed_date',
      '2026-03-28'::date,
      NULL,
      NULL,
      'fixed:2026-01-01',
      'fixed:2026-03-23',
      100.00,
      false,
      NULL,
      2,
      'Unaffiliated legislative candidates only — March 28 deadline'
    ),
    (
      ARRAY['state_school_board']::text[],
      NULL,
      'May 15th Report',
      'fixed_date',
      '2026-05-15'::date,
      NULL,
      NULL,
      'fixed:2026-01-01',
      'fixed:2026-05-10',
      100.00,
      false,
      NULL,
      3,
      'State Board of Education candidates only'
    ),
    (
      ARRAY['state_house', 'state_senate', 'state_school_board', 'state_constitutional']::text[],
      NULL,
      'Primary Report',
      'fixed_date',
      '2026-06-16'::date,
      NULL,
      'primary',
      'day_after_convention',
      'fixed:2026-06-11',
      100.00,
      true,
      24,
      4,
      '$100 fine + disqualification risk — 24hr grace period'
    ),
    (
      ARRAY['state_house', 'state_senate', 'state_school_board', 'state_constitutional']::text[],
      NULL,
      'September 30th Report',
      'fixed_date',
      '2026-09-30'::date,
      NULL,
      NULL,
      'fixed:2026-06-12',
      'fixed:2026-09-25',
      100.00,
      true,
      24,
      5,
      '$100 fine + disqualification risk — 24hr grace period'
    ),
    (
      ARRAY['state_house', 'state_senate', 'state_school_board', 'state_constitutional']::text[],
      NULL,
      'General Report',
      'fixed_date',
      '2026-10-27'::date,
      NULL,
      'general',
      'fixed:2026-09-26',
      'fixed:2026-10-22',
      100.00,
      true,
      24,
      6,
      '$100 fine + disqualification risk — 24hr grace period'
    ),
    (
      ARRAY['state_house', 'state_senate', 'state_school_board', 'state_constitutional']::text[],
      NULL,
      'Year-End Report',
      'fixed_date',
      '2027-01-10'::date,
      NULL,
      NULL,
      'fixed:2026-10-23',
      'fixed:2026-12-31',
      100.00,
      false,
      NULL,
      7,
      'All state candidates — due January 10 2027'
    )
) AS t (
  race_types,
  party_affiliation,
  report_name,
  rule_type,
  fixed_date,
  days_offset,
  reference_election_type,
  filing_period_start_rule,
  filing_period_end_rule,
  fine_amount,
  disqualification_risk,
  grace_period_hours,
  sort_order,
  notes
)
WHERE r.name = 'Utah Lieutenant Governor 2026';

-- -----------------------------------------------------------------------------
-- SEED: placeholder draft rulesets (counties)
-- -----------------------------------------------------------------------------

INSERT INTO public.jurisdiction_rulesets
  (name, state, jurisdiction_type, jurisdiction_name, election_year, entity_scope, status, notes)
VALUES
  ('Utah Weber County 2026', 'Utah', 'county'::public.jurisdiction_type, 'Weber County', 2026, 'candidate', 'draft', 'Placeholder — rules TBD'),
  ('Utah Salt Lake County 2026', 'Utah', 'county'::public.jurisdiction_type, 'Salt Lake County', 2026, 'candidate', 'draft', 'Placeholder — rules TBD'),
  ('Utah Davis County 2026', 'Utah', 'county'::public.jurisdiction_type, 'Davis County', 2026, 'candidate', 'draft', 'Placeholder — rules TBD'),
  ('Utah Utah County 2026', 'Utah', 'county'::public.jurisdiction_type, 'Utah County', 2026, 'candidate', 'draft', 'Placeholder — rules TBD'),
  ('Utah Washington County 2026', 'Utah', 'county'::public.jurisdiction_type, 'Washington County', 2026, 'candidate', 'draft', 'Placeholder — rules TBD'),
  ('Utah Cache County 2026', 'Utah', 'county'::public.jurisdiction_type, 'Cache County', 2026, 'candidate', 'draft', 'Placeholder — rules TBD'),
  ('Utah Box Elder County 2026', 'Utah', 'county'::public.jurisdiction_type, 'Box Elder County', 2026, 'candidate', 'draft', 'Placeholder — rules TBD'),
  ('Utah Iron County 2026', 'Utah', 'county'::public.jurisdiction_type, 'Iron County', 2026, 'candidate', 'draft', 'Placeholder — rules TBD');

-- -----------------------------------------------------------------------------
-- SEED: district_county_map
-- -----------------------------------------------------------------------------

INSERT INTO public.district_county_map (race_type, district_number, state, county_scope, counties) VALUES
('state_house', 1, 'Utah', 'multi_county', ARRAY['Box Elder', 'Cache']),
('state_house', 2, 'Utah', 'single_county', ARRAY['Cache']),
('state_house', 3, 'Utah', 'single_county', ARRAY['Cache']),
('state_house', 4, 'Utah', 'multi_county', ARRAY['Rich', 'Morgan', 'Summit']),
('state_house', 5, 'Utah', 'single_county', ARRAY['Cache']),
('state_house', 6, 'Utah', 'multi_county', ARRAY['Box Elder', 'Weber']),
('state_house', 7, 'Utah', 'single_county', ARRAY['Weber']),
('state_house', 8, 'Utah', 'multi_county', ARRAY['Morgan', 'Weber']),
('state_house', 9, 'Utah', 'single_county', ARRAY['Weber']),
('state_house', 10, 'Utah', 'single_county', ARRAY['Weber']),
('state_house', 11, 'Utah', 'multi_county', ARRAY['Davis', 'Weber']),
('state_house', 12, 'Utah', 'multi_county', ARRAY['Davis', 'Weber']),
('state_house', 13, 'Utah', 'single_county', ARRAY['Davis']),
('state_house', 14, 'Utah', 'single_county', ARRAY['Davis']),
('state_house', 15, 'Utah', 'single_county', ARRAY['Davis']),
('state_house', 16, 'Utah', 'single_county', ARRAY['Davis']),
('state_house', 17, 'Utah', 'single_county', ARRAY['Davis']),
('state_house', 18, 'Utah', 'single_county', ARRAY['Davis']),
('state_house', 19, 'Utah', 'single_county', ARRAY['Davis']),
('state_house', 20, 'Utah', 'single_county', ARRAY['Davis']),
('state_house', 21, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 22, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 23, 'Utah', 'multi_county', ARRAY['Salt Lake', 'Summit']),
('state_house', 24, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 25, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 26, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 27, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 28, 'Utah', 'single_county', ARRAY['Tooele']),
('state_house', 29, 'Utah', 'multi_county', ARRAY['Millard', 'Juab', 'Tooele']),
('state_house', 30, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 31, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 32, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 33, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 34, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 35, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 36, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 37, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 38, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 39, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 40, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 41, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 42, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 43, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 44, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 45, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 46, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 47, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 48, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 49, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_house', 50, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 51, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 52, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 53, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 54, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 55, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 56, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 57, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 58, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 59, 'Utah', 'multi_county', ARRAY['Wasatch', 'Summit']),
('state_house', 60, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 61, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 62, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 63, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 64, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 65, 'Utah', 'single_county', ARRAY['Utah']),
('state_house', 66, 'Utah', 'multi_county', ARRAY['Sanpete', 'Juab', 'Utah']),
('state_house', 67, 'Utah', 'multi_county', ARRAY['Carbon', 'Duchesne', 'Emery']),
('state_house', 68, 'Utah', 'multi_county', ARRAY['Daggett', 'Uintah', 'Duchesne', 'Summit']),
('state_house', 69, 'Utah', 'multi_county', ARRAY['Garfield', 'Grand', 'Kane', 'San Juan', 'Wayne', 'Emery']),
('state_house', 70, 'Utah', 'multi_county', ARRAY['Beaver', 'Piute', 'Sevier', 'Iron']),
('state_house', 71, 'Utah', 'single_county', ARRAY['Iron']),
('state_house', 72, 'Utah', 'single_county', ARRAY['Washington']),
('state_house', 73, 'Utah', 'single_county', ARRAY['Washington']),
('state_house', 74, 'Utah', 'single_county', ARRAY['Washington']),
('state_house', 75, 'Utah', 'single_county', ARRAY['Washington']),
('state_senate', 1, 'Utah', 'multi_county', ARRAY['Box Elder', 'Cache', 'Tooele']),
('state_senate', 5, 'Utah', 'multi_county', ARRAY['Davis', 'Morgan', 'Weber']),
('state_senate', 6, 'Utah', 'single_county', ARRAY['Davis']),
('state_senate', 7, 'Utah', 'multi_county', ARRAY['Davis', 'Morgan']),
('state_senate', 9, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_senate', 11, 'Utah', 'multi_county', ARRAY['Salt Lake', 'Tooele', 'Utah']),
('state_senate', 12, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_senate', 13, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_senate', 14, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_senate', 18, 'Utah', 'multi_county', ARRAY['Salt Lake', 'Utah']),
('state_senate', 19, 'Utah', 'multi_county', ARRAY['Salt Lake', 'Utah']),
('state_senate', 20, 'Utah', 'multi_county', ARRAY['Daggett', 'Duchesne', 'Uintah', 'Summit', 'Wasatch']),
('state_senate', 21, 'Utah', 'single_county', ARRAY['Utah']),
('state_senate', 23, 'Utah', 'single_county', ARRAY['Utah']),
('state_senate', 28, 'Utah', 'multi_county', ARRAY['Beaver', 'Iron', 'Juab', 'Millard', 'Washington']),
('state_school_board', 1, 'Utah', 'multi_county', ARRAY['Box Elder', 'Cache', 'Morgan', 'Rich', 'Summit']),
('state_school_board', 2, 'Utah', 'single_county', ARRAY['Weber']),
('state_school_board', 4, 'Utah', 'multi_county', ARRAY['Davis', 'Salt Lake']),
('state_school_board', 5, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_school_board', 7, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_school_board', 8, 'Utah', 'single_county', ARRAY['Salt Lake']),
('state_school_board', 11, 'Utah', 'multi_county', ARRAY['Salt Lake', 'Utah']),
('state_school_board', 14, 'Utah', 'multi_county', ARRAY['Beaver', 'Carbon', 'Emery', 'Grand', 'Juab', 'Millard', 'Sanpete', 'Sevier', 'Iron', 'Utah']);

-- -----------------------------------------------------------------------------
-- SEED: convention_dates
-- -----------------------------------------------------------------------------

INSERT INTO public.convention_dates (party, state, election_year, convention_date, jurisdiction, notes) VALUES
('Democratic', 'Utah', 2026, '2026-04-25', 'statewide', 'Utah Democratic Party state convention — verify before use'),
('Republican', 'Utah', 2026, '2026-04-26', 'statewide', 'Utah Republican Party state convention — verify before use'),
('Democratic', 'Utah', 2026, '2026-04-25', 'Weber County', 'Default to statewide — update when Weber County Democrats publish date'),
('Republican', 'Utah', 2026, '2026-04-26', 'Weber County', 'Default to statewide — update when Weber County Republicans publish date');
