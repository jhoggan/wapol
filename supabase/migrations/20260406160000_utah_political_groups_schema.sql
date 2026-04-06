-- Utah political groups: align group_type, columns, and social fields with Utah onboarding.
-- Verified against live public.political_groups (MCP / information_schema).

-- -----------------------------------------------------------------------------
-- political_groups: remap legacy group_type values before replacing CHECK
-- -----------------------------------------------------------------------------

UPDATE public.political_groups
SET group_type = CASE group_type
  WHEN 'Super PAC' THEN 'PAC'
  WHEN 'Ballot Committee' THEN 'PIC'
  WHEN '527' THEN 'Independent Expenditures'
  WHEN 'LLC' THEN 'PAC'
  ELSE group_type
END
WHERE group_type IN ('Super PAC', 'Ballot Committee', '527', 'LLC');

ALTER TABLE public.political_groups
  DROP CONSTRAINT political_groups_group_type_check;

ALTER TABLE public.political_groups
  ADD COLUMN entity_folder_link text,
  ADD COLUMN facebook text,
  ADD COLUMN instagram text;

UPDATE public.political_groups
SET
  facebook = social_media->>'facebook',
  instagram = social_media->>'instagram'
WHERE social_media IS NOT NULL;

ALTER TABLE public.political_groups
  DROP COLUMN social_media;

ALTER TABLE public.political_groups
  DROP COLUMN leader_first_name,
  DROP COLUMN leader_last_name,
  DROP COLUMN mission_statement,
  DROP COLUMN regulatory_id,
  DROP COLUMN election_year;

ALTER TABLE public.political_groups
  ADD CONSTRAINT political_groups_group_type_check CHECK (
    group_type IN (
      'PAC',
      'PIC',
      'Political Party',
      'Labor Organization',
      'Independent Expenditures'
    )
  );

-- -----------------------------------------------------------------------------
-- committees: allow NULL filing name/status for political_group-only rows
-- -----------------------------------------------------------------------------

ALTER TABLE public.committees
  ALTER COLUMN filing_jurisdiction_name DROP NOT NULL,
  ALTER COLUMN filing_status DROP NOT NULL;
