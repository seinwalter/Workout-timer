import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // appId is intentionally unchanged from the RAW DAWG era so the app
  // updates in place on device (same bundle = same install + same data).
  appId: 'com.seinwalter.rawdawg',
  appName: 'PROTOCOL',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0d1117'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0d1117',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#58a6ff',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0d1117'
    }
  }
};

export default config;
