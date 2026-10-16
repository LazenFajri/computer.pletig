import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.sch.sdnpleburan03.pletig',
  appName: 'computer.pletig',
  webDir: 'public',
  server: {
    // Saat deploy ke Vercel, isi URL Vercel di sini agar APK terhubung langsung ke Server Action & Database Turso:
    // url: 'https://computer-pletig.vercel.app',
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
