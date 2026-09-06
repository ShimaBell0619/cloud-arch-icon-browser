import {
  createPersistedIconReference,
  matchPersistedIconReference,
  type PersistedIconReference,
} from "./persisted-identity";
import type { IconEntry } from "./types";

export interface TrayItem {
  readonly reference: PersistedIconReference;
  readonly icon: IconEntry;
  readonly quantity: number;
}

export interface ReconciledTray {
  readonly items: readonly TrayItem[];
  readonly unmatched: readonly PersistedIconReference[];
}

export function addIconToTray(
  items: readonly TrayItem[],
  icon: IconEntry,
  quantity = 1,
): readonly TrayItem[] {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return items;
  const reference = createPersistedIconReference(icon);
  const index = items.findIndex(
    (item) => item.reference.canonicalPath === reference.canonicalPath,
  );
  if (index < 0) return [...items, { reference, icon, quantity }];

  return items.map((item, itemIndex) =>
    itemIndex === index
      ? { ...item, icon, reference, quantity: item.quantity + quantity }
      : item,
  );
}

export function addIconsToTray(
  items: readonly TrayItem[],
  icons: readonly IconEntry[],
): readonly TrayItem[] {
  return icons.reduce<readonly TrayItem[]>(
    (current, icon) => addIconToTray(current, icon),
    items,
  );
}

export function setTrayItemQuantity(
  items: readonly TrayItem[],
  canonicalPath: string,
  quantity: number,
): readonly TrayItem[] {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return removeTrayItem(items, canonicalPath);
  }
  return items.map((item) =>
    item.reference.canonicalPath === canonicalPath
      ? { ...item, quantity }
      : item,
  );
}

export function removeTrayItem(
  items: readonly TrayItem[],
  canonicalPath: string,
): readonly TrayItem[] {
  return items.filter(
    (item) => item.reference.canonicalPath !== canonicalPath,
  );
}

export function moveTrayItem(
  items: readonly TrayItem[],
  canonicalPath: string,
  direction: -1 | 1,
): readonly TrayItem[] {
  const index = items.findIndex(
    (item) => item.reference.canonicalPath === canonicalPath,
  );
  if (index < 0) return items;
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;

  const next = [...items];
  [next[index], next[target]] = [next[target] as TrayItem, next[index] as TrayItem];
  return next;
}

export function reconcileTrayWithIcons(
  items: readonly TrayItem[],
  icons: readonly IconEntry[],
): ReconciledTray {
  const next: TrayItem[] = [];
  const unmatched: PersistedIconReference[] = [];

  for (const item of items) {
    const match = matchPersistedIconReference(item.reference, icons);
    if (!match) {
      unmatched.push(item.reference);
      continue;
    }
    next.push({
      reference: match.healedReference,
      icon: match.icon,
      quantity: item.quantity,
    });
  }

  return { items: next, unmatched };
}

export function trayTotalQuantity(items: readonly TrayItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
