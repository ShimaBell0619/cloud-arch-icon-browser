import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  LoaderCircleIcon,
  MinusIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import { Button } from "@/components/ui/button";
import type { IconPackageSession, SavedSetRecord, TrayItem } from "@/core";
import { isExperimentalPowerPointCopyAllEnabled } from "@/lib/feature-flags";
import {
  copyTrayToPowerPoint,
  getPowerPointCopyCapability,
  type PowerPointCopyCapability,
  POWERPOINT_EXPERIMENT_ACK_KEY,
  powerPointCopyErrorMessage,
} from "@/lib/powerpoint-copy";

interface TrayWorkspaceProps {
  session: IconPackageSession;
  items: readonly TrayItem[];
  savedSets: readonly SavedSetRecord[];
  onSetQuantity: (item: TrayItem, quantity: number) => void;
  onRemove: (item: TrayItem) => void;
  onMove: (item: TrayItem, direction: -1 | 1) => void;
  onClear: () => void;
  onSaveAsSet: (name: string) => boolean;
  onRenameSet: (set: SavedSetRecord, name: string) => boolean;
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
  onRenameSet,
  onUpdateSetFromTray,
  onDeleteSet,
  onLoadSet,
  onCopySet,
  onImportSet,
}: TrayWorkspaceProps) {
  const [setName, setSetName] = useState("");
  const [renamingSetId, setRenamingSetId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [powerPointCapability, setPowerPointCapability] =
    useState<PowerPointCopyCapability | null>(null);
  const [copyAllPending, setCopyAllPending] = useState(false);
  const [showExperimentalWarning, setShowExperimentalWarning] = useState(false);
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  const powerPointFeatureEnabled = isExperimentalPowerPointCopyAllEnabled();

  useEffect(() => {
    if (!powerPointFeatureEnabled) return;
    let cancelled = false;
    void getPowerPointCopyCapability().then((capability) => {
      if (!cancelled) setPowerPointCapability(capability);
    });
    return () => {
      cancelled = true;
    };
  }, [powerPointFeatureEnabled]);

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

  const runCopyAll = async (acknowledged = false) => {
    if (!powerPointCapability?.available || !items.length || copyAllPending) {
      return;
    }
    if (!acknowledged && !hasPowerPointExperimentAcknowledgement()) {
      setShowExperimentalWarning(true);
      return;
    }

    setShowExperimentalWarning(false);
    setNotice(null);
    setCopyAllPending(true);
    try {
      const objectCount = await copyTrayToPowerPoint(
        session,
        items,
        powerPointCapability,
      );
      setNotice(
        `Prepared ${objectCount} PowerPoint objects. Paste once in PowerPoint.`,
      );
    } catch (error) {
      setNotice(powerPointCopyErrorMessage(error));
    } finally {
      setCopyAllPending(false);
    }
  };

  const maxPowerPointObjects = powerPointCapability?.maxObjects ?? 36;
  const copyAllOverLimit = total > maxPowerPointObjects;

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
          <div className="flex flex-wrap items-center gap-2">
            {powerPointFeatureEnabled && items.length ? (
              <Button
                type="button"
                disabled={
                  copyAllPending ||
                  copyAllOverLimit ||
                  powerPointCapability?.available !== true
                }
                onClick={() => void runCopyAll()}
              >
                {copyAllPending || powerPointCapability === null ? (
                  <LoaderCircleIcon
                    aria-hidden="true"
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <ClipboardCopyIcon aria-hidden="true" data-icon="inline-start" />
                )}
                Copy all
                <span className="rounded-md border border-primary-foreground/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Experimental
                </span>
              </Button>
            ) : null}
            {items.length ? (
              <Button type="button" variant="outline" onClick={onClear}>
                <Trash2Icon aria-hidden="true" data-icon="inline-start" />
                Clear Tray
              </Button>
            ) : null}
          </div>
        </div>

        {powerPointFeatureEnabled && items.length ? (
          <div className="mt-2 text-xs text-muted-foreground">
            {powerPointCapability === null ? (
              <p role="status">Checking Windows PowerPoint integration…</p>
            ) : powerPointCapability.available ? (
              copyAllOverLimit ? (
                <p role="status">
                  Experimental Copy all supports at most {maxPowerPointObjects}{" "}
                  objects.
                </p>
              ) : (
                <p>
                  Copy all uses the local Windows PowerPoint bridge and never
                  falls back to a flattened image.
                </p>
              )
            ) : (
              <p role="status">
                Experimental Copy all is available only from the Windows npx
                runtime.
              </p>
            )}
          </div>
        ) : null}

        {showExperimentalWarning ? (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">Experimental PowerPoint integration</p>
            <p className="mt-1 text-muted-foreground">
              Copy all is shipping before real-machine validation is available.
              It may fail with some PowerPoint environments. It will never
              replace your Tray with one flattened bitmap.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  rememberPowerPointExperimentAcknowledgement();
                  void runCopyAll(true);
                }}
              >
                Continue
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowExperimentalWarning(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

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

      <section
        aria-labelledby="save-set-heading"
        className="rounded-2xl border border-border bg-card p-4"
      >
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
                    <h3 className="truncate text-sm font-semibold">
                      {set.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {set.items.length} unique icons ·{" "}
                      {set.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                      total
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
                {renamingSetId === set.id ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={renameName}
                      maxLength={80}
                      aria-label={`Rename Saved Set ${set.name}`}
                      className="h-9 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                      onChange={(event) =>
                        setRenameName(event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        if (onRenameSet(set, renameName)) {
                          setNotice(
                            `Renamed Saved Set to ${renameName.trim()}.`,
                          );
                          setRenamingSetId(null);
                          setRenameName("");
                        } else {
                          setNotice("Enter a non-empty Saved Set name.");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (onRenameSet(set, renameName)) {
                          setNotice(
                            `Renamed Saved Set to ${renameName.trim()}.`,
                          );
                          setRenamingSetId(null);
                          setRenameName("");
                        } else {
                          setNotice("Enter a non-empty Saved Set name.");
                        }
                      }}
                    >
                      Save name
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRenamingSetId(null);
                        setRenameName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}
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
                    aria-label={`Rename Saved Set ${set.name}`}
                    onClick={() => {
                      setRenamingSetId(set.id);
                      setRenameName(set.name);
                    }}
                  >
                    Rename
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
                <details className="mt-3 rounded-xl border border-border px-3 py-2 text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    View contents
                  </summary>
                  <ul className="mt-2 space-y-1 text-foreground">
                    {set.items.map((item) => (
                      <li
                        key={item.canonicalPath}
                        className="flex justify-between gap-3"
                      >
                        <span className="min-w-0 truncate">
                          {item.displayName}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          ×{item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
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
        <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
          <span className="sr-only">{item.icon.displayName} quantity </span>
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

function hasPowerPointExperimentAcknowledgement(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(POWERPOINT_EXPERIMENT_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberPowerPointExperimentAcknowledgement(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POWERPOINT_EXPERIMENT_ACK_KEY, "1");
  } catch {
    // Acknowledgement persistence is optional; the warning can reappear.
  }
}
