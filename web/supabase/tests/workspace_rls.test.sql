begin;

create extension if not exists pgtap with schema extensions;
select plan(62);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'projects', 'projects table exists');
select has_table('public', 'requirements', 'requirements table exists');
select has_table('public', 'allocations', 'allocations table exists');

select ok(
  (select relrowsecurity from pg_catalog.pg_class
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and pg_class.relname = 'profiles'),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and pg_class.relname = 'projects'),
  'projects has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and pg_class.relname = 'requirements'),
  'requirements has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and pg_class.relname = 'allocations'),
  'allocations has RLS enabled'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'projects', 'requirements', 'allocations')
  ),
  16,
  'each workspace table has separate CRUD policies'
);
select ok(
  not has_table_privilege('anon', 'public.projects', 'SELECT'),
  'anonymous callers have no project table access'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.save_project_workspace(uuid,text,text,text,jsonb)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute the save RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.save_project_workspace(uuid,text,text,text,jsonb)',
    'EXECUTE'
  ),
  'authenticated callers can execute the save RPC'
);
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'owner_id', 'INSERT'),
  'authenticated callers cannot submit a project owner'
);
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'owner_id', 'UPDATE'),
  'authenticated callers cannot transfer a project owner'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.allocations',
    'calculated_payload',
    'INSERT'
  ),
  'authenticated callers cannot insert calculated allocation payloads'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.allocations',
    'calculated_payload',
    'UPDATE'
  ),
  'authenticated callers cannot update calculated allocation payloads'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'alice@example.test',
    '{"display_name":"Alice"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'bob@example.test',
    '{"display_name":"Bob"}'::jsonb
  );

insert into public.projects (id, owner_id, name, description, base_network)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Alpha workspace',
    null,
    '10.10.0.0/16'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Bravo workspace',
    null,
    '10.20.0.0/16'
  );

insert into public.requirements (
  id,
  project_id,
  position,
  name,
  required_hosts,
  point_to_point
)
values
  (
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    0,
    'Alpha users',
    100,
    false
  ),
  (
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    0,
    'Bravo users',
    200,
    false
  );

insert into public.allocations (id, requirement_id, calculated_payload)
values
  (
    'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    '{"cidr":"10.10.0.0/25"}'::jsonb
  ),
  (
    'bbbbbbbb-4444-4444-8444-bbbbbbbbbbbb',
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
    '{"cidr":"10.20.0.0/24"}'::jsonb
  );

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*) from public.profiles$$,
  array[1::bigint],
  'User A sees only their profile'
);
select results_eq(
  $$select count(*) from public.projects$$,
  array[1::bigint],
  'User A sees only their project'
);
select results_eq(
  $$select count(*) from public.requirements$$,
  array[1::bigint],
  'User A sees only requirements in their project'
);
select results_eq(
  $$select count(*) from public.allocations$$,
  array[1::bigint],
  'User A sees only allocations in their project'
);

select lives_ok(
  $$update public.profiles set display_name = 'Alice updated' where id = '11111111-1111-4111-8111-111111111111'$$,
  'User A can update their profile'
);
select lives_ok(
  $$update public.projects set name = 'Alpha updated' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'User A can update their project'
);
select lives_ok(
  $$update public.requirements set name = 'Alpha endpoints' where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$$,
  'User A can update a requirement in their project'
);

select lives_ok(
  $$
    select public.save_project_workspace(
      null,
      'RPC workspace',
      'Created atomically',
      '192.168.0.0/24',
      '[
        {"name":"Users","required_hosts":60,"point_to_point":false,"position":0},
        {"name":"WAN","required_hosts":2,"point_to_point":true,"position":1}
      ]'::jsonb
    )
  $$,
  'save RPC creates an owned workspace'
);
select results_eq(
  $$select owner_id from public.projects where name = 'RPC workspace'$$,
  array['11111111-1111-4111-8111-111111111111'::uuid],
  'save RPC derives owner_id from auth.uid()'
);
select results_eq(
  $$
    select count(*)
    from public.requirements
    where project_id = (select id from public.projects where name = 'RPC workspace')
  $$,
  array[2::bigint],
  'save RPC stores every validated requirement'
);
select results_eq(
  $$
    select count(*)
    from public.allocations
    join public.requirements on requirements.id = allocations.requirement_id
    where requirements.project_id = (
      select id from public.projects where name = 'RPC workspace'
    )
  $$,
  array[0::bigint],
  'save RPC stores no client-authored allocations'
);

