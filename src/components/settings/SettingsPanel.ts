import { appState } from '@/core/state'
import { eventBus, Events } from '@/core/events'
import { createButton, showToast } from '@/components/common/Button'
import { OUTPUT_FORMATS, KEYBOARD_SHORTCUTS } from '@/utils/constants'
import { getSystemTheme } from '@/utils/helpers'

export function createSettingsPanel(): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'w-full space-y-6'

  // Output Settings
  const outputSection = createSection('输出设置')

  // Quality slider
  const qualityControl = createSliderControl({
    label: '输出质量',
    min: 70,
    max: 100,
    value: appState.settings.outputQuality,
    suffix: '%',
    onChange: (value) => appState.updateSettings({ outputQuality: value }),
  })
  outputSection.appendChild(qualityControl)

  // Format selector
  const formatControl = createSelectControl({
    label: '输出格式',
    options: OUTPUT_FORMATS.map((f) => ({ value: f.value, label: f.label })),
    value: appState.settings.outputFormat,
    onChange: (value) =>
      appState.updateSettings({ outputFormat: value as 'jpeg' | 'png' | 'webp' }),
  })
  outputSection.appendChild(formatControl)

  container.appendChild(outputSection)

  // Appearance Settings
  const appearanceSection = createSection('外观设置')

  // Theme selector
  const themeControl = createSelectControl({
    label: '主题',
    options: [
      { value: 'light', label: '☀️ 浅色' },
      { value: 'dark', label: '🌙 深色' },
      { value: 'system', label: '💻 跟随系统' },
    ],
    value: appState.settings.theme,
    onChange: (value) => {
      appState.updateSettings({ theme: value as 'light' | 'dark' | 'system' })
      applyTheme(value as 'light' | 'dark' | 'system')
    },
  })
  appearanceSection.appendChild(themeControl)

  container.appendChild(appearanceSection)

  // Actions
  const actionsSection = createSection('操作')

  const actionsGrid = document.createElement('div')
  actionsGrid.className = 'grid grid-cols-2 gap-3'

  // Stitch button
  const stitchBtn = createButton({
    text: '🚀 开始拼接',
    variant: 'primary',
    size: 'lg',
    className: 'col-span-2',
    onClick: () => {
      if (appState.groups.length === 0) {
        showToast({ message: '请先创建分组', type: 'warning' })
        return
      }
      eventBus.emit(Events.ACTION_STITCH)
    },
  })
  actionsGrid.appendChild(stitchBtn)

  // Clear button
  actionsGrid.appendChild(
    createButton({
      text: '🗑️ 清空所有',
      variant: 'secondary',
      onClick: () => {
        if (confirm('确定要清空所有图片和分组吗？')) {
          appState.clearAll()
          showToast({ message: '已清空所有内容', type: 'success' })
        }
      },
    })
  )

  // Undo/Redo buttons
  const undoBtn = createButton({
    text: '↩️ 撤销',
    variant: 'ghost',
    onClick: () => {
      if (appState.undo()) {
        showToast({ message: '已撤销', type: 'success' })
      }
    },
  })
  actionsGrid.appendChild(undoBtn)

  const redoBtn = createButton({
    text: '↪️ 重做',
    variant: 'ghost',
    onClick: () => {
      if (appState.redo()) {
        showToast({ message: '已重做', type: 'success' })
      }
    },
  })
  actionsGrid.appendChild(redoBtn)

  actionsSection.appendChild(actionsGrid)
  container.appendChild(actionsSection)

  // Keyboard shortcuts
  const shortcutsSection = createSection('快捷键')
  shortcutsSection.innerHTML += `
    <div class="space-y-2 text-sm text-text-secondary">
      <div class="flex justify-between">
        <span>撤销</span>
        <kbd class="px-2 py-1 bg-surface-tertiary rounded text-xs font-mono">${KEYBOARD_SHORTCUTS.undo}</kbd>
      </div>
      <div class="flex justify-between">
        <span>重做</span>
        <kbd class="px-2 py-1 bg-surface-tertiary rounded text-xs font-mono">${KEYBOARD_SHORTCUTS.redo}</kbd>
      </div>
      <div class="flex justify-between">
        <span>添加图片</span>
        <kbd class="px-2 py-1 bg-surface-tertiary rounded text-xs font-mono">${KEYBOARD_SHORTCUTS.addImages}</kbd>
      </div>
      <div class="flex justify-between">
        <span>开始拼接</span>
        <kbd class="px-2 py-1 bg-surface-tertiary rounded text-xs font-mono">${KEYBOARD_SHORTCUTS.stitch}</kbd>
      </div>
      <div class="flex justify-between">
        <span>清空所有</span>
        <kbd class="px-2 py-1 bg-surface-tertiary rounded text-xs font-mono">${KEYBOARD_SHORTCUTS.clear}</kbd>
      </div>
    </div>
  `
  container.appendChild(shortcutsSection)

  // Apply initial theme
  applyTheme(appState.settings.theme)

  return container
}

function createSection(title: string): HTMLDivElement {
  const section = document.createElement('div')
  section.className = 'bg-surface-secondary rounded-xl p-4'
  section.innerHTML = `<h4 class="font-semibold text-text-primary mb-4">${title}</h4>`
  return section
}

interface SliderControlProps {
  label: string
  min: number
  max: number
  value: number
  suffix?: string
  onChange: (value: number) => void
}

function createSliderControl(props: SliderControlProps): HTMLDivElement {
  const { label, min, max, value, suffix = '', onChange } = props

  const container = document.createElement('div')
  container.className = 'mb-4'

  const header = document.createElement('div')
  header.className = 'flex justify-between mb-2'
  header.innerHTML = `
    <label class="text-sm text-text-secondary">${label}</label>
    <span class="text-sm font-medium text-text-primary" id="${label}-value">${value}${suffix}</span>
  `
  container.appendChild(header)

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = String(min)
  slider.max = String(max)
  slider.value = String(value)
  slider.className = [
    'w-full',
    'h-2',
    'bg-surface-tertiary',
    'rounded-lg',
    'appearance-none',
    'cursor-pointer',
    'accent-primary-600',
  ].join(' ')

  slider.addEventListener('input', () => {
    const val = parseInt(slider.value)
    const valueEl = container.querySelector(`#${label}-value`)
    if (valueEl) valueEl.textContent = `${val}${suffix}`
    onChange(val)
  })

  container.appendChild(slider)
  return container
}

interface SelectControlProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

function createSelectControl(props: SelectControlProps): HTMLDivElement {
  const { label, options, value, onChange } = props

  const container = document.createElement('div')
  container.className = 'mb-4'

  const labelEl = document.createElement('label')
  labelEl.className = 'block text-sm text-text-secondary mb-2'
  labelEl.textContent = label
  container.appendChild(labelEl)

  const select = document.createElement('select')
  select.className = [
    'w-full',
    'px-3',
    'py-2',
    'rounded-lg',
    'border',
    'border-border',
    'bg-surface',
    'text-text-primary',
    'focus:ring-2',
    'focus:ring-primary-500',
    'focus:border-primary-500',
  ].join(' ')

  options.forEach((opt) => {
    const option = document.createElement('option')
    option.value = opt.value
    option.textContent = opt.label
    if (opt.value === value) option.selected = true
    select.appendChild(option)
  })

  select.addEventListener('change', () => onChange(select.value))
  container.appendChild(select)

  return container
}

function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme

  if (effectiveTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  eventBus.emit(Events.THEME_CHANGED, effectiveTheme)
}
