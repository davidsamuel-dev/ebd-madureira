import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';

import { useClassesContext } from '../context/ClassesContext';
import { classesCollectionRef, lessonsCollectionRef } from '../services/firestoreRefs';
import { colors } from '../theme/colors';
import { formatDateBr, parseYmd, ymdFromDate } from '../utils/date';

export function AttendanceHomeScreen({ navigation }) {
  const { activeLesson, setActiveLesson } = useClassesContext();
  const [classesList, setClassesList] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);
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
    if (!selectedClassId) {
      Alert.alert('Turma', 'Selecione uma turma.');
      return;
    }
    const t = tema.trim();
    if (!t) {
      Alert.alert('Tema', 'Informe o tema da lição.');
      return;
    }
    const cls = classesList.find((c) => c.id === selectedClassId);
    setSaving(true);
    try {
      const ref = await addDoc(lessonsCollectionRef(), {
        id_classe: selectedClassId,
        data: dataYmd,
        tema: t,
        total_oferta: 0,
        visitantes: 0,
        created_at: serverTimestamp(),
      });
      const payload = {
        lessonId: ref.id,
        id_classe: selectedClassId,
        tema: t,
        data: dataYmd,
        className: cls?.nome ?? 'Turma',
      };
      setActiveLesson(payload);
      navigation.navigate('LessonAttendance', { lessonId: ref.id });
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
        <ActivityIndicator size="large" color={colors.gold} />
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
            <Text style={styles.bannerTitle}>Aula em andamento</Text>
            <Text style={styles.bannerText}>
              {activeLesson.className} · {activeLesson.tema}
            </Text>
            <Text style={styles.bannerMeta}>{formatDateBr(activeLesson.data)}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={continueLesson}>
              <Text style={styles.primaryBtnText}>Continuar chamada</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={clearActive}>
              <Text style={styles.linkText}>Descartar e iniciar outra</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.section}>Nova aula</Text>
        <Text style={styles.label}>Turma</Text>
        <FlatList
          data={classesList}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.classChip,
                selectedClassId === item.id && styles.classChipSelected,
              ]}
              onPress={() => setSelectedClassId(item.id)}
            >
              <Text
                style={[
                  styles.classChipText,
                  selectedClassId === item.id && styles.classChipTextSelected,
                ]}
              >
                {item.nome || '(Sem nome)'}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Cadastre uma turma na aba Turmas.</Text>
          }
        />

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
          style={[
            styles.primaryBtn,
            (!selectedClassId || !tema.trim() || saving) && styles.btnDisabled,
          ]}
          onPress={startLesson}
          disabled={!selectedClassId || !tema.trim() || saving}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? 'Abrindo…' : 'Iniciar aula e abrir chamada'}
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
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerTitle: { fontWeight: '800', color: colors.navy, marginBottom: 6 },
  bannerText: { color: colors.text, fontSize: 15 },
  bannerMeta: { color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: colors.navy, marginBottom: 8, marginTop: 8 },
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
  classChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  classChipSelected: { borderColor: colors.gold, backgroundColor: '#fffbeb' },
  classChipText: { fontSize: 16, color: colors.text },
  classChipTextSelected: { fontWeight: '700', color: colors.navy },
  empty: { color: colors.textMuted, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: colors.gold,
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
