import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.sch.sdnpleburan03.pletig',
  appName: 'computer.pletig',
  webDir: 'public',
  server: {
    // URL Vercel produksi agar APK memuat aplikasi Next.js lengkap beserta Server Actions & Database Turso:
    url: 'https://computer-pletig.vercel.app',
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
