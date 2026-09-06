from pathlib import Path

path = Path("src/App.tsx")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    if old not in text:
        raise SystemExit(f"App transform marker not found: {old[:80]!r}")
    text = text.replace(old, new, 1)


def replace_between(start: str, end: str, replacement: str) -> None:
    global text
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"App transform start marker not found: {start!r}")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"App transform end marker not found: {end!r}")
    text = text[:start_index] + replacement + text[end_index:]


replace_once(
    "  RefreshCwIcon,\n  SearchIcon,\n  StarIcon,",
    "  RefreshCwIcon,\n  Rows3Icon,\n  SearchIcon,\n  StarIcon,",
)
replace_once(
    "  type DragEvent,\n  type ReactNode,",
    "  type DragEvent,\n  type KeyboardEvent as ReactKeyboardEvent,\n  type ReactNode,",
)
replace_once(
    'import { IconDetailsDialog } from "@/components/icon-details-dialog";\nimport { LazyIconPreview } from "@/components/lazy-icon-preview";',
    'import { IconCard } from "@/components/icon-card";\nimport { IconDetailsDialog } from "@/components/icon-details-dialog";\nimport {\n  SearchAutocomplete,\n  type SearchAutocompleteItem,\n} from "@/components/search-autocomplete";',
)

core_start = 'import {\n  createDefaultPersistedState,'
core_end = '} from "@/core";'
core_replacement = '''import {
  addFavorite,
  createDefaultPersistedState,
  type IconCategory,
  type IconEntry,
  IconPackageSession,
  loadPersistedState,
  type PackageProblem,
  type PersistedPreferences,
  type PersistedState,
  reconcilePersistedStateWithIcons,
  recordRecentIcon,
  recordRecentSearch,
  removeFavorite,
  savePersistedState,
  setPersistedPreferences,
  type ThemePreference,
} from "@/core";'''
replace_between(core_start, core_end, core_replacement)
replace_once(
    'import { choosePackageFile } from "@/lib/package-file-picker";',
    'import {\n  clipboardErrorMessage,\n  copyIconAsPng,\n} from "@/lib/icon-clipboard";\nimport { choosePackageFile } from "@/lib/package-file-picker";',
)
replace_once(
    'type WorkspaceView = "all" | "favorites" | "recent";',
    'type WorkspaceView = "all" | "favorites" | "recent";\ntype PersistedStateUpdater = (\n  updater: (state: PersistedState) => PersistedState,\n) => void;',
)

old_preferences = '''  const updatePreferences = useCallback(
    (preferences: Partial<PersistedPreferences>) => {
      setPersistedState((current) => {
        const next = setPersistedPreferences(current, preferences);
        persistStateQuietly(next);
        return next;
      });
    },
    [],
  );'''
new_preferences = '''  const updatePersistedState = useCallback<PersistedStateUpdater>((updater) => {
    setPersistedState((current) => {
      const next = updater(current);
      if (next !== current) persistStateQuietly(next);
      return next;
    });
  }, []);

  const updatePreferences = useCallback(
    (preferences: Partial<PersistedPreferences>) => {
      updatePersistedState((current) =>
        setPersistedPreferences(current, preferences),
      );
    },
    [updatePersistedState],
  );'''
replace_once(old_preferences, new_preferences)
replace_once(
    '''          preferences={persistedState.preferences}
          onPreferencesChange={updatePreferences}
          onReplace={(file) => void loadPackage(file)}''',
    '''          persistedState={persistedState}
          preferences={persistedState.preferences}
          onPersistedStateChange={updatePersistedState}
          onPreferencesChange={updatePreferences}
          onReplace={(file) => void loadPackage(file)}''',
)

