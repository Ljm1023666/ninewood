import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  ArrowUp,
  Paperclip,
  Square,
  X,
  StopCircle,
  Mic,
  Zap,
  BrainCog,
  FolderCode,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useDemandWorkspaceStore } from '@/stores/demand-workspace'

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ')

// Embedded CSS for minimal custom styles
const styles = `
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-track {
    background: transparent;
  }
  textarea::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 3px;
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: #555555;
  }
`

// Inject styles into document
const styleSheet = document.createElement('style')
styleSheet.innerText = styles
document.head.appendChild(styleSheet)

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex w-full rounded-md border-0 outline-none bg-transparent px-3 py-2.5 text-base text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none',
        className,
      )}
      ref={ref}
      rows={1}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

// Tooltip Components
const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Dialog Components
const Dialog = DialogPrimitive.Root
const DialogPortal = DialogPrimitive.Portal
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-bg-card p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-bg-tertiary/80 p-2 hover:bg-bg-tertiary transition-all">
        <X className="h-5 w-5 text-text-secondary hover:text-text-primary" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-gray-100',
      className,
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white hover:bg-white/80 text-black',
      outline: 'border border-border bg-transparent hover:bg-bg-tertiary',
      ghost: 'bg-transparent hover:bg-bg-tertiary',
    }
    const sizeClasses = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 px-3 text-sm',
      lg: 'h-12 px-6',
      icon: 'h-8 w-8 rounded-full aspect-[1/1]',
    }
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

