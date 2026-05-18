const router = require("express").Router();
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const { Inventory, Seller } = require("../db/models");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const AI_URL = process.env.AI_API_URL || process.env.AI_API_URL_LOCAL || "http://localhost:8000";

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
    if (seller_id) {
      const seller = await Seller.findById(seller_id);
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
      seller_id,
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
    const searchResp = await axios.post(`${AI_URL}/search/semantic`, { query, vehicle });
    const { intent, results } = searchResp.data;

    // Fetch full listings from DB
    const ids = results.map((r) => r.listing_id).filter(Boolean);
    const listings = await Inventory.find({ _id: { $in: ids }, status: "active" });

    // Score fitment for each
    const enriched = await Promise.all(
      listings.map(async (listing) => {
        let fitment = null;
        if (vehicle && Object.keys(vehicle).length > 0) {
          try {
            const fitResp = await axios.post(`${AI_URL}/fitment/check`, {
              buyer_vehicle: { ...vehicle, ...intent },
              part_listing: listing.toObject(),
            });
            fitment = fitResp.data;
          } catch {}
        }
        return { ...listing.toObject(), fitment };
      })
    );

    res.json({ intent, results: enriched, query });
  } catch (err) {
    res.status(500).json({ error: "Search failed", detail: err.message });
  }
});

module.exports = router;
