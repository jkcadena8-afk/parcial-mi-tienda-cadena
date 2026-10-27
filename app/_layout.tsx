import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/ui';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useDatabaseMigrations } from '@/db/migrate';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { success, error } = useDatabaseMigrations();
  const { session, loading } = useAuth();

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No se pudo preparar la base de datos local:</Text>
        <Text style={styles.error}>{error.message}</Text>
      </View>
    );
  }

  // Esperar a que existan las tablas y a saber si hay sesion guardada
  if (!success || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const signedIn = session !== null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Con sesion solo existen Principal y Formulario */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ title: 'Mi Tienda' }} />
        <Stack.Screen name="producto" options={{ title: 'Producto' }} />
      </Stack.Protected>

      {/* Sin sesion solo existen Login y Registro */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  error: { color: colors.danger, textAlign: 'center', marginBottom: 8 },
});
