-- Supabase/PostgREST treats SQLSTATE 40001 as retryable. Relationship version
-- mismatches are deliberate application conflicts, so return a non-retryable
-- database exception instead of leaving browser requests retrying.

do $block$
declare
  function_signature regprocedure;
  function_definition text;
begin
  foreach function_signature in array array[
    'public.decide_event_venue_placement(uuid,text,text,bigint)'::regprocedure,
    'public.resubmit_event_venue_placement(uuid,text,bigint)'::regprocedure,
    'public.report_event_venue_attribution(uuid,text,bigint)'::regprocedure,
    'public.respond_event_venue_dispute(uuid,text,bigint)'::regprocedure,
    'public.resolve_event_venue_dispute(uuid,text,text,bigint)'::regprocedure
  ]
  loop
    select pg_get_functiondef(function_signature) into function_definition;
    if position('using errcode = ''40001''' in function_definition) = 0 then
      raise exception 'Expected relationship stale-write SQLSTATE was not found in %', function_signature;
    end if;
    function_definition := replace(
      function_definition,
      'using errcode = ''40001''',
      'using errcode = ''P0001'''
    );
    execute function_definition;
  end loop;
end;
$block$;