select lives_ok(
  $$
    select public.save_project_workspace(
      (select id from public.projects where name = 'RPC workspace'),
      'RPC workspace updated',
      null,
      '192.168.1.0/24',
      '[{"name":"Servers","required_hosts":30,"position":0}]'::jsonb
    )
  $$,
  'save RPC replaces an owned workspace atomically'
);
select results_eq(
  $$select name from public.projects where name = 'RPC workspace updated'$$,
  array['RPC workspace updated'::text],
  'save RPC updates project fields'
);
select results_eq(
  $$
    select count(*)
    from public.requirements
    where project_id = (
      select id from public.projects where name = 'RPC workspace updated'
    )
  $$,
  array[1::bigint],
  'save RPC replaces the prior requirement set'
);

select throws_ok(
  $$
    select public.save_project_workspace(
      null,
      'Untrusted payload',
      null,
      '172.16.0.0/16',
      '[{"name":"Users","required_hosts":10,"calculated_payload":{}}]'::jsonb
    )
  $$,
  '22023',
  'Each requirement contains invalid or unsupported fields.',
  'save RPC rejects client-authored allocation data'
);
select throws_ok(
  $$
    select public.save_project_workspace(
      null,
      'Fractional hosts',
      null,
      '172.16.0.0/16',
      '[{"name":"Users","required_hosts":1.5}]'::jsonb
    )
  $$,
  '22023',
  'Host counts must be positive whole IPv4 values and positions must match array order.',
  'save RPC rejects fractional host counts'
);
select throws_ok(
  $$
    select public.save_project_workspace(
      null,
      'IPv6 project',
      null,
      '2001:db8::/32',
      '[{"name":"Users","required_hosts":10}]'::jsonb
    )
  $$,
  '23514',
  'new row for relation "projects" violates check constraint "projects_ipv4_network_check"',
  'save RPC rejects an IPv6 parent for the IPv4 workspace'
);
select throws_ok(
  $$
    select public.save_project_workspace(
      null,
      'Host-bit CIDR',
      null,
      '10.0.0.1/24',
      '[{"name":"Users","required_hosts":10}]'::jsonb
    )
  $$,
  '22P02',
  'invalid cidr value: "10.0.0.1/24"',
  'save RPC rejects a parent CIDR with host bits instead of normalizing it'
);
select throws_ok(
  $$
    select public.save_project_workspace(
      null,
      'Too many requirements',
      null,
      '172.16.0.0/16',
      (
        select jsonb_agg(
          jsonb_build_object('name', 'Network ' || requirement_number, 'required_hosts', 2)
        )
        from generate_series(1, 101) as requirement_number
      )
    )
  $$,
  '22023',
  'A project must contain between 1 and 100 requirements.',
  'save RPC enforces the absolute requirement limit'
);

select lives_ok(
  $$
    select public.save_project_workspace(
      null,
      'Third project slot',
      null,
      '172.17.0.0/16',
      '[{"name":"Users","required_hosts":10}]'::jsonb
    )
  $$,
  'User A can fill the third free project slot'
);
select throws_ok(
  $$
    select public.save_project_workspace(
      null,
      'Fourth project',
      null,
      '172.18.0.0/16',
      '[{"name":"Users","required_hosts":10}]'::jsonb
    )
  $$,
  'P0003',
  'The free plan allows at most 3 saved projects.',
  'serialized database enforcement rejects a fourth project'
);
select isnt_empty(
  $$delete from public.projects where name = 'RPC workspace updated' returning id$$,
  'User A can delete the temporary RPC workspace'
);
select isnt_empty(
  $$delete from public.projects where name = 'Third project slot' returning id$$,
  'User A can delete the other temporary workspace'
);

