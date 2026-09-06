import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  MinusIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import { Button } from "@/components/ui/button";
import type {
  IconEntry,
  IconPackageSession,
  SavedSetRecord,
  TrayItem,
} from "@/core";

interface TrayWorkspaceProps {
  session: IconPackageSession;
  items: readonly TrayItem[];
  savedSets: readonly SavedSetRecord[];
  onSetQuantity: (item: TrayItem, quantity: number) => void;
  onRemove: (item: TrayItem) => void;
  onMove: (item: TrayItem, direction: -1 | 1) => void;
  onClear: () => void;
  onSaveAsSet: (name: string) => boolean;
  onUpdateSetFromTray: (set: SavedSetRecord) => void;
  onDeleteSet: (set: SavedSetRecord) => void;
  onLoadSet: (set: SavedSetRecord, mode: "add" | "replace") => void;
  onCopySet: (set: SavedSetRecord) => Promise<boolean>;
  onImportSet: (raw: string) => boolean;
}

export function TrayWorkspace({
  session,
  items,
  savedSets,
  onSetQuantity,
  onRemove,
  onMove,
  onClear,
  onSaveAsSet,
  onUpdateSetFromTray,
  onDeleteSet,
  onLoadSet,
  onCopySet,
  onImportSet,
}: TrayWorkspaceProps) {
  const [setName, setSetName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.quantity, 0);

  const save = () => {
    if (!onSaveAsSet(setName)) {
      setNotice("Enter a name and add at least one icon to the Tray first.");
      return;
    }
    setSetName("");
    setNotice("Saved the current Tray as a reusable set.");
  };

  const importFromClipboard = async () => {
    if (typeof navigator.clipboard?.readText !== "function") {
      setNotice("Clipboard text reading is not available in this browser.");
      return;
    }
    try {
      const raw = await navigator.clipboard.readText();
      setNotice(
        onImportSet(raw)
          ? "Imported a Saved Set from the clipboard."
          : "The clipboard does not contain a valid Saved Set.",
      );
    } catch {
      setNotice("Clipboard access was denied or unavailable.");
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="tray-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="tray-heading" className="text-base font-semibold">
              Tray
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} unique icons · {total} total objects
            </p>
          </div>
          {items.length ? (
            <Button type="button" variant="outline" onClick={onClear}>
              <Trash2Icon aria-hidden="true" data-icon="inline-start" />
              Clear Tray
            </Button>
          ) : null}
        </div>

        {items.length ? (
          <div className="mt-4 space-y-2">
            {items.map((item, index) => (
              <TrayRow
                key={item.reference.canonicalPath}
                session={session}
                item={item}
                first={index === 0}
                last={index === items.length - 1}
                onSetQuantity={onSetQuantity}
                onRemove={onRemove}
                onMove={onMove}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm font-medium">Tray is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add icons from search results or drag cards onto the Tray button.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="save-set-heading" className="rounded-2xl border border-border bg-card p-4">
        <h2 id="save-set-heading" className="text-sm font-semibold">
          Save current Tray
        </h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={setName}
            maxLength={80}
            placeholder="Set name, e.g. Web API"
            aria-label="Saved Set name"
            className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            onChange={(event) => setSetName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
          />
          <Button type="button" disabled={!items.length} onClick={save}>
            <SaveIcon aria-hidden="true" data-icon="inline-start" />
            Save as Set
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void importFromClipboard()}
          >
            <ClipboardPasteIcon aria-hidden="true" data-icon="inline-start" />
            Paste Set
          </Button>
        </div>
        {notice ? (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {notice}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="saved-sets-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="saved-sets-heading" className="text-base font-semibold">
              Saved Sets
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reusable icon combinations stored as local metadata only.
            </p>
          </div>
        </div>

        {savedSets.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {savedSets.map((set) => (
              <article
                key={set.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{set.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {set.items.length} unique icons · {set.items.reduce((sum, item) => sum + item.quantity, 0)} total
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete Saved Set ${set.name}`}
                    onClick={() => onDeleteSet(set)}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onLoadSet(set, "add")}
                  >
                    Add to Tray
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onLoadSet(set, "replace")}
                  >
                    Replace Tray
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!items.length}
                    onClick={() => onUpdateSetFromTray(set)}
                  >
                    Update
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void onCopySet(set).then((ok) => {
                        setNotice(
                          ok
                            ? `Copied ${set.name} to the clipboard.`
                            : "Could not copy the Saved Set.",
                        );
                      });
                    }}
                  >
                    <ClipboardCopyIcon
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    Copy Set
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No Saved Sets yet.
          </p>
        )}
      </section>
    </div>
  );
}

function TrayRow({
  session,
  item,
  first,
  last,
  onSetQuantity,
  onRemove,
  onMove,
}: {
  session: IconPackageSession;
  item: TrayItem;
  first: boolean;
  last: boolean;
  onSetQuantity: (item: TrayItem, quantity: number) => void;
  onRemove: (item: TrayItem) => void;
  onMove: (item: TrayItem, direction: -1 | 1) => void;
}) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <LazyIconPreview session={session} icon={item.icon} small />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.icon.displayName}</p>
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
        <span
          aria-label={`${item.icon.displayName} quantity ${item.quantity}`}
          className="min-w-8 text-center text-sm font-semibold tabular-nums"
        >
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
          disabled={first}
          aria-label={`Move ${item.icon.displayName} up`}
          onClick={() => onMove(item, -1)}
        >
          <ArrowUpIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={last}
          aria-label={`Move ${item.icon.displayName} down`}
          onClick={() => onMove(item, 1)}
        >
          <ArrowDownIcon aria-hidden="true" />
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
  );
}

export function mergeSavedSetIcons(
  current: readonly { readonly icon: IconEntry; readonly quantity: number }[],
): readonly { readonly icon: IconEntry; readonly quantity: number }[] {
  return current;
}
