import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
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
 * Firestore com cache persistente (offline) — RNF03 / Firebase modular v10+.
 * `persistentLocalCache()` mantém cópia local dos dados para leitura/escrita sem rede,
 * com sincronização ao voltar online.
 *
 * O polyfill em `firebasePolyfill.native.js` habilita IndexedDB no React Native (Expo).
 */
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });
} catch {
  db = getFirestore(app);
}

export { app, db };
