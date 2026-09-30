import { Capacitor } from '@capacitor/core';
import {
  SecureStorage,
  KeychainAccess,
} from '@aparajita/capacitor-secure-storage';

let configured = false;
let configurePromise = null;

async function configureSecureStorage() {
  if (configured) return;
  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    await SecureStorage.setKeyPrefix('ktak_v3_');

    if (Capacitor.getPlatform() === 'ios') {
      await SecureStorage.setSynchronize(false);
      await SecureStorage.setDefaultKeychainAccess(
        KeychainAccess.afterFirstUnlockThisDeviceOnly,
      );
    }

    configured = true;
  })();

  try {
    await configurePromise;
  } finally {
    configurePromise = null;
  }
}

export async function secureGetItem(key) {
  await configureSecureStorage();
  return SecureStorage.getItem(key);
}

export async function secureSetItem(key, value) {
  await configureSecureStorage();
  await SecureStorage.setItem(key, value);
}

export async function secureRemoveItem(key) {
  await configureSecureStorage();
  await SecureStorage.removeItem(key);
}

export const ktakAuthStorage = {
  getItem: secureGetItem,
  setItem: secureSetItem,
  removeItem: secureRemoveItem,
};

export async function getAuthStorageInfo() {
  await configureSecureStorage();

  const platform = Capacitor.getPlatform();

  return {
    platform,
    native: Capacitor.isNativePlatform(),
    storage:
      platform === 'ios'
        ? 'iOS Keychain'
        : platform === 'android'
          ? 'Android Keystore-backed storage'
          : 'Browser localStorage (desktop fallback)',
  };
}

