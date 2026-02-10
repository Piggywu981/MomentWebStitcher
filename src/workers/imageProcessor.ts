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

async function stitchImages(
  imageSources: string[],
  quality: number,
  format: string,
  onProgress: (progress: ProcessingProgress) => void
): Promise<StitchResult> {
  const imageElements: HTMLImageElement[] = []
  let minWidth = Infinity
  let totalHeight = 0

  // Load all images
  onProgress({ current: 0, total: imageSources.length, message: '加载图片中...' })

  for (let i = 0; i < imageSources.length; i++) {
    const img = await loadImage(imageSources[i])
    imageElements.push(img)
    minWidth = Math.min(minWidth, img.width)
    onProgress({
      current: i + 1,
      total: imageSources.length,
      message: `加载图片 ${i + 1}/${imageSources.length}`,
    })
  }

  // Calculate scaled dimensions
  const scaledImages = imageElements.map((img) => {
    const scale = minWidth / img.width
    const newHeight = Math.round(img.height * scale)
    totalHeight += newHeight
    return { img, newHeight }
  })

  // Create canvas
  const canvas = new OffscreenCanvas(minWidth, totalHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Fill white background
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw images
  onProgress({ current: 0, total: scaledImages.length, message: '拼接图片中...' })

  let yOffset = 0
  for (let i = 0; i < scaledImages.length; i++) {
    const { img, newHeight } = scaledImages[i]
    ctx.drawImage(img, 0, yOffset, minWidth, newHeight)
    yOffset += newHeight

    onProgress({
      current: i + 1,
      total: scaledImages.length,
      message: `拼接图片 ${i + 1}/${scaledImages.length}`,
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

export {}