loaded_workspace = r'''interface LoadedWorkspaceProps {
  loadedPackage: LoadedPackage;
  loadPhase: LoadPhase | null;
  loadError: PackageProblem | null;
  persistedState: PersistedState;
  preferences: PersistedPreferences;
  onPersistedStateChange: PersistedStateUpdater;
  onPreferencesChange: (preferences: Partial<PersistedPreferences>) => void;
  onReplace: (file: File) => void;
}

function LoadedWorkspace({
  loadedPackage,
  loadPhase,
  loadError,
  persistedState,
  preferences,
  onPersistedStateChange,
  onPreferencesChange,
  onReplace,
}: LoadedWorkspaceProps) {
  const { session, filename } = loadedPackage;
  const { categories, icons, summary } = session.metadata;
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const copyNoticeTimeoutRef = useRef<number | null>(null);
  const searchListboxId = useId();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<IconEntry | null>(null);
  const [detailsTrigger, setDetailsTrigger] = useState<HTMLElement | null>(
    null,
  );
  const [navigationSheetOpen, setNavigationSheetOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [activeAutocompleteIndex, setActiveAutocompleteIndex] = useState(-1);
  const [copyNotice, setCopyNotice] = useState<{
    readonly kind: "success" | "error";
    readonly message: string;
  } | null>(null);

  const reconciliation = useMemo(
    () => reconcilePersistedStateWithIcons(persistedState, icons),
    [icons, persistedState],
  );

  useEffect(() => {
    if (!reconciliation.changed) return;
    onPersistedStateChange(() => reconciliation.state);
  }, [onPersistedStateChange, reconciliation]);

  const favoriteIds = useMemo(
    () => new Set(reconciliation.matchedFavorites.map(({ icon }) => icon.id)),
    [reconciliation.matchedFavorites],
  );
  const favoriteIcons = useMemo(
    () => reconciliation.matchedFavorites.map(({ icon }) => icon),
    [reconciliation.matchedFavorites],
  );
  const recentIcons = useMemo(
    () => reconciliation.matchedRecentIcons.map(({ icon }) => icon),
    [reconciliation.matchedRecentIcons],
  );

  const results = useMemo(
    () => session.search(debouncedQuery, selectedCategory),
    [debouncedQuery, selectedCategory, session],
  );

  const autocompleteItems = useMemo<readonly SearchAutocompleteItem[]>(() => {
    const trimmed = query.trim();
    if (trimmed) {
      return session
        .search(query, selectedCategory)
        .filter(({ match }) => match !== "all")
        .slice(0, 8)
        .map(({ icon, match }) => ({ kind: "icon" as const, icon, match }));
    }

    return [
      ...persistedState.recentSearches.slice(0, 5).map((recentQuery) => ({
        kind: "recent-search" as const,
        query: recentQuery,
      })),
      ...favoriteIcons.slice(0, 5).map((icon) => ({
        kind: "favorite" as const,
        icon,
      })),
    ];
  }, [favoriteIcons, persistedState.recentSearches, query, selectedCategory, session]);

  const selectedCategoryPath = useMemo(
    () => findCategoryPath(categories, selectedCategory),
    [categories, selectedCategory],
  );

  const visibleIcons = useMemo(() => {
    if (workspaceView === "favorites") return favoriteIcons;
    if (workspaceView === "recent") return recentIcons;
    return results.map(({ icon }) => icon);
  }, [favoriteIcons, recentIcons, results, workspaceView]);

  useEffect(() => {
    return () => {
      if (copyNoticeTimeoutRef.current !== null) {
        window.clearTimeout(copyNoticeTimeoutRef.current);
      }
    };
  }, []);

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
      setAutocompleteOpen(true);
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

  const chooseReplacement = () => {
    setDropNotice(null);
    void choosePackageFile({ fallbackInput: replacementInputRef.current }).then(
      (file) => {
        if (file) onReplace(file);
      },
    );
  };

  const showAllIcons = () => {
    setWorkspaceView("all");
    setSelectedCategory(null);
  };

  const showFavorites = () => {
    setWorkspaceView("favorites");
    setSelectedCategory(null);
    setQuery("");
    setAutocompleteOpen(false);
  };

  const showRecent = () => {
    setWorkspaceView("recent");
    setSelectedCategory(null);
    setQuery("");
    setAutocompleteOpen(false);
  };

  const selectCategory = (categoryId: string | null) => {
    setWorkspaceView("all");
    setSelectedCategory(categoryId);
  };

  const toggleCategories = () => {
    if (preferences.sidebarCollapsed) {
      onPreferencesChange({ sidebarCollapsed: false });
      setCategoriesExpanded(true);
      return;
    }
    setCategoriesExpanded((current) => !current);
  };

  const clearSearch = () => {
    setWorkspaceView("all");
    setQuery("");
    setActiveAutocompleteIndex(-1);
    setAutocompleteOpen(true);
    searchRef.current?.focus();
  };

  const openDetails = (icon: IconEntry, trigger: HTMLElement | null) => {
    setDetailsTrigger(trigger);
    setSelectedIcon(icon);
    onPersistedStateChange((state) => recordRecentIcon(state, icon));
  };

  const toggleFavorite = (icon: IconEntry) => {
    onPersistedStateChange((state) =>
      favoriteIds.has(icon.id)
        ? removeFavorite(state, icon)
        : addFavorite(state, icon),
    );
  };

  const showCopyFeedback = useCallback(
    (next: { readonly kind: "success" | "error"; readonly message: string }) => {
      if (copyNoticeTimeoutRef.current !== null) {
        window.clearTimeout(copyNoticeTimeoutRef.current);
      }
      setCopyNotice(next);
      copyNoticeTimeoutRef.current = window.setTimeout(() => {
        setCopyNotice(null);
        copyNoticeTimeoutRef.current = null;
      }, 2600);
    },
    [],
  );

  const copyQuick = async (icon: IconEntry) => {
    try {
      await copyIconAsPng(session, icon);
      showCopyFeedback({
        kind: "success",
        message: `Copied ${icon.displayName} as a 512×512 PNG.`,
      });
    } catch (error) {
      showCopyFeedback({ kind: "error", message: clipboardErrorMessage(error) });
    }
  };

  const selectAutocompleteItem = (item: SearchAutocompleteItem) => {
    setActiveAutocompleteIndex(-1);
    setAutocompleteOpen(false);
    if (item.kind === "recent-search") {
      setWorkspaceView("all");
      setQuery(item.query);
      onPersistedStateChange((state) => recordRecentSearch(state, item.query));
      return;
    }

    if (query.trim()) {
      onPersistedStateChange((state) => recordRecentSearch(state, query));
    }
    openDetails(item.icon, searchRef.current);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (autocompleteItems.length === 0) return;
      event.preventDefault();
      setAutocompleteOpen(true);
      setActiveAutocompleteIndex((current) => {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const start = current < 0 ? (direction > 0 ? -1 : 0) : current;
        return (start + direction + autocompleteItems.length) % autocompleteItems.length;
      });
      return;
    }

    if (event.key === "Escape") {
      if (!autocompleteOpen) return;
      event.preventDefault();
      setAutocompleteOpen(false);
      setActiveAutocompleteIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      const active = autocompleteItems[activeAutocompleteIndex];
      if (autocompleteOpen && active) {
        event.preventDefault();
        selectAutocompleteItem(active);
        return;
      }
      if (query.trim()) {
        onPersistedStateChange((state) => recordRecentSearch(state, query));
        setAutocompleteOpen(false);
      }
    }
  };

  const statusText = `${visibleIcons.length} ${visibleIcons.length === 1 ? "icon" : "icons"}`;
  const emptyCollection =
    workspaceView === "favorites"
      ? {
          title: "No favorites yet",
          body: "Use the star on an icon card or in icon details to keep it here.",
        }
      : {
          title: "No recent icons yet",
          body: "Icons you open are kept here locally for quick access.",
        };

  return (
    <div className="min-h-svh bg-background">
      <input
        ref={replacementInputRef}
        type="file"
        accept={PACKAGE_ACCEPT}
        aria-label="Choose replacement icon package ZIP"
        className="sr-only"
        onChange={handleReplacementInput}
      />

      <DesktopSidebar
        categories={categories}
        totalIcons={summary.iconCount}
        filename={filename}
        categoryCount={summary.categoryCount}
        workspaceView={workspaceView}
        selectedCategory={selectedCategory}
        categoriesExpanded={categoriesExpanded}
        collapsed={preferences.sidebarCollapsed}
        theme={preferences.theme}
        loadPhase={loadPhase}
        onShowAll={showAllIcons}
        onShowFavorites={showFavorites}
        onShowRecent={showRecent}
        onSelectCategory={selectCategory}
        onToggleCategories={toggleCategories}
        onToggleCollapsed={() =>
          onPreferencesChange({
            sidebarCollapsed: !preferences.sidebarCollapsed,
          })
        }
        onThemeChange={(theme) => onPreferencesChange({ theme })}
        onChangePackage={chooseReplacement}
      />

      <div
        className={`min-w-0 transition-[padding] duration-200 ${preferences.sidebarCollapsed ? "lg:pl-[4.5rem]" : "lg:pl-72"}`}
      >
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:px-4 lg:px-5">
            <Button
              ref={navigationButtonRef}
              type="button"
              variant="outline"
              size="icon-lg"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setNavigationSheetOpen(true)}
            >
              <MenuIcon aria-hidden="true" />
            </Button>

            <div className="relative min-w-0 flex-1">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                aria-label="Search icons"
                aria-autocomplete="list"
                aria-expanded={autocompleteOpen && autocompleteItems.length > 0}
                aria-controls={
                  autocompleteItems.length > 0 ? searchListboxId : undefined
                }
                aria-activedescendant={
                  autocompleteOpen && activeAutocompleteIndex >= 0
                    ? `${searchListboxId}-option-${activeAutocompleteIndex}`
                    : undefined
                }
                placeholder="Search icons by name, filename, or category"
                className="h-11 w-full rounded-2xl border border-input bg-card pl-10 pr-16 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                onFocus={() => {
                  setAutocompleteOpen(true);
                  setActiveAutocompleteIndex(-1);
                }}
                onBlur={() => setAutocompleteOpen(false)}
                onKeyDown={handleSearchKeyDown}
                onChange={(event) => {
                  setWorkspaceView("all");
                  setQuery(event.currentTarget.value);
                  setActiveAutocompleteIndex(-1);
                  setAutocompleteOpen(true);
                }}
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                  onClick={clearSearch}
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                  /
                </kbd>
              )}
              <SearchAutocomplete
                id={searchListboxId}
                open={autocompleteOpen}
                session={session}
                items={autocompleteItems}
                activeIndex={activeAutocompleteIndex}
                onSelect={selectAutocompleteItem}
              />
            </div>

            <span
              role="status"
              aria-live="polite"
              className="hidden shrink-0 text-xs text-muted-foreground sm:inline"
            >
              {statusText}
            </span>

            <fieldset className="flex shrink-0 items-center rounded-xl border border-border bg-card p-1">
              <legend className="sr-only">Icon view</legend>
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={preferences.view === "grid"}
                title="Grid view"
                className={`flex size-8 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ${preferences.view === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                onClick={() => onPreferencesChange({ view: "grid" })}
              >
                <LayoutGridIcon aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Compact view"
                aria-pressed={preferences.view === "compact"}
                title="Compact view"
                className={`flex size-8 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ${preferences.view === "compact" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                onClick={() => onPreferencesChange({ view: "compact" })}
              >
                <Rows3Icon aria-hidden="true" className="size-4" />
              </button>
            </fieldset>
          </div>

          {selectedCategory && selectedCategoryPath ? (
            <div className="flex items-center gap-2 border-t border-border/70 px-3 py-2 sm:px-4 lg:px-5">
              <span className="text-xs text-muted-foreground">Active filter</span>
              <button
                type="button"
                aria-label={`Remove category filter ${selectedCategoryPath}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => setSelectedCategory(null)}
              >
                <span className="truncate">Category: {selectedCategoryPath}</span>
                <XIcon aria-hidden="true" className="size-3" />
              </button>
            </div>
          ) : null}
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

          {visibleIcons.length ? (
            <section
              aria-label={
                workspaceView === "all"
                  ? "Icon results"
                  : workspaceView === "favorites"
                    ? "Favorite icons"
                    : "Recent icons"
              }
            >
              <div
                className={
                  preferences.view === "grid"
                    ? "grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3"
                    : "grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2"
                }
              >
                {visibleIcons.map((icon) => (
                  <IconCard
                    key={icon.id}
                    session={session}
                    icon={icon}
                    view={preferences.view}
                    favorite={favoriteIds.has(icon.id)}
                    onOpen={(trigger) => openDetails(icon, trigger)}
                    onToggleFavorite={() => toggleFavorite(icon)}
                    onCopy={() => void copyQuick(icon)}
                  />
                ))}
              </div>
            </section>
          ) : workspaceView === "all" ? (
            <EmptyResults
              query={query}
              selectedCategory={selectedCategory}
              onClearSearch={clearSearch}
              onSearchAll={showAllIcons}
            />
          ) : (
            <EmptyCollection
              icon={workspaceView === "favorites" ? "favorites" : "recent"}
              title={emptyCollection.title}
              body={emptyCollection.body}
            />
          )}
        </main>
      </div>

      <NavigationSheet
        open={navigationSheetOpen}
        trigger={navigationButtonRef.current}
        categories={categories}
        totalIcons={summary.iconCount}
        filename={filename}
        categoryCount={summary.categoryCount}
        workspaceView={workspaceView}
        selectedCategory={selectedCategory}
        theme={preferences.theme}
        loadPhase={loadPhase}
        onShowAll={showAllIcons}
        onShowFavorites={showFavorites}
        onShowRecent={showRecent}
        onSelectCategory={selectCategory}
        onThemeChange={(theme) => onPreferencesChange({ theme })}
        onChangePackage={chooseReplacement}
        onRequestClose={() => setNavigationSheetOpen(false)}
      />

      <IconDetailsDialog
        session={session}
        icon={selectedIcon}
        restoreFocusTo={detailsTrigger}
        favorite={selectedIcon ? favoriteIds.has(selectedIcon.id) : false}
        onToggleFavorite={() => {
          if (selectedIcon) toggleFavorite(selectedIcon);
        }}
        onClose={() => setSelectedIcon(null)}
      />

      {copyNotice ? (
        <div
          role={copyNotice.kind === "error" ? "alert" : "status"}
          className={`fixed bottom-4 left-4 right-4 z-[70] rounded-xl border px-3 py-2 text-sm shadow-lg sm:left-auto sm:max-w-sm ${copyNotice.kind === "error" ? "border-destructive/30 bg-card text-destructive" : "border-border bg-popover text-popover-foreground"}`}
        >
          {copyNotice.message}
        </div>
      ) : null}
    </div>
  );
}

'''
replace_between(
    "interface LoadedWorkspaceProps {",
    "interface DesktopSidebarProps {",
    loaded_workspace,
)

