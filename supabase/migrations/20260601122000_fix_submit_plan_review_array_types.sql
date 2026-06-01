create or replace function public.submit_plan_review(
  p_plan_id uuid,
  p_mood_score integer,
  p_mood_emoji text default null,
  p_note text default null,
  p_tags text[] default ARRAY[]::text[],
  p_venue_reviews jsonb default '[]'::jsonb
)
returns public.plan_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_review public.plan_reviews;
  review_item jsonb;
  item_venue_id uuid;
  item_plan_stop_id uuid;
  item_vibe_score integer;
  item_value_score integer;
  previous_venue_ids uuid[] := ARRAY[]::uuid[];
  touched_venue_ids uuid[] := ARRAY[]::uuid[];
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_mood_score not between 1 and 5 then
    raise exception 'Mood score must be between 1 and 5'
      using errcode = '22023';
  end if;

  if char_length(coalesce(p_note, '')) > 280 then
    raise exception 'Review note cannot exceed 280 characters'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.plans p
    where p.id = p_plan_id
      and p.owner_id = current_user_id
  ) then
    raise exception 'Plan not found or not owned by current user'
      using errcode = '42501';
  end if;

  insert into public.plan_reviews (
    plan_id,
    user_id,
    mood_score,
    mood_emoji,
    note,
    tags
  )
  values (
    p_plan_id,
    current_user_id,
    p_mood_score,
    nullif(p_mood_emoji, ''),
    nullif(p_note, ''),
    coalesce(p_tags, ARRAY[]::text[])
  )
  on conflict (plan_id, user_id)
  do update set
    mood_score = excluded.mood_score,
    mood_emoji = excluded.mood_emoji,
    note = excluded.note,
    tags = excluded.tags,
    updated_at = now()
  returning * into saved_review;

  select coalesce(array_agg(distinct venue_id), ARRAY[]::uuid[])
  into previous_venue_ids
  from public.venue_reviews
  where plan_review_id = saved_review.id;

  delete from public.venue_reviews
  where plan_review_id = saved_review.id;

  for review_item in
    select value
    from jsonb_array_elements(coalesce(p_venue_reviews, '[]'::jsonb))
  loop
    item_venue_id := (review_item ->> 'venue_id')::uuid;
    item_plan_stop_id := nullif(review_item ->> 'plan_stop_id', '')::uuid;
    item_vibe_score := (review_item ->> 'vibe_score')::integer;
    item_value_score := (review_item ->> 'value_score')::integer;

    if item_vibe_score not between 1 and 5 or item_value_score not between 1 and 5 then
      raise exception 'Venue review scores must be between 1 and 5'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.venues v
      where v.id = item_venue_id
        and v.is_active = true
    ) then
      raise exception 'Venue is not available for review'
        using errcode = '42501';
    end if;

    if item_plan_stop_id is not null and not exists (
      select 1
      from public.plan_stops ps
      where ps.id = item_plan_stop_id
        and ps.plan_id = p_plan_id
        and ps.venue_id = item_venue_id
    ) then
      raise exception 'Plan stop does not match reviewed venue'
        using errcode = '42501';
    end if;

    insert into public.venue_reviews (
      plan_review_id,
      plan_id,
      plan_stop_id,
      venue_id,
      user_id,
      vibe_score,
      value_score
    )
    values (
      saved_review.id,
      p_plan_id,
      item_plan_stop_id,
      item_venue_id,
      current_user_id,
      item_vibe_score,
      item_value_score
    );

    touched_venue_ids := array_append(touched_venue_ids, item_venue_id);
  end loop;

  perform public.refresh_venue_review_rollup(distinct_venue_id)
  from (
    select distinct unnest(previous_venue_ids || touched_venue_ids) as distinct_venue_id
  ) touched
  where distinct_venue_id is not null;

  return saved_review;
end;
$$;

revoke all on function public.submit_plan_review(uuid, integer, text, text, text[], jsonb) from public;
grant execute on function public.submit_plan_review(uuid, integer, text, text, text[], jsonb) to authenticated;
