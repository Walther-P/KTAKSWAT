import { supabase } from './supabase.js';
import {
  secureGetItem,
  secureSetItem,
  secureRemoveItem,
} from '../native/secure-storage.js';

const TOKEN_STORAGE_KEY = 'location_upload_token_v1';
const REFRESH_SAFETY_MS = 5 * 60 * 1000;

let cached = null;

function isUsable(record, roomId, installationId) {
  if (!record) return false;
  if (record.roomId !== roomId) return false;
  if (record.installationId !== installationId) return false;
  if (!record.token || !record.expiresAt) return false;

  const expires = Date.parse(record.expiresAt);
  return Number.isFinite(expires) && expires - Date.now() > REFRESH_SAFETY_MS;
}

async function readStoredToken() {
  if (cached) return cached;

  const raw = await secureGetItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;

  try {
    cached = JSON.parse(raw);
    return cached;
  } catch {
    await secureRemoveItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

async function saveToken(record) {
  cached = record;
  await secureSetItem(TOKEN_STORAGE_KEY, JSON.stringify(record));
}

export async function ensureLocationUploadToken({
  roomId,
  installationId,
}) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  const existing = await readStoredToken();
  if (isUsable(existing, roomId, installationId)) {
    return existing;
  }

  const { data, error } = await supabase.rpc('ktak3_issue_location_token', {
    p_room_id: roomId,
    p_installation_id: installationId,
  });

  if (error) throw error;
  if (!data?.token || !data?.expires_at) {
    throw new Error('LOCATION_TOKEN_NOT_ISSUED');
  }

  const record = {
    roomId,
    installationId,
    token: data.token,
    expiresAt: data.expires_at,
  };

  await saveToken(record);
  return record;
}

export async function clearLocationUploadToken() {
  cached = null;
  await secureRemoveItem(TOKEN_STORAGE_KEY);
}

