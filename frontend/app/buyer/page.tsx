"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import VehicleSelector from "@/components/VehicleSelector";
import FitmentBadge from "@/components/FitmentBadge";
import TrustBadge from "@/components/TrustBadge";
import { searchParts } from "@/lib/api";
import { PART_CATEGORIES } from "@/lib/vehicles";

interface Vehicle { make: string; model: string; year: number | null; fuel_type: string }
interface SearchIntent {
  part_category?: string | null;
  side?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
}
interface Fitment {
  fitment_status: string;
  confidence: number;
  reasons?: string[];
  warnings?: string[];
  recommended_action?: string;
}
interface Listing {
  _id: string;
  title?: string;
  description?: string;
  price?: number;
  condition?: string;
  trust_score?: number;
  fitment?: Fitment | null;
  seller_name?: string;
  location?: string;
  compatible_range?: string;
}

function compatClass(confidence: number) {
  const pct = Math.round(confidence * 100);
  if (pct >= 85) return { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" };
  if (pct >= 60) return { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" };
  return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" };
}

function BuyerContent() {
  const searchParams = useSearchParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Listing[]>([]);
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const didInit = useRef(false);

  const doSearch = async (q: string, v: Vehicle | null) => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchParts(q, v ?? {});
      setResults(data.results ?? []);
      setIntent(data.intent);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const q = searchParams.get("q") ?? "";
    const make = searchParams.get("make") ?? "";
    const model = searchParams.get("model") ?? "";
    const year = searchParams.get("year");
    const fuel = searchParams.get("fuel") ?? "Any";

    let v: Vehicle | null = null;
    if (make && model) {
      v = { make, model, year: year ? Number(year) : null, fuel_type: fuel };
      setVehicle(v);
    }
    if (q) setQuery(q);
    if (q || (make && model)) doSearch(q, v);
  }, [searchParams]);

  const handleSearch = () => {
    if (!query.trim()) return;
    doSearch(query, vehicle);
  };

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.fuel_type !== "Any" ? vehicle.fuel_type : null]
        .filter(Boolean).join(" ")
    : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">AutoReviver</Link>
        <Link href="/seller" className="text-sm text-gray-400 hover:text-white transition">Sell a Part</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Step 1 — Vehicle */}
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">Step 1 — Your Vehicle</h2>
          {vehicle ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{vehicleLabel}</p>
                {vehicle.fuel_type !== "Any" && (
                  <p className="text-sm text-gray-400">{vehicle.fuel_type}</p>
                )}
              </div>
              <button onClick={() => setVehicle(null)} className="text-xs text-gray-500 hover:text-white">Change</button>
            </div>
          ) : (
            <VehicleSelector onSelect={setVehicle} />
          )}
        </section>

        {/* Step 2 — Search */}
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          <h2 className="font-semibold mb-1 text-sm text-gray-300">Step 2 — What part do you need?</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder='e.g. "left headlight" or "front bumper"'
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg transition"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {PART_CATEGORIES.slice(0, 8).map(p => (
              <button
                key={p}
                onClick={() => setQuery(p.toLowerCase())}
                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1 rounded-full transition"
              >
                {p}
              </button>
            ))}
          </div>
        </section>

        {/* Detected intent */}
        {intent && Object.values(intent).some(Boolean) && (
          <p className="text-xs text-gray-500 px-1">
            Detected: {[intent.part_category, intent.side, intent.make, intent.model, intent.year].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Results header */}
        {searched && !loading && (
          <div className="flex items-center justify-between px-1">
            {vehicleLabel && (
              <p className="text-sm text-gray-400">
                Vehicle: <span className="text-white font-medium">{vehicleLabel}</span>
              </p>
            )}
            {results.length > 0 && (
              <p className="text-sm text-gray-400">
                Compatible Parts Found: <span className="text-white font-semibold">{results.length}</span>
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <section className="space-y-4">
            {results.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500 border border-gray-800">
                No listings found. Try a different search or browse all parts.
              </div>
            ) : (
              results.map(item => <ResultCard key={item._id} item={item} />)
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ResultCard({ item }: { item: Listing }) {
  const [expanded, setExpanded] = useState(false);
  const fitment = item.fitment;
  const trustScore = item.trust_score ?? 0.5;
  const confidence = fitment?.confidence ?? 0;
  const pct = Math.round(confidence * 100);
  const c = compatClass(confidence);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Part image placeholder */}
          <div className="shrink-0 w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 text-2xl select-none">
            ⚙
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold leading-snug">{item.title || "Used Car Part"}</h3>
                {item.compatible_range && (
                  <p className="text-xs text-gray-500 mt-0.5">Fits: {item.compatible_range}</p>
                )}
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold">£{item.price ?? "—"}</p>
                <p className="text-xs text-gray-500">{item.condition}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {fitment && (
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${c.text} ${c.bg} ${c.border}`}>
                  Compatible: {pct}%
                </span>
              )}
              <TrustBadge score={trustScore} />
              {item.seller_name && <span className="text-xs text-gray-500">{item.seller_name}</span>}
              {item.location && <span className="text-xs text-gray-500">{item.location}</span>}
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-blue-400 hover:text-blue-300"
        >
          {expanded ? "Hide compatibility details ▲" : "View compatibility details ▼"}
        </button>
      </div>

      {expanded && fitment && (
        <div className="border-t border-gray-800 px-5 py-4 bg-gray-950 space-y-3">
          <div className="flex items-center gap-3">
            <FitmentBadge status={fitment.fitment_status} confidence={confidence} />
            <span className="text-xs text-gray-400">Match Confidence: {pct}%</span>
          </div>
          {(fitment.reasons?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold mb-1">Why it fits</p>
              <ul className="space-y-1">
                {(fitment.reasons ?? []).map(r => (
                  <li key={r} className="text-xs text-green-400 flex gap-2"><span>✓</span>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {(fitment.warnings?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold mb-1">Check before buying</p>
              <ul className="space-y-1">
                {(fitment.warnings ?? []).map(w => (
                  <li key={w} className="text-xs text-yellow-400 flex gap-2"><span>⚠</span>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {fitment.recommended_action && (
            <p className="text-xs text-gray-300 bg-gray-900 rounded-lg px-3 py-2">
              {fitment.recommended_action}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function BuyerPage() {
  return (
    <Suspense>
      <BuyerContent />
    </Suspense>
  );
}
