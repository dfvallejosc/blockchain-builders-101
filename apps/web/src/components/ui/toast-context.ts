import { createContext, useContext } from 'react'
import type { AlertTone } from '@/components/ui/alert'

export interface ToastInput {
  tone: AlertTone
  title: string
  message?: string
}

export interface ToastApi {
  show: (toast: ToastInput) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export const useToast = (): ToastApi => {
  const api = useContext(ToastContext)
  if (api === null) throw new Error('useToast must be used inside ToastProvider')
  return api
}
