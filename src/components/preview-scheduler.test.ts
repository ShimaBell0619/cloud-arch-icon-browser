import { describe, expect, it, vi } from "vitest";
import { PreviewWorkQueue } from "./preview-scheduler";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("PreviewWorkQueue", () => {
  it("bounds concurrent preview work", async () => {
    const queue = new PreviewWorkQueue(2);
    const first = deferred<string>();
    const second = deferred<string>();
    const third = vi.fn(async () => "third");

    const firstResult = queue.schedule(() => first.promise);
    const secondResult = queue.schedule(() => second.promise);
    const thirdResult = queue.schedule(third);

    await Promise.resolve();
    expect(third).not.toHaveBeenCalled();

    first.resolve("first");
    await expect(firstResult).resolves.toBe("first");
    await Promise.resolve();
    expect(third).toHaveBeenCalledTimes(1);

    second.resolve("second");
    await expect(secondResult).resolves.toBe("second");
    await expect(thirdResult).resolves.toBe("third");
  });

  it("runs nearer queued previews before farther ones", async () => {
    const queue = new PreviewWorkQueue(1);
    const blocker = deferred<void>();
    const order: string[] = [];

    const blockingResult = queue.schedule(() => blocker.promise);
    const far = queue.schedule(async () => {
      order.push("far");
      return "far";
    }, 900);
    const visible = queue.schedule(async () => {
      order.push("visible");
      return "visible";
    }, 0);

    blocker.resolve();
    await blockingResult;
    await Promise.all([far, visible]);

    expect(order).toEqual(["visible", "far"]);
  });

  it("rejects invalid concurrency", () => {
    expect(() => new PreviewWorkQueue(0)).toThrow(
      "Preview concurrency must be a positive integer.",
    );
  });
});
