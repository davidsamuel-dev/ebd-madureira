import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, onSnapshot, orderBy, query } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { classDocRef, classesCollectionRef } from '../services/firestoreRefs';
import { colors } from '../theme/colors';

export function ClassesListScreen({ navigation }) {
  const { user, initializing } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initializing) {
      return undefined;
    }
    if (!user) {
      setLoading(false);
      setError('Faça login para gerenciar turmas.');
      return undefined;
    }

    const q = query(classesCollectionRef(), orderBy('nome'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        );
        setLoading(false);
        setError('');
      },
      (e) => {
        setLoading(false);
        const msg = e?.message ?? 'Erro ao carregar turmas.';
        if (msg.includes('permission') || msg.includes('Permission')) {
          setError(
            `${msg}\n\nConfira no Firebase Console → Firestore → Regras se leitura/escrita em "classes" está permitida para usuários autenticados e clique em Publicar.`,
          );
        } else {
          setError(msg);
        }
      },
    );
    return () => unsub();
  }, [user, initializing]);

  function confirmDelete(item) {
    Alert.alert(
      'Excluir turma',
      `Remover "${item.nome ?? '(sem nome)'}"? Os alunos vinculados no Firestore não são apagados automaticamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(classDocRef(item.id));
            } catch (e) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.hint}>
          Verifique as regras do Firestore (usuário autenticado) e a conexão.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhuma turma cadastrada</Text>
          <Text style={styles.emptySub}>Toque em + para criar a primeira turma.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() =>
                  navigation.navigate('StudentList', {
                    classId: item.id,
                    className: item.nome,
                  })
                }
                activeOpacity={0.75}
              >
                <Text style={styles.cardTitle}>{item.nome || '(Sem nome)'}</Text>
                <Text style={styles.cardSub}>Professor: {item.professor || '—'}</Text>
                <Text style={styles.cardHint}>Alunos →</Text>
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ClassFinance', {
                      classId: item.id,
                      className: item.nome,
                    })
                  }
                  style={styles.iconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="wallet-outline" size={24} color={colors.gold} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ClassForm', { classId: item.id })}
                  style={styles.iconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="create-outline" size={24} color={colors.gold} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.trashBtn}
                >
                  <Text style={styles.trash}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  cardMain: { flex: 1, padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.navy },
  cardSub: { marginTop: 4, fontSize: 14, color: colors.textMuted },
  cardHint: { marginTop: 8, fontSize: 13, fontWeight: '600', color: colors.gold },
  cardActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  iconBtn: { padding: 6 },
  trashBtn: { paddingVertical: 4 },
  trash: { color: colors.error, fontWeight: '600', fontSize: 13 },
  empty: { padding: 24, marginTop: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.navy, textAlign: 'center' },
  emptySub: { marginTop: 8, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  error: { color: colors.error, textAlign: 'center', marginBottom: 8 },
  hint: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
});
