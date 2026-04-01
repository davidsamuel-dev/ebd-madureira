import { useLayoutEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export function HomeScreen({ navigation }) {
  const { user, signOut, isAdmin } = useAuth();
  const ok = isFirebaseConfigured();

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

  return (
    <View style={styles.container}>
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
      <Text style={styles.sub}>
        Presentes, visitantes, oferta e atalho para nova aula (RF07).{'\n\n'}
        Use as abas no rodapé para Turmas, Chamada e Relatórios.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { marginRight: 8, paddingVertical: 4, paddingHorizontal: 4 },
  headerBtnText: { color: colors.gold, fontWeight: '700', fontSize: 16 },
  container: { flex: 1, padding: 20, backgroundColor: colors.white },
  warnBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warnTitle: { fontWeight: '700', color: colors.navy, marginBottom: 4 },
  warnText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.navy },
  userLine: { marginTop: 8, fontSize: 14, color: colors.text },
  badge: { fontWeight: '700', color: colors.gold },
  badgeMuted: { fontWeight: '600', color: colors.textMuted },
  sub: { marginTop: 12, color: colors.textMuted, lineHeight: 22 },
});
