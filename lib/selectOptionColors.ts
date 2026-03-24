/**
 * 30 preset color groups for single-select options (index = option order in column).
 * Background is translucent for light/dark surfaces; foreground is solid.
 */
export const SELECT_OPTION_COLOR_GROUPS: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: 'rgba(239, 68, 68, 0.18)', fg: '#b91c1c' },
  { bg: 'rgba(249, 115, 22, 0.18)', fg: '#c2410c' },
  { bg: 'rgba(245, 158, 11, 0.2)', fg: '#b45309' },
  { bg: 'rgba(234, 179, 8, 0.22)', fg: '#a16207' },
  { bg: 'rgba(132, 204, 22, 0.2)', fg: '#4d7c0f' },
  { bg: 'rgba(34, 197, 94, 0.18)', fg: '#15803d' },
  { bg: 'rgba(16, 185, 129, 0.18)', fg: '#047857' },
  { bg: 'rgba(20, 184, 166, 0.18)', fg: '#0f766e' },
  { bg: 'rgba(6, 182, 212, 0.18)', fg: '#0e7490' },
  { bg: 'rgba(14, 165, 233, 0.18)', fg: '#0369a1' },
  { bg: 'rgba(59, 130, 246, 0.18)', fg: '#1d4ed8' },
  { bg: 'rgba(99, 102, 241, 0.18)', fg: '#4338ca' },
  { bg: 'rgba(139, 92, 246, 0.18)', fg: '#6d28d9' },
  { bg: 'rgba(168, 85, 247, 0.18)', fg: '#7e22ce' },
  { bg: 'rgba(217, 70, 239, 0.18)', fg: '#a21caf' },
  { bg: 'rgba(236, 72, 153, 0.18)', fg: '#be185d' },
  { bg: 'rgba(244, 63, 94, 0.18)', fg: '#be123c' },
  { bg: 'rgba(190, 18, 60, 0.15)', fg: '#9f1239' },
  { bg: 'rgba(127, 29, 29, 0.12)', fg: '#7f1d1d' },
  { bg: 'rgba(21, 128, 61, 0.12)', fg: '#14532d' },
  { bg: 'rgba(22, 101, 52, 0.12)', fg: '#166534' },
  { bg: 'rgba(30, 64, 175, 0.12)', fg: '#1e3a8a' },
  { bg: 'rgba(55, 48, 163, 0.12)', fg: '#312e81' },
  { bg: 'rgba(91, 33, 182, 0.12)', fg: '#4c1d95' },
  { bg: 'rgba(107, 33, 168, 0.12)', fg: '#581c87' },
  { bg: 'rgba(134, 25, 143, 0.12)', fg: '#86198f' },
  { bg: 'rgba(157, 23, 77, 0.12)', fg: '#9d174d' },
  { bg: 'rgba(180, 83, 9, 0.15)', fg: '#92400e' },
  { bg: 'rgba(194, 65, 12, 0.15)', fg: '#9a3412' },
  { bg: 'rgba(200, 92, 27, 0.2)', fg: '#9a3412' },
]

export function getSelectOptionColors(optionIndex: number) {
  const i =
    ((optionIndex % SELECT_OPTION_COLOR_GROUPS.length) + SELECT_OPTION_COLOR_GROUPS.length) %
    SELECT_OPTION_COLOR_GROUPS.length
  return SELECT_OPTION_COLOR_GROUPS[i]!
}
