import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import {
  type IconCategory,
  type IconEntry,
  IconPackageSession,
  IconSearchIndex,
  type PackageMetadata,
  type PackageProblem,
  PERSISTENCE_KEY,
} from "@/core";

const icons: readonly IconEntry[] = [
  {
    id: "Root/Compute/1-icon-service-App-Service.svg",
    originalPath: "Root/Compute/1-icon-service-App-Service.svg",
    originalFilename: "1-icon-service-App-Service.svg",
    displayName: "App Service",
    matchesNamingConvention: true,
    categoryId: "Root/Compute",
    categoryPath: "Compute",
    uncompressedSize: 128,
  },
  {
    id: "Root/Compute/Databases/2-icon-service-SQL.svg",
    originalPath: "Root/Compute/Databases/2-icon-service-SQL.svg",
    originalFilename: "2-icon-service-SQL.svg",
    displayName: "SQL",
    matchesNamingConvention: true,
    categoryId: "Root/Compute/Databases",
    categoryPath: "Compute/Databases",
    uncompressedSize: 128,
  },
  {
    id: "Root/Storage/3-icon-service-Blob-Storage.svg",
    originalPath: "Root/Storage/3-icon-service-Blob-Storage.svg",
    originalFilename: "3-icon-service-Blob-Storage.svg",
    displayName: "Blob Storage",
    matchesNamingConvention: true,
    categoryId: "Root/Storage",
    categoryPath: "Storage",
    uncompressedSize: 128,
  },
];

const categories: readonly IconCategory[] = [
  {
    id: "Root/Compute",
    name: "Compute",
    path: "Compute",
    iconCount: 2,
    children: [
      {
        id: "Root/Compute/Databases",
        name: "Databases",
        path: "Compute/Databases",
        iconCount: 1,
        children: [],
      },
    ],
  },
  {
    id: "Root/Storage",
    name: "Storage",
    path: "Storage",
    iconCount: 1,
    children: [],
  },
];

const metadata: PackageMetadata = {
  icons,
  categories,
  summary: {
    entryCount: 3,
    iconCount: 3,
    categoryCount: 3,
    namingConventionMatches: 3,
    hiddenRoot: "Root",
  },
};

function createFakeSession(options: { throwOnSearch?: boolean } = {}) {
  const index = new IconSearchIndex(icons);
  const session: IconPackageSession = Object.create(
    IconPackageSession.prototype,
  );
  const dispose = vi.fn(async () => undefined);
  const getPreviewUrl = vi.fn(async (id: string) => `blob:preview-${id}`);
  const getDownload = vi.fn(async (id: string) => {
    const icon = icons.find((candidate) => candidate.id === id);
    if (!icon) throw new Error("Unknown icon");
    return { filename: icon.originalFilename, url: `blob:download-${id}` };
  });
  const search = vi.fn((query: string, categoryId: string | null = null) => {
    if (options.throwOnSearch) throw new Error("render failure");
    return index.search(query, categoryId);
  });

  Object.defineProperties(session, {
    metadata: { configurable: true, get: () => metadata },
    dispose: { configurable: true, value: dispose },
    getPreviewUrl: { configurable: true, value: getPreviewUrl },
    getDownload: { configurable: true, value: getDownload },
    search: { configurable: true, value: search },
  });

  return { session, dispose, getDownload, getPreviewUrl, search };
}

function installPackageOpenMock(options: { throwOnSearch?: boolean } = {}) {
  const active = createFakeSession(options);
  const invalid: PackageProblem = {
    code: "INVALID_ZIP",
    phase: "validation",
    message: "The ZIP is corrupt.",
    action: "Choose another icon ZIP.",
  };
  const open = vi
    .spyOn(IconPackageSession, "open")
    .mockImplementation(async (blob) => {
      if (blob instanceof File && blob.name === "bad.zip") {
        return { ok: false, error: invalid };
      }
      return { ok: true, session: active.session };
    });
  return { ...active, open };
}

async function loadDummyPackage(user: ReturnType<typeof userEvent.setup>) {
  const file = new File(["dummy"], "dummy-icons.zip", {
    type: "application/zip",
  });
  await user.upload(screen.getByLabelText("Choose icon package ZIP"), file);
  await screen.findByRole("searchbox", { name: "Search icons" });
}

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty("color-scheme");
});

