-- ActBlue client secret: block direct SELECT for app roles; expose only metadata via RPC.

CREATE OR REPLACE FUNCTION public.committee_actblue_credentials_meta(p_committee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sec text;
  owns boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.committees AS c
    WHERE c.id = p_committee_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.candidates AS x
          WHERE x.id = c.candidate_id
            AND x.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.political_groups AS g
          WHERE g.id = c.political_group_id
            AND g.user_id = auth.uid()
        )
      )
  )
  INTO owns;

  IF NOT owns THEN
    RETURN jsonb_build_object(
      'configured',
      false,
      'secret_last_four',
      NULL::text
    );
  END IF;

  SELECT NULLIF(trim(c.actblue_client_secret), '')
  INTO sec
  FROM public.committees AS c
  WHERE c.id = p_committee_id;

  IF sec IS NULL OR length(sec) = 0 THEN
    RETURN jsonb_build_object(
      'configured',
      false,
      'secret_last_four',
      NULL::text
    );
  END IF;

  IF length(sec) < 4 THEN
    RETURN jsonb_build_object(
      'configured',
      true,
      'secret_last_four',
      NULL::text
    );
  END IF;

  RETURN jsonb_build_object(
    'configured',
    true,
    'secret_last_four',
    right(sec, 4)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.committee_actblue_credentials_meta(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.committee_actblue_credentials_meta(uuid) TO authenticated;

REVOKE SELECT (actblue_client_secret) ON TABLE public.committees FROM authenticated;
REVOKE SELECT (actblue_client_secret) ON TABLE public.committees FROM anon;
