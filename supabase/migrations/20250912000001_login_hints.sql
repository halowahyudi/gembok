-- Login validation helpers. Adds a secret-key verifier and an anon-callable
-- lookup, so the client can say "unknown email" or "wrong secret key" without
-- running Argon2 first.

alter table public.profiles
  add column if not exists secret_key_verifier bytea;

-- Login hints for an email. Exposed to anon on purpose: the salt isn't secret,
-- and the verifier can't be reversed (the secret key is 128-bit random). Rows
-- created before this migration have a null verifier and skip the check.
create or replace function public.get_login_hints(p_email text)
returns table (
  kdf_salt            bytea,
  kdf_params          jsonb,
  secret_key_verifier bytea
)
language sql
security definer
set search_path = public
stable
as $$
  select p.kdf_salt, p.kdf_params, p.secret_key_verifier
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.get_login_hints(text) from public;
grant execute on function public.get_login_hints(text) to anon, authenticated;

notify pgrst, 'reload schema';
