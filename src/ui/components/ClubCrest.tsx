/**
 * WIREFRAME: docs/prd/design.md §5 — parametric crest
 */
export function ClubCrest({
  initials,
  color = "var(--rasen)",
  size = 40,
}: {
  initials: string;
  color?: string;
  size?: number;
}) {
  const label = initials.slice(0, 2).toUpperCase();
  const r = size / 2;
  return (
    <svg
      className="club-crest"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <circle cx={r} cy={r} r={r - 2} fill={color} stroke="var(--tinte)" strokeWidth={2} />
      <text
        x={r}
        y={r + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--tinte)"
        fontFamily="var(--font-display)"
        fontSize={size * 0.32}
        fontWeight={700}
      >
        {label}
      </text>
    </svg>
  );
}
