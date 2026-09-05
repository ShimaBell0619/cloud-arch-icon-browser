import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  FolderArchiveIcon,
  FolderTreeIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { CategoryTree } from "@/components/category-tree";
import { IconDetailsDialog } from "@/components/icon-details-dialog";
import { LazyIconPreview } from "@/components/lazy-icon-preview";
import { Button } from "@/components/ui/button";
import {
  type IconCategory,
  type IconEntry,
  IconPackageSession,
  type PackageProblem,
} from "@/core";
import { version } from "../package.json";

const PACKAGE_ACCEPT = ".zip,application/zip,application/x-zip-compressed";
const SEARCH_DEBOUNCE_MS = 175;

type LoadPhase = "reading" | "validating" | "indexing";

interface LoadedPackage {
  session: IconPackageSession;
  filename: string;
  generation: number;
}

const LOAD_PHASE_LABELS: Record<LoadPhase, string> = {
  reading: "Reading package",
  validating: "Validating package",
  indexing: "Indexing icons",
};

export function App() {
  const activeSessionRef = useRef<IconPackageSession | null>(null);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);
  const [loadedPackage, setLoadedPackage] = useState<LoadedPackage | null>(
    null,
  );
  const [loadPhase, setLoadPhase] = useState<LoadPhase | null>(null);
  const [loadError, setLoadError] = useState<PackageProblem | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      const active = activeSessionRef.current;
      activeSessionRef.current = null;
      disposeQuietly(active);
    };
  }, []);

  const resetWorkspace = useCallback(() => {
    operationRef.current += 1;
    const active = activeSessionRef.current;
    activeSessionRef.current = null;
    setLoadedPackage(null);
    setLoadPhase(null);
    setLoadError(null);
    disposeQuietly(active);
  }, []);

  const loadPackage = useCallback(async (file: File) => {
    const operation = ++operationRef.current;
    setLoadError(null);
    setLoadPhase("reading");
    await yieldToBrowser();

    if (!mountedRef.current || operation !== operationRef.current) return;
    setLoadPhase("validating");

    const candidate = await IconPackageSession.open(file);
    if (!mountedRef.current || operation !== operationRef.current) {
      if (candidate.ok) disposeQuietly(candidate.session);
      return;
    }

    if (!candidate.ok) {
      setLoadError(candidate.error);
      setLoadPhase(null);
      return;
    }

    setLoadPhase("indexing");
    await yieldToBrowser();
    if (!mountedRef.current || operation !== operationRef.current) {
      disposeQuietly(candidate.session);
      return;
    }

    const previous = activeSessionRef.current;
    activeSessionRef.current = candidate.session;
    setLoadedPackage((current) => ({
      session: candidate.session,
      filename: file.name,
      generation: (current?.generation ?? 0) + 1,
    }));
    setLoadError(null);
    setLoadPhase(null);

    if (previous !== candidate.session) {
      window.setTimeout(() => disposeQuietly(previous), 0);
    }
  }, []);

  return (
    <AppErrorBoundary onReset={resetWorkspace}>
      {loadedPackage ? (
        <LoadedWorkspace
          key={loadedPackage.generation}
          loadedPackage={loadedPackage}
          loadPhase={loadPhase}
          loadError={loadError}
          onReplace={(file) => void loadPackage(file)}
        />
      ) : (
        <PackagePicker
          loadPhase={loadPhase}
          loadError={loadError}
          onLoad={(file) => void loadPackage(file)}
        />
      )}
    </AppErrorBoundary>
  );
}

interface PackagePickerProps {
  loadPhase: LoadPhase | null;
  loadError: PackageProblem | null;
  onLoad: (file: File) => void;
}

