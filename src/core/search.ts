import Fuse from "fuse.js";
import { compareNames } from "./names";
import { isInCategory } from "./paths";
import type { IconEntry } from "./types";

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s-]+/gu, "");
}

// DESIGN.md's starting target; official-package relevance tuning is still pending.
export const INITIAL_FUZZY_THRESHOLD = 0.35;

export type SearchMatch = "all" | "exact" | "prefix" | "substring" | "fuzzy";
export interface IconSearchResult {
  readonly icon: IconEntry;
  readonly match: SearchMatch;
  readonly score: number;
}

interface SearchDocument {
  icon: IconEntry;
  displayName: string;
  filename: string;
  categoryPath: string;
}

export class IconSearchIndex {
  readonly #documents: readonly SearchDocument[];
  readonly #fuse: Fuse<SearchDocument>;

  constructor(icons: readonly IconEntry[]) {
    this.#documents = icons.map((icon) => ({
      icon,
      displayName: normalizeSearch(icon.displayName),
      filename: normalizeSearch(icon.originalFilename),
      categoryPath: normalizeSearch(icon.categoryPath),
    }));
    this.#fuse = new Fuse(this.#documents, {
      keys: [
        { name: "displayName", weight: 0.7 },
        { name: "filename", weight: 0.2 },
        { name: "categoryPath", weight: 0.1 },
      ],
      includeScore: true,
      ignoreLocation: true,
      threshold: INITIAL_FUZZY_THRESHOLD,
    });
  }

  search(query: string, categoryId: string | null = null): IconSearchResult[] {
    const normalized = normalizeSearch(query);
    const results = new Map<string, IconSearchResult>();
    for (const { icon, displayName } of this.#documents) {
      if (!isInCategory(icon, categoryId)) continue;
      const match = !normalized
        ? "all"
        : displayName === normalized
          ? "exact"
          : displayName.startsWith(normalized)
            ? "prefix"
            : displayName.includes(normalized)
              ? "substring"
              : null;
      if (match) results.set(icon.id, { icon, match, score: 0 });
    }
    if (normalized) {
      for (const { item, score } of this.#fuse.search(normalized)) {
        // Fuse's threshold applies to individual fields. Also omit weak combined
        // scores, e.g. incidental matches on the ubiquitous icon-service prefix.
        if (
          score !== undefined &&
          (score <= INITIAL_FUZZY_THRESHOLD ||
            item.filename.includes(normalized) ||
            item.categoryPath.includes(normalized)) &&
          !results.has(item.icon.id) &&
          isInCategory(item.icon, categoryId)
        ) {
          results.set(item.icon.id, {
            icon: item.icon,
            match: "fuzzy",
            score,
          });
        }
      }
    }
    const priority: Record<SearchMatch, number> = {
      all: 0,
      exact: 0,
      prefix: 1,
      substring: 2,
      fuzzy: 3,
    };
    return [...results.values()].sort(
      (a, b) =>
        priority[a.match] - priority[b.match] ||
        a.score - b.score ||
        compareNames(a.icon.displayName, b.icon.displayName) ||
        compareNames(a.icon.id, b.icon.id),
    );
  }
}
