import type { ImageItem } from '@/types'
import { appState } from '@/core/state'
import { eventBus, Events } from '@/core/events'
import { showToast } from '@/components/common/Button'
import { formatDate, formatFileSize } from '@/utils/helpers'

export function createImagePool(): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'w-full'

  // Header
  const header = document.createElement('div')
  header.className = 'flex items-center justify-between mb-4'
  header.innerHTML = `
    <h3 class="text-lg font-semibold text-text-primary">图片池</h3>
    <span class="text-sm text-text-secondary" id="pool-count">0 张图片</span>
  `
  container.appendChild(header)

  // Image grid
  const grid = document.createElement('div')
  grid.className = [
    'grid',
    'grid-cols-3',
    'sm:grid-cols-4',
    'md:grid-cols-5',
    'lg:grid-cols-6',
    'gap-3',
    'max-h-64',
    'overflow-y-auto',
    'p-2',
    'rounded-xl',
    'bg-surface-secondary',
  ].join(' ')

  // Make grid a drop zone
  grid.addEventListener('dragover', (e) => {
    e.preventDefault()
    grid.classList.add('ring-2', 'ring-primary-500', 'ring-dashed')
  })

  grid.addEventListener('dragleave', () => {
    grid.classList.remove('ring-2', 'ring-primary-500', 'ring-dashed')
  })

  grid.addEventListener('drop', (e) => {
    e.preventDefault()
    grid.classList.remove('ring-2', 'ring-primary-500', 'ring-dashed')

    const imageId = e.dataTransfer?.getData('imageId')
    if (imageId) {
      // Remove from group and add back to pool
      appState.groups.forEach((group) => {
        const index = group.images.findIndex((img) => img.id === imageId)
        if (index > -1) {
          appState.removeImageFromGroup(group.id, imageId)
        }
      })
    }
  })

  container.appendChild(grid)

  // Empty state
  const emptyState = document.createElement('div')
  emptyState.className = [
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'py-8',
    'text-text-tertiary',
  ].join(' ')
  emptyState.innerHTML = `
    <svg class="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    </svg>
    <p class="text-sm">暂无图片</p>
  `
  container.appendChild(emptyState)

  // Update grid when images change
  function updateGrid() {
    const images = getUnassignedImages()

    // Update count
    const countEl = header.querySelector('#pool-count')
    if (countEl) countEl.textContent = `${images.length} 张图片`

    // Show/hide empty state
    if (images.length === 0) {
      grid.classList.add('hidden')
      emptyState.classList.remove('hidden')
    } else {
      grid.classList.remove('hidden')
      emptyState.classList.add('hidden')
    }

    // Clear grid
    grid.innerHTML = ''

    // Add images
    images.forEach((image, index) => {
      const card = createImageCard(image, index)
      grid.appendChild(card)
    })
  }

  // Listen for changes
  eventBus.on(Events.IMAGES_ADDED, updateGrid)
  eventBus.on(Events.IMAGES_REMOVED, updateGrid)
  eventBus.on(Events.GROUP_CREATED, updateGrid)
  eventBus.on(Events.GROUP_DELETED, updateGrid)
  eventBus.on(Events.IMAGE_ADDED_TO_GROUP, updateGrid)
  eventBus.on(Events.IMAGE_REMOVED_FROM_GROUP, updateGrid)
  eventBus.on(Events.STATE_RESET, updateGrid)

  // Initial render
  updateGrid()

  return container
}

function getUnassignedImages(): ImageItem[] {
  const assignedIds = new Set<string>()
  appState.groups.forEach((group) => {
    group.images.forEach((img) => assignedIds.add(img.id))
  })
  return appState.images.filter((img) => !assignedIds.has(img.id))
}

function createImageCard(image: ImageItem, index: number): HTMLDivElement {
  const card = document.createElement('div')
  card.className = [
    'relative',
    'group',
    'aspect-square',
    'rounded-lg',
    'overflow-hidden',
    'bg-surface-tertiary',
    'cursor-move',
    'hover:ring-2',
    'hover:ring-primary-500',
    'transition-all',
    'duration-200',
    'animate-fade-in',
  ].join(' ')
  card.style.animationDelay = `${index * 0.05}s`
  card.draggable = true
  card.dataset.imageId = image.id

  // Image
  const img = document.createElement('img')
  img.src = image.thumbnail || image.src
  img.alt = image.name
  img.className = 'w-full h-full object-cover'
  img.loading = 'lazy'
  card.appendChild(img)

  // Overlay with info
  const overlay = document.createElement('div')
  overlay.className = [
    'absolute',
    'inset-0',
    'bg-gradient-to-t',
    'from-black/70',
    'via-transparent',
    'to-transparent',
    'opacity-0',
    'group-hover:opacity-100',
    'transition-opacity',
    'duration-200',
    'flex',
    'flex-col',
    'justify-end',
    'p-2',
  ].join(' ')

  overlay.innerHTML = `
    <p class="text-white text-xs font-medium truncate">${image.name}</p>
    <p class="text-white/70 text-xs">${formatFileSize(image.file.size)}</p>
  `
  card.appendChild(overlay)

  // Delete button
  const deleteBtn = document.createElement('button')
  deleteBtn.className = [
    'absolute',
    'top-1',
    'right-1',
    'w-6',
    'h-6',
    'rounded-full',
    'bg-red-500',
    'text-white',
    'flex',
    'items-center',
    'justify-center',
    'opacity-0',
    'group-hover:opacity-100',
    'transition-opacity',
    'duration-200',
    'hover:bg-red-600',
    'text-xs',
  ].join(' ')
  deleteBtn.innerHTML = '✕'
  deleteBtn.title = '删除图片'
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    appState.removeImage(image.id)
    showToast({ message: '图片已删除', type: 'success' })
  })
  card.appendChild(deleteBtn)

  // Drag events
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('imageId', image.id)
    e.dataTransfer!.effectAllowed = 'move'
    card.classList.add('opacity-50', 'scale-95')
  })

  card.addEventListener('dragend', () => {
    card.classList.remove('opacity-50', 'scale-95')
  })

  // Tooltip on hover
  card.title = `${image.name}\n${formatDate(image.dateTime)}\n${formatFileSize(image.file.size)}`

  return card
}
