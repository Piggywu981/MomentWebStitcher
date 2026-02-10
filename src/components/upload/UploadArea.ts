import type { ImageItem } from '@/types'
import { appState } from '@/core/state'
import { eventBus, Events } from '@/core/events'
import { showToast } from '@/components/common/Button'
import { readFileAsDataURL, generateId, createThumbnail, formatFileSize } from '@/utils/helpers'
import { SUPPORTED_FORMATS, LIMITS } from '@/utils/constants'

export function createUploadArea(): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'w-full'

  const uploadZone = document.createElement('div')
  uploadZone.className = [
    'relative',
    'border-2',
    'border-dashed',
    'border-primary-300',
    'rounded-2xl',
    'p-8',
    'text-center',
    'transition-all',
    'duration-300',
    'cursor-pointer',
    'hover:border-primary-500',
    'hover:bg-primary-50/50',
    'dark:hover:bg-primary-900/20',
    'group',
  ].join(' ')

  uploadZone.innerHTML = `
    <div class="pointer-events-none">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-text-primary mb-2">拖拽图片到此处</h3>
      <p class="text-text-secondary mb-4">或点击选择图片文件</p>
      <p class="text-sm text-text-tertiary">支持 JPG, PNG, WebP, BMP 格式</p>
    </div>
  `

  // Hidden file input
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.multiple = true
  fileInput.accept = SUPPORTED_FORMATS.join(',')
  fileInput.className = 'hidden'

  uploadZone.appendChild(fileInput)

  // Click to upload
  uploadZone.addEventListener('click', () => fileInput.click())

  // File input change
  fileInput.addEventListener('change', async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files && files.length > 0) {
      await handleFiles(Array.from(files))
    }
    fileInput.value = ''
  })

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.classList.add('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20')
  })

  uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.classList.remove('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20')
  })

  uploadZone.addEventListener('drop', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.classList.remove('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20')

    const files = Array.from(e.dataTransfer?.files || []).filter((file) =>
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      await handleFiles(files)
    }
  })

  container.appendChild(uploadZone)

  // Stats
  const stats = document.createElement('div')
  stats.className = 'mt-4 flex items-center justify-center gap-4 text-sm text-text-secondary'
  stats.innerHTML = `
    <span id="upload-count">0 张图片</span>
    <span class="w-1 h-1 rounded-full bg-text-tertiary"></span>
    <span id="upload-size">0 MB</span>
  `
  container.appendChild(stats)

  // Update stats
  eventBus.on(Events.IMAGES_ADDED, () => updateStats())
  eventBus.on(Events.IMAGES_REMOVED, () => updateStats())
  eventBus.on(Events.STATE_RESET, () => updateStats())

  function updateStats() {
    const count = appState.images.length
    const totalSize = appState.images.reduce((sum, img) => sum + (img.file?.size || 0), 0)

    const countEl = stats.querySelector('#upload-count')
    const sizeEl = stats.querySelector('#upload-size')

    if (countEl) countEl.textContent = `${count} 张图片`
    if (sizeEl) sizeEl.textContent = formatFileSize(totalSize)
  }

  return container
}

async function handleFiles(files: File[]): Promise<void> {
  // Check limits
  const currentCount = appState.images.length
  if (currentCount + files.length > LIMITS.maxImages) {
    showToast({
      message: `最多支持 ${LIMITS.maxImages} 张图片`,
      type: 'warning',
    })
    return
  }

  // Filter valid files
  const validFiles = files.filter((file) => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      showToast({ message: `${file.name} 格式不支持`, type: 'warning' })
      return false
    }
    if (file.size > LIMITS.maxFileSize) {
      showToast({
        message: `${file.name} 超过 ${formatFileSize(LIMITS.maxFileSize)} 限制`,
        type: 'warning',
      })
      return false
    }
    return true
  })

  if (validFiles.length === 0) return

  // Process files
  const processedImages: ImageItem[] = []
  const batchSize = 5

  for (let i = 0; i < validFiles.length; i += batchSize) {
    const batch = validFiles.slice(i, i + batchSize)
    const batchPromises = batch.map((file) => processFile(file))
    const batchResults = await Promise.all(batchPromises)
    processedImages.push(...batchResults.filter((img): img is ImageItem => img !== null))

    // Update progress
    const progress = Math.round(((i + batch.length) / validFiles.length) * 100)
    appState.setProgress(progress, `处理图片 ${i + batch.length}/${validFiles.length}`)
  }

  // Add to state
  if (processedImages.length > 0) {
    appState.addImages(processedImages)
    showToast({
      message: `成功添加 ${processedImages.length} 张图片`,
      type: 'success',
    })
  }

  appState.setProgress(0, '')
}

async function processFile(file: File): Promise<ImageItem | null> {
  try {
    const src = await readFileAsDataURL(file)
    const thumbnail = await createThumbnail(src, 200)

    // Get date from EXIF or file
    let dateTime = new Date(file.lastModified)

    return {
      id: generateId(),
      name: file.name,
      src,
      file,
      dateTime,
      thumbnail,
    }
  } catch (error) {
    console.error('Failed to process file:', file.name, error)
    showToast({ message: `处理 ${file.name} 失败`, type: 'error' })
    return null
  }
}
