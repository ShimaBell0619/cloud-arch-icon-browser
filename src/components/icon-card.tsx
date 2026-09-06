import { CheckIcon, CopyIcon, PlusIcon, StarIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
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
  const titleRef = useRef<HTMLParagraphElement>(null);
  const tooltipId = useId();
  const [titleTruncated, setTitleTruncated] = useState(false);

  useLayoutEffect(() => {
    if (!compact) {
      setTitleTruncated(false);
      return;
    }

    const title = titleRef.current;
    if (!title) return;

    const updateTruncation = () => {
      setTitleTruncated(title.scrollWidth > title.clientWidth + 1);
    };

    updateTruncation();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateTruncation);
      return () => window.removeEventListener("resize", updateTruncation);
    }

    const observer = new ResizeObserver(updateTruncation);
    observer.observe(title);
    return () => observer.disconnect();
  }, [compact]);

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
        aria-describedby={compact && titleTruncated ? tooltipId : undefined}
        aria-pressed={selectionMode ? selected : undefined}
        className={`flex h-full w-full min-w-0 rounded-2xl text-left outline-none ${compact ? "compact-card-main items-center gap-3 px-3" : "flex-col items-center gap-3 p-3 pt-5 text-center"}`}
        onClick={(event) => {
          if (selectionMode) onToggleSelected?.();
          else onOpen(event.currentTarget);
        }}
      >
        <LazyIconPreview session={session} icon={icon} small={compact} />
        <div className="relative min-w-0 flex-1">
          <p
            ref={compact ? titleRef : undefined}
            className={
              compact
                ? "truncate text-sm font-medium"
                : "line-clamp-2 text-sm font-medium leading-5"
            }
          >
            {icon.displayName}
          </p>
          {compact && titleTruncated ? (
            <span
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none absolute left-0 top-full z-30 mt-2 max-w-72 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-left text-xs font-medium text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {icon.displayName}
            </span>
          ) : null}
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
          className={
            compact
              ? "compact-card-actions absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 transition-opacity"
              : "absolute right-2 top-2 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          }
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
            className={`flex size-8 items-center justify-center rounded-xl border border-border bg-card/95 outline-none backdrop-blur transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 ${compact ? "compact-card-secondary-action" : ""} ${favorite ? "text-primary" : "text-muted-foreground"}`}
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
              className={`flex size-8 items-center justify-center rounded-xl border border-border bg-card/95 text-muted-foreground outline-none backdrop-blur transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 ${compact ? "compact-card-secondary-action" : ""}`}
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
