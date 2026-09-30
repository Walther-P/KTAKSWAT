import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

const INSTALLATION_ID_KEY = 'ktak.v3.installation_id';
const FIRST_CREATED_AT_KEY = 'ktak.v3.installation_created_at';

function makeUuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

export async function getOrCreateInstallationIdentity() {
  const existing = await Preferences.get({ key: INSTALLATION_ID_KEY });

  let installationId = existing.value;
  let createdNow = false;

  if (!installationId) {
    installationId = makeUuid();
    createdNow = true;

    await Preferences.set({
      key: INSTALLATION_ID_KEY,
      value: installationId,
    });

    await Preferences.set({
      key: FIRST_CREATED_AT_KEY,
      value: new Date().toISOString(),
    });
  }

  const createdAt =
    (await Preferences.get({ key: FIRST_CREATED_AT_KEY })).value ?? null;

  return {
    installationId,
    createdAt,
    createdNow,
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
  };
}

export async function readInstallationIdentity() {
  const id = await Preferences.get({ key: INSTALLATION_ID_KEY });
  const createdAt = await Preferences.get({ key: FIRST_CREATED_AT_KEY });

  return {
    installationId: id.value ?? null,
    createdAt: createdAt.value ?? null,
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
  };
}

export async function observeAppState(onChange) {
  if (!Capacitor.isNativePlatform()) {
    const handler = () => {
      onChange({
        isActive: document.visibilityState === 'visible',
        source: 'web-visibility',
      });
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  const listener = await App.addListener('appStateChange', ({ isActive }) => {
    onChange({
      isActive,
      source: 'native-app-state',
    });
  });

  return () => listener.remove();
}

