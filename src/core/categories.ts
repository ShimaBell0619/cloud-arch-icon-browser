import { compareNames } from "./names";
import type { IconCategory, IconEntry } from "./types";

export function findCommonRoot(paths: readonly string[]): string | null {
  const first = paths[0];
  if (!first?.includes("/")) return null;
  const root = first.slice(0, first.indexOf("/"));
  return paths.every((path) => path.startsWith(`${root}/`)) ? root : null;
}

export function buildCategories(
  icons: readonly IconEntry[],
  hiddenRoot: string | null,
): { categories: readonly IconCategory[]; categoryCount: number } {
  interface MutableCategory {
    id: string;
    name: string;
    path: string;
    children: MutableCategory[];
    iconCount: number;
  }
  const roots: MutableCategory[] = [];
  const nodes = new Map<string, MutableCategory>();
  for (const icon of icons) {
    const segments = icon.categoryPath ? icon.categoryPath.split("/") : [];
    let parent: MutableCategory | undefined;
    let path = "";
    for (const name of segments) {
      path = path ? `${path}/${name}` : name;
      const id = hiddenRoot === null ? path : `${hiddenRoot}/${path}`;
      let node = nodes.get(id);
      if (!node) {
        node = { id, name, path, children: [], iconCount: 0 };
        nodes.set(id, node);
        (parent ? parent.children : roots).push(node);
      }
      node.iconCount++;
      parent = node;
    }
  }
  // Build and freeze iteratively so arbitrary nesting does not use the call stack.
  for (const node of nodes.values()) {
    node.children.sort((a, b) => compareNames(a.name, b.name));
    Object.freeze(node.children);
    Object.freeze(node);
  }
  roots.sort((a, b) => compareNames(a.name, b.name));
  return { categories: Object.freeze(roots), categoryCount: nodes.size };
}
