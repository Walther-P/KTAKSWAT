-- KTAK V3.5 Private Realtime topic authorization
-- Applied to KTAK-DEV. Keep V3.5 topics room-scoped and member-only.

create or replace function public.ktak_v35_topic_room_id(p_topic text)
returns uuid
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v text;
begin
  if p_topic is null then
    return null;
  elsif p_topic ~ '^ktak35:[0-9a-fA-F-]{36}$' then
    v := split_part(p_topic, ':', 2);
  elsif p_topic ~ '^ktak35:v9-assignment:[0-9a-fA-F-]{36}$' then
    v := split_part(p_topic, ':', 3);
  elsif p_topic ~ '^ktak35-assignment-prompt-v14:[0-9a-fA-F-]{36}$' then
    v := split_part(p_topic, ':', 2);
  elsif p_topic ~ '^ktak35-sos-prompt-v15:[0-9a-fA-F-]{36}$' then
    v := split_part(p_topic, ':', 2);
  elsif p_topic ~ '^ktak35-notify:[0-9a-fA-F-]{36}$' then
    v := split_part(p_topic, ':', 2);
  else
    return null;
  end if;

  begin
    return v::uuid;
  exception when others then
    return null;
  end;
end
$$;

revoke all on function public.ktak_v35_topic_room_id(text) from public;
grant execute on function public.ktak_v35_topic_room_id(text) to authenticated;

drop policy if exists "ktak v35 realtime room members" on realtime.messages;
create policy "ktak v35 realtime room members"
on realtime.messages
for select
to authenticated
using (
  public.ktak_is_member(
    public.ktak_v35_topic_room_id((select realtime.topic()))
  )
);

