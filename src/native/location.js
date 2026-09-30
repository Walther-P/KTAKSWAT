import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { BackgroundGeolocation } from '@capgo/background-geolocation';

const LOCATION_ENABLED_KEY = 'ktak.v3.location_enabled';
let running = false;
let lastPosition = null;
let webWatchId = null;

export async function isLocationEnabledByPreference() {
  const { value } = await Preferences.get({ key: LOCATION_ENABLED_KEY });
  return value === 'true';
}

export async function setLocationEnabledPreference(enabled) {
  await Preferences.set({ key: LOCATION_ENABLED_KEY, value: enabled ? 'true' : 'false' });
}

export function getLastNativePosition() {
  return lastPosition;
}

export async function getLocationPermissionStatus() {
  if (Capacitor.isNativePlatform()) {
    return BackgroundGeolocation.checkPermissions();
  }

  if (!navigator.geolocation) {
    return { location: 'unsupported', backgroundLocation: 'unavailable', notification: 'unavailable' };
  }

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return {
        location: permission.state,
        backgroundLocation: 'foreground-only',
        notification: 'unavailable',
      };
    } catch {
      // Safari does not consistently expose geolocation through Permissions API.
    }
  }

  return { location: 'prompt', backgroundLocation: 'foreground-only', notification: 'unavailable' };
}

export async function openLocationSettings() {
  if (!Capacitor.isNativePlatform()) return false;
  await BackgroundGeolocation.openSettings();
  return true;
}

function normalizeWebPosition(position) {
  const coords = position?.coords;
  return {
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    accuracy: coords?.accuracy ?? null,
    altitude: coords?.altitude ?? null,
    altitudeAccuracy: coords?.altitudeAccuracy ?? null,
    speed: coords?.speed ?? null,
    bearing: coords?.heading ?? null,
    time: position?.timestamp ?? Date.now(),
    simulated: false,
  };
}

function normalizeWebError(error) {
  const names = {
    1: 'PERMISSION_DENIED',
    2: 'POSITION_UNAVAILABLE',
    3: 'TIMEOUT',
  };
  const wrapped = new Error(error?.message || 'WEB_GEOLOCATION_ERROR');
  wrapped.code = names[error?.code] || String(error?.code || 'WEB_GEOLOCATION_ERROR');
  return wrapped;
}

async function startWebLocation({ onLocation, onError } = {}) {
  if (!navigator.geolocation) {
    const error = new Error('WEB_GEOLOCATION_UNSUPPORTED');
    error.code = 'UNSUPPORTED';
    onError?.(error);
    throw error;
  }

  webWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const normalized = normalizeWebPosition(position);
      if (!Number.isFinite(Number(normalized.latitude)) || !Number.isFinite(Number(normalized.longitude))) {
        return;
      }
      lastPosition = normalized;
      onLocation?.(lastPosition);
    },
    (error) => onError?.(normalizeWebError(error)),
    {
      enableHighAccuracy: true,
      maximumAge: 1500,
      timeout: 15_000,
    },
  );
}

export async function startNativeLocation({ onLocation, onError } = {}) {
  if (running) return;

  if (!Capacitor.isNativePlatform()) {
    await startWebLocation({ onLocation, onError });
    running = true;
    await setLocationEnabledPreference(true);
    return;
  }

  await BackgroundGeolocation.start(
    {
      backgroundTitle: 'KTAK 任務定位中',
      backgroundMessage: '正在共享你的即時位置',
      requestPermissions: true,
      stale: false,
      distanceFilter: 0,
      minIntervalMs: 2000,
    },
    (location, error) => {
      if (error) {
        onError?.(error);
        return;
      }
      if (!location) return;

      lastPosition = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude ?? null,
        altitudeAccuracy: location.altitudeAccuracy ?? null,
        speed: location.speed ?? null,
        bearing: location.bearing ?? null,
        time: location.time ?? Date.now(),
        simulated: Boolean(location.simulated),
      };
      onLocation?.(lastPosition);
    },
  );

  running = true;
  await setLocationEnabledPreference(true);
}

export async function stopNativeLocation() {
  if (running) {
    if (Capacitor.isNativePlatform()) {
      await BackgroundGeolocation.stop();
    } else if (webWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(webWatchId);
      webWatchId = null;
    }
    running = false;
  }

  await setLocationEnabledPreference(false);
}

export async function restoreLocationPreference(options = {}) {
  const enabled = await isLocationEnabledByPreference();
  if (!enabled) return false;
  await startNativeLocation(options);
  return true;
}

