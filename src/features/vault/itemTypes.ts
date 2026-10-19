import type { NeoColors } from '@/theme';
import type { VaultItemType } from '@/vault/models';

export const ITEM_TYPES: VaultItemType[] = ['login', 'totp', 'pin', 'card', 'note'];

export const ITEM_TYPE_LABEL: Record<VaultItemType, string> = {
  login: 'Login',
  totp: 'Kode 2FA',
  pin: 'PIN',
  card: 'Kartu',
  note: 'Catatan',
};

export const ITEM_TYPE_COLOR: Record<VaultItemType, keyof NeoColors> = {
  login: 'blue',
  totp: 'red',
  pin: 'primary',
  card: 'purple',
  note: 'green',
};
