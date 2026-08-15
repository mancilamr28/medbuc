import { createContext, useContext } from 'react';

export type ToastKind = 'succes' | 'eroare' | 'info';

export interface ToastValue {
  notify: (kind: ToastKind, message: string) => void;
}

export const ToastContext = createContext<ToastValue | null>(null);

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast trebuie folosit în interiorul <ToastProvider>');
  return ctx;
}
