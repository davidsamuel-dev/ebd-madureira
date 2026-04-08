import { useEffect, useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';

import { db } from '../config/firebase';
import { useClassesContext } from '../context/ClassesContext';
import { classesCollectionRef, lessonsCollectionRef } from '../services/firestoreRefs';
import { colors } from '../theme/colors';
import { formatDateBr, parseYmd, ymdFromDate } from '../utils/date';

function newSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function AttendanceHomeScreen({ navigation }) {
  const { activeLesson, setActiveLesson } = useClassesContext();
  const [classesList, setClassesList] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [tema, setTema] = useState('');
  const [dataYmd, setDataYmd] = useState(() => ymdFromDate(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(classesCollectionRef(), orderBy('nome'));
    const unsub = onSnapshot(q, (snap) => {
      setClassesList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingClasses(false);
    });
    return () => unsub();
  }, []);

  function clearActive() {
    setActiveLesson(null);
  }

  async function startLesson() {
    const t = tema.trim();
    if (!t) {
      Alert.alert('Tema', 'Informe o tema da lição.');
      return;
    }
    if (classesList.length === 0) {
      Alert.alert('Turmas', 'Cadastre ao menos uma turma na aba Turmas.');
      return;
    }
    setSaving(true);
    try {
      const sessionId = newSessionId();
      const batch = writeBatch(db);
      for (const c of classesList) {
        const ref = doc(lessonsCollectionRef());
        batch.set(ref, {
          id_classe: c.id,
          data: dataYmd,
          tema: t,
          session_id: sessionId,
          chamada_concluida: false,
          total_oferta: 0,
          visitantes: 0,
          total_biblias: 0,
          total_revistas: 0,
          observacao: '',
          created_at: serverTimestamp(),
        });
      }
      await batch.commit();
      setActiveLesson(null);
      navigation.getParent()?.navigate('Aulas', {
        screen: 'SessionDetail',
        params: {
          sessionKey: sessionId,
          sessionId,
        },
      });
    } catch (e) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível criar as aulas.');
    } finally {
      setSaving(false);
    }
  }

  function continueLesson() {
    if (!activeLesson?.lessonId) {
      return;
    }
    navigation.navigate('LessonAttendance', { lessonId: activeLesson.lessonId });
  }

  if (loadingClasses) {
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {activeLesson ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Chamada em andamento</Text>
            <Text style={styles.bannerText}>
              {activeLesson.className} · {activeLesson.tema}
            </Text>
            <Text style={styles.bannerMeta}>{formatDateBr(activeLesson.data)}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={continueLesson}>
              <Text style={styles.primaryBtnText}>Continuar chamada</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={clearActive}>
              <Text style={styles.linkText}>Descartar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.section}>Nova aula (todas as turmas)</Text>
        <Text style={styles.info}>
          Será criada uma aula para cada turma cadastrada, na mesma data e tema. Depois, abra a aba
          Aulas para ver o progresso e registrar a chamada de cada turma.
        </Text>
        <Text style={styles.label}>Turmas incluídas ({classesList.length})</Text>
        <View style={styles.classList}>
          {classesList.length === 0 ? (
            <Text style={styles.empty}>Nenhuma turma cadastrada.</Text>
          ) : (
            classesList.map((c) => (
              <Text key={c.id} style={styles.classLine}>
                · {c.nome || '(Sem nome)'}
              </Text>
            ))
          )}
        </View>

        <Text style={styles.label}>Tema da lição</Text>
        <TextInput
          style={styles.input}
          value={tema}
          onChangeText={setTema}
          placeholder="Ex.: Deus é amor"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Data</Text>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.input}
            value={dataYmd}
            onChangeText={setDataYmd}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <>
            <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
              <Text style={styles.dateText}>{formatDateBr(dataYmd)}</Text>
            </TouchableOpacity>
            {showPicker ? (
              <DateTimePicker
                value={parseYmd(dataYmd)}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowPicker(false);
                  if (event?.type === 'dismissed') {
                    return;
                  }
                  if (date) {
                    setDataYmd(ymdFromDate(date));
                  }
                }}
                maximumDate={new Date()}
              />
            ) : null}
          </>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, (!tema.trim() || saving || classesList.length === 0) && styles.btnDisabled]}
          onPress={startLesson}
          disabled={!tema.trim() || saving || classesList.length === 0}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? 'Criando…' : 'Criar aulas e abrir sessão'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  banner: {
    backgroundColor: colors.babyBlueSurface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerTitle: { fontWeight: '800', color: colors.navy, marginBottom: 6 },
  bannerText: { color: colors.text, fontSize: 15 },
  bannerMeta: { color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  info: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.navy, marginBottom: 8, marginTop: 8 },
  classList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  classLine: { fontSize: 15, color: colors.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  dateText: { fontSize: 16, color: colors.text },
  empty: { color: colors.textMuted, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: colors.babyBlue,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.navy },
  linkBtn: { marginTop: 12, alignItems: 'center' },
  linkText: { color: colors.navy, fontWeight: '600' },
});
