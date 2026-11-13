import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.codeforge.pro',
  appName: 'CodeForge Pro',
  webDir: 'dist',
  server: {
    url: 'https://codeforge-pro.onrender.com',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'codeforge-pro.onrender.com',
      'codeforge-a.firebaseapp.com',
      'accounts.google.com',
      '*.googleapis.com',
      '*.firebaseapp.com'
    ]
  },
  android: {
    backgroundColor: '#FAF4EE',
    allowMixedContent: true
  }
};

export default config;
