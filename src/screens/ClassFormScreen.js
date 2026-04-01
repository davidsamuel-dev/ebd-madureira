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
import {
  addDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { classDocRef, classesCollectionRef } from '../services/firestoreRefs';
import { colors } from '../theme/colors';

export function ClassFormScreen({ navigation, route }) {
  const { user, initializing } = useAuth();
  const classId = route.params?.classId;
  const isEdit = Boolean(classId);

  const [nome, setNome] = useState('');
  const [professor, setProfessor] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initializing) {
      return undefined;
    }
    if (!user) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    async function load() {
      if (!classId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(classDocRef(classId));
        if (!snap.exists) {
          Alert.alert('Turma não encontrada', '', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }
        const d = snap.data();
        if (!cancelled) {
          setNome(d.nome ?? '');
          setProfessor(d.professor ?? '');
        }
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
  }, [classId, navigation, user, initializing]);

  async function handleSave() {
    if (!user) {
      Alert.alert('Sessão', 'Faça login novamente para salvar.');
      return;
    }
    const n = nome.trim();
    const p = professor.trim();
    if (!n) {
      Alert.alert('Validação', 'Informe o nome da turma.');
      return;
    }
    if (!p) {
      Alert.alert('Validação', 'Informe o nome do professor.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateDoc(classDocRef(classId), {
          nome: n,
          professor: p,
        });
      } else {
        await addDoc(classesCollectionRef(), {
          nome: n,
          professor: p,
          created_at: serverTimestamp(),
        });
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
    Alert.alert(
      'Excluir turma',
      'Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(classDocRef(classId));
              navigation.goBack();
            } catch (e) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ],
    );
  }

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.textMuted }}>Faça login para cadastrar turmas.</Text>
      </View>
    );
  }

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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Nome da turma</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Jovens, Adultos"
          placeholderTextColor={colors.textMuted}
          editable={!saving}
        />

        <Text style={styles.label}>Professor</Text>
        <TextInput
          style={styles.input}
          value={professor}
          onChangeText={setProfessor}
          placeholder="Nome do professor"
          placeholderTextColor={colors.textMuted}
          editable={!saving}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.primaryBtnText}>{isEdit ? 'Salvar alterações' : 'Cadastrar turma'}</Text>
          )}
        </TouchableOpacity>

        {isEdit ? (
          <TouchableOpacity style={styles.dangerBtn} onPress={handleDelete} disabled={saving}>
            <Text style={styles.dangerText}>Excluir turma</Text>
          </TouchableOpacity>
        ) : null}
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
  primaryBtn: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.navy },
  dangerBtn: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerText: { color: colors.error, fontWeight: '700', fontSize: 15 },
});
