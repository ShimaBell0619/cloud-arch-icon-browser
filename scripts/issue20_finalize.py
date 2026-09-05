from pathlib import Path

app = Path("src/App.tsx")
text = app.read_text()
text = text.replace(
    "  expanded?: boolean;\n  trailing?: ReactNode;",
    "  expanded?: boolean | undefined;\n  trailing?: ReactNode | undefined;",
)
text = text.replace(
    '''      <div
        role="group"
        aria-label="Theme"
        className={compact ? "space-y-1" : "grid grid-cols-3 gap-1"}
      >''',
    '''      <fieldset
        className={compact ? "space-y-1" : "grid grid-cols-3 gap-1"}
      >
        <legend className="sr-only">Theme</legend>''',
)
text = text.replace("      </div>\n    </div>\n  );\n}\n\nfunction WorkspacePlaceholder", "      </fieldset>\n    </div>\n  );\n}\n\nfunction WorkspacePlaceholder")
app.write_text(text)

design = Path("DESIGN.md")
text = design.read_text()
old = """### 8.6 Loaded layout

Desktop:

- fixed-width left category sidebar,
- sticky search/action toolbar,
- responsive icon grid.

Narrow viewport:

- category navigation becomes a Drawer/Sheet,
- grid adapts without horizontal breakage,
- dialogs fit within the viewport.

Toolbar priority:

1. search,
2. result count,
3. `Change package`.

Loaded ZIP filename/icon count/category count are useful but visually secondary.

### 8.7 Category tree

- Single category selection.
- `All` selected by default after successful load.
- Top-level folders visible initially.
- Child folders collapsed initially.
- Sibling folders alphabetical.
- Clicking category label selects it.
- Chevron controls expand/collapse.

The main icon grid remains flat; it is not grouped by category.
"""
new = """### 8.6 Loaded layout

Desktop:

- fixed left workspace sidebar with top-level `All icons`, `Favorites`, `Recent`, and `Categories` destinations,
- sidebar expanded by default and collapsible to a compact icon rail; the collapsed preference persists through the approved UI persistence layer,
- categories expand inside the full sidebar; selecting a category scopes the icon results,
- sticky search-first toolbar,
- responsive icon grid.

`Favorites` and `Recent` may exist as navigation placeholders until their data experience is connected by the dedicated v0.2.0 feature work. Do not duplicate or prematurely render their persistence model in the navigation issue.

Narrow viewport:

- the desktop sidebar/rail is replaced by a navigation Drawer/Sheet,
- the sheet contains the top-level destinations, category tree, secondary package controls, and theme control,
- grid adapts without horizontal breakage,
- dialogs fit within the viewport.

Search remains the dominant workspace control. Result count remains nearby supporting information. Loaded ZIP filename/icon count/category count and `Change package` remain visually secondary in navigation surfaces rather than competing with search.

Theme behavior:

- users can explicitly choose `System`, `Light`, or `Dark`,
- the preference persists through the approved UI persistence layer,
- `System` follows the operating-system color-scheme preference and reacts to changes while the app is open,
- only the preference is persisted; the resolved light/dark value is runtime UI state.

### 8.7 Category tree

- Single category selection.
- The top-level `All icons` workspace destination is selected by default after successful load.
- Top-level folders visible initially when `Categories` is expanded.
- Child folders collapsed initially.
- Sibling folders alphabetical.
- Clicking category label selects it and returns the workspace to icon results scoped to that category.
- Chevron controls expand/collapse.
- The workspace navigation owns the global `All icons` destination; category-tree instances may omit their legacy `All` row to avoid duplicate navigation.

The main icon grid remains flat; it is not grouped by category.
"""
if old not in text:
    raise SystemExit("DESIGN loaded-layout block not found")
design.write_text(text.replace(old, new))

golden = Path("tests/e2e/golden-path.spec.mjs")
text = golden.read_text()
marker = '''test("key screens have no automatically detectable WCAG A/AA violations", async ({
  page,
}) => {'''
addition = '''test("workspace navigation preferences survive reload without reopening the package", async ({
  page,
}) => {
  await loadPackage(page);

  const navigation = page.getByRole("navigation", { name: "Workspace" });
  await expect(
    navigation.getByRole("button", { name: "All icons" }),
  ).toHaveAttribute("aria-current", "page");

  await navigation.getByRole("button", { name: "Favorites" }).click();
  await expect(page.getByRole("heading", { name: "Favorites" })).toBeVisible();
  await navigation.getByRole("button", { name: "Recent" }).click();
  await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
  await navigation.getByRole("button", { name: "All icons" }).click();

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const preferences = await page.evaluate(() => {
    const raw = localStorage.getItem("cloud-arch-icon-browser:state");
    return raw ? JSON.parse(raw).preferences : null;
  });
  expect(preferences).toMatchObject({ sidebarCollapsed: true, theme: "dark" });

  await page.reload();
  await expect(page.getByRole("button", { name: "Choose ZIP" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await page.getByRole("searchbox", { name: "Search icons" }).waitFor();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
});

'''
if marker not in text:
    raise SystemExit("golden-path insertion marker not found")
if addition not in text:
    golden.write_text(text.replace(marker, addition + marker))
