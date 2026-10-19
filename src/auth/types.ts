import type { KdfParams } from '@/crypto/kdf';

// public.profiles as PostgREST returns it.
export type ProfileRow = {
  user_id: string;
  kdf_salt: string;
  kdf_params: KdfParams;
  protected_user_key: string;
  protected_user_key_recovery: string;
  cipher_version: number;
};

// public.vaults as PostgREST returns it.
export type VaultRow = {
  id: string;
  owner_id: string;
  protected_vault_key: string | null;
  cipher_version: number;
};
