import { create } from 'zustand';
import { historyApi } from '@/lib/api';
import type { HistoryListItem } from '@/types';

interface HistoryState {
  items: HistoryListItem[];
  loaded: boolean;
  refresh: () => Promise<void>;
  /** optimistic removal for the pop animation */
  dropLocal: (id: number) => void;
}

export const useHistory = create<HistoryState>((set) => ({
  items: [],
  loaded: false,

  refresh: async () => {
    try {
      const { items } = await historyApi.list();
      set({ items, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  dropLocal: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));
