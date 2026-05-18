"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import VehicleSelector from "@/components/VehicleSelector";
import { generateListing } from "@/lib/api";
import { DEMO_PART_PHOTOS } from "@/lib/demoPartPhotos";

interface Vehicle {
  make: string;
  model: string;
  year: number | null;
  fuel_type: string;
  engine_size?: string;
}
interface GeneratedListing {
  title?: string;
  description?: string;
  condition?: string;
  condition_notes?: string;
  compatible_vehicles?: string[];
  suggested_price_gbp_min?: number;
  suggested_price_gbp_max?: number;
  safety_warnings?: string[];
}
interface ListingScore {
  score?: number;
  missing?: string[];
}
interface DuplicateCheck {
  flag?: string;
}
interface TrustResult {
  risk_level?: string;
  trust_score?: number;
}
interface GenerateResult {
  item?: GeneratedListing;
  listing?: GeneratedListing;
  listing_score?: ListingScore;
  duplicate_check?: DuplicateCheck;
  trust?: TrustResult;
}

export default function SellerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [demoPhotoUrl, setDemoPhotoUrl] = useState<string | null>(null);
  const [partNumber, setPartNumber] = useState("");
  const [donorVehicle, setDonorVehicle] = useState<Vehicle | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setDemoPhotoUrl(null);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const handleDemoPhoto = (photo: { label: string; partNumber: string; url: string }) => {
    setFile(null);
    setDemoPhotoUrl(photo.url);
    setPreview(photo.url);
    setPartNumber(photo.partNumber);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleGenerate = async () => {
    if (!file && !demoPhotoUrl) return;
    setLoading(true);
    setError("");
    try {
      let uploadFile = file;
      if (!uploadFile && demoPhotoUrl) {
        const response = await fetch(demoPhotoUrl);
        const blob = await response.blob();
        uploadFile = new File([blob], "demo-part-photo.jpg", { type: blob.type || "image/jpeg" });
      }
      if (!uploadFile) throw new Error("No image selected");

      const form = new FormData();
      form.append("image", uploadFile);
      form.append("part_number", partNumber);
      form.append("donor_vehicle", JSON.stringify(donorVehicle ?? {}));
      const data = await generateListing(form);
      setResult(data);
    } catch {
      setError("Generation failed. Check the AI service is running, or upload a local image if the demo image host blocks download.");
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
            <Image src={preview} alt="Part preview" width={320} height={192} className="max-h-48 mx-auto rounded-lg object-contain" unoptimized />
          ) : (
            <div className="text-gray-500">
              <div className="text-3xl mb-2">📷</div>
              <p className="font-medium">Drop part photo here or click to upload</p>
              <p className="text-xs mt-1">JPG, PNG, WebP — max 10MB</p>
            </div>
          )}
        </div>

        <section className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-300">Demo part photos</h2>
            <p className="text-xs text-gray-500 mt-1">Use a safe stock sample to test the upload flow without hunting for a file.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {DEMO_PART_PHOTOS.map((photo) => (
              <button
                key={`${photo.label}-${photo.partNumber}`}
                type="button"
                onClick={() => handleDemoPhoto(photo)}
                className={`h-24 rounded-lg border bg-gray-800 bg-cover bg-center text-left overflow-hidden transition ${demoPhotoUrl === photo.url ? "border-blue-400" : "border-gray-700 hover:border-blue-500"}`}
                style={{ backgroundImage: `linear-gradient(180deg, rgba(3,7,18,.05), rgba(3,7,18,.88)), url(${photo.url})` }}
              >
                <span className="flex h-full items-end p-2 text-xs font-semibold text-white">{photo.label}</span>
              </button>
            ))}
          </div>
        </section>

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
          disabled={(!file && !demoPhotoUrl) || loading}
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

function ListingResult({ result }: { result: GenerateResult }) {
  const { item, listing_score, duplicate_check, trust } = result;
  const listing = item ?? result.listing;
  const duplicateFlag = duplicate_check?.flag ?? "CLEAN";
  const compatibleVehicles = listing?.compatible_vehicles ?? [];
  const missingItems = listing_score?.missing ?? [];
  const safetyWarnings = listing?.safety_warnings ?? [];

  return (
    <div className="space-y-4">
      {/* Authenticity checks */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-gray-300">Authenticity Checks</h3>
        <Check ok={duplicateFlag === "CLEAN"} label={duplicateFlag === "CLEAN" ? "No duplicate listings detected" : `Duplicate detected — ${duplicateFlag}`} />
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

        {compatibleVehicles.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-1">Compatible vehicles</p>
            <div className="flex flex-wrap gap-1">
              {compatibleVehicles.map((v) => (
                <span key={v} className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2 py-0.5 rounded">{v}</span>
              ))}
            </div>
          </div>
        )}

        {missingItems.length > 0 && (
          <div>
            <p className="text-xs text-yellow-400 font-semibold mb-1">To improve your listing:</p>
            <ul className="space-y-1">
              {missingItems.map((m) => (
                <li key={m} className="text-xs text-yellow-300 flex gap-2"><span>→</span>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {safetyWarnings.length > 0 && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3">
            <p className="text-xs text-red-400 font-semibold mb-1">Safety notices</p>
            {safetyWarnings.map((w) => (
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
