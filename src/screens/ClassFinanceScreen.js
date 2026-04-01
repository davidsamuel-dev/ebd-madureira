import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
  financeTransactionDocRef,
  financeTransactionsCollectionRef,
  lessonsCollectionRef,
} from '../services/firestoreRefs';
import { colors } from '../theme/colors';
import { formatDateBr, parseYmd, ymdFromDate } from '../utils/date';

function formatBrl(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** @param {string} s */
function parseMoneyBrInput(s) {
  if (s == null || typeof s !== 'string') {
    return NaN;
  }
  const t = s.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function compareDataDesc(a, b) {
  const x = a.data || '';
  const y = b.data || '';
  if (x < y) {
    return 1;
  }
  if (x > y) {
    return -1;
  }
  return 0;
}

export function ClassFinanceScreen({ navigation, route }) {
  const ok = isFirebaseConfigured();
  const { user, initializing } = useAuth();
  const { classId, className } = route.params || {};

  const [ofertasAulas, setOfertasAulas] = useState(0);
  const [txRows, setTxRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [tipoNovo, setTipoNovo] = useState('entrada');
  const [valorStr, setValorStr] = useState('');
  const [descStr, setDescStr] = useState('');
  const [dataYmd, setDataYmd] = useState(() => ymdFromDate(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const openModal = useCallback(() => {
    setTipoNovo('entrada');
    setValorStr('');
    setDescStr('');
    setDataYmd(ymdFromDate(new Date()));
    setModalOpen(true);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: className ? `Financeiro · ${className}` : 'Financeiro',
      headerRight: () => (
        <TouchableOpacity
          onPress={openModal}
          style={{ marginRight: 8, padding: 6 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="add-circle-outline" size={28} color={colors.babyBlue} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, className, openModal]);

  useEffect(() => {
    if (!ok || initializing || !user || !classId) {
      setLoading(false);
      return undefined;
    }

    const qLessons = query(lessonsCollectionRef(), where('id_classe', '==', classId));
    const qTx = query(
      financeTransactionsCollectionRef(),
      where('id_classe', '==', classId),
    );

    const unsubL = onSnapshot(
      qLessons,
      (snap) => {
        let sum = 0;
        snap.docs.forEach((d) => {
          sum += Number(d.data()?.total_oferta) || 0;
        });
        setOfertasAulas(sum);
      },
      (e) => setError(e?.message ?? 'Erro nas aulas.'),
    );

    const unsubT = onSnapshot(
      qTx,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort(compareDataDesc);
        setTxRows(list);
        setLoading(false);
        setRefreshing(false);
        setError('');
      },
      (e) => {
        setLoading(false);
        setRefreshing(false);
        setError(e?.message ?? 'Erro nos lançamentos.');
      },
    );

    return () => {
      unsubL();
      unsubT();
    };
  }, [ok, user, initializing, classId]);

  const entradasExtras = txRows
    .filter((t) => t.tipo === 'entrada')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const saidas = txRows
    .filter((t) => t.tipo === 'saida')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const saldo = ofertasAulas + entradasExtras - saidas;

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  }

  async function salvarLancamento() {
    const valor = parseMoneyBrInput(valorStr);
    if (!Number.isFinite(valor) || valor <= 0) {
      Alert.alert('Valor', 'Informe um valor válido (ex.: 25,50).');
      return;
    }
    const desc = descStr.trim();
    if (!desc) {
      Alert.alert('Descrição', 'Descreva o lançamento.');
      return;
    }
    if (!classId) {
      return;
    }
    setSaving(true);
    try {
      await addDoc(financeTransactionsCollectionRef(), {
        id_classe: classId,
        tipo: tipoNovo,
        valor,
        descricao: desc,
        data: dataYmd,
        created_at: serverTimestamp(),
      });
      setModalOpen(false);
    } catch (e) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(item) {
    Alert.alert(
      'Excluir lançamento',
      `Remover "${item.descricao ?? ''}" (${formatBrl(item.valor)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(financeTransactionDocRef(item.id));
            } catch (e) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ],
    );
  }

  if (!ok) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Configure o Firebase (.env).</Text>
      </View>
    );
  }

  if (!classId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Turma não informada.</Text>
      </View>
    );
  }

  if (initializing || loading) {
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

  const listHeader = (
    <>
      <Text style={styles.lead}>
        O saldo soma as ofertas registradas nas aulas (chamada) com entradas e saídas manuais
        abaixo.
      </Text>

      {error ? <Text style={styles.errBanner}>{error}</Text> : null}

      <View style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Ofertas (aulas)</Text>
          <Text style={styles.sumVal}>{formatBrl(ofertasAulas)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Entradas extras</Text>
          <Text style={[styles.sumVal, styles.sumPos]}>{formatBrl(entradasExtras)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Saídas</Text>
          <Text style={[styles.sumVal, styles.sumNeg]}>{formatBrl(saidas)}</Text>
        </View>
        <View style={[styles.sumRow, styles.sumSaldo]}>
          <Text style={styles.sumLabelSaldo}>Saldo da turma</Text>
          <Text style={styles.sumSaldoVal}>{formatBrl(saldo)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Lançamentos manuais</Text>
      {txRows.length === 0 ? (
        <Text style={styles.emptyList}>
          Nenhuma entrada ou saída manual. Use + para registrar doações avulsas, compra de
          materiais, etc.
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={styles.flex}>
      <FlatList
        data={txRows}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={styles.txMain}>
              <Text style={styles.txDesc}>{item.descricao || '—'}</Text>
              <Text style={styles.txMeta}>
                {formatDateBr(item.data)} · {item.tipo === 'saida' ? 'Saída' : 'Entrada'}
              </Text>
              <Text
                style={[styles.txValor, item.tipo === 'saida' ? styles.sumNeg : styles.sumPos]}
              >
                {item.tipo === 'saida' ? '− ' : '+ '}
                {formatBrl(item.valor)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              style={styles.txDel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal} activeOpacity={0.9}>
        <Ionicons name="add" size={28} color={colors.navy} />
      </TouchableOpacity>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !saving && setModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => !saving && setModalOpen(false)}
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Novo lançamento</Text>

            <Text style={styles.modalLabel}>Tipo</Text>
            <View style={styles.tipoRow}>
              <TouchableOpacity
                style={[
                  styles.tipoChip,
                  { marginRight: 8 },
                  tipoNovo === 'entrada' && styles.tipoChipOn,
                ]}
                onPress={() => setTipoNovo('entrada')}
              >
                <Text style={[styles.tipoTxt, tipoNovo === 'entrada' && styles.tipoTxtOn]}>
                  Entrada
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoChip, tipoNovo === 'saida' && styles.tipoChipOn]}
                onPress={() => setTipoNovo('saida')}
              >
                <Text style={[styles.tipoTxt, tipoNovo === 'saida' && styles.tipoTxtOn]}>
                  Saída
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              value={valorStr}
              onChangeText={setValorStr}
              placeholder="0,00"
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Descrição</Text>
            <TextInput
              style={styles.input}
              value={descStr}
              onChangeText={setDescStr}
              placeholder="Ex.: Compra de revistas"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Data</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                value={dataYmd}
                onChangeText={setDataYmd}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <>
                <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
                  <Text style={styles.dateText}>{formatDateBr(dataYmd)}</Text>
                </TouchableOpacity>
                {showPicker ? (
                  <DateTimePicker
                    value={parseYmd(dataYmd)}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowPicker(false);
                      if (event?.type === 'dismissed') {
                        return;
                      }
                      if (date) {
                        setDataYmd(ymdFromDate(date));
                      }
                    }}
                  />
                ) : null}
              </>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, saving && styles.btnDisabled]}
              onPress={salvarLancamento}
              disabled={saving}
            >
              <Text style={styles.modalBtnText}>{saving ? 'Salvando…' : 'Salvar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => !saving && setModalOpen(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  listContent: { padding: 20, paddingBottom: 100 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
  },
  lead: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
  errBanner: { color: colors.error, marginBottom: 12, fontSize: 13 },
  summary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    backgroundColor: '#f8fafc',
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sumSaldo: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  sumLabel: { fontSize: 14, color: colors.textMuted },
  sumLabelSaldo: { fontSize: 16, fontWeight: '700', color: colors.navy },
  sumVal: { fontSize: 15, fontWeight: '600', color: colors.navy },
  sumPos: { color: colors.success },
  sumNeg: { color: colors.error },
  sumSaldoVal: { fontSize: 22, fontWeight: '800', color: colors.navy },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  emptyList: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  txMain: { flex: 1, padding: 12 },
  txDesc: { fontSize: 15, fontWeight: '600', color: colors.navy },
  txMeta: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  txValor: { marginTop: 6, fontSize: 16, fontWeight: '700' },
  txDel: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.babyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  muted: { color: colors.textMuted },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.navy, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 8 },
  tipoRow: { flexDirection: 'row', marginBottom: 4 },
  tipoChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tipoChipOn: { borderColor: colors.babyBlue, backgroundColor: colors.babyBlueSurface },
  tipoTxt: { fontWeight: '600', color: colors.text },
  tipoTxtOn: { color: colors.navy },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: colors.text,
  },
  dateText: { fontSize: 16, color: colors.text },
  modalBtn: {
    marginTop: 20,
    backgroundColor: colors.babyBlue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  modalBtnText: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  modalCancel: { marginTop: 12, alignItems: 'center', padding: 8 },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
});
