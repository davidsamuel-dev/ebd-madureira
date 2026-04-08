/**
 * Agrupa documentos de `lessons` em sessões (mesmo `session_id` ou legado 1 doc = 1 sessão).
 * @param {import('firebase/firestore').QueryDocumentSnapshot[]} docs
 */
export function groupLessonsIntoSessions(docs) {
  /** @type {Map<string, { sessionKey: string, sessionId: string | null, data: string, tema: string, lessons: object[] }>} */
  const map = new Map();

  for (const d of docs) {
    const x = d.data();
    const sessionId = x.session_id;
    const sessionKey = sessionId || `legacy:${d.id}`;
    if (!map.has(sessionKey)) {
      map.set(sessionKey, {
        sessionKey,
        sessionId: sessionId || null,
        data: x.data || '',
        tema: x.tema || '',
        lessons: [],
      });
    }
    const g = map.get(sessionKey);
    g.lessons.push({
      id: d.id,
      id_classe: x.id_classe,
      data: x.data,
      tema: x.tema,
      chamada_concluida: Boolean(x.chamada_concluida),
    });
    if ((x.data || '') > (g.data || '')) {
      g.data = x.data;
    }
    if (x.tema) {
      g.tema = x.tema;
    }
  }

  return Array.from(map.values())
    .map((s) => {
      const total = s.lessons.length;
      const done = s.lessons.filter((l) => l.chamada_concluida).length;
      const isComplete = total > 0 && done === total;
      return { ...s, doneCount: done, totalCount: total, isComplete };
    })
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}
