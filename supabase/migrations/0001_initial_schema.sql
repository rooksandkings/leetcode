create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.profile_role as enum ('user', 'admin');
create type public.content_visibility as enum ('draft', 'public', 'unlisted', 'archived');
create type public.test_visibility as enum ('public', 'hidden');
create type public.submission_status as enum ('queued', 'running', 'done', 'failed');
create type public.judge_job_status as enum ('queued', 'leased', 'done', 'failed');
create type public.verdict as enum (
  'queued',
  'compiling',
  'running',
  'accepted',
  'wrong_answer',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'runtime_error',
  'compilation_error',
  'output_limit_exceeded',
  'judge_error'
);
create type public.checker_type as enum ('exact', 'line', 'token', 'float', 'custom');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle citext unique not null,
  display_name text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.problems (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  title text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  tags text[] not null default '{}',
  visibility public.content_visibility not null default 'draft',
  created_by uuid references public.profiles(id),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.problem_versions (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  version integer not null,
  statement_md text not null,
  time_limit_ms integer not null check (time_limit_ms between 100 and 30000),
  memory_limit_mb integer not null check (memory_limit_mb between 16 and 2048),
  checker public.checker_type not null default 'token',
  checker_config jsonb not null default '{}'::jsonb,
  package_storage_path text,
  package_checksum text,
  package_verification_report jsonb,
  package_verified_at timestamptz,
  created_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (problem_id, version)
);

alter table public.problems
  add constraint problems_current_version_fk
  foreign key (current_version_id) references public.problem_versions(id);

create table public.problem_test_cases (
  id uuid primary key default gen_random_uuid(),
  problem_version_id uuid not null references public.problem_versions(id) on delete cascade,
  name text not null,
  case_order integer not null,
  visibility public.test_visibility not null default 'hidden',
  input_path text not null,
  expected_path text not null,
  created_at timestamptz not null default now(),
  unique (problem_version_id, case_order)
);

create table public.contests (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  title text not null,
  description text,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  standings_frozen_at timestamptz,
  standings_released_at timestamptz,
  visibility public.content_visibility not null default 'draft',
  created_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (registration_opens_at is null or registration_opens_at <= starts_at),
  check (registration_closes_at is null or registration_closes_at <= starts_at),
  check (
    registration_opens_at is null
    or registration_closes_at is null
    or registration_opens_at <= registration_closes_at
  ),
  check (standings_frozen_at is null or standings_frozen_at between starts_at and ends_at),
  check (standings_released_at is null or standings_released_at >= starts_at)
);

create table public.contest_problems (
  contest_id uuid not null references public.contests(id) on delete cascade,
  problem_version_id uuid not null references public.problem_versions(id),
  label text not null,
  display_order integer not null,
  primary key (contest_id, problem_version_id),
  unique (contest_id, label),
  unique (contest_id, display_order)
);

create table public.contest_registrations (
  contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  handle_snapshot citext not null,
  registered_at timestamptz not null default now(),
  primary key (contest_id, user_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  problem_version_id uuid not null references public.problem_versions(id),
  contest_id uuid references public.contests(id),
  language text not null default 'python3' check (language = 'python3'),
  source_code text not null,
  status public.submission_status not null default 'queued',
  verdict public.verdict not null default 'queued',
  runtime_ms integer,
  memory_kb integer,
  submitted_at timestamptz not null default now(),
  judged_at timestamptz,
  check (char_length(source_code) <= 200000),
  foreign key (contest_id, problem_version_id) references public.contest_problems (contest_id, problem_version_id)
);

create index submissions_user_idx on public.submissions (user_id, submitted_at desc);
create index submissions_contest_idx on public.submissions (contest_id, submitted_at);
create index submissions_problem_idx on public.submissions (problem_version_id, submitted_at desc);

create table public.submission_test_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  test_case_id uuid references public.problem_test_cases(id),
  test_index integer not null,
  test_name text not null,
  visibility public.test_visibility not null,
  verdict public.verdict not null,
  runtime_ms integer not null default 0,
  memory_kb integer,
  message_public text not null default '',
  message_admin text,
  created_at timestamptz not null default now(),
  unique (submission_id, test_index)
);

create table public.judge_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  status public.judge_job_status not null default 'queued',
  leased_by text,
  leased_until timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index judge_jobs_claim_idx on public.judge_jobs (status, leased_until, created_at);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id),
  prompt text not null,
  output jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.custom_checker_reviews (
  id uuid primary key default gen_random_uuid(),
  storage_path text unique not null,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  package_slug citext not null,
  has_custom_checker boolean not null,
  status text not null check (status in ('not_required', 'approved', 'rejected')),
  notes text not null default '',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    (has_custom_checker and status in ('approved', 'rejected'))
    or (not has_custom_checker and status = 'not_required')
  ),
  check (status <> 'rejected' or length(trim(notes)) > 0)
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'problem-packages',
  'problem-packages',
  false,
  52428800,
  array['application/zip', 'application/x-zip-compressed']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger problems_set_updated_at
