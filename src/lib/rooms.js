import { supabase } from './supabase.js';

function ensureClient() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
}

export async function createRoom({
  installationId,
  code,
  password,
  nickname,
  name = null,
}) {
  ensureClient();

  const { data, error } = await supabase.rpc('ktak3_create_room', {
    p_installation_id: installationId,
    p_code: code,
    p_password: password,
    p_nickname: nickname,
    p_name: name,
  });

  if (error) throw error;
  return data;
}

export async function joinRoom({
  installationId,
  code,
  password,
  nickname,
}) {
  ensureClient();

  const { data, error } = await supabase.rpc('ktak3_join_room', {
    p_installation_id: installationId,
    p_code: code,
    p_password: password,
    p_nickname: nickname,
  });

  if (error) throw error;
  return data;
}

export async function leaveRoom({
  installationId,
  roomId,
}) {
  ensureClient();

  const { data, error } = await supabase.rpc('ktak3_leave_room', {
    p_installation_id: installationId,
    p_room_id: roomId,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function getActiveRoomMembers(roomId) {
  ensureClient();

  const { data, error } = await supabase
    .from('ktak3_members')
    .select(
      'room_id,installation_id,nickname,role,joined_at,last_seen_at,left_at',
    )
    .eq('room_id', roomId)
    .is('left_at', null)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