select throws_ok(
  $$
    insert into public.requirements (project_id, position, name, required_hosts)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, 'Intrusion', 10)
  $$,
  '42501',
  'Project not found.',
  'User A cannot insert a requirement into User B project'
);
select throws_ok(
  $$
    insert into public.allocations (requirement_id, calculated_payload)
    values (
      'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
      '{"cidr":"10.20.1.0/24"}'::jsonb
    )
  $$,
  '42501',
  'permission denied for table allocations',
  'User A cannot directly insert allocation payloads'
);

select is_empty(
  $$
    update public.profiles
    set display_name = 'Compromised'
    where id = '22222222-2222-4222-8222-222222222222'
    returning id
  $$,
  'User A cannot update User B profile'
);
select is_empty(
  $$
    delete from public.profiles
    where id = '22222222-2222-4222-8222-222222222222'
    returning id
  $$,
  'User A cannot delete User B profile'
);
select is_empty(
  $$
    update public.projects
    set name = 'Compromised'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    returning id
  $$,
  'User A cannot update User B project'
);
select is_empty(
  $$
    delete from public.projects
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    returning id
  $$,
  'User A cannot delete User B project'
);
select is_empty(
  $$
    update public.requirements
    set name = 'Compromised'
    where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
    returning id
  $$,
  'User A cannot update User B requirement'
);
select is_empty(
  $$
    delete from public.requirements
    where id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
    returning id
  $$,
  'User A cannot delete User B requirement'
);
select throws_ok(
  $$
    update public.allocations
    set calculated_payload = '{"cidr":"10.0.0.0/8"}'::jsonb
    where id = 'bbbbbbbb-4444-4444-8444-bbbbbbbbbbbb'
  $$,
  '42501',
  'permission denied for table allocations',
  'User A cannot update User B allocation'
);
select throws_ok(
  $$delete from public.allocations where id = 'bbbbbbbb-4444-4444-8444-bbbbbbbbbbbb'$$,
  '42501',
  'permission denied for table allocations',
  'User A cannot delete User B allocation'
);
select throws_ok(
  $$
    select public.save_project_workspace(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Compromised',
      null,
      '10.20.0.0/16',
      '[{"name":"Compromised","required_hosts":10}]'::jsonb
    )
  $$,
  'P0002',
  'Project not found.',
  'save RPC does not reveal or modify User B project'
);

select isnt_empty(
  $$
    delete from public.requirements
    where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
    returning id
  $$,
  'User A can delete their requirement even though its allocation is server-owned'
);
select results_eq(
  $$select count(*) from public.allocations$$,
  array[0::bigint],
  'deleting a requirement cascades its server-owned allocation'
);

select isnt_empty(
  $$
    delete from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'
    returning id
  $$,
  'User A can delete their profile'
);
select lives_ok(
  $$insert into public.profiles (display_name) values ('Alice restored')$$,
  'User A can recreate only their own profile from auth.uid()'
);
select results_eq(
  $$select count(*) from public.profiles$$,
  array[1::bigint],
  'User A still sees exactly one profile'
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

select results_eq(
  $$select count(*) from public.projects$$,
  array[1::bigint],
  'User B still sees exactly their project'
);
select results_eq(
  $$select name from public.projects$$,
  array['Bravo workspace'::text],
  'User B project was not modified by User A'
);
select results_eq(
  $$select name from public.requirements$$,
  array['Bravo users'::text],
  'User B requirement was not modified by User A'
);
select results_eq(
  $$select calculated_payload ->> 'cidr' from public.allocations$$,
  array['10.20.0.0/24'::text],
  'User B allocation was not modified by User A'
);
select results_eq(
  $$select display_name from public.profiles$$,
  array['Bob'::text],
  'User B profile was not modified by User A'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select throws_ok(
  $$select count(*) from public.projects$$,
  '42501',
  'permission denied for table projects',
  'anonymous callers cannot read projects'
);
select throws_ok(
  $$
    select public.save_project_workspace(
      null,
      'Anonymous project',
      null,
      '10.0.0.0/8',
      '[{"name":"Users","required_hosts":10}]'::jsonb
    )
  $$,
  '42501',
  'permission denied for function save_project_workspace',
  'anonymous callers cannot invoke the save RPC'
);

select * from finish();
rollback;
