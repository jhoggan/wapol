-- ActBlue CSV API integration: committee credentials, contribution source/metadata,
-- sync audit log. Verified against live public.committees / public.contributions (MCP list_tables).

-- -----------------------------------------------------------------------------
-- committees: ActBlue API credentials (secret never exposed in logs/UI)
-- -----------------------------------------------------------------------------

ALTER TABLE public.committees
  ADD COLUMN IF NOT EXISTS actblue_client_uuid text,
  ADD COLUMN IF NOT EXISTS actblue_client_secret text,
  ADD COLUMN IF NOT EXISTS actblue_last_synced_at timestamptz;

COMMENT ON COLUMN public.committees.actblue_client_secret IS
  'ActBlue API client secret; readable only via service role in sync jobs.';

-- -----------------------------------------------------------------------------
-- contributions: ActBlue IDs, source, donor contact, recurring/refund flags
-- -----------------------------------------------------------------------------

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS actblue_receipt_id text,
  ADD COLUMN IF NOT EXISTS actblue_lineitem_id text,
  ADD COLUMN IF NOT EXISTS actblue_payment_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS donor_email text,
  ADD COLUMN IF NOT EXISTS donor_address text,
  ADD COLUMN IF NOT EXISTS donor_city text,
  ADD COLUMN IF NOT EXISTS donor_state text,
  ADD COLUMN IF NOT EXISTS donor_zip text,
  ADD COLUMN IF NOT EXISTS donor_phone text,
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_period text,
  ADD COLUMN IF NOT EXISTS refunded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_date date;

ALTER TABLE public.contributions
  DROP CONSTRAINT IF EXISTS contributions_source_check;

ALTER TABLE public.contributions
  ADD CONSTRAINT contributions_source_check CHECK (
    source = ANY (ARRAY['manual'::text, 'actblue'::text])
  );

CREATE UNIQUE INDEX IF NOT EXISTS contributions_actblue_receipt_id_key
  ON public.contributions (actblue_receipt_id)
  WHERE actblue_receipt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contributions_source ON public.contributions (source);

-- -----------------------------------------------------------------------------
-- actblue_sync_logs
-- -----------------------------------------------------------------------------

CREATE TABLE public.actblue_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  contributions_imported integer,
  contributions_skipped integer,
  error_message text,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  CONSTRAINT actblue_sync_logs_status_check CHECK (
    status = ANY (
      ARRAY['in_progress'::text, 'complete'::text, 'failed'::text]
    )
  )
);

CREATE INDEX idx_actblue_sync_logs_committee_started
  ON public.actblue_sync_logs (committee_id, started_at DESC);

ALTER TABLE public.actblue_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view actblue sync logs for own committees"
ON public.actblue_sync_logs
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.committees AS com
    WHERE com.id = actblue_sync_logs.committee_id
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

GRANT SELECT ON public.actblue_sync_logs TO authenticated;
