import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.donghee.app',
  appName: "동희부부's 앱",
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      showSpinner: false,
      backgroundColor: '#ededed',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
