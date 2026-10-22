import type { ProSquadSortDirection } from "../../squad/pro-roster.ts";

/** Sortable column header on tc-sort (design.md §4.3): one arrow on the sorted column, aria-sort for screen readers. */
export function SquadSortHeader<K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "right",
  title,
}: {
  label: string;
  sortKey: K;
  activeKey: K;
  direction: ProSquadSortDirection;
  onSort: (key: K) => void;
  align?: "left" | "right";
  title?: string;
}) {
  const active = sortKey === activeKey;
  return (
    <th
      scope="col"
      className={align === "left" ? "squad-col-name" : "tc-num"}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        className="tc-sort"
        title={title}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSort(sortKey);
        }}
      >
        {label}
        {active ? (
          <svg className="tc-sort__arrow" viewBox="0 0 10 10" aria-hidden="true">
            <path d={direction === "desc" ? "M1 3h8L5 8z" : "M1 7h8L5 2z"} />
          </svg>
        ) : null}
      </button>
    </th>
  );
}
