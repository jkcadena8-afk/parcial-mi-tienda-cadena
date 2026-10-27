import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, colors, Field, FormScreen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

const MIN_PASSWORD = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  email?: string;
  password?: string;
  confirm?: string;
}

function validate(email: string, password: string, confirm: string): Errors {
  const errors: Errors = {};
  if (!email.trim()) errors.email = 'El correo es obligatorio.';
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Escribe un correo válido.';
  if (password.length < MIN_PASSWORD) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  if (!confirm) errors.confirm = 'Confirma tu contraseña.';
  else if (confirm !== password) errors.confirm = 'Las contraseñas no coinciden.';
  return errors;
}

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Despues del primer intento los errores se actualizan mientras se escribe
  const errors = attempted ? validate(email, password, confirm) : {};

  const handleRegister = async () => {
    setAttempted(true);
    setServerError(null);
    if (Object.keys(validate(email, password, confirm)).length > 0) return;
    setSubmitting(true);
    const message = await signUp(email.trim(), password);
    setSubmitting(false);
    // Si sale bien queda con sesion y Stack.Protected lleva a la pantalla principal
    if (message) setServerError(message);
  };

  const goToLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <FormScreen>
      <Text style={styles.intro}>Crea tu cuenta para respaldar el inventario en la nube.</Text>

      {serverError ? <Banner kind="error" text={serverError} /> : null}

      <Field
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="correo@ejemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={errors.email}
      />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />
      <Field
        label="Confirmar contraseña"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Repite la contraseña"
        secureTextEntry
        autoCapitalize="none"
        error={errors.confirm}
        onSubmitEditing={handleRegister}
      />

      <Button title="Crear cuenta" onPress={handleRegister} loading={submitting} />

      <View style={styles.footer}>
        <Text style={styles.muted}>¿Ya tienes cuenta? </Text>
        <Pressable onPress={goToLogin}>
          <Text style={styles.link}>Volver al inicio de sesión</Text>
        </Pressable>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, color: colors.muted, marginBottom: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 },
  muted: { color: colors.muted, fontSize: 15 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
