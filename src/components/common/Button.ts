import type { ToastType } from '@/types'

// Inline SVG icon set (stroke=currentColor, 24 viewBox) — replaces emoji/glyphs
export const ICONS = {
  play: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z"></path></svg>`,
  trash: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"></path></svg>`,
  undo: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10.5A5.5 5.5 0 0120 14.5 5.5 5.5 0 0114.5 20H11"></path></svg>`,
  redo: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 14l5-5-5-5M20 9H9.5A5.5 5.5 0 004 14.5 5.5 5.5 0 009.5 20H13"></path></svg>`,
  download: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"></path></svg>`,
  x: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>`,
  plus: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>`,
  image: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
  sliders: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"></path></svg>`,
  check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"></path></svg>`,
  info: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 16v-4M12 8h.01"></path></svg>`,
  warning: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.86L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.86a2 2 0 00-3.4 0z"></path></svg>`,
  error: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>`,
} as const

interface ButtonProps {
  text?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: keyof typeof ICONS | string
  ariaLabel?: string
  className?: string
  onClick?: (e: MouseEvent) => void
}

export function createButton(props: ButtonProps): HTMLButtonElement {
  const {
    text,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    ariaLabel,
    className = '',
    onClick,
  } = props

  const button = document.createElement('button')

  // Base classes
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-2',
    'font-medium',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'active:scale-95',
  ]

  // Variant classes
  const variantClasses = {
    primary: [
      'bg-primary-600',
      'text-white',
      'hover:bg-primary-700',
      'focus:ring-primary-500',
      'shadow-md',
      'hover:shadow-lg',
    ],
    secondary: [
      'bg-surface-secondary',
      'text-text-primary',
      'border',
      'border-border',
      'hover:bg-surface-tertiary',
      'focus:ring-primary-500',
    ],
    danger: [
      'bg-red-600',
      'text-white',
      'hover:bg-red-700',
      'focus:ring-red-500',
      'shadow-md',
      'hover:shadow-lg',
    ],
    ghost: [
      'bg-transparent',
      'text-text-secondary',
      'hover:bg-surface-secondary',
      'hover:text-text-primary',
      'focus:ring-primary-500',
    ],
  }

  // Size classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm'],
    md: ['px-4', 'py-2', 'text-base'],
    lg: ['px-6', 'py-3', 'text-lg'],
  }

  button.className = [
    ...baseClasses,
    ...variantClasses[variant],
    ...sizeClasses[size],
    className,
  ].join(' ')

  button.disabled = disabled || loading
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel)

  // Content
  if (loading) {
    const spinner = document.createElement('span')
    spinner.className =
      'animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full'
    button.appendChild(spinner)
  } else if (icon) {
    const iconSpan = document.createElement('span')
    iconSpan.className = 'inline-flex shrink-0'
    iconSpan.innerHTML = ICONS[icon as keyof typeof ICONS] || icon
    button.appendChild(iconSpan)
  }

  if (text) {
    const textSpan = document.createElement('span')
    textSpan.textContent = text
    button.appendChild(textSpan)
  }

  if (onClick) {
    button.addEventListener('click', onClick)
  }

  return button
}

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
}

export function showToast(props: ToastProps): void {
  const { message, type = 'info', duration = 4000 } = props

  const toast = document.createElement('div')

  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }

  const typeIcons = {
    success: 'check',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }

  toast.className = [
    'fixed',
    'bottom-4',
    'right-4',
    'z-50',
    'flex',
    'items-center',
    'gap-3',
    'px-4',
    'py-3',
    'rounded-lg',
    'shadow-lg',
    'text-white',
    'animate-slide-in-right',
    typeClasses[type],
  ].join(' ')

  toast.innerHTML = `
    <span class="inline-flex shrink-0">${ICONS[typeIcons[type] as keyof typeof ICONS]}</span>
    <span class="font-medium">${message}</span>
  `

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('animate-fade-out')
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

interface ModalProps {
  title: string
  content: HTMLElement | string
  onClose?: () => void
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

export function createModal(props: ModalProps): HTMLDivElement {
  const {
    title,
    content,
    onClose,
    onConfirm,
    confirmText = '确认',
    cancelText = '取消',
    showCancel = true,
  } = props

  const overlay = document.createElement('div')
  overlay.className = [
    'fixed',
    'inset-0',
    'z-50',
    'flex',
    'items-center',
    'justify-center',
    'bg-black/50',
    'backdrop-blur-sm',
    'animate-fade-in',
  ].join(' ')

  const modal = document.createElement('div')
  modal.className = [
    'bg-surface',
    'rounded-xl',
    'shadow-2xl',
    'max-w-lg',
    'w-full',
    'mx-4',
    'animate-scale-in',
  ].join(' ')

  const header = document.createElement('div')
  header.className = 'flex items-center justify-between px-6 py-4 border-b border-border'
  header.innerHTML = `<h3 class="text-lg font-semibold text-text-primary">${title}</h3>`

  const closeBtn = createButton({
    variant: 'ghost',
    size: 'sm',
    icon: 'x',
    ariaLabel: '关闭',
    onClick: () => {
      close()
      onClose?.()
    },
  })
  header.appendChild(closeBtn)

  const body = document.createElement('div')
  body.className = 'px-6 py-4'
  if (typeof content === 'string') {
    body.innerHTML = content
  } else {
    body.appendChild(content)
  }

  const footer = document.createElement('div')
  footer.className = 'flex justify-end gap-3 px-6 py-4 border-t border-border'

  if (showCancel) {
    footer.appendChild(
      createButton({
        text: cancelText,
        variant: 'secondary',
        onClick: () => {
          close()
          onClose?.()
        },
      })
    )
  }

  if (onConfirm) {
    footer.appendChild(
      createButton({
        text: confirmText,
        variant: 'primary',
        onClick: () => {
          onConfirm()
          close()
        },
      })
    )
  }

  modal.appendChild(header)
  modal.appendChild(body)
  modal.appendChild(footer)
  overlay.appendChild(modal)

  document.body.appendChild(overlay)

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close()
      onClose?.()
    }
  })

  function close() {
    overlay.classList.add('animate-fade-out')
    modal.classList.add('animate-scale-out')
    setTimeout(() => overlay.remove(), 200)
  }

  return overlay
}

interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  animated?: boolean
}

export function createProgress(props: ProgressProps): HTMLDivElement {
  const { value, max = 100, size = 'md', showValue = true, animated = true } = props

  const percentage = Math.round((value / max) * 100)

  const container = document.createElement('div')
  container.className = 'w-full'

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const bar = document.createElement('div')
  bar.className = [
    'w-full',
    'bg-surface-tertiary',
    'rounded-full',
    'overflow-hidden',
    sizeClasses[size],
  ].join(' ')

  const fill = document.createElement('div')
  fill.className = [
    'h-full',
    'bg-gradient-to-r',
    'from-primary-500',
    'to-primary-600',
    'rounded-full',
    'transition-all',
    'duration-300',
    animated ? 'animate-pulse-soft' : '',
  ].join(' ')
  fill.style.width = `${percentage}%`

  bar.appendChild(fill)
  container.appendChild(bar)

  if (showValue) {
    const label = document.createElement('div')
    label.className = 'flex justify-between mt-2 text-sm text-text-secondary'
    label.innerHTML = `
      <span>进度</span>
      <span class="font-medium text-text-primary">${percentage}%</span>
    `
    container.appendChild(label)
  }

  return container
}
