-- Persist B2C post-date reviews while keeping partner visibility aggregated.

create table if not exists public.plan_reviews (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood_score integer not null check (mood_score between 1 and 5),
  mood_emoji text,
  note text check (char_length(coalesce(note, '')) <= 280),
  tags text[] not null default '{}',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, user_id)
);

create table if not exists public.venue_reviews (
  id uuid primary key default gen_random_uuid(),
  plan_review_id uuid not null references public.plan_reviews(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  plan_stop_id uuid references public.plan_stops(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vibe_score integer not null check (vibe_score between 1 and 5),
  value_score integer not null check (value_score between 1 and 5),
  submitted_at timestamptz not null default now(),
  unique (plan_review_id, venue_id)
);

alter table public.plan_reviews enable row level security;
alter table public.venue_reviews enable row level security;

revoke all on public.plan_reviews from anon, authenticated;
revoke all on public.venue_reviews from anon, authenticated;
grant select, insert, update on public.plan_reviews to authenticated;
grant select, insert, update on public.venue_reviews to authenticated;

drop policy if exists "Users can view own plan reviews" on public.plan_reviews;
drop policy if exists "Users can insert own plan reviews" on public.plan_reviews;
drop policy if exists "Users can update own plan reviews" on public.plan_reviews;
drop policy if exists "Admins can view plan reviews" on public.plan_reviews;

create policy "Users can view own plan reviews"
  on public.plan_reviews for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own plan reviews"
  on public.plan_reviews for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.plans p
      where p.id = plan_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Users can update own plan reviews"
  on public.plan_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view plan reviews"
  on public.plan_reviews for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "Users can view own venue reviews" on public.venue_reviews;
drop policy if exists "Users can insert own venue reviews" on public.venue_reviews;
drop policy if exists "Users can update own venue reviews" on public.venue_reviews;
drop policy if exists "Admins can view venue reviews" on public.venue_reviews;

create policy "Users can view own venue reviews"
  on public.venue_reviews for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own venue reviews"
  on public.venue_reviews for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.plans p
      where p.id = plan_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Users can update own venue reviews"
  on public.venue_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view venue reviews"
  on public.venue_reviews for select
  to authenticated
  using (public.is_admin_user());

create index if not exists plan_reviews_user_submitted_idx
  on public.plan_reviews(user_id, submitted_at desc);

create index if not exists venue_reviews_venue_submitted_idx
  on public.venue_reviews(venue_id, submitted_at desc);

create index if not exists venue_reviews_user_submitted_idx
  on public.venue_reviews(user_id, submitted_at desc);

drop trigger if exists set_plan_reviews_updated_at on public.plan_reviews;
create trigger set_plan_reviews_updated_at
  before update on public.plan_reviews
  for each row execute procedure public.set_updated_at();

create or replace function public.refresh_venue_review_rollup(target_venue_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.venues v
  set
    rating = stats.avg_rating,
    review_count = stats.review_count,
    updated_at = now()
  from (
    select
      venue_id,
      round(avg((vibe_score + value_score)::numeric / 2), 2) as avg_rating,
      count(*)::integer as review_count
    from public.venue_reviews
    where venue_id = target_venue_id
    group by venue_id
  ) stats
  where v.id = stats.venue_id;
$$;

create or replace function public.submit_plan_review(
  p_plan_id uuid,
  p_mood_score integer,
  p_mood_emoji text default null,
  p_note text default null,
  p_tags text[] default '{}',
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
  previous_venue_ids uuid[] := '{}';
  touched_venue_ids uuid[] := '{}';
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
    coalesce(p_tags, '{}')
  )
  on conflict (plan_id, user_id)
  do update set
    mood_score = excluded.mood_score,
    mood_emoji = excluded.mood_emoji,
    note = excluded.note,
    tags = excluded.tags,
    updated_at = now()
  returning * into saved_review;

  select coalesce(array_agg(distinct venue_id), '{}')
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

create or replace function public.get_partner_review_summary(
  p_since timestamptz default now() - interval '30 days'
)
returns table (
  venue_id uuid,
  venue_name text,
  review_count integer,
  avg_vibe numeric,
  avg_value numeric,
  avg_rating numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id as venue_id,
    v.name as venue_name,
    count(vr.id)::integer as review_count,
    round(avg(vr.vibe_score), 2) as avg_vibe,
    round(avg(vr.value_score), 2) as avg_value,
    round(avg((vr.vibe_score + vr.value_score)::numeric / 2), 2) as avg_rating
  from public.venues v
  join public.venue_reviews vr on vr.venue_id = v.id
  where v.partner_id = auth.uid()
    and vr.submitted_at >= p_since
  group by v.id, v.name
  order by review_count desc, avg_rating desc;
$$;

revoke all on function public.submit_plan_review(uuid, integer, text, text, text[], jsonb) from public;
grant execute on function public.submit_plan_review(uuid, integer, text, text, text[], jsonb) to authenticated;

revoke all on function public.get_partner_review_summary(timestamptz) from public;
grant execute on function public.get_partner_review_summary(timestamptz) to authenticated;
