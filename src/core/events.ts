type EventCallback = (data: unknown) => void

class EventBus {
  private events: Map<string, EventCallback[]>

  constructor() {
    this.events = new Map()
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)

    return () => this.off(event, callback)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event: string, data?: unknown): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  once(event: string, callback: EventCallback): void {
    const onceCallback = (data: unknown) => {
      this.off(event, onceCallback)
      callback(data)
    }
    this.on(event, onceCallback)
  }
}

export const eventBus = new EventBus()

export const Events = {
  // Image events
  IMAGES_ADDED: 'images:added',
  IMAGES_REMOVED: 'images:removed',
  IMAGE_SELECTED: 'image:selected',

  // Group events
  GROUP_CREATED: 'group:created',
  GROUP_DELETED: 'group:deleted',
  GROUP_UPDATED: 'group:updated',
  IMAGE_ADDED_TO_GROUP: 'group:image-added',
  IMAGE_REMOVED_FROM_GROUP: 'group:image-removed',

  // Processing events
  PROCESSING_STARTED: 'processing:started',
  PROCESSING_PROGRESS: 'processing:progress',
  PROCESSING_COMPLETED: 'processing:completed',
  PROCESSING_ERROR: 'processing:error',
  STITCH_COMPLETE: 'stitch:complete',
  ACTION_STITCH: 'action:stitch',

  // UI events
  THEME_CHANGED: 'ui:theme-changed',
  SETTINGS_UPDATED: 'ui:settings-updated',
  TOAST_SHOW: 'ui:toast-show',
  MODAL_OPEN: 'ui:modal-open',
  MODAL_CLOSE: 'ui:modal-close',

  // State events
  STATE_CHANGED: 'state:changed',
  STATE_RESET: 'state:reset',
  UNDO: 'state:undo',
  REDO: 'state:redo',
} as const
