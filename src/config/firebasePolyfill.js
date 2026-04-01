import { Platform } from 'react-native';

/**
 * No React Native o Firestore precisa de IndexedDB para `persistentLocalCache`.
 * Este pacote polyfill (expo-sqlite + indexeddbshim) deve ser carregado antes de `firebase/firestore`.
 * Na web, o navegador já oferece IndexedDB.
 */
if (Platform.OS !== 'web') {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('expo-firestore-offline-persistence');
}
