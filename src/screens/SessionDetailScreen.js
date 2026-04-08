import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import { getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { deleteLessonAndAttendance } from '../services/deleteLesson';
import { classesCollectionRef, lessonDocRef, lessonsCollectionRef } from '../services/firestoreRefs';
import { colors } from '../theme/colors';
import { formatDateBr } from '../utils/date';

export function SessionDetailScreen({ navigation, route }) {
  const { sessionKey, sessionId } = route.params || {};
  const { user, initializing } = useAuth();

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ data: '', tema: '' });
  const [lessons, setLessons] = useState([]);
  const [classNames, setClassNames] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(classesCollectionRef(), orderBy('nome')),
      (snap) => {
        const m = {};
        snap.docs.forEach((d) => {
          m[d.id] = d.data()?.nome || d.id;
        });
        setClassNames(m);
      },
      () => {},
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!sessionKey || initializing || !user) {
      setLoading(false);
      return undefined;
    }

    if (sessionKey.startsWith('legacy:')) {
      const lessonId = sessionKey.slice('legacy:'.length);
      let cancelled = false;
      (async () => {
        try {
          const snap = await getDoc(lessonDocRef(lessonId));
          if (!snap.exists()) {
            if (!cancelled) {
              setError('Aula não encontrada.');
            }
            return;
          }
          const x = snap.data();
          if (cancelled) {
            return;
          }
          setMeta({ data: x.data || '', tema: x.tema || '' });
          setLessons([
            {
              id: snap.id,
              id_classe: x.id_classe,
              chamada_concluida: Boolean(x.chamada_concluida),
            },
          ]);
          setError('');
        } catch (e) {
          if (!cancelled) {
            setError(e?.message ?? 'Erro ao carregar.');
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!sessionId) {
      setError('Sessão inválida.');
      setLoading(false);
      return undefined;
    }

    const q = query(lessonsCollectionRef(), where('session_id', '==', sessionId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            id_classe: x.id_classe,
            chamada_concluida: Boolean(x.chamada_concluida),
            data: x.data,
            tema: x.tema,
          };
        });
        if (list.length > 0) {
          setMeta({ data: list[0].data || '', tema: list[0].tema || '' });
        }
        setLessons(list);
        setError('');
        setLoading(false);
      },
      (e) => {
        setError(e?.message ?? 'Erro ao carregar.');
        setLoading(false);
      },
    );
    return () => unsub();
  }, [sessionKey, sessionId, initializing, user]);

  const sortedLessons = useMemo(() => {
    const list = [...lessons];
    list.sort((a, b) => {
      const na = classNames[a.id_classe] || '';
      const nb = classNames[b.id_classe] || '';
      return na.localeCompare(nb, 'pt-BR');
    });
    return list;
  }, [lessons, classNames]);

  function confirmDeleteLesson(item, classLabel) {
    Alert.alert(
      'Excluir aula',
      `Deseja mesmo excluir a aula desta turma (${classLabel})? A chamada e os dados serão apagados permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const wasOnly = sortedLessons.length <= 1;
            try {
              await deleteLessonAndAttendance(item.id);
              if (wasOnly) {
                navigation.goBack();
              }
            } catch (e) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir a aula.');
            }
          },
        },
      ],
    );
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: meta.tema ? `Turmas · ${meta.tema}` : 'Turmas da sessão',
    });
  }, [navigation, meta.tema]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.babyBlue} />
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

  const done = lessons.filter((l) => l.chamada_concluida).length;
  const total = lessons.length;

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerDate}>{formatDateBr(meta.data)}</Text>
        <Text style={styles.headerSub}>
          Chamadas salvas: {done}/{total} turmas
          {total > 0 && done === total ? ' · Sessão concluída' : ''}
        </Text>
      </View>
      <Text style={styles.hint}>
        Toque em uma turma para abrir a chamada. Todas as turmas cadastradas entram na sessão ao
        criar a aula.
      </Text>
      <FlatList
        data={sortedLessons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const name = classNames[item.id_classe] || item.id_classe || 'Turma';
          return (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rowTouchable}
                onPress={() =>
                  navigation.navigate('LessonAttendance', {
                    lessonId: item.id,
                    origin: 'lessons',
                  })
                }
                activeOpacity={0.85}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowName}>{name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.chamada_concluida ? 'Chamada enviada' : 'Pendente'}
                  </Text>
                </View>
                <View style={[styles.pill, item.chamada_concluida ? styles.pillOk : styles.pillWait]}>
                  <Text style={styles.pillTxt}>{item.chamada_concluida ? '✓' : '…'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rowDelete}
                onPress={() => confirmDeleteLesson(item, name)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Excluir aula desta turma"
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.muted}>Nenhuma turma nesta sessão.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerDate: { fontSize: 16, fontWeight: '800', color: colors.navy },
  headerSub: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  hint: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  rowTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowDelete: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    alignSelf: 'stretch',
  },
  rowMain: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '700', color: colors.navy },
  rowMeta: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  pill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  pillOk: { backgroundColor: '#dcfce7' },
  pillWait: { backgroundColor: colors.babyBlueBanner },
  pillTxt: { fontSize: 16, fontWeight: '800', color: colors.navy },
  muted: { textAlign: 'center', color: colors.textMuted, marginTop: 24 },
  error: { color: colors.error, textAlign: 'center' },
});
