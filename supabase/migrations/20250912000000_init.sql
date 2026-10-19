-- Gembok schema. The server only ever sees ciphertext and a little metadata;
-- sensitive columns are bytea blobs encrypted on the device. Design notes are in
-- docs/ARCHITECTURE.md (section 6).

-- Account key material + KDF settings. One row per user.
create table if not exists public.profiles (
  user_id                     uuid primary key references auth.users (id) on delete cascade,
  kdf_salt                    bytea       not null,
  kdf_params                  jsonb       not null,
  protected_user_key          bytea       not null,
  protected_user_key_recovery bytea       not null,
  cipher_version              int         not null default 1,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Vault. In v1 items are encrypted with userKey directly; the per-vault key is
-- for sharing later.
create table if not exists public.vaults (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid        not null references auth.users (id) on delete cascade,
  protected_vault_key bytea,
  cipher_version      int         not null default 1,
  created_at          timestamptz not null default now()
);

-- Sequence behind the sync cursor.
create sequence if not exists public.items_change_seq;

-- Items, encrypted. Deletes are tombstones so they can sync out.
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid   not null references auth.users (id) on delete cascade,
  vault_id    uuid   not null references public.vaults (id) on delete cascade,
  ciphertext  bytea  not null,
  iv          bytea  not null,
  rev         bigint not null default 1,
  change_seq  bigint not null default nextval('public.items_change_seq'),
  deleted_at  timestamptz,
  updated_at  timestamptz not null default now()
);

create index if not exists items_sync_idx on public.items (user_id, change_seq);
create index if not exists vaults_owner_idx on public.vaults (owner_id);

-- Devices and their sync cursor.
create table if not exists public.devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text,
  last_cursor bigint      not null default 0,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- RLS on top of the encryption, as a second layer.
alter table public.profiles enable row level security;
alter table public.vaults   enable row level security;
alter table public.items    enable row level security;
alter table public.devices  enable row level security;

-- Drop any existing policies first. DROP POLICY needs the table to exist, so
-- guard each one with to_regclass.
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'vaults', 'items', 'devices'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_own', t);
    end if;
  end loop;
end $$;

create policy profiles_own on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vaults_own on public.vaults
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy items_own on public.items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy devices_own on public.devices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
