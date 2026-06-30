insert into public.problems (
  id,
  slug,
  title,
  difficulty,
  tags,
  visibility
)
values (
  '00000000-0000-4000-8000-000000000101',
  'sum-array',
  'Sum Array',
  'easy',
  array['implementation', 'prefix basics'],
  'public'
)
on conflict (slug) do nothing;

insert into public.problem_versions (
  id,
  problem_id,
  version,
  statement_md,
  time_limit_ms,
  memory_limit_mb,
  checker,
  checker_config,
  package_storage_path,
  package_checksum,
  published_at
)
values (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101',
  1,
  '# Sum Array

Given an array of integers, print the sum of its elements.',
  1000,
  256,
  'token',
  '{}'::jsonb,
  'problem-packages/sum-array/v1.zip',
  '49f7fdaa9037f4b20f80a69c64d0a5d71a20780d27fa8a927a9a880e9afe754e',
  now()
)
on conflict (problem_id, version) do nothing;

update public.problems
set current_version_id = '00000000-0000-4000-8000-000000000201'
where id = '00000000-0000-4000-8000-000000000101';

insert into public.problem_test_cases (
  problem_version_id,
  name,
  case_order,
  visibility,
  input_path,
  expected_path
)
values
  ('00000000-0000-4000-8000-000000000201', 'sample-1', 1, 'public', 'samples/1.in', 'samples/1.out'),
  ('00000000-0000-4000-8000-000000000201', 'sample-2', 2, 'public', 'samples/2.in', 'samples/2.out'),
  ('00000000-0000-4000-8000-000000000201', 'hidden-small', 3, 'hidden', 'tests/001.in', 'tests/001.out'),
  ('00000000-0000-4000-8000-000000000201', 'hidden-negative', 4, 'hidden', 'tests/002.in', 'tests/002.out')
on conflict (problem_version_id, case_order) do nothing;

insert into public.contests (
  id,
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
  published_at
)
values (
  '00000000-0000-4000-8000-000000000301',
  'summer-sprint-1',
  'Summer Sprint 1',
  'Seed ICPC-style Python contest.',
  '2026-06-30T00:00:00Z',
  '2026-07-05T17:55:00Z',
  '2026-07-05T18:00:00Z',
  '2026-07-05T20:00:00Z',
  '2026-07-05T19:30:00Z',
  '2026-07-05T20:05:00Z',
  'public',
  now()
)
on conflict (slug) do nothing;

insert into public.contest_problems (
  contest_id,
  problem_version_id,
  label,
  display_order
)
values (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000201',
  'A',
  1
)
on conflict (contest_id, problem_version_id) do nothing;
