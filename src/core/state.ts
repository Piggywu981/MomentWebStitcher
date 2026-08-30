import type {
  AppState as IAppState,
  ImageItem,
  ImageGroup,
  ImageItemMeta,
  GroupMeta,
  AppSettings,
} from '@/types'
import { DEFAULT_SETTINGS } from '@/utils/constants'
import {
  CommandManager,
  createAddImagesCommand,
  createRemoveImageCommand,
  createCreateGroupCommand,
  createDeleteGroupCommand,
  createAddToGroupCommand,
  createRemoveFromGroupCommand,
  createClearGroupCommand,
  createClearAllCommand,
} from './commands'
import { eventBus, Events } from './events'
import { storage } from './storage'

export class AppState implements IAppState {
  images: ImageItem[] = []
  groups: ImageGroup[] = []
  settings: AppSettings = { ...DEFAULT_SETTINGS }
  isProcessing = false
  progress = 0
  currentTask = ''

  private commandManager = new CommandManager()
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.loadFromStorage()
    this.setupAutoSave()
  }

  // Images
  addImages(images: ImageItem[]): void {
    const command = createAddImagesCommand(this, images)
    this.commandManager.execute(command)
    this.saveToStorage()
    eventBus.emit(Events.IMAGES_ADDED, images)
  }

  removeImage(imageId: string): void {
    const command = createRemoveImageCommand(this, imageId)
    this.commandManager.execute(command)
    this.saveToStorage()
    eventBus.emit(Events.IMAGES_REMOVED, imageId)
  }

  // Groups
  createGroup(name?: string): ImageGroup {
    const group: ImageGroup = {
      id: crypto.randomUUID(),
      name: name || `分组 ${this.groups.length + 1}`,
      images: [],
    }
    const command = createCreateGroupCommand(this, group)
    this.commandManager.execute(command)
    this.emitChange()
    eventBus.emit(Events.GROUP_CREATED, group)
    return group
  }

  deleteGroup(groupId: string): void {
    const command = createDeleteGroupCommand(this, groupId)
    this.commandManager.execute(command)
    this.emitChange()
    eventBus.emit(Events.GROUP_DELETED, groupId)
  }

  addImageToGroup(groupId: string, image: ImageItem, position?: number): void {
    const command = createAddToGroupCommand(this, groupId, image, position)
    this.commandManager.execute(command)
    this.emitChange()
    eventBus.emit(Events.IMAGE_ADDED_TO_GROUP, { groupId, image })
  }

  removeImageFromGroup(groupId: string, imageId: string): void {
    const command = createRemoveFromGroupCommand(this, groupId, imageId)
    this.commandManager.execute(command)
    this.emitChange()
    eventBus.emit(Events.IMAGE_REMOVED_FROM_GROUP, { groupId, imageId })
  }

  clearGroupImages(groupId: string): void {
    const command = createClearGroupCommand(this, groupId)
    this.commandManager.execute(command)
    this.emitChange()
    const group = this.groups.find((g) => g.id === groupId)
    if (group) eventBus.emit(Events.GROUP_UPDATED, group)
  }

  reorderGroupImages(groupId: string, oldIndex: number, newIndex: number): void {
    const group = this.groups.find((g) => g.id === groupId)
    if (!group) return

    const [moved] = group.images.splice(oldIndex, 1)
    group.images.splice(newIndex, 0, moved)
    this.emitChange()
    eventBus.emit(Events.GROUP_UPDATED, group)
  }

  autoGroup(groupSize: number): void {
    const sortedImages = [...this.images].sort(
      (a, b) => a.dateTime.getTime() - b.dateTime.getTime()
    )

    this.groups = []
    for (let i = 0; i < sortedImages.length; i += groupSize) {
      const groupImages = sortedImages.slice(i, i + groupSize)
      this.groups.push({
        id: crypto.randomUUID(),
        name: `分组 ${Math.floor(i / groupSize) + 1}`,
        images: groupImages,
      })
    }
    this.emitChange()
    eventBus.emit(Events.GROUP_UPDATED)
  }

  // Processing
  setProcessing(processing: boolean): void {
    this.isProcessing = processing
    this.emitChange()
    eventBus.emit(processing ? Events.PROCESSING_STARTED : Events.PROCESSING_COMPLETED)
  }

  setProgress(progress: number, task?: string): void {
    this.progress = Math.max(0, Math.min(100, progress))
    if (task) this.currentTask = task
    this.emitChange()
    eventBus.emit(Events.PROCESSING_PROGRESS, { progress: this.progress, task: this.currentTask })
  }

  // Settings
  updateSettings(newSettings: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.emitChange()
    eventBus.emit(Events.SETTINGS_UPDATED, this.settings)
  }

  // Undo/Redo
  undo(): boolean {
    const result = this.commandManager.undo()
    if (result) {
      this.emitChange()
      eventBus.emit(Events.UNDO)
    }
    return result
  }

  redo(): boolean {
    const result = this.commandManager.redo()
    if (result) {
      this.emitChange()
      eventBus.emit(Events.REDO)
    }
    return result
  }

  canUndo(): boolean {
    return this.commandManager.canUndo()
  }

  canRedo(): boolean {
    return this.commandManager.canRedo()
  }

  // Storage
  private async loadFromStorage(): Promise<void> {
    try {
      const savedState = await storage.getState()
      if (savedState) {
        // Rebuild full images from IndexedDB (photo data lives there, not in localStorage)
        const restoredImages: ImageItem[] = []
        for (const meta of savedState.images || []) {
          const img = await storage.getImage(meta.id)
          if (img) {
            restoredImages.push({ ...img, dateTime: new Date(img.dateTime) })
          }
        }
        this.images = restoredImages

        this.groups = (savedState.groups || []).map((group) => ({
          id: group.id,
          name: group.name,
          images: (group.imageIds || [])
            .map((id) => this.images.find((img) => img.id === id))
            .filter((img): img is ImageItem => !!img),
        }))

        this.settings = { ...DEFAULT_SETTINGS, ...savedState.settings }
      }

      const savedSettings = await storage.getSettings()
      if (savedSettings) {
        this.settings = { ...this.settings, ...savedSettings }
      }

      if (savedState) {
        eventBus.emit(Events.IMAGES_ADDED)
        eventBus.emit(Events.GROUP_UPDATED)
      }
    } catch (error) {
      console.error('Failed to load from storage:', error)
    }
  }

  async saveToStorage(): Promise<void> {
    try {
      const images: ImageItemMeta[] = this.images.map((img) => ({
        id: img.id,
        name: img.name,
        dateTime: img.dateTime.toISOString(),
        ...(img.width != null ? { width: img.width } : {}),
        ...(img.height != null ? { height: img.height } : {}),
      }))
      const groups: GroupMeta[] = this.groups.map((g) => ({
        id: g.id,
        name: g.name,
        imageIds: g.images.map((img) => img.id),
      }))

      await storage.saveState({ images, groups, settings: this.settings })
    } catch (error) {
      console.error('Failed to save to storage:', error)
    }
  }

  private setupAutoSave(): void {
    eventBus.on(Events.STATE_CHANGED, () => {
      if (this.settings.autoSave) {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer)
        }
        this.autoSaveTimer = setTimeout(() => {
          this.saveToStorage()
        }, 1000)
      }
    })
  }

  // Clear all
  clearAll(): void {
    const command = createClearAllCommand(this)
    this.commandManager.execute(command)
    this.saveToStorage()
    eventBus.emit(Events.STATE_RESET)
  }

  emitChange(): void {
    eventBus.emit(Events.STATE_CHANGED, this.getState())
  }

  getState(): IAppState {
    return {
      images: this.images,
      groups: this.groups,
      settings: this.settings,
      isProcessing: this.isProcessing,
      progress: this.progress,
      currentTask: this.currentTask,
    }
  }
}

export const appState = new AppState()