// VoiceRecorder Component
interface VoiceRecorderProps {
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: (duration: number) => void
  visualizerBars?: number
}
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 32,
}) => {
  const [time, setTime] = React.useState(0)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (isRecording) {
      onStartRecording()
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      onStopRecording(time)
      setTime(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center w-full transition-all duration-300 py-3',
        isRecording ? 'opacity-100' : 'opacity-0 h-0',
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-text-primary">
          {formatTime(time)}
        </span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {[...Array(visualizerBars)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-white/50 animate-pulse"
            style={{
              height: `${Math.max(15, Math.random() * 100)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ImageViewDialog Component
interface ImageViewDialogProps {
  imageUrl: string | null
  onClose: () => void
}
const ImageViewDialog: React.FC<ImageViewDialogProps> = ({
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-bg-card rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src={imageUrl}
            alt="Full preview"
            className="w-full max-h-[80vh] object-contain rounded-2xl"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

// PromptInput Context and Components
interface PromptInputContextType {
  isLoading: boolean
  value: string
  setValue: (value: string) => void
  maxHeight: number | string
  onSubmit?: () => void
  disabled?: boolean
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: '',
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
})
function usePromptInput() {
  const context = React.useContext(PromptInputContext)
  if (!context)
    throw new Error('usePromptInput must be used within a PromptInput')
  return context
}

interface PromptInputProps {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  maxHeight?: number | string
  onSubmit?: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}
const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || '')
    const handleChange = (newValue: string) => {
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }
    return (
      <TooltipProvider>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: value ?? internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled,
          }}
        >
          <div
            ref={ref}
            className={cn(
              'rounded-2xl border border-border bg-bg-card p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300',
              isLoading && 'border-red-500/70',
              className,
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    )
  },
)
PromptInput.displayName = 'PromptInput'

interface PromptInputTextareaProps {
  disableAutosize?: boolean
  placeholder?: string
}
const PromptInputTextarea: React.FC<
  PromptInputTextareaProps & React.ComponentProps<typeof Textarea>
> = ({
  className,
  onKeyDown,
  disableAutosize = false,
  placeholder,
  ...props
}) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height =
      typeof maxHeight === 'number'
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`
  }, [value, maxHeight, disableAutosize])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
    onKeyDown?.(e)
  }

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn('text-base', className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  )
}

interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {}
const PromptInputActions: React.FC<PromptInputActionsProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('flex items-center gap-2', className)} {...props}>
    {children}
  </div>
)

interface PromptInputActionProps extends React.ComponentProps<typeof Tooltip> {
  tooltip: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}
const PromptInputAction: React.FC<PromptInputActionProps> = ({
  tooltip,
  children,
  className,
  side = 'top',
  ...props
}) => {
  const { disabled } = usePromptInput()
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

// Custom Divider Component
const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div
      className="absolute inset-0 bg-gradient-to-t from-transparent via-[#9b87f5]/70 to-transparent rounded-full"
      style={{
        clipPath:
          'polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)',
      }}
    />
  </div>
)

// Main PromptInputBox Component
interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
  /** 外部控制输入值（受控模式） */
  value?: string
  /** 外部值变更回调 */
  onInputChange?: (value: string) => void
  /** 中断 AI 请求 */
  onAbort?: () => void
}
export const PromptInputBox = React.forwardRef(
  (props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
    const {
      onSend = () => {},
      isLoading = false,
      placeholder = '输入你的需求...',
      className,
      onThinkChange,
      enableSpeed,
      speedMode: externalSpeedMode,
      onSpeedChange,
      onCanvasChange,
      onPublish,
      value: externalValue,
      onInputChange,
      onAbort,
    } = props as PromptInputBoxProps & {
      onThinkChange?: (think: boolean) => void
      enableSpeed?: boolean
      speedMode?: boolean
      onSpeedChange?: (on: boolean) => void
      onCanvasChange?: (on: boolean) => void
      onPublish?: () => Promise<void>
    }
    const speedMode = externalSpeedMode ?? true
    const [input, setInput] = React.useState(externalValue ?? '')

    // 受控模式：外部值变化时同步
    React.useEffect(() => {
      if (externalValue !== undefined) setInput(externalValue)
    }, [externalValue])

    const handleValueChange = (v: string) => {
      setInput(v)
      onInputChange?.(v)
    }
    const [files, setFiles] = React.useState<File[]>([])
    const [filePreviews, setFilePreviews] = React.useState<{
      [key: string]: string
    }>({})
    const [selectedImage, setSelectedImage] = React.useState<string | null>(
      null,
    )
    const [isRecording, setIsRecording] = React.useState(false)
    const [showThink, setShowThink] = React.useState(false)
    const [showCanvas, setShowCanvas] = React.useState(false)
    const uploadInputRef = React.useRef<HTMLInputElement>(null)
    const promptBoxRef = React.useRef<HTMLDivElement>(null)

    const handleToggleChange = (value: string) => {
      if (value === 'aggressive') {
        onSpeedChange?.(!speedMode)
        setShowThink(false)
      } else if (value === 'think') {
        setShowThink((prev) => {
          const next = !prev
          onThinkChange?.(next)
          return next
        })
        onSpeedChange?.(false)
        setShowCanvas(false)
      } else if (value === 'canvas') {
        setShowCanvas((prev) => {
          const next = !prev
          onCanvasChange?.(next)
          return next
        })
        setShowThink(false)
      }
    }

    const handleCanvasToggle = () => {
      setShowThink(false)
      onThinkChange?.(false)
      setShowCanvas((prev) => {
        const next = !prev
        onCanvasChange?.(next)
        return next
      })
    }

    const isImageFile = (file: File) => file.type.startsWith('image/')

    const processFile = (file: File) => {
      if (!isImageFile(file)) {
        console.log('Only image files are allowed')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        console.log('File too large (max 10MB)')
        return
      }
      setFiles([file])
      const reader = new FileReader()
      reader.onload = (e) =>
        setFilePreviews({ [file.name]: e.target?.result as string })
      reader.readAsDataURL(file)
    }

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }, [])

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }, [])

    const handleDrop = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter((file) => isImageFile(file))
      if (imageFiles.length > 0) processFile(imageFiles[0])
    }, [])

    const handleRemoveFile = (index: number) => {
      const fileToRemove = files[index]
      if (fileToRemove && filePreviews[fileToRemove.name]) setFilePreviews({})
      setFiles([])
    }

    const openImageModal = (imageUrl: string) => setSelectedImage(imageUrl)

    const handlePaste = React.useCallback((e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            e.preventDefault()
            processFile(file)
            break
          }
        }
      }
    }, [])

    React.useEffect(() => {
      document.addEventListener('paste', handlePaste)
      return () => document.removeEventListener('paste', handlePaste)
    }, [handlePaste])

    const handleSubmit = () => {
      if (input.trim() || files.length > 0) {
        let messagePrefix = ''
        if (showThink) messagePrefix = '[Think: '
        else if (showCanvas) messagePrefix = '[Canvas: '
        const formattedInput = messagePrefix
          ? `${messagePrefix}${input}]`
          : input
        onSend(formattedInput, files)
        setInput('')
        setFiles([])
        setFilePreviews({})
        // 发送后自动重新聚焦输入框
        setTimeout(() => {
          const textarea = promptBoxRef.current?.querySelector('textarea')
          textarea?.focus()
        }, 0)
      }
    }

    const handleStartRecording = () => console.log('Started recording')

    const handleStopRecording = (duration: number) => {
      console.log(`Stopped recording after ${duration} seconds`)
      setIsRecording(false)
      onSend(`[语音消息 - ${duration}秒]`, [])
    }

    const hasContent = input.trim() !== '' || files.length > 0

    return (
      <>
        <PromptInput
          value={input}
          onValueChange={handleValueChange}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          className={cn(
            'w-full bg-bg-card border-border shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300 ease-in-out',
            isRecording && 'border-red-500/70',
            className,
          )}
          disabled={isRecording}
          ref={ref || promptBoxRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {files.length > 0 && !isRecording && (
            <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
              {files.map((file, index) => (
                <div key={index} className="relative group">
                  {file.type.startsWith('image/') &&
                    filePreviews[file.name] && (
                      <div
                        className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                        onClick={() => openImageModal(filePreviews[file.name])}
                      >
                        <img
                          src={filePreviews[file.name]}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFile(index)
                          }}
                          className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-text-primary" />
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          <div
            className={cn(
              'transition-all duration-300',
              isRecording ? 'h-0 overflow-hidden opacity-0' : 'opacity-100',
              'rounded-2xl',
            )}
            style={{
              background: 'rgba(0,0,0,0.06)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 16,
            }}
          >
            <AnimatePresence mode="sync">
              {showCanvas && speedMode ? (
                <motion.div
                  key="canvas-speed"
                  variants={{
                    enter: { opacity: 1, height: 'auto', scale: 1, transition: { type: 'spring', stiffness: 380, damping: 28, mass: 0.35 } },
                    exit: { opacity: 0, height: 0, scale: 0.96, transition: { type: 'spring', stiffness: 120, damping: 22, mass: 1.5 } },
                  }}
                  initial="exit"
                  animate="enter"
                  exit="exit"
                >
                  <CanvasSpeedFields onPublish={onPublish} />
                </motion.div>
              ) : (
                <motion.div
                  key="textarea"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 'auto', transition: { opacity: { duration: 0.15 }, height: { duration: 0 } } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.35 }}
                >
                  <PromptInputTextarea
                    placeholder={
                      speedMode
                        ? '一句话快速生成，不追问...'
                        : showThink
                          ? '深度思考...'
                          : showCanvas
                            ? '画布创作...'
                            : placeholder
                    }
                    className="text-base"
                  />
                </motion.div>
              )}
            </AnimatePresence>

          {isRecording && (
            <VoiceRecorder
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          )}

          <PromptInputActions
            className="flex items-center justify-between gap-2 p-0 pt-2"
          >
            <div
              className={cn(
                'flex items-center gap-1 transition-opacity duration-300',
                isRecording ? 'opacity-0 invisible h-0' : 'opacity-100 visible',
              )}
            >
              <PromptInputAction tooltip="上传图片">
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex h-8 w-8 text-text-muted cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-600/30 hover:text-text-secondary"
                  disabled={isRecording}
                >
                  <Paperclip className="h-5 w-5 transition-colors" />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0)
                        processFile(e.target.files[0])
                      if (e.target) e.target.value = ''
                    }}
                    accept="image/*"
                  />
                </button>
              </PromptInputAction>

              <div className="flex items-center">
                {enableSpeed && (
                  <button
                    type="button"
                    onClick={() => handleToggleChange('aggressive')}
                    className={cn(
                      'rounded-full transition-all flex items-center gap-1 border',
                      speedMode ? 'px-10 py-0 h-6' : 'px-2 py-1 h-8',
                      speedMode
                        ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B]'
                        : 'bg-transparent border-transparent text-text-muted hover:text-text-secondary',
                    )}
                  >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <motion.div
                        animate={{
                          rotate: speedMode ? 360 : 0,
                          scale: speedMode ? 1.1 : 1,
                        }}
                        whileHover={{
                          rotate: speedMode ? 360 : 15,
                          scale: 1.1,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 10,
                          },
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 25,
                        }}
                      >
                        <Zap
                          className={cn(
                            'w-4 h-4',
                            speedMode ? 'text-[#F59E0B]' : 'text-inherit',
                          )}
                        />
                      </motion.div>
                    </div>
                    <AnimatePresence>
                      {speedMode && (
                        <motion.span
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 'auto', opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm overflow-hidden whitespace-nowrap text-[#F59E0B] flex-shrink-0"
                        >
                          Speed
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleChange('think')}
                  className={cn(
                    'rounded-full transition-all flex items-center gap-1 border',
                    showThink ? 'px-10 py-0 h-6' : 'px-2 py-1 h-8',
                    showThink
                      ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-[#8B5CF6]'
                      : 'bg-transparent border-transparent text-text-muted hover:text-text-secondary',
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{
                        rotate: showThink ? 360 : 0,
                        scale: showThink ? 1.1 : 1,
                      }}
                      whileHover={{
                        rotate: showThink ? 360 : 15,
                        scale: 1.1,
                        transition: {
                          type: 'spring',
                          stiffness: 300,
                          damping: 10,
                        },
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 25,
                      }}
                    >
                      <BrainCog
                        className={cn(
                          'w-4 h-4',
                          showThink ? 'text-[#8B5CF6]' : 'text-inherit',
                        )}
                      />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showThink && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 'auto', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm overflow-hidden whitespace-nowrap text-[#8B5CF6] flex-shrink-0"
                      >
                        Think
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <CustomDivider />

                <button
                  type="button"
                  onClick={handleCanvasToggle}
                  className={cn(
                    'rounded-full transition-all flex items-center gap-1 border',
                    showCanvas ? 'px-10 py-0 h-6' : 'px-2 py-1 h-8',
                    showCanvas
                      ? 'bg-[#F97316]/15 border-[#F97316] text-[#F97316]'
                      : 'bg-transparent border-transparent text-text-muted hover:text-text-secondary',
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{
                        rotate: showCanvas ? 360 : 0,
                        scale: showCanvas ? 1.1 : 1,
                      }}
                      whileHover={{
                        rotate: showCanvas ? 360 : 15,
                        scale: 1.1,
                        transition: {
                          type: 'spring',
                          stiffness: 300,
                          damping: 10,
                        },
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 25,
                      }}
                    >
                      <FolderCode
                        className={cn(
                          'w-4 h-4',
                          showCanvas ? 'text-[#F97316]' : 'text-inherit',
                        )}
                      />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showCanvas && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 'auto', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm overflow-hidden whitespace-nowrap text-[#F97316] flex-shrink-0"
                      >
                        Canvas
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            <PromptInputAction
              tooltip={
                isLoading
                  ? '停止生成'
                  : isRecording
                    ? '停止录音'
                    : hasContent
                      ? '发送'
                      : '语音输入'
              }
            >
              <Button
                variant="default"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full transition-all duration-200',
                  isRecording
                    ? 'bg-transparent hover:bg-gray-600/30 text-red-500 hover:text-red-400'
                    : hasContent
                      ? 'bg-white hover:bg-white/80 text-bg-primary'
                      : 'bg-transparent hover:bg-gray-600/30 text-text-muted hover:text-text-secondary',
                )}
                onClick={() => {
                  if (isLoading) onAbort?.()
                  else if (isRecording) setIsRecording(false)
                  else if (hasContent) handleSubmit()
                  else setIsRecording(true)
                }}
                disabled={false}
              >
                {isLoading ? (
                  <Square className="h-4 w-4 fill-text-secondary animate-pulse" />
                ) : isRecording ? (
                  <StopCircle className="h-5 w-5 text-red-500" />
                ) : hasContent ? (
                  <ArrowUp className="h-4 w-4 text-text-secondary" />
                ) : (
                  <Mic className="h-5 w-5 text-text-secondary transition-colors" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
          </div>
        </PromptInput>

        <ImageViewDialog
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      </>
    )
  },
)
PromptInputBox.displayName = 'PromptInputBox'

/** Canvas + Speed：三行表单，信用卡式 label + 校验提示 + 自动格式化 */
function CanvasSpeedFields({
  onPublish,
}: {
  onPublish?: () => Promise<void>
}) {
  const fields = useDemandWorkspaceStore((s) => s.fields)
  const updateField = useDemandWorkspaceStore((s) => s.updateField)
  const [publishing, setPublishing] = React.useState(false)

  const title = fields.title
  const description = fields.description
  const budget = fields.budget

  const budgetNum = budget ? Number(budget.replace(/[^\d.]/g, '')) : 0
  const allValid = title.trim().length >= 2 && description.trim().length >= 2 && budgetNum > 0

  const doPublish = async () => {
    if (!allValid) return
    if (onPublish) {
      setPublishing(true)
      try {
        await onPublish()
      } finally {
        setPublishing(false)
      }
    }
  }

  return (
    <div className="ccp-form grid gap-3">
      <style>{canvasFieldStyles}</style>

      {/* 标题 */}
      <div>
        <label htmlFor="cvs-title">需求标题</label>
        <input
          id="cvs-title"
          type="text"
          placeholder="简短概括你的需求"
          value={title}
          onChange={(e) => updateField('title', e.target.value)}
          aria-invalid={title.length > 0 && title.trim().length < 2}
        />
        {title.length > 0 && title.trim().length < 2 && (
          <small className="err">标题至少 2 个字符</small>
        )}
      </div>

      {/* 描述 */}
      <div>
        <label htmlFor="cvs-desc">需求内容</label>
        <textarea
          id="cvs-desc"
          placeholder="详细描述你的需求"
          rows={2}
          value={description}
          onChange={(e) => updateField('description', e.target.value)}
          aria-invalid={description.length > 0 && description.trim().length < 2}
        />
        {description.length > 0 && description.trim().length < 2 && (
          <small className="err">描述至少 2 个字符</small>
        )}
      </div>

      {/* 金额 */}
      <div>
        <label htmlFor="cvs-price">金额</label>
        <input
          id="cvs-price"
          type="text"
          inputMode="numeric"
          placeholder="例如 3000"
          value={budget}
          onChange={(e) => {
            // 只允许数字和小数点
            const cleaned = e.target.value.replace(/[^\d.]/g, '')
            updateField('budget', cleaned)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && allValid) {
              e.preventDefault()
              doPublish()
            }
          }}
          aria-invalid={budget.length > 0 && budgetNum <= 0}
        />
        {budget.length > 0 && budgetNum <= 0 && (
          <small className="err">请输入有效金额</small>
        )}
      </div>

      {/* 发布按钮 */}
      <button
        type="button"
        onClick={doPublish}
        disabled={!allValid || publishing}
        className="publish-btn"
        aria-disabled={!allValid || publishing}
      >
        {publishing ? '发布中…' : allValid ? '发布需求' : '请完善所有字段'}
      </button>
    </div>
  )
}

const canvasFieldStyles = `
  .ccp-form {
    /* glass 效果由外层 wrapper 和下方 PromptActions 统一提供 */
  }
  .ccp-form label {
    display: block;
    margin: 6px 0 4px;
    color: var(--text-secondary, #666);
    font-weight: 500;
    font-size: 13px;
  }
  .ccp-form input,
  .ccp-form textarea {
    height: 46px;
    display: block;
    width: 100%;
    border: 1px solid rgba(255,255,255,0.10);
    padding: 10px 14px;
    transition: border-color 200ms ease, box-shadow 200ms ease;
    border-radius: 10px;
    outline: none;
    background: rgba(255,255,255,0.50);
    color: var(--text-primary, #0d0c22);
    font-size: 14px;
  }
  .ccp-form textarea {
    height: auto;
    resize: vertical;
  }
  .ccp-form input::placeholder,
  .ccp-form textarea::placeholder {
    color: var(--text-muted, #999);
  }
  .ccp-form input:focus,
  .ccp-form textarea:focus {
    border: 1px solid #3388FF;
    box-shadow: 0 0 0 3px rgba(51,136,255,0.1);
  }
  .ccp-form input[aria-invalid="true"],
  .ccp-form textarea[aria-invalid="true"] {
    border-color: #b42318;
    box-shadow: 0 0 0 3px rgba(180,35,24,0.08);
  }
  .ccp-form .err {
    color: #b42318;
    font-size: 11px;
    position: absolute;
    bottom: -16px;
    left: 0;
    white-space: nowrap;
  }
  .ccp-form > div {
    position: relative;
  }
  .ccp-form .publish-btn {
    margin-top: 4px;
    height: 44px;
    border: none;
    border-radius: 10px;
    background: rgba(51,136,255,0.18);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(51,136,255,0.25);
    color: #3388FF;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .ccp-form .publish-btn:not(:disabled):hover {
    background: rgba(51,136,255,0.30);
  }
  .ccp-form .publish-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`
