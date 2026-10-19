import { useEffect, useState } from 'react';

import { vaultErrorMessage } from '@/auth/errors';
import { useSessionStore } from '@/store/session';

import { supabaseVaultRepository } from './repository';
import { useVaultStore } from './store';

// Loads the vault once per unlock and keeps the result in the store. Both the
// Password and Authenticator tabs rely on this, so it never double-fetches.
export function useVaultLoader(): { error: string | null } {
  const unlocked = useSessionStore((s) => s.unlocked);
  const userId = useSessionStore((s) => s.userId);
  const vaultId = useSessionStore((s) => s.vaultId);

  const loaded = useVaultStore((s) => s.loaded);
  const setEntries = useVaultStore((s) => s.setEntries);
  const setLoaded = useVaultStore((s) => s.setLoaded);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unlocked || !userId || !vaultId || loaded) return;
    let active = true;
    supabaseVaultRepository
      .list({ userId, vaultId })
      .then((data) => {
        if (!active) return;
        setEntries(data);
        setLoaded(true);
      })
      .catch((e) => {
        if (!active) return;
        setError(vaultErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [unlocked, userId, vaultId, loaded, setEntries, setLoaded]);

  return { error };
}
