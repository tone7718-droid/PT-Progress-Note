import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Tauri(데스크톱)와 동일한 식별자로 통일. Android applicationId 는
  // android/app/build.gradle 이 소스 오브 트루스 — 함께 변경할 것.
  appId: 'com.ptclinic.progressnote',
  appName: 'PT-NOTE',
  webDir: 'out'
};

export default config;
