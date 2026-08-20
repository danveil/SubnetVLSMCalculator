begin;

-- Internal trigger functions live outside every Data API exposed schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    display_name is null
    or (
      display_name = btrim(display_name)
      and char_length(display_name) between 1 and 80
    )
  )
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text,
  base_network text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_check check (
    name = btrim(name)
    and char_length(name) between 1 and 80
  ),
  constraint projects_description_check check (
    description is null or char_length(description) <= 500
  ),
  constraint projects_ipv4_network_check check (
    base_network = btrim(base_network)
    and family(base_network::cidr) = 4
    and base_network = (base_network::cidr)::text
  )
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  position integer not null,
  name text not null,
  required_hosts bigint not null,
  point_to_point boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requirements_position_check check (position >= 0),
  constraint requirements_name_check check (
    name = btrim(name)
    and char_length(name) between 1 and 80
  ),
  constraint requirements_required_hosts_check check (
    required_hosts between 1 and 4294967294
  ),
  constraint requirements_project_position_key unique (project_id, position)
);

create unique index requirements_project_normalized_name_key
  on public.requirements (project_id, lower(btrim(name)));

create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null unique references public.requirements (id) on delete cascade,
  calculated_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint allocations_payload_object_check check (
    jsonb_typeof(calculated_payload) = 'object'
  ),
  constraint allocations_payload_size_check check (
    pg_column_size(calculated_payload) <= 1048576
  )
);

create index projects_owner_id_idx on public.projects (owner_id);
create index requirements_project_id_idx on public.requirements (project_id);

comment on table public.profiles is
  'Private application profile paired one-to-one with an auth.users row.';
comment on table public.projects is
  'A private saved subnet/VLSM workspace owned by one authenticated user.';
comment on table public.requirements is
  'Ordered network requirements belonging to a saved project.';
comment on table public.allocations is
  'Server-validated, reproducible allocation results; browser results are never authoritative.';

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create function private.enforce_project_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' and request_user_id is not null then
    -- A browser cannot choose an owner, even if it submits an owner_id field.
    new.owner_id := request_user_id;
  elsif tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id then
    raise exception 'A project owner cannot be changed.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := nullif(
    left(
      btrim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'full_name',
          ''
        )
      ),
      80
    ),
    ''
  );

  insert into public.profiles (id, display_name)
  values (new.id, profile_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create function private.enforce_requirement_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Locking the parent serializes concurrent inserts so two requests cannot both
  -- observe slot 100 as available.
  perform 1
  from public.projects
  where projects.id = new.project_id
  for update;

  if not found then
    raise exception 'Project not found.' using errcode = '42501';
  end if;

  if (
    select count(*)
    from public.requirements
    where requirements.project_id = new.project_id
  ) >= 100 then
    raise exception 'A project cannot contain more than 100 requirements.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function private.enforce_free_project_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
begin
  -- Administrative inserts do not carry an end-user JWT and are intentionally
  -- outside the product-plan path.
  if request_user_id is null then
    return new;
  end if;

  -- The per-user transaction lock makes the count and insert one serialized
  -- operation, including concurrent direct RPC calls.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(request_user_id::text, 0)
  );

  if (
    select count(*)
    from public.projects
    where projects.owner_id = request_user_id
  ) >= 3 then
    raise exception 'The free plan allows at most 3 saved projects.'
      using errcode = 'P0003';
  end if;

  return new;
end;
$$;

create function private.touch_project_from_requirement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.projects
    set updated_at = statement_timestamp()
    where projects.id = old.project_id;
    return old;
  end if;

  update public.projects
  set updated_at = statement_timestamp()
  where projects.id = new.project_id
    or (tg_op = 'UPDATE' and projects.id = old.project_id);

  return new;
end;
$$;

create function private.touch_project_from_allocation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.projects
    set updated_at = statement_timestamp()
    from public.requirements
    where requirements.id = old.requirement_id
      and projects.id = requirements.project_id;
    return old;
  end if;

  update public.projects
  set updated_at = statement_timestamp()
  from public.requirements
  where (
      requirements.id = new.requirement_id
      or (tg_op = 'UPDATE' and requirements.id = old.requirement_id)
    )
    and projects.id = requirements.project_id;

  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.enforce_project_owner() from public, anon, authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function private.enforce_requirement_limit() from public, anon, authenticated;
