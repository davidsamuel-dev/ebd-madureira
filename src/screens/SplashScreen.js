import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function SplashScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('Main'), 800);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EBD Nação Madureira</Text>
      <ActivityIndicator size="large" color={colors.gold} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.navy,
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  loader: { marginTop: 8 },
});
