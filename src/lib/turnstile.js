let scriptPromise = null;

export function getTurnstileSiteKey() {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';
}

export function loadTurnstile() {
  if (globalThis.turnstile) return Promise.resolve(globalThis.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ktak-turnstile="true"]');

    const finish = () => {
      if (globalThis.turnstile) {
        resolve(globalThis.turnstile);
      } else {
        reject(new Error('TURNSTILE_API_NOT_AVAILABLE'));
      }
    };

    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('TURNSTILE_SCRIPT_LOAD_FAILED')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.ktakTurnstile = 'true';
    script.addEventListener('load', finish, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('TURNSTILE_SCRIPT_LOAD_FAILED')),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function renderTurnstile({
  container,
  onToken,
  onError,
  onExpired,
}) {
  const sitekey = getTurnstileSiteKey();

  if (!sitekey) {
    throw new Error('TURNSTILE_SITE_KEY_MISSING');
  }

  const turnstile = await loadTurnstile();

  container.replaceChildren();

  const widgetId = turnstile.render(container, {
    sitekey,
    theme: 'dark',
    size: 'flexible',
    appearance: 'always',
    action: 'anonymous_signin',
    callback(token) {
      onToken?.(token, widgetId);
    },
    'error-callback'(code) {
      onError?.(code, widgetId);
    },
    'expired-callback'() {
      onExpired?.(widgetId);
    },
    'timeout-callback'() {
      onExpired?.(widgetId);
    },
  });

  return {
    widgetId,
    reset() {
      turnstile.reset(widgetId);
    },
    remove() {
      turnstile.remove(widgetId);
    },
  };
}

