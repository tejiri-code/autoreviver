interface Props {
  status: string;
  confidence: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  verified_fit:      { label: "Verified Fit",    color: "text-green-400 border-green-600/40 bg-green-600/10",   icon: "✓" },
  likely_fit:        { label: "Likely Fit",       color: "text-blue-400 border-blue-600/40 bg-blue-600/10",     icon: "~" },
  uncertain:         { label: "Uncertain",        color: "text-yellow-400 border-yellow-600/40 bg-yellow-600/10", icon: "?" },
  likely_incompatible: { label: "Incompatible",  color: "text-red-400 border-red-600/40 bg-red-600/10",         icon: "✗" },
};

export default function FitmentBadge({ status, confidence }: Props) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.uncertain;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
      {s.icon} {s.label} {Math.round(confidence * 100)}%
    </span>
  );
}