function PackagePicker({ loadPhase, loadError, onLoad }: PackagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const chooseFile = () => inputRef.current?.click();

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) onLoad(file);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    if (loadPhase) return;
    const file = event.dataTransfer.files.item(0);
    if (file) onLoad(file);
  };

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-6 px-5 py-10 sm:px-8">
      <header className="flex items-center gap-3">
        <BrandMark />
        <div>
          <p className="text-xs text-muted-foreground">
            Local workspace · v{version}
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Cloud Arch Icon Browser
          </h1>
        </div>
      </header>

      <section
        aria-labelledby="package-heading"
        className={`rounded-2xl border bg-card p-5 text-card-foreground transition-colors sm:p-8 ${dragging ? "border-ring bg-accent/50" : "border-border"}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!loadPhase) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div className="flex min-h-72 flex-col items-center justify-center text-center">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            {loadPhase ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            ) : (
              <FolderArchiveIcon aria-hidden="true" className="size-5" />
            )}
          </div>

          {loadPhase ? (
            <div role="status" aria-live="polite">
              <h2 id="package-heading" className="text-lg font-semibold">
                {LOAD_PHASE_LABELS[loadPhase]}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                The ZIP stays on this device. No package content is uploaded or
                persisted by the application.
              </p>
              <LoadPhases active={loadPhase} />
            </div>
          ) : (
            <>
              <h2 id="package-heading" className="text-lg font-semibold">
                Open your architecture icon package
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Drop the official Microsoft Azure Architecture Icons ZIP here,
                or choose it from this device. The package is processed locally
                for this session only.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={PACKAGE_ACCEPT}
                aria-label="Choose icon package ZIP"
                className="sr-only"
                onChange={handleInput}
              />
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button type="button" size="lg" onClick={chooseFile}>
                  <UploadIcon aria-hidden="true" data-icon="inline-start" />
                  Choose ZIP
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  nativeButton={false}
                  role="link"
                  render={
                    <a
                      href="https://learn.microsoft.com/en-us/azure/architecture/icons/"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  Get official icons
                  <ArrowUpRightIcon aria-hidden="true" data-icon="inline-end" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Drag and drop works only before a package is loaded.
              </p>
            </>
          )}
        </div>

        {loadError ? <PackageErrorNotice problem={loadError} /> : null}
      </section>

      <footer className="text-xs leading-5 text-muted-foreground">
        Independent open-source project. Not affiliated with, endorsed by, or
        sponsored by Microsoft. Icons are not included with this application.
      </footer>
    </main>
  );
}

function LoadPhases({ active }: { active: LoadPhase }) {
  const phases: readonly LoadPhase[] = ["reading", "validating", "indexing"];
  const activeIndex = phases.indexOf(active);

  return (
    <ol className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
      {phases.map((phase, index) => (
        <li key={phase} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${index <= activeIndex ? "bg-primary" : "bg-muted"}`}
          />
          <span
            className={
              index === activeIndex ? "font-medium text-foreground" : ""
            }
          >
            {phase.charAt(0).toUpperCase()}
            {phase.slice(1)}
          </span>
        </li>
      ))}
    </ol>
  );
}

interface LoadedWorkspaceProps {
  loadedPackage: LoadedPackage;
  loadPhase: LoadPhase | null;
  loadError: PackageProblem | null;
  onReplace: (file: File) => void;
}

