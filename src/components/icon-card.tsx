import { CopyIcon, StarIcon } from "lucide-react";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import type { IconEntry, IconPackageSession, ViewPreference } from "@/core";

interface IconCardProps {
  session: IconPackageSession;
  icon: IconEntry;
  view: ViewPreference;
  favorite: boolean;
  onOpen: (trigger: HTMLElement) => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
}

export function IconCard({
  session,
  icon,
  view,
  favorite,
  onOpen,
  onToggleFavorite,
  onCopy,
}: IconCardProps) {
  const compact = view === "compact";
  const category = icon.categoryPath || "Top level";

  return (
    <article
      className={`group relative min-w-0 rounded-2xl border border-border bg-card transition-colors hover:border-input hover:bg-muted/20 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 ${compact ? "h-16" : "h-44"}`}
    >
      <button
        type="button"
        aria-label={`Open ${icon.displayName} details, ${category}`}
        className={`flex h-full w-full min-w-0 rounded-2xl text-left outline-none ${compact ? "items-center gap-3 px-3 pr-24" : "flex-col items-center gap-3 p-3 pt-5 text-center"}`}
        onClick={(event) => onOpen(event.currentTarget)}
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
    </article>
  );
}
