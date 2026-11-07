-- Pairing: link two accounts with a short-lived code.
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.

create table public.pair_codes (
  code text primary key,
  created_by uuid not null unique references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);

create table public.pairs (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  -- Always store the smaller id first, so one couple can't be saved twice in swapped order.
  check (user_a < user_b)
);

alter table public.pair_codes enable row level security;
alter table public.pairs enable row level security;

-- Read-only from the app. All writes go through the two functions below.
create policy "Read own pair code" on public.pair_codes
  for select to authenticated using (created_by = (select auth.uid()));

create policy "Read own pair" on public.pairs
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));

create policy "Read partner profile" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.pairs p
      where (p.user_a = (select auth.uid()) and p.user_b = profiles.id)
         or (p.user_b = (select auth.uid()) and p.user_a = profiles.id)
    )
  );

-- Returns the caller's code, reusing it while it's valid so a code they already sent keeps working.
create function public.create_pair_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  result text;
begin
  if me is null then
    raise exception 'Not logged in';
  end if;

  select code into result from public.pair_codes where created_by = me and expires_at > now();
  if result is not null then
    return result;
  end if;

  -- Only our own expired code: uses the created_by index. Others' expired codes are ignored by every check anyway.
  delete from public.pair_codes where created_by = me;

  loop
    result := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    begin
      insert into public.pair_codes (code, created_by) values (result, me);
      return result;
    exception when unique_violation then
      -- Either the code is taken (try another) or a second call for this user just made one (return it).
      select code into result from public.pair_codes where created_by = me;
      if result is not null then
        return result;
      end if;
    end;
  end loop;
end;
$$;

-- Links the caller with the code's owner and returns the owner's id.
create function public.redeem_pair_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  owner uuid;
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

  -- shortcut: two redeems at the same instant could both pass this check; add a lock if it ever happens. Remove it to allow friends.
  if exists (select 1 from public.pairs where me in (user_a, user_b) or owner in (user_a, user_b)) then
    raise exception 'One of you is already paired.';
  end if;

  insert into public.pairs (user_a, user_b) values (least(me, owner), greatest(me, owner));
  delete from public.pair_codes where created_by in (me, owner);
  return owner;
end;
$$;

revoke execute on function public.create_pair_code() from public, anon;
revoke execute on function public.redeem_pair_code(text) from public, anon;
grant execute on function public.create_pair_code() to authenticated;
grant execute on function public.redeem_pair_code(text) to authenticated;

-- Send new pairs to the app over Realtime (still filtered by the policies above).
alter publication supabase_realtime add table public.pairs;
