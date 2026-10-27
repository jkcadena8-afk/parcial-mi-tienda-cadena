import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, colors, Field, FormScreen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { isPending, useProduct, type ProductInput } from '@/hooks/useProducts';

/** Limite de la columna integer de Postgres: mas alto fallaria al sincronizar. */
const MAX_INT = 2_147_483_647;

interface Errors {
  name?: string;
  quantity?: string;
  price?: string;
}

/** Entero >= 0 escrito solo con digitos ("12"), sin signos, puntos ni decimales. */
function parseNonNegativeInt(text: string): number | null {
  const clean = text.trim();
  if (!/^\d+$/.test(clean)) return null;
  const value = Number(clean);
  return value <= MAX_INT ? value : null;
}

function validate(name: string, quantity: string, price: string) {
  const errors: Errors = {};
  if (!name.trim()) errors.name = 'El nombre es obligatorio.';
  const q = parseNonNegativeInt(quantity);
  if (q === null) errors.quantity = 'La cantidad debe ser un número entero mayor o igual a 0.';
  const p = parseNonNegativeInt(price);
  if (p === null) errors.price = 'El precio debe ser un número entero (pesos, sin decimales) mayor o igual a 0.';
  const input: ProductInput | null =
    q !== null && p !== null && name.trim() ? { name: name.trim(), quantity: q, price: p } : null;
  return { errors, input };
}

export default function ProductoScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const parsedId = idParam ? Number(idParam) : null;
  const id = parsedId !== null && Number.isInteger(parsedId) ? parsedId : null;
  const isEdit = idParam !== undefined;

  const { user } = useAuth();
  const { product, loading, save, remove } = useProduct(user?.id ?? '', id);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Rellenar el formulario cuando termina de cargar el producto a editar
  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setQuantity(String(product.quantity));
    setPrice(String(product.price));
  }, [product]);

  const { errors } = attempted ? validate(name, quantity, price) : { errors: {} as Errors };

  const handleSave = async () => {
    setAttempted(true);
    setSaveError(null);
    const { input } = validate(name, quantity, price);
    if (!input) return;
    setSaving(true);
    try {
      await save(input);
      router.back();
    } catch (e) {
      setSaveError(`No se pudo guardar: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Eliminar producto', `¿Seguro que quieres eliminar "${product?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await remove();
          router.back();
        },
      },
    ]);
  };

  const title = isEdit ? 'Editar producto' : 'Nuevo producto';

  if (isEdit && loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isEdit && !product) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title }} />
        <Text style={styles.notFound}>Este producto no existe o fue eliminado.</Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <FormScreen>
      <Stack.Screen options={{ title }} />

      {product ? (
        <Text style={styles.status}>
          Estado: {isPending(product) ? '⏳ pendiente de subir' : '☁️ guardado en la nube'}
        </Text>
      ) : null}

      {saveError ? <Banner kind="error" text={saveError} /> : null}

      <Field
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Ej: Arroz Diana 500 g"
        autoCapitalize="sentences"
        error={errors.name}
      />
      <Field
        label="Cantidad (unidades)"
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Ej: 24"
        keyboardType="number-pad"
        error={errors.quantity}
      />
      <Field
        label="Precio (pesos, sin decimales)"
        value={price}
        onChangeText={setPrice}
        placeholder="Ej: 2500"
        keyboardType="number-pad"
        error={errors.price}
      />

      <View style={{ gap: 10, marginTop: 6 }}>
        <Button title={isEdit ? 'Guardar cambios' : 'Agregar producto'} onPress={handleSave} loading={saving} />
        {isEdit ? <Button title="Eliminar producto" variant="danger" onPress={handleDelete} /> : null}
        <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: colors.background,
  },
  notFound: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  status: { color: colors.muted, marginBottom: 14, fontSize: 14 },
});
