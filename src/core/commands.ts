import type { Command, CommandType, ImageItem, ImageGroup, AppSettings } from '@/types'
import type { AppState } from './state'
import { storage } from './storage'

export class CommandManager {
  private history: Command[] = []
  private currentIndex = -1
  private maxHistory = 50

  execute(command: Command): void {
    command.redo()

    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    this.history.push(command)

    if (this.history.length > this.maxHistory) {
      this.history.shift()
    } else {
      this.currentIndex++
    }
  }

  undo(): boolean {
    if (this.currentIndex >= 0) {
      this.history[this.currentIndex].undo()
      this.currentIndex--
      return true
    }
    return false
  }

  redo(): boolean {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      this.history[this.currentIndex].redo()
      return true
    }
    return false
  }

  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  clear(): void {
    this.history = []
    this.currentIndex = -1
  }
}

export function createAddImagesCommand(state: AppState, images: ImageItem[]): Command {
  return {
    type: 'ADD_IMAGES' as CommandType,
    payload: images,
    undo: () => {
      const ids = new Set(images.map((img) => img.id))
      state.images = state.images.filter((img) => !ids.has(img.id))
      images.forEach((img) => storage.deleteImage(img.id))
    },
    redo: () => {
      state.images.push(...images)
      images.forEach((img) => storage.saveImage(img))
    },
  }
}

export function createRemoveImageCommand(state: AppState, imageId: string): Command {
  const index = state.images.findIndex((img) => img.id === imageId)
  const image = state.images[index]
  const groupIndices: number[] = []

  state.groups.forEach((group, idx) => {
    const imgIndex = group.images.findIndex((img) => img.id === imageId)
    if (imgIndex > -1) {
      groupIndices.push(idx)
    }
  })

  return {
    type: 'REMOVE_IMAGE' as CommandType,
    payload: imageId,
    undo: () => {
      if (image) {
        state.images.splice(index, 0, image)
        storage.saveImage(image)
      }
    },
    redo: () => {
      state.images = state.images.filter((img) => img.id !== imageId)
      state.groups.forEach((group) => {
        group.images = group.images.filter((img) => img.id !== imageId)
      })
      storage.deleteImage(imageId)
    },
  }
}

export function createCreateGroupCommand(state: AppState, group: ImageGroup): Command {
  return {
    type: 'CREATE_GROUP' as CommandType,
    payload: group,
    undo: () => {
      state.groups = state.groups.filter((g) => g.id !== group.id)
    },
    redo: () => {
      state.groups.push(group)
    },
  }
}

export function createDeleteGroupCommand(state: AppState, groupId: string): Command {
  const index = state.groups.findIndex((g) => g.id === groupId)
  const group = state.groups[index]

  return {
    type: 'DELETE_GROUP' as CommandType,
    payload: groupId,
    undo: () => {
      if (group) {
        state.groups.splice(index, 0, group)
      }
    },
    redo: () => {
      state.groups = state.groups.filter((g) => g.id !== groupId)
    },
  }
}

export function createAddToGroupCommand(
  state: AppState,
  groupId: string,
  image: ImageItem,
  position?: number
): Command {
  const group = state.groups.find((g) => g.id === groupId)

  return {
    type: 'ADD_TO_GROUP' as CommandType,
    payload: { groupId, image, position },
    undo: () => {
      if (group) {
        group.images = group.images.filter((img) => img.id !== image.id)
      }
    },
    redo: () => {
      if (group) {
        if (position !== undefined && position >= 0) {
          group.images.splice(position, 0, image)
        } else {
          group.images.push(image)
        }
      }
    },
  }
}

export function createRemoveFromGroupCommand(
  state: AppState,
  groupId: string,
  imageId: string
): Command {
  const group = state.groups.find((g) => g.id === groupId)
  const imageIndex = group?.images.findIndex((img) => img.id === imageId) ?? -1
  const image = group?.images[imageIndex]

  return {
    type: 'REMOVE_FROM_GROUP' as CommandType,
    payload: { groupId, imageId },
    undo: () => {
      if (group && image && imageIndex > -1) {
        group.images.splice(imageIndex, 0, image)
      }
    },
    redo: () => {
      if (group) {
        group.images = group.images.filter((img) => img.id !== imageId)
      }
    },
  }
}

export function createReorderGroupCommand(
  state: AppState,
  groupId: string,
  oldIndex: number,
  newIndex: number
): Command {
  const group = state.groups.find((g) => g.id === groupId)

  return {
    type: 'REORDER_GROUP' as CommandType,
    payload: { groupId, oldIndex, newIndex },
    undo: () => {
      if (group) {
        const [moved] = group.images.splice(newIndex, 1)
        group.images.splice(oldIndex, 0, moved)
      }
    },
    redo: () => {
      if (group) {
        const [moved] = group.images.splice(oldIndex, 1)
        group.images.splice(newIndex, 0, moved)
      }
    },
  }
}

export function createClearGroupCommand(state: AppState, groupId: string): Command {
  const group = state.groups.find((g) => g.id === groupId)
  const previousImages = group ? [...group.images] : []

  return {
    type: 'CLEAR_GROUP' as CommandType,
    payload: groupId,
    undo: () => {
      if (group) {
        group.images = [...previousImages]
      }
    },
    redo: () => {
      if (group) {
        group.images = []
      }
    },
  }
}

export function createClearAllCommand(state: AppState): Command {
  const previousImages = [...state.images]
  const previousGroups = [...state.groups]

  return {
    type: 'CLEAR_ALL' as CommandType,
    payload: null,
    undo: () => {
      state.images = previousImages
      state.groups = previousGroups
      previousImages.forEach((img) => storage.saveImage(img))
    },
    redo: () => {
      state.images = []
      state.groups = []
      previousImages.forEach((img) => storage.deleteImage(img.id))
    },
  }
}

export function createUpdateSettingsCommand(
  state: AppState,
  newSettings: Partial<AppSettings>
): Command {
  const oldSettings = { ...state.settings }

  return {
    type: 'UPDATE_SETTINGS' as CommandType,
    payload: newSettings,
    undo: () => {
      state.settings = oldSettings
    },
    redo: () => {
      state.settings = { ...state.settings, ...newSettings }
    },
  }
}
