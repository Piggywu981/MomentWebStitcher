import type { StitchResult, ProcessingProgress } from '@/types'

interface StitchMessage {
  type: 'stitch'
  images: string[]
  quality: number
  format: string
}

self.onmessage = async (e: MessageEvent<StitchMessage>) => {
  const { type, images, quality, format } = e.data

  if (type !== 'stitch') return

  try {
    const result = await stitchImages(images, quality, format, (progress) => {
      self.postMessage({ type: 'progress', progress })
    })

    self.postMessage({ type: 'complete', result })
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

interface ScaledImage {
  bitmap: ImageBitmap
  originalWidth: number
  originalHeight: number
  scaledHeight: number
}

async function stitchImages(
  imageSources: string[],
  quality: number,
  format: string,
  onProgress: (progress: ProcessingProgress) => void
): Promise<StitchResult> {
  const imageBitmaps: ScaledImage[] = []
  let minWidth = Infinity
  let totalHeight = 0

  // Load all images
  onProgress({ current: 0, total: imageSources.length, message: '加载图片中...' })

  for (let i = 0; i < imageSources.length; i++) {
    const { bitmap, width, height } = await loadImage(imageSources[i])
    imageBitmaps.push({
      bitmap,
      originalWidth: width,
      originalHeight: height,
      scaledHeight: height,
    })
    minWidth = Math.min(minWidth, width)
    onProgress({
      current: i + 1,
      total: imageSources.length,
      message: `加载图片 ${i + 1}/${imageSources.length}`,
    })
  }

  // Calculate scaled dimensions
  imageBitmaps.forEach((img) => {
    const scale = minWidth / img.originalWidth
    img.scaledHeight = Math.round(img.originalHeight * scale)
    totalHeight += img.scaledHeight
  })

  // Create canvas using OffscreenCanvas
  const canvas = new OffscreenCanvas(minWidth, totalHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Fill white background
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw images
  onProgress({ current: 0, total: imageBitmaps.length, message: '拼接图片中...' })

  let yOffset = 0
  for (let i = 0; i < imageBitmaps.length; i++) {
    const { bitmap, scaledHeight } = imageBitmaps[i]
    ctx.drawImage(bitmap, 0, yOffset, minWidth, scaledHeight)
    yOffset += scaledHeight

    onProgress({
      current: i + 1,
      total: imageBitmaps.length,
      message: `拼接图片 ${i + 1}/${imageBitmaps.length}`,
    })
  }

  // Convert to blob
  onProgress({ current: 0, total: 1, message: '生成图片中...' })

  const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`
  const blob = await canvas.convertToBlob({ type: mimeType, quality: quality / 100 })

  onProgress({ current: 1, total: 1, message: '完成' })

  return {
    blob,
    url: URL.createObjectURL(blob),
    filename: `stitched_${Date.now()}.${format}`,
    width: minWidth,
    height: totalHeight,
  }
}

async function loadImage(
  src: string
): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${src}`)
  }

  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)

  return {
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
  }
}

export {}
