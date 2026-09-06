import { MinusIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import { Button } from "@/components/ui/button";
import type { IconPackageSession, TrayItem } from "@/core";

interface TrayQuickPanelProps {
  open: boolean;
  session: IconPackageSession;
  items: readonly TrayItem[];
  onClose: () => void;
  onSetQuantity: (item: TrayItem, quantity: number) => void;
  onRemove: (item: TrayItem) => void;
  onViewFullTray: () => void;
}

export function TrayQuickPanel({
  open,
  session,
  items,
  onClose,
  onSetQuantity,
  onRemove,
  onViewFullTray,
}: TrayQuickPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const total = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="tray-quick-panel-title"
      className="m-0 ml-auto h-svh max-h-svh w-[min(92vw,24rem)] max-w-none overflow-hidden border-0 border-l border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-dialog-backdrop"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 id="tray-quick-panel-title" className="text-base font-semibold">
              Tray
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {items.length} unique icons · {total} total objects
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close Tray panel"
            onClick={() => dialogRef.current?.close()}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {items.length ? (
            <div className="space-y-2">
              {items.map((item) => (
                <article
                  key={item.reference.canonicalPath}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-2"
                >
                  <LazyIconPreview session={session} icon={item.icon} small />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.icon.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.icon.categoryPath || "Top level"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Decrease ${item.icon.displayName} quantity`}
                      onClick={() => onSetQuantity(item, item.quantity - 1)}
                    >
                      <MinusIcon aria-hidden="true" />
                    </Button>
                    <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                      <span className="sr-only">
                        {item.icon.displayName} quantity{" "}
                      </span>
                      {item.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Increase ${item.icon.displayName} quantity`}
                      onClick={() => onSetQuantity(item, item.quantity + 1)}
                    >
                      <PlusIcon aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.icon.displayName} from Tray`}
                      onClick={() => onRemove(item)}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm font-medium">Tray is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add icons from search results without leaving your current view.
              </p>
            </div>
          )}
        </div>

        <footer className="border-t border-border p-4">
          <Button type="button" className="w-full" onClick={onViewFullTray}>
            View full Tray
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
