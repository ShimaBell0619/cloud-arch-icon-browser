import { describe, expect, it } from "vitest";
import {
  addIconsToTray,
  addIconToTray,
  moveTrayItem,
  reconcileTrayWithIcons,
  removeTrayItem,
  setTrayItemQuantity,
  trayTotalQuantity,
} from "./tray";
import type { IconEntry } from "./types";

function icon(index: number, categoryPath = "Compute"): IconEntry {
  const originalFilename = `${10000 + index}-icon-service-Service-${index}.svg`;
  const visiblePath = `${categoryPath}/${originalFilename}`;
  return {
    id: `Azure_Public_Service_Icons/${visiblePath}`,
    originalPath: `Azure_Public_Service_Icons/${visiblePath}`,
    originalFilename,
    displayName: `Service ${index}`,
    matchesNamingConvention: true,
    categoryId: `Azure_Public_Service_Icons/${categoryPath}`,
    categoryPath,
    uncompressedSize: 123,
  };
}

describe("tray", () => {
  it("merges duplicate icons by quantity and keeps insertion order", () => {
    let items = addIconsToTray([], [icon(1), icon(2)]);
    items = addIconToTray(items, icon(1), 2);

    expect(items.map((item) => item.icon.displayName)).toEqual([
      "Service 1",
      "Service 2",
    ]);
    expect(items[0]?.quantity).toBe(3);
    expect(trayTotalQuantity(items)).toBe(4);
  });

  it("updates quantity, removes at zero, and reorders accessibly", () => {
    let items = addIconsToTray([], [icon(1), icon(2), icon(3)]);
    const middle = items[1]?.reference.canonicalPath ?? "";

    items = moveTrayItem(items, middle, -1);
    expect(items.map((item) => item.icon.displayName)).toEqual([
      "Service 2",
      "Service 1",
      "Service 3",
    ]);

    items = setTrayItemQuantity(items, middle, 4);
    expect(items[0]?.quantity).toBe(4);
    items = setTrayItemQuantity(items, middle, 0);
    expect(items.map((item) => item.icon.displayName)).toEqual([
      "Service 1",
      "Service 3",
    ]);

    const first = items[0]?.reference.canonicalPath ?? "";
    items = removeTrayItem(items, first);
    expect(items).toHaveLength(1);
  });

  it("re-matches moved package entries conservatively and drops unmatched active items", () => {
    const original = icon(1, "Old");
    const missing = icon(2, "Removed");
    const items = addIconsToTray([], [original, missing]);
    const moved: IconEntry = {
      ...original,
      id: "Azure_Public_Service_Icons/New/99999-icon-service-Service-1.svg",
      originalPath:
        "Azure_Public_Service_Icons/New/99999-icon-service-Service-1.svg",
      originalFilename: "99999-icon-service-Service-1.svg",
      categoryId: "Azure_Public_Service_Icons/New",
      categoryPath: "New",
    };

    const reconciled = reconcileTrayWithIcons(items, [moved]);

    expect(reconciled.items).toHaveLength(1);
    expect(reconciled.items[0]?.icon.id).toBe(moved.id);
    expect(reconciled.items[0]?.reference.canonicalPath).toBe(
      "New/99999-icon-service-Service-1.svg",
    );
    expect(reconciled.unmatched).toHaveLength(1);
  });
});
