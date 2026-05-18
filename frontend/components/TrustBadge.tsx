interface Props {
  score: number; // 0–1
}

export default function TrustBadge({ score }: Props) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? "text-green-400 border-green-600/40 bg-green-600/10"
    : pct >= 50 ? "text-yellow-400 border-yellow-600/40 bg-yellow-600/10"
    : "text-red-400 border-red-600/40 bg-red-600/10";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {pct >= 75 ? "✓" : pct >= 50 ? "⚠" : "✗"} Trust {pct}
    </span>
  );
}
