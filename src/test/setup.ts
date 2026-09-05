import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

let objectUrlSequence = 0;

Object.defineProperty(URL, "createObjectURL", {
  configurable: true,
  value: () => `blob:test-preview-${++objectUrlSequence}`,
});
Object.defineProperty(URL, "revokeObjectURL", {
  configurable: true,
  value: () => undefined,
});

if (typeof HTMLDialogElement !== "undefined") {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.open) return;
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