revoke execute on function private.enforce_free_project_limit() from public, anon, authenticated;
revoke execute on function private.touch_project_from_requirement() from public, anon, authenticated;
revoke execute on function private.touch_project_from_allocation() from public, anon, authenticated;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger set_projects_owner
before insert or update on public.projects
for each row execute function private.enforce_project_owner();

create trigger enforce_free_projects_limit
before insert on public.projects
for each row execute function private.enforce_free_project_limit();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function private.set_updated_at();

create trigger set_requirements_updated_at
before update on public.requirements
for each row execute function private.set_updated_at();

create trigger enforce_requirements_limit
before insert on public.requirements
for each row execute function private.enforce_requirement_limit();

create trigger touch_project_after_requirement_change
after insert or update or delete on public.requirements
for each row execute function private.touch_project_from_requirement();

create trigger set_allocations_updated_at
before update on public.allocations
for each row execute function private.set_updated_at();

create trigger touch_project_after_allocation_change
after insert or update or delete on public.allocations
for each row execute function private.touch_project_from_allocation();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.requirements enable row level security;
alter table public.allocations enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy profiles_delete_own
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

create policy projects_select_own
on public.projects for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy projects_insert_own
on public.projects for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy projects_update_own
on public.projects for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy projects_delete_own
on public.projects for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy requirements_select_own
on public.requirements for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy requirements_insert_own
on public.requirements for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy requirements_update_own
on public.requirements for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy requirements_delete_own
on public.requirements for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy allocations_select_own
on public.allocations for select
to authenticated
using (
  exists (
    select 1
    from public.requirements
    join public.projects on projects.id = requirements.project_id
    where requirements.id = allocations.requirement_id
      and projects.owner_id = (select auth.uid())
  )
);

