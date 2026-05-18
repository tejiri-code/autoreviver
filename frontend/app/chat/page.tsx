"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import VehicleSelector from "@/components/VehicleSelector";
import TrustBadge from "@/components/TrustBadge";
import FitmentBadge from "@/components/FitmentBadge";
import { chatParts } from "@/lib/api";

interface Vehicle {
  make: string;
  model: string;
  year: number | null;
  fuel_type: string;
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
  image_url?: string;
  price?: number;
  condition?: string;
  trust_score?: number;
  fitment?: Fitment | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
  results?: Listing[];
}

const STARTERS = [
  "I need a left headlight for a 2015 Ford Fiesta",
  "Find me a front bumper for a Ford Focus",
  "Which brake caliper listings look trustworthy?",
];

function vehicleLabel(vehicle: Vehicle | null) {
  if (!vehicle) return "No vehicle selected";
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.fuel_type !== "Any" ? vehicle.fuel_type : null]
    .filter(Boolean)
    .join(" ");
}

export default function ChatPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Tell me what part you need. I can understand natural language, search the inventory, and explain fitment risk.",
      suggestions: ["Select a vehicle for better compatibility checks.", "Try: left headlight for 2015 Ford Fiesta"],
    },
  ]);

  const sendMessage = async (text = input) => {
    const message = text.trim();
    if (!message || loading) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: message };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await chatParts(message, vehicle ?? {}, nextMessages.map(({ role, text }) => ({ role, text })));
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.reply,
        suggestions: data.suggestions ?? [],
        results: data.results ?? [],
      };
      setMessages([...nextMessages, assistantMessage]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "I could not reach the parts assistant. Check that the Node API and AI API are running, then try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">AutoReviver</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/buyer" className="text-gray-400 hover:text-white transition">Find Parts</Link>
          <Link href="/seller" className="text-gray-400 hover:text-white transition">Sell a Part</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-4">
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 font-medium mb-2">Vehicle Context</p>
            <p className="font-semibold">{vehicleLabel(vehicle)}</p>
            {vehicle && (
              <button onClick={() => setVehicle(null)} className="mt-2 text-xs text-gray-500 hover:text-white">
                Clear vehicle
              </button>
            )}
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-300 font-medium mb-4">Improve fitment accuracy</p>
            <VehicleSelector onSelect={setVehicle} buttonLabel="Use Vehicle in Chat" />
          </section>
        </aside>

        <section className="bg-gray-900 border border-gray-800 rounded-xl min-h-[680px] flex flex-col overflow-hidden">
          <div className="border-b border-gray-800 px-5 py-4">
            <h1 className="text-xl font-bold">AI Parts Chatbot</h1>
            <p className="text-sm text-gray-400 mt-1">Ask for parts in plain English and get fitment-aware recommendations.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {messages.map((message) => (
              <article key={message.id} className={message.role === "user" ? "ml-auto max-w-2xl" : "max-w-3xl"}>
                <div
                  className={
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-xl px-4 py-3"
                      : "bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                  }
                >
                  <p className="text-sm leading-6">{message.text}</p>
                </div>

                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion) => (
                      <span key={suggestion} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-1 rounded-full">
                        {suggestion}
                      </span>
                    ))}
                  </div>
                )}

                {message.results && message.results.length > 0 && (
                  <div className="mt-3 grid gap-3">
                    {message.results.slice(0, 3).map((item) => (
                      <ListingCard key={item._id} item={item} />
                    ))}
                  </div>
                )}
              </article>
            ))}

            {loading && (
              <div className="max-w-3xl bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-400">
                Thinking through fitment and trust signals...
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => sendMessage(starter)}
                  disabled={loading}
                  className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition"
                >
                  {starter}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder='Ask: "Will this Ford Fiesta headlight fit my car?"'
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold px-5 py-3 rounded-lg transition"
              >
                Send
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function ListingCard({ item }: { item: Listing }) {
  const fitment = item.fitment;
  const pct = fitment ? Math.round(fitment.confidence * 100) : null;

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 flex gap-3">
      <div
        className="w-20 h-20 rounded-lg bg-gray-800 border border-gray-700 bg-cover bg-center shrink-0"
        style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined}
        aria-label={item.title ? `${item.title} image` : "Part image"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-sm leading-snug">{item.title || "Used car part"}</p>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
          </div>
          <p className="font-bold text-sm shrink-0">£{item.price ?? "TBC"}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          {fitment && <FitmentBadge status={fitment.fitment_status} confidence={fitment.confidence} />}
          {pct !== null && <span className="text-xs text-gray-400">{pct}% confidence</span>}
          <TrustBadge score={item.trust_score ?? 0.5} />
          {item.condition && <span className="text-xs text-gray-500">{item.condition}</span>}
        </div>
      </div>
    </div>
  );
}
