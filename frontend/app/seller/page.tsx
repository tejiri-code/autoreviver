"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import VehicleSelector from "@/components/VehicleSelector";
import TrustBadge from "@/components/TrustBadge";
import { generateListing } from "@/lib/api";

export default function SellerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [partNumber, setPartNumber] = useState("");
  const [donorVehicle, setDonorVehicle] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("part_number", partNumber);
      form.append("donor_vehicle", JSON.stringify(donorVehicle ?? {}));
      const data = await generateListing(form);
      setResult(data);
    } catch (e: any) {
      setError("Generation failed. Check the AI service is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">AutoReviver</Link>
        <Link href="/buyer" className="text-sm text-gray-400 hover:text-white transition">Find Parts</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">List a Part</h1>
          <p className="text-gray-400 text-sm mt-1">Upload a photo and let AI generate your listing in seconds.</p>
        </div>

        {/* Upload */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition"
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {preview ? (
            <img src={preview} alt="Part preview" className="max-h-48 mx-auto rounded-lg object-contain" />
          ) : (
            <div className="text-gray-500">
              <div className="text-3xl mb-2">📷</div>
              <p className="font-medium">Drop part photo here or click to upload</p>
              <p className="text-xs mt-1">JPG, PNG, WebP — max 10MB</p>
            </div>
          )}
        </div>

        {/* Part number + donor vehicle */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Part Number (optional)</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="e.g. 8A61-13W030"
              value={partNumber}
              onChange={e => setPartNumber(e.target.value)}
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Donor Vehicle (the car you removed the part from)</p>
            {donorVehicle ? (
              <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-sm">{donorVehicle.year} {donorVehicle.make} {donorVehicle.model}</span>
                <button onClick={() => setDonorVehicle(null)} className="text-xs text-gray-500 hover:text-white">Change</button>
              </div>
            ) : (
              <VehicleSelector onSelect={setDonorVehicle} />
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={!file || loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition text-lg"
        >
          {loading ? "Generating listing…" : "Generate Listing with AI"}
        </button>

        {/* Result */}
        {result && <ListingResult result={result} />}
      </div>
    </main>
  );
}

function ListingResult({ result }: { result: any }) {
  const { item, listing_score, duplicate_check, trust } = result;
  const listing = item ?? result.listing;

  return (
    <div className="space-y-4">
      {/* Authenticity checks */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Authenticity Checks</h3>
        <Check ok={duplicate_check?.flag === "CLEAN"} label={duplicate_check?.flag === "CLEAN" ? "No duplicate listings detected" : `Duplicate detected — ${duplicate_check.flag}`} />
        <Check ok label="Image fingerprint stored (pHash + dHash + aHash)" />
        {trust && <Check ok={trust.risk_level === "low"} label={`Trust level: ${trust.risk_level} (${Math.round((trust.trust_score ?? 0) * 100)}/100)`} />}
      </div>

      {/* Listing */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="font-bold text-lg leading-tight">{listing?.title}</h2>
          {listing_score && <span className="text-xs text-gray-400 shrink-0">Score {Math.round((listing_score.score ?? 0) * 100)}%</span>}
        </div>

        <div className="flex gap-2 flex-wrap text-xs">
          {listing?.condition && <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">{listing.condition}</span>}
          {listing?.suggested_price_gbp_min && (
            <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">£{listing.suggested_price_gbp_min}–{listing.suggested_price_gbp_max}</span>
          )}
        </div>

        <p className="text-sm text-gray-300">{listing?.description}</p>

        {listing?.condition_notes && (
          <p className="text-xs text-gray-400 italic">{listing.condition_notes}</p>
        )}

        {listing?.compatible_vehicles?.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-1">Compatible vehicles</p>
            <div className="flex flex-wrap gap-1">
              {listing.compatible_vehicles.map((v: string) => (
                <span key={v} className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2 py-0.5 rounded">{v}</span>
              ))}
            </div>
          </div>
        )}

        {listing_score?.missing?.length > 0 && (
          <div>
            <p className="text-xs text-yellow-400 font-semibold mb-1">To improve your listing:</p>
            <ul className="space-y-1">
              {listing_score.missing.map((m: string) => (
                <li key={m} className="text-xs text-yellow-300 flex gap-2"><span>→</span>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {listing?.safety_warnings?.length > 0 && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3">
            <p className="text-xs text-red-400 font-semibold mb-1">Safety notices</p>
            {listing.safety_warnings.map((w: string) => (
              <p key={w} className="text-xs text-red-300">{w}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={ok ? "text-green-400" : "text-red-400"}>{ok ? "✓" : "✗"}</span>
      <span className={ok ? "text-gray-300" : "text-red-300"}>{label}</span>
    </div>
  );
}
