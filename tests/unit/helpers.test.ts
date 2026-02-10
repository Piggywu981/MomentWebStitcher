import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateId,
  formatFileSize,
  formatDate,
  debounce,
  throttle,
  clamp,
  chunkArray,
} from '@/utils/helpers'

describe('helpers', () => {
  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId()
      const id2 = generateId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should format partial sizes', () => {
      expect(formatFileSize(1500)).toBe('1.46 KB')
      expect(formatFileSize(1500 * 1024)).toBe('1.46 MB')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date(2024, 0, 15, 10, 30, 0)
      const formatted = formatDate(date)

      expect(formatted).toContain('2024')
      expect(formatted).toContain('01')
      expect(formatted).toContain('15')
      expect(formatted).toContain('10')
      expect(formatted).toContain('30')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should delay function execution', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(150)

      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should limit function calls', () => {
      const fn = vi.fn()
      const throttledFn = throttle(fn, 100)

      throttledFn()
      throttledFn()
      throttledFn()

      expect(fn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(150)

      throttledFn()
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })
  })

  describe('chunkArray', () => {
    it('should split array into chunks', () => {
      const array = [1, 2, 3, 4, 5, 6, 7]
      const chunks = chunkArray(array, 3)

      expect(chunks.length).toBe(3)
      expect(chunks[0]).toEqual([1, 2, 3])
      expect(chunks[1]).toEqual([4, 5, 6])
      expect(chunks[2]).toEqual([7])
    })

    it('should handle empty array', () => {
      const chunks = chunkArray([], 3)
      expect(chunks.length).toBe(0)
    })
  })
})
