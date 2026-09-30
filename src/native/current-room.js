import { Preferences } from '@capacitor/preferences';

const CURRENT_ROOM_KEY = 'ktak.v3.current_room';

export async function saveCurrentRoom(room) {
  await Preferences.set({
    key: CURRENT_ROOM_KEY,
    value: JSON.stringify({
      roomId: room.room_id,
      code: room.code,
      role: room.role,
    }),
  });
}

export async function readCurrentRoom() {
  const { value } = await Preferences.get({ key: CURRENT_ROOM_KEY });
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (!parsed?.roomId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearCurrentRoom() {
  await Preferences.remove({ key: CURRENT_ROOM_KEY });
}

