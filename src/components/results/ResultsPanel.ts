import type { StitchResult } from '@/types'
import { eventBus, Events } from '@/core/events'
import { createButton, showToast } from '@/components/common/Button'
import { downloadBlob } from '@/utils/helpers'

interface StitchResultItem extends StitchResult {
  groupName: string
}

export function createResultsPanel(): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'w-full'

  let results: StitchResultItem[] = []

  // Header
  const header = document.createElement('div')
  header.className = 'flex flex-wrap items-center justify-between gap-2 mb-4'

  const title = document.createElement('h3')
  title.className = 'text-lg font-semibold text-text-primary'
  title.textContent = '拼接结果'
  header.appendChild(title)

  const count = document.createElement('span')
  count.className = 'text-sm text-text-secondary'
  count.textContent = '0 个结果'
  header.appendChild(count)

  const actions = document.createElement('div')
  actions.className = 'flex items-center gap-2'

  const downloadAllBtn = createButton({
    text: '下载全部',
    icon: 'download',
    variant: 'primary',
    size: 'sm',
    disabled: true,
    onClick: () => downloadAll(),
  })
  actions.appendChild(downloadAllBtn)

  actions.appendChild(
    createButton({
      text: '清空',
      variant: 'ghost',
      size: 'sm',
      onClick: () => clearResults(),
    })
  )

  header.appendChild(actions)
  container.appendChild(header)

  // Results list
  const list = document.createElement('div')
  list.className = 'space-y-3 max-h-96 overflow-y-auto'
  container.appendChild(list)

  // Empty state
  const emptyState = document.createElement('div')
  emptyState.className = [
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'py-8',
    'text-text-tertiary',
    'bg-surface-secondary',
    'rounded-xl',
  ].join(' ')
  emptyState.innerHTML = `
    <svg class="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    </svg>
    <p class="text-sm">暂无拼接结果</p>
  `
  container.appendChild(emptyState)

  // Listen for completed stitching (append, keep prior batches)
  eventBus.on(Events.STITCH_COMPLETE, (data: unknown) => {
    results = [...results, ...(data as StitchResultItem[])]
    render()
  })

  function render(): void {
    count.textContent = `${results.length} 个结果`
    downloadAllBtn.disabled = results.length === 0

    if (results.length === 0) {
      list.classList.add('hidden')
      emptyState.classList.remove('hidden')
      return
    }

    list.classList.remove('hidden')
    emptyState.classList.add('hidden')
    list.innerHTML = ''

    results.forEach((item, index) => {
      const card = document.createElement('div')
      card.className = [
        'flex',
        'items-center',
        'gap-3',
        'p-3',
        'bg-surface-secondary',
        'rounded-xl',
        'animate-slide-up',
      ].join(' ')
      card.style.animationDelay = `${index * 0.05}s`

      const preview = document.createElement('img')
      preview.src = item.url
      preview.alt = item.groupName
      preview.className = 'w-16 h-16 rounded-lg object-cover shrink-0 bg-surface-tertiary'
      card.appendChild(preview)

      const info = document.createElement('div')
      info.className = 'flex-1 min-w-0'
      info.innerHTML = `
        <p class="text-sm font-medium text-text-primary truncate">${item.groupName}</p>
        <p class="text-xs text-text-secondary">${item.width} × ${item.height}px</p>
      `
      card.appendChild(info)

      card.appendChild(
        createButton({
          text: '下载',
          icon: 'download',
          variant: 'secondary',
          size: 'sm',
          onClick: () => {
            downloadBlob(item.blob, item.filename)
          },
        })
      )

      list.appendChild(card)
    })
  }

  function downloadAll(): void {
    if (results.length === 0) return
    showToast({
      message: `开始下载 ${results.length} 个文件，若被浏览器拦截请允许「多个文件下载」`,
      type: 'info',
    })
    for (let i = 0; i < results.length; i++) {
      const item = results[i]
      setTimeout(() => downloadBlob(item.blob, item.filename), i * 400)
    }
  }

  function clearResults(): void {
    results = []
    render()
  }

  return container
}
