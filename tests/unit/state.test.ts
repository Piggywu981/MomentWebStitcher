import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppState } from '@/core/state'
import { eventBus } from '@/core/events'
import type { ImageItem } from '@/types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
})

describe('AppState', () => {
  let state: AppState

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    state = new AppState()
    // Clear command history after initialization
    state['commandManager'].clear()
  })

  afterEach(() => {
    state.clearAll()
  })

  describe('addImages', () => {
    it('should add images to state', () => {
      const images: ImageItem[] = [
        {
          id: '1',
          name: 'test1.jpg',
          src: 'data:image/jpeg;base64,test',
          file: new File([], 'test1.jpg'),
          dateTime: new Date(),
        },
      ]

      state.addImages(images)

      expect(state.images.length).toBe(1)
      expect(state.images[0].id).toBe('1')
    })
  })

  describe('removeImage', () => {
    it('should remove image from state', () => {
      const image: ImageItem = {
        id: '1',
        name: 'test.jpg',
        src: 'data:image/jpeg;base64,test',
        file: new File([], 'test.jpg'),
        dateTime: new Date(),
      }

      state.addImages([image])
      expect(state.images.length).toBe(1)

      state.removeImage('1')
      expect(state.images.length).toBe(0)
    })
  })

  describe('createGroup', () => {
    it('should create a new group', () => {
      const group = state.createGroup('Test Group')

      expect(state.groups.length).toBe(1)
      expect(state.groups[0].name).toBe('Test Group')
      expect(group.id).toBeDefined()
    })
  })

  describe('deleteGroup', () => {
    it('should delete a group', () => {
      const group = state.createGroup('Test Group')
      expect(state.groups.length).toBe(1)

      state.deleteGroup(group.id)
      expect(state.groups.length).toBe(0)
    })
  })

  describe('addImageToGroup', () => {
    it('should add image to group', () => {
      const group = state.createGroup('Test Group')
      const image: ImageItem = {
        id: '1',
        name: 'test.jpg',
        src: 'data:image/jpeg;base64,test',
        file: new File([], 'test.jpg'),
        dateTime: new Date(),
      }

      state.addImages([image])
      state.addImageToGroup(group.id, image)

      expect(state.groups[0].images.length).toBe(1)
      expect(state.groups[0].images[0].id).toBe('1')
    })
  })

  describe('autoGroup', () => {
    it('should auto group images by date', () => {
      const images: ImageItem[] = [
        {
          id: '1',
          name: 'test1.jpg',
          src: 'data:image/jpeg;base64,test1',
          file: new File([], 'test1.jpg'),
          dateTime: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'test2.jpg',
          src: 'data:image/jpeg;base64,test2',
          file: new File([], 'test2.jpg'),
          dateTime: new Date('2024-01-02'),
        },
        {
          id: '3',
          name: 'test3.jpg',
          src: 'data:image/jpeg;base64,test3',
          file: new File([], 'test3.jpg'),
          dateTime: new Date('2024-01-03'),
        },
      ]

      state.addImages(images)
      state.autoGroup(2)

      expect(state.groups.length).toBe(2)
      expect(state.groups[0].images.length).toBe(2)
      expect(state.groups[1].images.length).toBe(1)
    })
  })

  describe('undo/redo', () => {
    it('should return false when cannot undo', () => {
      expect(state.undo()).toBe(false)
    })

    it('should return false when cannot redo', () => {
      expect(state.redo()).toBe(false)
    })

    it('should support undo after adding images', () => {
      const images: ImageItem[] = [
        {
          id: '1',
          name: 'test1.jpg',
          src: 'data:image/jpeg;base64,test',
          file: new File([], 'test1.jpg'),
          dateTime: new Date(),
        },
      ]

      state.addImages(images)
      expect(state.images.length).toBe(1)

      // Should be able to undo
      expect(state.canUndo()).toBe(true)
      expect(state.undo()).toBe(true)
      expect(state.images.length).toBe(0)
    })

    it('should support redo after undo', () => {
      const images: ImageItem[] = [
        {
          id: '1',
          name: 'test1.jpg',
          src: 'data:image/jpeg;base64,test',
          file: new File([], 'test1.jpg'),
          dateTime: new Date(),
        },
      ]

      state.addImages(images)
      expect(state.images.length).toBe(1)

      state.undo()
      expect(state.images.length).toBe(0)

      // Should be able to redo
      expect(state.canRedo()).toBe(true)
      expect(state.redo()).toBe(true)
      expect(state.images.length).toBe(1)
    })
  })
})

describe('eventBus', () => {
  it('should emit and receive events', () => {
    const callback = vi.fn()
    eventBus.on('test:event', callback)

    eventBus.emit('test:event', { data: 'test' })

    expect(callback).toHaveBeenCalledWith({ data: 'test' })
  })

  it('should support event unsubscription', () => {
    const callback = vi.fn()
    const unsubscribe = eventBus.on('test:event', callback)

    unsubscribe()
    eventBus.emit('test:event', {})

    expect(callback).not.toHaveBeenCalled()
  })

  it('should support once events', () => {
    const callback = vi.fn()
    eventBus.once('once:event', callback)

    eventBus.emit('once:event', {})
    eventBus.emit('once:event', {})

    expect(callback).toHaveBeenCalledTimes(1)
  })
})
