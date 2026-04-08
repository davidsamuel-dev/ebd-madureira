import { useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';

import { ChamadaAlunoRow } from '../components/ChamadaAlunoRow';
import { db } from '../config/firebase';
import { useClassesContext } from '../context/ClassesContext';
import {
  attendanceCollectionRef,
  attendanceDocRef,
  lessonDocRef,
  studentsCollectionRef,
} from '../services/firestoreRefs';
import { colors } from '../theme/colors';

function parseMoney(text) {
  const s = String(text ?? '')
    .trim()
    .replace(/\s/g, '');
  if (!s) {
    return 0;
  }
  if (s.includes(',')) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function moneyToInputStr(n) {
  if (n == null || Number.isNaN(Number(n))) {
    return '';
  }
  const v = Number(n);
  return v.toFixed(2).replace('.', ',');
}

export function LessonAttendanceScreen({ navigation }) {
  const route = useRoute();
  const lessonId = route.params?.lessonId;
  const origin = route.params?.origin ?? 'chamada';
  const { setActiveLesson } = useClassesContext();

  const [loading, setLoading] = useState(true);
  const [lessonMeta, setLessonMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [bibliasCount, setBibliasCount] = useState(0);
  const [revistasCount, setRevistasCount] = useState(0);
  const [visitantesCount, setVisitantesCount] = useState(0);
  const [ofertaStr, setOfertaStr] = useState('');
  const [notasStr, setNotasStr] = useState('');
  const [saving, setSaving] = useState(false);

  const togglePresent = useCallback((studentId) => {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, presente: !r.presente } : r,
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!lessonId) {
        setLoading(false);
        return;
      }
      try {
        const lessonSnap = await getDoc(lessonDocRef(lessonId));
        if (!lessonSnap.exists) {
          Alert.alert('Aula não encontrada', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          return;
        }
        const lesson = lessonSnap.data();
        if (cancelled) {
          return;
        }
        setLessonMeta({ id: lessonId, ...lesson });
        setBibliasCount(Math.max(0, Number(lesson.total_biblias) || 0));
        setRevistasCount(Math.max(0, Number(lesson.total_revistas) || 0));
        setVisitantesCount(Math.max(0, Number(lesson.visitantes) || 0));
        setOfertaStr(
          lesson.total_oferta != null && lesson.total_oferta !== ''
            ? moneyToInputStr(lesson.total_oferta)
            : '',
        );
        setNotasStr(typeof lesson.observacao === 'string' ? lesson.observacao : '');

        const idClasse = lesson.id_classe;
        const stSnap = await getDocs(
          query(studentsCollectionRef(), where('id_classe', '==', idClasse)),
        );
        const attSnap = await getDocs(attendanceCollectionRef(lessonId));
        const att = {};
        attSnap.forEach((d) => {
          att[d.id] = d.data();
        });

        const list = [];
        stSnap.forEach((d) => {
          const x = d.data();
          if (x.status === 'inativo') {
            return;
          }
          const a = att[d.id];
          list.push({
            studentId: d.id,
            nome: x.nome || '',
            presente: a?.presente ?? false,
          });
        });
        list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        if (!cancelled) {
          setRows(list);
        }
      } catch (e) {
        Alert.alert('Erro', e?.message ?? 'Falha ao carregar.');
        navigation.goBack();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [lessonId, navigation]);

  const saveAll = useCallback(async () => {
    if (!lessonId || !lessonMeta) {
      return;
    }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (const r of rows) {
        batch.set(
          attendanceDocRef(lessonId, r.studentId),
          {
            id_aluno: r.studentId,
            presente: Boolean(r.presente),
            biblia: false,
            revista: false,
            oferta_individual: 0,
          },
          { merge: true },
        );
      }
      const totalOferta = parseMoney(ofertaStr);
      batch.update(lessonDocRef(lessonId), {
        total_oferta: totalOferta,
        visitantes: visitantesCount,
        total_biblias: bibliasCount,
        total_revistas: revistasCount,
        observacao: notasStr.trim(),
        chamada_concluida: true,
      });
      await batch.commit();
      setActiveLesson(null);
      const sid = lessonMeta?.session_id;
      Alert.alert('Salvo', 'Chamada registrada.', [
        {
          text: 'OK',
          onPress: () => {
            if (origin === 'lessons') {
              if (sid) {
                navigation.navigate('SessionDetail', {
                  sessionId: sid,
                  sessionKey: sid,
                });
              } else {
                navigation.navigate('SessionDetail', {
                  sessionKey: `legacy:${lessonId}`,
                  sessionId: null,
                });
              }
            } else {
              navigation.navigate('Chamada', { screen: 'AttendanceHome' });
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }, [
    lessonId,
    lessonMeta,
    rows,
    ofertaStr,
    visitantesCount,
    bibliasCount,
    revistasCount,
    notasStr,
    navigation,
    setActiveLesson,
    origin,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={saveAll}
          disabled={saving || loading}
          style={{ marginRight: 12, padding: 6 }}
        >
          <Text style={{ color: colors.babyBlue, fontWeight: '800', fontSize: 16 }}>
            {saving ? '…' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, saveAll, saving, loading]);

  if (!lessonId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Aula não informada.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.babyBlue} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {lessonMeta ? (
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>{lessonMeta.tema || 'Aula'}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Chamada dos alunos</Text>
        <Text style={styles.hint}>
          Toque no nome de cada aluno para marcar se esteve presente ou ausente.
        </Text>

        {rows.map((item) => (
          <ChamadaAlunoRow
            key={item.studentId}
            nome={item.nome}
            presente={item.presente}
            onToggle={() => togglePresent(item.studentId)}
          />
        ))}

        {rows.length === 0 ? (
          <Text style={styles.muted}>Nenhum aluno ativo nesta turma.</Text>
        ) : null}

        <View style={styles.reportCard}>
          <Text style={styles.sectionTitle}>Relatório da classe</Text>
          <Text style={styles.hint}>
            Use as setas para informar o total de bíblias, revistas e visitantes. A oferta é o valor
            único da turma nesta aula.
          </Text>

          <RelatorioStepper
            label="Bíblias"
            value={bibliasCount}
            onChange={setBibliasCount}
            icon="book-outline"
          />
          <RelatorioStepper
            label="Revistas"
            value={revistasCount}
            onChange={setRevistasCount}
            icon="newspaper-outline"
          />
          <RelatorioStepper
            label="Visitantes"
            value={visitantesCount}
            onChange={setVisitantesCount}
            icon="people-outline"
          />

          <Text style={styles.ofertaLabel}>Oferta (R$)</Text>
          <View style={styles.ofertaRow}>
            <Text style={styles.ofertaPrefix}>R$</Text>
            <TextInput
              style={styles.ofertaInput}
              value={ofertaStr}
              onChangeText={setOfertaStr}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Valor total da oferta em reais"
            />
          </View>

          <Text style={styles.notasLabel}>Anotação</Text>
          <TextInput
            style={styles.notasInput}
            value={notasStr}
            onChangeText={setNotasStr}
            placeholder="Insira uma anotação"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  meta: { paddingBottom: 8 },
  metaTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 12,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportCard: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepLabelWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepIcon: { marginRight: 10 },
  stepLabel: { fontSize: 16, fontWeight: '600', color: colors.navy },
  stepControls: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { padding: 4 },
  stepValue: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
  },
  ofertaLabel: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  ofertaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.babyBlueMuted,
    backgroundColor: colors.babyBlueSurface,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  ofertaPrefix: { fontSize: 18, fontWeight: '700', color: colors.navy, marginRight: 6 },
  ofertaInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  notasLabel: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  notasInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    minHeight: 88,
    marginBottom: 8,
  },
  muted: { color: colors.textMuted, textAlign: 'center', marginVertical: 24 },
});

function RelatorioStepper({ label, value, onChange, icon }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepLabelWrap}>
        {icon ? <Ionicons name={icon} size={22} color={colors.navy} style={styles.stepIcon} /> : null}
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
      <View style={styles.stepControls}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(0, value - 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove-circle-outline" size={32} color={colors.babyBlueMuted} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(value + 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add-circle-outline" size={32} color={colors.babyBlueMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
