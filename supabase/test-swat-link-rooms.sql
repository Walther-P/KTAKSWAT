begin;
create temporary table swat_test(room_id uuid,room_code text,share_token text,title text);
grant all on swat_test to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into swat_test select * from public.ktak_swat_create('SWAT 測試','甲',1,'swat-test-device-111111111111');
insert into public.ktak_map_items(id,room_id,owner_id,data) select gen_random_uuid(),room_id,auth.uid(),'{"label":"原標記"}' from swat_test;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$begin
 if exists(select 1 from public.ktak_brief where room_id=(select room_id from swat_test)) then raise exception 'NONMEMBER_READ';end if;
 begin perform public.ktak_swat_join(repeat('0',64),'乙','swat-test-device-222222222222');raise exception 'BAD_LINK_ACCEPTED';exception when others then if sqlerrm<>'INVALID_OR_EXPIRED_LINK' then raise;end if;end;
end$$;
select j.room_id is not null joined from swat_test t cross join lateral public.ktak_swat_join(t.share_token,'乙','swat-test-device-222222222222') j;
update public.ktak_brief set data='{"summary":"乙共同編輯"}' where room_id=(select room_id from swat_test);
update public.ktak_map_items set data='{"label":"乙修改甲的標記"}' where room_id=(select room_id from swat_test);
do $$begin
 if not exists(select 1 from public.ktak_brief where room_id=(select room_id from swat_test) and data->>'summary'='乙共同編輯') then raise exception 'BRIEF_EDIT_FAILED';end if;
 if not exists(select 1 from public.ktak_map_items where room_id=(select room_id from swat_test) and data->>'label'='乙修改甲的標記') then raise exception 'CROSS_MEMBER_EDIT_FAILED';end if;
 begin perform token_hash from public.ktak_swat_links;raise exception 'SECRET_TABLE_EXPOSED';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$begin
 if exists(select 1 from public.ktak_map_items where room_id=(select room_id from swat_test)) then raise exception 'OUTSIDER_READ';end if;
 update public.ktak_brief set data='{}' where room_id=(select room_id from swat_test);
 if found then raise exception 'OUTSIDER_WRITE';end if;
end$$;
select 'PASS: create, invalid link rejected, nonmember read/write denied, link join, shared brief edit, shared object edit, secret table denied; transaction rolled back' result;
rollback;
