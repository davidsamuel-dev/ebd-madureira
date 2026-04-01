import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Chamada</Text>
      <Text style={styles.sub}>Presença, Bíblia, Revista, oferta e visitantes (RF04).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.white },
  heading: { fontSize: 22, fontWeight: '700', color: colors.navy },
  sub: { marginTop: 8, color: colors.textMuted },
});
