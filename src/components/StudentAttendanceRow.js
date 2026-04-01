import React, { memo } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';

function RowComponent({ studentId, nome, presente, biblia, revista, ofertaText, onPatch }) {
  return (
    <View style={styles.row}>
      <Text style={styles.name} numberOfLines={2}>
        {nome}
      </Text>
      <View style={styles.switches}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Pres.</Text>
          <Switch
            value={presente}
            onValueChange={(v) => onPatch(studentId, { presente: v })}
            trackColor={switchTrack}
          />
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Bíblia</Text>
          <Switch
            value={biblia}
            onValueChange={(v) => onPatch(studentId, { biblia: v })}
            trackColor={switchTrack}
          />
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Rev.</Text>
          <Switch
            value={revista}
            onValueChange={(v) => onPatch(studentId, { revista: v })}
            trackColor={switchTrack}
          />
        </View>
      </View>
      <TextInput
        style={styles.oferta}
        value={ofertaText}
        onChangeText={(t) => onPatch(studentId, { ofertaText: t })}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const switchTrack = { false: colors.border, true: colors.goldMuted };

export const StudentAttendanceRow = memo(RowComponent);

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  name: { fontWeight: '600', color: colors.navy, marginBottom: 8, fontSize: 15 },
  switches: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cell: { alignItems: 'center', flex: 1 },
  cellLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  oferta: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: colors.text,
  },
});
