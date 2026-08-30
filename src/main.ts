import { appState } from '@/core/state'
import { eventBus, Events } from '@/core/events'
import { imageProcessor } from '@/core/worker'
import { createUploadArea } from '@/components/upload/UploadArea'
import { createImagePool } from '@/components/image-pool/ImagePool'
import { createGroupManager } from '@/components/group-manager/GroupManager'
import { createSettingsPanel } from '@/components/settings/SettingsPanel'
import { createResultsPanel } from '@/components/results/ResultsPanel'
import { createProgress, showToast } from '@/components/common/Button'
import type { StitchResult } from '@/types'
import '@/styles/variables.css'
import '@/styles/animations.css'

function initApp(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  // Create layout
  app.className = 'min-h-screen bg-surface'

  // Header
  const header = document.createElement('header')
  header.className = [
    'sticky',
    'top-0',
    'z-40',
    'bg-surface/80',
    'backdrop-blur-md',
    'border-b',
    'border-border',
  ].join(' ')
  header.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-text-primary">MomentStitcher</h1>
            <p class="text-xs text-text-secondary">朋友圈长图拼接工具</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="./legacy/index.html" class="px-3 py-1.5 rounded-lg text-sm bg-surface-secondary hover:bg-surface-tertiary text-text-secondary transition-colors" title="切换旧版">旧版</a>
          <a href="https://github.com/Piggywu981/MomentWebStitcher" target="_blank" rel="noopener" 
             class="p-2 rounded-lg hover:bg-surface-secondary transition-colors" title="GitHub">
            <svg class="w-6 h-6 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  `
  app.appendChild(header)

  // Main content
  const main = document.createElement('main')
  main.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'

  // Grid layout
  const grid = document.createElement('div')
  grid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-8'

  // Left column - Upload & Image Pool
  const leftColumn = document.createElement('div')
  leftColumn.className = 'lg:col-span-2 space-y-6'

  // Upload section
  const uploadSection = document.createElement('section')
  uploadSection.className = 'bg-surface rounded-2xl p-6 shadow-sm border border-border'
  uploadSection.appendChild(createUploadArea())
  leftColumn.appendChild(uploadSection)

  // Image pool section
  const poolSection = document.createElement('section')
  poolSection.className = 'bg-surface rounded-2xl p-6 shadow-sm border border-border'
  poolSection.appendChild(createImagePool())
  leftColumn.appendChild(poolSection)

  // Group manager section
  const groupSection = document.createElement('section')
  groupSection.className = 'bg-surface rounded-2xl p-6 shadow-sm border border-border'
  groupSection.appendChild(createGroupManager())
  leftColumn.appendChild(groupSection)

  // Results panel (in left column so the sticky settings sidebar never overlaps it)
  const resultsSection = document.createElement('section')
  resultsSection.className = 'bg-surface rounded-2xl p-6 shadow-sm border border-border'
  resultsSection.appendChild(createResultsPanel())
  leftColumn.appendChild(resultsSection)

  grid.appendChild(leftColumn)

  // Right column - Settings
  const rightColumn = document.createElement('div')
  rightColumn.className = 'lg:col-span-1'

  const settingsWrapper = document.createElement('div')
  settingsWrapper.className = 'sticky top-24'
  settingsWrapper.appendChild(createSettingsPanel())
  rightColumn.appendChild(settingsWrapper)

  grid.appendChild(rightColumn)
  main.appendChild(grid)
  app.appendChild(main)

  // Progress overlay
  const progressOverlay = document.createElement('div')
  progressOverlay.id = 'progress-overlay'
  progressOverlay.className = [
    'fixed',
    'inset-0',
    'z-50',
    'flex',
    'items-center',
    'justify-center',
    'bg-black/50',
    'backdrop-blur-sm',
    'hidden',
  ].join(' ')

  const progressCard = document.createElement('div')
  progressCard.className = 'bg-surface rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4'
  progressCard.innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <div class="animate-spin w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full"></div>
      <h3 class="text-lg font-semibold text-text-primary" id="progress-task">处理中...</h3>
    </div>
    <div id="progress-container"></div>
  `
  progressOverlay.appendChild(progressCard)
  app.appendChild(progressOverlay)

  // Setup event listeners
  setupEventListeners()
  setupKeyboardShortcuts()
}

function setupEventListeners(): void {
  // Processing events
  eventBus.on(Events.PROCESSING_STARTED, () => {
    const overlay = document.getElementById('progress-overlay')
    if (overlay) overlay.classList.remove('hidden')
  })

  eventBus.on(Events.PROCESSING_COMPLETED, () => {
    const overlay = document.getElementById('progress-overlay')
    if (overlay) overlay.classList.add('hidden')
  })

  eventBus.on(Events.PROCESSING_PROGRESS, (data: unknown) => {
    const { progress, task } = data as { progress: number; task: string }
    const taskEl = document.getElementById('progress-task')
    const container = document.getElementById('progress-container')

    if (taskEl) taskEl.textContent = task || '处理中...'
    if (container) {
      container.innerHTML = ''
      container.appendChild(createProgress({ value: progress }))
    }
  })

  // Stitch action
  eventBus.on(Events.ACTION_STITCH, async () => {
    if (appState.groups.length === 0) {
      showToast({ message: '请先创建分组', type: 'warning' })
      return
    }

    appState.setProcessing(true)

    const results: Array<StitchResult & { groupName: string }> = []

    try {
      for (let i = 0; i < appState.groups.length; i++) {
        const group = appState.groups[i]
        if (group.images.length < 2) {
          showToast({ message: `分组 "${group.name}" 图片数量不足`, type: 'warning' })
          continue
        }

        appState.setProgress(0, `处理分组 ${i + 1}/${appState.groups.length}: ${group.name}`)

        const imageSources = group.images.map((img) => img.src)
        const result = await imageProcessor.stitchImages(
          imageSources,
          appState.settings.outputQuality,
          appState.settings.outputFormat,
          (progress) => {
            const overallProgress =
              ((i + progress.current / progress.total) / appState.groups.length) * 100
            appState.setProgress(overallProgress, progress.message)
          }
        )

        results.push({
          ...result,
          groupName: group.name,
          filename: `${group.name}_${Date.now()}.${appState.settings.outputFormat}`,
        })
      }

      eventBus.emit(Events.STITCH_COMPLETE, results)
      showToast({ message: `处理完成，共 ${results.length} 个结果`, type: 'success' })
    } catch (error) {
      console.error('Stitching error:', error)
      showToast({
        message: '处理失败: ' + (error instanceof Error ? error.message : '未知错误'),
        type: 'error',
      })
    } finally {
      appState.setProcessing(false)
      appState.setProgress(0, '')
    }
  })
}

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Z - Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      if (appState.undo()) {
        showToast({ message: '已撤销', type: 'success' })
      }
    }

    // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z - Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      if (appState.redo()) {
        showToast({ message: '已重做', type: 'success' })
      }
    }

    // Ctrl/Cmd + Enter - Stitch
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      eventBus.emit(Events.ACTION_STITCH)
    }

    // Ctrl/Cmd + O - Add images
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault()
      document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
    }
  })
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp)
