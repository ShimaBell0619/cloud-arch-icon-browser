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

const SEARCH_MATCH_PRIORITY: Record<SearchMatch, number> = {
  all: 0,
  exact: 0,
  prefix: 1,
  substring: 2,
  fuzzy: 3,
};

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

    for (const document of this.#documents) {
      if (!isInCategory(document.icon, categoryId)) continue;
      const match = normalized
        ? deterministicMatch(document, normalized)
        : "all";
      if (match) {
        results.set(document.icon.id, {
          icon: document.icon,
          match,
          score: 0,
        });
      }
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

    const sorted = [...results.values()].sort(
      (a, b) =>
        SEARCH_MATCH_PRIORITY[a.match] - SEARCH_MATCH_PRIORITY[b.match] ||
        a.score - b.score ||
        compareNames(a.icon.displayName, b.icon.displayName) ||
        compareNames(a.icon.id, b.icon.id),
    );

    return categoryId === null ? dedupeGlobalResults(sorted) : sorted;
  }
}

function dedupeGlobalResults(
  results: readonly IconSearchResult[],
): IconSearchResult[] {
  const filenames = new Set<string>();
  return results.filter(({ icon }) => {
    if (filenames.has(icon.originalFilename)) return false;
    filenames.add(icon.originalFilename);
    return true;
  });
}

function deterministicMatch(
  document: SearchDocument,
  query: string,
): Exclude<SearchMatch, "all" | "fuzzy"> | null {
  const fields = [
    document.displayName,
    document.filename,
    document.categoryPath,
  ];
  if (fields.some((field) => field === query)) return "exact";
  if (fields.some((field) => field.startsWith(query))) return "prefix";
  if (fields.some((field) => field.includes(query))) return "substring";
  return null;
}
