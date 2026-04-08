import { getDocs, writeBatch } from 'firebase/firestore';

import { db } from '../config/firebase';
import { attendanceCollectionRef, lessonDocRef } from './firestoreRefs';

/**
 * Remove o documento da aula e todos os documentos em `lessons/{id}/attendance`.
 * Usa batches de até 500 operações (limite do Firestore).
 */
export async function deleteLessonAndAttendance(lessonId) {
  const attSnap = await getDocs(attendanceCollectionRef(lessonId));
  const refsToDelete = [...attSnap.docs.map((d) => d.ref), lessonDocRef(lessonId)];

  for (let i = 0; i < refsToDelete.length; i += 500) {
    const chunk = refsToDelete.slice(i, i + 500);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}
