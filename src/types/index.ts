export interface ImageItem {
  id: string
  name: string
  src: string
  file: File
  dateTime: Date
  width?: number
  height?: number
  thumbnail?: string
}

export interface ImageGroup {
  id: string
  name: string
  images: ImageItem[]
}

export interface AppState {
  images: ImageItem[]
  groups: ImageGroup[]
  settings: AppSettings
  isProcessing: boolean
  progress: number
  currentTask: string
}

export interface AppSettings {
  groupSize: number
  outputQuality: number
  outputFormat: 'jpeg' | 'png' | 'webp'
  theme: 'light' | 'dark' | 'system'
  autoSave: boolean
}

export interface StitchResult {
  blob: Blob
  url: string
  filename: string
  width: number
  height: number
}

export interface ProcessingProgress {
  current: number
  total: number
  message: string
}

export type CommandType =
  | 'ADD_IMAGES'
  | 'REMOVE_IMAGE'
  | 'CREATE_GROUP'
  | 'DELETE_GROUP'
  | 'ADD_TO_GROUP'
  | 'REMOVE_FROM_GROUP'
  | 'REORDER_GROUP'
  | 'CLEAR_ALL'
  | 'UPDATE_SETTINGS'

export interface Command {
  type: CommandType
  payload: unknown
  undo: () => void
  redo: () => void
}

export type Theme = 'light' | 'dark' | 'system'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

export interface DragItem {
  id: string
  type: 'image' | 'group'
  index: number
}