-- These write policies are ownership backstops, not write authorization by
-- themselves. The explicit grants below keep authenticated clients read-only;
-- adding an allocation write grant later would break the server-owned boundary.
create policy allocations_insert_own
on public.allocations for insert
to authenticated
with check (
  exists (
    select 1
    from public.requirements
    join public.projects on projects.id = requirements.project_id
    where requirements.id = allocations.requirement_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy allocations_update_own
on public.allocations for update
to authenticated
using (
  exists (
    select 1
    from public.requirements
    join public.projects on projects.id = requirements.project_id
    where requirements.id = allocations.requirement_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.requirements
    join public.projects on projects.id = requirements.project_id
    where requirements.id = allocations.requirement_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy allocations_delete_own
on public.allocations for delete
to authenticated
using (
  exists (
    select 1
    from public.requirements
    join public.projects on projects.id = requirements.project_id
    where requirements.id = allocations.requirement_id
      and projects.owner_id = (select auth.uid())
  )
);

-- Do not depend on Supabase's evolving default grants. The Data API receives only
-- the exact table and column privileges required by an authenticated user.
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.projects from public, anon, authenticated;
revoke all on table public.requirements from public, anon, authenticated;
revoke all on table public.allocations from public, anon, authenticated;

grant select, delete on table public.profiles to authenticated;
grant insert (display_name) on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

grant select, delete on table public.projects to authenticated;
grant insert (name, description, base_network) on table public.projects to authenticated;
grant update (name, description, base_network) on table public.projects to authenticated;

grant select, delete on table public.requirements to authenticated;
grant insert (project_id, position, name, required_hosts, point_to_point)
  on table public.requirements to authenticated;
grant update (position, name, required_hosts, point_to_point)
  on table public.requirements to authenticated;

-- Allocation rows are readable by their owner but writable only from a trusted
-- server path. Granting browser roles INSERT/UPDATE would make a JSON payload
-- "trusted" merely because a client submitted it.
grant select on table public.allocations to authenticated;

-- One transactionally safe write boundary for the dashboard. Passing NULL as
-- p_project_id creates a project; passing an owned ID replaces that workspace.
-- Input requirements contain name, required_hosts, optional point_to_point, and
-- an optional zero-based position matching array order. Allocation payloads are
-- intentionally outside this RPC.
create function public.save_project_workspace(
  p_project_id uuid,
  p_name text,
  p_description text,
  p_base_network text,
  p_requirements jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  saved_project_id uuid;
  requirement_count integer;
begin
  if request_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_requirements is null or jsonb_typeof(p_requirements) <> 'array' then
    raise exception 'Requirements must be a JSON array.' using errcode = '22023';
  end if;

  requirement_count := jsonb_array_length(p_requirements);
  if requirement_count < 1 or requirement_count > 100 then
    raise exception 'A project must contain between 1 and 100 requirements.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_requirements) as requirement(value)
    where jsonb_typeof(requirement.value) <> 'object'
  ) then
    raise exception 'Every requirement must be a JSON object.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_requirements) as requirement(value)
    where not (requirement.value ? 'name')
      or jsonb_typeof(requirement.value -> 'name') <> 'string'
      or not (requirement.value ? 'required_hosts')
      or jsonb_typeof(requirement.value -> 'required_hosts') <> 'number'
      or (
        requirement.value ? 'point_to_point'
        and jsonb_typeof(requirement.value -> 'point_to_point') <> 'boolean'
      )
      or (
        requirement.value ? 'position'
        and jsonb_typeof(requirement.value -> 'position') <> 'number'
      )
      or exists (
        select 1
        from jsonb_object_keys(requirement.value) as field(name)
        where field.name not in (
          'name',
          'required_hosts',
          'point_to_point',
          'position'
        )
      )
  ) then
    raise exception
      'Each requirement contains invalid or unsupported fields.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_requirements) with ordinality
      as requirement(value, ordinality)
    where (requirement.value ->> 'required_hosts')::numeric
        <> trunc((requirement.value ->> 'required_hosts')::numeric)
      or (requirement.value ->> 'required_hosts')::numeric not between 1 and 4294967294
      or (
        requirement.value ? 'position'
        and (
          (requirement.value ->> 'position')::numeric
            <> trunc((requirement.value ->> 'position')::numeric)
          or (requirement.value ->> 'position')::numeric
            <> requirement.ordinality - 1
        )
      )
  ) then
    raise exception
      'Host counts must be positive whole IPv4 values and positions must match array order.'
      using errcode = '22023';
  end if;

  if p_project_id is null then
    insert into public.projects (name, description, base_network)
    values (
      btrim(p_name),
      nullif(btrim(p_description), ''),
      btrim(p_base_network)
    )
    returning id into saved_project_id;
  else
    select projects.id
    into saved_project_id
    from public.projects
    where projects.id = p_project_id
      and projects.owner_id = request_user_id
    for update;

    if saved_project_id is null then
      raise exception 'Project not found.' using errcode = 'P0002';
    end if;

    update public.projects
    set name = btrim(p_name),
        description = nullif(btrim(p_description), ''),
        base_network = btrim(p_base_network)
    where projects.id = saved_project_id;

    delete from public.requirements
    where requirements.project_id = saved_project_id;
  end if;

  insert into public.requirements (
    project_id,
    position,
    name,
    required_hosts,
    point_to_point
  )
  select
    saved_project_id,
    (requirement.ordinality - 1)::integer,
    btrim(requirement.value ->> 'name'),
    (requirement.value ->> 'required_hosts')::bigint,
    coalesce((requirement.value ->> 'point_to_point')::boolean, false)
  from jsonb_array_elements(p_requirements) with ordinality as requirement(value, ordinality);

  return saved_project_id;
end;
$$;

comment on function public.save_project_workspace(uuid, text, text, text, jsonb) is
  'Atomically creates or replaces an authenticated user owned project and its requirements.';

revoke execute on function public.save_project_workspace(uuid, text, text, text, jsonb)
  from public, anon;
grant execute on function public.save_project_workspace(uuid, text, text, text, jsonb)
  to authenticated;

commit;
