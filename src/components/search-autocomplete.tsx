import { Clock3Icon, SearchIcon, StarIcon } from "lucide-react";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import type {
  IconEntry,
  IconPackageSession,
  SearchMatch,
} from "@/core";

export type SearchAutocompleteItem =
  | {
      readonly kind: "icon";
      readonly icon: IconEntry;
      readonly match: SearchMatch;
    }
  | {
      readonly kind: "favorite";
      readonly icon: IconEntry;
    }
  | {
      readonly kind: "recent-search";
      readonly query: string;
    };

interface SearchAutocompleteProps {
  id: string;
  open: boolean;
  session: IconPackageSession;
  items: readonly SearchAutocompleteItem[];
  activeIndex: number;
  onSelect: (item: SearchAutocompleteItem) => void;
}

export function SearchAutocomplete({
  id,
  open,
  session,
  items,
  activeIndex,
  onSelect,
}: SearchAutocompleteProps) {
  if (!open || items.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg">
      <ul id={id} role="listbox" aria-label="Search suggestions" className="max-h-[min(26rem,55svh)] overflow-y-auto p-1.5">
        {items.map((item, index) => {
          const active = index === activeIndex;
          const key = itemKey(item);
          return (
            <li key={key}>
              <button
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={active}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors ${active ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(item)}
              >
                {item.kind === "recent-search" ? (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
                    <Clock3Icon aria-hidden="true" className="size-4" />
                  </span>
                ) : (
                  <LazyIconPreview
                    session={session}
                    icon={item.icon}
                    eager
                    small
                  />
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.kind === "recent-search"
                      ? item.query
                      : item.icon.displayName}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    {item.kind === "recent-search" ? (
                      <>
                        <SearchIcon aria-hidden="true" className="size-3" />
                        <span>Recent search</span>
                      </>
                    ) : item.kind === "favorite" ? (
                      <>
                        <StarIcon
                          aria-hidden="true"
                          className="size-3"
                          fill="currentColor"
                        />
                        <span className="truncate">
                          Favorite · {item.icon.categoryPath || "Top level"}
                        </span>
                      </>
                    ) : (
                      <span className="truncate">
                        {matchLabel(item.match)} · {item.icon.categoryPath || "Top level"}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function itemKey(item: SearchAutocompleteItem): string {
  if (item.kind === "recent-search") return `search:${item.query}`;
  return `${item.kind}:${item.icon.id}`;
}

function matchLabel(match: SearchMatch): string {
  switch (match) {
    case "exact":
      return "Exact match";
    case "prefix":
      return "Prefix match";
    case "substring":
      return "Partial match";
    case "fuzzy":
      return "Fuzzy match";
    case "all":
      return "Icon";
  }
}
