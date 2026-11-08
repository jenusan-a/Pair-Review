-- Reviews go step by step in lockstep: you both finish a step before either of you sees the next one.
-- Each step's answers are sent when you tap Next. Run once in the Supabase dashboard after 0003.

-- How many steps each person has finished. Kept on reviews so the existing Realtime channel tells the other phone.
-- The step you're both on is least(a_steps_done, b_steps_done).
alter table public.reviews
  add column a_steps_done smallint not null default 0,
  add column b_steps_done smallint not null default 0;

create table public.review_answers (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 0 is the first step (ambience).
  step smallint not null check (step >= 0),
  -- null when they skipped the step; it still counts as done.
  answers jsonb check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id, step)
);

alter table public.review_answers enable row level security;

-- Read-only from the app; writes go through complete_step and reopen_step.
-- Your own answers always; your partner's only for steps you've finished too, so seeing theirs can't sway yours.
create policy "Read own and finished review answers" on public.review_answers
  for select to authenticated using (
    exists (
      select 1 from public.reviews r
      where r.id = review_answers.review_id
        and (
          (r.user_a = (select auth.uid()) and (review_answers.user_id = r.user_a or r.a_steps_done > review_answers.step))
          or (r.user_b = (select auth.uid()) and (review_answers.user_id = r.user_b or r.b_steps_done > review_answers.step))
        )
    )
  );

-- Saves the caller's answers for the step you're both on and marks them ready. Null answers skip the step.
create function public.complete_step(p_review_id uuid, p_step smallint, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  r public.reviews;
  mine smallint;
  theirs smallint;
begin
  if me is null then
    raise exception 'Not logged in';
  end if;

  -- Locks the review so this can't interleave with the partner's complete_step or reopen_step.
  select * into r from public.reviews
  where id = p_review_id and me in (user_a, user_b) and status = 'in_progress'
  for update;
  if not found then
    raise exception 'This review has ended.';
  end if;

  if me = r.user_a then
    mine := r.a_steps_done; theirs := r.b_steps_done;
  else
    mine := r.b_steps_done; theirs := r.a_steps_done;
  end if;

  -- Rejects a repeat tap and getting more than one step ahead of your partner.
  if p_step <> mine or mine > theirs then
    raise exception 'That step is already done.';
  end if;

  insert into public.review_answers (review_id, user_id, step, answers) values (p_review_id, me, p_step, p_answers);

  if me = r.user_a then
    update public.reviews set a_steps_done = a_steps_done + 1 where id = p_review_id;
  else
    update public.reviews set b_steps_done = b_steps_done + 1 where id = p_review_id;
  end if;
end;
$$;

-- Takes back the caller's last step while their partner hasn't finished it, so they can change their answers.
create function public.reopen_step(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  r public.reviews;
  mine smallint;
  theirs smallint;
begin
  if me is null then
    raise exception 'Not logged in';
  end if;

  select * into r from public.reviews
  where id = p_review_id and me in (user_a, user_b) and status = 'in_progress'
  for update;
  if not found then
    raise exception 'This review has ended.';
  end if;

  if me = r.user_a then
    mine := r.a_steps_done; theirs := r.b_steps_done;
  else
    mine := r.b_steps_done; theirs := r.a_steps_done;
  end if;

  if mine <= theirs then
    raise exception 'Your partner already finished this step, so it can''t be changed.';
  end if;

  delete from public.review_answers where review_id = p_review_id and user_id = me and step = mine - 1;

  if me = r.user_a then
    update public.reviews set a_steps_done = a_steps_done - 1 where id = p_review_id;
  else
    update public.reviews set b_steps_done = b_steps_done - 1 where id = p_review_id;
  end if;
end;
$$;

revoke execute on function public.complete_step(uuid, smallint, jsonb) from public, anon;
grant execute on function public.complete_step(uuid, smallint, jsonb) to authenticated;
revoke execute on function public.reopen_step(uuid) from public, anon;
grant execute on function public.reopen_step(uuid) to authenticated;
