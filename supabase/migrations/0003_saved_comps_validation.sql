-- Preserve existing rows, while rejecting malformed new comparison payloads.
-- The client also validates legacy JSON before trying to render it.
create function public.is_valid_comparison_subject(value jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare
  stats jsonb;
begin
  if jsonb_typeof(value) is distinct from 'object'
     or octet_length(value::text) > 4096 then
    return false;
  end if;

  if value->>'kind' = 'athlete' then
    return jsonb_typeof(value->'athleteId') = 'string'
      and char_length(value->>'athleteId') between 1 and 200
      and value->>'athleteId' ~ '^[a-z0-9][a-z0-9-]*$';
  end if;

  if value->>'kind' is distinct from 'custom'
     or jsonb_typeof(value->'label') is distinct from 'string'
     or char_length(btrim(value->>'label')) not between 1 and 80 then
    return false;
  end if;
  if value ? 'wingspanEstimated'
     and jsonb_typeof(value->'wingspanEstimated') is distinct from 'boolean' then
    return false;
  end if;

  stats := value->'stats';
  if jsonb_typeof(stats) is distinct from 'object'
     or jsonb_typeof(stats->'heightCm') is distinct from 'number'
     or jsonb_typeof(stats->'weightKg') is distinct from 'number'
     or jsonb_typeof(stats->'wingspanCm') is distinct from 'number'
     or jsonb_typeof(stats->'gender') is distinct from 'string' then
    return false;
  end if;

  return (stats->>'heightCm')::numeric between 120 and 240
    and (stats->>'weightKg')::numeric between 30 and 200
    and (stats->>'wingspanCm')::numeric between 120 and 260
    and stats->>'gender' in ('m', 'f');
end;
$$;

alter table public.saved_comps
  add constraint saved_comps_subject_valid
    check (public.is_valid_comparison_subject(subject) is true) not valid,
  add constraint saved_comps_mode_valid
    check (mode in ('overlay', 'side', 'table')) not valid,
  add constraint saved_comps_target_valid
    check (char_length(target_athlete_id) between 1 and 200
      and target_athlete_id ~ '^[a-z0-9][a-z0-9-]*$') not valid,
  add constraint saved_comps_title_nonblank
    check (char_length(btrim(title)) between 1 and 200) not valid;
