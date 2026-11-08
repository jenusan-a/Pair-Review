-- Pair codes become 4 digits (0000-9999) instead of 6 hex characters.
-- Run once in the Supabase dashboard after 0002: SQL Editor > New query > paste > Run.
-- shortcut: redeem_pair_code still allows unlimited guesses, and 10,000 codes can be tried in minutes.
-- Add attempt limits before a public launch (this replaces the "hard to hit" note in 0002).

-- Old 6-character codes can't be typed into the new 4-digit field, so clear them; people just get a new one.
delete from public.pair_codes;

create or replace function public.create_pair_code()
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

  -- shortcut: an expired code still holds its number until its owner asks for a new one; with only 10,000 codes,
  -- clear expired ones here (or on a schedule) if this loop ever starts retrying a lot.
  loop
    result := lpad(floor(random() * 10000)::int::text, 4, '0');
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
