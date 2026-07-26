"use client";

import { useMemo, useState } from "react";

import { ProjectList, type ProjectListItem } from "@/components/projects/ProjectList";

export function ProjectIndex({
  items,
  stacks,
}: {
  items: ProjectListItem[];
  stacks: string[];
}) {
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filter
        ? items.filter((item) =>
            item.stack
              .split(",")
              .map((s) => s.trim())
              .includes(filter)
          )
        : items,
    [items, filter]
  );

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-2 pb-8">
        <FilterChip active={filter === null} onClick={() => setFilter(null)}>
          All ({items.length})
        </FilterChip>

        {stacks.map((stack) => (
          <FilterChip
            key={stack}
            active={filter === stack}
            onClick={() => setFilter(filter === stack ? null : stack)}
          >
            {stack}
          </FilterChip>
        ))}
      </div>

      <ProjectList items={filtered} />
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`label rounded-full border px-3 py-1.5 transition-colors duration-300 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule text-faint hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
