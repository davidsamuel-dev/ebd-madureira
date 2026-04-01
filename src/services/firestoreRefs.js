import { collection, doc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { COLLECTIONS, SUBCOLLECTIONS } from '../constants/firestorePaths';

export const classesCollectionRef = () => collection(db, COLLECTIONS.CLASSES);
export const studentsCollectionRef = () => collection(db, COLLECTIONS.STUDENTS);
export const lessonsCollectionRef = () => collection(db, COLLECTIONS.LESSONS);

export function lessonDocRef(lessonId) {
  return doc(db, COLLECTIONS.LESSONS, lessonId);
}

export function attendanceCollectionRef(lessonId) {
  return collection(
    db,
    COLLECTIONS.LESSONS,
    lessonId,
    SUBCOLLECTIONS.ATTENDANCE,
  );
}