function LoadedWorkspace({
  loadedPackage,
  loadPhase,
  loadError,
  onReplace,
}: LoadedWorkspaceProps) {
  const { session, filename } = loadedPackage;
  const { categories, summary } = session.metadata;
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<IconEntry | null>(null);
  const [detailsTrigger, setDetailsTrigger] = useState<HTMLElement | null>(
    null,
  );
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [dropNotice, setDropNotice] = useState<string | null>(null);

  const results = useMemo(
    () => session.search(debouncedQuery, selectedCategory),
    [debouncedQuery, selectedCategory, session],
  );

  useEffect(() => {
    const handleSlash = (event: KeyboardEvent) => {
      if (
        event.key !== "/" ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }
      if (isEditableTarget(event.target)) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", handleSlash);
    return () => window.removeEventListener("keydown", handleSlash);
  }, []);

  useEffect(() => {
    const handleGlobalDragOver = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    const handleGlobalDrop = (event: globalThis.DragEvent) => {
      if (!event.dataTransfer?.files.length) return;
      event.preventDefault();
      setDropNotice(
        "A package is already loaded. Use Change package to replace it.",
      );
    };

    window.addEventListener("dragover", handleGlobalDragOver);
    window.addEventListener("drop", handleGlobalDrop);
    return () => {
      window.removeEventListener("dragover", handleGlobalDragOver);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, []);

  const handleReplacementInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setDropNotice(null);
    onReplace(file);
  };

  const selectCategory = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const clearSearch = () => {
    setQuery("");
    searchRef.current?.focus();
  };

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <BrandMark compact />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                Cloud Arch Icon Browser
              </p>
              <p className="text-xs text-muted-foreground">Local package</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-muted/60 p-3">
            <p className="truncate text-xs font-medium" title={filename}>
              {filename}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.iconCount} icons · {summary.categoryCount} categories
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Categories
          </p>
          <CategoryTree
            categories={categories}
            totalIcons={summary.iconCount}
            selectedCategory={selectedCategory}
            onSelect={selectCategory}
          />
        </div>
        <div className="border-t border-border p-4 text-[11px] leading-5 text-muted-foreground">
          Local only · no package persistence
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background">
          <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:px-4">
            <Button
              ref={categoryButtonRef}
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open categories"
              onClick={() => setCategorySheetOpen(true)}
            >
              <FolderTreeIcon aria-hidden="true" />
            </Button>

            <div className="relative min-w-0 flex-1">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                aria-label="Search icons"
                placeholder="Search icons by name, filename, or category"
                className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-16 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                  onClick={clearSearch}
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                  /
                </kbd>
              )}
            </div>

            <span
              role="status"
              aria-live="polite"
              className="hidden shrink-0 text-xs text-muted-foreground sm:inline"
            >
              {results.length} {results.length === 1 ? "icon" : "icons"}
            </span>

            <input
              ref={replacementInputRef}
              type="file"
              accept={PACKAGE_ACCEPT}
              aria-label="Choose replacement icon package ZIP"
              className="sr-only"
              onChange={handleReplacementInput}
            />
            <Button
              type="button"
              variant="outline"
              disabled={loadPhase !== null}
              aria-label="Change package"
              onClick={() => {
                setDropNotice(null);
                replacementInputRef.current?.click();
              }}
            >
              {loadPhase ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
              )}
              <span className="hidden sm:inline">
                {loadPhase ? LOAD_PHASE_LABELS[loadPhase] : "Change package"}
              </span>
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3 py-2 text-xs text-muted-foreground sm:hidden">
            <span className="truncate" title={filename}>
              {filename}
            </span>
            <span className="shrink-0">
              {results.length}/{summary.iconCount} icons
            </span>
          </div>
        </header>

        <main className="p-3 sm:p-4 lg:p-5">
          {loadError ? (
            <PackageErrorNotice problem={loadError} compact />
          ) : null}
          {dropNotice ? (
            <div
              role="status"
              className="mb-3 flex items-start gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
            >
              <AlertCircleIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>{dropNotice}</span>
              <button
                type="button"
                aria-label="Dismiss package drop message"
                className="ml-auto rounded-md p-0.5 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => setDropNotice(null)}
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ) : null}

          {results.length ? (
            <section aria-label="Icon results">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
                {results.map(({ icon }) => (
                  <IconCard
                    key={icon.id}
                    session={session}
                    icon={icon}
                    onOpen={(trigger) => {
                      setDetailsTrigger(trigger);
                      setSelectedIcon(icon);
                    }}
                  />
                ))}
              </div>
            </section>
          ) : (
            <EmptyResults
              query={query}
              selectedCategory={selectedCategory}
              onClearSearch={clearSearch}
              onSearchAll={() => setSelectedCategory(null)}
            />
          )}
        </main>
      </div>

      <CategorySheet
        open={categorySheetOpen}
        trigger={categoryButtonRef.current}
        categories={categories}
        totalIcons={summary.iconCount}
        selectedCategory={selectedCategory}
        onSelect={(categoryId) => {
          selectCategory(categoryId);
          setCategorySheetOpen(false);
        }}
        onRequestClose={() => setCategorySheetOpen(false)}
      />

      <IconDetailsDialog
        session={session}
        icon={selectedIcon}
        restoreFocusTo={detailsTrigger}
        onClose={() => setSelectedIcon(null)}
      />
    </div>
  );
}

interface IconCardProps {
  session: IconPackageSession;
  icon: IconEntry;
  onOpen: (trigger: HTMLElement) => void;
}

