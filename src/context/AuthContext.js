import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth, isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext(undefined);

function normalizeEmail(value) {
  return value?.trim().toLowerCase() ?? '';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setInitializing(false);
      return undefined;
    }

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });

    return () => unsub();
  }, []);

  const signIn = async (email, password) => {
    if (!auth) {
      throw new Error('Firebase não configurado.');
    }
    await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  };

  const signOutUser = async () => {
    if (!auth) {
      return;
    }
    await signOut(auth);
  };

  const adminEmail = normalizeEmail(process.env.EXPO_PUBLIC_ADMIN_EMAIL);
  const isAdmin = Boolean(
    user?.email && adminEmail && normalizeEmail(user.email) === adminEmail,
  );

  const value = useMemo(
    () => ({
      user,
      initializing,
      signIn,
      signOut: signOutUser,
      isAdmin,
    }),
    [user, initializing, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
