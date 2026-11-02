import { useCallback, useEffect, useState } from 'react';

import { vaultErrorMessage } from '@/auth/errors';
import { useSessionStore } from '@/store/session';

import { supabaseVaultRepository } from './repository';
import { useVaultStore } from './store';

// Loads the vault once per unlock and keeps the result in the store. Both the
// Password and Authenticator tabs rely on this, so it never double-fetches.
export function useVaultLoader(): {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const unlocked = useSessionStore((s) => s.unlocked);
  const userId = useSessionStore((s) => s.userId);
  const vaultId = useSessionStore((s) => s.vaultId);

  const loaded = useVaultStore((s) => s.loaded);
  const loading = useVaultStore((s) => s.loading);
  const setEntries = useVaultStore((s) => s.setEntries);
  const setLoaded = useVaultStore((s) => s.setLoaded);
  const setLoading = useVaultStore((s) => s.setLoading);

  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!unlocked || !userId || !vaultId) return;
    if (useVaultStore.getState().loading) return;
    setError(null);
    setLoading(true);
    try {
      const data = await supabaseVaultRepository.list({ userId, vaultId });
      setEntries(data);
      setLoaded(true);
    } catch (e) {
      setError(vaultErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [unlocked, userId, vaultId, setEntries, setLoaded, setLoading]);

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

  return { loading, loaded, error, refresh };
}
