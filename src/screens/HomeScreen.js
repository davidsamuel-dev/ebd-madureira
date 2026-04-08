import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getDocs, onSnapshot, query, where } from 'firebase/firestore';

import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { attendanceCollectionRef, lessonsCollectionRef } from '../services/firestoreRefs';
import { colors } from '../theme/colors';
import { formatDateBr, ymdFromDate } from '../utils/date';
import { groupLessonsIntoSessions } from '../utils/sessionLessons';

function formatBrl(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function HomeScreen({ navigation }) {
  const { user, signOut, isAdmin, initializing } = useAuth();
  const ok = isFirebaseConfigured();

  const [stats, setStats] = useState({
    loading: true,
    refreshing: false,
    presentes: 0,
    visitantes: 0,
    oferta: 0,
    aulasHoje: 0,
  });
  const [todaySessions, setTodaySessions] = useState([]);

  const todayYmd = ymdFromDate(new Date());

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => signOut()}
          style={styles.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.headerBtnText}>Sair</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, signOut]);

  useEffect(() => {
    if (!ok || initializing || !user) {
      setStats((s) => ({ ...s, loading: false }));
      return undefined;
    }

    const q = query(lessonsCollectionRef(), where('data', '==', todayYmd));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        let visit = 0;
        let oferta = 0;
        let presentes = 0;
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i++) {
          const d = docs[i];
          const x = d.data();
          visit += Number(x.visitantes) || 0;
          oferta += Number(x.total_oferta) || 0;
          try {
            const attSnap = await getDocs(attendanceCollectionRef(d.id));
            attSnap.forEach((ad) => {
              if (ad.data()?.presente) {
                presentes += 1;
              }
            });
          } catch {
            // ignora falha em uma subcoleção
          }
        }
        setTodaySessions(groupLessonsIntoSessions(docs));
        setStats((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          presentes,
          visitantes: visit,
          oferta,
          aulasHoje: docs.length,
        }));
      },
      () => {
        setStats((s) => ({ ...s, loading: false, refreshing: false }));
      },
    );
    return () => unsub();
  }, [ok, user, initializing, todayYmd]);

  function onRefresh() {
    if (!user || !ok) {
      return;
    }
    setStats((s) => ({ ...s, refreshing: true }));
    setTimeout(() => setStats((s) => ({ ...s, refreshing: false })), 500);
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={stats.refreshing} onRefresh={onRefresh} />
      }
    >
      {!ok && (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>Firebase</Text>
          <Text style={styles.warnText}>
            Copie `.env.example` para `.env`, cole as chaves do app Web no Console Firebase e reinicie com: npx expo start -c
          </Text>
        </View>
      )}
      <Text style={styles.heading}>Dashboard</Text>
      {user?.email ? (
        <Text style={styles.userLine}>
          {user.email}
          {isAdmin ? (
            <Text style={styles.badge}>  ·  Administrador</Text>
          ) : (
            <Text style={styles.badgeMuted}>  ·  Professor</Text>
          )}
        </Text>
      ) : null}

      <Text style={styles.dayLabel}>Hoje · {formatDateBr(todayYmd)}</Text>

      {ok && user && !initializing && !stats.loading && todaySessions.length > 0 ? (
        <View style={styles.sessionBox}>
          <Text style={styles.sessionBoxTitle}>Sessões de hoje</Text>
          {todaySessions.map((s, idx) => (
            <TouchableOpacity
              key={s.sessionKey}
              style={[styles.sessionRow, idx > 0 && styles.sessionRowSep]}
              onPress={() =>
                navigation.navigate('Aulas', {
                  screen: 'SessionDetail',
                  params: { sessionKey: s.sessionKey, sessionId: s.sessionId },
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.sessionRowMain}>
                <Text style={styles.sessionTema} numberOfLines={2}>
                  {s.tema || '(Sem tema)'}
                </Text>
                <Text style={styles.sessionMeta}>
                  Chamada: {s.doneCount}/{s.totalCount} turmas
                  {s.isComplete ? ' · Concluída' : ''}
                </Text>
              </View>
              <Text style={styles.sessionOpen}>Abrir</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {ok && user && !initializing && stats.loading ? (
        <View style={styles.statsLoading}>
          <ActivityIndicator size="large" color={colors.babyBlue} />
        </View>
      ) : (
        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.presentes}</Text>
            <Text style={styles.statLabel}>Presentes (alunos)</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.visitantes}</Text>
            <Text style={styles.statLabel}>Visitantes</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWide]}>
            <Text style={styles.statValue}>{formatBrl(stats.oferta)}</Text>
            <Text style={styles.statLabel}>Oferta total (aulas de hoje)</Text>
          </View>
          <Text style={styles.meta}>Aulas registradas hoje: {stats.aulasHoje}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.cta}
        onPress={() => navigation.navigate('Chamada', { screen: 'AttendanceHome' })}
        accessibilityHint="Cria aula para todas as turmas e abre a sessão na aba Aulas"
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>Iniciar nova aula</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.ctaSecondary}
        onPress={() => navigation.navigate('Aulas', { screen: 'SessionsList' })}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaSecondaryText}>Ver todas as aulas e sessões</Text>
      </TouchableOpacity>

      <Text style={styles.sub}>
        Os totais consideram todas as turmas com aula na data de hoje. Sessões e progresso da chamada
        ficam na aba Aulas; criação na aba Chamada.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.white },
  container: { padding: 20, paddingBottom: 32 },
  headerBtn: { marginRight: 8, paddingVertical: 4, paddingHorizontal: 4 },
  headerBtnText: { color: colors.babyBlue, fontWeight: '700', fontSize: 16 },
  warnBox: {
    backgroundColor: colors.babyBlueBanner,
    borderWidth: 1,
    borderColor: colors.babyBlue,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warnTitle: { fontWeight: '700', color: colors.navy, marginBottom: 4 },
  warnText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.navy },
  userLine: { marginTop: 8, fontSize: 14, color: colors.text },
  badge: { fontWeight: '700', color: colors.babyBlue },
  badgeMuted: { fontWeight: '600', color: colors.textMuted },
  dayLabel: { marginTop: 12, fontSize: 14, fontWeight: '600', color: colors.textMuted },
  statsLoading: { paddingVertical: 24, alignItems: 'center' },
  grid: { marginTop: 16 },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardWide: { width: '100%' },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.navy },
  statLabel: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  meta: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  cta: {
    marginTop: 12,
    backgroundColor: colors.babyBlue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: colors.navy, fontWeight: '800', fontSize: 16 },
  ctaSecondary: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.babyBlueMuted,
    backgroundColor: colors.white,
  },
  ctaSecondaryText: { color: colors.navy, fontWeight: '700', fontSize: 15 },
  sessionBox: {
    marginTop: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  sessionBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sessionRowSep: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionRowMain: { flex: 1, paddingRight: 8 },
  sessionTema: { fontSize: 15, fontWeight: '700', color: colors.navy },
  sessionMeta: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  sessionOpen: { fontSize: 14, fontWeight: '800', color: colors.babyBlueMuted },
  sub: { marginTop: 16, color: colors.textMuted, lineHeight: 22, fontSize: 13 },
});
