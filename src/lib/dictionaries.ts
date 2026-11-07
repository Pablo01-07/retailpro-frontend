export const FEATURE_TRANSLATIONS: Record<string, string> = {
  lag_1: 'Ventas del día anterior (Lag 1)',
  lag_2: 'Ventas de hace 2 días (Lag 2)',
  lag_3: 'Ventas de hace 3 días (Lag 3)',
  lag_7: 'Ventas de hace 7 días (Lag 7)',
  lag_14: 'Ventas de hace 14 días (Lag 14)',
  lag_21: 'Ventas de hace 21 días (Lag 21)',
  lag_28: 'Ventas de hace 28 días (Lag 28)',

  rolling_mean_7: 'Promedio de ventas (7 días)',
  rolling_mean_14: 'Promedio de ventas (14 días)',
  rolling_mean_28: 'Promedio de ventas (28 días)',
  rolling_std_14: 'Volatilidad de ventas (14 días)',

  precio_unitario: 'Precio unitario',
  sku_idx: 'Efecto base del producto',
  categoria_idx: 'Efecto de categoría',
  horizonte_dias: 'Horizonte de proyección',

  dia_semana: 'Día de la semana',
  es_fin_de_semana: 'Efecto fin de semana',
  es_fin_semana: 'Efecto fin de semana',
  dia_mes: 'Día del mes',
  mes: 'Mes del año',
  es_quincena: 'Efecto quincena',
  es_festivo: 'Efecto feriado / festivo',

  mes_sin: 'Estacionalidad mensual',
  mes_cos: 'Estacionalidad mensual',
  dia_semana_sin: 'Patrón semanal',
  dia_semana_cos: 'Patrón semanal',
};

export const formatFeatureLabel = (key: string): string => {
  if (FEATURE_TRANSLATIONS[key]) {
    return FEATURE_TRANSLATIONS[key];
  }
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