function IconCard({ session, icon, onOpen }: IconCardProps) {
  const tooltipId = useId();
  const category = icon.categoryPath || "Top level";

  return (
    <button
      type="button"
      aria-label={`${icon.displayName}, ${category}`}
      aria-describedby={tooltipId}
      className="group relative flex h-44 min-w-0 flex-col items-center gap-3 rounded-2xl border border-border bg-card p-3 text-center outline-none transition-colors hover:border-input hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      onClick={(event) => onOpen(event.currentTarget)}
    >
      <LazyIconPreview session={session} icon={icon} />
      <div className="min-w-0 w-full">
        <p className="line-clamp-2 text-sm font-medium leading-5">
          {icon.displayName}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {category}
        </p>
      </div>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-2 left-1/2 z-10 w-max max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-lg border border-border bg-popover px-2 py-1 text-left text-xs text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="block font-medium">{icon.displayName}</span>
        <span className="block truncate text-muted-foreground">{category}</span>
      </span>
    </button>
  );
}

interface CategorySheetProps {
  open: boolean;
  trigger: HTMLElement | null;
  categories: readonly IconCategory[];
  totalIcons: number;
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
  onRequestClose: () => void;
}

function CategorySheet({
  open,
  trigger,
  categories,
  totalIcons,
  selectedCategory,
  onSelect,
  onRequestClose,
}: CategorySheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      queueMicrotask(() => closeRef.current?.focus());
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      onRequestClose();
      queueMicrotask(() => trigger?.focus());
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="category-sheet-title"
      className="m-0 h-svh max-h-none w-[min(86vw,20rem)] max-w-none rounded-none rounded-r-2xl border-y-0 border-l-0 border-r border-border bg-card p-0 text-card-foreground backdrop:bg-dialog-backdrop lg:hidden"
      onClose={() => {
        onRequestClose();
        queueMicrotask(() => trigger?.focus());
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="text-xs text-muted-foreground">Browse package</p>
            <h2 id="category-sheet-title" className="font-semibold">
              Categories
            </h2>
          </div>
          <Button
            ref={closeRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close categories"
            onClick={close}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <CategoryTree
            categories={categories}
            totalIcons={totalIcons}
            selectedCategory={selectedCategory}
            onSelect={onSelect}
          />
        </div>
      </div>
    </dialog>
  );
}

interface EmptyResultsProps {
  query: string;
  selectedCategory: string | null;
  onClearSearch: () => void;
  onSearchAll: () => void;
}

function EmptyResults({
  query,
  selectedCategory,
  onClearSearch,
  onSearchAll,
}: EmptyResultsProps) {
  return (
    <section className="mx-auto mt-12 max-w-md rounded-2xl border border-border bg-card p-5 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <SearchIcon aria-hidden="true" className="size-4" />
      </div>
      <h2 className="mt-3 text-sm font-semibold">No icons found</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Try a broader search or remove the current category scope.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {query ? (
          <Button type="button" variant="outline" onClick={onClearSearch}>
            Clear search
          </Button>
        ) : null}
        {selectedCategory ? (
          <Button type="button" variant="outline" onClick={onSearchAll}>
            Search all categories
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function PackageErrorNotice({
  problem,
  compact = false,
}: {
  problem: PackageProblem;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`${compact ? "mb-3" : "mt-5"} rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-left text-sm text-destructive`}
    >
      <div className="flex items-start gap-2">
        <AlertCircleIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        />
        <div>
          <p className="font-medium">{problem.message}</p>
          <p className="mt-1 text-xs leading-5 opacity-90">{problem.action}</p>
          {problem.path ? (
            <p className="mt-1 break-all text-xs leading-5 opacity-80">
              {problem.path}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`${compact ? "size-8 rounded-xl" : "size-10 rounded-2xl"} grid shrink-0 grid-cols-2 gap-1 bg-foreground p-2`}
    >
      <span className="rounded-[2px] bg-background" />
      <span className="rounded-[2px] bg-primary" />
      <span className="rounded-[2px] bg-primary" />
      <span className="rounded-[2px] bg-background" />
    </div>
  );
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function disposeQuietly(session: IconPackageSession | null): void {
  if (!session) return;
  void session.dispose().catch(() => undefined);
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
