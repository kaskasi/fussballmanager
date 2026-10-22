/** CA bands for `tc-rating--N` (design.md §2): under 70, 70–84, 85–99, 100–114, 115 and up. */
export type RatingBand = 1 | 2 | 3 | 4 | 5;

export function ratingBand(ca: number): RatingBand {
  if (ca >= 115) return 5;
  if (ca >= 100) return 4;
  if (ca >= 85) return 3;
  if (ca >= 70) return 2;
  return 1;
}
