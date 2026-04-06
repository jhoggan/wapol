-- Store Utah county for county- and municipal-level candidates (including municipal).
-- Verified: no existing candidates.utah_* column (MCP / information_schema).

ALTER TABLE public.candidates
  ADD COLUMN utah_county text;
