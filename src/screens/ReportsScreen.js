import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
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
  financeTransactionsCollectionRef,
  lessonsCollectionRef,
  studentsCollectionRef,
} from '../services/firestoreRefs';
import { colors } from '../theme/colors';
import { lessonDataYmd, monthPrefixYmd } from '../utils/date';

/** String ou DocumentReference do Firestore no campo `id_classe`. */
function normalizeClassIdField(value) {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && typeof value.id === 'string') {
    return value.id;
  }
  return '';
}

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
    totalBibliasMes: 0,
    totalRevistasMes: 0,
    entradasExtrasMes: 0,
    saidasMes: 0,
    saldoMes: 0,
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

    async function docsForClass(collectionRefFn, fieldName) {
      const q1 = query(collectionRefFn(), where(fieldName, '==', selectedClassId));
      let snap = await getDocs(q1);
      if (!snap.empty) {
        return snap.docs;
      }
      const all = await getDocs(collectionRefFn());
      return all.docs.filter((doc) => normalizeClassIdField(doc.data()?.[fieldName]) === selectedClassId);
    }

    const [lessonDocs, studentDocs, txDocs] = await Promise.all([
      docsForClass(lessonsCollectionRef, 'id_classe'),
      docsForClass(studentsCollectionRef, 'id_classe'),
      docsForClass(financeTransactionsCollectionRef, 'id_classe'),
    ]);

    const alunosAtivos = studentDocs.filter((d) => d.data()?.status !== 'inativo').length;

    const lessonsInMonth = lessonDocs.filter((d) => {
      const ymd = lessonDataYmd(d.data()?.data);
      return ymd != null && ymd.startsWith(prefix);
    });

    let totalPresencas = 0;
    let ofertaTotal = 0;
    let visitantesTotal = 0;
    let totalBibliasMes = 0;
    let totalRevistasMes = 0;

    for (let i = 0; i < lessonsInMonth.length; i++) {
      const d = lessonsInMonth[i];
      const les = d.data();
      const lessonId = d.id;
      ofertaTotal += Number(les.total_oferta) || 0;
      visitantesTotal += Number(les.visitantes) || 0;
      totalBibliasMes += Number(les.total_biblias) || 0;
      totalRevistasMes += Number(les.total_revistas) || 0;
      try {
        const attSnap = await getDocs(attendanceCollectionRef(lessonId));
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

    let entradasExtrasMes = 0;
    let saidasMes = 0;
    txDocs.forEach((d) => {
      const x = d.data();
      const txYmd = lessonDataYmd(x.data);
      if (txYmd == null || !txYmd.startsWith(prefix)) {
        return;
      }
      const v = Number(x.valor) || 0;
      if (x.tipo === 'saida') {
        saidasMes += v;
      } else {
        entradasExtrasMes += v;
      }
    });
    const saldoMes = ofertaTotal + entradasExtrasMes - saidasMes;

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
      totalBibliasMes,
      totalRevistasMes,
      entradasExtrasMes,
      saidasMes,
      saldoMes,
      emptyHint,
    };
  }, [selectedClassId, year, month]);

  const loadReportToState = useCallback(async () => {
    if (!ok || initializing || !user || !selectedClassId) {
      return;
    }
    setReportLoading(true);
    try {
      const r = await loadReport();
      setReport(r);
    } catch (e) {
      setReport((prev) => ({
        ...prev,
        emptyHint: e?.message ?? 'Erro ao montar o relatório.',
      }));
    } finally {
      setReportLoading(false);
    }
  }, [ok, initializing, user, selectedClassId, loadReport]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ok || initializing || !user || !selectedClassId) {
        return;
      }
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

  useFocusEffect(
    useCallback(() => {
      loadReportToState();
    }, [loadReportToState]),
  );

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

  async function shareReport() {
    const cls = classesRows.find((c) => c.id === selectedClassId);
    const className = cls?.nome || 'Turma';
    const monthLabel = `${MONTHS_PT[month - 1]} ${year}`;
    const r = report;
    const lines = [
      'EBD Nação Madureira — Relatório mensual',
      `Turma: ${className}`,
      `Período: ${monthLabel}`,
      '',
      `Alunos ativos: ${r.alunosAtivos}`,
      `Aulas no mês: ${r.aulasNoMes}`,
      `Total de presenças (marcas): ${r.totalPresencas}`,
      `Frequência geral: ${formatPct(r.freqGeralPct)}`,
      `Visitantes (soma): ${r.visitantesTotal}`,
      `Bíblias (soma das aulas): ${r.totalBibliasMes}`,
      `Revistas (soma das aulas): ${r.totalRevistasMes}`,
      '',
      'Financeiro no mês',
      `Oferta (aulas): ${formatBrl(r.ofertaTotal)}`,
      `Entradas extras: ${formatBrl(r.entradasExtrasMes)}`,
      `Saídas: ${formatBrl(r.saidasMes)}`,
      `Saldo no mês: ${formatBrl(r.saldoMes)}`,
    ];
    if (r.emptyHint) {
      lines.push('', `Obs.: ${r.emptyHint}`);
    }
    try {
      await Share.share({
        message: lines.join('\n'),
        title: 'Relatório EBD',
      });
    } catch {
      // cancelamento do compartilhamento
    }
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
        <ActivityIndicator size="large" color={colors.babyBlue} />
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
        Frequência, ofertas das aulas e movimentação financeira do mês (lançamentos manuais na
        turma). Use o botão abaixo para compartilhar o resumo (RF08).
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
              <ActivityIndicator size="large" color={colors.babyBlue} />
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
              <Text style={styles.subSection}>Financeiro no mês</Text>
              <View style={[styles.statCard, styles.statCardWide]}>
                <Text style={styles.statValue}>{formatBrl(report.ofertaTotal)}</Text>
                <Text style={styles.statLabel}>Oferta (soma das aulas)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.valPos]}>
                  {formatBrl(report.entradasExtrasMes)}
                </Text>
                <Text style={styles.statLabel}>Entradas extras (manual)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.valNeg]}>
                  {formatBrl(report.saidasMes)}
                </Text>
                <Text style={styles.statLabel}>Saídas (manual)</Text>
              </View>
              <View style={[styles.statCard, styles.statCardWide]}>
                <Text style={styles.statValue}>{formatBrl(report.saldoMes)}</Text>
                <Text style={styles.statLabel}>Saldo no mês (oferta + extras − saídas)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.visitantesTotal}</Text>
                <Text style={styles.statLabel}>Visitantes (soma)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.totalBibliasMes}</Text>
                <Text style={styles.statLabel}>Bíblias (soma no mês)</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{report.totalRevistasMes}</Text>
                <Text style={styles.statLabel}>Revistas (soma no mês)</Text>
              </View>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={shareReport}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={22} color={colors.navy} />
                <Text style={styles.shareBtnText}>Compartilhar relatório</Text>
              </TouchableOpacity>
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
    borderColor: colors.babyBlue,
    backgroundColor: colors.babyBlueSurface,
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
  subSection: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  valPos: { color: colors.success },
  valNeg: { color: colors.error },
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
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.babyBlue,
    borderRadius: 10,
  },
  shareBtnText: { fontSize: 16, fontWeight: '800', color: colors.navy },
  hint: { marginTop: 8, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  muted: { color: colors.textMuted },
  error: { color: colors.error, textAlign: 'center' },
  warnBox: {
    backgroundColor: colors.babyBlueBanner,
    borderWidth: 1,
    borderColor: colors.babyBlue,
    borderRadius: 8,
    padding: 12,
  },
  warnTitle: { fontWeight: '700', color: colors.navy, marginBottom: 4 },
  warnText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
