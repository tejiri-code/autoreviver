const router = require("express").Router();
const axios = require("axios");
const fs = require("fs");
const multer = require("multer");
const FormData = require("form-data");
const { Inventory, Seller } = require("../db/models");
const vehicles = require("../../../data/uk_vehicle_selector.json");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const isDocker = fs.existsSync("/.dockerenv");
const AI_URL = isDocker
  ? process.env.AI_API_URL || process.env.AI_API_URL_LOCAL || "http://localhost:8000"
  : process.env.AI_API_URL_LOCAL || process.env.AI_API_URL || "http://localhost:8000";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function localIntent(query = "") {
  const q = query.toLowerCase();
  const sides = {
    left: "left",
    right: "right",
    front: "front",
    rear: "rear",
    passenger: "left",
    driver: "right",
    offside: "right",
    nearside: "left",
  };
  const makeAliases = new Map([
    ["vw", "Volkswagen"],
    ["volkswagen", "Volkswagen"],
    ["mercedes", "Mercedes-Benz"],
    ["mercedes-benz", "Mercedes-Benz"],
    ...vehicles.map((vehicle) => [vehicle.make.toLowerCase(), vehicle.make]),
  ]);
  const parts = [
    ["headlight", "headlight"],
    ["headlamp", "headlight"],
    ["rear light", "rear light"],
    ["tail light", "rear light"],
    ["front bumper", "bumper"],
    ["rear bumper", "bumper"],
    ["bumper", "bumper"],
    ["wing mirror", "wing mirror"],
    ["door", "door"],
    ["bonnet", "bonnet"],
    ["brake caliper", "caliper"],
    ["caliper", "caliper"],
    ["brake disc", "brake disc"],
    ["alternator", "alternator"],
    ["radiator", "radiator"],
    ["starter motor", "starter"],
    ["starter", "starter"],
    ["radiator fan", "radiator fan"],
    ["suspension arm", "suspension arm"],
    ["control arm", "suspension arm"],
    ["infotainment screen", "infotainment screen"],
    ["screen", "infotainment screen"],
    ["battery cooling fan", "battery"],
    ["battery", "battery"],
    ["mirror", "wing mirror"],
    ["seat", "seat"],
    ["wheel", "wheel"],
    ["tyre", "tyre"],
    ["tire", "tyre"],
    ["sensor", "sensor"],
  ];
  const intent = { part_category: null, make: null, model: null, year: null, side: null };

  const makeMatch = [...makeAliases.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([alias]) => q.includes(alias));
  if (makeMatch) intent.make = makeMatch[1];

  const models = vehicles
    .filter((vehicle) => !intent.make || vehicle.make === intent.make)
    .map((vehicle) => vehicle.model)
    .sort((a, b) => b.length - a.length);
  intent.model = models.find((model) => q.includes(model.toLowerCase())) || null;

  const partMatch = parts.find(([alias]) => q.includes(alias));
  if (partMatch) intent.part_category = partMatch[1];

  const side = Object.keys(sides).find((keyword) => q.includes(keyword));
  if (side) intent.side = sides[side];

  const year = query.match(/\b(19|20)\d{2}\b/);
  if (year) intent.year = Number(year[0]);

  return intent;
}

function mergeIntent(primary = {}, fallback = {}) {
  return {
    part_category: fallback.part_category || primary.part_category || null,
    make: fallback.make || primary.make || null,
    model: fallback.model || primary.model || null,
    year: fallback.year || primary.year || null,
    side: fallback.side || primary.side || null,
  };
}

function buildInventoryFilter(intent, query) {
  const filter = { status: "active" };
  if (intent.part_category) filter.part_category = new RegExp(escapeRegex(intent.part_category), "i");
  if (intent.make) filter.make = new RegExp(escapeRegex(intent.make), "i");
  if (intent.model) filter.model = new RegExp(escapeRegex(intent.model), "i");
  if (intent.side) filter.side = new RegExp(escapeRegex(intent.side), "i");

  if (!intent.part_category && query) {
    const terms = query
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2)
      .slice(0, 4);
    if (terms.length) {
      filter.$or = terms.flatMap((term) => {
        const re = new RegExp(escapeRegex(term), "i");
        return [{ title: re }, { description: re }, { part_category: re }, { make: re }, { model: re }];
      });
    }
  }

  return filter;
}

function listingMatchesIntent(listing, intent) {
  if (intent.part_category && !new RegExp(escapeRegex(intent.part_category), "i").test(listing.part_category || "")) return false;
  if (intent.make && !new RegExp(escapeRegex(intent.make), "i").test(listing.make || "")) return false;
  if (intent.model && !new RegExp(escapeRegex(intent.model), "i").test(listing.model || "")) return false;
  if (intent.side && ![listing.side, listing.position].some((value) => new RegExp(escapeRegex(intent.side), "i").test(value || ""))) return false;
  if (intent.year && (listing.year_from || listing.year_to)) {
    if (listing.year_from && intent.year < listing.year_from) return false;
    if (listing.year_to && intent.year > listing.year_to) return false;
  }
  return true;
}

