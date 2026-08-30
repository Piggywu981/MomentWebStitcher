import type { ImageItem, ImageGroup } from '@/types'
import { appState } from '@/core/state'
import { eventBus, Events } from '@/core/events'
import { createButton, showToast, createModal } from '@/components/common/Button'
import { formatDate } from '@/utils/helpers'

export function createGroupManager(): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'w-full'

  // Header with controls
  const header = document.createElement('div')
  header.className = 'flex flex-wrap items-center justify-between gap-4 mb-4'

  const title = document.createElement('h3')
  title.className = 'text-lg font-semibold text-text-primary'
  title.textContent = '分组管理'
  header.appendChild(title)

  const controls = document.createElement('div')
  controls.className = 'flex items-center gap-2'

  // Group size input
  const sizeLabel = document.createElement('label')
  sizeLabel.className = 'text-sm text-text-secondary'
  sizeLabel.textContent = '每组数量:'
  controls.appendChild(sizeLabel)

  const sizeInput = document.createElement('input')
  sizeInput.type = 'number'
  sizeInput.min = '1'
  sizeInput.max = '50'
  sizeInput.value = String(appState.settings.groupSize)
  sizeInput.className = [
    'w-16',
    'px-2',
    'py-1',
    'text-center',
    'rounded-lg',
    'border',
    'border-border',
    'bg-surface',
    'text-text-primary',
    'focus:ring-2',
    'focus:ring-primary-500',
    'focus:border-primary-500',
  ].join(' ')
  sizeInput.addEventListener('change', () => {
    const value = parseInt(sizeInput.value)
    if (value > 0) {
      appState.updateSettings({ groupSize: value })
    }
  })
  controls.appendChild(sizeInput)

  // Auto group button
  controls.appendChild(
    createButton({
      text: '自动分组',
      variant: 'secondary',
      size: 'sm',
      onClick: () => {
        if (appState.images.length === 0) {
          showToast({ message: '请先添加图片', type: 'warning' })
          return
        }
        appState.autoGroup(appState.settings.groupSize)
        showToast({ message: '自动分组完成', type: 'success' })
      },
    })
  )

  // Add group button
  controls.appendChild(
    createButton({
      text: '+ 新建分组',
      variant: 'primary',
      size: 'sm',
      onClick: () => {
        const group = appState.createGroup()
        showToast({ message: `创建分组: ${group.name}`, type: 'success' })
      },
    })
  )

  header.appendChild(controls)
  container.appendChild(header)

  // Groups container
  const groupsContainer = document.createElement('div')
  groupsContainer.className = 'space-y-4 max-h-96 overflow-y-auto'
  container.appendChild(groupsContainer)

  // Empty state
  const emptyState = document.createElement('div')
  emptyState.className = [
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'py-12',
    'text-text-tertiary',
    'bg-surface-secondary',
    'rounded-xl',
  ].join(' ')
  emptyState.innerHTML = `
    <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
    </svg>
    <p class="text-sm mb-2">暂无分组</p>
    <p class="text-xs opacity-70">点击"自动分组"或"新建分组"开始</p>
  `
  container.appendChild(emptyState)

  // Update function
  function updateGroups() {
    const groups = appState.groups

    // Show/hide empty state
    if (groups.length === 0) {
      groupsContainer.classList.add('hidden')
      emptyState.classList.remove('hidden')
    } else {
      groupsContainer.classList.remove('hidden')
      emptyState.classList.add('hidden')
    }

    // Clear container
    groupsContainer.innerHTML = ''

    // Render groups
    groups.forEach((group, index) => {
      const groupEl = createGroupElement(group, index)
      groupsContainer.appendChild(groupEl)
    })
  }

  // Listen for changes
  eventBus.on(Events.GROUP_CREATED, updateGroups)
  eventBus.on(Events.GROUP_DELETED, updateGroups)
  eventBus.on(Events.GROUP_UPDATED, updateGroups)
  eventBus.on(Events.IMAGE_ADDED_TO_GROUP, updateGroups)
  eventBus.on(Events.IMAGE_REMOVED_FROM_GROUP, updateGroups)
  eventBus.on(Events.STATE_RESET, updateGroups)

  // Initial render
  updateGroups()

  return container
}

