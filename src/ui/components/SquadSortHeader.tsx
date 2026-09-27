import type { ProSquadSortDirection, ProSquadSortKey } from "../../squad/pro-roster.ts";

export function SquadSortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: ProSquadSortKey;
  activeKey: ProSquadSortKey;
  direction: ProSquadSortDirection;
  onSort: (key: ProSquadSortKey) => void;
  align?: "left" | "right";
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
