-- Reviews replace permanent pairs: redeeming a code starts a review, and the review is the only link between two people.
-- Run once in the Supabase dashboard after 0001: SQL Editor > New query > paste > Run.

drop policy "Read partner profile" on public.profiles;
-- Also removes pairs from the supabase_realtime publication.
drop table public.pairs;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  -- user_a owns the code, user_b redeemed it.
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  -- shortcut: an in_progress review nobody leaves never times out.
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.reviews enable row level security;

-- Read-only from the app. All writes go through the functions below.
create policy "Read own reviews" on public.reviews
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));

-- Any shared review counts, finished ones too, so history can still show names.
create policy "Read review partner profile" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.reviews r
      where (r.user_a = (select auth.uid()) and r.user_b = profiles.id)
         or (r.user_b = (select auth.uid()) and r.user_a = profiles.id)
    )
  );

-- Starts a review between the caller and the code's owner and returns its id.
create or replace function public.redeem_pair_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  owner uuid;
  review_id uuid;
begin
  if me is null then
    raise exception 'Not logged in';
  end if;

  -- shortcut: no limit on guesses; 6 hex characters lasting 15 minutes are hard to hit, add attempt limits before a public launch.
  select created_by into owner from public.pair_codes
  where code = upper(trim(p_code)) and expires_at > now();

  if owner is null then
    raise exception 'That code is wrong or has expired.';
  end if;
  if owner = me then
    raise exception 'That''s your own code. Send it to your partner instead.';
  end if;

  -- Only live reviews count; finished ones are history.
  -- shortcut: two redeems at the same instant could both pass this check; add a lock if it ever happens.
  if exists (
    select 1 from public.reviews
    where status = 'in_progress' and (me in (user_a, user_b) or owner in (user_a, user_b))
  ) then
    raise exception 'One of you is already in a review.';
  end if;

  insert into public.reviews (user_a, user_b) values (owner, me) returning id into review_id;
  delete from public.pair_codes where created_by in (me, owner);
  return review_id;
end;
$$;

-- Ends the caller's live review. Does nothing if it's already over.
create function public.leave_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not logged in';
  end if;

  update public.reviews set status = 'ended', ended_at = now()
  where id = p_review_id and me in (user_a, user_b) and status = 'in_progress';
end;
$$;

revoke execute on function public.leave_review(uuid) from public, anon;
grant execute on function public.leave_review(uuid) to authenticated;

-- Send review starts and ends to the app over Realtime (still filtered by the policy above).
alter publication supabase_realtime add table public.reviews;
