const DEFAULT_CONCURRENCY = 6;
const PREFETCH_ROOT_MARGIN = "900px 0px";

type PreviewTask<T> = () => Promise<T>;

type QueuedTask<T> = {
  readonly priority: number;
  readonly sequence: number;
  readonly run: PreviewTask<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
};

export class PreviewWorkQueue {
  readonly #concurrency: number;
  #active = 0;
  #sequence = 0;
  readonly #queue: QueuedTask<unknown>[] = [];

  constructor(concurrency = DEFAULT_CONCURRENCY) {
    if (!Number.isInteger(concurrency) || concurrency <= 0) {
      throw new Error("Preview concurrency must be a positive integer.");
    }
    this.#concurrency = concurrency;
  }

  schedule<T>(run: PreviewTask<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.#queue.push({
        priority,
        sequence: this.#sequence++,
        run,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.#queue.sort(
        (left, right) =>
          left.priority - right.priority || left.sequence - right.sequence,
      );
      this.#pump();
    });
  }

  #pump(): void {
    while (this.#active < this.#concurrency) {
      const next = this.#queue.shift();
      if (!next) return;
      this.#active += 1;
      void next
        .run()
        .then(next.resolve, next.reject)
        .finally(() => {
          this.#active -= 1;
          this.#pump();
        });
    }
  }
}

const sharedPreviewQueue = new PreviewWorkQueue();

type PreviewObserverCallback = (priority: number) => void;
const previewObserverCallbacks = new Map<Element, PreviewObserverCallback>();
let sharedPreviewObserver: IntersectionObserver | null = null;

export function schedulePreviewWork<T>(
  run: PreviewTask<T>,
  priority = 0,
): Promise<T> {
  return sharedPreviewQueue.schedule(run, priority);
}

export function observePreviewHost(
  element: Element,
  callback: PreviewObserverCallback,
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    callback(0);
    return () => undefined;
  }

  const observer = getSharedPreviewObserver();
  previewObserverCallbacks.set(element, callback);
  observer.observe(element);

  return () => {
    previewObserverCallbacks.delete(element);
    observer.unobserve(element);
  };
}

function getSharedPreviewObserver(): IntersectionObserver {
  sharedPreviewObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = previewObserverCallbacks.get(entry.target);
        if (!callback) continue;
        previewObserverCallbacks.delete(entry.target);
        sharedPreviewObserver?.unobserve(entry.target);
        callback(previewPriority(entry.boundingClientRect));
      }
    },
    { rootMargin: PREFETCH_ROOT_MARGIN },
  );
  return sharedPreviewObserver;
}

function previewPriority(rect: DOMRectReadOnly): number {
  if (typeof window === "undefined") return 0;
  const viewportHeight = window.innerHeight;
  if (rect.bottom >= 0 && rect.top <= viewportHeight) return 0;
  if (rect.top > viewportHeight) return rect.top - viewportHeight;
  return -rect.bottom;
}
