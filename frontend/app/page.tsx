"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VehicleSelector from "@/components/VehicleSelector";

const EXAMPLE_CHIPS = [
  "Ford Fiesta 2017 headlight",
  "BMW 3 Series 2018 bumper",
  "Toyota Yaris 2015 wing mirror",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (q = query) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/buyer?q=${encodeURIComponent(trimmed)}`);
  };

  const handleVehicle = (v: { make: string; model: string; year: number | null; fuel_type: string; engine_size?: string }) => {
    const params = new URLSearchParams({ make: v.make, model: v.model });
    if (v.year) params.set("year", String(v.year));
    if (v.fuel_type && v.fuel_type !== "Any") params.set("fuel", v.fuel_type);
    if (v.engine_size && v.engine_size !== "Any") params.set("engine", v.engine_size);
    router.push(`/buyer?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">AutoReviver</span>
        <div className="flex gap-4 text-sm">
          <Link href="/chat" className="text-gray-400 hover:text-white transition">AI Chat</Link>
          <Link href="/buyer" className="text-gray-400 hover:text-white transition">Find Parts</Link>
          <Link href="/seller" className="text-gray-400 hover:text-white transition">Sell a Part</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-5xl font-bold tracking-tight leading-tight">
              Find the right used car part<br />the first time.
            </h1>
            <p className="text-gray-400 text-lg max-w-lg mx-auto">
              Verified compatibility, AI-generated listings, and trust scoring — built in.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base"
                placeholder='e.g. "left headlight for 2017 Ford Fiesta"'
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                autoFocus
              />
              <button
                onClick={() => handleSearch()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition shrink-0"
              >
                Search with AI
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => handleSearch(chip)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manual selector */}
      <div className="px-6 pb-8 w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 border-t border-gray-800" />
          <span className="text-sm text-gray-500 shrink-0">Don&apos;t know your exact vehicle details?</span>
          <div className="flex-1 border-t border-gray-800" />
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-sm text-gray-300 font-medium mb-4">Manual Vehicle Selector</p>
          <VehicleSelector onSelect={handleVehicle} buttonLabel="Find Compatible Parts" />
        </div>
      </div>

      {/* Why section */}
      <div className="border-t border-gray-800 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-gray-500 mb-3 font-medium">Why AutoReviver?</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {[
              "Compatibility confidence score on every result",
              "Conversational AI chatbot for part discovery",
              "AI-powered natural language part search",
              "Seller trust scoring built in",
              "Works without DVLA lookup — manual fallback",
            ].map(point => (
              <div key={point} className="flex gap-2 text-sm text-gray-300">
                <span className="text-green-400 shrink-0">✓</span>
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
