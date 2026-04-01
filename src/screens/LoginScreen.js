import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const firebaseOk = isFirebaseConfigured();

  async function handleSubmit() {
    setError('');
    if (!firebaseOk) {
      setError('Configure o Firebase no arquivo .env e reinicie o app.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (e) {
      const code = e?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (code === 'auth/user-disabled') {
        setError('Esta conta foi desativada.');
      } else if (code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente mais tarde.');
      } else {
        setError(e?.message ?? 'Não foi possível entrar.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.brand}>EBD Nação Madureira</Text>
          <Text style={styles.hint}>Acesso restrito a professores e administração.</Text>

          {!firebaseOk && (
            <View style={styles.warn}>
              <Text style={styles.warnText}>
                Defina as variáveis EXPO_PUBLIC_FIREBASE_* no `.env` e reinicie com npx expo start -c
              </Text>
            </View>
          )}

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="professor@email.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!submitting}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!submitting}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.navy },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 22,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  warn: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  warnText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
});