empty_collection = r'''function EmptyCollection({
  icon,
  title,
  body,
}: {
  icon: "favorites" | "recent";
  title: string;
  body: string;
}) {
  const Icon = icon === "favorites" ? StarIcon : Clock3Icon;
  return (
    <section className="mx-auto mt-12 max-w-md rounded-2xl border border-border bg-card p-6 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </section>
  );
}

'''
replace_between(
    "function WorkspacePlaceholder(",
    "interface EmptyResultsProps {",
    empty_collection,
)

helper_marker = "function PackageErrorNotice({"
category_helper = r'''function findCategoryPath(
  categories: readonly IconCategory[],
  categoryId: string | null,
): string | null {
  if (!categoryId) return null;
  const pending = [...categories];
  while (pending.length) {
    const category = pending.shift();
    if (!category) continue;
    if (category.id === categoryId) return category.path;
    pending.push(...category.children);
  }
  return null;
}

'''
if helper_marker not in text:
    raise SystemExit("PackageErrorNotice marker not found")
text = text.replace(helper_marker, category_helper + helper_marker, 1)

replace_once(
    "function persistStateQuietly(\n  state: ReturnType<typeof createDefaultPersistedState>,\n): void {",
    "function persistStateQuietly(state: PersistedState): void {",
)

path.write_text(text)
