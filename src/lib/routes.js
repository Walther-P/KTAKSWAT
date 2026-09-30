import { supabase } from './supabase.js';

const ROUTE_FIELDS = `
  id,
  room_id,
  created_by_installation,
  name,
  points,
  total_distance_m,
  speed_kph,
  created_at,
  updated_at
`;

function requireSupabase() {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
}

function normalizeRpcRow(data) {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data ?? null;
}

export async function listRoomRoutes(roomId) {
  requireSupabase();

  if (!roomId) return [];

  const { data, error } = await supabase
    .from('ktak3_routes')
    .select(ROUTE_FIELDS)
    .eq('room_id', roomId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createRoomRoute({
  roomId,
  installationId,
  name,
  points,
  speedKph,
}) {
  requireSupabase();

  const { data, error } = await supabase.rpc('ktak3_create_route', {
    p_room_id: roomId,
    p_installation_id: installationId,
    p_name: name,
    p_points: points,
    p_speed_kph: Number(speedKph),
  });

  if (error) throw error;

  const row = normalizeRpcRow(data);
  if (!row?.id) {
    throw new Error('ROUTE_CREATE_NO_RESULT');
  }

  return row;
}

export async function subscribeRoomRoutes(
  roomId,
  {
    onChange,
    onStatus,
    onError,
  } = {},
) {
  requireSupabase();

  if (!roomId) {
    throw new Error('ROOM_ID_REQUIRED');
  }

  // Required because this Supabase project is configured as Private-Only
  // for Realtime channels. Anonymous KTAK users still have an authenticated
  // Supabase session, so setAuth() supplies that current JWT to Realtime.
  await supabase.realtime.setAuth();

  const channel = supabase
    .channel(`ktak3-routes:${roomId}`, {
      config: { private: true },
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ktak3_routes',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onChange?.(payload);
      },
    )
    .subscribe((status, error) => {
      onStatus?.(status);

      if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT'
      ) {
        onError?.(error ?? new Error(`REALTIME_${status}`));
      }
    });

  return async () => {
    try {
      await supabase.removeChannel(channel);
    } catch (error) {
      console.warn('[KTAK V3] remove route channel failed', error);
    }
  };
}

