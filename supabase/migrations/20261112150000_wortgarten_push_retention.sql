-- Reminder devices were deleted after 30 days without opening the app, which is exactly
-- when a reminder is most useful. Retain them for 120 days; expired endpoints are still
-- removed as soon as the push service answers 404/410.
create or replace function public.wortgarten_push_store(p_secret text, p_action text, p_args jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare
  h text := p_args->>'token_hash';
  ep text := p_args->>'endpoint_hash';
  tz text := p_args->>'timezone';
  hh integer;
  due_at timestamptz;
  acquired boolean;
  sub jsonb;
  answer jsonb;
  ts timestamptz := pg_catalog.clock_timestamp();
begin
  if coalesce(length(p_secret),0)<>64 or not exists (
    select 1 from wortgarten_push.credential
    where singleton and digest=pg_catalog.sha256(pg_catalog.convert_to(p_secret,'UTF8'))
  ) then
    raise sqlstate '42501' using message='Notification service credential denied';
  end if;

  if p_action='health' then return '{"ok":true}'::jsonb; end if;

  if p_action='claim_due' then
    delete from wortgarten_push.throttle where expires_at < ts;
    -- Keep lapsed learners subscribed long enough for reminders to bring them back.
    delete from wortgarten_push.device where updated_at < ts - interval '120 days';
    with chosen as (
      select token_hash,(ts at time zone timezone)::date as local_day
      from wortgarten_push.device
      where next_due <= ts
        and extract(hour from (ts at time zone timezone)) >= hour
        and sent_on is distinct from (ts at time zone timezone)::date
      order by next_due,token_hash limit 20 for update skip locked
    ), claimed as (
      update wortgarten_push.device d set sent_on=c.local_day
      from chosen c where d.token_hash=c.token_hash
      returning d.token_hash,d.subscription,c.local_day
    )
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(claimed)),'[]'::jsonb) into answer from claimed;
    return answer;
  end if;

  if coalesce(h,'') !~ '^[a-f0-9]{64}$' then
    raise sqlstate '22023' using message='Invalid device';
  end if;

  if p_action='remove' then
    delete from wortgarten_push.device where token_hash=h
      and (p_args->>'endpoint_hash' is null or endpoint_hash=ep);
    return '{"status":"ok"}'::jsonb;
  elsif p_action='release' then
    update wortgarten_push.device set sent_on=null
    where token_hash=h and endpoint_hash=ep and sent_on=(p_args->>'local_day')::date;
    return '{"status":"ok"}'::jsonb;
  elsif p_action='test' then
    update wortgarten_push.device set last_test=ts
    where token_hash=h and (last_test is null or last_test<ts-interval '1 minute')
    returning subscription into sub;
    if found then return pg_catalog.jsonb_build_object('status','ok','subscription',sub); end if;
    if exists(select 1 from wortgarten_push.device where token_hash=h) then return '{"status":"throttled"}'::jsonb; end if;
    return '{"status":"missing"}'::jsonb;
  elsif p_action='settings' then
    hh := (p_args->>'hour')::integer;
    due_at := pg_catalog.to_timestamp((p_args->>'next_due')::double precision / 1000);
    if hh is null or hh not between 0 and 23 or coalesce(length(tz),0) not between 1 and 80
       or not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then
      raise sqlstate '22023' using message='Invalid schedule';
    end if;
    if p_args->'subscription' is null then
      update wortgarten_push.device set hour=hh,timezone=tz,next_due=due_at,updated_at=ts where token_hash=h;
      if found then return '{"status":"ok"}'::jsonb; end if;
      return '{"status":"missing"}'::jsonb;
    end if;
    if coalesce(ep,'') !~ '^[a-f0-9]{64}$' or pg_catalog.jsonb_typeof(p_args->'subscription')<>'object' then
      raise sqlstate '22023' using message='Invalid subscription';
    end if;
    if not exists(select 1 from wortgarten_push.device where token_hash=h) then
      insert into wortgarten_push.throttle as t(key,expires_at)
      values ('signup:'||(p_args->>'client_hash'),ts+interval '1 minute')
      on conflict (key) do update set expires_at=excluded.expires_at where t.expires_at<=ts returning true into acquired;
      if acquired is distinct from true then return '{"status":"throttled"}'::jsonb; end if;
    end if;
    begin
      insert into wortgarten_push.device as d(token_hash,endpoint_hash,subscription,hour,timezone,next_due,updated_at)
      values(h,ep,p_args->'subscription',hh,tz,due_at,ts)
      on conflict(token_hash) do update set endpoint_hash=excluded.endpoint_hash,subscription=excluded.subscription,
        hour=excluded.hour,timezone=excluded.timezone,next_due=excluded.next_due,updated_at=excluded.updated_at,
        sent_on=case when d.endpoint_hash=excluded.endpoint_hash then d.sent_on else null end;
    exception when unique_violation then
      return '{"status":"conflict"}'::jsonb;
    end;
    return '{"status":"ok"}'::jsonb;
  end if;
  raise sqlstate '22023' using message='Unsupported notification operation';
end
$fn$;

revoke all on function public.wortgarten_push_store(text,text,jsonb) from public, authenticated, anon;
grant execute on function public.wortgarten_push_store(text,text,jsonb) to anon;
