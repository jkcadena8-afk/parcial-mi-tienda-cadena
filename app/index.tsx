import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, colors } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { isPending, useProducts, type Product } from '@/hooks/useProducts';
import { useSync } from '@/hooks/useSync';
import { formatNumber, formatPesos } from '@/lib/format';

export default function InventarioScreen() {
  const { user, signOut } = useAuth();
  // Tras cerrar sesion esta pantalla puede renderizarse una vez mas sin usuario
  const userId = user?.id ?? '';
  const [search, setSearch] = useState('');
  const { products, productCount, totalUnits, totalValue, pendingCount, remove } = useProducts(
    userId,
    search,
  );
  const { sync, syncing, message, isOnline } = useSync(userId);
  const insets = useSafeAreaInsets();

  const confirmDelete = (product: Product) => {
    Alert.alert('Eliminar producto', `¿Seguro que quieres eliminar "${product.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void remove(product.id) },
    ]);
  };

  const confirmSignOut = () => {
    const warning =
      pendingCount > 0
        ? `Tienes ${pendingCount} cambio(s) sin subir. Quedan guardados en este teléfono y se subirán cuando vuelvas a entrar y sincronices.`
        : '¿Quieres cerrar la sesión?';
    Alert.alert('Cerrar sesión', warning, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={confirmSignOut} hitSlop={10}>
              <Text style={styles.headerButton}>Cerrar sesión</Text>
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={products}
        keyExtractor={(p) => p.clientId}
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email}
            </Text>

            {isOnline === false ? (
              <Banner
                kind="warning"
                text="Sin conexión: puedes seguir trabajando, todo se guarda en el teléfono."
              />
            ) : null}

            <View style={styles.summary}>
              <SummaryItem label="Productos" value={formatNumber(productCount)} />
              <SummaryItem label="Unidades" value={formatNumber(totalUnits)} />
              <SummaryItem label="Valor total" value={formatPesos(totalValue)} wide />
            </View>

            <View style={styles.syncRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingLabel}>Pendientes de subir</Text>
                <Text
                  style={[
                    styles.pendingValue,
                    { color: pendingCount > 0 ? colors.warning : colors.success },
                  ]}
                >
                  {pendingCount}
                </Text>
              </View>
              <View style={{ flex: 1.4 }}>
                <Button title="Sincronizar" onPress={sync} loading={syncing} />
              </View>
            </View>

            {message ? (
              <Banner kind={message.isError ? 'error' : 'success'} text={message.text} />
            ) : null}

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="🔍 Buscar por nombre"
              placeholderTextColor={colors.muted}
              style={styles.search}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />

            {products.length > 0 ? (
              <Text style={styles.hint}>Toca para editar · Mantén presionado para eliminar</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search.trim()
              ? `No hay productos que coincidan con "${search.trim()}".`
              : 'Aún no tienes productos. Toca "+ Agregar" para registrar el primero.'}
          </Text>
        }
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            onPress={() => router.push({ pathname: '/producto', params: { id: String(item.id) } })}
            onLongPress={() => confirmDelete(item)}
          />
        )}
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: 20 + insets.bottom },
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => router.push('/producto')}
      >
        <Text style={styles.fabText}>+ Agregar</Text>
      </Pressable>
    </View>
  );
}

function SummaryItem({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.summaryItem, wide && { flex: 1.6 }]}>
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ProductRow({
  product,
  onPress,
  onLongPress,
}: {
  product: Product;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const pending = isPending(product);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#f0fdfa' }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{product.name}</Text>
        <Text style={styles.rowDetail}>
          {formatNumber(product.quantity)} und × {formatPesos(product.price)} ={' '}
          {formatPesos(product.quantity * product.price)}
        </Text>
      </View>
      <View style={[styles.badge, pending ? styles.badgePending : styles.badgeSynced]}>
        <Text style={[styles.badgeText, { color: pending ? colors.warning : colors.success }]}>
          {pending ? '⏳ Pendiente' : '☁️ En la nube'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerButton: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { padding: 16 },
  userEmail: { color: colors.muted, marginBottom: 10, fontSize: 13 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
  summaryLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pendingLabel: { fontSize: 13, color: colors.muted },
  pendingValue: { fontSize: 26, fontWeight: '800' },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 8, textAlign: 'center' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 30, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowName: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowDetail: { fontSize: 13, color: colors.muted, marginTop: 3 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgePending: { backgroundColor: colors.warningBg },
  badgeSynced: { backgroundColor: colors.successBg },
  badgeText: { fontSize: 12, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
