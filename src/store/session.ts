import { create } from 'zustand';

import { getCryptoCore } from '@/crypto/core';

// The vault key itself lives in the crypto core (native when available), never
// in this store. Here we only keep non-secret session metadata.
type SessionState = {
  email: string | null;
  userId: string | null;
  vaultId: string | null;
  recoveryEnabled: boolean;
  unlocked: boolean;
  unlock: (input: {
    email: string;
    userId: string;
    vaultId: string;
    recoveryEnabled: boolean;
  }) => void;
  markRecoveryEnabled: () => void;
  lock: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  email: null,
  userId: null,
  vaultId: null,
  recoveryEnabled: false,
  unlocked: false,
  unlock: ({ email, userId, vaultId, recoveryEnabled }) =>
    set({ email, userId, vaultId, recoveryEnabled, unlocked: true }),
  markRecoveryEnabled: () => set({ recoveryEnabled: true }),
  lock: () => {
    getCryptoCore().lock();
    set({
      email: null,
      userId: null,
      vaultId: null,
      recoveryEnabled: false,
      unlocked: false,
    });
  },
}));
