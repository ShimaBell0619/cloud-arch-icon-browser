import { ImageOffIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { IconEntry, IconPackageSession } from "@/core";

interface LazyIconPreviewProps {
  session: IconPackageSession;
  icon: IconEntry;
  eager?: boolean;
  large?: boolean;
  small?: boolean;
}

type PreviewState =
  | { status: "idle" | "loading"; url: null }
  | { status: "ready"; url: string }
  | { status: "error"; url: null };

export function LazyIconPreview({
  session,
  icon,
  eager = false,
  large = false,
  small = false,
}: LazyIconPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<PreviewState>({
    status: "idle",
    url: null,
  });

  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const load = async () => {
      setPreview({ status: "loading", url: null });
      try {
        const url = await session.getPreviewUrl(icon.id);
        if (!cancelled) setPreview({ status: "ready", url });
      } catch {
        if (!cancelled) setPreview({ status: "error", url: null });
      }
    };

    if (eager || typeof IntersectionObserver === "undefined") {
      void load();
    } else {
      const host = hostRef.current;
      if (host) {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect();
              observer = null;
              void load();
            }
          },
          { rootMargin: "180px" },
        );
        observer.observe(host);
      }
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [eager, icon.id, session]);

  const hostSize = large ? "h-48 w-full" : small ? "size-10" : "size-20";
  const contentSize = large ? "size-32" : small ? "size-7" : "size-16";

  return (
    <div
      ref={hostRef}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-preview-border bg-preview ${hostSize}`}
    >
      {preview.status === "ready" ? (
        <img
          src={preview.url}
          alt={`${icon.displayName} preview`}
          className={`${contentSize} object-contain`}
          draggable={false}
          loading={eager ? "eager" : "lazy"}
        />
      ) : preview.status === "error" ? (
        <div className="flex flex-col items-center gap-1 text-preview-muted">
          <ImageOffIcon aria-hidden="true" className="size-4" />
          {!small ? (
            <span className="text-[10px] font-medium">Preview unavailable</span>
          ) : null}
        </div>
      ) : (
        <div
          aria-label={`Loading ${icon.displayName} preview`}
          role="status"
          className={`${contentSize} animate-pulse rounded-lg bg-preview-skeleton`}
        />
      )}
    </div>
  );
}
