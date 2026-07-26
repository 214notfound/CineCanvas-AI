import { useRef, useState } from 'react'
import { processImageFile } from '@/lib/downsample'
import { useSessionStore } from '@/store/useSessionStore'

interface UploadZoneProps {
  /** Optional compact layout for embedding next to other panels. */
  compact?: boolean
}

/**
 * Drag-and-drop / click-to-upload zone. Downsamples on pick and stores the
 * result in the session (which also clears any previous AI analysis).
 */
export function UploadZone({ compact = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const image = useSessionStore((s) => s.image)
  const setImage = useSessionStore((s) => s.setImage)

  async function handleFile(file: File | undefined | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLocalError('请选择图片文件（jpg / png / webp）')
      return
    }
    setLocalError(null)
    setProcessing(true)
    try {
      const processed = await processImageFile(file)
      setImage(processed)
      if (import.meta.env.DEV) {
        console.log(
          `[downsample] 原图 ${processed.originalWidth}×${processed.originalHeight} · ` +
            `预览 ${processed.preview.width}×${processed.preview.height} · ` +
            `送 AI ${processed.ai.width}×${processed.ai.height}`,
        )
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '图片处理失败')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void handleFile(e.dataTransfer.files?.[0])
        }}
        className={[
          'cursor-pointer border-2 border-dashed transition-colors',
          compact ? 'rounded-lg p-4' : 'rounded-xl p-8',
          dragOver
            ? 'border-gold bg-gold/10'
            : 'border-paper-dim/50 bg-film/40 hover:border-paper-dim',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        {image ? (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <img
              src={image.preview.url}
              alt="已上传预览"
              className={
                compact
                  ? 'h-24 w-24 rounded object-cover'
                  : 'h-40 w-40 rounded-md object-cover shadow-lg'
              }
            />
            <div className="text-center sm:text-left">
              <p className="font-serif-sc text-cream">
                {image.originalFile.name}
              </p>
              <p className="mt-1 font-sans text-xs text-paper-dim">
                点击或拖入可更换图片
              </p>
              {processing && (
                <p className="mt-2 font-sans text-sm text-gold">处理中…</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-display text-2xl text-cream">上传照片</p>
            <p className="mt-2 font-serif-sc text-sm text-paper-dim">
              拖拽到此处，或点击选择本地图片
            </p>
            {processing && (
              <p className="mt-3 font-sans text-sm text-gold">处理中…</p>
            )}
          </div>
        )}
      </div>

      {localError && (
        <p className="font-sans text-sm text-crimson">{localError}</p>
      )}
    </div>
  )
}