describe("icon browser UI", () => {
  it("starts with a focused local package picker and manual Microsoft link", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Cloud Arch Icon Browser",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Choose ZIP" })).toBeVisible();
    expect(
      screen.getByText(/processed locally for this session only/i),
    ).toBeVisible();

    const link = screen.getByRole("link", { name: /Get official icons/ });
    expect(link).toHaveAttribute(
      "href",
      "https://learn.microsoft.com/en-us/azure/architecture/icons/",
    );
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("loads a package under React StrictMode without getting stuck in Reading", async () => {
    const user = userEvent.setup();
    const { open } = installPackageOpenMock();
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await loadDummyPackage(user);

    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Reading package")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open App Service details, Compute" }),
    ).toBeVisible();
  });

  it("exposes workspace destinations with empty Favorites and Recent states", async () => {
    const user = userEvent.setup();
    installPackageOpenMock();
    render(<App />);
    await loadDummyPackage(user);

    const navigation = screen.getByRole("navigation", { name: "Workspace" });
    expect(
      within(navigation).getByRole("button", { name: "All icons" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByRole("button", { name: "Favorites" }),
    ).toBeVisible();
    expect(
      within(navigation).getByRole("button", { name: "Recent" }),
    ).toBeVisible();
    expect(
      within(navigation).getByRole("button", { name: "Categories" }),
    ).toBeVisible();

    await user.click(
      within(navigation).getByRole("button", { name: "Favorites" }),
    );
    expect(
      await screen.findByRole("heading", { name: "No favorites yet" }),
    ).toBeVisible();
    expect(
      within(navigation).getByRole("button", { name: "Favorites" }),
    ).toHaveAttribute("aria-current", "page");

    await user.click(
      within(navigation).getByRole("button", { name: "Recent" }),
    );
    expect(
      await screen.findByRole("heading", { name: "No recent icons yet" }),
    ).toBeVisible();

    await user.click(
      within(navigation).getByRole("button", { name: "All icons" }),
    );
    expect(
      await screen.findByRole("button", {
        name: "Open App Service details, Compute",
      }),
    ).toBeVisible();
  });

  it("persists sidebar collapse and explicit theme preferences", async () => {
    const user = userEvent.setup();
    installPackageOpenMock();
    render(<App />);
    await loadDummyPackage(user);

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");

    const stored = JSON.parse(
      window.localStorage.getItem(PERSISTENCE_KEY) ?? "null",
    ) as {
      preferences?: { sidebarCollapsed?: boolean; theme?: string };
    } | null;
    expect(stored?.preferences).toMatchObject({
      sidebarCollapsed: true,
      theme: "dark",
    });

    await user.click(screen.getByRole("button", { name: "Light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("browses recursive categories and preserves the query when scope changes", async () => {
    const user = userEvent.setup();
    installPackageOpenMock();
    render(<App />);
    await loadDummyPackage(user);

    expect(
      screen.getByRole("button", { name: "Open App Service details, Compute" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Open SQL details, Compute/Databases",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Open Blob Storage details, Storage",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "All icons" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("button", { name: /^Databases/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand Compute" }));
    expect(screen.getByRole("button", { name: /^Databases/ })).toBeVisible();

    const search = screen.getByRole("searchbox", { name: "Search icons" });
    await user.type(search, "blob");
    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: "Open App Service details, Compute",
        }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", {
        name: "Open Blob Storage details, Storage",
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^Compute/ }));
    expect(search).toHaveValue("blob");
    expect(
      await screen.findByRole("heading", { name: "No icons found" }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Search all categories" }),
    );
    expect(
      await screen.findByRole("button", {
        name: "Open Blob Storage details, Storage",
      }),
    ).toBeVisible();
  });

  it("supports the slash shortcut and keeps search focus when clearing", async () => {
    const user = userEvent.setup();
    installPackageOpenMock();
    render(<App />);
    await loadDummyPackage(user);

    const card = screen.getByRole("button", {
      name: "Open App Service details, Compute",
    });
    const search = screen.getByRole("searchbox", { name: "Search icons" });
    card.focus();
    await user.keyboard("/");
    expect(search).toHaveFocus();

    await user.type(search, "sql");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
  });

  it("opens details from a card, handles Escape, restores focus, and downloads through the session", async () => {
    const user = userEvent.setup();
    const { getDownload } = installPackageOpenMock();
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<App />);
    await loadDummyPackage(user);

    const card = screen.getByRole("button", {
      name: "Open App Service details, Compute",
    });
    await user.click(card);
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByText("1-icon-service-App-Service.svg")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Download SVG" }));
    await waitFor(() => expect(getDownload).toHaveBeenCalledWith(icons[0]?.id));
    expect(anchorClick).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(card).toHaveFocus());
  });

  it("preserves the active package when an explicit replacement is invalid", async () => {
    const user = userEvent.setup();
    const { dispose } = installPackageOpenMock();
    render(<App />);
    await loadDummyPackage(user);

    const invalid = new File(["bad"], "bad.zip", { type: "application/zip" });
    await user.upload(
      screen.getByLabelText("Choose replacement icon package ZIP"),
      invalid,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The ZIP is corrupt.",
    );
    expect(
      screen.getByRole("button", { name: "Open App Service details, Compute" }),
    ).toBeVisible();
    expect(screen.getAllByText("dummy-icons.zip").length).toBeGreaterThan(0);
    expect(dispose).not.toHaveBeenCalled();
  });

  it("does not silently replace a loaded package on global drop", async () => {
    const user = userEvent.setup();
    const { open } = installPackageOpenMock();
    render(<App />);
    await loadDummyPackage(user);

    fireEvent.drop(screen.getByRole("main"), {
      dataTransfer: {
        files: [new File(["other"], "other.zip", { type: "application/zip" })],
        types: ["Files"],
      },
    });

    expect(
      screen.getByText(
        "A package is already loaded. Use Change package to replace it.",
      ),
    ).toBeVisible();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("disposes the active session when the error boundary resets the workspace", async () => {
    const user = userEvent.setup();
    const { dispose } = installPackageOpenMock({ throwOnSearch: true });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<App />);
    await loadDummyPackage(user).catch(() => undefined);

    expect(
      await screen.findByRole("heading", {
        name: "The workspace needs to be reset",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reset workspace" }));

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("button", { name: "Choose ZIP" }),
    ).toBeVisible();
  });
});
