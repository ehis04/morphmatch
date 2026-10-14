-- GRANT alone does not remove privileges inherited from Supabase defaults.
-- In particular, TRUNCATE is not subject to row-level security.
revoke all on public.saved_comps from public, anon, authenticated;
grant select, insert, delete on public.saved_comps to authenticated;
