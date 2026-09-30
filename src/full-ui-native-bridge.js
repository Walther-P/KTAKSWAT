import { Capacitor } from '@capacitor/core';
import { BackgroundGeolocation } from '@capgo/background-geolocation';

let running = false;

function normalizeLocation(location) {
  if (!location) return null;
  return {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    accuracy: location.accuracy == null ? null : Number(location.accuracy),
    altitude: location.altitude == null ? null : Number(location.altitude),
    altitudeAccuracy: location.altitudeAccuracy == null ? null : Number(location.altitudeAccuracy),
    speed: location.speed == null ? null : Number(location.speed),
    bearing: location.bearing == null ? null : Number(location.bearing),
    time: location.time ?? Date.now(),
    simulated: Boolean(location.simulated),
  };
}

const bridge = {
  isNative() {
    return Capacitor.isNativePlatform();
  },

  platform() {
    return Capacitor.getPlatform();
  },

  async permissions() {
    if (!Capacitor.isNativePlatform()) {
      return { location: 'unavailable', backgroundLocation: 'unavailable', notification: 'unavailable' };
    }
    return BackgroundGeolocation.checkPermissions();
  },

  async openLocationSettings() {
    if (!Capacitor.isNativePlatform()) return false;
    await BackgroundGeolocation.openSettings();
    return true;
  },

  async startBackgroundLocation({ url, headers, minIntervalMs = 5000 } = {}, onEvent) {
    if (!Capacitor.isNativePlatform()) return false;
    if (running) return true;

    await BackgroundGeolocation.start(
      {
        backgroundTitle: 'KTAK 任務定位中',
        backgroundMessage: '正在共享你的即時位置',
        requestPermissions: true,
        stale: false,
        distanceFilter: 0,
        minIntervalMs,
        url,
        headers,
      },
      (location, error) => {
        if (error) {
          onEvent?.(null, {
            code: error.code ?? 'NATIVE_LOCATION_ERROR',
            message: error.message ?? String(error),
          });
          return;
        }
        const normalized = normalizeLocation(location);
        if (!normalized || !Number.isFinite(normalized.latitude) || !Number.isFinite(normalized.longitude)) return;
        onEvent?.(normalized, null);
      },
    );

    running = true;
    return true;
  },

  async stopBackgroundLocation() {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await BackgroundGeolocation.stop();
    } finally {
      running = false;
    }
    return true;
  },

  isRunning() {
    return running;
  },
};

window.KTAK_NATIVE_BRIDGE = bridge;
window.dispatchEvent(new CustomEvent('ktak-native-bridge-ready'));

