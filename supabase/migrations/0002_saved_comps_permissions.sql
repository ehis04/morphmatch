-- Explicit privileges are required on local stacks with auto-exposure disabled.
-- RLS continues to enforce ownership for every authenticated operation.
grant usage on schema public to authenticated;
revoke all on public.saved_comps from anon;
grant select, insert, delete on public.saved_comps to authenticated;
