import type { CapacitorConfig } from '@capacitor/cli';

const devServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.ktak.app',
  appName: 'KTAK',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: false,
        androidScheme: 'https',
      }
    : {
        androidScheme: 'https',
      },
  android: {
    useLegacyBridge: true,
  },
};

export default config;

