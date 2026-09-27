import type { ProSquadSortDirection } from "../../squad/pro-roster.ts";

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
      className={align === "left" ? "squad-col-name" : undefined}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className={`squad-sort-header${active ? " is-active" : ""}${align === "left" ? " is-left" : ""}`}
        title={title}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSort(sortKey);
        }}
      >
        <span>{label}</span>
        <span className="squad-sort-icons" aria-hidden="true">
          <span className={active && direction === "asc" ? "is-active" : ""}>▲</span>
          <span className={active && direction === "desc" ? "is-active" : ""}>▼</span>
        </span>
      </button>
    </th>
  );
}
