/** Circular match-score gauge (0–100). */
export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={`${score}% match`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-line)" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--color-tape)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 28 28)"
      />
      <text
        x="28"
        y="31.5"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="var(--color-ink)"
        fontFamily="var(--font-mono)"
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}
