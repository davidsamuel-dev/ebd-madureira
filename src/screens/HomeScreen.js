import { StyleSheet, Text, View } from 'react-native';

import { isFirebaseConfigured } from '../config/firebase';
import { colors } from '../theme/colors';

export function HomeScreen() {
  const ok = isFirebaseConfigured();

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
      <Text style={styles.sub}>Presentes, visitantes, oferta e atalho para nova aula (RF07).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  sub: { marginTop: 8, color: colors.textMuted },
});
