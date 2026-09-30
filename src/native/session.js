import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase.js';

let stateListener = null;

export async function bindNativeSessionLifecycle() {
  if (!supabase || !Capacitor.isNativePlatform()) return () => {};

  const { App } = await import('@capacitor/app');

  stateListener = await App.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
      supabase.auth.startAutoRefresh();
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.warn('[KTAK V3] session refresh after resume failed', error);
      }
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  return () => {
    stateListener?.remove();
    stateListener = null;
  };
}

