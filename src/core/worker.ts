import type { StitchResult, ProcessingProgress } from '@/types'
import ImageProcessorWorker from '@/workers/imageProcessor?worker'

class ImageProcessor {
  private worker: Worker | null = null
  private isProcessing = false

  async stitchImages(
    images: string[],
    quality: number,
    format: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<StitchResult> {
    if (this.isProcessing) {
      throw new Error('Already processing')
    }

    this.isProcessing = true

    return new Promise((resolve, reject) => {
      try {
        this.worker = new ImageProcessorWorker()

        this.worker.onmessage = (e: MessageEvent) => {
          const { type, progress, result, error } = e.data

          switch (type) {
            case 'progress':
              onProgress?.(progress)
              break
            case 'complete':
              this.cleanup()
              resolve(result)
              break
            case 'error':
              this.cleanup()
              reject(new Error(error))
              break
          }
        }

        this.worker.onerror = (error) => {
          this.cleanup()
          reject(error)
        }

        this.worker.postMessage({
          type: 'stitch',
          images,
          quality,
          format,
        })
      } catch (error) {
        this.cleanup()
        reject(error)
      }
    })
  }

  cancel(): void {
    this.cleanup()
  }

  private cleanup(): void {
    this.isProcessing = false
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }

  isBusy(): boolean {
    return this.isProcessing
  }
}

export const imageProcessor = new ImageProcessor()
