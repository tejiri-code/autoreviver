import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">AutoReviver</span>
        <div className="flex gap-4 text-sm">
          <Link href="/buyer" className="text-gray-400 hover:text-white transition">Find Parts</Link>
          <Link href="/seller" className="text-gray-400 hover:text-white transition">Sell a Part</Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight">
            Find parts that <span className="text-blue-400">actually fit.</span>
          </h1>
          <p className="text-gray-400 text-lg">
            The intelligence layer for the UK used car parts market. Verified compatibility, AI-generated listings, and trust scoring — built in.
          </p>
        </div>

        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/buyer" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition">
            Find a Part
          </Link>
          <Link href="/seller" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition">
            List a Part
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-800 text-center max-w-lg w-full">
          {[["£2.8B", "UK Market"], ["90s", "To list a part"], ["<2%", "Wrong-part returns"]].map(([val, label]) => (
            <div key={label}>
              <div className="text-2xl font-bold text-blue-400">{val}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
