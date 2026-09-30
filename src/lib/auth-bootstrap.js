import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from './supabase.js';
import { getOrCreateInstallationIdentity } from '../native/installation.js';

export class CaptchaRequiredError extends Error {
  constructor() {
    super('CAPTCHA_REQUIRED');
    this.name = 'CaptchaRequiredError';
  }
}

async function getAppVersion() {
  if (!Capacitor.isNativePlatform()) return 'web-dev';

  try {
    const info = await App.getInfo();
    return info.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

async function ensureAnonymousSession(captchaToken) {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (session) return { session, createdNow: false };

  if (!captchaToken) {
    throw new CaptchaRequiredError();
  }

  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      captchaToken,
    },
  });

  if (error) throw error;
  if (!data.session) throw new Error('ANONYMOUS_SESSION_NOT_CREATED');

  return {
    session: data.session,
    createdNow: true,
  };
}

async function registerInstallation(identity, userId) {
  const appVersion = await getAppVersion();

  const { data, error } = await supabase.rpc('ktak3_register_installation', {
    p_installation_id: identity.installationId,
    p_platform: identity.platform,
    p_app_version: appVersion,
  });

  if (error) throw error;

  if (!data?.installation_id) {
    throw new Error('INSTALLATION_REGISTRATION_FAILED');
  }

  if (data.auth_user_id !== userId) {
    throw new Error('INSTALLATION_AUTH_MISMATCH');
  }

  return data;
}

export async function bootstrapKtAKIdentity({ captchaToken = null } = {}) {
  const identity = await getOrCreateInstallationIdentity();
  const auth = await ensureAnonymousSession(captchaToken);
  const userId = auth.session.user.id;

  const installation = await registerInstallation(identity, userId);

  return {
    identity,
    auth: {
      userId,
      sessionCreatedNow: auth.createdNow,
      isAnonymous: Boolean(auth.session.user.is_anonymous),
      expiresAt: auth.session.expires_at ?? null,
    },
    installation,
  };
}

