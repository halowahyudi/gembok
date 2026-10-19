-- Rate limiting for the unauthenticated RPCs.
-- Both endpoints leak account existence, and the recovery path is sensitive, so
-- we cap requests per IP and per email before doing any work.

create table if not exists public.rate_limits (
  bucket   text primary key,
  count    int         not null,
  reset_at timestamptz not null
);

create index if not exists rate_limits_reset_idx on public.rate_limits (reset_at);

-- No policies: anon/authenticated must not read or write this table directly.
alter table public.rate_limits enable row level security;

-- Caller IP from PostgREST headers. Falls back to 'unknown' off-platform.
create or replace function public.client_ip()
returns text
language plpgsql
stable
as $$
declare
  v text;
begin
  begin
    v := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
  exception when others then
    v := null;
  end;
  if v is null or v = '' then
    return 'unknown';
  end if;
  return split_part(v, ',', 1);
end;
$$;

-- Fixed-window counter. Returns false when the bucket is over its limit.
create or replace function public.rate_limit(p_bucket text, p_limit int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.rate_limits where reset_at < now() - interval '1 day';

  insert into public.rate_limits as r (bucket, count, reset_at)
  values (p_bucket, 1, now() + p_window)
  on conflict (bucket) do update
    set count = case when r.reset_at <= now() then 1 else r.count + 1 end,
        reset_at = case when r.reset_at <= now() then now() + p_window else r.reset_at end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.rate_limit(text, int, interval) from public;
revoke all on function public.client_ip() from public;

-- Re-create the anon lookups with rate limiting.
create or replace function public.get_login_hints(p_email text)
returns table (
  kdf_salt            bytea,
  kdf_params          jsonb,
  secret_key_verifier bytea
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not public.rate_limit('login_hints:ip:' || public.client_ip(), 30, interval '5 minutes') then
    raise exception 'rate limit exceeded' using errcode = 'P0001';
  end if;
  if not public.rate_limit('login_hints:email:' || v_email, 10, interval '1 hour') then
    raise exception 'rate limit exceeded' using errcode = 'P0001';
  end if;

  return query
    select p.kdf_salt, p.kdf_params, p.secret_key_verifier
    from public.profiles p
    join auth.users u on u.id = p.user_id
    where lower(u.email) = v_email
    limit 1;
end;
$$;

create or replace function public.get_recovery_blob(p_email text)
returns table (
  kdf_salt                    bytea,
  kdf_params                  jsonb,
  protected_user_key_recovery bytea
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not public.rate_limit('recovery:ip:' || public.client_ip(), 10, interval '10 minutes') then
    raise exception 'rate limit exceeded' using errcode = 'P0001';
  end if;
  if not public.rate_limit('recovery:email:' || v_email, 5, interval '1 hour') then
    raise exception 'rate limit exceeded' using errcode = 'P0001';
  end if;

  return query
    select p.kdf_salt, p.kdf_params, p.protected_user_key_recovery
    from public.profiles p
    join auth.users u on u.id = p.user_id
    where lower(u.email) = v_email
    limit 1;
end;
$$;

revoke all on function public.get_login_hints(text) from public;
grant execute on function public.get_login_hints(text) to anon, authenticated;

revoke all on function public.get_recovery_blob(text) from public;
grant execute on function public.get_recovery_blob(text) to anon, authenticated;

notify pgrst, 'reload schema';
