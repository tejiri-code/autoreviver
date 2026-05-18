const BASE = process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:4000";

export async function lookupVehicle(vrn: string) {
  const res = await fetch(`${BASE}/vehicle/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vrn }),
  });
  if (!res.ok) throw new Error("Vehicle lookup failed");
  return res.json();
}

export async function searchParts(query: string, vehicle: object) {
  const res = await fetch(`${BASE}/inventory/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, vehicle }),
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function chatParts(message: string, vehicle: object, history: object[] = []) {
  const res = await fetch(`${BASE}/inventory/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, vehicle, history }),
  });
  if (!res.ok) throw new Error("Chat failed");
  return res.json();
}

export async function generateListing(formData: FormData) {
  const res = await fetch(`${BASE}/inventory/generate`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Listing generation failed");
  return res.json();
}

export async function getListings(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/inventory${qs ? `?${qs}` : ""}`);
  return res.json();
}
