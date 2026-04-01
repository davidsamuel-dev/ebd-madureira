import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../theme/colors';

function RowComponent({ nome, presente, onToggle }) {
  return (
    <TouchableOpacity
      style={[styles.row, presente ? styles.rowPresente : styles.rowAusente]}
      onPress={onToggle}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ selected: presente }}
      accessibilityLabel={`${nome}, ${presente ? 'presente' : 'ausente'}. Toque para alternar.`}
    >
      <View style={[styles.bar, presente ? styles.barOn : styles.barOff]} />
      <Text style={[styles.name, !presente && styles.nameMuted]} numberOfLines={2}>
        {nome || '(Sem nome)'}
      </Text>
      <Text style={styles.badge}>{presente ? 'Presente' : 'Ausente'}</Text>
    </TouchableOpacity>
  );
}

export const ChamadaAlunoRow = memo(RowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  rowPresente: {
    borderColor: colors.babyBlueMuted,
    backgroundColor: colors.babyBlueSurface,
  },
  rowAusente: {
    opacity: 0.92,
  },
  bar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 12,
  },
  barOn: {
    backgroundColor: colors.babyBlue,
  },
  barOff: {
    backgroundColor: colors.border,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  nameMuted: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.babyBlueMuted,
    marginLeft: 8,
  },
});
