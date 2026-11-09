-- =====================================================================
-- BalikBarangay - Post-Calamity Recovery Tracker
-- Supabase / PostgreSQL schema (tables, security, triggers, storage)
-- Run this ONCE in: Supabase dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Reference + profile tables
-- ---------------------------------------------------------------------
create table if not exists public.puroks (
  id   serial primary key,
  name text not null unique
);

insert into public.puroks (name)
select 'Purok ' || g from generate_series(1, 7) g
on conflict (name) do nothing;

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  phone      text,
  role       text not null default 'resident'
             check (role in ('resident', 'encoder', 'verifier', 'admin')),
  purok_id   int references public.puroks(id),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Helper functions (SECURITY DEFINER so they can read profiles
--    without being blocked by row level security)
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('encoder', 'verifier', 'admin'), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

-- Auto-create a resident profile whenever someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change role / active flag (SQL editor, where auth.uid() is null, is allowed)
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only administrators can change roles or account status';
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- 3. Cases
-- ---------------------------------------------------------------------
create sequence if not exists public.case_code_seq;

create table if not exists public.cases (
  id             uuid primary key default gen_random_uuid(),
  tracking_code  text unique not null,
  submitted_by   uuid not null references public.profiles(id),
  category       text not null check (category in
                   ('damaged_home', 'blocked_road', 'public_facility', 'water_power', 'assistance')),
  description    text not null check (char_length(description) between 5 and 2000),
  purok_id       int references public.puroks(id),
  landmark       text,
  lat            double precision,
  lng            double precision,
  incident_date  date,
  status         text not null default 'submitted' check (status in
                   ('submitted', 'needs_info', 'under_verification', 'verified', 'assigned',
                    'in_progress', 'awaiting_external', 'resolved_pending', 'closed',
                    'reopened', 'rejected')),
  priority       text check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_team  text,
  next_action    text,
  due_date       date,
  closed_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists cases_submitted_by_idx on public.cases (submitted_by);
create index if not exists cases_status_idx on public.cases (status);
create index if not exists cases_purok_idx on public.cases (purok_id);

-- Human-readable tracking code, e.g. BB-2611-00042
create or replace function public.set_tracking_code()
returns trigger language plpgsql as $$
begin
  new.tracking_code := 'BB-' || to_char(now(), 'YYMM') || '-' ||
                       lpad(nextval('public.case_code_seq')::text, 5, '0');
  return new;
end $$;

drop trigger if exists set_tracking_code on public.cases;
create trigger set_tracking_code
  before insert on public.cases
  for each row execute function public.set_tracking_code();

-- Business rules on update: who may verify / close, reasons required, timestamps
create or replace function public.enforce_case_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('verified', 'rejected')
       and public.my_role() not in ('verifier', 'admin') then
      raise exception 'Only verifiers or administrators can verify or reject a case';
    end if;
    if new.status = 'closed' and public.my_role() <> 'admin' then
      raise exception 'Only administrators can close a case';
    end if;
    if new.status in ('closed', 'rejected') and coalesce(trim(new.closed_reason), '') = '' then
      raise exception 'A reason is required to close or reject a case';
    end if;
    if new.status = 'reopened' then
      new.closed_reason := null;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists enforce_case_rules on public.cases;
create trigger enforce_case_rules
  before update on public.cases
  for each row execute function public.enforce_case_rules();

-- ---------------------------------------------------------------------
-- 4. Timeline, evidence, verification, audit
-- ---------------------------------------------------------------------
create table if not exists public.case_updates (
  id                  uuid primary key default gen_random_uuid(),
  case_id             uuid not null references public.cases(id) on delete cascade,
  author_id           uuid references public.profiles(id),
  status              text,
  note                text,
  visible_to_resident boolean not null default true,
  created_at          timestamptz not null default now()
);
create index if not exists case_updates_case_idx on public.case_updates (case_id, created_at desc);

create table if not exists public.case_media (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  storage_path text not null,
  kind         text not null default 'report'
               check (kind in ('report', 'verification', 'progress', 'completion')),
  uploaded_by  uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists case_media_case_idx on public.case_media (case_id);

create table if not exists public.verifications (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  verifier_id uuid not null references public.profiles(id),
  outcome     text not null check (outcome in ('confirmed', 'rejected', 'needs_info')),
  findings    text not null,
  verified_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id          bigserial primary key,
  actor_id    uuid,
  action      text not null,
  record_type text not null,
  record_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

-- Every case creation / change is logged against the authenticated account
create or replace function public.audit_case_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, action, record_type, record_id, details)
  values (
    auth.uid(), tg_op, 'case', new.id,
    case when tg_op = 'UPDATE' then jsonb_build_object(
           'status_from', old.status, 'status_to', new.status,
           'priority_to', new.priority, 'assigned_team', new.assigned_team)
         else jsonb_build_object('status', new.status) end
  );
  return new;
end $$;

drop trigger if exists audit_case_changes on public.cases;
create trigger audit_case_changes
  after insert or update on public.cases
  for each row execute function public.audit_case_changes();

-- First timeline entry when a report is received
create or replace function public.log_case_received()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.case_updates (case_id, author_id, status, note, visible_to_resident)
  values (new.id, new.submitted_by, 'submitted',
          'Report received. It has not yet been verified by the barangay.', true);
  return new;
end $$;

drop trigger if exists log_case_received on public.cases;
create trigger log_case_received
  after insert on public.cases
  for each row execute function public.log_case_received();

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.puroks        enable row level security;
alter table public.profiles      enable row level security;
alter table public.cases         enable row level security;
alter table public.case_updates  enable row level security;
alter table public.case_media    enable row level security;
alter table public.verifications enable row level security;
alter table public.audit_logs    enable row level security;

-- puroks
drop policy if exists "puroks read" on public.puroks;
create policy "puroks read" on public.puroks for select to authenticated using (true);
drop policy if exists "puroks admin write" on public.puroks;
create policy "puroks admin write" on public.puroks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'resident' and active = true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- cases
drop policy if exists "cases read" on public.cases;
create policy "cases read" on public.cases for select to authenticated
  using (submitted_by = auth.uid() or public.is_staff());
drop policy if exists "cases insert own" on public.cases;
create policy "cases insert own" on public.cases for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and public.my_role() is not null
    and status = 'submitted'
    and priority is null
    and assigned_team is null
  );
drop policy if exists "cases staff update" on public.cases;
create policy "cases staff update" on public.cases for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- case_updates (internal notes have visible_to_resident = false)
drop policy if exists "updates read" on public.case_updates;
create policy "updates read" on public.case_updates for select to authenticated
  using (
    public.is_staff()
    or (visible_to_resident and exists (
          select 1 from public.cases c
          where c.id = case_updates.case_id and c.submitted_by = auth.uid()))
  );
drop policy if exists "updates staff insert" on public.case_updates;
create policy "updates staff insert" on public.case_updates for insert to authenticated
  with check (public.is_staff() and author_id = auth.uid());

-- case_media
drop policy if exists "media read" on public.case_media;
create policy "media read" on public.case_media for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.cases c
               where c.id = case_media.case_id and c.submitted_by = auth.uid())
  );
