export const GRAPHICS_STORAGE_KEY = 'monopoli_konoha_graphics_v1';

export const GRAPHICS_PRESETS = {
  low: {
    label: 'RINGAN',
    description: 'FPS tinggi, cocok untuk HP lama atau hemat baterai.',
    resolution: 0.75,
    shadows: false,
    effects: 0.45,
    buildingHeight: 1,
    detail: 0.7,
  },
  balanced: {
    label: 'SEIMBANG',
    description: 'Visual jernih dengan performa yang tetap nyaman.',
    resolution: 1,
    shadows: true,
    effects: 1,
    buildingHeight: 1.12,
    detail: 1,
  },
  high: {
    label: 'TINGGI',
    description: 'Bayangan lebih halus, gedung lebih menjulang & efek lebih ramai.',
    resolution: 1.5,
    shadows: true,
    effects: 1.75,
    buildingHeight: 1.48,
    detail: 1.5,
  },
  // Mode khusus HP/Android: semua objek & ketajaman tetap seperti biasa, tapi
  // biaya render dipangkas (resolusi adaptif, bayangan lebih ringan, tanpa
  // lampu titik, kota sedikit lebih tenang) supaya frame tetap stabil.
  android: {
    label: 'ANDROID',
    description: 'Khusus HP/tablet: tetap tajam & semua terlihat jelas, frame stabil tanpa lag.',
    resolution: 1,
    shadows: true,
    effects: 0.9,
    buildingHeight: 1.12,
    detail: 0.95,
    mobile: true,
  },
};

export const DEFAULT_GRAPHICS_SETTINGS = Object.freeze({
  visualStyle: 'standard',
  preset: 'balanced',
  custom: Object.freeze({
    resolution: 1,
    shadows: true,
    effects: 1,
    buildingHeight: 1.12,
    detail: 1,
  }),
});

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

export function normalizeGraphicsSettings(value) {
  const preset = ['low', 'balanced', 'high', 'android', 'custom'].includes(value?.preset)
    ? value.preset
    : DEFAULT_GRAPHICS_SETTINGS.preset;
  const custom = value?.custom || {};
  return {
    visualStyle: value?.visualStyle === 'pixel' ? 'pixel' : 'standard',
    preset,
    custom: {
      resolution: clamp(custom.resolution, 0.65, 2, DEFAULT_GRAPHICS_SETTINGS.custom.resolution),
      shadows: typeof custom.shadows === 'boolean' ? custom.shadows : DEFAULT_GRAPHICS_SETTINGS.custom.shadows,
      effects: clamp(custom.effects, 0.25, 2.5, DEFAULT_GRAPHICS_SETTINGS.custom.effects),
      buildingHeight: clamp(custom.buildingHeight, 0.85, 1.8, DEFAULT_GRAPHICS_SETTINGS.custom.buildingHeight),
      detail: clamp(custom.detail, 0.5, 1.8, DEFAULT_GRAPHICS_SETTINGS.custom.detail),
    },
  };
}

export function getEffectiveGraphicsSettings(value) {
  const normalized = normalizeGraphicsSettings(value);
  const selected = normalized.preset === 'custom' ? normalized.custom : GRAPHICS_PRESETS[normalized.preset];
  return {
    ...selected,
    visualStyle: normalized.visualStyle,
    preset: normalized.preset,
    mobile: Boolean(selected.mobile),
    label: normalized.preset === 'custom' ? 'KUSTOM' : GRAPHICS_PRESETS[normalized.preset].label,
  };
}

export function loadGraphicsSettings() {
  try {
    const raw = localStorage.getItem(GRAPHICS_STORAGE_KEY);
    return normalizeGraphicsSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeGraphicsSettings(null);
  }
}
