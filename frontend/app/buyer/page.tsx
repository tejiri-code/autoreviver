"use client";
import { useState } from "react";
import Link from "next/link";
import VehicleSelector from "@/components/VehicleSelector";
import FitmentBadge from "@/components/FitmentBadge";
import TrustBadge from "@/components/TrustBadge";
import { searchParts } from "@/lib/api";
import { PART_CATEGORIES } from "@/lib/vehicles";

interface Vehicle { make: string; model: string; year: number | null; fuel_type: string }

export default function BuyerPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [intent, setIntent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchParts(query, vehicle ?? {});
      setResults(data.results ?? []);
      setIntent(data.intent);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">AutoReviver</Link>
        <Link href="/seller" className="text-sm text-gray-400 hover:text-white transition">Sell a Part</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Step 1 — Vehicle */}
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="font-semibold mb-4 text-sm text-gray-300 uppercase tracking-wider">
            Step 1 — Your Vehicle
          </h2>
          {vehicle ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                <p className="text-sm text-gray-400">{vehicle.fuel_type}</p>
              </div>
              <button onClick={() => setVehicle(null)} className="text-xs text-gray-500 hover:text-white">Change</button>
            </div>
          ) : (
            <VehicleSelector onSelect={setVehicle} />
          )}
        </section>

        {/* Step 2 — Search */}
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          <h2 className="font-semibold mb-1 text-sm text-gray-300 uppercase tracking-wider">
            Step 2 — What part do you need?
          </h2>
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

          {/* Quick picks */}
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

        {/* Extracted intent */}
        {intent && Object.values(intent).some(Boolean) && (
          <div className="text-xs text-gray-500 px-1">
            Detected: {[intent.part_category, intent.side, intent.make, intent.model, intent.year].filter(Boolean).join(" · ")}
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
              results.map((item: any) => (
                <ResultCard key={item._id} item={item} vehicle={vehicle} />
              ))
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ResultCard({ item, vehicle }: { item: any; vehicle: Vehicle | null }) {
  const [expanded, setExpanded] = useState(false);
  const fitment = item.fitment;
  const trustScore = item.trust_score ?? 0.5;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              {fitment && <FitmentBadge status={fitment.fitment_status} confidence={fitment.confidence} />}
              <TrustBadge score={trustScore} />
            </div>
            <h3 className="font-semibold">{item.title || "Used Car Part"}</h3>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-white">£{item.price ?? "—"}</div>
            <div className="text-xs text-gray-500">{item.condition}</div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-blue-400 hover:text-blue-300"
        >
          {expanded ? "Hide details ▲" : "Show compatibility details ▼"}
        </button>
      </div>

      {expanded && fitment && (
        <div className="border-t border-gray-800 px-5 py-4 bg-gray-950 space-y-3">
          {fitment.reasons?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold mb-1">Why it fits</p>
              <ul className="space-y-1">
                {fitment.reasons.map((r: string) => (
                  <li key={r} className="text-xs text-green-400 flex gap-2"><span>✓</span>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {fitment.warnings?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold mb-1">Check before buying</p>
              <ul className="space-y-1">
                {fitment.warnings.map((w: string) => (
                  <li key={w} className="text-xs text-yellow-400 flex gap-2"><span>⚠</span>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-gray-300 bg-gray-900 rounded-lg px-3 py-2">
            {fitment.recommended_action}
          </p>
        </div>
      )}
    </div>
  );
}