drop policy if exists "media insert" on public.case_media;
create policy "media insert" on public.case_media for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_staff()
      or (kind = 'report' and exists (
            select 1 from public.cases c
            where c.id = case_media.case_id and c.submitted_by = auth.uid()))
    )
  );

-- verifications (staff only; only verifiers/admins may record a decision)
drop policy if exists "verifications read" on public.verifications;
create policy "verifications read" on public.verifications for select to authenticated
  using (public.is_staff());
drop policy if exists "verifications insert" on public.verifications;
create policy "verifications insert" on public.verifications for insert to authenticated
  with check (public.my_role() in ('verifier', 'admin') and verifier_id = auth.uid());

-- audit logs (admins read only; written by trigger)
drop policy if exists "audit read" on public.audit_logs;
create policy "audit read" on public.audit_logs for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 6. Private photo storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('case-media', 'case-media', false)
on conflict (id) do nothing;

drop policy if exists "case-media read" on storage.objects;
create policy "case-media read" on storage.objects for select to authenticated
  using (
    bucket_id = 'case-media'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.case_media cm
        join public.cases c on c.id = cm.case_id
        where cm.storage_path = storage.objects.name and c.submitted_by = auth.uid())
    )
  );

drop policy if exists "case-media upload" on storage.objects;
create policy "case-media upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'case-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 7. Privacy-safe public summary (aggregates only; groups under 3 hidden)
-- ---------------------------------------------------------------------
create or replace function public.public_summary()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total',  (select count(*) from public.cases where status <> 'rejected'),
    'closed', (select count(*) from public.cases where status = 'closed'),
    'by_status', coalesce((
      select jsonb_agg(jsonb_build_object('label', status, 'count', c))
      from (select status, count(*) c from public.cases
            where status <> 'rejected' group by status having count(*) >= 3) s), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('label', category, 'count', c))
      from (select category, count(*) c from public.cases
            where status <> 'rejected' group by category having count(*) >= 3) s), '[]'::jsonb),
    'by_purok', coalesce((
      select jsonb_agg(jsonb_build_object('label', p.name, 'count', x.c, 'closed', x.r))
      from (select purok_id, count(*) c, count(*) filter (where status = 'closed') r
            from public.cases
            where status <> 'rejected' and purok_id is not null
            group by purok_id having count(*) >= 3) x
      join public.puroks p on p.id = x.purok_id), '[]'::jsonb),
    'generated_at', now()
  )
$$;

grant execute on function public.public_summary() to anon, authenticated;

-- =====================================================================
-- To make YOUR account the first administrator, after signing up in the
-- app, run (replace the email):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- =====================================================================
