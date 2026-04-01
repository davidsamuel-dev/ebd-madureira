import { collection, doc } from 'firebase/firestore';

import { db, isFirebaseConfigured } from '../config/firebase';
import { COLLECTIONS, SUBCOLLECTIONS } from '../constants/firestorePaths';

function requireDb() {
  if (!isFirebaseConfigured() || !db) {
    throw new Error(
      'Firebase não configurado. Copie `.env.example` para `.env`, preencha EXPO_PUBLIC_FIREBASE_* (Console Firebase → app Web) e reinicie: npx expo start -c',
    );
  }
  return db;
}

export const classesCollectionRef = () => collection(requireDb(), COLLECTIONS.CLASSES);
export const studentsCollectionRef = () => collection(requireDb(), COLLECTIONS.STUDENTS);
export const lessonsCollectionRef = () => collection(requireDb(), COLLECTIONS.LESSONS);

export function lessonDocRef(lessonId) {
  return doc(requireDb(), COLLECTIONS.LESSONS, lessonId);
}

export function attendanceCollectionRef(lessonId) {
  return collection(
    requireDb(),
    COLLECTIONS.LESSONS,
    lessonId,
    SUBCOLLECTIONS.ATTENDANCE,
  );
}
