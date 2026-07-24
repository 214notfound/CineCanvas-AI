import { create } from 'zustand'
import type { ProcessedImage } from '@/lib/downsample'

interface SessionState {
  /** The current uploaded + preprocessed image, or null before upload. */
  image: ProcessedImage | null
  /** Set the current image; revokes the previous preview object URL. */
  setImage: (image: ProcessedImage | null) => void
  /** Clear the current image and free its preview object URL. */
  clearImage: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  image: null,
  setImage: (image) => {
    const prev = get().image
    if (prev && prev.preview.url !== image?.preview.url) {
      URL.revokeObjectURL(prev.preview.url)
    }
    set({ image })
  },
  clearImage: () => {
    const prev = get().image
    if (prev) URL.revokeObjectURL(prev.preview.url)
    set({ image: null })
  },
}))
