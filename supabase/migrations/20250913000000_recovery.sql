-- Account recovery.
-- Adds a recovery-phrase verifier, an anon lookup for the wrapped userKey, and
-- an internal helper the recovery edge function uses to resolve a user id.

alter table public.profiles
  add column if not exists recovery_auth_hash bytea;

-- Returned to anon so a client can unwrap userKey with the 24-word phrase.
-- None of these are secret: the salt isn't, and the wrapped key still needs the
-- phrase to open.
create or replace function public.get_recovery_blob(p_email text)
returns table (
  kdf_salt                    bytea,
  kdf_params                  jsonb,
  protected_user_key_recovery bytea
)
language sql
security definer
set search_path = public
stable
as $$
  select p.kdf_salt, p.kdf_params, p.protected_user_key_recovery
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.get_recovery_blob(text) from public;
grant execute on function public.get_recovery_blob(text) to anon, authenticated;

-- Email -> user id, for the recovery edge function. Not exposed to anon; only
-- the service role (the function) needs it.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to service_role;

notify pgrst, 'reload schema';
