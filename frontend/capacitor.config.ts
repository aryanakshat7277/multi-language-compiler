import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.codeforge.pro',
  appName: 'CodeForge Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    backgroundColor: '#FAF4EE',
    allowMixedContent: true
  }
};

export default config;
