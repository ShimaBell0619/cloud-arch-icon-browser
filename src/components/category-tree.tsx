import { ChevronRightIcon, FolderIcon, Layers3Icon } from "lucide-react";
import { useId, useState } from "react";
import type { IconCategory } from "@/core";

interface CategoryTreeProps {
  categories: readonly IconCategory[];
  totalIcons: number;
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
  showAll?: boolean;
}

export function CategoryTree({
  categories,
  totalIcons,
  selectedCategory,
  onSelect,
  showAll = true,
}: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav aria-label="Icon categories" className="min-w-0">
      <ul className="space-y-1">
        {showAll ? (
          <li>
            <button
              type="button"
              aria-label={`All, ${formatIconCount(totalIcons)}`}
              aria-current={selectedCategory === null ? "page" : undefined}
              className={categoryButtonClass(selectedCategory === null)}
              onClick={() => onSelect(null)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Layers3Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">All</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {totalIcons}
              </span>
            </button>
          </li>
        ) : null}
        {categories.map((category) => (
          <CategoryNode
            key={category.id}
            category={category}
            expanded={expanded}
            selectedCategory={selectedCategory}
            onToggle={toggle}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </nav>
  );
}

interface CategoryNodeProps {
  category: IconCategory;
  expanded: ReadonlySet<string>;
  selectedCategory: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function CategoryNode({
  category,
  expanded,
  selectedCategory,
  onToggle,
  onSelect,
}: CategoryNodeProps) {
  const childrenId = useId();
  const hasChildren = category.children.length > 0;
  const isExpanded = expanded.has(category.id);
  const isSelected = selectedCategory === category.id;

  return (
    <li>
      <div className="flex min-w-0 items-center gap-0.5">
        {hasChildren ? (
          <button
            type="button"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${category.name}`}
            aria-expanded={isExpanded}
            aria-controls={childrenId}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={() => onToggle(category.id)}
          >
            <ChevronRightIcon
              aria-hidden="true"
              className={`size-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span aria-hidden="true" className="size-7 shrink-0" />
        )}
        <button
          type="button"
          aria-label={`${category.name}, ${formatIconCount(category.iconCount)}`}
          aria-current={isSelected ? "page" : undefined}
          className={`${categoryButtonClass(isSelected)} min-w-0 flex-1`}
          onClick={() => onSelect(category.id)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <FolderIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate" title={category.path}>
              {category.name}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {category.iconCount}
          </span>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <ul id={childrenId} className="mt-1 space-y-1 pl-3">
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              expanded={expanded}
              selectedCategory={selectedCategory}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function categoryButtonClass(selected: boolean): string {
  return [
    "flex h-8 w-full items-center justify-between gap-3 rounded-xl px-2.5 text-left text-sm outline-none transition-colors",
    "focus-visible:ring-3 focus-visible:ring-ring/30",
    selected
      ? "bg-accent font-medium text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  ].join(" ");
}

function formatIconCount(count: number): string {
  return `${count} ${count === 1 ? "icon" : "icons"}`;
}
