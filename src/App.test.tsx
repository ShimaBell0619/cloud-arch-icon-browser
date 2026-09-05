import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "@/App";

describe("development shell", () => {
  it("identifies the app and explains that icons are not bundled", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Cloud Arch Icon Browser",
      }),
    ).toBeVisible();
    expect(screen.getByText(/Icons are not included/)).toBeVisible();
    expect(screen.getByText(/Not affiliated with/)).toBeVisible();
  });

  it("offers a keyboard-focusable manual link through the Base UI primitive", async () => {
    const user = userEvent.setup();
    render(<App />);
    const link = screen.getByRole("link", {
      name: /Get official icons/,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://learn.microsoft.com/en-us/azure/architecture/icons/",
    );
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await user.tab();
    expect(link).toHaveFocus();
  });
});
