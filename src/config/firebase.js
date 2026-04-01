import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
} from 'firebase/firestore';

/**
 * Configuração do projeto Firebase (preencha via variáveis EXPO_PUBLIC_* no `.env`).
 * @see https://firebase.google.com/docs/web/setup
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * RNF03 — persistência offline (Firebase modular v10+).
 *
 * - Web: `persistentLocalCache()` usa IndexedDB (dados persistem entre sessões).
 * - iOS/Android (Expo + JS SDK): IndexedDB não existe; o cache em disco exige polyfill
 *   (ex.: expo-sqlite + indexeddbshim) ou SDK nativo (@react-native-firebase).
 *   Aqui usamos `memoryLocalCache()`: fila de escrita e leitura do cache funcionam
 *   sem rede enquanto o app estiver em memória; ao fechar o app, o cache some.
 *
 * Para cache persistente em dispositivo no Expo, avalie `expo install expo-sqlite` +
 * política de polyfill compatível com seu ambiente de build, ou migre para
 * React Native Firebase.
 */
const localCache =
  Platform.OS === 'web' ? persistentLocalCache() : memoryLocalCache();

let db;
try {
  db = initializeFirestore(app, { localCache });
} catch {
  db = getFirestore(app);
}

export { app, db };