function inferVehicle(vehicle, intent) {
  if (vehicle && Object.keys(vehicle).length > 0) return vehicle;
  if (!intent?.make && !intent?.model && !intent?.year) return {};

  const matched = vehicles.find((candidate) => {
    if (intent.make && candidate.make !== intent.make) return false;
    if (intent.model && candidate.model !== intent.model) return false;
    if (intent.year && !candidate.years.includes(intent.year)) return false;
    return true;
  });

  if (!matched) return {};
  return {
    make: matched.make,
    model: matched.model,
    year: intent.year || null,
    fuel_type: "Any",
  };
}

async function enrichWithFitment(listings, vehicle, intent) {
  const intentValues = Object.fromEntries(
    Object.entries(intent || {}).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
  const effectiveVehicle = inferVehicle(vehicle, intent);

  return Promise.all(
    listings.map(async (listing) => {
      let fitment = null;
      if (effectiveVehicle && Object.keys(effectiveVehicle).length > 0) {
        try {
          const fitResp = await axios.post(`${AI_URL}/fitment/check`, {
            buyer_vehicle: { ...effectiveVehicle, ...intentValues },
            part_listing: listing.toObject(),
          });
          fitment = fitResp.data;
        } catch {}
      }
      return { ...listing.toObject(), fitment };
    })
  );
}

async function searchInventory(query, vehicle = {}) {
  let intent;
  let listings;
  const parsedIntent = localIntent(query);

  try {
    const searchResp = await axios.post(`${AI_URL}/search/semantic`, { query, vehicle });
    const { intent: aiIntent, results } = searchResp.data;
    intent = mergeIntent(aiIntent, parsedIntent);

    const ids = results.map((r) => r.listing_id).filter(Boolean);
    if (!ids.length) throw new Error("No semantic results");

    listings = await Inventory.find({ _id: { $in: ids }, status: "active" });
    if (!listings.length) throw new Error("Semantic results not found in inventory");
    listings = listings.filter((listing) => listingMatchesIntent(listing, intent));
  } catch {
    try {
      const intentResp = await axios.post(`${AI_URL}/search/intent`, { query });
      intent = mergeIntent(intentResp.data, parsedIntent);
    } catch {
      intent = parsedIntent;
    }
  }

  if (!listings || !listings.length) {
    listings = await Inventory.find(buildInventoryFilter(intent || parsedIntent, query)).limit(20).sort({ listing_score: -1, created_at: -1 });
  }

  intent = intent || parsedIntent;
  const enriched = await enrichWithFitment(listings, vehicle, intent);
  return { intent, inferred_vehicle: inferVehicle(vehicle, intent), results: enriched, query };
}

function buildChatReply({ query, vehicle, intent, results }) {
  const hasVehicle = vehicle && Object.keys(vehicle).length > 0;
  const understood = [intent?.year, intent?.make, intent?.model, intent?.side, intent?.part_category]
    .filter(Boolean)
    .join(" ");
  const best = results[0];

  if (!results.length) {
    if (understood) {
      return `I understood this as ${understood}, but there are no matching active listings in the current inventory. Try broadening the part name or adding a new seller listing.`;
    }
    return hasVehicle
      ? `I could not find an exact match for "${query}". Try a simpler part name, like "left headlight", or broaden the vehicle details.`
      : `I could not find an exact match for "${query}". Tell me the vehicle make, model and year so I can check fitment properly.`;
  }

  const verified = results.filter((item) => item.fitment?.fitment_status === "verified_fit");
  const bestFit = best.fitment;
  const confidence = bestFit ? Math.round(bestFit.confidence * 100) : null;

  if (verified.length) {
    const top = verified[0];
    const topConfidence = Math.round((top.fitment?.confidence ?? 0) * 100);
    return `I found ${verified.length} verified fit ${verified.length === 1 ? "match" : "matches"}. Best option: ${top.title} at £${top.price ?? "TBC"} with ${topConfidence}% fitment confidence.`;
  }

  if (confidence !== null) {
    return `I found ${results.length} possible ${results.length === 1 ? "match" : "matches"}, but none are verified fits yet. Closest option: ${best.title} at £${best.price ?? "TBC"} with ${confidence}% confidence. Check the warnings before buying.`;
  }

  return `I found ${results.length} possible ${results.length === 1 ? "listing" : "listings"}. Best option: ${best.title} at £${best.price ?? "TBC"}. Add vehicle details for a fitment confidence score.`;
}

function buildChatSuggestions(intent, results) {
  const suggestions = [];
  const sideExamples = {
    bumper: ["front bumper", "rear bumper"],
    "wing mirror": ["left wing mirror", "right wing mirror"],
    headlight: ["left headlight", "right headlight"],
    caliper: ["front left caliper", "rear right caliper"],
  };

  if (!intent?.make || !intent?.model || !intent?.year) suggestions.push("Add make, model and year for the strongest fitment check.");
  if (intent?.part_category && !intent?.side) {
    const examples = sideExamples[intent.part_category] || [`left ${intent.part_category}`, `front ${intent.part_category}`];
    suggestions.push(`Specify side or position, for example "${examples[0]}" or "${examples[1]}".`);
  }
  if (results.some((item) => item.safety_warnings?.length)) suggestions.push("Safety-critical or uncertain parts should be checked by a qualified mechanic before fitting.");
  if (!suggestions.length) suggestions.push("Open the top result and review compatibility reasons before buying.");
  return suggestions.slice(0, 3);
}

// GET all listings (with optional filters)
router.get("/", async (req, res) => {
  const { make, model, part_category, side, status = "active" } = req.query;
  const filter = { status };
  if (make) filter.make = new RegExp(make, "i");
  if (model) filter.model = new RegExp(model, "i");
  if (part_category) filter.part_category = new RegExp(part_category, "i");
  if (side) filter.side = new RegExp(side, "i");

  const items = await Inventory.find(filter).limit(50).sort({ created_at: -1 });
  res.json(items);
});

// GET single listing
router.get("/:id", async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

// POST generate listing from image + save
router.post("/generate", upload.single("image"), async (req, res) => {
  try {
    const { seller_id, part_number, donor_vehicle } = req.body;
    let resolvedSellerId = seller_id;
    if (!resolvedSellerId) {
      const fallbackSeller = await Seller.findOne().sort({ created_at: 1 });
      if (!fallbackSeller) return res.status(400).json({ error: "No seller available for listing generation" });
      resolvedSellerId = fallbackSeller._id;
    }

    // Fetch all existing hashes for duplicate detection
    const existing = await Inventory.find({ status: "active" }, "image_hashes _id seller_id");
    const hashes_list = existing
      .filter((e) => e.image_hashes)
      .map((e) => ({ ...e.image_hashes, listing_id: e._id.toString(), seller_id: e.seller_id?.toString() }));

    const form = new FormData();
    form.append("image", req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    form.append("part_number", part_number || "");
    form.append("donor_vehicle", donor_vehicle || "{}");
    form.append("existing_hashes", JSON.stringify(hashes_list));

    const aiResp = await axios.post(`${AI_URL}/vision/generate-listing`, form, { headers: form.getHeaders() });
    const { listing, image_hashes, duplicate_check, listing_score } = aiResp.data;

    // Build trust score
    let seller_score = 60;
    if (resolvedSellerId) {
      const seller = await Seller.findById(resolvedSellerId);
      if (seller) {
        const trustResp = await axios.post(`${AI_URL}/trust/seller`, { seller: seller.toObject() });
        seller_score = trustResp.data.seller_score;
      }
    }
    const trustResp = await axios.post(`${AI_URL}/trust/listing`, {
      listing: { ...listing, image_count: 1 },
      seller_score,
      duplicate_flag: duplicate_check.flag,
    });

    // Save to DB
    const item = new Inventory({
      seller_id: resolvedSellerId,
      ...listing,
      part_number,
      donor_vehicle: JSON.parse(donor_vehicle || "{}"),
      image_hashes,
      trust_score: trustResp.data.trust_score,
      listing_score: listing_score.score,
    });
    await item.save();

    // Index in vector store
    await axios.post(`${AI_URL}/search/index`, { listing_id: item._id.toString(), listing: item.toObject() }).catch(() => {});

    res.json({ item, listing_score, duplicate_check, trust: trustResp.data });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Listing generation failed", detail: err.message });
  }
});

// POST semantic search
router.post("/search", async (req, res) => {
  try {
    const { query, vehicle } = req.body;
    res.json(await searchInventory(query, vehicle));
  } catch (err) {
    res.status(500).json({ error: "Search failed", detail: err.message });
  }
});

// POST conversational assistant for buyer discovery
router.post("/chat", async (req, res) => {
  try {
    const { message, vehicle = {}, history = [] } = req.body;
    const query = String(message || "").trim();
    if (!query) return res.status(400).json({ error: "message required" });

    const search = await searchInventory(query, vehicle);
    const results = search.results.slice(0, 5);
    const reply = buildChatReply({ query, vehicle, intent: search.intent, results });
    const suggestions = buildChatSuggestions(search.intent, results);

    res.json({
      reply,
      intent: search.intent,
      results,
      suggestions,
      history_length: Array.isArray(history) ? history.length : 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Chat failed", detail: err.message });
  }
});

module.exports = router;
