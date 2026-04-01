import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  addDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { studentDocRef, studentsCollectionRef } from '../services/firestoreRefs';
import { deleteStudentPhotoFile, uploadStudentPhoto } from '../services/studentPhotoStorage';
import { colors } from '../theme/colors';

function ymdFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd) {
  if (!ymd || typeof ymd !== 'string') {
    return new Date();
  }
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) {
    return new Date();
  }
  return new Date(y, m - 1, d);
}

export function StudentFormScreen({ navigation, route }) {
  const { classId, className, studentId } = route.params || {};
  const isEdit = Boolean(studentId);

  const [nome, setNome] = useState('');
  const [statusAtivo, setStatusAtivo] = useState(true);
  const [dataNasc, setDataNasc] = useState(ymdFromDate(new Date()));
  const [dataNascDate, setDataNascDate] = useState(() => parseYmd(ymdFromDate(new Date())));
  const [showPicker, setShowPicker] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [localPhotoUri, setLocalPhotoUri] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!studentId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(studentDocRef(studentId));
        if (!snap.exists) {
          Alert.alert('Aluno não encontrado', '', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }
        const d = snap.data();
        if (cancelled) {
          return;
        }
        setNome(d.nome ?? '');
        setStatusAtivo(d.status !== 'inativo');
        const ymd = d.data_nasc || ymdFromDate(new Date());
        setDataNasc(ymd);
        setDataNascDate(parseYmd(ymd));
        setPhotoUrl(d.photoUrl ?? null);
      } catch (e) {
        Alert.alert('Erro', e?.message ?? 'Não foi possível carregar.');
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
  }, [studentId, navigation]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'É necessário permitir o acesso à galeria para escolher a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  }

  function removeLocalPhoto() {
    setLocalPhotoUri(null);
  }

  async function handleSave() {
    const n = nome.trim();
    if (!n) {
      Alert.alert('Validação', 'Informe o nome do aluno.');
      return;
    }
    if (!classId) {
      Alert.alert('Erro', 'Turma inválida.');
      return;
    }

    setSaving(true);
    try {
      const status = statusAtivo ? 'ativo' : 'inativo';
      const payload = {
        nome: n,
        id_classe: classId,
        status,
        data_nasc: dataNasc,
      };

      if (isEdit) {
        await updateDoc(studentDocRef(studentId), payload);
        if (localPhotoUri) {
          const url = await uploadStudentPhoto(studentId, localPhotoUri);
          await updateDoc(studentDocRef(studentId), { photoUrl: url });
        }
      } else {
        const refDoc = await addDoc(studentsCollectionRef(), {
          ...payload,
          photoUrl: null,
          created_at: serverTimestamp(),
        });
        const newId = refDoc.id;
        if (localPhotoUri) {
          const url = await uploadStudentPhoto(newId, localPhotoUri);
          await updateDoc(studentDocRef(newId), { photoUrl: url });
        }
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!isEdit) {
      return;
    }
    Alert.alert('Excluir aluno', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStudentPhotoFile(studentId);
            await deleteDoc(studentDocRef(studentId));
            navigation.goBack();
          } catch (e) {
            Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
          }
        },
      },
    ]);
  }

  const displayUri = localPhotoUri || photoUrl;

  if (loading) {
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
        <TouchableOpacity style={styles.photoWrap} onPress={pickImage} disabled={saving}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoHint}>Toque para{'\n'}adicionar foto</Text>
            </View>
          )}
        </TouchableOpacity>
        {localPhotoUri ? (
          <TouchableOpacity onPress={removeLocalPhoto} disabled={saving}>
            <Text style={styles.removePhoto}>Descartar foto selecionada</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Nome do aluno"
          placeholderTextColor={colors.textMuted}
          editable={!saving}
        />

        <Text style={styles.label}>Data de nascimento</Text>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.input}
            value={dataNasc}
            onChangeText={setDataNasc}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.textMuted}
            editable={!saving}
          />
        ) : (
          <>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowPicker(true)}
              disabled={saving}
            >
              <Text style={styles.dateText}>{formatBr(dataNasc)}</Text>
            </TouchableOpacity>
            {showPicker ? (
              <DateTimePicker
                value={dataNascDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowPicker(false);
                  if (event?.type === 'dismissed') {
                    return;
                  }
                  if (date) {
                    setDataNascDate(date);
                    setDataNasc(ymdFromDate(date));
                  }
                }}
                maximumDate={new Date()}
              />
            ) : null}
          </>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Aluno ativo</Text>
          <Switch
            value={statusAtivo}
            onValueChange={setStatusAtivo}
            trackColor={{ false: colors.border, true: colors.goldMuted }}
            thumbColor={colors.white}
            disabled={saving}
          />
        </View>

        <Text style={styles.meta}>Turma: {className || '—'}</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.primaryBtnText}>{isEdit ? 'Salvar' : 'Cadastrar aluno'}</Text>
          )}
        </TouchableOpacity>

        {isEdit ? (
          <TouchableOpacity style={styles.dangerBtn} onPress={handleDelete} disabled={saving}>
            <Text style={styles.dangerText}>Excluir aluno</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatBr(ymd) {
  if (!ymd) {
    return '—';
  }
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) {
    return ymd;
  }
  return `${d}/${m}/${y}`;
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
  photoWrap: { alignSelf: 'center', marginBottom: 8 },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.border,
  },
  photoPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: { textAlign: 'center', color: colors.textMuted, fontSize: 13, padding: 8 },
  removePhoto: {
    textAlign: 'center',
    color: colors.navy,
    fontSize: 13,
    marginBottom: 16,
    textDecorationLine: 'underline',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: colors.text,
    marginBottom: 18,
  },
  dateText: { fontSize: 16, color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  meta: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  primaryBtn: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.navy },
  dangerBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
  dangerText: { color: colors.error, fontWeight: '700', fontSize: 15 },
});
