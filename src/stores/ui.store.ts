// src/stores/ui.store.ts
import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  durationMs?: number
}

interface UIStore {
  // ── Bottom Sheet ────────────────────────────────────────────────
  activeSheet: string | null
  openSheet: (sheetId: string) => void
  closeSheet: () => void

  // ── Toast queue ─────────────────────────────────────────────────
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void

  // ── Global loading overlay ───────────────────────────────────────
  isGlobalLoading: boolean
  setGlobalLoading: (loading: boolean) => void

  // ── Accessibility ───────────────────────────────────────────────
  highContrastMode: boolean
  setHighContrastMode: (enabled: boolean) => void
  fontScale: number
  setFontScale: (scale: number) => void
}

export const useUIStore = create<UIStore>((set) => ({
  // Bottom Sheet
  activeSheet: null,
  openSheet: (sheetId) => set({ activeSheet: sheetId }),
  closeSheet: () => set({ activeSheet: null }),

  // Toasts
  toasts: [],
  showToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Date.now().toString(), durationMs: toast.durationMs ?? 3000 },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  // Global loading
  isGlobalLoading: false,
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

  // Accessibility
  highContrastMode: false,
  setHighContrastMode: (enabled) => set({ highContrastMode: enabled }),
  fontScale: 1.0,
  setFontScale: (scale) => set((state) => {
    // Automatically enable high contrast mode if font scale > 1.3 as per Prompt 4.8
    const autoHighContrast = scale > 1.3
    return { 
      fontScale: scale, 
      highContrastMode: state.highContrastMode || autoHighContrast 
    }
  }),
}))
