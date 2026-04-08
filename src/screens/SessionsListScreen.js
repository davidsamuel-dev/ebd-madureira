import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onSnapshot, orderBy, query } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { deleteLessonAndAttendance } from '../services/deleteLesson';
import { lessonsCollectionRef } from '../services/firestoreRefs';
import { colors } from '../theme/colors';
import { formatDateBr } from '../utils/date';
import { groupLessonsIntoSessions } from '../utils/sessionLessons';

export function SessionsListScreen({ navigation }) {
  const { user, initializing } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initializing || !user) {
      setLoading(false);
      return undefined;
    }
    const q = query(lessonsCollectionRef(), orderBy('data', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const grouped = groupLessonsIntoSessions(snap.docs);
        setSessions(grouped);
        setLoading(false);
        setError('');
      },
      (e) => {
        setLoading(false);
        setError(e?.message ?? 'Erro ao carregar aulas.');
      },
    );
    return () => unsub();
  }, [user, initializing]);

  const openRows = sessions.filter((s) => !s.isComplete);
  const doneRows = sessions.filter((s) => s.isComplete);

  const sections = [];
  if (openRows.length > 0) {
    sections.push({ title: 'Em aberto', data: openRows });
  }
  if (doneRows.length > 0) {
    sections.push({ title: 'Concluídas', data: doneRows });
  }

  function confirmDeleteSession(item) {
    Alert.alert(
      'Excluir sessão',
      `Excluir todas as aulas desta sessão (${item.totalCount} turma(s) · ${formatDateBr(item.data)})? Os registros de chamada serão apagados. Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              for (let i = 0; i < item.lessons.length; i++) {
                await deleteLessonAndAttendance(item.lessons[i].id);
              }
            } catch (e) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir a sessão.');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.babyBlue} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Faça login.</Text>
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
    <View style={styles.flex}>
      <Text style={styles.lead}>
        Cada sessão agrupa todas as turmas na mesma data e tema. Concluída quando a chamada de
        todas as turmas foi salva.
      </Text>
      {sessions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nenhuma aula registrada</Text>
          <Text style={styles.emptySub}>
            Use a aba Chamada para criar uma nova aula (todas as turmas entram na mesma sessão).
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.sessionKey}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardTouchable}
                onPress={() =>
                  navigation.navigate('SessionDetail', {
                    sessionKey: item.sessionKey,
                    sessionId: item.sessionId,
                  })
                }
                activeOpacity={0.8}
              >
                <View style={styles.cardMain}>
                  <Text style={styles.cardDate}>{formatDateBr(item.data)}</Text>
                  <Text style={styles.cardTema} numberOfLines={2}>
                    {item.tema || '(Sem tema)'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    Turmas: {item.doneCount}/{item.totalCount} chamadas salvas
                  </Text>
                </View>
                <View style={[styles.badge, item.isComplete ? styles.badgeDone : styles.badgeOpen]}>
                  <Text style={styles.badgeText}>{item.isComplete ? 'OK' : 'Aberta'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardDelete}
                onPress={() => confirmDeleteSession(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Excluir sessão inteira"
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}
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
    backgroundColor: colors.white,
  },
  lead: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  cardTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardDelete: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  cardMain: { flex: 1 },
  cardDate: { fontSize: 15, fontWeight: '800', color: colors.navy },
  cardTema: { marginTop: 4, fontSize: 15, color: colors.text },
  cardMeta: { marginTop: 6, fontSize: 12, color: colors.textMuted },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeOpen: { backgroundColor: colors.babyBlueBanner },
  badgeDone: { backgroundColor: '#dcfce7' },
  badgeText: { fontWeight: '800', fontSize: 12, color: colors.navy },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.navy, textAlign: 'center' },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  muted: { color: colors.textMuted },
  error: { color: colors.error, textAlign: 'center' },
});
