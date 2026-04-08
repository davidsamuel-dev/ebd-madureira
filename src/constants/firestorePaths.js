/**
 * Estrutura Firestore (especificação do projeto).
 * classes: { nome, professor, created_at }
 * students: { nome, id_classe, status, data_nasc (YYYY-MM-DD), photoUrl?, created_at }
 * lessons: { id_classe, data, tema, session_id?, chamada_concluida?, total_oferta, visitantes, total_biblias, total_revistas, observacao? }
 * lessons/{lessonId}/attendance: { id_aluno, presente, biblia?, revista?, oferta_individual? }
 * finance_transactions: { id_classe, tipo: 'entrada'|'saida', valor, descricao, data (YYYY-MM-DD), created_at }
 */

export const COLLECTIONS = {
  CLASSES: 'classes',
  STUDENTS: 'students',
  LESSONS: 'lessons',
  FINANCE_TRANSACTIONS: 'finance_transactions',
};

export const SUBCOLLECTIONS = {
  ATTENDANCE: 'attendance',
};

export function lessonAttendanceCollection(lessonId) {
  return `${COLLECTIONS.LESSONS}/${lessonId}/${SUBCOLLECTIONS.ATTENDANCE}`;
}
