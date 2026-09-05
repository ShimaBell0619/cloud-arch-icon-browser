import { useEffect, useRef, useState } from "react";
import { DownloadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import { PackageError, type IconEntry, type IconPackageSession } from "@/core";

interface IconDetailsDialogProps {
  session: IconPackageSession;
  icon: IconEntry | null;
  restoreFocusTo: HTMLElement | null;
  onClose: () => void;
}

export function IconDetailsDialog({
  session,
  icon,
  restoreFocusTo,
  onClose,
}: IconDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (icon && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      queueMicrotask(() => closeButtonRef.current?.focus());
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
    setDownloadError(null);
    onClose();
    queueMicrotask(() => restoreFocusTo?.focus());
  };

  const download = async () => {
    if (!icon) return;
    setDownloadError(null);
    try {
      const item = await session.getDownload(icon.id);
      const anchor = document.createElement("a");
      anchor.href = item.url;
      anchor.download = item.filename;
      anchor.click();
    } catch (error) {
      setDownloadError(
        error instanceof PackageError
          ? error.problem.message
          : "The original SVG could not be prepared for download.",
      );
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="icon-details-title"
      className="m-auto w-[min(92vw,34rem)] max-h-[90svh] overflow-y-auto rounded-2xl border border-border bg-card p-0 text-card-foreground backdrop:bg-dialog-backdrop"
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
            <Button
              ref={closeButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close icon details"
              onClick={close}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>

          <LazyIconPreview session={session} icon={icon} eager large />

          <dl className="mt-5 grid gap-4 text-sm">
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

          {downloadError ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {downloadError}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Close
            </Button>
            <Button type="button" onClick={() => void download()}>
              <DownloadIcon aria-hidden="true" data-icon="inline-start" />
              Download SVG
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
