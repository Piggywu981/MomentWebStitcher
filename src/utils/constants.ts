export const APP_NAME = 'MomentStitcher'
export const APP_VERSION = '2.0.0'

export const DEFAULT_SETTINGS = {
  groupSize: 9,
  outputQuality: 95,
  outputFormat: 'jpeg' as const,
  theme: 'system' as const,
  autoSave: true,
}

export const LIMITS = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxImages: 200,
  maxGroups: 50,
  thumbnailSize: 200,
  previewSize: 800,
}

export const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
]

export const OUTPUT_FORMATS = [
  { value: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg' },
  { value: 'png', label: 'PNG', mimeType: 'image/png' },
  { value: 'webp', label: 'WebP', mimeType: 'image/webp' },
]

export const STORAGE_KEYS = {
  state: 'moment-stitcher-state',
  settings: 'moment-stitcher-settings',
  theme: 'moment-stitcher-theme',
}

export const DB_CONFIG = {
  name: 'MomentStitcherDB',
  version: 1,
  stores: {
    images: 'images',
    thumbnails: 'thumbnails',
  },
}

export const TOAST_DURATION = {
  short: 2000,
  normal: 4000,
  long: 6000,
}

export const KEYBOARD_SHORTCUTS = {
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  clear: 'Ctrl+Shift+C',
  stitch: 'Ctrl+Enter',
  addImages: 'Ctrl+O',
  selectAll: 'Ctrl+A',
  delete: 'Delete',
}

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
}

export const DEBOUNCE_DELAY = {
  input: 300,
  resize: 200,
  scroll: 100,
}
