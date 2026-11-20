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
  platform: 'pc',
  custom: Object.freeze({
    resolution: 1,
    shadows: true,
    effects: 1,
    buildingHeight: 1.12,
    detail: 1,
    crowd: 1,
    decor: 1,
  }),
});

/** Batas slider detail untuk tiap perangkat. Di Android batasnya lebih rendah
    supaya frame tetap stabil, di PC boleh penuh. */
export const PLATFORM_DETAIL_LIMITS = {
  pc: {
    label: 'PC / LAPTOP',
    note: 'Semua slider terbuka penuh — pakai sesuai kemampuan VGA.',
    resolution: [0.65, 2.2],
    detail: [0.5, 2],
    crowd: [0.4, 1.6],
    decor: [0.4, 1.6],
    effects: [0.25, 2.5],
    buildingHeight: [0.85, 1.8],
  },
  android: {
    label: 'ANDROID / HP',
    note: 'Batas otomatis lebih rendah + resolusi adaptif, supaya tidak lag & tidak panas.',
    resolution: [0.7, 1.35],
    detail: [0.5, 1.25],
    crowd: [0.4, 1.1],
    decor: [0.4, 1.1],
    effects: [0.25, 1.3],
    buildingHeight: [0.85, 1.4],
  },
};

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

export function normalizeGraphicsSettings(value) {
  const preset = ['low', 'balanced', 'high', 'android', 'custom'].includes(value?.preset)
    ? value.preset
    : DEFAULT_GRAPHICS_SETTINGS.preset;
  const custom = value?.custom || {};
  const platform = value?.platform === 'android' ? 'android' : 'pc';
  const limits = PLATFORM_DETAIL_LIMITS[platform];
  return {
    visualStyle: value?.visualStyle === 'pixel' ? 'pixel' : 'standard',
    preset,
    platform,
    custom: {
      resolution: clamp(custom.resolution, limits.resolution[0], limits.resolution[1], DEFAULT_GRAPHICS_SETTINGS.custom.resolution),
      shadows: typeof custom.shadows === 'boolean' ? custom.shadows : DEFAULT_GRAPHICS_SETTINGS.custom.shadows,
      effects: clamp(custom.effects, limits.effects[0], limits.effects[1], DEFAULT_GRAPHICS_SETTINGS.custom.effects),
      buildingHeight: clamp(custom.buildingHeight, limits.buildingHeight[0], limits.buildingHeight[1], DEFAULT_GRAPHICS_SETTINGS.custom.buildingHeight),
      detail: clamp(custom.detail, limits.detail[0], limits.detail[1], DEFAULT_GRAPHICS_SETTINGS.custom.detail),
      crowd: clamp(custom.crowd, limits.crowd[0], limits.crowd[1], DEFAULT_GRAPHICS_SETTINGS.custom.crowd),
      decor: clamp(custom.decor, limits.decor[0], limits.decor[1], DEFAULT_GRAPHICS_SETTINGS.custom.decor),
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
    platform: normalized.platform,
    mobile: Boolean(selected.mobile) || normalized.platform === 'android',
    crowd: selected.crowd ?? normalized.custom.crowd,
    decor: selected.decor ?? normalized.custom.decor,
    label: normalized.preset === 'custom' ? 'KUSTOM' : GRAPHICS_PRESETS[normalized.preset].label,
  };
}

const detectMobileDevice = () => {
  try {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk/i.test(navigator.userAgent || '');
  } catch {
    return false;
  }
};

export function loadGraphicsSettings() {
  try {
    const raw = localStorage.getItem(GRAPHICS_STORAGE_KEY);
    if (raw) return normalizeGraphicsSettings(JSON.parse(raw));
  } catch {
    // lanjut ke deteksi perangkat
  }
  // Pertama kali buka: HP/tablet langsung pakai mode Android (batas detail
  // lebih rendah + resolusi adaptif), PC memakai SEIMBANG dengan slider penuh.
  const mobile = detectMobileDevice();
  return normalizeGraphicsSettings(
    mobile ? { platform: 'android', preset: 'android' } : { platform: 'pc', preset: 'balanced' }
  );
}
