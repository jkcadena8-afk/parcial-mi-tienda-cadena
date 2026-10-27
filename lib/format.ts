/** 1234567 -> "$1.234.567" (pesos colombianos, sin decimales). */
export function formatPesos(value: number): string {
  return `$${formatNumber(value)}`;
}

/** 1234567 -> "1.234.567". Sin Intl para no depender del soporte del motor JS. */
export function formatNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  return sign + Math.abs(Math.trunc(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Minusculas y sin tildes, para buscar "azucar" y encontrar "Azúcar". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
