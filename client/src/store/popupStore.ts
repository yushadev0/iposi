import { create } from 'zustand';
import type { PopupType } from '@/types';

interface PopupState {
  open: boolean;
  title: string;
  message: string;
  type: PopupType;
  show: (title: string, message: string, type?: PopupType) => void;
  close: () => void;
}

/** Replacement for the global window.iposiAlert() custom popup. */
export const usePopup = create<PopupState>((set) => ({
  open: false,
  title: '',
  message: '',
  type: 'error',
  show: (title, message, type = 'error') => set({ open: true, title, message, type }),
  close: () => set({ open: false }),
}));

export const iposiAlert = (title: string, message: string, type: PopupType = 'error') =>
  usePopup.getState().show(title, message, type);
