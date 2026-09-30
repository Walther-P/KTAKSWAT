-- Additive SWAT capability rooms. Existing GPT6/3.5 rooms and policies unchanged.
create table if not exists public.ktak_swat_links (
  room_id uuid primary key references public.ktak_rooms(id) on delete cascade,
  token_hash text not null unique,
  title text not null,
  created_at timestamptz not null default now()
);
alter table public.ktak_swat_links enable row level security;
revoke all on public.ktak_swat_links from public,anon,authenticated;

create or replace function public.ktak_swat_create(p_title text,p_nick text,p_retention_days integer,p_device_key text)
returns table(room_id uuid,room_code text,share_token text,title text)
language plpgsql security definer set search_path=public,extensions as $$
declare r record; token text; code text; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(coalesce(p_title,'')) not between 1 and 80 then raise exception 'BAD_TITLE'; end if;
  if length(coalesce(p_nick,'')) not between 1 and 40 then raise exception 'BAD_NICK'; end if;
  if length(coalesce(p_device_key,'')) not between 16 and 200 then raise exception 'BAD_DEVICE'; end if;
  token:=encode(extensions.gen_random_bytes(32),'hex');
  code:='SWAT_'||upper(encode(extensions.gen_random_bytes(8),'hex'));
  select * into r from public.ktak_create_room(code,'0000',p_nick,p_retention_days);
  -- Disable both legacy PIN and recovery routes with unknown high-entropy values.
  update public.ktak_rooms set password_hash=extensions.crypt(token,extensions.gen_salt('bf')),
    recovery_hash=encode(extensions.digest(extensions.gen_random_bytes(32),'sha256'),'hex') where id=r.room_id;
  update public.ktak_room_members set device_key=p_device_key where ktak_room_members.room_id=r.room_id and user_id=uid;
  insert into public.ktak_swat_links(room_id,token_hash,title) values(r.room_id,encode(extensions.digest(token,'sha256'),'hex'),trim(p_title));
  return query select r.room_id,code,token,trim(p_title);
end $$;

create or replace function public.ktak_swat_join(p_token text,p_nick text,p_device_key text)
returns table(room_id uuid,room_code text,title text)
language plpgsql security definer set search_path=public,extensions as $$
declare r record; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(p_token,'') !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_LINK'; end if;
  if length(coalesce(p_nick,'')) not between 1 and 40 then raise exception 'BAD_NICK'; end if;
  if length(coalesce(p_device_key,'')) not between 16 and 200 then raise exception 'BAD_DEVICE'; end if;
  select k.id,k.code,l.title into r from public.ktak_swat_links l join public.ktak_rooms k on k.id=l.room_id
    where l.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and k.expires_at>now();
  if not found then raise exception 'INVALID_OR_EXPIRED_LINK'; end if;
  insert into public.ktak_room_members(room_id,user_id,nick,role,requested_role,approved,approved_at,approved_by,device_key)
    values(r.id,uid,trim(p_nick),'commander','commander',true,now(),uid,p_device_key)
    on conflict on constraint ktak_room_members_pkey do update set
      role='commander',requested_role='commander',approved=true,nick=excluded.nick,device_key=excluded.device_key,last_seen_at=now();
  return query select r.id,r.code,r.title;
end $$;
revoke all on function public.ktak_swat_create(text,text,integer,text) from public,anon;
revoke all on function public.ktak_swat_join(text,text,text) from public,anon;
grant execute on function public.ktak_swat_create(text,text,integer,text) to authenticated;
grant execute on function public.ktak_swat_join(text,text,text) to authenticated;
