-- Supabase/PostgREST treats SQLSTATE 40001 as retryable. The draft editor uses
-- the stale timestamp as an intentional application conflict, so expose a
-- non-retryable exception instead of leaving the HTTP request retrying.

do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.admin_update_draft_venue(uuid,jsonb,timestamp with time zone)'::regprocedure
  ) into function_definition;

  if position('using errcode = ''40001''' in function_definition) = 0 then
    raise exception 'Expected draft editor stale-write SQLSTATE was not found';
  end if;

  function_definition := replace(
    function_definition,
    'using errcode = ''40001''',
    'using errcode = ''P0001'''
  );

  execute function_definition;
end;
$$;
