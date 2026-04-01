import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

function StudentCardComponent({ name }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

export const StudentCard = memo(StudentCardComponent);

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  name: { fontSize: 16, color: colors.text, fontWeight: '600' },
});
