import type { ToastType } from '@/types'

interface ButtonProps {
  text?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: string
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

  // Content
  if (loading) {
    const spinner = document.createElement('span')
    spinner.className =
      'animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full'
    button.appendChild(spinner)
  } else if (icon) {
    const iconSpan = document.createElement('span')
    iconSpan.textContent = icon
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
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
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
    <span class="text-lg">${typeIcons[type]}</span>
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
    text: '✕',
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
