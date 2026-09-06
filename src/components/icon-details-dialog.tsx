import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileCode2Icon,
  LoaderCircleIcon,
  PlusIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import { Button } from "@/components/ui/button";
import { type IconEntry, type IconPackageSession, PackageError } from "@/core";
import {
  clipboardErrorMessage,
  copyIconAsPng,
  copySvgText,
} from "@/lib/icon-clipboard";

interface IconDetailsDialogProps {
  session: IconPackageSession;
  icon: IconEntry | null;
  restoreFocusTo: HTMLElement | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onAddToTray?: (icon: IconEntry) => void;
  onUsed?: (icon: IconEntry) => void;
  onClose: () => void;
}

type PendingAction = "image" | "svg" | "download" | null;

export function IconDetailsDialog({
  session,
  icon,
  restoreFocusTo,
  favorite,
  onToggleFavorite,
  onAddToTray,
  onUsed,
  onClose,
}: IconDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<{
    readonly kind: "success" | "error";
    readonly message: string;
  } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    setPending(null);
    setNotice(null);
    if (icon && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      queueMicrotask(() => primaryButtonRef.current?.focus());
    } else if (!icon && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [icon]);

  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      handleClosed();
    }
  };

  const handleClosed = () => {
    setPending(null);
    setNotice(null);
    onClose();
    queueMicrotask(() => restoreFocusTo?.focus());
  };

  const copyImage = async () => {
    if (!icon || pending) return;
    setNotice(null);
    setPending("image");
    try {
      await copyIconAsPng(session, icon);
      onUsed?.(icon);
      setNotice({ kind: "success", message: "Copied 512×512 PNG image." });
    } catch (error) {
      setNotice({ kind: "error", message: clipboardErrorMessage(error) });
    } finally {
      setPending(null);
    }
  };

  const copySvg = async () => {
    if (!icon || pending) return;
    setNotice(null);
    setPending("svg");
    try {
      await copySvgText(session, icon);
      onUsed?.(icon);
      setNotice({ kind: "success", message: "Copied original SVG source text." });
    } catch (error) {
      setNotice({ kind: "error", message: clipboardErrorMessage(error) });
    } finally {
      setPending(null);
    }
  };

  const download = async () => {
    if (!icon || pending) return;
    setNotice(null);
    setPending("download");
    try {
      const item = await session.getDownload(icon.id);
      const anchor = document.createElement("a");
      anchor.href = item.url;
      anchor.download = item.filename;
      anchor.click();
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof PackageError
            ? error.problem.message
            : "The original SVG could not be prepared for download.",
      });
    } finally {
      setPending(null);
    }
  };

  const canCopySvg =
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="icon-details-title"
      className="m-auto w-[min(92vw,36rem)] max-h-[90svh] overflow-y-auto rounded-2xl border border-border bg-card p-0 text-card-foreground backdrop:bg-dialog-backdrop"
      onClose={handleClosed}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      {icon ? (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Icon details
              </p>
              <h2
                id="icon-details-title"
                className="mt-1 text-xl font-semibold tracking-tight"
              >
                {icon.displayName}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onAddToTray ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Add ${icon.displayName} to Tray`}
                  title="Add to Tray"
                  onClick={() => onAddToTray(icon)}
                >
                  <PlusIcon aria-hidden="true" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={
                  favorite
                    ? `Remove ${icon.displayName} from favorites`
                    : `Add ${icon.displayName} to favorites`
                }
                aria-pressed={favorite}
                title={favorite ? "Remove favorite" : "Add favorite"}
                onClick={onToggleFavorite}
              >
                <StarIcon
                  aria-hidden="true"
                  fill={favorite ? "currentColor" : "none"}
                  className={favorite ? "text-primary" : undefined}
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close icon details"
                onClick={close}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </div>
          </div>

          <LazyIconPreview session={session} icon={icon} eager large />

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Category
              </dt>
              <dd className="mt-1 break-words">
                {icon.categoryPath || "Top level"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Original filename
              </dt>
              <dd className="mt-1 break-all">{icon.originalFilename}</dd>
            </div>
          </dl>

          {notice ? (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${notice.kind === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-muted/60 text-foreground"}`}
            >
              {notice.kind === "success" ? (
                <CheckIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
              ) : null}
              <span>{notice.message}</span>
            </p>
          ) : null}

          <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Button
              ref={primaryButtonRef}
              type="button"
              size="lg"
              disabled={pending !== null}
              onClick={() => void copyImage()}
            >
              {pending === "image" ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <CopyIcon aria-hidden="true" data-icon="inline-start" />
              )}
              Copy image
            </Button>
            {canCopySvg ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending !== null}
                onClick={() => void copySvg()}
              >
                {pending === "svg" ? (
                  <LoaderCircleIcon
                    aria-hidden="true"
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <FileCode2Icon aria-hidden="true" data-icon="inline-start" />
                )}
                Copy SVG source
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null}
              onClick={() => void download()}
            >
              {pending === "download" ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              )}
              Download SVG
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
