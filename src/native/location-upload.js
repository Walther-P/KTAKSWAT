import { CapacitorHttp } from '@capacitor/core';
import {
  ensureLocationUploadToken,
  clearLocationUploadToken,
} from '../lib/location-token.js';

const SEND_INTERVAL_MS = 10_000;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let context = null;
let lastSentAt = 0;
let inFlight = false;
let queuedPosition = null;

export async function prepareNativeLocationUpload({
  roomId,
  installationId,
}) {
  if (!supabaseUrl || !publishableKey) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const tokenRecord = await ensureLocationUploadToken({
    roomId,
    installationId,
  });

  context = {
    roomId,
    installationId,
    token: tokenRecord.token,
    expiresAt: tokenRecord.expiresAt,
  };

  return context;
}

export async function clearNativeLocationUpload() {
  context = null;
  queuedPosition = null;
  lastSentAt = 0;
  await clearLocationUploadToken();
}

function makePayload(position) {
  return {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy ?? null,
    altitude: position.altitude ?? null,
    altitudeAccuracy: position.altitudeAccuracy ?? null,
    speed: position.speed ?? null,
    bearing: position.bearing ?? null,
    time: position.time ?? Date.now(),
    simulated: Boolean(position.simulated),
  };
}

async function postPosition(position) {
  if (!context) return false;

  const response = await CapacitorHttp.post({
    url: `${supabaseUrl}/rest/v1/rpc/ktak3_ingest_location`,
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
      'x-ktak-location-token': context.token,
    },
    data: makePayload(position),
    connectTimeout: 10_000,
    readTimeout: 10_000,
  });

  if (response.status < 200 || response.status >= 300) {
    const body =
      typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data ?? {});
    throw new Error(`NATIVE_LOCATION_UPLOAD_${response.status}: ${body}`);
  }

  lastSentAt = Date.now();
  return true;
}

export async function queueNativeLocationUpload(position, { force = false } = {}) {
  if (!context || !position) return false;

  const due = Date.now() - lastSentAt >= SEND_INTERVAL_MS;

  if (!force && !due) {
    queuedPosition = position;
    return false;
  }

  if (inFlight) {
    queuedPosition = position;
    return false;
  }

  inFlight = true;

  try {
    await postPosition(position);
  } finally {
    inFlight = false;
  }

  if (queuedPosition && Date.now() - lastSentAt >= SEND_INTERVAL_MS) {
    const next = queuedPosition;
    queuedPosition = null;
    return queueNativeLocationUpload(next, { force: true });
  }

  return true;
}

export function getNativeUploadState() {
  return {
    prepared: Boolean(context),
    roomId: context?.roomId ?? null,
    expiresAt: context?.expiresAt ?? null,
    lastSentAt,
    intervalMs: SEND_INTERVAL_MS,
  };
}

