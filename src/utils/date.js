/** @param {Date} d */
export function ymdFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmd(ymd) {
  if (!ymd || typeof ymd !== 'string') {
    return new Date();
  }
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) {
    return new Date();
  }
  return new Date(y, m - 1, d);
}

export function formatDateBr(ymd) {
  if (!ymd || typeof ymd !== 'string') {
    return '—';
  }
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) {
    return ymd;
  }
  return `${d}/${m}/${y}`;
}

/** @param {number} year @param {number} month1to12 @returns {string} prefixo YYYY-MM para filtrar datas */
export function monthPrefixYmd(year, month1to12) {
  return `${year}-${String(month1to12).padStart(2, '0')}`;
}

/**
 * Campo `data` do documento de aula no Firestore: string YYYY-MM-DD ou Timestamp.
 * @param {unknown} value
 * @returns {string|null}
 */
export function lessonDataYmd(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return ymdFromDate(value.toDate());
  }
  return null;
}
