import type { VaultEntry, VaultItem } from './models';

// "Authenticator" means TOTP items; everything else counts as a password entry.
export type VaultCategory = 'all' | 'password' | 'authenticator';

// Fields we search on. Never the secret values (password, pin, cvv).
function searchableText(item: VaultItem): string {
  return [item.title, item.username, item.url, item.cardHolder, item.notes]
    .join(' ')
    .toLowerCase();
}

// Filter by category and query, then show the most recently updated first.
export function filterEntries(
  entries: VaultEntry[],
  query: string,
  category: VaultCategory,
): VaultEntry[] {
  const needle = query.trim().toLowerCase();
  return entries
    .filter((entry) => {
      if (category === 'authenticator' && entry.item.type !== 'totp') return false;
      if (category === 'password' && entry.item.type === 'totp') return false;
      if (!needle) return true;
      return searchableText(entry.item).includes(needle);
    })
    .sort(
      (a, b) =>
        new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime(),
    );
}
