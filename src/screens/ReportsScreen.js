import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  attendanceCollectionRef,
  classesCollectionRef,
  lessonsCollectionRef,
  studentsCollectionRef,
} from '../services/firestoreRefs';
import { colors } from '../theme/colors';
import { monthPrefixYmd } from '../utils/date';

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function formatBrl(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPct(n) {
  if (n == null || Number.isNaN(n)) {
    return '—';
  }
  return `${n.toFixed(1).replace('.', ',')}%`;
}

export function ReportsScreen() {
  const ok = isFirebaseConfigured();
  const { user, initializing } = useAuth();

  const [classesRows, setClassesRows] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState('');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedClassId, setSelectedClassId] = useState(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState({
    alunosAtivos: 0,
    aulasNoMes: 0,
    totalPresencas: 0,
    freqGeralPct: null,
    ofertaTotal: 0,
    visitantesTotal: 0,
    emptyHint: '',
  });

  useEffect(() => {
    if (!ok || initializing || !user) {
      setClassesLoading(false);
      return undefined;
    }
    const q = query(classesCollectionRef(), orderBy('nome'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClassesRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setClassesLoading(false);
        setClassesError('');
      },
      (e) => {
        setClassesLoading(false);
        const msg = e?.message ?? 'Erro ao carregar turmas.';
        setClassesError(msg);
      },
    );
    return () => unsub();
  }, [ok, user, initializing]);

  useEffect(() => {
    if (classesRows.length > 0 && selectedClassId == null) {
      setSelectedClassId(classesRows[0].id);
    }
  }, [classesRows, selectedClassId]);

  const loadReport = useCallback(async () => {
    const prefix = monthPrefixYmd(year, month);
    const [lessonsSnap, studentsSnap] = await Promise.all([
      getDocs(query(lessonsCollectionRef(), where('id_classe', '==', selectedClassId))),
      getDocs(query(studentsCollectionRef(), where('id_classe', '==', selectedClassId))),
    ]);

    const alunosAtivos = studentsSnap.docs.filter(
      (d) => d.data()?.status !== 'inativo',
    ).length;

    const lessonsInMonth = lessonsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((l) => typeof l.data === 'string' && l.data.startsWith(prefix));

    let totalPresencas = 0;
    let ofertaTotal = 0;
    let visitantesTotal = 0;

    for (let i = 0; i < lessonsInMonth.length; i++) {
      const les = lessonsInMonth[i];
      ofertaTotal += Number(les.total_oferta) || 0;
      visitantesTotal += Number(les.visitantes) || 0;
      try {
        const attSnap = await getDocs(attendanceCollectionRef(les.id));
        attSnap.forEach((ad) => {
          if (ad.data()?.presente) {
            totalPresencas += 1;
          }
        });
      } catch {
        // ignora subcoleção
      }
    }

    const aulasNoMes = lessonsInMonth.length;
    const denom = alunosAtivos * aulasNoMes;
    const freqGeralPct =
      denom > 0 ? (totalPresencas / denom) * 100 : aulasNoMes > 0 ? 0 : null;

    let emptyHint = '';
    if (aulasNoMes === 0) {
      emptyHint = 'Nenhuma aula registrada neste mês para esta turma.';
    } else if (alunosAtivos === 0) {
      emptyHint =
        'Não há alunos ativos na turma; a frequência não pode ser calculada.';
    }

    return {
      alunosAtivos,
      aulasNoMes,
      totalPresencas,
      freqGeralPct,
      ofertaTotal,
      visitantesTotal,
      emptyHint,
    };
  }, [selectedClassId, year, month]);

  useEffect(() => {
    if (!ok || initializing || !user || !selectedClassId) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      setReportLoading(true);
      try {
        const r = await loadReport();
        if (!cancelled) {
          setReport(r);
        }
      } catch (e) {
        if (!cancelled) {
          setReport((prev) => ({
            ...prev,
            emptyHint: e?.message ?? 'Erro ao montar o relatório.',
          }));
        }
      } finally {
        if (!cancelled) {
          setReportLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ok, user, initializing, selectedClassId, loadReport]);

  function shiftMonth(delta) {
    let m = month + delta;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  async function onRefresh() {
    if (!user || !ok || !selectedClassId) {
      return;
    }
    setRefreshing(true);
    try {
      const r = await loadReport();
      setReport(r);
    } catch (e) {
      setReport((prev) => ({
        ...prev,
        emptyHint: e?.message ?? 'Erro ao atualizar.',
      }));
    } finally {
      setRefreshing(false);
    }
  }

  if (!ok) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>Firebase</Text>
          <Text style={styles.warnText}>
            Configure o `.env` com EXPO_PUBLIC_FIREBASE_* e reinicie: npx expo start -c
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (initializing || classesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Faça login para ver relatórios.</Text>
      </View>
    );
  }

  if (classesError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{classesError}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>Relatórios</Text>
      <Text style={styles.subLead}>
        Frequência e ofertas por turma e mês (RF06). A frequência geral compara presenças
        marcadas com alunos ativos × número de aulas no mês.
      </Text>

      {classesRows.length === 0 ? (
        <Text style={styles.muted}>Cadastre turmas na aba Turmas.</Text>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Turma</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
          >
            {classesRows.map((c) => {
              const sel = c.id === selectedClassId;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, sel && styles.chipSelected]}
                  onPress={() => setSelectedClassId(c.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                    {c.nome || '(Sem nome)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>Mês de referência</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity
              onPress={() => shiftMonth(-1)}
              style={styles.monthArrow}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.navy} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTHS_PT[month - 1]} {year}
            </Text>
            <TouchableOpacity
              onPress={() => shiftMonth(1)}
              style={styles.monthArrow}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-forward" size={28} color={colors.navy} />
            </TouchableOpacity>
          </View>

          {reportLoading && !refreshing ? (
            <View style={styles.statsLoading}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          ) : (
            <View style={styles.grid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.alunosAtivos}</Text>
                <Text style={styles.statLabel}>Alunos ativos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.aulasNoMes}</Text>
                <Text style={styles.statLabel}>Aulas no mês</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.totalPresencas}</Text>
                <Text style={styles.statLabel}>Total de presenças (marcas)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatPct(report.freqGeralPct)}</Text>
                <Text style={styles.statLabel}>Frequência geral no mês</Text>
              </View>
              <View style={[styles.statCard, styles.statCardWide]}>
                <Text style={styles.statValue}>{formatBrl(report.ofertaTotal)}</Text>
                <Text style={styles.statLabel}>Oferta (soma das aulas)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.visitantesTotal}</Text>
                <Text style={styles.statLabel}>Visitantes (soma)</Text>
              </View>
              {report.emptyHint ? (
                <Text style={styles.hint}>{report.emptyHint}</Text>
              ) : null}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.white },
  container: { padding: 20, paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.navy },
  subLead: { marginTop: 8, color: colors.textMuted, lineHeight: 20, fontSize: 13 },
  sectionLabel: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: { marginTop: 10, marginHorizontal: -4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  chipSelected: {
    borderColor: colors.gold,
    backgroundColor: '#fffbeb',
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  chipTextSelected: { color: colors.navyDark },
  monthRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  monthArrow: { padding: 4 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: colors.navy, minWidth: 200, textAlign: 'center' },
  statsLoading: { paddingVertical: 32, alignItems: 'center' },
  grid: { marginTop: 20 },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardWide: { width: '100%' },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.navy },
  statLabel: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  hint: { marginTop: 8, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  muted: { color: colors.textMuted },
  error: { color: colors.error, textAlign: 'center' },
  warnBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    padding: 12,
  },
  warnTitle: { fontWeight: '700', color: colors.navy, marginBottom: 4 },
  warnText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
