import { create } from 'zustand';

interface UiState {
  saveHistory: boolean;
  sidebar: 'history' | 'collections';
  setSaveHistory: (v: boolean) => void;
  setSidebar: (v: 'history' | 'collections') => void;
}

export const useUi = create<UiState>((set) => ({
  saveHistory: true, // #chkSaveHistory is checked by default in the original
  sidebar: 'history',
  setSaveHistory: (saveHistory) => set({ saveHistory }),
  setSidebar: (sidebar) => set({ sidebar }),
}));
