import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function FinanceHeader({ title, balance }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {balance != null && <Text style={styles.balance}>Saldo: R$ {String(balance)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.navy,
  },
  title: { color: colors.white, fontSize: 18, fontWeight: '700' },
  balance: { color: colors.babyBlue, marginTop: 4, fontSize: 16 },
});
