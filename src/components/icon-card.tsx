import { CheckIcon, CopyIcon, PlusIcon, StarIcon } from "lucide-react";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import type { IconEntry, IconPackageSession, ViewPreference } from "@/core";

export const ICON_DRAG_MIME = "application/x-cloud-arch-icon-id";

interface IconCardProps {
  session: IconPackageSession;
  icon: IconEntry;
  view: ViewPreference;
  favorite: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onOpen: (trigger: HTMLElement) => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
  onAddToTray?: () => void;
  onToggleSelected?: () => void;
}

export function IconCard({
  session,
  icon,
  view,
  favorite,
  selectionMode = false,
  selected = false,
  onOpen,
  onToggleFavorite,
  onCopy,
  onAddToTray,
  onToggleSelected,
}: IconCardProps) {
  const compact = view === "compact";
  const category = icon.categoryPath || "Top level";

  return (
    <article
      draggable={!selectionMode && onAddToTray !== undefined}
      className={`group relative min-w-0 rounded-2xl border bg-card transition-colors hover:border-input hover:bg-muted/20 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 ${selected ? "border-primary ring-2 ring-primary/20" : "border-border"} ${compact ? "h-16" : "h-44"}`}
      onDragStart={(event) => {
        if (selectionMode || !onAddToTray) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(ICON_DRAG_MIME, icon.id);
      }}
    >
      <button
        type="button"
        aria-label={
          selectionMode
            ? `${selected ? "Deselect" : "Select"} ${icon.displayName}`
            : `Open ${icon.displayName} details, ${category}`
        }
        aria-pressed={selectionMode ? selected : undefined}
        className={`flex h-full w-full min-w-0 rounded-2xl text-left outline-none ${compact ? "items-center gap-3 px-3 pr-32" : "flex-col items-center gap-3 p-3 pt-5 text-center"}`}
        onClick={(event) => {
          if (selectionMode) onToggleSelected?.();
          else onOpen(event.currentTarget);
        }}
      >
        <LazyIconPreview session={session} icon={icon} small={compact} />
        <div className="min-w-0 flex-1">
          <p
            className={
              compact
                ? "truncate text-sm font-medium"
                : "line-clamp-2 text-sm font-medium leading-5"
            }
          >
            {icon.displayName}
          </p>
          {!compact ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {category}
            </p>
          ) : null}
        </div>
      </button>

      {selectionMode ? (
        <span
          aria-hidden="true"
          className={`absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
        >
          {selected ? <CheckIcon className="size-3.5" /> : null}
        </span>
      ) : (
        <div
          className={`absolute flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${compact ? "right-2 top-1/2 -translate-y-1/2" : "right-2 top-2"}`}
        >
          <button
            type="button"
            aria-label={
              favorite
                ? `Remove ${icon.displayName} from favorites`
                : `Add ${icon.displayName} to favorites`
            }
            aria-pressed={favorite}
            title={favorite ? "Remove favorite" : "Add favorite"}
            className={`flex size-8 items-center justify-center rounded-xl border border-border bg-card/95 outline-none backdrop-blur transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 ${favorite ? "text-primary" : "text-muted-foreground"}`}
            onClick={onToggleFavorite}
          >
            <StarIcon
              aria-hidden="true"
              className="size-3.5"
              fill={favorite ? "currentColor" : "none"}
            />
          </button>
          {onAddToTray ? (
            <button
              type="button"
              aria-label={`Add ${icon.displayName} to Tray`}
              title="Add to Tray"
              className="flex size-8 items-center justify-center rounded-xl border border-border bg-card/95 text-muted-foreground outline-none backdrop-blur transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
              onClick={onAddToTray}
            >
              <PlusIcon aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label={`Copy ${icon.displayName} image`}
            title="Copy image"
            className="flex h-8 items-center gap-1.5 rounded-xl bg-primary px-2.5 text-xs font-medium text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={onCopy}
          >
            <CopyIcon aria-hidden="true" className="size-3.5" />
            {!compact ? <span>Copy</span> : null}
          </button>
        </div>
      )}
    </article>
  );
}
