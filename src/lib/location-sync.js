import { supabase } from './supabase.js';
export async function syncCurrentLocation({ roomId, installationId, authUserId, position }) {
  if (!supabase || !roomId || !installationId || !authUserId || !position) return;
  const { error } = await supabase.from('ktak3_locations').upsert({
    room_id:roomId,
    installation_id:installationId,
    auth_user_id:authUserId,
    lat:position.latitude,
    lng:position.longitude,
    altitude_m:position.altitude,
    horizontal_accuracy_m:position.accuracy,
    vertical_accuracy_m:position.altitudeAccuracy,
    speed_mps:position.speed,
    heading_deg:position.bearing,
    updated_at:new Date(position.time ?? Date.now()).toISOString(),
  }, { onConflict:'room_id,installation_id' });
  if (error) throw error;
}

