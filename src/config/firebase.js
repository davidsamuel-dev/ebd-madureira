import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
} from 'firebase/firestore';

/**
 * Lê variáveis do `.env` na raiz (EXPO_PUBLIC_*).
 * No Expo, reinicie o bundler após alterar o `.env`: `npx expo start -c`
 *
 * Console Firebase: Configurações do projeto → Seus aplicativos → app Web → firebaseConfig
 */
function readEnv() {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

function buildFirebaseConfig() {
  const e = readEnv();
  const config = {
    apiKey: e.apiKey?.trim(),
    authDomain: e.authDomain?.trim(),
    projectId: e.projectId?.trim(),
    storageBucket: e.storageBucket?.trim(),
    messagingSenderId: e.messagingSenderId?.trim(),
    appId: e.appId?.trim(),
  };
  if (e.measurementId?.trim()) {
    config.measurementId = e.measurementId.trim();
  }
  return config;
}

export function isFirebaseConfigured() {
  const c = buildFirebaseConfig();
  return Boolean(
    c.apiKey &&
      c.authDomain &&
      c.projectId &&
      c.storageBucket &&
      c.messagingSenderId &&
      c.appId,
  );
}

export let app;
export let db;

if (isFirebaseConfigured()) {
  const firebaseConfig = buildFirebaseConfig();

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  /**
   * RNF03 — cache offline (SDK modular).
   * Web: disco (IndexedDB). Nativo Expo: memória até fechar o app.
   */
  const localCache =
    Platform.OS === 'web' ? persistentLocalCache() : memoryLocalCache();

  try {
    db = initializeFirestore(app, { localCache });
  } catch {
    db = getFirestore(app);
  }
} else if (__DEV__) {
  console.warn(
    '[Firebase] Crie o arquivo `.env` na raiz (copie `.env.example`), preencha todas as EXPO_PUBLIC_FIREBASE_* e reinicie: npx expo start -c',
  );
}
