import { create } from 'zustand';

import type { VaultEntry } from './models';

type VaultState = {
  entries: VaultEntry[];
  loaded: boolean;
  setEntries: (entries: VaultEntry[]) => void;
  setLoaded: (loaded: boolean) => void;
  upsert: (entry: VaultEntry) => void;
  remove: (itemId: string) => void;
  clear: () => void;
};

export const useVaultStore = create<VaultState>((set) => ({
  entries: [],
  loaded: false,
  setEntries: (entries) => set({ entries }),
  setLoaded: (loaded) => set({ loaded }),
  upsert: (entry) =>
    set((state) => {
      const index = state.entries.findIndex((e) => e.item.id === entry.item.id);
      if (index === -1) return { entries: [entry, ...state.entries] };
      const next = state.entries.slice();
      next[index] = entry;
      return { entries: next };
    }),
  remove: (itemId) =>
    set((state) => ({ entries: state.entries.filter((e) => e.item.id !== itemId) })),
  clear: () => set({ entries: [], loaded: false }),
}));
