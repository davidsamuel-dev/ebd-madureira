import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';

import { StudentAttendanceRow } from '../components/StudentAttendanceRow';
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

function formatBrl(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function LessonAttendanceScreen({ navigation, route }) {
  const lessonId = route.params?.lessonId;
  const { setActiveLesson } = useClassesContext();

  const [loading, setLoading] = useState(true);
  const [lessonMeta, setLessonMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [visitantesStr, setVisitantesStr] = useState('0');
  const [saving, setSaving] = useState(false);

  const onPatch = useCallback((studentId, partial) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, ...partial } : r)),
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
        setVisitantesStr(String(lesson.visitantes ?? 0));

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
            biblia: a?.biblia ?? false,
            revista: a?.revista ?? false,
            ofertaText: a?.oferta_individual != null ? String(a.oferta_individual) : '',
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

  const somaOfertasLinhas = useMemo(
    () => rows.reduce((acc, r) => acc + parseMoney(r.ofertaText), 0),
    [rows],
  );

  const saveAll = useCallback(async () => {
    if (!lessonId || !lessonMeta) {
      return;
    }
    setSaving(true);
    try {
      let sum = 0;
      const batch = writeBatch(db);
      for (const r of rows) {
        const val = parseMoney(r.ofertaText);
        sum += val;
        batch.set(
          attendanceDocRef(lessonId, r.studentId),
          {
            id_aluno: r.studentId,
            presente: Boolean(r.presente),
            biblia: Boolean(r.biblia),
            revista: Boolean(r.revista),
            oferta_individual: val,
          },
          { merge: true },
        );
      }
      const vis = parseInt(String(visitantesStr).trim(), 10);
      const visitantes = Number.isFinite(vis) && vis >= 0 ? vis : 0;
      batch.update(lessonDocRef(lessonId), {
        total_oferta: sum,
        visitantes,
      });
      await batch.commit();
      setActiveLesson(null);
      Alert.alert('Salvo', 'Chamada registrada.', [
        { text: 'OK', onPress: () => navigation.navigate('AttendanceHome') },
      ]);
    } catch (e) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }, [lessonId, lessonMeta, rows, visitantesStr, navigation, setActiveLesson]);

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
      {lessonMeta ? (
        <View style={styles.meta}>
          <Text style={styles.metaTitle}>{lessonMeta.tema || 'Aula'}</Text>
          <Text style={styles.metaSub}>
            Em cada aluno, preencha o campo <Text style={styles.metaStrong}>Oferta (R$)</Text> com o
            valor trazido (use vírgula para centavos, ex.: 5,50). O total abaixo é atualizado na hora;
            ao tocar em Salvar, grava a oferta total da turma e os visitantes nesta aula.
          </Text>
        </View>
      ) : null}

      <View style={styles.visRow}>
        <Text style={styles.visLabel}>Visitantes</Text>
        <TextInput
          style={styles.visInput}
          value={visitantesStr}
          onChangeText={setVisitantesStr}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.totalsBanner}>
        <Text style={styles.totalsLabel}>Total da oferta (soma dos alunos)</Text>
        <Text style={styles.totalsValue}>{formatBrl(somaOfertasLinhas)}</Text>
      </View>

      <Text style={styles.sectionAlunos}>Alunos — presença, materiais e oferta</Text>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.studentId}
        contentContainerStyle={styles.list}
        extraData={rows}
        renderItem={({ item }) => (
          <StudentAttendanceRow
            studentId={item.studentId}
            nome={item.nome}
            presente={item.presente}
            biblia={item.biblia}
            revista={item.revista}
            ofertaText={item.ofertaText}
            onPatch={onPatch}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.muted}>Nenhum aluno ativo nesta turma.</Text>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  meta: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  metaTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  metaSub: { marginTop: 6, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  metaStrong: { fontWeight: '700', color: colors.navy },
  totalsBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.babyBlueSurface,
    borderWidth: 1,
    borderColor: colors.babyBlueMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalsLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.navy, marginRight: 8 },
  totalsValue: { fontSize: 18, fontWeight: '800', color: colors.navy },
  sectionAlunos: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  visRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  visLabel: { flex: 1, fontWeight: '700', color: colors.navy },
  visInput: {
    width: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'right',
    color: colors.text,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  muted: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
});
