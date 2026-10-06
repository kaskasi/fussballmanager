import { useState } from "react";

/**
 * WIREFRAME: docs/prd/design.md §5 — parametric crest + optional baked logo
 */
export function ClubCrest({
  initials,
  logoSrc,
  color = "var(--rasen)",
  size = 40,
  alt,
}: {
  initials: string;
  logoSrc?: string;
  color?: string;
  size?: number;
  alt?: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  if (logoSrc && !logoFailed) {
    return (
      <img
        className="club-crest club-crest-img"
        src={logoSrc}
        width={size}
        height={size}
        alt={alt ?? initials}
        loading="lazy"
        decoding="async"
        onError={() => setLogoFailed(true)}
      />
    );
  }

  const label = initials.slice(0, 2).toUpperCase();
  const r = size / 2;
  return (
    <svg
      className="club-crest"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden={alt ? undefined : true}
      role={alt ? "img" : undefined}
      aria-label={alt}
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
