import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IconCard } from "@/components/icon-card";
import type { IconEntry, IconPackageSession } from "@/core";

vi.mock("@/components/lazy-icon-preview", () => ({
  LazyIconPreview: () => <span data-testid="preview" />,
}));

const icon = {
  id: "machine-learning-workspace",
  displayName: "Machine Learning Workspace",
  categoryPath: "AI + Machine Learning",
  originalFilename: "machine-learning-workspace.svg",
} as IconEntry;

const session = {} as IconPackageSession;

let resizeCallback: ResizeObserverCallback;

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderCompactCard() {
  return render(
    <IconCard
      session={session}
      icon={icon}
      view="compact"
      favorite={false}
      onOpen={vi.fn()}
      onToggleFavorite={vi.fn()}
      onCopy={vi.fn()}
      onAddToTray={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("IconCard compact layout", () => {
  it("does not reserve the old three-action width", () => {
    renderCompactCard();

    const openButton = screen.getByRole("button", {
      name: /Open Machine Learning Workspace details/,
    });
    expect(openButton).toHaveClass("compact-card-main");
    expect(openButton).not.toHaveClass("pr-32");

    expect(
      screen.getByRole("button", {
        name: "Add Machine Learning Workspace to favorites",
      }),
    ).toHaveClass("compact-card-secondary-action");
    expect(
      screen.getByRole("button", {
        name: "Add Machine Learning Workspace to Tray",
      }),
    ).toHaveClass("compact-card-secondary-action");
    expect(
      screen.getByRole("button", {
        name: "Copy Machine Learning Workspace image",
      }),
    ).not.toHaveClass("compact-card-secondary-action");
  });

  it("shows a tooltip only while the compact title is truncated", () => {
    renderCompactCard();

    const title = screen.getByText(icon.displayName);
    Object.defineProperty(title, "scrollWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(title, "clientWidth", {
      configurable: true,
      value: 120,
    });

    act(() => {
      resizeCallback([], {} as ResizeObserver);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent(icon.displayName);
    expect(
      screen.getByRole("button", {
        name: /Open Machine Learning Workspace details/,
      }),
    ).toHaveAttribute("aria-describedby");

    Object.defineProperty(title, "scrollWidth", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(title, "clientWidth", {
      configurable: true,
      value: 120,
    });

    act(() => {
      resizeCallback([], {} as ResizeObserver);
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
