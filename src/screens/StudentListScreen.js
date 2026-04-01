import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteDoc, onSnapshot, query, where } from 'firebase/firestore';

import { useClassesContext } from '../context/ClassesContext';
import { studentDocRef, studentsCollectionRef } from '../services/firestoreRefs';
import { deleteStudentPhotoFile } from '../services/studentPhotoStorage';
import { colors } from '../theme/colors';

function sortByNome(a, b) {
  return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
}

export function StudentListScreen({ navigation, route }) {
  const { classId, className } = route.params || {};
  const { setSelectedClass } = useClassesContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (classId) {
      setSelectedClass({ id: classId, nome: className ?? '' });
    }
    return () => setSelectedClass(null);
  }, [classId, className, setSelectedClass]);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      setError('Turma não informada.');
      return undefined;
    }

    const q = query(studentsCollectionRef(), where('id_classe', '==', classId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort(sortByNome);
        setRows(list);
        setLoading(false);
        setError('');
      },
      (e) => {
        setLoading(false);
        setError(e?.message ?? 'Erro ao carregar alunos.');
      },
    );
    return () => unsub();
  }, [classId]);

  function confirmDelete(item) {
    Alert.alert(
      'Excluir aluno',
      `Remover "${item.nome ?? '(sem nome)'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudentPhotoFile(item.id);
              await deleteDoc(studentDocRef(item.id));
            } catch (e) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ],
    );
  }

  if (!classId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Turma inválida.</Text>
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

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum aluno nesta turma</Text>
            <Text style={styles.emptySub}>Toque em + para cadastrar.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('StudentForm', {
                classId,
                className,
                studentId: item.id,
              })
            }
            activeOpacity={0.75}
          >
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {(item.nome || '?').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.nome || '(Sem nome)'}</Text>
              <Text style={styles.cardSub}>
                Nasc.: {formatDateBr(item.data_nasc)} ·{' '}
                {item.status === 'inativo' ? 'Inativo' : 'Ativo'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.trashBtn}
            >
              <Text style={styles.trash}>Excluir</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function formatDateBr(ymd) {
  if (!ymd || typeof ymd !== 'string') {
    return '—';
  }
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) {
    return ymd;
  }
  return `${d}/${m}/${y}`;
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
  emptyList: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: colors.navy },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  cardSub: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  trashBtn: { paddingLeft: 8, paddingVertical: 4 },
  trash: { color: colors.error, fontWeight: '600', fontSize: 14 },
  empty: { padding: 24, marginTop: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.navy, textAlign: 'center' },
  emptySub: { marginTop: 8, color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.error, textAlign: 'center' },
});
