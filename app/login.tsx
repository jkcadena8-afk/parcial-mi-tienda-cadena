import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner, Button, colors, Field, FormScreen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setSubmitting(true);
    const message = await signIn(email.trim(), password);
    setSubmitting(false);
    // Si sale bien, Stack.Protected lleva solo a la pantalla principal
    if (message) setError(message);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sin cabecera el fondo es claro: iconos de la barra de estado oscuros */}
      <StatusBar style="dark" />
      <FormScreen>
        <View style={styles.header}>
          <Text style={styles.logo}>🏪</Text>
          <Text style={styles.title}>Mi Tienda</Text>
          <Text style={styles.subtitle}>Inventario de tu tienda, con o sin internet</Text>
        </View>

        {error ? <Banner kind="error" text={error} /> : null}

        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Tu contraseña"
          secureTextEntry
          autoCapitalize="none"
          onSubmitEditing={handleLogin}
        />

        <Button title="Ingresar" onPress={handleLogin} loading={submitting} />

        <View style={styles.footer}>
          <Text style={styles.muted}>¿No tienes cuenta? </Text>
          <Link href="/registro" style={styles.link}>
            Regístrate
          </Link>
        </View>
      </FormScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: 40, marginBottom: 28 },
  logo: { fontSize: 56 },
  title: { fontSize: 30, fontWeight: '800', color: colors.primary, marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  muted: { color: colors.muted, fontSize: 15 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