before update on public.problems
for each row execute function public.set_updated_at();

create trigger contests_set_updated_at
before update on public.contests
for each row execute function public.set_updated_at();

create trigger judge_jobs_set_updated_at
before update on public.judge_jobs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'handle', ''), 'user_' || substring(new.id::text from 1 for 8)),
    nullif(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.enqueue_judge_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.judge_jobs (submission_id)
  values (new.id);
  return new;
end;
$$;

create trigger submissions_enqueue_judge_job
after insert on public.submissions
for each row execute function public.enqueue_judge_job();

create or replace function public.prevent_published_problem_version_update()
returns trigger
language plpgsql
as $$
begin
  if old.published_at is not null and to_jsonb(old) <> to_jsonb(new) then
    raise exception 'published problem versions are immutable';
  end if;
  return new;
end;
$$;

create trigger problem_versions_immutable_after_publish
before update on public.problem_versions
for each row execute function public.prevent_published_problem_version_update();

create or replace function public.submit_solution(
  p_problem_version_id uuid,
  p_contest_id uuid,
  p_source_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_source_code is null or length(trim(p_source_code)) = 0 then
    raise exception 'source code is required';
  end if;

  if p_contest_id is not null then
    if not exists (
      select 1
      from public.contests c
      join public.contest_problems cp on cp.contest_id = c.id
      join public.problem_versions pv on pv.id = cp.problem_version_id
      join public.problems p on p.id = pv.problem_id
      join public.contest_registrations cr on cr.contest_id = c.id and cr.user_id = auth.uid()
      where c.id = p_contest_id
        and cp.problem_version_id = p_problem_version_id
        and c.visibility = 'public'
        and p.visibility = 'public'
        and pv.published_at is not null
        and now() >= c.starts_at
        and now() < c.ends_at
    ) then
      raise exception 'contest submission is not allowed';
    end if;
  elsif not exists (
    select 1
    from public.problem_versions pv
    join public.problems p on p.id = pv.problem_id
    where pv.id = p_problem_version_id
      and p.current_version_id = pv.id
      and p.visibility = 'public'
      and pv.published_at is not null
  ) then
    raise exception 'problem is not available';
  end if;

  insert into public.submissions (user_id, problem_version_id, contest_id, source_code)
  values (auth.uid(), p_problem_version_id, p_contest_id, p_source_code)
  returning id into v_submission_id;

  return v_submission_id;
end;
$$;

create or replace function public.create_admin_contest(
  p_title text,
  p_slug text,
  p_description text,
  p_registration_opens_at timestamptz,
  p_registration_closes_at timestamptz,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_standings_frozen_at timestamptz,
  p_standings_released_at timestamptz,
  p_assignments jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contest_id uuid;
  v_assignment jsonb;
  v_display_order integer := 0;
  v_label text;
  v_problem_slug text;
  v_problem_version_id uuid;
  v_seen_labels text[] := array[]::text[];
  v_seen_versions uuid[] := array[]::uuid[];
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'contest title is required';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9-]+$' then
    raise exception 'contest slug is invalid';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'contest end must be after start';
  end if;

  if p_assignments is null or jsonb_typeof(p_assignments) <> 'array' or jsonb_array_length(p_assignments) = 0 then
    raise exception 'at least one problem assignment is required';
  end if;

  insert into public.contests (
    slug,
    title,
    description,
    registration_opens_at,
    registration_closes_at,
    starts_at,
    ends_at,
    standings_frozen_at,
    standings_released_at,
    visibility,
    created_by
  )
  values (
    p_slug,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    p_registration_opens_at,
    p_registration_closes_at,
    p_starts_at,
    p_ends_at,
    p_standings_frozen_at,
    p_standings_released_at,
    'draft',
    auth.uid()
  )
  returning id into v_contest_id;

  for v_assignment in select value from jsonb_array_elements(p_assignments)
  loop
    v_display_order := v_display_order + 1;
    v_label := upper(trim(v_assignment->>'label'));
    v_problem_slug := lower(trim(v_assignment->>'problemSlug'));

    if v_label is null or v_label !~ '^[A-Z][A-Z0-9]{0,3}$' then
      raise exception 'problem label is invalid';
    end if;

    if v_label = any(v_seen_labels) then
      raise exception 'duplicate problem label: %', v_label;
    end if;
    v_seen_labels := array_append(v_seen_labels, v_label);

    select pv.id into v_problem_version_id
    from public.problems p
    join public.problem_versions pv on pv.id = p.current_version_id
    where p.slug = v_problem_slug
      and p.visibility = 'public'
      and pv.published_at is not null;

    if v_problem_version_id is null then
      raise exception 'problem is not publishable for contest: %', v_problem_slug;
    end if;

    if v_problem_version_id = any(v_seen_versions) then
      raise exception 'duplicate problem assignment: %', v_problem_slug;
    end if;
    v_seen_versions := array_append(v_seen_versions, v_problem_version_id);

    insert into public.contest_problems (
      contest_id,
      problem_version_id,
      label,
      display_order
    )
    values (
      v_contest_id,
      v_problem_version_id,
      v_label,
      v_display_order
    );
  end loop;

  return v_contest_id;
end;
$$;

create or replace function public.lease_judge_job(
  p_worker_id text,
  p_lease_seconds integer default 60
)
returns table (
  job_id uuid,
  submission_id uuid,
  problem_version_id uuid,
  source_code text,
  package_storage_path text,
  package_checksum text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate as (
    select jj.id
    from public.judge_jobs jj
    where jj.status = 'queued'
       or (jj.status = 'leased' and jj.leased_until < now())
    order by jj.created_at
    for update skip locked
    limit 1
  ),
  leased as (
    update public.judge_jobs jj
    set status = 'leased',
        leased_by = p_worker_id,
        leased_until = now() + make_interval(secs => p_lease_seconds),
        attempts = jj.attempts + 1
    from candidate
    where jj.id = candidate.id
    returning jj.id, jj.submission_id
  )
  select
    leased.id,
    s.id,
    s.problem_version_id,
    s.source_code,
    pv.package_storage_path,
    pv.package_checksum
  from leased
  join public.submissions s on s.id = leased.submission_id
  join public.problem_versions pv on pv.id = s.problem_version_id;
end;
$$;

create or replace function public.finalize_submission(
  p_submission_id uuid,
  p_verdict public.verdict,
  p_runtime_ms integer,
  p_memory_kb integer,
  p_results jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.submissions
  set status = case when p_verdict = 'judge_error' then 'failed'::public.submission_status else 'done'::public.submission_status end,
      verdict = p_verdict,
      runtime_ms = p_runtime_ms,
      memory_kb = p_memory_kb,
      judged_at = now()
  where id = p_submission_id;

  insert into public.submission_test_results (
    submission_id,
    test_index,
    test_name,
    visibility,
    verdict,
    runtime_ms,
    memory_kb,
    message_public,
    message_admin
  )
  select
    p_submission_id,
    (item->>'testIndex')::integer,
    item->>'name',
    (item->>'visibility')::public.test_visibility,
    (item->>'verdict')::public.verdict,
    coalesce((item->>'runtimeMs')::integer, 0),
    nullif(item->>'memoryKb', '')::integer,
    coalesce(item->>'messagePublic', item->>'message', ''),
    item->>'messageAdmin'
  from jsonb_array_elements(p_results) as item
  on conflict (submission_id, test_index) do update
  set verdict = excluded.verdict,
      runtime_ms = excluded.runtime_ms,
      memory_kb = excluded.memory_kb,
      message_public = excluded.message_public,
      message_admin = excluded.message_admin;

  update public.judge_jobs
  set status = case when p_verdict = 'judge_error' then 'failed'::public.judge_job_status else 'done'::public.judge_job_status end,
      leased_until = null
  where submission_id = p_submission_id;
end;
$$;

create or replace view public.contest_standings as
with registered as (
  select
    c.id as contest_id,
    c.starts_at,
    case
      when c.standings_frozen_at is not null
        and now() >= c.standings_frozen_at
        and now() < coalesce(c.standings_released_at, 'infinity'::timestamptz)
      then c.standings_frozen_at
      else null
    end as visible_until,
    cr.user_id,
    cr.handle_snapshot as handle
  from public.contests c
  join public.contest_registrations cr on cr.contest_id = c.id
  where c.visibility = 'public'
),
problem_labels as (
  select
    cp.contest_id,
    cp.problem_version_id,
    cp.label
  from public.contest_problems cp
),
first_accepts as (
  select
    s.contest_id,
    s.user_id,
    pl.label,
    min(s.submitted_at) as first_accepted_at
  from public.submissions s
  join registered r on r.contest_id = s.contest_id and r.user_id = s.user_id
  join problem_labels pl on pl.contest_id = s.contest_id and pl.problem_version_id = s.problem_version_id
  where s.status = 'done' and s.verdict = 'accepted'
    and (r.visible_until is null or s.submitted_at <= r.visible_until)
  group by s.contest_id, s.user_id, pl.label
),
problem_scores as (
  select
    r.contest_id,
    r.user_id,
    r.handle,
    pl.label,
    fa.first_accepted_at,
    (
      select count(*)::integer
      from public.submissions s
      where s.contest_id = r.contest_id
        and s.user_id = r.user_id
        and s.problem_version_id = pl.problem_version_id
        and s.status = 'done'
        and (r.visible_until is null or s.submitted_at <= r.visible_until)
        and s.submitted_at < fa.first_accepted_at
        and s.verdict in (
          'wrong_answer',
          'time_limit_exceeded',
          'memory_limit_exceeded',
          'runtime_error',
          'compilation_error',
          'output_limit_exceeded'
        )
    ) as wrong_before_accept,
    (
      select count(*)::integer
      from public.submissions s
      where s.contest_id = r.contest_id
        and s.user_id = r.user_id
        and s.problem_version_id = pl.problem_version_id
        and s.status = 'done'
        and (r.visible_until is null or s.submitted_at <= r.visible_until)
        and (fa.first_accepted_at is null or s.submitted_at < fa.first_accepted_at)
        and s.verdict in (
          'wrong_answer',
          'time_limit_exceeded',
          'memory_limit_exceeded',
          'runtime_error',
          'compilation_error',
          'output_limit_exceeded'
        )
    ) as wrong_attempts
  from registered r
  join problem_labels pl on pl.contest_id = r.contest_id
  left join first_accepts fa on fa.contest_id = r.contest_id and fa.user_id = r.user_id and fa.label = pl.label
),
user_scores as (
  select
    ps.contest_id,
    ps.user_id,
    ps.handle,
    r.starts_at,
    count(*) filter (where ps.first_accepted_at is not null)::integer as solved_count,
    coalesce(sum(
      case
        when ps.first_accepted_at is null then 0
        else floor(extract(epoch from (ps.first_accepted_at - r.starts_at)) / 60)::integer + ps.wrong_before_accept * 20
      end
    ), 0)::integer as penalty_minutes,
    max(ps.first_accepted_at) as last_accepted_at
  from problem_scores ps
  join registered r on r.contest_id = ps.contest_id and r.user_id = ps.user_id
  group by ps.contest_id, ps.user_id, ps.handle, r.starts_at
)
select
  rank() over (
    partition by contest_id
    order by solved_count desc, penalty_minutes asc, last_accepted_at asc nulls last, handle asc
  )::integer as rank,
  contest_id,
  user_id,
  handle,
  solved_count,
  penalty_minutes,
  last_accepted_at,
  case
    when last_accepted_at is null then null
    else floor(extract(epoch from (last_accepted_at - starts_at)) / 60)::integer
  end as last_accepted_minute,
  coalesce(
    (
      select jsonb_object_agg(
        ps.label,
        jsonb_build_object(
          'solved',
          ps.first_accepted_at is not null,
          'attemptsBeforeSolve',
          case
            when ps.first_accepted_at is not null then ps.wrong_before_accept
            else ps.wrong_attempts
          end,
          'penaltyMinutes',
          case
            when ps.first_accepted_at is null then 0
            else floor(extract(epoch from (ps.first_accepted_at - user_scores.starts_at)) / 60)::integer + ps.wrong_before_accept * 20
          end
        )
      )
      from problem_scores ps
      where ps.contest_id = user_scores.contest_id
        and ps.user_id = user_scores.user_id
        and (ps.first_accepted_at is not null or ps.wrong_attempts > 0)
    ),
    '{}'::jsonb
  ) as problem_results
from user_scores;

alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.problem_versions enable row level security;
alter table public.problem_test_cases enable row level security;
alter table public.contests enable row level security;
alter table public.contest_problems enable row level security;
alter table public.contest_registrations enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_test_results enable row level security;
alter table public.judge_jobs enable row level security;
alter table public.ai_generations enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.custom_checker_reviews enable row level security;

create policy "profiles are publicly readable" on public.profiles
for select using (true);

create policy "users update their own profile fields" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "admins manage profiles" on public.profiles
for all using (public.is_admin())
with check (public.is_admin());

create policy "public problems are readable" on public.problems
for select using (visibility = 'public' or public.is_admin());

create policy "admins manage problems" on public.problems
for all using (public.is_admin())
with check (public.is_admin());

create policy "published problem versions are readable" on public.problem_versions
for select using (published_at is not null or public.is_admin());

create policy "admins manage problem versions" on public.problem_versions
for all using (public.is_admin())
with check (public.is_admin());

create policy "public tests are readable" on public.problem_test_cases
for select using (visibility = 'public' or public.is_admin());

create policy "admins manage test cases" on public.problem_test_cases
for all using (public.is_admin())
with check (public.is_admin());

create policy "public contests are readable" on public.contests
for select using (visibility in ('public', 'unlisted') or public.is_admin());

create policy "admins manage contests" on public.contests
for all using (public.is_admin())
with check (public.is_admin());

create policy "public contest problems are readable" on public.contest_problems
for select using (
  exists (
    select 1 from public.contests c
    where c.id = contest_id
      and c.visibility in ('public', 'unlisted')
      and now() >= c.starts_at
  )
  or public.is_admin()
);

create policy "admins manage contest problems" on public.contest_problems
for all using (public.is_admin())
with check (public.is_admin());

create policy "contest registrations are publicly readable" on public.contest_registrations
for select using (true);

create policy "users register themselves" on public.contest_registrations
for insert with check (
  auth.uid() = user_id
  and handle_snapshot = (select p.handle from public.profiles p where p.id = auth.uid())
  and exists (
    select 1 from public.contests c
    where c.id = contest_id
      and c.visibility in ('public', 'unlisted')
      and now() >= coalesce(c.registration_opens_at, '-infinity'::timestamptz)
      and now() < coalesce(c.registration_closes_at, c.starts_at)
  )
);

create policy "users delete their own registration" on public.contest_registrations
for delete using (
  auth.uid() = user_id
  and exists (
    select 1 from public.contests c
    where c.id = contest_id and now() < c.starts_at
  )
  and not exists (
    select 1 from public.submissions s
    where s.contest_id = contest_id and s.user_id = auth.uid()
  )
);

create policy "users read their own submissions" on public.submissions
for select using (auth.uid() = user_id or public.is_admin());

create policy "users read their own test results" on public.submission_test_results
for select using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id and (s.user_id = auth.uid() or public.is_admin())
  )
);

create policy "admins read ai generations" on public.ai_generations
for select using (public.is_admin());

create policy "admins manage ai generations" on public.ai_generations
for all using (public.is_admin())
with check (public.is_admin());

create policy "admins read audit logs" on public.admin_audit_logs
for select using (public.is_admin());

create policy "admins manage custom checker reviews" on public.custom_checker_reviews
for all using (public.is_admin())
with check (public.is_admin());

create policy "admins manage problem package artifacts" on storage.objects
for all using (bucket_id = 'problem-packages' and public.is_admin())
with check (bucket_id = 'problem-packages' and public.is_admin());

revoke all on function public.submit_solution(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.create_admin_contest(text, text, text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.lease_judge_job(text, integer) from public, anon, authenticated;
revoke all on function public.finalize_submission(uuid, public.verdict, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_solution(uuid, uuid, text) to authenticated;
grant execute on function public.create_admin_contest(text, text, text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, jsonb) to authenticated;
grant execute on function public.lease_judge_job(text, integer) to service_role;
grant execute on function public.finalize_submission(uuid, public.verdict, integer, integer, jsonb) to service_role;