function createGroupElement(group: ImageGroup, index: number): HTMLDivElement {
  const container = document.createElement('div')
  container.className = ['bg-surface-secondary', 'rounded-xl', 'p-4', 'animate-slide-up'].join(' ')
  container.style.animationDelay = `${index * 0.05}s`

  // Header
  const header = document.createElement('div')
  header.className = 'flex items-center justify-between mb-3'

  const title = document.createElement('div')
  title.className = 'flex items-center gap-2'
  title.innerHTML = `
    <span class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 text-xs font-bold flex items-center justify-center">
      ${index + 1}
    </span>
    <h4 class="font-medium text-text-primary">${group.name}</h4>
    <span class="text-sm text-text-secondary">(${group.images.length} 张)</span>
  `
  header.appendChild(title)

  const actions = document.createElement('div')
  actions.className = 'flex items-center gap-1'

  // Clear button
  actions.appendChild(
    createButton({
      text: '清空',
      variant: 'ghost',
      size: 'sm',
      onClick: () => {
        group.images = []
        eventBus.emit(Events.STATE_CHANGED)
        showToast({ message: '分组已清空', type: 'success' })
      },
    })
  )

  // Delete button
  actions.appendChild(
    createButton({
      text: '删除',
      variant: 'ghost',
      size: 'sm',
      onClick: () => {
        createModal({
          title: '删除分组',
          content: `确定要删除分组 "${group.name}" 吗？\n分组内的图片将返回到图片池。`,
          onConfirm: () => {
            appState.deleteGroup(group.id)
            showToast({ message: '分组已删除', type: 'success' })
          },
        })
      },
    })
  )

  header.appendChild(actions)
  container.appendChild(header)

  // Images container (drop zone)
  const imagesContainer = document.createElement('div')
  imagesContainer.className = [
    'min-h-[100px]',
    'rounded-lg',
    'border-2',
    'border-dashed',
    'border-border',
    'p-3',
    'flex',
    'flex-wrap',
    'gap-2',
    'transition-all',
    'duration-200',
  ].join(' ')

  // Drag events
  imagesContainer.addEventListener('dragover', (e) => {
    e.preventDefault()
    imagesContainer.classList.add('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20')
  })

  imagesContainer.addEventListener('dragleave', () => {
    imagesContainer.classList.remove(
      'border-primary-500',
      'bg-primary-50',
      'dark:bg-primary-900/20'
    )
  })

  imagesContainer.addEventListener('drop', (e) => {
    e.preventDefault()
    imagesContainer.classList.remove(
      'border-primary-500',
      'bg-primary-50',
      'dark:bg-primary-900/20'
    )

    const imageId = e.dataTransfer?.getData('imageId')
    if (imageId) {
      const image = appState.images.find((img) => img.id === imageId)
      if (image) {
        // Remove from other groups first
        appState.groups.forEach((g) => {
          if (g.id !== group.id) {
            const idx = g.images.findIndex((img) => img.id === imageId)
            if (idx > -1) {
              appState.removeImageFromGroup(g.id, imageId)
            }
          }
        })
        // Add to this group
        if (!group.images.find((img) => img.id === imageId)) {
          appState.addImageToGroup(group.id, image)
        }
      }
    }
  })

  // Render images
  if (group.images.length === 0) {
    imagesContainer.innerHTML = `
      <div class="w-full h-full flex items-center justify-center text-text-tertiary text-sm">
        拖拽图片到此处
      </div>
    `
  } else {
    group.images.forEach((image, imgIndex) => {
      const imgEl = createGroupImageElement(image, group, imgIndex)
      imagesContainer.appendChild(imgEl)
    })
  }

  container.appendChild(imagesContainer)

  return container
}

function createGroupImageElement(
  image: ImageItem,
  group: ImageGroup,
  _index: number
): HTMLDivElement {
  const container = document.createElement('div')
  container.className = [
    'relative',
    'group',
    'w-16',
    'h-16',
    'rounded-lg',
    'overflow-hidden',
    'cursor-move',
    'hover:ring-2',
    'hover:ring-primary-500',
    'transition-all',
    'duration-200',
  ].join(' ')
  container.draggable = true
  container.dataset.imageId = image.id

  // Image
  const img = document.createElement('img')
  img.src = image.thumbnail || image.src
  img.alt = image.name
  img.className = 'w-full h-full object-cover'
  container.appendChild(img)

  // Remove button
  const removeBtn = document.createElement('button')
  removeBtn.className = [
    'absolute',
    '-top-1',
    '-right-1',
    'w-5',
    'h-5',
    'rounded-full',
    'bg-red-500',
    'text-white',
    'flex',
    'items-center',
    'justify-center',
    'opacity-0',
    'group-hover:opacity-100',
    'transition-opacity',
    'text-xs',
    'shadow-md',
  ].join(' ')
  removeBtn.innerHTML = '✕'
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    appState.removeImageFromGroup(group.id, image.id)
  })
  container.appendChild(removeBtn)

  // Drag events
  container.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('imageId', image.id)
    e.dataTransfer!.effectAllowed = 'move'
    container.classList.add('opacity-50')
  })

  container.addEventListener('dragend', () => {
    container.classList.remove('opacity-50')
  })

  // Tooltip
  container.title = `${image.name}\n${formatDate(image.dateTime)}`

  return container
}
