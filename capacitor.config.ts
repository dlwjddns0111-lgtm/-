import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.payroll.app',
  appName: 'Payroll App',
  webDir: 'dist',
  server: {
    url: 'https://payroll-kakao-test.surge.sh',
    cleartext: true
  }
};

export default config;
