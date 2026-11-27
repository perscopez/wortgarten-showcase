create schema if not exists wortgarten_private;
revoke all on schema wortgarten_private from public,anon;
grant usage on schema wortgarten_private to authenticated;
create or replace function wortgarten_private.verified_user() returns boolean
language sql stable security definer set search_path='' as $$
 select not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and not coalesce(is_anonymous,false))
$$;
revoke all on function wortgarten_private.verified_user() from public,anon;
grant execute on function wortgarten_private.verified_user() to authenticated;
drop policy if exists wortgarten_own_read on public.wortgarten_sync_items;
create policy wortgarten_own_read on public.wortgarten_sync_items for select to authenticated
 using(user_id=(select auth.uid()) and (select wortgarten_private.verified_user()));
create or replace function public.wortgarten_sync_commit(operations jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 subject uuid:=auth.uid(); op jsonb; current public.wortgarten_sync_items%rowtype;
 expected bigint; desired jsonb; removal boolean; accepted boolean; result jsonb:='[]'::jsonb;
begin
 if subject is null or not wortgarten_private.verified_user() then raise exception 'Verified email authentication required' using errcode='42501'; end if;
 if coalesce(jsonb_typeof(operations),'')<>'array' or jsonb_array_length(operations)>100 then raise exception 'Invalid batch'; end if;
 if (select count(*)<>count(distinct value->>'key') from jsonb_array_elements(operations)) then raise exception 'Duplicate mutation key'; end if;
 for op in select value from jsonb_array_elements(operations) order by value->>'key' loop
  if coalesce(jsonb_typeof(op->'key'),'')<>'string' or ((op->>'key')!~'^(card|learning|setting):[^[:cntrl:]]{1,500}$' or position('__proto__' in (op->>'key'))>0)
   or coalesce(jsonb_typeof(op->'deleted'),'')<>'boolean' or coalesce(jsonb_typeof(op->'expected_version'),'')<>'number' or (op->>'expected_version')!~'^[0-9]+$'
   or not (op ? 'body') then raise exception 'Invalid mutation'; end if;
  expected:=(op->>'expected_version')::bigint; removal:=(op->>'deleted')::boolean;
  if expected<0 then raise exception 'Invalid version'; end if;
  desired:=case when removal then 'null'::jsonb else op->'body' end;
  if octet_length(desired::text)>2000000 then raise exception 'Payload too large'; end if;
  accepted:=false;
  if expected=0 then
   insert into public.wortgarten_sync_items(user_id,key,body,deleted) values(subject,op->>'key',desired,removal)
    on conflict(user_id,key) do nothing returning * into current;
   if found then accepted:=true; end if;
  end if;
  if not accepted then
   select * into current from public.wortgarten_sync_items where user_id=subject and key=op->>'key' for update;
   if not found then raise exception 'Expected record missing'; end if;
   if current.deleted=removal and current.body=desired then accepted:=true;
   elsif current.version=expected then
    update public.wortgarten_sync_items set body=desired,deleted=removal,version=version+1,updated_at=now()
     where user_id=subject and key=op->>'key' returning * into current;
    accepted:=true;
   end if;
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('accepted',accepted,'item',jsonb_build_object('key',current.key,'body',current.body,'deleted',current.deleted,'version',current.version)));
 end loop;
 return result;
end $$;
revoke all on function public.wortgarten_sync_commit(jsonb) from public,anon;
grant execute on function public.wortgarten_sync_commit(jsonb) to authenticated;

drop function if exists public.wortgarten_verified_user();
