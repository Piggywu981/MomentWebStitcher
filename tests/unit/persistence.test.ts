import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppState } from '@/core/state'
import * as storage from '@/core/storage'
import type { ImageItem } from '@/types'

const { store, mocks } = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  const mocks = {
    saveImage: vi.fn<(img: ImageItem) => Promise<void>>((img) => {
      store.set(img.id, img)
      return Promise.resolve()
    }),
    getImage: vi.fn<(id: string) => Promise<ImageItem | null>>(async (id) => {
      return (store.get(id) as ImageItem) ?? null
    }),
    deleteImage: vi.fn<(id: string) => Promise<void>>((id) => {
      store.delete(id)
      return Promise.resolve()
    }),
    clearAll: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    saveState: vi.fn<(state: unknown) => Promise<void>>(() => Promise.resolve()),
    getState: vi.fn<() => Promise<unknown>>(async () => null),
    getSettings: vi.fn<() => Promise<unknown>>(async () => null),
    saveSettings: vi.fn<(settings: unknown) => Promise<void>>(() => Promise.resolve()),
    getThumbnail: vi.fn<(id: string) => Promise<string | null>>(async () => null),
    saveThumbnail: vi.fn<(id: string, thumb: string) => Promise<void>>(() => Promise.resolve()),
    getStorageUsage: vi.fn<() => Promise<{ used: number; total: number }>>(async () => ({
      used: 0,
      total: 0,
    })),
  }
  return { store, mocks }
})

vi.mock('@/core/storage', () => ({ storage: mocks }))

function makeImage(id: string): ImageItem {
  return {
    id,
    name: `${id}.png`,
    src: `data:image/png;base64,payload-${id}`,
    file: new File([], `${id}.png`),
    dateTime: new Date('2024-01-01T00:00:00'),
  }
}

describe('persistence', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
    mocks.getState.mockResolvedValue(null)
    mocks.getSettings.mockResolvedValue(null)
  })

  it('persists only lightweight metadata to localStorage, not image blobs', () => {
    const state = new AppState()
    const img = makeImage('1')
    state.addImages([img])

    // Image data goes to IndexedDB
    expect(mocks.saveImage).toHaveBeenCalledWith(img)

    // localStorage only holds metadata, never src/blob
    const savedState = mocks.saveState.mock.calls[0][0] as {
      images: Array<Record<string, unknown>>
    }
    expect(savedState.images).toHaveLength(1)
    expect(savedState.images[0]).toHaveProperty('id', '1')
    expect(savedState.images[0]).not.toHaveProperty('src')
    expect(savedState.images[0]).not.toHaveProperty('file')
    expect(savedState.images[0]).not.toHaveProperty('thumbnail')
  })

  it('reconstructs full images and groups from IndexedDB on load', async () => {
    const img = makeImage('1')
    // Seed IndexedDB store, simulate saved lightweight state
    await storage.storage.saveImage(img)
    mocks.getState.mockResolvedValue({
      images: [{ id: '1', name: '1.png', dateTime: img.dateTime.toISOString() }],
      groups: [{ id: 'g1', name: '分组 1', imageIds: ['1'] }],
      settings: {
        groupSize: 9,
        outputQuality: 95,
        outputFormat: 'jpeg',
        theme: 'system',
        autoSave: true,
      },
    })

    const state = new AppState()

    await vi.waitFor(() => expect(state.images).toHaveLength(1))
    expect(state.images[0].src).toBe(img.src)
    expect(state.images[0].file.size).toBe(img.file.size)
    expect(state.groups).toHaveLength(1)
    expect(state.groups[0].images[0].id).toBe('1')
  })
})
