import type { ImageItem, ImageItemMeta, GroupMeta, AppSettings } from '@/types'
import { DB_CONFIG, STORAGE_KEYS } from '@/utils/constants'

interface StoredState {
  images: ImageItemMeta[]
  groups: GroupMeta[]
  settings: AppSettings
}

class Storage {
  private db: IDBDatabase | null = null
  private dbReady: Promise<void>
  private isIndexedDBAvailable: boolean

  constructor() {
    this.isIndexedDBAvailable = typeof indexedDB !== 'undefined'
    this.dbReady = this.isIndexedDBAvailable ? this.initDB() : Promise.resolve()
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(DB_CONFIG.stores.images)) {
          db.createObjectStore(DB_CONFIG.stores.images, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(DB_CONFIG.stores.thumbnails)) {
          db.createObjectStore(DB_CONFIG.stores.thumbnails, { keyPath: 'id' })
        }
      }
    })
  }

  async saveImage(image: ImageItem): Promise<void> {
    if (!this.isIndexedDBAvailable) return
    await this.dbReady
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.images], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.stores.images)
      const request = store.put(image)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getImage(id: string): Promise<ImageItem | null> {
    if (!this.isIndexedDBAvailable) return null
    await this.dbReady
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.images], 'readonly')
      const store = transaction.objectStore(DB_CONFIG.stores.images)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteImage(id: string): Promise<void> {
    if (!this.isIndexedDBAvailable) return
    await this.dbReady
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.images], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.stores.images)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async saveThumbnail(id: string, thumbnail: string): Promise<void> {
    if (!this.isIndexedDBAvailable) return
    await this.dbReady
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.thumbnails], 'readwrite')
      const store = transaction.objectStore(DB_CONFIG.stores.thumbnails)
      const request = store.put({ id, thumbnail })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getThumbnail(id: string): Promise<string | null> {
    if (!this.isIndexedDBAvailable) return null
    await this.dbReady
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.thumbnails], 'readonly')
      const store = transaction.objectStore(DB_CONFIG.stores.thumbnails)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result?.thumbnail || null)
      request.onerror = () => reject(request.error)
    })
  }

  async saveState(state: StoredState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save state:', error)
      throw error
    }
  }

  async getState(): Promise<StoredState | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.state)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to get state:', error)
      return null
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  async getSettings(): Promise<AppSettings | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.settings)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to get settings:', error)
      return null
    }
  }

  async clearAll(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEYS.state)
      localStorage.removeItem(STORAGE_KEYS.settings)

      if (this.db) {
        const transaction = this.db.transaction(
          [DB_CONFIG.stores.images, DB_CONFIG.stores.thumbnails],
          'readwrite'
        )
        transaction.objectStore(DB_CONFIG.stores.images).clear()
        transaction.objectStore(DB_CONFIG.stores.thumbnails).clear()
      }
    } catch (error) {
      console.error('Failed to clear storage:', error)
      throw error
    }
  }

  async getStorageUsage(): Promise<{ used: number; total: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        total: estimate.quota || 0,
      }
    }
    return { used: 0, total: 0 }
  }
}

export const storage = new Storage()
