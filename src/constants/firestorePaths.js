/**
 * Estrutura Firestore (especificação do projeto).
 * classes: { nome, professor, created_at }
 * students: { nome, id_classe, status, data_nasc }
 * lessons: { id_classe, data, tema, total_oferta, visitantes }
 * lessons/{lessonId}/attendance: { id_aluno, presente, biblia, revista, oferta_individual }
 */

export const COLLECTIONS = {
  CLASSES: 'classes',
  STUDENTS: 'students',
  LESSONS: 'lessons',
};

export const SUBCOLLECTIONS = {
  ATTENDANCE: 'attendance',
};

export function lessonAttendanceCollection(lessonId) {
  return `${COLLECTIONS.LESSONS}/${lessonId}/${SUBCOLLECTIONS.ATTENDANCE}`;
}
