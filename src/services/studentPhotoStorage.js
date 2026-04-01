import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { isFirebaseConfigured, storage } from '../config/firebase';

export async function uploadStudentPhoto(studentId, localUri) {
  if (!isFirebaseConfigured() || !storage) {
    throw new Error('Firebase Storage não disponível.');
  }
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `students/${studentId}/photo.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function deleteStudentPhotoFile(studentId) {
  if (!isFirebaseConfigured() || !storage) {
    return;
  }
  try {
    await deleteObject(ref(storage, `students/${studentId}/photo.jpg`));
  } catch {
    // arquivo pode não existir
  }
}
