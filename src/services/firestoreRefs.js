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

export function classDocRef(classId) {
  return doc(requireDb(), COLLECTIONS.CLASSES, classId);
}
export const studentsCollectionRef = () => collection(requireDb(), COLLECTIONS.STUDENTS);

export function studentDocRef(studentId) {
  return doc(requireDb(), COLLECTIONS.STUDENTS, studentId);
}
export const lessonsCollectionRef = () => collection(requireDb(), COLLECTIONS.LESSONS);

export const financeTransactionsCollectionRef = () =>
  collection(requireDb(), COLLECTIONS.FINANCE_TRANSACTIONS);

export function financeTransactionDocRef(transactionId) {
  return doc(requireDb(), COLLECTIONS.FINANCE_TRANSACTIONS, transactionId);
}

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

export function attendanceDocRef(lessonId, studentId) {
  return doc(
    requireDb(),
    COLLECTIONS.LESSONS,
    lessonId,
    SUBCOLLECTIONS.ATTENDANCE,
    studentId,
  );
}
