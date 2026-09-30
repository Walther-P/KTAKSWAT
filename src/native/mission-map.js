let missionMap = null;

const MAX_ROUTE_POINTS = 500;
const EARTH_RADIUS_M = 6371008.8;
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

let googleMapsLoadPromise = null;
let routeDraft = {
  active: false,
  points: [],
  polylineIds: [],
  onChange: null,
};
let routeRenderChain = Promise.resolve();
let sharedRoutes = [];
let sharedRoutePolylineIds = [];
let sharedRouteRenderChain = Promise.resolve();

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateRouteDistanceM(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const hav =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    total += 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(hav)));
  }
  return total;
}

function routeSnapshot() {
  return {
    active: routeDraft.active,
    points: routeDraft.points.map((point) => ({ ...point })),
    distanceM: calculateRouteDistanceM(routeDraft.points),
  };
}

function emitRouteChange() {
  routeDraft.onChange?.(routeSnapshot());
}

function resetRouteDraftState() {
  routeDraft = {
    active: false,
    points: [],
    polylineIds: [],
    onChange: null,
  };
  routeRenderChain = Promise.resolve();
}

function loadGoogleMaps() {
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  if (!googleMapsApiKey) {
    return Promise.reject(new Error('GOOGLE_MAPS_API_KEY_MISSING'));
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const callbackName = `__ktakGoogleMapsReady_${Date.now()}`;
    const script = document.createElement('script');
    const cleanup = () => {
      try { delete window[callbackName]; } catch { window[callbackName] = undefined; }
    };

    window[callbackName] = () => {
      cleanup();
      if (window.google?.maps?.Map) {
        resolve(window.google.maps);
      } else {
        googleMapsLoadPromise = null;
        reject(new Error('GOOGLE_MAPS_LOAD_FAILED'));
      }
    };

    script.async = true;
    script.defer = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}` +
      `&v=weekly&loading=async&callback=${encodeURIComponent(callbackName)}`;
    script.onerror = () => {
      cleanup();
      googleMapsLoadPromise = null;
      reject(new Error('GOOGLE_MAPS_SCRIPT_FAILED'));
    };
    document.head.append(script);
  });

  return googleMapsLoadPromise;
}

async function createGoogleMapsAdapter(element, center, zoom) {
  const maps = await loadGoogleMaps();
  element.replaceChildren();
  element.classList.add('ktakGoogleMapHost');

  const map = new maps.Map(element, {
    center,
    zoom,
    gestureHandling: 'greedy',
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: false,
  });

  let clickListener = null;
  let clickHandle = null;
  let sequence = 0;
  const polylines = new Map();

  clickHandle = map.addListener('click', (event) => {
    if (!clickListener || !event?.latLng) return;
    clickListener({
      latitude: event.latLng.lat(),
      longitude: event.latLng.lng(),
    });
  });

  return {
    async enableTouch() {},
    async setOnMapClickListener(listener) {
      clickListener = typeof listener === 'function' ? listener : null;
    },
    async addPolylines(specs = []) {
      const ids = [];
      for (const spec of specs) {
        const id = `google-polyline-${++sequence}`;
        const polyline = new maps.Polyline({
          path: (spec.path ?? []).map((point) => ({
            lat: Number(point.lat),
            lng: Number(point.lng),
          })),
          geodesic: spec.geodesic ?? true,
          strokeColor: spec.strokeColor ?? '#00E5FF',
          strokeOpacity: spec.strokeOpacity ?? 1,
          strokeWeight: spec.strokeWeight ?? 5,
          clickable: spec.clickable ?? false,
          map,
        });
        polylines.set(id, polyline);
        ids.push(id);
      }
      return ids;
    },
    async removePolylines(ids = []) {
      for (const id of ids) {
        polylines.get(id)?.setMap(null);
        polylines.delete(id);
      }
    },
    async destroy() {
      clickHandle?.remove?.();
      for (const polyline of polylines.values()) polyline.setMap(null);
      polylines.clear();
      maps.event?.clearInstanceListeners?.(map);
      element.classList.remove('ktakGoogleMapHost');
      element.replaceChildren();
    },
  };
}

async function removeDraftPolyline() {
  if (!missionMap || !routeDraft.polylineIds.length) return;
  const ids = [...routeDraft.polylineIds];
  routeDraft.polylineIds = [];
  await missionMap.removePolylines(ids);
}

async function removeSharedRoutePolylines() {
  if (!missionMap || !sharedRoutePolylineIds.length) return;
  const ids = [...sharedRoutePolylineIds];
  sharedRoutePolylineIds = [];
  await missionMap.removePolylines(ids);
}

function normalizeSharedRoute(route) {
  const points = Array.isArray(route?.points)
    ? route.points
        .map((point) => ({ lat: Number(point?.lat), lng: Number(point?.lng) }))
        .filter(
          (point) =>
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng) &&
            point.lat >= -90 && point.lat <= 90 &&
            point.lng >= -180 && point.lng <= 180,
        )
    : [];
  return { ...route, points };
}

async function redrawSharedRoutesNow() {
  if (!missionMap) return;
  await removeSharedRoutePolylines();
  const drawable = sharedRoutes.filter(
    (route) => Array.isArray(route.points) && route.points.length >= 2,
  );
  if (!drawable.length) return;

  sharedRoutePolylineIds = await missionMap.addPolylines(
    drawable.map((route) => ({
      path: route.points.map((point) => ({ ...point })),
      strokeColor: '#FFB300',
      strokeOpacity: 0.95,
      strokeWeight: 5,
      geodesic: true,
      clickable: false,
      tag: `ktak-saved-route:${route.id ?? 'unknown'}`,
    })),
  );
}

function queueSharedRouteRedraw() {
  sharedRouteRenderChain = sharedRouteRenderChain
    .then(() => redrawSharedRoutesNow())
    .catch((error) => {
      console.error('[KTAK V3] shared route redraw failed', error);
      throw error;
    });
  return sharedRouteRenderChain;
}

async function redrawDraftPolylineNow() {
  if (!missionMap) return;
  await removeDraftPolyline();
  if (routeDraft.points.length < 2) return;

  routeDraft.polylineIds = await missionMap.addPolylines([
    {
      path: routeDraft.points.map((point) => ({ ...point })),
      strokeColor: '#00E5FF',
      strokeOpacity: 1,
      strokeWeight: 5,
      geodesic: true,
      clickable: false,
      tag: 'ktak-draft-route',
    },
  ]);
}

function queueRouteRedraw() {
  routeRenderChain = routeRenderChain
    .then(() => redrawDraftPolylineNow())
    .catch((error) => {
      console.error('[KTAK V3] route redraw failed', error);
      throw error;
    });
  return routeRenderChain;
}

export async function createMissionMap({
  element,
  center = { lat: 23.7, lng: 121.0 },
  zoom = 8,
} = {}) {
  if (!element) throw new Error('MISSION_MAP_ELEMENT_MISSING');

  if (missionMap) {
    await missionMap.destroy();
    missionMap = null;
  }

  resetRouteDraftState();
  missionMap = await createGoogleMapsAdapter(element, center, zoom);
  await missionMap.enableTouch();
  await queueSharedRouteRedraw();
  return missionMap;
}

export function getMissionMap() {
  return missionMap;
}

export function getRouteDraftState() {
  return routeSnapshot();
}

export async function setSharedRoutes(routes = []) {
  sharedRoutes = Array.isArray(routes) ? routes.map(normalizeSharedRoute) : [];
  if (missionMap) await queueSharedRouteRedraw();
  return sharedRoutes.map((route) => ({
    ...route,
    points: route.points.map((point) => ({ ...point })),
  }));
}

export function getSharedRoutes() {
  return sharedRoutes.map((route) => ({
    ...route,
    points: route.points.map((point) => ({ ...point })),
  }));
}

export async function enableRouteDrawing({ onChange } = {}) {
  if (!missionMap) throw new Error('MISSION_MAP_NOT_READY');

  routeDraft.active = true;
  routeDraft.onChange = typeof onChange === 'function' ? onChange : null;

  await missionMap.setOnMapClickListener((event) => {
    if (!routeDraft.active) return;
    const lat = Number(event?.latitude);
    const lng = Number(event?.longitude);
    if (
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) return;
    if (routeDraft.points.length >= MAX_ROUTE_POINTS) return;

    routeDraft.points.push({ lat, lng });
    queueRouteRedraw()
      .then(() => emitRouteChange())
      .catch((error) => console.error('[KTAK V3] route click update failed', error));
  });

  emitRouteChange();
  return routeSnapshot();
}

export async function disableRouteDrawing() {
  routeDraft.active = false;
  if (missionMap) await missionMap.setOnMapClickListener();
  emitRouteChange();
  return routeSnapshot();
}

export async function undoRoutePoint() {
  if (!missionMap) throw new Error('MISSION_MAP_NOT_READY');
  if (routeDraft.points.length > 0) {
    routeDraft.points.pop();
    await queueRouteRedraw();
  }
  emitRouteChange();
  return routeSnapshot();
}

export async function clearRouteDraft() {
  routeDraft.points = [];
  if (missionMap) await queueRouteRedraw();
  emitRouteChange();
  return routeSnapshot();
}

export async function destroyMissionMap() {
  if (!missionMap) {
    resetRouteDraftState();
    return;
  }
  try { await missionMap.setOnMapClickListener(); } catch {}
  await missionMap.destroy();
  missionMap = null;
  sharedRoutePolylineIds = [];
  sharedRouteRenderChain = Promise.resolve();
  resetRouteDraftState();
}

